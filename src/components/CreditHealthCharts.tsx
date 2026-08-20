'use client';

import { CreditCardSummary } from '@/lib/creditCard';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { ShieldCheck, AlertCircle, AlertTriangle, Activity } from 'lucide-react';

interface CreditHealthChartsProps {
  cards: CreditCardSummary[];
  globalMetrics: {
    totalCreditLimit: number;
    totalCreditUsed: number;
    totalAvailableCredit: number;
    totalStatementBalance: number;
    globalUtilizationRate: number;
    cardsCount: number;
  };
}

export default function CreditHealthCharts({ cards, globalMetrics }: CreditHealthChartsProps) {
  if (cards.length === 0) return null;

  // Datos para gráfica de barras: Deuda al Corte vs Crédito Disponible
  const barChartData = cards.map((card) => ({
    name: card.accountName.length > 14 ? card.accountName.substring(0, 12) + '...' : card.accountName,
    'Saldo al Corte': card.statementBalance,
    'Deuda Actual': card.balance,
    'Límite Disponible': card.availableCredit,
    color: card.color,
  }));

  // Datos para la distribución de uso global (Usado vs Disponible)
  const pieData = [
    { name: 'Crédito Utilizado', value: globalMetrics.totalCreditUsed, color: '#f43f5e' },
    { name: 'Crédito Disponible', value: globalMetrics.totalAvailableCredit, color: '#10b981' },
  ];

  // Evaluar nivel de salud global
  let healthBadge = {
    title: 'Salud Crediticia Excelente',
    desc: 'Mantienes tu nivel de uso de crédito por debajo del 30% recomendado. Tu score crediticio está protegido.',
    icon: ShieldCheck,
    color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
  };

  if (globalMetrics.globalUtilizationRate > 80) {
    healthBadge = {
      title: 'Uso de Crédito Crítico',
      desc: `Estás utilizando el ${globalMetrics.globalUtilizationRate}% de tu crédito total. Se recomienda abonar cuanto antes a tus tarjetas para reducir el impacto en tu historial.`,
      icon: AlertCircle,
      color: 'text-rose-400 bg-rose-500/10 border-rose-500/30',
    };
  } else if (globalMetrics.globalUtilizationRate > 50) {
    healthBadge = {
      title: 'Uso de Crédito Elevado',
      desc: `Estás utilizando el ${globalMetrics.globalUtilizationRate}% de tu línea global. Intenta bajar tu utilización por debajo del 30% antes de tu fecha de corte.`,
      icon: AlertTriangle,
      color: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    };
  } else if (globalMetrics.globalUtilizationRate > 30) {
    healthBadge = {
      title: 'Salud Crediticia Buena',
      desc: `Tu utilización es del ${globalMetrics.globalUtilizationRate}%. Estás cerca del umbral ideal del 30%.`,
      icon: Activity,
      color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30',
    };
  }

  return (
    <div className="space-y-6">
      {/* Banner de Diagnóstico de Salud Crediticia */}
      <div className={`p-4 rounded-2xl border flex items-start gap-4 ${healthBadge.color}`}>
        <div className="p-2 rounded-xl bg-slate-900/40">
          <healthBadge.icon className="w-6 h-6" />
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-base text-white">{healthBadge.title}</h4>
            <span className="text-xs font-extrabold uppercase px-2.5 py-1 rounded-full border bg-slate-900/50">
              {globalMetrics.globalUtilizationRate}% Uso Global
            </span>
          </div>
          <p className="text-xs mt-1 text-slate-300">{healthBadge.desc}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfica de Barras: Saldo al Corte vs Disponible por Tarjeta */}
        <div className="lg:col-span-2 glass-panel p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-white">Consumo y Disponibilidad por Tarjeta</h3>
              <p className="text-xs text-slate-400">Comparativa de Saldo al Corte, Deuda Actual y Límite Disponible</p>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '0.75rem',
                    color: '#fff',
                  }}
                  formatter={(value: any) => [`$${Number(value).toLocaleString('es-MX')}`, '']}
                />
                <Bar dataKey="Saldo al Corte" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Deuda Actual" fill="#fb7185" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Límite Disponible" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfica de Dona: Ratio de Utilización de Crédito Global */}
        <div className="glass-panel p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-white mb-1">Ratio de Utilización Global</h3>
            <p className="text-xs text-slate-400 mb-4">Meta óptima: Menor al 30% del crédito disponible</p>

            <div className="h-44 relative flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={75}
                    paddingAngle={4}
                  >
                    {pieData.map((entry, index) => (
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
                    formatter={(val: any) => [`$${Number(val).toLocaleString('es-MX')}`, '']}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl font-black text-white">{globalMetrics.globalUtilizationRate}%</span>
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Uso de Línea</span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                <span className="text-slate-300">Crédito Ocupado</span>
              </div>
              <span className="font-bold text-white">
                ${globalMetrics.totalCreditUsed.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="text-slate-300">Crédito Disponible</span>
              </div>
              <span className="font-bold text-emerald-400">
                ${globalMetrics.totalAvailableCredit.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
