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
  const alerts: ExternalAlert[] = [];
  
  try {
    // Integração Real - INMET (Avisos Meteorológicos)
    // URL base de alertas ativos do INMET, servindo como modelo oficial via API pública
    const response = await fetch("https://apitempo.inmet.gov.br/alerta");
    
    if (response.ok) {
      const data = await response.json();
      
      // PARSER: Transformando a estrutura de dados bruta na interface limpa do sistema
      for (const item of (Array.isArray(data) ? data : [])) {
        if (!item.municipios || !Array.isArray(item.municipios)) continue;
        
        // Mapeamento de Severidade Padrão Nacional
        const severityMap: Record<string, ExternalAlert['severity']> = {
          'Aviso de Observação': 'Baixa',
          'Aviso Especial': 'Alta',
          'Perigo Potencial': 'Média',
          'Perigo': 'Alta',
          'Grande Perigo': 'Crítica',
        };
        
        for (const mun of item.municipios) {
          alerts.push({
            externalId: `INMET-${item.id_aviso || uuidv4()}-${mun.codigo_ibge}`,
            source: "INMET",
            severity: severityMap[item.severidade] || "Média",
            region: "N/A", // Algumas APIs não definem 'região livre', apenas Estado
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
      console.warn("Retorno da API INMET não foi OK. HTTP Status:", response.status);
    }
    
    // Adicionalmente, poderiamos replicar o try/catch acima para APIs do CEMADEN, ANA, etc.
  } catch (error) {
    console.error("Falha de rede ao buscar dados em tempo real da API Governamental:", error);
  }

  // Fallback seguro em caso de ausência de resposta, garante que o cronjob não quebre
  return alerts;
}
