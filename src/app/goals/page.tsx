'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navigation from '@/components/Navigation';
import Header from '@/components/Header';
import TransactionModal from '@/components/TransactionModal';
import { Target, Plus, CheckCircle, Trophy, Sparkles, X } from 'lucide-react';

export default function GoalsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [goals, setGoals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);

  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [currentAmount, setCurrentAmount] = useState('');
  const [color, setColor] = useState('#10b981');
  const [error, setError] = useState('');

  // Contribution Modal
  const [contribGoal, setContribGoal] = useState<any>(null);
  const [contribAmount, setContribAmount] = useState('');

  const loadData = async () => {
    try {
      const uRes = await fetch('/api/auth/me');
      if (!uRes.ok) {
        router.push('/login');
        return;
      }
      setUser((await uRes.json()).user);
      setGoals(await (await fetch('/api/goals')).json());
    } catch (e) {
      // Ignored
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !targetAmount) {
      setError('Por favor llena los campos requeridos');
      return;
    }

    try {
      const res = await fetch('/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          targetAmount: parseFloat(targetAmount),
          currentAmount: parseFloat(currentAmount || '0'),
          color,
        }),
      });

      if (!res.ok) throw new Error('Error al crear meta');

      setName('');
      setTargetAmount('');
      setCurrentAmount('');
      setIsGoalModalOpen(false);
      loadData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleAddContribution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contribGoal || !contribAmount) return;

    const newAmount = contribGoal.currentAmount + parseFloat(contribAmount);

    await fetch(`/api/goals/${contribGoal.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentAmount: newAmount }),
    });

    setContribGoal(null);
    setContribAmount('');
    loadData();
  };

  return (
    <div className="flex min-h-screen bg-[#070b14]">
      <Navigation user={user} onOpenQuickAdd={() => setIsTxModalOpen(true)} />

      <main className="flex-1 p-6 md:p-10 max-w-7xl overflow-x-hidden">
        <Header
          user={user}
          title="Metas de Ahorro"
          subtitle="Define objetivos financieros, aporta fondos y monitorea tu progreso"
          onOpenQuickAdd={() => setIsTxModalOpen(true)}
          onRefresh={loadData}
        />

        {loading ? (
          <div className="text-center py-20 text-slate-400">Cargando metas...</div>
        ) : (
          <div className="space-y-8">
            <div className="glass-panel p-6 flex items-center justify-between border-emerald-500/20">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-emerald-400" /> Objetivos de Ahorro ({goals.length})
                </h2>
                <p className="text-xs text-slate-400 mt-1">Metas a corto, mediano y largo plazo</p>
              </div>

              <button
                onClick={() => setIsGoalModalOpen(true)}
                className="gradient-button px-4 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>Nueva Meta</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {goals.map((g) => {
                const percent = Math.min(100, Math.round((g.currentAmount / g.targetAmount) * 100));
                const isCompleted = g.status === 'COMPLETED' || percent >= 100;

                return (
                  <div key={g.id} className="glass-panel p-6 relative flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shadow"
                            style={{ backgroundColor: g.color }}
                          >
                            🎯
                          </div>
                          <div>
                            <h3 className="font-bold text-white text-base">{g.name}</h3>
                            <span className="text-xs text-slate-400">Objetivo</span>
                          </div>
                        </div>

                        {isCompleted && (
                          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                            <CheckCircle className="w-3.5 h-3.5" /> Lograda
                          </span>
                        )}
                      </div>

                      {/* Progress */}
                      <div className="space-y-2 mt-4">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-400">Progreso</span>
                          <span className="font-extrabold text-white">{percent}%</span>
                        </div>

                        <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden p-0.5 border border-slate-700/60">
                          <div
                            className="h-full rounded-full transition-all duration-500 bg-emerald-500"
                            style={{ width: `${percent}%` }}
                          />
                        </div>

                        <div className="flex items-center justify-between text-sm mt-3 pt-2 border-t border-slate-800">
                          <div>
                            <span className="text-[10px] text-slate-400 uppercase">Ahorrado</span>
                            <p className="font-extrabold text-emerald-400">${g.currentAmount.toLocaleString('es-MX')}</p>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] text-slate-400 uppercase">Meta</span>
                            <p className="font-extrabold text-indigo-300">${g.targetAmount.toLocaleString('es-MX')}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {!isCompleted && (
                      <div className="mt-5 pt-3 border-t border-slate-800">
                        <button
                          onClick={() => setContribGoal(g)}
                          className="w-full py-2 px-3 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 text-xs font-bold transition-all"
                        >
                          + Aportar a esta meta
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Modal: New Goal */}
        {isGoalModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
            <div className="bg-[#131b2e] border border-slate-700/80 rounded-2xl w-full max-w-md overflow-hidden p-6 shadow-2xl">
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
                <h3 className="font-bold text-white text-lg">Nueva Meta de Ahorro</h3>
                <button onClick={() => setIsGoalModalOpen(false)} className="text-slate-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateGoal} className="space-y-4">
                {error && <div className="p-2 text-xs bg-rose-500/20 text-rose-300 rounded-lg">{error}</div>}

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Nombre del Objetivo *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Fondo de Emergencia, Servidor..."
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Monto Objetivo ($) *</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="50000"
                      value={targetAmount}
                      onChange={(e) => setTargetAmount(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Ahorrado Inicial ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={currentAmount}
                      onChange={(e) => setCurrentAmount(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button type="submit" className="w-full py-3 gradient-button font-bold text-sm rounded-xl">
                    Crear Meta
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Add Contribution */}
        {contribGoal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
            <div className="bg-[#131b2e] border border-slate-700/80 rounded-2xl w-full max-w-sm overflow-hidden p-6 shadow-2xl">
              <h3 className="font-bold text-white text-base mb-1">Aportar a: {contribGoal.name}</h3>
              <p className="text-xs text-slate-400 mb-4">Ingresa el monto a sumar a tu ahorro</p>

              <form onSubmit={handleAddContribution} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Monto a abonar ($ MXN)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="1000.00"
                    value={contribAmount}
                    onChange={(e) => setContribAmount(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-base font-bold"
                  />
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setContribGoal(null)}
                    className="w-1/2 py-2.5 bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold"
                  >
                    Cancelar
                  </button>
                  <button type="submit" className="w-1/2 py-2.5 gradient-button rounded-xl text-xs font-bold">
                    Abonar
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <TransactionModal isOpen={isTxModalOpen} onClose={() => setIsTxModalOpen(false)} onSuccess={loadData} />
      </main>
    </div>
  );
}
