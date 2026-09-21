'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navigation from '@/components/Navigation';
import Header from '@/components/Header';
import TransactionModal from '@/components/TransactionModal';
import {
  BarChart3,
  Download,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Bot,
  Sparkles,
  FileJson,
  Copy,
  Check,
  FileSpreadsheet,
} from 'lucide-react';
import { formatDateOnly, getLocalDateString } from '@/lib/dateUtils';

export default function ReportsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [reports, setReports] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [downloadingJSON, setDownloadingJSON] = useState(false);

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
      // Ignored
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleExportJSON = async () => {
    try {
      setDownloadingJSON(true);
      const res = await fetch('/api/export');
      if (!res.ok) throw new Error('Error al exportar datos');
      const data = await res.json();

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `MyFin_Finanzas_IA_${getLocalDateString()}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (e) {
      alert('Error al descargar el archivo para IA');
    } finally {
      setDownloadingJSON(false);
    }
  };

  const handleCopyAIPrompt = async () => {
    try {
      const res = await fetch('/api/export');
      if (!res.ok) throw new Error('Error al obtener datos');
      const data = await res.json();

      const promptText = `Actúa como un asesor financiero personal experto.
A continuación tienes un reporte completo y estructurado de mis finanzas personales en México (moneda: ${data.metadataExportacion?.monedaPrincipal || 'MXN'}), incluyendo mi patrimonio, tarjetas de crédito, gastos del mes y suscripciones:

\`\`\`json
${JSON.stringify({
  usuario: data.usuario,
  resumenFinanciero: data.resumenFinancieroEjecutivo,
  tarjetasDeCredito: data.tarjetasDeCredito,
  cuentasBancarias: data.cuentasBancariasYefectivo,
  suscripciones: data.suscripciones,
  metasDeAhorro: data.metasDeAhorro,
  ultimasTransacciones: data.transacciones?.slice(0, 30),
}, null, 2)}
\`\`\`

Con base en esta información, por favor proporcióname:
1. **Diagnóstico general**: Nivel de endeudamiento, utilización de tarjetas de crédito y salud financiera.
2. **Optimización de gastos y suscripciones**: ¿Dónde hay fugas de dinero o gastos recurrentes que podría recortar?
3. **Estrategia de pago de tarjetas**: ¿Cuánto y cuándo debo pagar para no generar intereses y qué tarjeta priorizar?
4. **Plan de ahorro e inversión**: Recomendaciones prácticas para los próximos meses considerando mis metas.`;

      await navigator.clipboard.writeText(promptText);
      setCopiedPrompt(true);
      setTimeout(() => setCopiedPrompt(false), 3000);
    } catch (e) {
      alert('Error al copiar el prompt al portapapeles');
    }
  };

  const handleExportCSV = async () => {
    try {
      const txs = await (await fetch('/api/transactions?limit=1000')).json();
      let csvContent = 'data:text/csv;charset=utf-8,';
      csvContent += 'Fecha,Descripción,Tipo,Cuenta,Categoría,Monto,Notas\n';

      txs.forEach((t: any) => {
        const row = [
          formatDateOnly(t.date),
          `"${(t.description || '').replace(/"/g, '""')}"`,
          t.type,
          `"${(t.account?.name || '').replace(/"/g, '""')}"`,
          `"${(t.category?.name || '').replace(/"/g, '""')}"`,
          t.amount,
          `"${(t.notes || '').replace(/"/g, '""')}"`,
        ].join(',');
        csvContent += row + '\n';
      });

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `MyFin_Reporte_${getLocalDateString()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      alert('Error al exportar CSV');
    }
  };

  return (
    <div className="flex min-h-screen bg-[#070b14]">
      <Navigation user={user} onOpenQuickAdd={() => setIsTxModalOpen(true)} />

      <main className="flex-1 px-4 pt-20 pb-24 md:p-10 max-w-7xl overflow-x-hidden w-full">
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
            {/* Panel de Exportación para IA y Hojas de Cálculo */}
            <div className="glass-panel p-6 border-indigo-500/30 relative overflow-hidden bg-gradient-to-r from-indigo-950/40 via-purple-950/20 to-slate-900/60">
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 text-xs font-bold mb-2.5">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Herramientas de Inteligencia Artificial</span>
                  </div>
                  <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
                    <Bot className="w-6 h-6 text-indigo-400" /> Exportar y Procesar tus Datos con IA
                  </h2>
                  <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                    Descarga toda tu información financiera (cuentas, tarjetas de crédito, gastos del mes, suscripciones y metas) en formato estructurado para alimentar prompts en ChatGPT, Claude, Gemini o DeepSeek y obtener asesoría financiera personalizada.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3 shrink-0">
                  <button
                    onClick={handleCopyAIPrompt}
                    className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all ${
                      copiedPrompt
                        ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
                        : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20'
                    }`}
                  >
                    {copiedPrompt ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedPrompt ? '¡Prompt Copiado!' : 'Copiar Prompt para IA'}</span>
                  </button>

                  <button
                    onClick={handleExportJSON}
                    disabled={downloadingJSON}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold text-xs flex items-center gap-2 transition-all"
                  >
                    <FileJson className="w-4 h-4 text-amber-400" />
                    <span>{downloadingJSON ? 'Preparando...' : 'Descargar JSON'}</span>
                  </button>

                  <button
                    onClick={handleExportCSV}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white font-bold text-xs flex items-center gap-2 transition-all"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                    <span>CSV (Excel)</span>
                  </button>
                </div>
              </div>
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
