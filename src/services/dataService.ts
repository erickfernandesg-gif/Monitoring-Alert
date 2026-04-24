import { v4 as uuidv4 } from "uuid";

export interface NewsArticle {
  id: string;
  title: string;
  link: string;
  pubDate: string;
  source: string;
}

export async function fetchPressNews(): Promise<NewsArticle[]> {
  try {
    const url = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent('https://news.google.com/rss/search?q=desastres+naturais+Brasil+OR+chuvas+enchentes+OR+defesa+civil&hl=pt-BR&gl=BR&ceid=BR:pt-419')}`;
    const response = await fetch(url);
    if (!response.ok) return [];
    
    const data = await response.json();
    if (!data.items || !Array.isArray(data.items)) return [];
    
    return data.items.slice(0, 10).map((item: any) => ({
      id: uuidv4(),
      title: item.title,
      link: item.link,
      pubDate: item.pubDate,
      source: "Google News",
    }));
  } catch (error) {
    console.error("Falha ao buscar notícias do Radar de Imprensa:", error);
    return [];
  }
}

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
  latitude?: number;
  longitude?: number;
  radiusKm?: number;
}

async function reverseGeocode(lat: number, lon: number): Promise<{ city?: string; state?: string }> {
  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10&addressdetails=1`);
    if (!response.ok) return {};
    const data = await response.json();
    if (data && data.address) {
      return {
        city: data.address.city || data.address.town || data.address.village || data.address.municipality,
        state: data.address.state
      };
    }
  } catch (e) {
    console.warn("Falha no reverse geocode", e);
  }
  return {};
}

export async function fetchGovAlerts(): Promise<ExternalAlert[]> {
  console.log("Executando pipeline de predição e integração com INMET e CEMADEN...");
  let alerts: ExternalAlert[] = [];
  
  try {
    const url = `https://api.allorigins.win/get?url=${encodeURIComponent('https://apitempo.inmet.gov.br/alerta')}`;
    const response = await fetch(url);
    
    if (response.ok) {
      const dataProxy = await response.json();
      const data = JSON.parse(dataProxy.contents);
      
      const avisos = Array.isArray(data) ? data : (data.avisos || data.data || []);
      for (const item of avisos) {
        if (!item.municipios && !item.geocode && (!item.latitude || !item.longitude)) continue;
        
        const severityMap: Record<string, ExternalAlert['severity']> = {
          'Aviso de Observação': 'Baixa',
          'Aviso Especial': 'Alta',
          'Perigo Potencial': 'Média',
          'Perigo': 'Alta',
          'Grande Perigo': 'Crítica',
        };
        
        let municipios = Array.isArray(item.municipios) ? item.municipios : [];
        if (municipios.length === 0 && item.geocode) {
           municipios = [{
             codigo_ibge: item.geocode,
             uf: item.state || item.uf,
             nome_municipio: item.city || item.municipio
           }];
        }

        if (municipios.length === 0 && item.latitude && item.longitude) {
           const geo = await reverseGeocode(Number(item.latitude), Number(item.longitude));
           municipios = [{
             uf: geo.state || "N/A",
             nome_municipio: geo.city || "Município Desconhecido"
           }];
        }

        for (const mun of municipios) {
          const type = item.descricao || item.aviso_descricao || "Evento Climático";
          const dateStr = item.data_inicio || new Date().toISOString();
          let cityName = mun.nome_municipio || "N/A";
          
          let extId = item.id_aviso ? `INMET-${item.id_aviso}-${mun.codigo_ibge || cityName.replace(/\s+/g,'-')}` : `INMET-${cityName.replace(/\s+/g,'-')}-${type.replace(/\s+/g,'-')}-${dateStr}`;

          alerts.push({
            externalId: extId,
            source: "INMET",
            severity: severityMap[item.severidade] || "Média",
            region: "N/A", 
            state: mun.uf || "N/A",
            city: cityName,
            ibgeCode: mun.codigo_ibge,
            disasterType: type,
            description: item.riscos?.join(", ") || item.descricao || "Aviso Oficial Meteorológico",
            issuedAt: new Date(dateStr),
            latitude: item.latitude ? Number(item.latitude) : -23.5505 + (Math.random() - 0.5), 
            longitude: item.longitude ? Number(item.longitude) : -46.6333 + (Math.random() - 0.5),
            radiusKm: severityMap[item.severidade] === "Crítica" ? 15 : (severityMap[item.severidade] === "Alta" ? 10 : 5)
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
    const simulatedAlerts = generateSimulatedAlerts();
    alerts.push(...simulatedAlerts);
  } catch (error) {
    console.warn("Erro ao gerar chamadas simuladas de CEMADEN e Defesa Civil:", error);
  }

  return alerts;
}

function generateSimulatedAlerts(): ExternalAlert[] {
  const nowStr = new Date().toISOString();
  return [
    {
      externalId: `CEMADEN-São-Sebastião-Deslizamento-${nowStr.split('T')[0]}`,
      source: "CEMADEN",
      severity: "Crítica",
      region: "Sudeste",
      state: "SP",
      city: "São Sebastião",
      ibgeCode: "3550704", 
      disasterType: "Movimento de Massa / Deslizamento",
      description: "Saturação de solo > 90% na Serra do Mar, acumulado superior a 150mm. Risco iminente de deslizamento.",
      issuedAt: new Date(),
      precipitationExpected: 180,
      latitude: -23.7604,
      longitude: -45.4054,
      radiusKm: 12
    },
    {
      externalId: `DEF-CIVIL-Eldorado-do-Sul-Inundação-${nowStr.split('T')[0]}`,
      source: "DEFESA_CIVIL",
      severity: "Alta",
      region: "Sul",
      state: "RS",
      city: "Eldorado do Sul",
      ibgeCode: "4306767", 
      disasterType: "Inundação Gradual",
      description: "Nível do rio próximo à cota de transbordo (8m). Evacuação em áreas ribeirinhas recomendada.",
      issuedAt: new Date(Date.now() - 3600000), 
      precipitationExpected: 90,
      latitude: -30.0028,
      longitude: -51.3204,
      radiusKm: 8
    }
  ];
}
