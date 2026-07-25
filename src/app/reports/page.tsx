'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navigation from '@/components/Navigation';
import Header from '@/components/Header';
import TransactionModal from '@/components/TransactionModal';
import { BarChart3, Download, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';

export default function ReportsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [reports, setReports] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);

  const loadData = async () => {
    try {
      const uRes = await fetch('/api/auth/me');
      if (!uRes.ok) {
        router.push('/login');
        return;
      }
      setUser((await uRes.json()).user);
      setReports(await (await fetch('/api/reports')).json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleExportCSV = async () => {
    try {
      const txs = await (await fetch('/api/transactions?limit=1000')).json();
      let csvContent = 'data:text/csv;charset=utf-8,';
      csvContent += 'Fecha,Descripción,Tipo,Cuenta,Categoría,Monto\n';

      txs.forEach((t: any) => {
        const row = [
          new Date(t.date).toLocaleDateString('es-MX'),
          `"${t.description.replace(/"/g, '""')}"`,
          t.type,
          `"${t.account?.name || ''}"`,
          `"${t.category?.name || ''}"`,
          t.amount,
        ].join(',');
        csvContent += row + '\n';
      });

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `MyFin_Reporte_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="flex min-h-screen bg-[#070b14]">
      <Navigation user={user} onOpenQuickAdd={() => setIsTxModalOpen(true)} />

      <main className="flex-1 p-6 md:p-10 max-w-7xl overflow-x-hidden">
        <Header
          user={user}
          title="Reportes Financieros"
          subtitle="Analítica detallada, tendencias de gasto y exportación de datos"
          onOpenQuickAdd={() => setIsTxModalOpen(true)}
          onRefresh={loadData}
        />

        {loading ? (
          <div className="text-center py-20 text-slate-400">Cargando reportes...</div>
        ) : (
          <div className="space-y-8">
            <div className="glass-panel p-6 flex items-center justify-between border-cyan-500/20">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-cyan-400" /> Resumen Ejecutivo del Mes
                </h2>
                <p className="text-xs text-slate-400 mt-1">Exporta tu información en formato CSV para Excel</p>
              </div>

              <button
                onClick={handleExportCSV}
                className="gradient-button px-4 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                <span>Exportar CSV</span>
              </button>
            </div>

            {/* Top Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="glass-panel p-5">
                <span className="text-xs font-semibold text-slate-400 uppercase">Ingresos Totales</span>
                <p className="text-2xl font-extrabold text-emerald-400 mt-2">
                  +${(reports?.totalIncome || 0).toLocaleString('es-MX')}
                </p>
              </div>

              <div className="glass-panel p-5">
                <span className="text-xs font-semibold text-slate-400 uppercase">Gastos Totales</span>
                <p className="text-2xl font-extrabold text-rose-400 mt-2">
                  -${(reports?.totalExpense || 0).toLocaleString('es-MX')}
                </p>
              </div>

              <div className="glass-panel p-5">
                <span className="text-xs font-semibold text-slate-400 uppercase">Flujo Neto</span>
                <p className="text-2xl font-extrabold text-indigo-300 mt-2">
                  ${(reports?.netBalance || 0).toLocaleString('es-MX')}
                </p>
              </div>
            </div>

            {/* Detailed Table */}
            <div className="glass-panel p-6">
              <h3 className="text-base font-bold text-white mb-4">Desglose de Gastos por Categoría</h3>
              <div className="space-y-3">
                {reports?.categoryBreakdown?.map((cat: any) => {
                  const percent = Math.round((cat.total / (reports?.totalExpense || 1)) * 100);
                  return (
                    <div key={cat.name} className="glass-card p-4">
                      <div className="flex items-center justify-between text-sm mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                          <span className="font-bold text-white">{cat.name}</span>
                        </div>
                        <span className="font-extrabold text-white">${cat.total.toLocaleString('es-MX')} ({percent}%)</span>
                      </div>
                      <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${percent}%`, backgroundColor: cat.color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        <TransactionModal isOpen={isTxModalOpen} onClose={() => setIsTxModalOpen(false)} onSuccess={loadData} />
      </main>
    </div>
  );
}
