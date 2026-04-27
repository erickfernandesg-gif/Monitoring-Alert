import { ExternalAlert } from "./dataService";
import { v4 as uuidv4 } from "uuid";

export interface WeatherForecast {
  lat: number;
  lng: number;
  precipitationMm: number;
  forecastDate: Date;
  riskLevel: 'BAIXO' | 'MEDIO' | 'ALTO' | 'SEVERO';
}

/**
 * Busca previsão de precipitação severa no INPE (CPTEC).
 * Atualmente as APIs de previsão por coordenadas exatas via CPTEC exigem
 * a conversão para IBGE code ou city code.
 * TODO: Integrar conversor Lat/Lng -> CPTEC CityID estruturalmente.
 * Como mock temporário de resiliência, geramos precipitação baseada na coordenada
 * (simulando áreas de risco) para o alerta preditivo.
 */
export async function fetchInpePrecipitation(lat: number, lng: number): Promise<WeatherForecast> {
  try {
    // Exemplo de como a requisição real poderia ser feita:
    // const cptecCityId = await getCptecCityId(lat, lng);
    // const response = await axios.get(`http://servicos.cptec.inpe.br/XML/cidade/7dias/${cptecCityId}/previsao.xml`);
    
    // Simulação do resultado (Mock temporário):
    // Cidades do sul (lat < -25) e litoral de SP/RJ têm mais risco simulado
    const isRiskyZone = lat < -23 && lat > -30 && lng > -55 && lng < -45;
    const mockPrecipitation = isRiskyZone ? 60 + Math.random() * 50 : Math.random() * 20;

    return {
      lat,
      lng,
      precipitationMm: mockPrecipitation,
      forecastDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Previsão de 24h
      riskLevel: evaluateDisasterRisk({ lat, lng, precipitationMm: mockPrecipitation, forecastDate: new Date(), riskLevel: 'BAIXO' }) === 'SEVERO' ? 'SEVERO' : 'BAIXO'
    };
  } catch (error: any) {
    console.error('[PREDICTION API ERROR]: INPE Precipitation fetch failed.', error.message);
    throw error;
  }
}

/**
 * Busca níveis de saturação do solo via Google Earth Engine (GEE).
 * TODO: Integrar via REST a uma function serverless que roda o earth engine api
 * para calcular NDVI / NDMI ou Soil Moisture na coordenada especificada.
 */
export async function fetchGeeSoilMoisture(lat: number, lng: number): Promise<number> {
  // Stub
  console.log('[GEE INTEGRATION STUB]: Buscar soil moisture na latLng', lat, lng);
  return 0.8; // 80% saturation mock
}

/**
 * Motor de regras preditivo:
 * Avalia o risco baseado num forecast específico.
 */
export function evaluateDisasterRisk(forecast: WeatherForecast): 'BAIXO' | 'MEDIO' | 'ALTO' | 'SEVERO' {
  // Regra de negócio: Se precipitationMm > 50 num período de 24h, retorna um risco crítico (ex: SEVERO).
  if (forecast.precipitationMm > 50) {
    return 'SEVERO';
  } else if (forecast.precipitationMm > 30) {
    return 'ALTO';
  } else if (forecast.precipitationMm > 15) {
    return 'MEDIO';
  }
  return 'BAIXO';
}
