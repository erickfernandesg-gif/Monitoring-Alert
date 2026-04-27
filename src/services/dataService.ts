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
  source: "INMET" | "CEMADEN" | "DEFESA_CIVIL" | "NASA_FIRMS" | "ANA" | "USGS" | "GDACS" | "INPE_PREDICTION" | "GEE_PREDICTION";
  severity: "Baixa" | "Média" | "Alta" | "Crítica" | "PREDICTIVE_WARNING";
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

const geocodingCache = new Map<string, { city?: string; state?: string }>();

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getProxyUrl(targetUrl: string) {
  const baseUrl = typeof window === 'undefined' ? 'http://127.0.0.1:3000' : '';
  return `${baseUrl}/api/proxy-gov?url=${encodeURIComponent(targetUrl)}`;
}

async function reverseGeocode(lat: number, lon: number): Promise<{ city?: string; state?: string }> {
  // Arredondar coordenadas para criar chave de cache. 3 casas dec = aprox 110 metros
  const cacheKey = `${lat.toFixed(3)},${lon.toFixed(3)}`;
  if (geocodingCache.has(cacheKey)) {
    return geocodingCache.get(cacheKey)!;
  }

  try {
    // Respeita o limite de rate-limiting do Nominatim (max 1/segundo)
    await sleep(1500);
    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10&addressdetails=1`);
    if (!response.ok) return {};
    const data = await response.json();
    if (data && data.address) {
      const result = {
        city: data.address.city || data.address.town || data.address.village || data.address.municipality,
        state: data.address.state
      };
      geocodingCache.set(cacheKey, result);
      return result;
    }
  } catch (e) {
    console.warn("Falha no reverse geocode", e);
  }
  return {};
}

export async function fetchGovAlerts(): Promise<ExternalAlert[]> {
  console.log("Executando pipeline de predição e integração com APIs Governamentais...");
  
  // Paraleliza ou executa em sequência
  const [inmetAlerts, usgsAlerts, gdacsAlerts] = await Promise.all([
     fetchInmetAlerts(),
     fetchUSGSEarthquakes(),
     fetchGDACSAlerts()
  ]);

  return [...inmetAlerts, ...usgsAlerts, ...gdacsAlerts];
}

async function fetchInmetAlerts(): Promise<ExternalAlert[]> {
  const alerts: ExternalAlert[] = [];
  const inmetUrl = 'https://apiprevmet3.inmet.gov.br/avisos/ativos';

  try {
    const response = await fetch(getProxyUrl(inmetUrl));
    if (!response.ok) {
      console.warn(`[INMET FETCH WARNING]: HTTP Status: ${response.status}`);
      return alerts;
    }

    const inmetData = await response.json();
    if (!inmetData) return alerts;

    const avisos = Array.isArray(inmetData) ? inmetData : (inmetData.avisos || inmetData.data || []);
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
  } catch (error: any) {
    console.error("[INMET FETCH ERROR]:", error.message);
  }
  return alerts;
}

async function fetchUSGSEarthquakes(): Promise<ExternalAlert[]> {
  const alerts: ExternalAlert[] = [];
  try {
    // A API do USGS é pública, confere CORS e não precisa de chave nem proxy interno.
    // Retorna todos os terremotos do mundo com M > 4.5 nas últimas 24h.
    const usgsUrl = "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_day.geojson"; 
    const response = await fetch(usgsUrl);
    
    if (response.ok) {
       const data = await response.json();
       if (data && data.features) {
         for (const feature of data.features) {
           const [lon, lat] = feature.geometry.coordinates;
           
           // Filtro para focar no Brasil e arredores:
           // O Brasil fica aprox entre Lat: 5 a -34, Lon: -74 a -34.
           if (lat < 5 && lat > -34 && lon < -34 && lon > -74) {
             const magnitude = feature.properties.mag;
             const severity = magnitude >= 6.0 ? "Crítica" : (magnitude >= 5.0 ? "Alta" : "Média");
             
             // Usa geocoding reverso para encontrar a cidade/estado do tremor mais próximo
             const geo = await reverseGeocode(lat, lon);
             
             alerts.push({
                externalId: `USGS-${feature.id}`,
                source: "USGS",
                severity: severity,
                region: geo.state ? "Nacional/Fronteira" : "Oceano/Desconhecido",
                state: geo.state || "N/A",
                city: geo.city || feature.properties.place || "N/A",
                disasterType: "Terremoto / Tremor de Terra",
                description: `Tremor de magnitude ${magnitude} registrado. Local de referência: ${feature.properties.place}. (Fonte: USGS)`,
                issuedAt: new Date(feature.properties.time),
                latitude: lat,
                longitude: lon,
                radiusKm: magnitude * 15 // Raio aproximado de impacto baseado na escala
             });
           }
         }
       }
    }
  } catch (error: any) {
    console.error("[USGS FETCH ERROR]:", error.message);
  }
  return alerts;
}

async function fetchGDACSAlerts(): Promise<ExternalAlert[]> {
  const alerts: ExternalAlert[] = [];
  try {
    // GDACS possui endpoint JSON gratuito e público mundial para Flood, Cyclones, Earthquakes, etc
    const gdacsUrl = "https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH?eventlist=EQ,TC,FL,VO,DR,FW";
    const response = await fetch(gdacsUrl);
    
    if (response.ok) {
       const data = await response.json();
       if (data && data.features) {
         for (const feature of data.features) {
           const [lon, lat] = feature.geometry.coordinates;
           
           // Se quisermos apenas Brasil, filtramos pela BBox (descomente para focar)
           // if (!(lat < 5 && lat > -34 && lon < -34 && lon > -74)) continue;

           const severityConfig: Record<string, "Baixa"|"Média"|"Alta"|"Crítica"> = {
             "Orange": "Alta",
             "Red": "Crítica",
             "Green": "Baixa"
           };

           // Mapeamento GDACS alert level
           let severity = severityConfig[feature.properties.alertlevel] || "Média";
           
           // Evita spam de 'green' no GDACS (são muitos alertas pequenos verdes noutros continentes)
           if (severity === "Baixa" && feature.properties.eventtype === "EQ") continue;

           const eventNames: Record<string, string> = {
            "EQ": "Terremoto",
            "TC": "Ciclone Tropical",
            "FL": "Inundação",
            "VO": "Vulcão",
            "DR": "Seca",
            "FW": "Incêndio Florestal",
            "WF": "Incêndio Florestal"
           };

           const propertyEventType = feature.properties.eventtype;
           alerts.push({
              externalId: `GDACS-${feature.properties.eventid}`,
              source: "GDACS" as any, 
              severity,
              region: "Internacional/Nacional",
              state: feature.properties.country || "N/A",
              city: feature.properties.name || "N/A",
              disasterType: eventNames[propertyEventType] || propertyEventType,
              description: feature.properties.description || "Alerta de desastre global transmitido pelo Global Disaster Alert and Coordination System.",
              issuedAt: new Date(feature.properties.fromdate),
              latitude: lat,
              longitude: lon,
              radiusKm: 30 // GDACS reporta eventos massivos, raio simbólico.
           });
         }
       }
    }
  } catch (error: any) {
    console.error("[GDACS FETCH ERROR]:", error.message);
  }
  return alerts;
}

