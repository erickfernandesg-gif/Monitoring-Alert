// Mock data generators representing real external APIs (CPTEC/INMET, CEMADEN, Defesa Civil)
import { v4 as uuidv4 } from "uuid";

export interface ExternalAlert {
  externalId: string;
  source: "INMET" | "CEMADEN" | "DEFESA_CIVIL" | "NASA_FIRMS" | "ANA";
  severity: "Baixa" | "Média" | "Alta" | "Crítica";
  region: string;
  state: string;
  city: string;
  disasterType: string;
  description: string;
  issuedAt: Date;
  precipitationExpected?: number; // mm
  windSpeedExpected?: number; // km/h
}

export async function fetchGovAlerts(): Promise<ExternalAlert[]> {
  /*
   * Integrações Reais e Precisas Planejadas:
   * 
   * 1. INMET / CPTEC (Meteorologia Preditiva):
   * Utilizamos dados GFS (Global Forecast System) e Cosmo para prever volumes de chuva > 100mm/24h.
   * Assim que a predição atinge o limiar, o sistema aciona a Severidade "Alta" preemptivamente.
   * 
   * 2. CEMADEN (Monitoramento de Solo e Estações Hidrológicas):
   * Conectamos nas APIs de Pluviômetros Automáticos na rede telemétrica.
   * Se saturação do solo + chuva prevista = Risco alto de deslizamento/enchente rápida.
   * 
   * 3. INPE / NASA FIRMS (Integração Satélite):
   * Monitoramento de anomalias térmicas (queimadas) com atualizações de 3h a 6h (MODIS e VIIRS).
   * 
   * 4. ANA (Agência Nacional de Águas):
   * Monitoramento de níveis dos reservatórios e calhas dos principais rios (cota de alerta, inundação).
   * 
   * A lógica descrita abaixo simula a consolidação (Data Pipeline) desses sensores
   * para disparar alertas PREVENTIVOS precisos para as equipes humanitárias de todo o Brasil.
   */
  console.log("Executando pipeline de predição e integração INMET/CEMADEN/ANA...");
  
  // Generating mocked alerts mapped to the UI spec to simulate early warning systems
  const mockAlerts: ExternalAlert[] = [
    {
      externalId: `INMET-PRED-SC-001`,
      source: "INMET",
      severity: "Crítica",
      region: "Sul",
      state: "SC",
      city: "Rio do Sul",
      disasterType: "Enchente",
      description: "Alerta Preditivo: GFS indica 180mm de chuva. Rio Itajaí-Açu projetado para ultrapassar cota de 9m. Prepare evacuação.",
      issuedAt: new Date(Date.now() - 3600000), // 1 hour ago
      precipitationExpected: 180,
      windSpeedExpected: 25
    },
    {
      externalId: `CEMADEN-MON-PR-042`,
      source: "CEMADEN",
      severity: "Alta",
      region: "Sul",
      state: "PR",
      city: "Curitiba",
      disasterType: "Tempestade",
      description: "Radar detecta formação convectiva extrema. Ventos previstos acima de 80km/h com risco na infraestrutura.",
      issuedAt: new Date(Date.now() - 15 * 60000), // 15 mins ago
      precipitationExpected: 60,
      windSpeedExpected: 85
    },
    {
      externalId: `ANA-HYDRO-RS-091`,
      source: "ANA",
      severity: "Crítica",
      region: "Sul",
      state: "RS",
      city: "Eldorado do Sul",
      disasterType: "Enchente",
      description: "Transbordamento Dique: Cota de inundação extrema (8.5m) detectada via telemetria. Risco iminente.",
      issuedAt: new Date(Date.now() - 120 * 60000), // 2 hrs ago
      precipitationExpected: 210,
      windSpeedExpected: 10
    },
    {
      externalId: `NASA-FIRMS-MT-112`,
      source: "NASA_FIRMS",
      severity: "Alta",
      region: "Centro-Oeste",
      state: "MT",
      city: "Poconé",
      disasterType: "Queimada",
      description: "VIIRS: Múltiplos focos de calor no Pantanal. Umidade < 15%. Rápida propagação prevista.",
      issuedAt: new Date(Date.now() - 180 * 60000), // 3 hrs ago
      precipitationExpected: 0,
      windSpeedExpected: 35
    }
  ];

  return mockAlerts;
}
