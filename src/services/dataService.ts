import { v4 as uuidv4 } from "uuid";

export interface ExternalAlert {
  externalId: string;
  source: "INMET" | "CEMADEN" | "DEFESA_CIVIL" | "NASA_FIRMS" | "ANA";
  severity: "Baixa" | "Média" | "Alta" | "Crítica";
  region: string;
  state: string;
  city: string;
  ibgeCode?: string;
  disasterType: string;
  description: string;
  issuedAt: Date;
  precipitationExpected?: number; // mm
  windSpeedExpected?: number; // km/h
}

export async function fetchGovAlerts(): Promise<ExternalAlert[]> {
  console.log("Executando pipeline de predição e integração com INMET e CEMADEN...");
  let alerts: ExternalAlert[] = [];
  
  try {
    // Integração Real - INMET (Avisos Meteorológicos)
    // URL base de alertas ativos do INMET, servindo como modelo oficial via API pública
    const response = await fetch("https://apitempo.inmet.gov.br/avisos/");
    
    if (response.ok) {
      const data = await response.json();
      
      // PARSER: Transformando a estrutura de dados bruta na interface limpa do sistema
      const avisos = Array.isArray(data) ? data : (data.avisos || data.data || []);
      for (const item of avisos) {
        if (!item.municipios && !item.geocode) continue;
        
        // Mapeamento de Severidade Padrão Nacional
        const severityMap: Record<string, ExternalAlert['severity']> = {
          'Aviso de Observação': 'Baixa',
          'Aviso Especial': 'Alta',
          'Perigo Potencial': 'Média',
          'Perigo': 'Alta',
          'Grande Perigo': 'Crítica',
        };
        
        const municipios = Array.isArray(item.municipios) ? item.municipios : [{
          codigo_ibge: item.geocode,
          uf: item.state || item.uf,
          nome_municipio: item.city || item.municipio
        }];

        for (const mun of municipios) {
          alerts.push({
            externalId: `INMET-${item.id_aviso || uuidv4()}-${mun.codigo_ibge || uuidv4()}`,
            source: "INMET",
            severity: severityMap[item.severidade] || "Média",
            region: "N/A", 
            state: mun.uf || "N/A",
            city: mun.nome_municipio || "N/A",
            ibgeCode: mun.codigo_ibge,
            disasterType: item.descricao || item.aviso_descricao || "Evento Climático",
            description: item.riscos?.join(", ") || item.descricao || "Aviso Oficial Meteorológico",
            issuedAt: item.data_inicio ? new Date(item.data_inicio) : new Date(),
          });
        }
      }
    } else {
      console.warn(`API INMET indisponível no momento. HTTP Status: ${response.status}`);
    }
  } catch (error) {
    console.warn("API INMET indisponível no momento (Erro de rede/CORS):", error);
  }

  try {
    // Integração - CEMADEN (Riscos Hidrológicos e Geológicos)
    // URL base de alertas do CEMADEN
    const responseCemaden = await fetch("http://api.cemaden.gov.br/alertas");
    
    if (responseCemaden.ok) {
      const dataCemaden = await responseCemaden.json();
      
      // PARSER: Transformando JSON do CEMADEN na interface ExternalAlert
      const alertasCemaden = Array.isArray(dataCemaden) ? dataCemaden : (dataCemaden.alertas || []);
      for (const item of alertasCemaden) {
        alerts.push({
          externalId: `CEMADEN-${item.id_alerta || uuidv4()}-${item.codigo_ibge || 'N/A'}`,
          source: "CEMADEN",
          severity: item.nivel === "Muito Alto" ? "Crítica" : "Alta", // Mapeamento exigido de severidade
          region: item.regiao || "N/A",
          state: item.uf || "N/A",
          city: item.municipio || "N/A",
          ibgeCode: item.codigo_ibge,
          disasterType: item.tipo_desastre || item.risco || "Desastre Natural",
          description: item.descricao || "Alerta Hidrológico/Geológico ativo na região.",
          issuedAt: item.data_emissao ? new Date(item.data_emissao) : new Date(),
        });
      }
    } else {
      console.warn(`API CEMADEN indisponível no momento. HTTP Status: ${responseCemaden.status}`);
    }
  } catch (error) {
    console.warn("API CEMADEN indisponível no momento (Erro de rede/CORS):", error);
  }

  try {
    // Integração - Defesa Civil (CAP - Common Alerting Protocol / Feed de Alertas)
    // URL simulando integracão com o feed de alertas da Defesa Civil Nacional
    const responseDefesa = await fetch("https://alertas2.defesacivil.gov.br/api/v1/alertas");
    
    if (responseDefesa.ok) {
      const dataDefesa = await responseDefesa.json();
      
      // PARSER: Transformando Feed CAP (Common Alerting Protocol) na interface do sistema
      const alertasDefesa = Array.isArray(dataDefesa) ? dataDefesa : (dataDefesa.data || []);
      
      const severityMapDC: Record<string, ExternalAlert['severity']> = {
        'Minor': 'Baixa',
        'Moderate': 'Média',
        'Severe': 'Alta',
        'Extreme': 'Crítica',
      };

      for (const item of alertasDefesa) {
        alerts.push({
          externalId: `DEF-CIVIL-${item.identifier || uuidv4()}`,
          source: "DEFESA_CIVIL",
          severity: severityMapDC[item.severity] || "Alta",
          region: "N/A",
          state: item.info?.area?.areaDesc?.split(',')[1]?.trim() || "N/A",
          city: item.info?.area?.areaDesc?.split(',')[0]?.trim() || "N/A",
          ibgeCode: item.info?.area?.geocode?.value,
          disasterType: item.info?.event || "Emergência",
          description: item.info?.description || item.info?.headline || "Alerta de Emergência da Defesa Civil.",
          issuedAt: item.sent ? new Date(item.sent) : new Date(),
        });
      }
    } else {
      console.warn(`API Defesa Civil indisponível no momento. HTTP Status: ${responseDefesa.status}`);
    }
  } catch (error) {
    console.warn("API Defesa Civil indisponível no momento (Erro de rede/CORS):", error);
  }

  // Fallback seguro em caso de ausência de resposta, garante que o cronjob não quebre
  return alerts;
}
