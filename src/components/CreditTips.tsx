'use client';

import { useState } from 'react';
import { Lightbulb, Percent, ShieldCheck, CalendarCheck, Clock, ChevronDown, ChevronUp, Zap } from 'lucide-react';

export default function CreditTips() {
  const [isOpen, setIsOpen] = useState(true);

  const tips = [
    {
      icon: Percent,
      title: 'La Regla del 30% de Utilización',
      subtitle: 'Protege tu Score Crediticio en Buró de Crédito',
      color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30',
      text: 'Trata de mantener el saldo total usado de tus tarjetas por debajo del 30% de tu límite otorgado. Los algoritmos de las instituciones crediticias premian a quienes usan moderadamente sus líneas de crédito sin saturarlas.',
    },
    {
      icon: ShieldCheck,
      title: 'Conviértete en un Usuario "Totalero"',
      subtitle: 'Evita Regalar Dinero en Intereses Bancarios',
      color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
      text: 'Paga siempre el "Pago para no generar intereses" (Saldo al Corte) antes de tu fecha límite. Evita hacer únicamente el "Pago Mínimo", ya que sólo cubre intereses y la deuda principal tarda años en liquidarse.',
    },
    {
      icon: CalendarCheck,
      title: 'Aprovecha la Estrategia del Periodo de Gracia',
      subtitle: 'Obtén hasta 45-50 Días de Financiamiento al 0%',
      color: 'text-pink-400 bg-pink-500/10 border-pink-500/30',
      text: 'Planifica tus compras grandes para realizarlas 1 o 2 días DESPUÉS de tu fecha de corte. De este modo, la compra entrará en el siguiente ciclo y no tendrás que pagarla sino hasta dentro de mes y medio sin pagar intereses.',
    },
    {
      icon: Clock,
      title: 'Regla de los 3 Días de Anticipación',
      subtitle: 'Evita Intereses Moratorios y Comisiones',
      color: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
      text: 'Programa o efectúa el pago de tu tarjeta al menos 3 días antes de la fecha límite de pago. Esto te previene contra fallas del SPEI, días inhábiles o mantenimientos del sistema bancario.',
    },
  ];

  return (
    <div className="glass-panel p-6 border-indigo-500/20">
      <div className="flex items-center justify-between cursor-pointer" onClick={() => setIsOpen(!isOpen)}>
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
            <Lightbulb className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-white text-base flex items-center gap-2">
              Consejos para una Excelente Salud Crediticia
              <span className="text-[10px] font-extrabold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                <Zap className="w-3 h-3" /> Guía MyFin
              </span>
            </h3>
            <p className="text-xs text-slate-400">Recomendaciones financieras clave para maximizar tus tarjetas sin pagar intereses</p>
          </div>
        </div>

        <button className="text-slate-400 hover:text-white p-2">
          {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </button>
      </div>

      {isOpen && (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {tips.map((tip, idx) => {
            const Icon = tip.icon;
            return (
              <div key={idx} className={`p-4 rounded-xl border flex flex-col justify-between transition-all hover:scale-[1.01] ${tip.color}`}>
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 rounded-lg bg-slate-900/60">
                      <Icon className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-sm">{tip.title}</h4>
                      <p className="text-[11px] opacity-80">{tip.subtitle}</p>
                    </div>
                  </div>
                  <p className="text-xs text-slate-300 mt-2 leading-relaxed">{tip.text}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
