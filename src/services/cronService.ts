import { fetchGovAlerts, ExternalAlert } from "./dataService.js";
import { sendAlertEmail } from "./emailService.js";
import { supabaseAdmin } from "./supabaseAdmin.js";
import { subHours } from "date-fns";
import { fetchInpePrecipitation, evaluateDisasterRisk } from "./predictionService.js";

export async function runPredictionRoutine() {
  console.log("Iniciando módulo de predição climática (INPE/GEE)...");
  
  // Buscar todas as zonas de monitoramento ativas (apenas o centroide lat/long para economizar requisições)
  const { data: zones, error } = await supabaseAdmin
    .from("monitoring_zones")
    .select("id, name, lat, lng, is_active")
    .eq("is_active", true);

  if (error || !zones) {
    console.error("[PREDICTION ERROR] Falha ao buscar zonas de monitoramento:", error);
    return;
  }

  console.log(`Encontradas ${zones.length} zonas ativas. Iniciando previsões...`);
  
  for (const zone of zones) {
    if (typeof zone.lat !== 'number' || typeof zone.lng !== 'number') continue;
    
    try {
      const forecast = await fetchInpePrecipitation(zone.lat, zone.lng);
      const risk = evaluateDisasterRisk(forecast);
      
      if (risk === 'ALTO' || risk === 'SEVERO') {
        console.log(`[PREDIÇÃO CRÍTICA] Zona ${zone.name}: Precipitação esperada: ${forecast.precipitationMm.toFixed(2)}mm. Risco: ${risk}`);
        
        // Anti-Spam checkout
        const sixHoursAgo = subHours(new Date(), 6);
        const { data: recentPredictiveAlerts } = await supabaseAdmin
          .from("alerts_log")
          .select("id")
          .eq("region", zone.name)
          .eq("severity", "PREDICTIVE_WARNING")
          .gte("created_at", sixHoursAgo.toISOString());
          
        if (recentPredictiveAlerts && recentPredictiveAlerts.length > 0) {
           console.log(`[PREDIÇÃO SILENCIADO] Zona ${zone.name} já tem alerta preditivo enviado nas últimas 6h.`);
           continue;
        }

        // Prepare ExternalAlert object
        const predictiveAlert: ExternalAlert = {
          externalId: `PRED-${zone.id}-${Date.now()}`,
          source: 'INPE_PREDICTION',
          severity: 'PREDICTIVE_WARNING',
          region: 'Monitoramento Direto',
          state: 'BR', // could be inferred, keeping it generic
          city: zone.name || 'Zona Protegida',
          disasterType: 'Risco Preditivo de Precipitação / Alagamento',
          description: `Risco Preditivo detectado para a zona ${zone.name}. Precipitação esperada de ${forecast.precipitationMm.toFixed(1)}mm nas próximas 24h. Categoria de risco: ${risk}.`,
          issuedAt: new Date(),
          precipitationExpected: forecast.precipitationMm,
          latitude: zone.lat,
          longitude: zone.lng,
          radiusKm: 20
        };

        // Salvar na tabela de alertas (simulando a etapa 6 do main loop onde salvamos na tabela de alertas)
        const { data: insertedAlert, error: insertError } = await supabaseAdmin
          .from("alerts_log")
          .insert({
            external_id: predictiveAlert.externalId,
            severity: predictiveAlert.severity,
            region: predictiveAlert.city,
            disaster_type: predictiveAlert.disasterType,
            description: predictiveAlert.description,
            issued_at: predictiveAlert.issuedAt.toISOString(),
          })
          .select()
          .single();
          
        if (insertError) {
          console.error("Falha ao salvar alerta preditivo:", insertError);
        } else {
           console.log(`Alerta Preditivo salvo para a Zona ${zone.name}!`);
        }
      }
    } catch (e: any) {
      console.error(`[PREDICTION ENGINE ERROR] Falha ao processar zona ${zone.id}. `, e.message);
    }
  }
}

export async function runCronJob() {
  console.log("Iniciando rotina de checagem do Pipeline de Predição de Desastres...");

  // Run the proactive prediction routine WITHOUT blocking the reactive pipeline
  runPredictionRoutine().catch(e => console.error("[CRON FATAL] Módulo preditivo falhou criticamente", e));


  // 1. Fetch data from APIs (now including predictive models INMET/CEMADEN)
  const incomingAlerts = await fetchGovAlerts();

  // 2. Filter high or critical alerts
  const criticalAlerts = incomingAlerts.filter(
    (a) => a.severity === "Alta" || a.severity === "Crítica"
  );

  if (criticalAlerts.length === 0) {
    console.log("Nenhum alerta preditivo crítico detectado nesta janela.");
    return { status: "no_critical_alerts" };
  }

  const processedAlerts = [];

  for (const alert of criticalAlerts) {
    if (!alert.latitude || !alert.longitude || !alert.radiusKm) {
        console.log(`[Pular] Alerta sem coordenadas válidas: ${alert.externalId}`);
        continue;
    }

    // Usando RPC PostGIS para encontrar zonas dentro da área de perigo
    const { data: zonesInRadius, error: rpcError } = await supabaseAdmin.rpc(
      "get_zones_in_radius",
      {
        alert_lat: alert.latitude,
        alert_lon: alert.longitude,
        radius_km: alert.radiusKm,
      }
    );

    if (rpcError) {
      console.error(`Falha ao checar interseção PostGIS para alerta ${alert.externalId}:`, rpcError);
      continue;
    }

    if (!zonesInRadius || zonesInRadius.length === 0) {
      console.log(`[Pular] Alerta ${alert.city}/${alert.state} não afeta nenhuma zona monitorada ativa.`);
      continue;
    }

    console.log(`📍 ALERTA GEO LOCALIZADO: Interseção com ${zonesInRadius.length} zonas ativas para evento em ${alert.city}.`);

    // 🔬 PRECISÃO: Verificamos limiares críticos locais
    const isWindHazard = alert.windSpeedExpected && alert.windSpeedExpected > 80;
    const isFloodHazard = alert.precipitationExpected && alert.precipitationExpected > 100;
    
    if (isWindHazard) {
      console.log(`⚠️ ALERTA EXTREMO DE VENTO DECTADO: ${alert.windSpeedExpected}km/h em ${alert.city}. Danos infraestruturais prováveis.`);
    }
    if (isFloodHazard) {
      console.log(`⚠️ ALERTA EXTREMO DE CHUVA DECTADO: ${alert.precipitationExpected}mm previsto em ${alert.city}. Risco alto de alagamento imediato.`);
    }

    // 4. Verify if this exact alert was already dispatched (Anti-Spam / Anti-Duplication)
    const { data: duplicateAlert } = await supabaseAdmin
      .from("alerts_log")
      .select("id")
      .eq("external_id", alert.externalId)
      .maybeSingle();

    if (duplicateAlert) {
      console.log(`[Cancelado] Alerta ${alert.externalId} já processado e enviado anteriormente.`);
      continue; // Skip, já foi enviado
    }

    // 5. Check secondary anti-spam based on region and time for similar alerts (prevent flood)
    const sixHoursAgo = subHours(new Date(), 6);
    
    const { data: recentAlerts } = await supabaseAdmin
      .from("alerts_log")
      .select("id")
      .eq("region", alert.city)
      .eq("disaster_type", alert.disasterType)
      .eq("severity", alert.severity)
      .gte("created_at", sixHoursAgo.toISOString());

    if (recentAlerts && recentAlerts.length > 0) {
      console.log(`[Silenciado] Equipes já notificadas nas últimas 6h para ${alert.city} - ${alert.disasterType}`);
      continue; // Skip
    }

    // 6. New Critical Alert. Save to DB and Send Email preemptively.
    const { data: insertedAlert, error } = await supabaseAdmin
      .from("alerts_log")
      .insert({
        external_id: alert.externalId,
        severity: alert.severity,
        region: alert.city,
        disaster_type: alert.disasterType,
        description: alert.description,
        issued_at: alert.issuedAt instanceof Date ? alert.issuedAt.toISOString() : new Date(alert.issuedAt).toISOString(),
      })
      .select()
      .single();

    if (error || !insertedAlert) {
      console.error("Falha ao persistir evento crítico na base:", error);
      continue;
    }

    // Fetch Subscribers for Humanitarian Response Team (Broadcast)
    const { data: teamSubscribers } = await supabaseAdmin
      .from("team_subscribers")
      .select("email");

    const emails = teamSubscribers?.map((sub) => sub.email) || [];

    if (emails.length === 0) {
      console.log(`Nenhum destinatário cadastrado na equipe de alertas. Pulando disparo de e-mails para ${alert.city}.`);
    } else {
      console.log(`Disparando push/emails para equipe de resposta rápida (${emails.length} agentes)...`);
      const emailSent = await sendAlertEmail(emails, insertedAlert);
      
      // Update email_sent status
      if (emailSent) {
        await supabaseAdmin
          .from("alerts_log")
          .update({ email_sent: true })
          .eq("id", insertedAlert.id);
      }
    }

    processedAlerts.push(insertedAlert);
  }

  console.log(`Rotina concluída. Disparou ${processedAlerts.length} novos alertas preditivos para equipes.`);
  return { processedCount: processedAlerts.length, alerts: processedAlerts };
}
