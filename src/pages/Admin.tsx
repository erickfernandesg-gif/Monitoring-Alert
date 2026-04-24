import { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import { supabase } from "../lib/supabase";
import { PageTransition } from "../components/PageTransition";
import { Trash2, Edit2, Send } from "lucide-react";

export default function Admin() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const [zones, setZones] = useState<any[]>([]);
  const [newZone, setNewZone] = useState({ state: "", city: "" });

  const [subscribers, setSubscribers] = useState<any[]>([]);
  const [newSub, setNewSub] = useState("");
  const [editingSubId, setEditingSubId] = useState<string | null>(null);
  const [isSendingTest, setIsSendingTest] = useState(false);

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
    const { data, error } = await supabase.from("team_subscribers").select("*").order("created_at", { ascending: false });
    if (error) {
       console.error("Erro ao carregar e-mails:", error);
    } else if (data) {
       setSubscribers(data);
    }
  }

  async function saveSubscriber() {
    if (!newSub) return;
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newSub)) {
      alert("Por favor, insira um endereço de e-mail válido.");
      return;
    }

    if (editingSubId) {
      const { error } = await supabase.from("team_subscribers").update({ email: newSub }).eq("id", editingSubId);
      if (error) {
        console.error("Error updating subscriber:", error);
        alert(`Erro ao atualizar e-mail: ${error.message} \n\nVocê já criou a tabela 'team_subscribers' no Supabase?`);
        return;
      }
      setEditingSubId(null);
    } else {
      const { error } = await supabase.from("team_subscribers").insert([{ email: newSub }]);
      if (error) {
        console.error("Error inserting subscriber:", error);
        alert(`Erro ao adicionar e-mail: ${error.message} \n\nVocê já criou a tabela 'team_subscribers' no Supabase?`);
        return;
      }
    }
    
    setNewSub("");
    fetchSubscribers();
  }

  function editSubscriber(sub: any) {
    setNewSub(sub.email);
    setEditingSubId(sub.id);
  }

  function cancelEditSubscriber() {
    setNewSub("");
    setEditingSubId(null);
  }

  async function deleteSubscriber(id: string) {
    if (!confirm("Tem certeza que deseja excluir este e-mail?")) return;
    
    const { error } = await supabase.from("team_subscribers").delete().eq("id", id);
    if (error) {
       console.error("Error deleting subscriber:", error);
       alert(`Erro ao excluir: ${error.message}`);
       return;
    }
    fetchSubscribers();
  }

  async function handleTestEmail() {
    setIsSendingTest(true);
    try {
      const response = await fetch("/api/test-email", { method: "POST" });
      const data = await response.json();
      if (response.ok && data.success) {
        alert("E-mail de teste enviado com sucesso!");
      } else {
        alert(`Falha ao enviar e-mail de teste: ${data.error || "Desconhecido"}`);
      }
    } catch (err: any) {
      console.error(err);
      alert(`Erro na requisição: ${err.message}`);
    } finally {
      setIsSendingTest(false);
    }
  }

  if (loading) return <div className="p-8 text-on-surface">Validando...</div>;
  if (!isAdmin) return <div className="p-8 text-error font-bold">Acesso Negado. Requer privilégios de Administrador.</div>;

  return (
    <div className="bg-slate-50 text-slate-900 min-h-screen flex overflow-hidden">
      <Sidebar />
      <main className="flex-1 md:ml-20 mt-14 md:mt-0 overflow-y-auto bg-slate-50 w-full">
        <PageTransition>
          <div className="max-w-6xl mx-auto py-10 px-4 md:px-6">
            <header className="mb-10">
              <h1 className="text-3xl font-bold text-slate-800 mb-2 tracking-tight">Painel Administrativo</h1>
              <p className="text-slate-500 text-sm">Gerencie zonas de monitoramento, equipe de resposta e auditorias do sistema</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
              
              {/* Coluna Esquerda: Formulários Menores */}
              <div className="lg:col-span-1 flex flex-col gap-8">
                
                {/* Formulário: Cadastrar Novo Operador */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                  <h2 className="text-xl font-bold text-slate-800 mb-1">Cadastrar Operador</h2>
                  <p className="text-slate-500 text-sm mb-6 leading-relaxed">Adicione membros que receberão alertas críticos em tempo real.</p>
                  
                  <div className="flex flex-col gap-4">
                    <input 
                      type="email" 
                      placeholder="E-mail do agente" 
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm"
                      value={newSub}
                      onChange={e => setNewSub(e.target.value)}
                    />
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={saveSubscriber} 
                        className="flex-1 bg-slate-900 text-white hover:bg-slate-800 rounded-xl px-6 py-2.5 transition-all font-semibold text-sm shadow-sm"
                      >
                        {editingSubId ? "Salvar Alterações" : "Adicionar Membro"}
                      </button>
                      {editingSubId && (
                        <button 
                          onClick={cancelEditSubscriber} 
                          className="bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-xl px-4 py-2.5 transition-all font-semibold text-sm"
                        >
                          Cancelar
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Formulário: Zonas de Monitoramento */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                  <h2 className="text-xl font-bold text-slate-800 mb-1">Zonas de Monitoramento</h2>
                  <p className="text-slate-500 text-sm mb-6 leading-relaxed">Áreas com regras de alerta específicas.</p>
                  
                  <div className="flex flex-col gap-3 mb-6">
                    <input 
                      type="text" 
                      placeholder="Estado (ex: SC)" 
                      className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm"
                      value={newZone.state}
                      onChange={e => setNewZone({...newZone, state: e.target.value})}
                    />
                    <input 
                      type="text" 
                      placeholder="Cidade (Opcional)" 
                      className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm"
                      value={newZone.city}
                      onChange={e => setNewZone({...newZone, city: e.target.value})}
                    />
                    <button 
                      onClick={addZone} 
                      className="bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl px-4 py-2 transition-all font-semibold text-sm mt-1"
                    >
                      Configurar Zona
                    </button>
                  </div>

                  <ul className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {zones.map(z => (
                      <li key={z.id} className="flex justify-between items-center p-3 bg-slate-50 border border-slate-100 rounded-xl">
                        <span className="font-semibold text-slate-700 text-sm">{z.state} {z.city ? `- ${z.city}` : ''}</span>
                        <button 
                          onClick={() => toggleZone(z.id, z.active)}
                          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1.5 rounded-lg transition-colors ${z.active ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-slate-200 text-slate-500 hover:bg-slate-300'}`}
                        >
                          {z.active ? 'Ativo' : 'Inativo'}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Coluna Direita: Listagem e Tabela principal */}
              <div className="lg:col-span-2 flex flex-col gap-8">
                
                {/* Equipe / Assinantes */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 md:p-8 flex-1">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                    <div>
                      <h2 className="text-2xl font-bold text-slate-800">Equipe de Resposta Humanitária</h2>
                      <p className="text-slate-500 text-sm mt-1">Gerencie os membros que receberão alertas críticos em tempo real</p>
                    </div>
                    <button 
                      onClick={handleTestEmail} 
                      disabled={isSendingTest}
                      className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-sm hover:bg-indigo-700 disabled:opacity-50 transition-colors whitespace-nowrap"
                    >
                      <Send size={16} />
                      {isSendingTest ? "Enviando..." : "Disparar Teste"}
                    </button>
                  </div>
                  
                  <div className="overflow-x-auto border border-slate-100 rounded-xl">
                    <table className="w-full text-left border-collapse min-w-[400px]">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100">
                          <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Membro (E-mail)</th>
                          <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {subscribers.length === 0 ? (
                          <tr>
                            <td colSpan={2} className="p-8 text-center text-slate-500 text-sm">Nenhum membro cadastrado.</td>
                          </tr>
                        ) : null}
                        {subscribers.map(s => (
                          <tr key={s.id} className="hover:bg-slate-50 transition-colors group">
                            <td className="p-4 font-medium text-slate-700 text-sm">{s.email}</td>
                            <td className="p-4 text-right">
                              <div className="flex items-center justify-end gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                                <button 
                                  onClick={() => editSubscriber(s)}
                                  className="text-slate-400 hover:text-blue-600 p-2 rounded-lg hover:bg-blue-50 transition-colors"
                                  title="Editar"
                                >
                                  <Edit2 size={16} />
                                </button>
                                <button 
                                  onClick={() => deleteSubscriber(s.id)}
                                  className="text-slate-400 hover:text-red-600 p-2 rounded-lg hover:bg-red-50 transition-colors"
                                  title="Excluir"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Logs de Alertas */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 md:p-8">
                  <h2 className="text-2xl font-bold text-slate-800">Auditoria do Sistema</h2>
                  <p className="text-slate-500 text-sm mt-1 mb-6">Logs de Alertas Disparados (Últimos 20)</p>
                  
                  <div className="overflow-x-auto border border-slate-100 rounded-xl">
                    <table className="w-full text-left border-collapse min-w-[700px]">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100">
                          <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Data/Hora</th>
                          <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Tipo</th>
                          <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Severidade</th>
                          <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Local</th>
                          <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Disparo</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-sm">
                        {logs.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="p-8 text-center text-slate-500">Nenhum log registrado.</td>
                          </tr>
                        ) : null}
                        {logs.map(log => (
                          <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                            <td className="p-4 whitespace-nowrap text-slate-600 font-medium">{new Date(log.created_at).toLocaleString('pt-BR')}</td>
                            <td className="p-4 text-slate-800 font-semibold">{log.disaster_type}</td>
                            <td className="p-4">
                               <span className={`px-2.5 py-1 rounded-md text-xs font-bold ${log.severity === 'Crítica' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>
                                 {log.severity}
                               </span>
                            </td>
                            <td className="p-4 text-slate-600">{log.region}</td>
                            <td className="p-4">
                              {log.email_sent ? (
                                <span className="inline-flex items-center gap-1 text-emerald-600 font-bold bg-emerald-50 px-2.5 py-1 rounded-md text-xs">Sim</span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-red-600 font-bold bg-red-50 px-2.5 py-1 rounded-md text-xs">Não</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </PageTransition>
      </main>
    </div>
  );
}
