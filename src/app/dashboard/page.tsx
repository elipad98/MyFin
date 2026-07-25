'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navigation from '@/components/Navigation';
import Header from '@/components/Header';
import TransactionModal from '@/components/TransactionModal';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Tv,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  ChevronRight,
  Sparkles,
  AlertTriangle,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [reports, setReports] = useState<any>(null);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [recentTxs, setRecentTxs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const loadData = async () => {
    try {
      const userRes = await fetch('/api/auth/me');
      if (!userRes.ok) {
        router.push('/login');
        return;
      }
      const userData = await userRes.json();
      setUser(userData.user);

      const [repData, accData, subData, txData] = await Promise.all([
        fetch('/api/reports').then((r) => r.json()),
        fetch('/api/accounts').then((r) => r.json()),
        fetch('/api/subscriptions').then((r) => r.json()),
        fetch('/api/transactions?limit=6').then((r) => r.json()),
      ]);

      setReports(repData);
      setAccounts(accData);
      setSubscriptions(subData);
      setRecentTxs(txData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const totalBalance = accounts.reduce((acc, a) => acc + a.balance, 0);
  const activeSubsCount = subscriptions.filter((s) => s.status === 'ACTIVE').length;
  const upcomingRenewal = subscriptions.find((s) => s.status === 'ACTIVE');

  return (
    <div className="flex min-h-screen bg-[#070b14]">
      <Navigation user={user} onOpenQuickAdd={() => setIsModalOpen(true)} />

      <main className="flex-1 p-6 md:p-10 max-w-7xl overflow-x-hidden">
        <Header
          user={user}
          title="Dashboard Financiero"
          subtitle="Resumen en tiempo real de tus finanzas personales y suscripciones"
          onOpenQuickAdd={() => setIsModalOpen(true)}
          onRefresh={loadData}
        />

        {loading ? (
          <div className="flex items-center justify-center h-64 text-slate-400 font-medium">
            Cargando finanzas...
          </div>
        ) : (
          <div className="space-y-8">
            {/* Top Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {/* Balance Total */}
              <div className="glass-panel p-5 relative overflow-hidden border-indigo-500/20">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase text-slate-400 tracking-wider">
                    Balance Total
                  </span>
                  <div className="p-2.5 rounded-xl bg-indigo-500/20 text-indigo-400">
                    <Wallet className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-3">
                  <h3 className="text-2xl font-extrabold text-white">
                    ${totalBalance.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">En {accounts.length} cuentas activas</p>
                </div>
              </div>

              {/* Ingresos Mes */}
              <div className="glass-panel p-5 relative overflow-hidden border-emerald-500/20">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase text-slate-400 tracking-wider">
                    Ingresos (Este mes)
                  </span>
                  <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-3">
                  <h3 className="text-2xl font-extrabold text-emerald-400">
                    +${(reports?.totalIncome || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </h3>
                  <p className="text-xs text-emerald-500/80 mt-1 flex items-center gap-1">
                    <ArrowUpRight className="w-3.5 h-3.5" /> Flujo positivo
                  </p>
                </div>
              </div>

              {/* Gastos Mes */}
              <div className="glass-panel p-5 relative overflow-hidden border-rose-500/20">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase text-slate-400 tracking-wider">
                    Gastos (Este mes)
                  </span>
                  <div className="p-2.5 rounded-xl bg-rose-500/20 text-rose-400">
                    <TrendingDown className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-3">
                  <h3 className="text-2xl font-extrabold text-rose-400">
                    -${(reports?.totalExpense || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Neto: <span className="font-semibold text-white">${(reports?.netBalance || 0).toLocaleString('es-MX')}</span>
                  </p>
                </div>
              </div>

              {/* Suscripciones Activas */}
              <div className="glass-panel p-5 relative overflow-hidden border-pink-500/20">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase text-slate-400 tracking-wider">
                    Suscripciones
                  </span>
                  <div className="p-2.5 rounded-xl bg-pink-500/20 text-pink-400">
                    <Tv className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-3">
                  <h3 className="text-2xl font-extrabold text-pink-400">
                    ${(reports?.monthlySubsTotal || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    <span className="text-xs text-slate-400 font-normal">/mes</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    {activeSubsCount} servicios activos
                  </p>
                </div>
              </div>
            </div>

            {/* Upcoming Subscription Renewal Alert */}
            {upcomingRenewal && (
              <div className="glass-card p-4 flex items-center justify-between border-amber-500/30 bg-amber-500/5">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-amber-200">
                      Próxima renovación: {upcomingRenewal.name} (${upcomingRenewal.amount} {user?.currency})
                    </h4>
                    <p className="text-xs text-amber-300/70">
                      Fecha de cobro: {new Date(upcomingRenewal.nextRenewal).toLocaleDateString('es-MX')} ({upcomingRenewal.category})
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => router.push('/subscriptions')}
                  className="text-xs font-bold text-amber-300 hover:text-white px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 transition-all"
                >
                  Ver Suscripciones →
                </button>
              </div>
            )}

            {/* Main Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Monthly Trend Area Chart */}
              <div className="lg:col-span-2 glass-panel p-6">
                <h3 className="text-base font-bold text-white mb-4 flex items-center justify-between">
                  <span>Flujo Mensual (Ingresos vs Gastos)</span>
                  <span className="text-xs font-normal text-slate-400">Últimos 6 meses</span>
                </h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={reports?.monthlyTrend || []}>
                      <defs>
                        <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="month" stroke="#64748b" fontSize={12} />
                      <YAxis stroke="#64748b" fontSize={12} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#0f172a',
                          borderColor: '#334155',
                          borderRadius: '0.75rem',
                          color: '#fff',
                        }}
                      />
                      <Area type="monotone" dataKey="ingresos" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#incomeGrad)" />
                      <Area type="monotone" dataKey="gastos" stroke="#f43f5e" strokeWidth={2} fillOpacity={1} fill="url(#expenseGrad)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Expenses Category Breakdown */}
              <div className="glass-panel p-6">
                <h3 className="text-base font-bold text-white mb-4">Gastos por Categoría</h3>
                {reports?.categoryBreakdown?.length > 0 ? (
                  <div className="h-64 flex flex-col justify-center">
                    <ResponsiveContainer width="100%" height="70%">
                      <PieChart>
                        <Pie
                          data={reports.categoryBreakdown}
                          dataKey="total"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={80}
                          paddingAngle={3}
                        >
                          {reports.categoryBreakdown.map((entry: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#0f172a',
                            borderColor: '#334155',
                            borderRadius: '0.75rem',
                            color: '#fff',
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="mt-2 space-y-1 overflow-y-auto max-h-24 pr-1">
                      {reports.categoryBreakdown.map((cat: any) => (
                        <div key={cat.name} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
                            <span className="text-slate-300">{cat.name}</span>
                          </div>
                          <span className="font-semibold text-white">${cat.total.toLocaleString('es-MX')}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="h-64 flex items-center justify-center text-xs text-slate-500">
                    No hay gastos registrados este mes
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Row: Accounts & Recent Transactions */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Accounts List Widget */}
              <div className="glass-panel p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-bold text-white">Mis Cuentas</h3>
                  <button onClick={() => router.push('/accounts')} className="text-xs text-indigo-400 hover:underline">
                    Ver todas →
                  </button>
                </div>
                <div className="space-y-3">
                  {accounts.map((acc) => (
                    <div key={acc.id} className="glass-card p-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-white shadow"
                          style={{ backgroundColor: acc.color }}
                        >
                          💳
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold text-white">{acc.name}</h4>
                          <span className="text-[10px] text-slate-400 uppercase font-medium">{acc.type}</span>
                        </div>
                      </div>
                      <span className={`text-sm font-bold ${acc.balance < 0 ? 'text-rose-400' : 'text-slate-100'}`}>
                        ${acc.balance.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent Transactions List */}
              <div className="lg:col-span-2 glass-panel p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-bold text-white">Transacciones Recientes</h3>
                  <button onClick={() => router.push('/transactions')} className="text-xs text-indigo-400 hover:underline">
                    Ver historial completo →
                  </button>
                </div>
                <div className="space-y-3">
                  {recentTxs.length > 0 ? (
                    recentTxs.map((tx) => (
                      <div key={tx.id} className="glass-card p-3.5 flex items-center justify-between">
                        <div className="flex items-center gap-3.5">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold ${
                              tx.type === 'INCOME' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                            }`}
                          >
                            {tx.type === 'INCOME' ? '↓' : '↑'}
                          </div>
                          <div>
                            <h4 className="text-sm font-semibold text-white">{tx.description}</h4>
                            <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                              <span>{tx.account?.name}</span>
                              {tx.category && (
                                <>
                                  <span>•</span>
                                  <span className="text-indigo-300">{tx.category.name}</span>
                                </>
                              )}
                              <span>•</span>
                              <span>{new Date(tx.date).toLocaleDateString('es-MX')}</span>
                            </div>
                          </div>
                        </div>
                        <span
                          className={`text-sm font-bold ${
                            tx.type === 'INCOME' ? 'text-emerald-400' : 'text-slate-100'
                          }`}
                        >
                          {tx.type === 'INCOME' ? '+' : '-'}${tx.amount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="py-8 text-center text-xs text-slate-500">
                      No hay transacciones recientes
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        <TransactionModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSuccess={loadData}
        />
      </main>
    </div>
  );
}
