import { useParams, useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { useEffect, useState } from "react";
import { fetchGovAlerts, ExternalAlert } from "../services/dataService";
import { format } from "date-fns";
import { PageTransition } from "../components/PageTransition";
import { 
  AlertTriangle, 
  MapPin, 
  Clock, 
  FileText, 
  PhoneCall, 
  RadioTower, 
  Satellite, 
  Activity, 
  TrendingUp, 
  Wind, 
  CheckSquare 
} from "lucide-react";

export default function AlertDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [alert, setAlert] = useState<ExternalAlert | null>(null);

  useEffect(() => {
    async function loadData() {
      const data = await fetchGovAlerts();
      const found = data.find(a => a.externalId === id);
      setAlert(found || data[0]); // fallback to first if not found 
    }
    loadData();
  }, [id]);

  if (!alert) return <div className="bg-background text-on-surface h-screen flex justify-center items-center">Loading...</div>;

  return (
    <div className="bg-background text-on-background min-h-screen flex overflow-hidden">
      <Sidebar />
      <main className="flex-1 md:ml-64 mt-14 md:mt-0 p-container-margin overflow-y-auto w-full">
        <PageTransition>
          <div className="max-w-[1600px] mx-auto grid grid-cols-12 gap-stack-md">
            
            {/* Header */}
            <div className="col-span-12 flex flex-col md:flex-row justify-between items-start md:items-end border-b border-surface-container-highest pb-stack-md mb-stack-md gap-stack-md">
              <div className="flex flex-col gap-unit">
                <div className="flex items-center gap-stack-sm mb-unit flex-wrap">
                  <span className={`px-2 py-0.5 rounded font-label-caps text-label-caps uppercase flex items-center gap-1 shadow-sm border ${alert.severity === 'Crítica' ? 'bg-error text-on-error border-error shadow-[0_0_8px_rgba(255,180,171,0.3)]' : 'bg-primary text-on-primary border-primary'}`}>
                    <AlertTriangle size={12} fill="currentColor" />
                    NÍVEL {alert.severity.toUpperCase()}
                  </span>
                  <span className="font-data-mono text-data-mono text-surface-variant bg-surface-container px-2 py-0.5 rounded border border-surface-container-highest">
                    ID: {alert.externalId}
                  </span>
                </div>
                <h1 className="font-display-lg text-display-lg text-on-surface uppercase m-0 leading-tight tracking-tight">Risco de {alert.disasterType}</h1>
                <div className="flex items-center gap-stack-md text-on-surface-variant font-data-mono text-data-mono mt-1">
                  <span className="flex items-center gap-1">
                    <MapPin size={16} />
                    {alert.city}, {alert.state}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock size={16} />
                    T-ZERO: {format(new Date(alert.issuedAt), "HH:mm 'BRT'")}
                  </span>
                </div>
              </div>
              
              <div className="flex items-center gap-stack-sm w-full md:w-auto flex-col sm:flex-row">
                <button 
                  onClick={() => navigate(`/post-event/${encodeURIComponent(alert.externalId)}`)}
                  className="flex items-center gap-2 px-4 py-2 border border-surface-container-highest rounded bg-surface hover:bg-surface-container-low transition-colors font-label-caps text-label-caps text-on-surface uppercase w-full sm:w-auto justify-center whitespace-nowrap"
                >
                  <FileText size={16} />
                  Relatório Pós-Evento
                </button>
                <button className="flex items-center gap-2 px-4 py-2 border border-error text-error rounded hover:bg-error/10 transition-colors font-label-caps text-label-caps uppercase w-full sm:w-auto justify-center whitespace-nowrap">
                  <PhoneCall size={16} />
                  Defesa Civil
                </button>
                <button className="flex items-center gap-2 px-4 py-2 bg-error text-on-error rounded hover:bg-error/90 transition-colors font-label-caps text-label-caps uppercase w-full sm:w-auto justify-center shadow-[0_0_15px_rgba(255,180,171,0.2)] whitespace-nowrap">
                  <RadioTower size={16} />
                  Broadcast Alert
                </button>
              </div>
            </div>

            {/* Map */}
            <div className="col-span-12 lg:col-span-8 bg-surface-container-low rounded-lg border border-surface-container-highest flex flex-col overflow-hidden h-[500px]">
              <div className="h-10 bg-surface flex items-center px-card-padding border-b border-surface-container-highest justify-between">
                <h2 className="font-label-caps text-label-caps text-on-surface-variant uppercase flex items-center gap-2">
                  <Satellite size={14} />
                  Telemetria Geoespacial
                </h2>
              </div>
              <div className="flex-1 relative bg-[#050505]">
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&q=80')] bg-cover bg-center opacity-30 mix-blend-luminosity"></div>
                <div className="absolute top-4 left-4 flex flex-col gap-2">
                  <div className="bg-surface/90 border border-surface-container-highest rounded px-3 py-2 backdrop-blur-sm">
                    <div className="font-label-caps text-label-caps text-on-surface-variant mb-1">ZONA DE IMPACTO</div>
                    <div className="font-data-mono text-data-mono text-error">12.4 km²</div>
                  </div>
                </div>
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 border border-error/30 rounded-full flex items-center justify-center">
                  <div className="w-32 h-32 border border-error/50 rounded-full flex items-center justify-center">
                    <div className="w-2 h-2 bg-error rounded-full shadow-[0_0_10px_rgba(255,180,171,1)]"></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Sensor Data */}
            <div className="col-span-12 lg:col-span-4 bg-surface-container-low rounded-lg border border-surface-container-highest flex flex-col">
              <div className="h-10 bg-surface flex items-center px-card-padding border-b border-surface-container-highest border-t-2 border-t-error">
                <h2 className="font-label-caps text-label-caps text-on-surface-variant uppercase flex items-center gap-2">
                  <Activity size={14} />
                  Dados dos Sensores
                </h2>
              </div>
              <div className="p-card-padding flex flex-col gap-stack-md flex-1 overflow-y-auto">
                <div className="flex flex-col gap-1 pb-stack-sm border-b border-surface-container-highest/50">
                  <span className="font-label-caps text-label-caps text-surface-variant">PRECIPITAÇÃO (INMET)</span>
                  <div className="flex items-end justify-between">
                    <span className="font-display-lg text-display-lg text-on-surface">85<span className="text-headline-md text-on-surface-variant ml-1">mm/h</span></span>
                    <span className="font-data-mono text-data-mono text-error flex items-center gap-1">
                      <TrendingUp size={14} /> +12%
                    </span>
                  </div>
                </div>
                <div className="flex flex-col gap-1 pb-stack-sm border-b border-surface-container-highest/50">
                  <span className="font-label-caps text-label-caps text-surface-variant">VELOCIDADE DOS VENTOS</span>
                  <div className="flex items-end justify-between">
                    <span className="font-display-lg text-display-lg text-on-surface">42<span className="text-headline-md text-on-surface-variant ml-1">km/h</span></span>
                    <span className="font-data-mono text-data-mono text-on-surface-variant flex items-center gap-1">
                      <Wind size={14} /> SE
                    </span>
                  </div>
                </div>
                <div className="mt-auto bg-surface-container rounded p-3 flex items-center justify-between border border-surface-container-highest">
                  <span className="font-label-caps text-label-caps text-on-surface-variant">INMET STATION LINK</span>
                  <span className="flex items-center gap-2 font-data-mono text-data-mono text-secondary">
                    <span className="w-2 h-2 rounded-full bg-secondary"></span> ACTIVE
                  </span>
                </div>
              </div>
            </div>

            {/* Description Card */}
            <div className="col-span-12 bg-surface-container-low rounded-lg border border-surface-container-highest flex flex-col mb-16">
              <div className="h-10 bg-surface flex items-center px-card-padding border-b border-surface-container-highest">
                <h2 className="font-label-caps text-label-caps text-on-surface-variant uppercase flex items-center gap-2">
                  <CheckSquare size={14} />
                  Descrição do Alerta
                </h2>
              </div>
              <div className="p-card-padding flex flex-col gap-unit font-body-base text-on-surface">
                {alert.description}
              </div>
            </div>
          </div>
        </PageTransition>
      </main>
    </div>
  );
}
