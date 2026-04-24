import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import { fetchGovAlerts, ExternalAlert } from "../services/dataService";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PageTransition } from "../components/PageTransition";
import { MapContainer, TileLayer, Circle, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { 
  Filter, 
  Download, 
  Map as MapIcon, 
  TrendingUp, 
  AlertTriangle, 
  MapPin, 
  Newspaper,
  Waves,
  CloudLightning,
  Droplets,
  Wind
} from "lucide-react";

export default function Dashboard() {
  const [alerts, setAlerts] = useState<ExternalAlert[]>([]);
  const [radarTimestamp, setRadarTimestamp] = useState<number | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    async function loadData() {
      const data = await fetchGovAlerts();
      setAlerts(data);
    }
    loadData();
    const interval = setInterval(loadData, 60000); // refresh every minute

    async function loadRadar() {
      try {
        const res = await fetch("https://api.rainviewer.com/public/weather-maps.json");
        if (res.ok) {
          const data = await res.json();
          if (data.radar && data.radar.past && data.radar.past.length > 0) {
            const latest = data.radar.past[data.radar.past.length - 1].time;
            setRadarTimestamp(latest);
          }
        }
      } catch (err) {
        console.error("Failed to load rainviewer map data", err);
      }
    }
    loadRadar();
    const radarInterval = setInterval(loadRadar, 10 * 60000); // refresh radar every 10 min
    
    return () => {
      clearInterval(interval);
      clearInterval(radarInterval);
    };
  }, []);

  const alertsSul = alerts.filter(a => a.region === "Sul").length;
  const alertsSudeste = alerts.filter(a => a.region === "Sudeste").length;
  const alertsNordeste = alerts.filter(a => a.region === "Nordeste").length;
  const criticalCount = alerts.filter(a => a.severity === "Crítica").length;

  return (
    <div className="bg-background text-on-background min-h-screen flex overflow-hidden">
      <Sidebar />
      <main className="flex-1 md:ml-64 mt-14 md:mt-0 p-container-margin overflow-y-auto bg-background">
        <PageTransition>
          {/* Dashboard Header */}
          <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-container-margin">
            <div>
              <h1 className="font-headline-md text-headline-md text-on-surface mb-1">Painel Operacional Brasil</h1>
              <div className="flex items-center gap-2">
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-secondary"></span>
                </span>
                <span className="font-data-mono text-data-mono text-secondary">Monitoramento Ativo 24/7</span>
                <span className="text-surface-highest px-2">•</span>
                <span className="font-label-caps text-label-caps text-outline">Última atualização: recém atualizado</span>
              </div>
            </div>
            <div className="flex gap-2">
              <button className="bg-surface-container-low border border-surface-container-high hover:border-outline-variant text-on-surface font-data-mono text-data-mono px-4 py-2 rounded flex items-center gap-2 transition-colors">
                <Filter size={16} />
                Filtros
              </button>
              <button className="bg-surface-container-low border border-surface-container-high hover:border-outline-variant text-on-surface font-data-mono text-data-mono px-4 py-2 rounded flex items-center gap-2 transition-colors">
                <Download size={16} />
                Exportar
              </button>
            </div>
          </header>

          {/* Bento Grid Layout */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
            
             {/* 1. Mapa de Alertas */}
             <div className="bg-surface-container-low border border-surface-container-highest rounded-lg md:col-span-2 flex flex-col relative overflow-hidden h-[400px]">
               <div className="p-card-padding border-b border-surface-container-highest flex justify-between items-center z-10 bg-surface-container-low/80 backdrop-blur-sm relative custom-z-index">
                 <div className="flex items-center gap-2">
                   <MapIcon className="text-primary" size={18} />
                   <h2 className="font-data-mono text-data-mono text-on-surface uppercase tracking-wider">Radar Meteorológico & Áreas de Risco (Live)</h2>
                 </div>
                 <div className="flex gap-2">
                   <span className="bg-surface-container-highest text-inverse-surface font-label-caps text-label-caps px-2 py-1 rounded">Tempo Real</span>
                 </div>
               </div>
               <div className="flex-1 relative flex z-0">
                  <MapContainer center={[-14.235, -51.925]} zoom={4} style={{ height: '100%', width: '100%' }} zoomControl={false}>
                    <TileLayer
                      url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                      attribution='&copy; <a href="https://carto.com/">CARTO</a>'
                    />
                    {radarTimestamp && (
                      <TileLayer
                        url={`https://tilecache.rainviewer.com/v2/radar/${radarTimestamp}/256/{z}/{x}/{y}/2/1_1.png`}
                        opacity={0.6}
                      />
                    )}
                    {alerts.filter(a => a.latitude && a.longitude).map(alert => (
                      <Circle
                         key={alert.externalId}
                         center={[alert.latitude!, alert.longitude!]}
                         radius={alert.radiusKm ? alert.radiusKm * 1000 : 10000}
                         pathOptions={{
                            color: alert.severity === 'Crítica' ? '#FFB4AB' : (alert.severity === 'Alta' ? '#A8C7FA' : '#DBE4CE'),
                            fillColor: alert.severity === 'Crítica' ? '#FFB4AB' : (alert.severity === 'Alta' ? '#A8C7FA' : '#DBE4CE'),
                            fillOpacity: 0.4,
                            weight: 2
                         }}
                      >
                         <Popup className="text-on-surface">
                            <strong>{alert.disasterType}</strong><br/>
                            {alert.city} - {alert.severity}
                         </Popup>
                      </Circle>
                    ))}
                  </MapContainer>
                  
                 <div className="absolute inset-0 pointer-events-none z-[1000] p-4 flex flex-col justify-end">
                   <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                     <div className="bg-surface/90 border border-surface-container-highest p-3 rounded flex flex-col pointer-events-auto">
                       <span className="font-label-caps text-label-caps text-outline mb-1">SUL</span>
                       <span className="font-headline-md text-headline-md text-error">{alertsSul.toString().padStart(2, '0')}</span>
                     </div>
                     <div className="bg-surface/90 border border-surface-container-highest p-3 rounded flex flex-col pointer-events-auto">
                       <span className="font-label-caps text-label-caps text-outline mb-1">SUDESTE</span>
                       <span className="font-headline-md text-headline-md text-primary">{alertsSudeste.toString().padStart(2, '0')}</span>
                     </div>
                     <div className="bg-surface/90 border border-surface-container-highest p-3 rounded flex flex-col pointer-events-auto">
                       <span className="font-label-caps text-label-caps text-outline mb-1">NORDESTE</span>
                       <span className="font-headline-md text-headline-md text-tertiary">{alertsNordeste.toString().padStart(2, '0')}</span>
                     </div>
                     <div className="bg-surface/90 border border-surface-container-highest p-3 rounded flex flex-col pointer-events-auto">
                       <span className="font-label-caps text-label-caps text-outline mb-1">NORTE</span>
                       <span className="font-headline-md text-headline-md text-inverse-surface">01</span>
                     </div>
                     <div className="bg-surface/90 border border-surface-container-highest p-3 rounded flex flex-col pointer-events-auto">
                       <span className="font-label-caps text-label-caps text-outline mb-1">CENTRO-OESTE</span>
                       <span className="font-headline-md text-headline-md text-inverse-surface">00</span>
                     </div>
                   </div>
                 </div>
               </div>
             </div>

            {/* 2. Tendência 48h */}
            <div className="bg-surface-container-low border border-surface-container-highest rounded-lg md:col-span-1 flex flex-col h-[400px]">
              <div className="p-card-padding border-b border-surface-container-highest flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <TrendingUp className="text-outline" size={18} />
                  <h2 className="font-data-mono text-data-mono text-on-surface uppercase tracking-wider">Tendência 48h</h2>
                </div>
              </div>
              <div className="flex-1 p-card-padding flex flex-col justify-end relative">
                <div className="absolute top-4 left-4 font-headline-md text-headline-md text-on-surface">
                  {criticalCount} <span className="font-data-mono text-data-mono text-outline">Eventos Críticos</span>
                </div>
                <div className="flex items-end justify-between h-[200px] gap-1 pb-4 border-b border-surface-container-highest">
                  <div className="w-full bg-surface-container-highest rounded-t-sm h-[20%]"></div>
                  <div className="w-full bg-surface-container-highest rounded-t-sm h-[35%]"></div>
                  <div className="w-full bg-surface-container-highest rounded-t-sm h-[25%]"></div>
                  <div className="w-full bg-surface-container-highest rounded-t-sm h-[50%]"></div>
                  <div className="w-full bg-primary-container rounded-t-sm h-[80%] hover:opacity-80 transition-opacity"></div>
                  <div className="w-full bg-error rounded-t-sm h-[100%] hover:opacity-80 transition-opacity"></div>
                  <div className="w-full bg-primary-container rounded-t-sm h-[70%] hover:opacity-80 transition-opacity"></div>
                  <div className="w-full bg-surface-container-highest rounded-t-sm h-[40%]"></div>
                  <div className="w-full bg-surface-container-highest rounded-t-sm h-[30%]"></div>
                  <div className="w-full bg-surface-container-highest rounded-t-sm h-[15%]"></div>
                </div>
                <div className="flex justify-between mt-2 font-label-caps text-label-caps text-outline">
                  <span>-48h</span>
                  <span>-24h</span>
                  <span>Agora</span>
                </div>
              </div>
            </div>

            {/* 3. Feed de Alertas em Tempo Real */}
            <div className="bg-surface-container-low border border-surface-container-highest rounded-lg md:col-span-2 lg:col-span-1.5 flex flex-col h-[500px]">
              <div className="p-card-padding border-b border-error/30 bg-error/5 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="text-error" fill="currentColor" size={18} />
                  <h2 className="font-data-mono text-data-mono text-on-surface uppercase tracking-wider">Feed de Alertas Táticos</h2>
                </div>
                <span className="bg-error/10 text-error font-label-caps text-label-caps px-2 py-1 rounded border border-error/20">AO VIVO</span>
              </div>
              <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
                {alerts.length === 0 ? (
                  <div className="text-on-surface-variant font-body-base text-sm text-center py-4">Carregando dados...</div>
                ) : null}
                {alerts.map((alert) => (
                  <div 
                    key={alert.externalId} 
                    className={`bg-surface border rounded flex overflow-hidden cursor-pointer transition-all duration-300 group ${
                      alert.severity === 'Crítica' 
                        ? 'border-error/30 hover:border-error hover:bg-error/5 shadow-sm hover:shadow-[0_0_15px_rgba(255,180,171,0.15)]' 
                        : alert.severity === 'Alta' 
                          ? 'border-primary/30 hover:border-primary hover:bg-primary/5 shadow-sm hover:shadow-[0_0_15px_rgba(168,199,250,0.15)]' 
                          : 'border-tertiary/30 hover:border-tertiary hover:bg-tertiary/5 shadow-sm hover:shadow-[0_0_15px_rgba(219,228,206,0.15)]'
                    }`}
                    onClick={() => navigate(`/alert/${encodeURIComponent(alert.externalId)}`)}
                  >
                    <div className={`w-1 transition-transform group-hover:scale-y-110 ${alert.severity === 'Crítica' ? 'bg-error' : alert.severity === 'Alta' ? 'bg-primary' : 'bg-tertiary'}`}></div>
                    <div className="p-3 flex-1">
                      <div className="flex justify-between items-start mb-1">
                        <div className="flex items-center gap-2">
                          {alert.disasterType === 'Enchente' ? (
                            <Waves size={16} className={alert.severity === 'Crítica' ? 'text-error' : alert.severity === 'Alta' ? 'text-primary' : 'text-tertiary'} />
                          ) : alert.disasterType === 'Tempestade' ? (
                            <CloudLightning size={16} className={alert.severity === 'Crítica' ? 'text-error' : alert.severity === 'Alta' ? 'text-primary' : 'text-tertiary'} />
                          ) : (
                            <AlertTriangle size={16} className={alert.severity === 'Crítica' ? 'text-error' : alert.severity === 'Alta' ? 'text-primary' : 'text-tertiary'} />
                          )}
                          <span className="font-data-mono text-data-mono font-bold text-on-surface">{alert.disasterType} {alert.severity === 'Crítica' ? 'Severa' : ''}</span>
                        </div>
                        <span className="font-label-caps text-label-caps text-outline">
                          {formatDistanceToNow(new Date(alert.issuedAt), { addSuffix: true, locale: ptBR })}
                        </span>
                      </div>
                      <div className="text-sm text-on-surface-variant mb-2 line-clamp-2">{alert.description}</div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1 bg-surface-container px-1.5 py-0.5 rounded text-xs">
                          <MapPin size={12} className="text-outline" />
                          <span className="font-label-caps text-label-caps text-on-surface-variant">{alert.city}, {alert.state}</span>
                        </div>
                        {alert.precipitationExpected !== undefined && alert.precipitationExpected > 0 && (
                          <div className="flex items-center gap-1 bg-tertiary/10 text-tertiary px-1.5 py-0.5 rounded text-xs font-data-mono font-bold">
                            <Droplets size={12} /> {alert.precipitationExpected}mm
                          </div>
                        )}
                        {alert.windSpeedExpected !== undefined && alert.windSpeedExpected > 0 && (
                          <div className="flex items-center gap-1 bg-primary/10 text-primary px-1.5 py-0.5 rounded text-xs font-data-mono font-bold">
                            <Wind size={12} /> {alert.windSpeedExpected}km/h
                          </div>
                        )}
                        <div className="ml-auto text-[10px] font-bold tracking-widest uppercase text-outline">
                          {alert.source}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 4. Radar de Notícias */}
            <div className="bg-surface-container-low border border-surface-container-highest rounded-lg md:col-span-1 lg:col-span-1.5 flex flex-col h-[500px]">
              <div className="p-card-padding border-b border-surface-container-highest flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Newspaper className="text-outline" size={18} />
                  <h2 className="font-data-mono text-data-mono text-on-surface uppercase tracking-wider">Radar de Imprensa</h2>
                </div>
              </div>
              <div className="flex-1 p-4 flex flex-col gap-4">
                <div className="pb-4 border-b border-surface-container-highest last:border-0 last:pb-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="bg-surface-container-highest text-inverse-surface font-label-caps text-label-caps px-2 py-0.5 rounded">G1 SC</span>
                    <span className="font-label-caps text-label-caps text-outline">Há 1 hora</span>
                  </div>
                  <h3 className="font-data-mono text-[14px] text-on-surface hover:text-primary transition-colors cursor-pointer mb-1 leading-tight">Defesa Civil eleva nível de alerta para chuvas extremas no Vale do Itajaí</h3>
                  <p className="text-xs text-on-surface-variant line-clamp-2">Previsão indica volumes acima de 150mm para as próximas 24 horas. Abrigos já estão sendo preparados pelas prefeituras locais.</p>
                </div>
                <div className="pb-4 border-b border-surface-container-highest last:border-0 last:pb-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="bg-surface-container-highest text-inverse-surface font-label-caps text-label-caps px-2 py-0.5 rounded">Folha PR</span>
                    <span className="font-label-caps text-label-caps text-outline">Há 3 horas</span>
                  </div>
                  <h3 className="font-data-mono text-[14px] text-on-surface hover:text-primary transition-colors cursor-pointer mb-1 leading-tight">Ciclone extratropical afasta-se da costa, mas ventos fortes persistem</h3>
                  <p className="text-xs text-on-surface-variant line-clamp-2">Apesar do afastamento do sistema meteorológico, rajadas continuam causando transtornos pontuais na rede elétrica da capital paranaense.</p>
                </div>
              </div>
            </div>

          </div>
        </PageTransition>
      </main>
    </div>
  );
}
