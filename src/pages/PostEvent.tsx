import { useParams, useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { PageTransition } from "../components/PageTransition";
import { 
  Clock, 
  Share2, 
  Archive, 
  Users, 
  TrendingUp, 
  Home, 
  Info, 
  Droplets, 
  BedSingle,
  Lightbulb,
  Save,
  Plus
} from "lucide-react";
import { useEffect, useState } from "react";
import { fetchGovAlerts, ExternalAlert } from "../services/dataService";
import { supabase } from "../lib/supabase";

export default function PostEvent() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [alert, setAlert] = useState<ExternalAlert | null>(null);
  const [loading, setLoading] = useState(true);

  // Form State
  const [affectedPop, setAffectedPop] = useState("0");
  const [displaced, setDisplaced] = useState("0");
  const [lessons, setLessons] = useState([""]);
  const [resources, setResources] = useState([
    { name: "Água Potável", quantity: "0 L", status: "Sufficient" }
  ]);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    async function load() {
      const data = await fetchGovAlerts();
      const found = data.find(a => a.externalId === id);
      setAlert(found || null);
      setLoading(false);
    }
    load();
  }, [id]);

  const handleAddLesson = () => setLessons([...lessons, ""]);
  const handleLessonChange = (index: number, val: string) => {
    const newL = [...lessons];
    newL[index] = val;
    setLessons(newL);
  };

  const handleAddResource = () => setResources([...resources, { name: "", quantity: "", status: "Sufficient" }]);
  const handleResourceChange = (index: number, field: string, val: string) => {
    const newR: any = [...resources];
    newR[index][field] = val;
    setResources(newR);
  };

  const handleSave = async () => {
    setIsSaving(true);
    // Simulation of a save to Supabase
    // In a real scenario, we would link this to the post_event_reports table
    await new Promise(resolve => setTimeout(resolve, 800));
    setIsSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  if (loading) {
    return (
      <div className="bg-background text-on-background min-h-screen flex overflow-hidden lg:pl-64 items-center justify-center">
        <Sidebar />
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!alert) {
    return (
      <div className="bg-background text-on-background min-h-screen flex overflow-hidden lg:pl-64 items-center justify-center">
        <Sidebar />
        <div className="text-on-surface-variant font-data-mono">Alerta não encontrado para relatório.</div>
      </div>
    );
  }

  return (
    <div className="bg-background text-on-background min-h-screen flex overflow-hidden">
      <Sidebar />
      <main className="flex-1 md:ml-64 mt-14 md:mt-0 p-container-margin overflow-y-auto w-full">
        <PageTransition>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <div>
              <h1 className="font-display-lg text-on-surface mb-1 uppercase">Relatório: {alert.disasterType}</h1>
              <div className="flex items-center gap-3">
                <span className="font-data-mono text-primary bg-primary/10 px-2 py-1 rounded border border-primary/20">EVENT ID: {alert.externalId}</span>
                <span className="font-body-base text-on-surface-variant flex items-center gap-1"><Clock size={16} /> Retrospecto pós-evento</span>
              </div>
            </div>
            <div className="flex gap-3">
              <button 
                onClick={handleSave}
                disabled={isSaving}
                className="px-4 py-2 border border-primary bg-primary text-on-primary rounded font-label-caps hover:bg-primary/90 transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                <Save size={18} /> {isSaving ? 'Salvando...' : saved ? 'Salvo!' : 'Salvar Relatório'}
              </button>
              <button className="hidden sm:flex px-4 py-2 border border-outline-variant rounded font-label-caps text-on-surface hover:bg-surface-container-high transition-colors items-center gap-2">
                <Share2 size={18} /> Compartilhar (Defesa Civil)
              </button>
            </div>
          </div>

          {/* 1. Executive Summary Cards (Bento Grid) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-gutter mb-stack-md">
            <div className="bg-surface-container-low border border-surface-container-highest rounded p-card-padding flex flex-col justify-between group">
              <div className="flex justify-between items-start mb-4">
                <h3 className="font-label-caps text-on-surface-variant uppercase">População Afetada</h3>
                <Users className="text-primary group-focus-within:text-error transition-colors" size={24} />
              </div>
              <div>
                <input 
                  type="number" 
                  value={affectedPop} 
                  onChange={e => setAffectedPop(e.target.value)}
                  className="font-display-lg text-on-surface bg-transparent border-b border-surface-container-highest focus:border-primary outline-none w-full pb-1"
                />
                <div className="font-data-mono text-on-surface-variant flex items-center gap-1 mt-1 text-xs">
                  Pessoas impactadas na região
                </div>
              </div>
            </div>
            <div className="bg-surface-container-low border border-surface-container-highest rounded p-card-padding flex flex-col justify-between group">
              <div className="flex justify-between items-start mb-4">
                <h3 className="font-label-caps text-on-surface-variant uppercase">Famílias Desalojadas</h3>
                <Home className="text-tertiary group-focus-within:text-error transition-colors" size={24} />
              </div>
              <div>
                <input 
                  type="number" 
                  value={displaced} 
                  onChange={e => setDisplaced(e.target.value)}
                  className="font-display-lg text-on-surface bg-transparent border-b border-surface-container-highest focus:border-tertiary outline-none w-full pb-1"
                />
                <div className="font-data-mono text-tertiary flex items-center gap-1 mt-1 text-xs">
                  <Info size={14} /> Requerem abrigo imediato
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-gutter mb-16">
            {/* Resource Deployment Table */}
            <div className="bg-surface-container-lowest border border-surface-container-highest rounded flex flex-col">
              <div className="p-4 border-b border-surface-container-highest flex justify-between items-center bg-surface-container-low/50">
                <h3 className="font-headline-md text-on-surface">Implantação de Recursos (Logística)</h3>
                <button onClick={handleAddResource} className="text-secondary hover:text-white transition-colors bg-secondary/10 hover:bg-secondary/20 p-1.5 rounded">
                  <Plus size={18} />
                </button>
              </div>
              <div className="p-0 overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[500px]">
                  <thead>
                    <tr className="border-b border-surface-container-highest bg-surface-container">
                      <th className="p-3 font-label-caps text-on-surface-variant">RECURSO (ITEM)</th>
                      <th className="p-3 font-label-caps text-on-surface-variant">QUANTIDADE</th>
                      <th className="p-3 font-label-caps text-on-surface-variant">STATUS / PRONTIDÃO</th>
                    </tr>
                  </thead>
                  <tbody className="font-data-mono text-on-surface">
                    {resources.map((res, idx) => (
                      <tr key={idx} className="border-b border-surface-container-highest last:border-0 hover:bg-surface-container transition-colors">
                        <td className="p-3">
                          <input 
                            value={res.name}
                            onChange={(e) => handleResourceChange(idx, 'name', e.target.value)}
                            placeholder="Ex: Cestas Básicas"
                            className="bg-transparent border-b border-transparent focus:border-outline-variant outline-none w-full py-1"
                          />
                        </td>
                        <td className="p-3">
                          <input 
                            value={res.quantity}
                            onChange={(e) => handleResourceChange(idx, 'quantity', e.target.value)}
                            placeholder="Ex: 500 Unidades"
                            className="bg-transparent border-b border-transparent focus:border-outline-variant outline-none w-full py-1"
                          />
                        </td>
                        <td className="p-3">
                          <select 
                            value={res.status}
                            onChange={(e) => handleResourceChange(idx, 'status', e.target.value)}
                            className="bg-surface-container border border-surface-container-highest rounded px-2 py-1 text-sm outline-none focus:border-primary"
                          >
                            <option value="Sufficient">Suficiente (Operante)</option>
                            <option value="Warning">Atenção (Baixa Reserva)</option>
                            <option value="Depleted">Esgotado (Crítico)</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Qualitative Assessment */}
            <div className="bg-surface-container-lowest border border-surface-container-highest rounded flex flex-col p-4">
              <div className="mb-4">
                <h3 className="font-headline-md text-on-surface mb-2">Avaliação Qualitativa Pós-Ação</h3>
                <p className="font-body-base text-on-surface-variant">Lições aprendidas e falhas sistêmicas para próxima iteração.</p>
              </div>
              <div className="space-y-4">
                <div className="bg-surface-container-low p-4 rounded border-l-2 border-primary">
                  <h4 className="font-label-caps text-primary uppercase mb-4 flex items-center gap-2 justify-between">
                    <div className="flex gap-2"><Lightbulb size={16} /> Lições Aprendidas</div>
                    <button onClick={handleAddLesson} className="text-primary hover:text-white transition-colors bg-primary/10 hover:bg-primary/20 p-1 rounded">
                      <Plus size={14} />
                    </button>
                  </h4>
                  <ul className="list-decimal pl-5 font-body-base text-on-surface space-y-3 text-sm">
                    {lessons.map((lesson, idx) => (
                      <li key={idx}>
                        <textarea 
                          value={lesson}
                          onChange={(e) => handleLessonChange(idx, e.target.value)}
                          placeholder="Descreva a falha ou aprendizado..."
                          className="w-full bg-surface-container border border-surface-container-highest rounded p-2 focus:border-primary outline-none min-h-[60px] resize-y leading-relaxed"
                        />
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </PageTransition>
      </main>
    </div>
  );
}
