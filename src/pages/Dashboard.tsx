import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import { fetchGovAlerts, fetchPressNews, ExternalAlert, NewsArticle } from "../services/dataService";
import { useNavigate } from "react-router-dom";
import { safeFormatDistanceToNow, safeFormat } from "../utils/dateTools";
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
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [isLoadingNews, setIsLoadingNews] = useState(true);
  const [radarTimestamp, setRadarTimestamp] = useState<number | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    async function loadData() {
      const data = await fetchGovAlerts();
      setAlerts(data);
    }
    loadData();
    const interval = setInterval(loadData, 60000); // refresh every minute

    async function loadNews() {
      setIsLoadingNews(true);
      const newsData = await fetchPressNews();
      setNews(newsData);
      setIsLoadingNews(false);
    }
    loadNews();
    const newsInterval = setInterval(loadNews, 300000); // refresh news every 5 minutes

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
      clearInterval(newsInterval);
      clearInterval(radarInterval);
    };
  }, []);

  const alertsSul = alerts.filter(a => a.region === "Sul").length;
  const alertsSudeste = alerts.filter(a => a.region === "Sudeste").length;
  const alertsNordeste = alerts.filter(a => a.region === "Nordeste").length;
  const criticalCount = alerts.filter(a => a.severity === "Crítica").length;

  return (
    <div className="bg-slate-50 text-slate-900 min-h-screen flex overflow-hidden">
      <Sidebar />
      <main className="flex-1 md:ml-20 mt-14 md:mt-0 p-4 md:p-8 overflow-y-auto bg-slate-50">
        <PageTransition>
          {/* Dashboard Header */}
          <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900 mb-2">Painel Operacional Brasil</h1>
              <div className="flex items-center gap-3">
                <span className="flex h-3 w-3 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                </span>
                <span className="text-sm font-semibold text-emerald-600">Monitoramento Ativo 24/7</span>
                <span className="text-slate-300">•</span>
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Centro de Comando Local</span>
              </div>
            </div>
            <div className="flex gap-3">
              <button className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-semibold px-4 py-2 rounded-xl flex items-center gap-2 transition-all shadow-sm">
                <Filter size={16} />
                Filtros
              </button>
              <button className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-semibold px-4 py-2 rounded-xl flex items-center gap-2 transition-all shadow-sm">
                <Download size={16} />
                Exportar
              </button>
            </div>
          </header>

          {/* Bento Grid Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* 1. Mapa de Alertas */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm lg:col-span-2 flex flex-col relative overflow-hidden h-[500px]">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center z-10 bg-white/90 backdrop-blur-sm relative custom-z-index">
                <div className="flex items-center gap-2">
                  <MapIcon className="text-slate-500" size={20} />
                  <h2 className="text-slate-800 font-bold tracking-tight">Radar Meteorológico & Áreas de Risco (Live)</h2>
                </div>
                <div className="flex gap-2">
                  <span className="bg-slate-100 text-slate-600 font-semibold px-3 py-1 rounded-full text-xs">Tempo Real</span>
                </div>
              </div>
              <div className="flex-1 relative flex z-0">
                <MapContainer center={[-14.235, -51.925]} zoom={4} style={{ height: '100%', width: '100%' }} zoomControl={false} className="z-0">
                  <TileLayer
                    url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                    attribution='&copy; <a href="https://carto.com/">CARTO</a>'
                  />
                  {radarTimestamp && (
                    <TileLayer
                      url={`https://tilecache.rainviewer.com/v2/radar/${radarTimestamp}/256/{z}/{x}/{y}/2/1_1.png`}
                      opacity={0.5}
                    />
                  )}
                  {alerts.filter(a => a.latitude && a.longitude).map(alert => (
                    <Circle
                       key={alert.externalId}
                       center={[alert.latitude!, alert.longitude!]}
                       radius={alert.radiusKm ? alert.radiusKm * 1000 : 10000}
                       pathOptions={{
                          color: alert.severity === 'Crítica' ? '#ef4444' : (alert.severity === 'Alta' ? '#f97316' : '#eab308'),
                          fillColor: alert.severity === 'Crítica' ? '#ef4444' : (alert.severity === 'Alta' ? '#f97316' : '#eab308'),
                          fillOpacity: 0.3,
                          weight: 2
                       }}
                    >
                       <Popup className="text-slate-800">
                          <strong>{alert.disasterType}</strong><br/>
                          {alert.city} - {alert.severity}
                       </Popup>
                    </Circle>
                  ))}
                </MapContainer>
                  
                <div className="absolute inset-0 pointer-events-none z-[1000] p-6 flex flex-col justify-end">
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    <div className="bg-white/95 border border-slate-100 p-4 rounded-xl shadow-sm flex flex-col pointer-events-auto">
                      <span className="text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider">SUL</span>
                      <span className="text-2xl font-bold text-red-600">{alertsSul.toString().padStart(2, '0')}</span>
                    </div>
                    <div className="bg-white/95 border border-slate-100 p-4 rounded-xl shadow-sm flex flex-col pointer-events-auto">
                      <span className="text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider">SUDESTE</span>
                      <span className="text-2xl font-bold text-slate-800">{alertsSudeste.toString().padStart(2, '0')}</span>
                    </div>
                    <div className="bg-white/95 border border-slate-100 p-4 rounded-xl shadow-sm flex flex-col pointer-events-auto">
                      <span className="text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider">NORDESTE</span>
                      <span className="text-2xl font-bold text-slate-800">{alertsNordeste.toString().padStart(2, '0')}</span>
                    </div>
                    <div className="bg-white/95 border border-slate-100 p-4 rounded-xl shadow-sm flex flex-col pointer-events-auto">
                      <span className="text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider">NORTE</span>
                      <span className="text-2xl font-bold text-slate-800">01</span>
                    </div>
                    <div className="bg-white/95 border border-slate-100 p-4 rounded-xl shadow-sm flex flex-col pointer-events-auto">
                      <span className="text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider">CENTRO-OESTE</span>
                      <span className="text-2xl font-bold text-slate-800">00</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Feed de Alertas Táticos */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm lg:col-span-1 flex flex-col h-[500px]">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center rounded-t-2xl bg-white">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="text-slate-500" size={20} />
                  <h2 className="text-slate-800 font-bold tracking-tight">Alertas Táticos</h2>
                </div>
                <span className="bg-red-50 text-red-600 font-semibold px-3 py-1 rounded-full text-xs flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse"></span>
                  AO VIVO
                </span>
              </div>
              <div className="flex-1 overflow-y-auto p-3 grid grid-cols-1 lg:grid-cols-2 gap-3 content-start">
                {alerts.length === 0 ? (
                  <div className="text-slate-500 text-sm text-center py-8 lg:col-span-2">Monitorando sistemas...</div>
                ) : null}
                {alerts.map((alert) => (
                  <div 
                    key={alert.externalId} 
                    className={`bg-white p-3 rounded-lg shadow-sm border border-gray-100 flex flex-col justify-between h-full cursor-pointer transition-all duration-200 group hover:shadow-md ${
                      alert.severity === 'Crítica' 
                        ? 'border-l-4 border-l-red-500 hover:border-red-300' 
                        : alert.severity === 'PREDICTIVE_WARNING'
                          ? 'border-l-4 border-l-purple-500 hover:border-purple-300'
                          : alert.severity === 'Alta' 
                            ? 'border-l-4 border-l-orange-500 hover:border-orange-300' 
                            : 'border-l-4 border-l-yellow-500 hover:border-yellow-300'
                    }`}
                    onClick={() => navigate(`/alert/${encodeURIComponent(alert.externalId)}`)}
                  >
                    <div className="flex justify-between items-center mb-1 gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          {alert.disasterType.toLowerCase().includes('enchente') ? (
                            <Waves size={14} className={`flex-shrink-0 ${alert.severity === 'Crítica' ? 'text-red-600' : alert.severity === 'PREDICTIVE_WARNING' ? 'text-purple-600' : alert.severity === 'Alta' ? 'text-orange-600' : 'text-yellow-600'}`} />
                          ) : alert.disasterType.toLowerCase().includes('tempestade') || alert.disasterType.toLowerCase().includes('chuva') ? (
                            <CloudLightning size={14} className={`flex-shrink-0 ${alert.severity === 'Crítica' ? 'text-red-600' : alert.severity === 'PREDICTIVE_WARNING' ? 'text-purple-600' : alert.severity === 'Alta' ? 'text-orange-600' : 'text-yellow-600'}`} />
                          ) : (
                            <AlertTriangle size={14} className={`flex-shrink-0 ${alert.severity === 'Crítica' ? 'text-red-600' : alert.severity === 'PREDICTIVE_WARNING' ? 'text-purple-600' : alert.severity === 'Alta' ? 'text-orange-600' : 'text-yellow-600'}`} />
                          )}
                          <span className="font-semibold text-slate-800 text-sm tracking-tight truncate">{alert.disasterType}</span>
                        </div>
                        <span className="text-[10px] font-medium text-slate-400 whitespace-nowrap flex-shrink-0">
                          {safeFormatDistanceToNow(alert.issuedAt)}
                        </span>
                    </div>
                    <div className="text-xs text-slate-600 mb-2 line-clamp-2">{alert.description}</div>
                    <div className="flex items-center gap-1.5 text-[10px] mt-auto">
                        {(alert.severity === 'Alta' || alert.severity === 'Crítica' || alert.severity === 'PREDICTIVE_WARNING') && (
                          <span className={`px-1.5 py-0.5 rounded font-bold flex-shrink-0 ${
                             alert.severity === 'Crítica' ? 'bg-red-100 text-red-700' : 
                             alert.severity === 'PREDICTIVE_WARNING' ? 'bg-purple-100 text-purple-700' :
                             'bg-orange-100 text-orange-700'
                          }`}>
                            {alert.severity === 'PREDICTIVE_WARNING' ? 'PREDICTIVO' : alert.severity}
                          </span>
                        )}
                        <span className="flex items-center gap-0.5 text-slate-500 truncate">
                          <MapPin size={10} className="flex-shrink-0" />
                          <span className="truncate">{alert.city}, {alert.state}</span>
                        </span>
                        <span className="ml-auto font-bold tracking-wider uppercase text-slate-400 flex-shrink-0">
                          {alert.source}
                        </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 4. Radar de Notícias */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm lg:col-span-2 flex flex-col h-[500px]">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center rounded-t-2xl">
                <div className="flex items-center gap-2">
                  <Newspaper className="text-slate-500" size={20} />
                  <h2 className="text-slate-800 font-bold tracking-tight">Radar de Imprensa (Tempo Real)</h2>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto flex flex-col divide-y divide-slate-100">
                {isLoadingNews ? (
                  <div className="flex-1 flex items-center justify-center text-slate-500 text-sm h-full">
                    <span className="animate-pulse">Buscando notícias no Google News...</span>
                  </div>
                ) : news.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center text-slate-500 text-sm h-full">
                    Nenhuma notícia crítica no momento.
                  </div>
                ) : (
                  news.map((item) => (
                    <div key={item.id} className="p-6 hover:bg-slate-50 transition-colors group flex flex-col gap-2">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="bg-slate-100 text-slate-700 font-semibold px-2.5 py-1 rounded-md text-xs uppercase tracking-wider">
                          {item.source}
                        </span>
                        <span className="text-xs font-medium text-slate-500">
                          {safeFormat(item.pubDate.replace(" ", "T"), "dd/MM/yyyy HH:mm")}
                        </span>
                      </div>
                      <a href={item.link} target="_blank" rel="noopener noreferrer" className="block">
                         <h3 className="text-base text-slate-800 font-bold group-hover:text-blue-600 transition-colors leading-snug">
                           {item.title}
                         </h3>
                      </a>
                      <a href={item.link} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-blue-600 hover:text-blue-700 mt-1 flex items-center gap-1 group-hover:underline">
                        Ler matéria original &rarr;
                      </a>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* 2. Tendência 48h */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm lg:col-span-1 flex flex-col h-[500px]">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center rounded-t-2xl">
                <div className="flex items-center gap-2">
                  <TrendingUp className="text-slate-500" size={20} />
                  <h2 className="text-slate-800 font-bold tracking-tight">Tendência 48h</h2>
                </div>
              </div>
              <div className="flex-1 p-6 flex flex-col justify-end relative bg-slate-50 rounded-b-2xl">
                <div className="absolute top-6 left-6 flex flex-col">
                  <span className="text-4xl font-black text-slate-800 tracking-tighter">{criticalCount}</span>
                  <span className="text-sm font-semibold text-slate-500">Eventos Críticos Ativos</span>
                </div>
                <div className="flex items-end justify-between h-[200px] gap-2 pb-4 border-b border-slate-200">
                  <div className="w-full bg-slate-200 rounded-t-md h-[20%]"></div>
                  <div className="w-full bg-slate-200 rounded-t-md h-[35%]"></div>
                  <div className="w-full bg-slate-200 rounded-t-md h-[25%]"></div>
                  <div className="w-full bg-slate-200 rounded-t-md h-[50%]"></div>
                  <div className="w-full bg-orange-400 rounded-t-md h-[80%] hover:bg-orange-500 transition-colors shadow-sm"></div>
                  <div className="w-full bg-red-500 rounded-t-md h-[100%] hover:bg-red-600 transition-colors shadow-sm"></div>
                  <div className="w-full bg-orange-400 rounded-t-md h-[70%] hover:bg-orange-500 transition-colors shadow-sm"></div>
                  <div className="w-full bg-slate-200 rounded-t-md h-[40%]"></div>
                  <div className="w-full bg-slate-200 rounded-t-md h-[30%]"></div>
                  <div className="w-full bg-slate-200 rounded-t-md h-[15%]"></div>
                </div>
                <div className="flex justify-between mt-3 text-xs font-bold uppercase tracking-wider text-slate-400">
                  <span>-48h</span>
                  <span>-24h</span>
                  <span>Hoje</span>
                </div>
              </div>
            </div>

          </div>
        </PageTransition>
      </main>
    </div>
  );
}
