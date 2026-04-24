import { fetchGovAlerts } from "./dataService.js";
import { sendAlertEmail } from "./emailService.js";
import { supabaseAdmin } from "./supabaseAdmin.js";
import { subHours } from "date-fns";

export async function runCronJob() {
  console.log("Iniciando rotina de checagem do Pipeline de Predição de Desastres...");

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

    // 4. Verify if alert was dispatched in last 6 hours to prevent spam
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

    // 5. New Critical Alert. Save to DB and Send Email preemptively.
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

    const emails = teamSubscribers?.map((s) => s.email) || [];

    if (emails.length > 0) {
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
