'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navigation from '@/components/Navigation';
import Header from '@/components/Header';
import TransactionModal from '@/components/TransactionModal';
import { PieChart, Plus, AlertTriangle, CheckCircle2, X } from 'lucide-react';

export default function BudgetsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [budgets, setBudgets] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);

  const [categoryId, setCategoryId] = useState('');
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');

  const loadData = async () => {
    try {
      const uRes = await fetch('/api/auth/me');
      if (!uRes.ok) {
        router.push('/login');
        return;
      }
      setUser((await uRes.json()).user);

      const [bData, cData] = await Promise.all([
        fetch('/api/budgets').then((r) => r.json()),
        fetch('/api/categories').then((r) => r.json()),
      ]);

      setBudgets(bData);
      setCategories(cData.filter((c: any) => c.type === 'EXPENSE'));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryId || !amount) {
      setError('Por favor selecciona una categoría y asigna un monto');
      return;
    }

    try {
      const res = await fetch('/api/budgets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categoryId, amount: parseFloat(amount) }),
      });

      if (!res.ok) throw new Error('Error al guardar presupuesto');

      setAmount('');
      setIsBudgetModalOpen(false);
      loadData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="flex min-h-screen bg-[#070b14]">
      <Navigation user={user} onOpenQuickAdd={() => setIsTxModalOpen(true)} />

      <main className="flex-1 p-6 md:p-10 max-w-7xl overflow-x-hidden">
        <Header
          user={user}
          title="Presupuestos Mensuales"
          subtitle="Establece límites de gasto por categoría y mantén el control de tus finanzas"
          onOpenQuickAdd={() => setIsTxModalOpen(true)}
          onRefresh={loadData}
        />

        {loading ? (
          <div className="text-center py-20 text-slate-400">Cargando presupuestos...</div>
        ) : (
          <div className="space-y-8">
            <div className="glass-panel p-6 flex flex-col sm:flex-row items-center justify-between gap-4 border-purple-500/20">
              <div>
                <h2 className="text-xl font-bold text-white">Límites de Gasto del Mes</h2>
                <p className="text-xs text-slate-400 mt-0.5">Control visual en tiempo real</p>
              </div>

              <button
                onClick={() => setIsBudgetModalOpen(true)}
                className="gradient-button px-4 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>Asignar Presupuesto</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {budgets.map((b) => {
                const percent = Math.min(100, Math.round((b.spent / b.amount) * 100));
                const isOver = b.spent > b.amount;
                const isWarning = percent >= 80 && !isOver;

                return (
                  <div key={b.id} className="glass-panel p-6 relative">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shadow"
                          style={{ backgroundColor: b.category?.color || '#8b5cf6' }}
                        >
                          📊
                        </div>
                        <div>
                          <h3 className="font-bold text-white text-base">{b.category?.name}</h3>
                          <span className="text-xs text-slate-400">Límite mensual</span>
                        </div>
                      </div>

                      <span
                        className={`text-xs font-extrabold px-2.5 py-1 rounded-full border ${
                          isOver
                            ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                            : isWarning
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                            : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                        }`}
                      >
                        {percent}% gastado
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden p-0.5 border border-slate-700/60">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isOver ? 'bg-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.6)]' : isWarning ? 'bg-amber-500' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>

                    <div className="mt-4 flex items-center justify-between text-sm">
                      <span className="text-slate-400">
                        Gastado: <strong className="text-white">${b.spent.toLocaleString('es-MX')}</strong>
                      </span>
                      <span className="text-slate-400">
                        Presupuesto: <strong className="text-indigo-300">${b.amount.toLocaleString('es-MX')}</strong>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Modal: Save Budget */}
        {isBudgetModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
            <div className="bg-[#131b2e] border border-slate-700/80 rounded-2xl w-full max-w-md overflow-hidden p-6 shadow-2xl">
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
                <h3 className="font-bold text-white text-lg">Presupuesto por Categoría</h3>
                <button onClick={() => setIsBudgetModalOpen(false)} className="text-slate-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveBudget} className="space-y-4">
                {error && <div className="p-2 text-xs bg-rose-500/20 text-rose-300 rounded-lg">{error}</div>}

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Categoría de Gasto *</label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm"
                  >
                    <option value="">Selecciona categoría...</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Límite Mensual ($ MXN) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="Ej. 5000"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm font-bold"
                  />
                </div>

                <div className="pt-2">
                  <button type="submit" className="w-full py-3 gradient-button font-bold text-sm rounded-xl">
                    Guardar Presupuesto
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
