import { useParams, useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { useEffect, useState } from "react";
import { fetchGovAlerts, ExternalAlert } from "../services/dataService";
import { safeFormat } from "../utils/dateTools";
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
  CheckSquare,
  ArrowLeft
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

  if (!alert) return <div className="bg-slate-50 text-slate-500 h-screen flex justify-center items-center">Buscando detalhes do alerta...</div>;

  return (
    <div className="bg-slate-50 text-slate-900 min-h-screen flex overflow-hidden">
      <Sidebar />
      <main className="flex-1 md:ml-20 mt-14 md:mt-0 p-4 md:p-8 overflow-y-auto w-full">
        <PageTransition>
          <div className="max-w-4xl mx-auto py-4">
            
            {/* Botão Voltar */}
            <button 
              onClick={() => navigate(-1)} 
              className="text-slate-500 hover:text-slate-800 transition-colors flex items-center gap-2 mb-6 font-semibold text-sm"
            >
              <ArrowLeft size={16} /> Voltar para o Dashboard
            </button>

            {/* Cartão Bento Principal */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 md:p-8 flex flex-col gap-8">
              
              {/* Header do Alerta */}
              <div className="flex flex-col gap-4 border-b border-slate-100 pb-8">
                <div className="flex items-center gap-3 mb-2 flex-wrap">
                  <span className={`px-3 py-1 rounded-full text-sm font-semibold flex items-center gap-1.5 shadow-sm border ${
                    alert.severity === 'Crítica' ? 'bg-red-100 text-red-700 border-red-200' : 'bg-orange-100 text-orange-700 border-orange-200'
                  }`}>
                    <AlertTriangle size={14} fill="currentColor" />
                    NÍVEL {alert.severity.toUpperCase()}
                  </span>
                  <span className="text-xs font-bold text-slate-400 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-200 tracking-wider">
                    ID: {alert.externalId}
                  </span>
                </div>
                
                <h1 className="text-3xl font-bold text-slate-800 m-0 leading-tight tracking-tight">Risco de {alert.disasterType}</h1>
                
                <div className="flex flex-wrap items-center gap-6 mt-1">
                  <span className="flex items-center gap-2 text-slate-600 font-medium">
                    <MapPin size={18} className="text-slate-400" />
                    {alert.city}, {alert.state}
                  </span>
                  <span className="flex items-center gap-2 text-slate-600 font-medium">
                    <Clock size={18} className="text-slate-400" />
                    Emitido: {safeFormat(alert.issuedAt, "HH:mm 'BRT'")}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-3 mt-4">
                  <button className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors text-sm font-semibold text-slate-700 shadow-sm w-full sm:w-auto justify-center">
                    <PhoneCall size={16} />
                    Defesa Civil
                  </button>
                  <button className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors text-sm font-semibold w-full sm:w-auto justify-center shadow-sm">
                    <RadioTower size={16} />
                    Broadcast Alert
                  </button>
                  <button 
                    onClick={() => navigate(`/post-event/${encodeURIComponent(alert.externalId)}`)}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-colors text-sm font-semibold w-full sm:w-auto justify-center shadow-sm ml-auto"
                  >
                    <FileText size={16} />
                    Relatório Pós-Evento
                  </button>
                </div>
              </div>

              {/* Corpo do Alerta */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                {/* Visualização de Metadados Críticos */}
                <div className="flex flex-col gap-4">
                  <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                    <Activity size={20} className="text-emerald-500" />
                    Telemetria e Sensores
                  </h2>
                  <div className="bg-slate-50 rounded-xl p-5 border border-slate-100 flex flex-col gap-4">
                     <div className="flex flex-col gap-1 pb-4 border-b border-slate-200/60">
                        <span className="text-xs font-bold text-slate-400 tracking-wider">PRECIPITAÇÃO ESPERADA</span>
                        <div className="flex items-end justify-between">
                          <span className="text-3xl font-black text-slate-800 leading-none">
                            {alert.precipitationExpected || 'N/A'}<span className="text-lg text-slate-500 font-medium ml-1">mm/h</span>
                          </span>
                          {alert.precipitationExpected && alert.precipitationExpected > 50 && (
                            <span className="text-red-600 text-sm font-bold flex items-center gap-1 bg-red-50 px-2 py-0.5 rounded-md">
                              <TrendingUp size={14} /> Crítico
                            </span>
                          )}
                        </div>
                     </div>
                     <div className="flex flex-col gap-1">
                        <span className="text-xs font-bold text-slate-400 tracking-wider">VENTOS OBSERVADOS</span>
                        <div className="flex items-end justify-between">
                          <span className="text-3xl font-black text-slate-800 leading-none">
                            {alert.windSpeedExpected || '--'}<span className="text-lg text-slate-500 font-medium ml-1">km/h</span>
                          </span>
                          <span className="text-slate-500 text-sm font-bold flex items-center gap-1">
                            <Wind size={14} /> NW
                          </span>
                        </div>
                     </div>
                  </div>
                </div>

                {/* Descrição em Texto Pleno */}
                <div className="flex flex-col gap-4">
                  <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                    <CheckSquare size={20} className="text-blue-500" />
                    Descrição do Ocorrido
                  </h2>
                  <div className="bg-slate-50 rounded-xl p-5 border border-slate-100 flex-1">
                    <p className="text-slate-600 leading-relaxed">
                      {alert.description}
                    </p>
                  </div>
                </div>
              </div>

              {/* Rodapé / Meta */}
               <div className="text-sm text-slate-400 mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                 <span>Fonte Oficial: {alert.source}</span>
                 <span>Atualizado: {safeFormat(new Date().toISOString(), "dd/MM/yyyy HH:mm")}</span>
               </div>
            </div>

          </div>
        </PageTransition>
      </main>
    </div>
  );
}
