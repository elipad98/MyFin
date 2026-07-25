'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navigation from '@/components/Navigation';
import Header from '@/components/Header';
import TransactionModal from '@/components/TransactionModal';
import { Search, Filter, Trash2, ArrowUpRight, ArrowDownRight, Download } from 'lucide-react';

export default function TransactionsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);

  const loadData = async () => {
    try {
      const uRes = await fetch('/api/auth/me');
      if (!uRes.ok) {
        router.push('/login');
        return;
      }
      setUser((await uRes.json()).user);

      let url = '/api/transactions?limit=200';
      if (typeFilter !== 'ALL') url += `&type=${typeFilter}`;
      if (search) url += `&search=${encodeURIComponent(search)}`;

      const data = await (await fetch(url)).json();
      setTransactions(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [typeFilter, search]);

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta transacción? Se revertirá el saldo de la cuenta.')) return;
    await fetch(`/api/transactions/${id}`, { method: 'DELETE' });
    loadData();
  };

  return (
    <div className="flex min-h-screen bg-[#070b14]">
      <Navigation user={user} onOpenQuickAdd={() => setIsTxModalOpen(true)} />

      <main className="flex-1 p-6 md:p-10 max-w-7xl overflow-x-hidden">
        <Header
          user={user}
          title="Historial de Transacciones"
          subtitle="Consulta, busca y filtra todos tus ingresos y gastos registrados"
          onOpenQuickAdd={() => setIsTxModalOpen(true)}
          onRefresh={loadData}
        />

        {/* Filter Controls */}
        <div className="glass-panel p-4 mb-6 flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Buscar por concepto o notas..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-900/90 border border-slate-700/80 rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
            {['ALL', 'EXPENSE', 'INCOME'].map((t) => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  typeFilter === t
                    ? 'bg-indigo-600 text-white shadow'
                    : 'bg-slate-800/80 text-slate-400 hover:text-white'
                }`}
              >
                {t === 'ALL' ? 'Todas' : t === 'EXPENSE' ? 'Gastos' : 'Ingresos'}
              </button>
            ))}
          </div>
        </div>

        {/* Transactions Table */}
        <div className="glass-panel overflow-hidden">
          {loading ? (
            <div className="p-10 text-center text-slate-400">Cargando transacciones...</div>
          ) : transactions.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-900/80 text-xs uppercase font-semibold text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="px-6 py-4">Concepto</th>
                    <th className="px-6 py-4">Cuenta</th>
                    <th className="px-6 py-4">Categoría</th>
                    <th className="px-6 py-4">Fecha</th>
                    <th className="px-6 py-4 text-right">Monto</th>
                    <th className="px-6 py-4 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4 font-semibold text-white flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                            tx.type === 'INCOME' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                          }`}
                        >
                          {tx.type === 'INCOME' ? '↓' : '↑'}
                        </div>
                        <div>
                          <span>{tx.description}</span>
                          {tx.notes && <p className="text-xs text-slate-500 font-normal">{tx.notes}</p>}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 font-medium">
                          {tx.account?.name}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {tx.category ? (
                          <span
                            className="text-xs px-2.5 py-1 rounded-lg font-medium border"
                            style={{
                              backgroundColor: `${tx.category.color}20`,
                              borderColor: `${tx.category.color}40`,
                              color: tx.category.color,
                            }}
                          >
                            {tx.category.name}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-500">Sin categoría</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-400">
                        {new Date(tx.date).toLocaleDateString('es-MX')}
                      </td>
                      <td className={`px-6 py-4 text-right font-bold text-base ${tx.type === 'INCOME' ? 'text-emerald-400' : 'text-slate-100'}`}>
                        {tx.type === 'INCOME' ? '+' : '-'}${tx.amount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => handleDelete(tx.id)}
                          className="text-slate-500 hover:text-rose-400 p-1 transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-12 text-center text-slate-500">No hay transacciones registradas</div>
          )}
        </div>

        <TransactionModal isOpen={isTxModalOpen} onClose={() => setIsTxModalOpen(false)} onSuccess={loadData} />
      </main>
    </div>
  );
}
