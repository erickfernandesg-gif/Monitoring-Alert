import { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import { supabase } from "../lib/supabase";
import { PageTransition } from "../components/PageTransition";
import { Trash2 } from "lucide-react";

export default function Admin() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const [zones, setZones] = useState<any[]>([]);
  const [newZone, setNewZone] = useState({ state: "", city: "" });

  const [subscribers, setSubscribers] = useState<any[]>([]);
  const [newSub, setNewSub] = useState("");

  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    checkAdmin();
    fetchZones();
    fetchLogs();
    fetchSubscribers();
  }, []);

  async function checkAdmin() {
    // In a real app we'd check properly from auth + profile
    setIsAdmin(true); 
    setLoading(false);
  }

  async function fetchZones() {
    const { data } = await supabase.from("monitoring_zones").select("*").order("created_at", { ascending: false });
    if (data) setZones(data);
  }

  async function addZone() {
    if (!newZone.state) return;
    await supabase.from("monitoring_zones").insert([{ ...newZone }]);
    setNewZone({ state: "", city: "" });
    fetchZones();
  }

  async function toggleZone(id: string, active: boolean) {
    await supabase.from("monitoring_zones").update({ active: !active }).eq("id", id);
    fetchZones();
  }

  async function fetchLogs() {
    const { data } = await supabase.from("alerts_log").select("*").order("created_at", { ascending: false }).limit(20);
    if (data) setLogs(data);
  }

  async function fetchSubscribers() {
    const { data } = await supabase.from("team_subscribers").select("*").order("created_at", { ascending: false });
    if (data) setSubscribers(data);
  }

  async function addSubscriber() {
    if (!newSub) return;
    await supabase.from("team_subscribers").insert([{ email: newSub }]);
    setNewSub("");
    fetchSubscribers();
  }

  async function deleteSubscriber(id: string) {
    await supabase.from("team_subscribers").delete().eq("id", id);
    fetchSubscribers();
  }

  if (loading) return <div className="p-8 text-on-surface">Validando...</div>;
  if (!isAdmin) return <div className="p-8 text-error font-bold">Acesso Negado. Requer privilégios de Administrador.</div>;

  return (
    <div className="bg-background text-on-background min-h-screen flex overflow-hidden">
      <Sidebar />
      <main className="flex-1 md:ml-64 mt-14 md:mt-0 p-container-margin overflow-y-auto bg-background">
        <PageTransition>
          <header className="mb-container-margin">
            <h1 className="font-display-lg text-headline-md text-on-surface mb-1">Painel Administrativo</h1>
            <p className="font-body-base text-on-surface-variant">Gerenciamento de Zonas, Assinantes e Auditoria de Alertas</p>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-gutter mb-gutter">
            {/* Zonas de Monitoramento */}
            <div className="bg-surface-container-low border border-surface-container-highest rounded p-card-padding">
              <h2 className="font-headline-md text-on-surface mb-4">Zonas de Monitoramento Ativas</h2>
              <div className="flex gap-2 mb-4">
                <input 
                  type="text" 
                  placeholder="Estado (ex: SC)" 
                  className="bg-surface border border-outline-variant p-2 rounded text-on-surface w-1/3"
                  value={newZone.state}
                  onChange={e => setNewZone({...newZone, state: e.target.value})}
                />
                <input 
                  type="text" 
                  placeholder="Cidade (Opcional)" 
                  className="bg-surface border border-outline-variant p-2 rounded text-on-surface flex-1"
                  value={newZone.city}
                  onChange={e => setNewZone({...newZone, city: e.target.value})}
                />
                <button onClick={addZone} className="bg-primary text-on-primary px-4 rounded font-bold">Add</button>
              </div>
              <ul className="space-y-2">
                {zones.map(z => (
                  <li key={z.id} className="flex justify-between items-center p-3 bg-surface border border-surface-container-highest rounded">
                    <span className="font-data-mono">{z.state} {z.city ? `- ${z.city}` : ''}</span>
                    <button 
                      onClick={() => toggleZone(z.id, z.active)}
                      className={`font-label-caps px-2 py-1 rounded ${z.active ? 'bg-secondary/20 text-secondary' : 'bg-surface-variant text-outline'}`}
                    >
                      {z.active ? 'ATIVO' : 'INATIVO'}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Assinantes / Equipe de Alertas */}
            <div className="bg-surface-container-low border border-surface-container-highest rounded p-card-padding">
              <h2 className="font-headline-md text-on-surface mb-4">Equipe de Alertas</h2>
              <div className="flex gap-2 mb-4">
                <input 
                  type="email" 
                  placeholder="E-mail do agente" 
                  className="bg-surface border border-outline-variant p-2 rounded text-on-surface flex-1"
                  value={newSub}
                  onChange={e => setNewSub(e.target.value)}
                />
                <button onClick={addSubscriber} className="bg-primary text-on-primary px-4 rounded font-bold">Adicionar</button>
              </div>
              <ul className="space-y-2 max-h-64 overflow-y-auto">
                {subscribers.map(s => (
                  <li key={s.id} className="flex justify-between items-center p-3 bg-surface border border-surface-container-highest rounded">
                    <span className="font-data-mono">{s.email}</span>
                    <button 
                      onClick={() => deleteSubscriber(s.id)}
                      className="text-error hover:bg-error/10 p-2 rounded transition-colors"
                      title="Excluir agente"
                    >
                      <Trash2 size={18} />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Logs de Alertas */}
          <div className="bg-surface-container-low border border-surface-container-highest rounded p-card-padding">
            <h2 className="font-headline-md text-on-surface mb-4">Logs de Alertas Disparados (Últimos 20)</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-surface-container-highest bg-surface-container">
                    <th className="p-3 font-label-caps text-on-surface-variant whitespace-nowrap">DATA/HORA</th>
                    <th className="p-3 font-label-caps text-on-surface-variant whitespace-nowrap">TIPO</th>
                    <th className="p-3 font-label-caps text-on-surface-variant whitespace-nowrap">SEVERIDADE</th>
                    <th className="p-3 font-label-caps text-on-surface-variant whitespace-nowrap">LOCAL</th>
                    <th className="p-3 font-label-caps text-on-surface-variant whitespace-nowrap">E-MAIL ENVIADO</th>
                  </tr>
                </thead>
                <tbody className="font-data-mono text-sm">
                  {logs.map(log => (
                    <tr key={log.id} className="border-b border-surface-container-highest hover:bg-surface-container transition-colors">
                      <td className="p-3 whitespace-nowrap">{new Date(log.created_at).toLocaleString('pt-BR')}</td>
                      <td className="p-3">{log.disaster_type}</td>
                      <td className={`p-3 ${log.severity === 'Crítica' ? 'text-error' : 'text-primary'}`}>{log.severity}</td>
                      <td className="p-3">{log.region}</td>
                      <td className="p-3">
                        {log.email_sent ? <span className="text-secondary">Sim</span> : <span className="text-error">Não</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </PageTransition>
      </main>
    </div>
  );
}
