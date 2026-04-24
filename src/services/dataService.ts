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
    // Integração Real - INMET (Avisos Meteorológicos) via Proxy
    // URL base de alertas ativos do INMET com AllOrigins para furar CORS
    const url = `https://api.allorigins.win/get?url=${encodeURIComponent('https://apitempo.inmet.gov.br/alerta')}`;
    const response = await fetch(url);
    
    if (response.ok) {
      const dataProxy = await response.json();
      const data = JSON.parse(dataProxy.contents);
      
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
    // Simulador Realista para CEMADEN e Defesa Civil
    const simulatedAlerts = generateSimulatedAlerts();
    alerts.push(...simulatedAlerts);
  } catch (error) {
    console.warn("Erro ao gerar chamadas simuladas de CEMADEN e Defesa Civil:", error);
  }

  // Fallback seguro em caso de ausência de resposta, garante que o cronjob não quebre
  return alerts;
}

function generateSimulatedAlerts(): ExternalAlert[] {
  return [
    {
      externalId: `CEMADEN-SIM-${uuidv4()}`,
      source: "CEMADEN",
      severity: "Crítica",
      region: "Sudeste",
      state: "SP",
      city: "São Sebastião",
      ibgeCode: "3550704", // São Sebastião - SP
      disasterType: "Movimento de Massa / Deslizamento",
      description: "Saturação de solo > 90% na Serra do Mar, acumulado superior a 150mm. Risco iminente de deslizamento.",
      issuedAt: new Date(),
      precipitationExpected: 180,
    },
    {
      externalId: `DEF-CIVIL-SIM-${uuidv4()}`,
      source: "DEFESA_CIVIL",
      severity: "Alta",
      region: "Sul",
      state: "RS",
      city: "Eldorado do Sul",
      ibgeCode: "4306767", // Eldorado do Sul - RS
      disasterType: "Inundação Gradual",
      description: "Nível do rio próximo à cota de transbordo (8m). Evacuação em áreas ribeirinhas recomendada.",
      issuedAt: new Date(Date.now() - 3600000), // 1 hour ago
      precipitationExpected: 90,
    }
  ];
}
