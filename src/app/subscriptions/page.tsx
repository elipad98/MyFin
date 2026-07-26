'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navigation from '@/components/Navigation';
import Header from '@/components/Header';
import TransactionModal from '@/components/TransactionModal';
import {
  Tv,
  Plus,
  Calendar,
  DollarSign,
  AlertCircle,
  PauseCircle,
  PlayCircle,
  Trash2,
  Edit3,
  CheckCircle2,
  X,
  ExternalLink,
  Sparkles,
} from 'lucide-react';

export default function SubscriptionsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [isSubModalOpen, setIsSubModalOpen] = useState(false);

  // Form states for creating subscription
  const [name, setName] = useState('');
  const [provider, setProvider] = useState('');
  const [amount, setAmount] = useState('');
  const [billingCycle, setBillingCycle] = useState('MONTHLY');
  const [nextRenewal, setNextRenewal] = useState(new Date().toISOString().split('T')[0]);
  const [category, setCategory] = useState('Streaming');
  const [color, setColor] = useState('#e11d48');
  const [logo, setLogo] = useState('');
  const [formError, setFormError] = useState('');

  const loadData = async () => {
    try {
      const userRes = await fetch('/api/auth/me');
      if (!userRes.ok) {
        router.push('/login');
        return;
      }
      setUser((await userRes.json()).user);

      const subRes = await fetch('/api/subscriptions');
      setSubscriptions(await subRes.json());
    } catch (err) {
      // Ignored
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateSub = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !amount || !nextRenewal) {
      setFormError('Por favor completa todos los campos requeridos');
      return;
    }

    try {
      const res = await fetch('/api/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          provider: provider || name,
          amount: parseFloat(amount),
          billingCycle,
          nextRenewal,
          category,
          color,
          logo,
        }),
      });

      if (!res.ok) throw new Error('Error al guardar suscripción');

      setName('');
      setProvider('');
      setAmount('');
      setIsSubModalOpen(false);
      loadData();
    } catch (err: any) {
      setFormError(err.message);
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
    await fetch(`/api/subscriptions/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
    loadData();
  };

  const handleDeleteSub = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar esta suscripción?')) return;
    await fetch(`/api/subscriptions/${id}`, { method: 'DELETE' });
    loadData();
  };

  // Calculations
  const activeSubs = subscriptions.filter((s) => s.status === 'ACTIVE');
  const monthlyTotal = activeSubs.reduce((acc, sub) => {
    if (sub.billingCycle === 'YEARLY') return acc + sub.amount / 12;
    if (sub.billingCycle === 'WEEKLY') return acc + sub.amount * 4;
    return acc + sub.amount;
  }, 0);
  const yearlyTotal = monthlyTotal * 12;

  // Preset Popular Services
  const presetServices = [
    { name: 'Netflix', provider: 'Netflix', color: '#e50914', category: 'Streaming', amount: '299' },
    { name: 'Spotify', provider: 'Spotify', color: '#1db954', category: 'Música', amount: '199' },
    { name: 'Disney+', provider: 'Disney', color: '#113ccf', category: 'Streaming', amount: '219' },
    { name: 'YouTube Premium', provider: 'Google', color: '#ff0000', category: 'Streaming', amount: '139' },
    { name: 'iCloud 200GB', provider: 'Apple', color: '#0070c9', category: 'Nube', amount: '49' },
    { name: 'Game Pass Ultimate', provider: 'Xbox', color: '#107c41', category: 'Gaming', amount: '249' },
  ];

  const applyPreset = (preset: any) => {
    setName(preset.name);
    setProvider(preset.provider);
    setColor(preset.color);
    setCategory(preset.category);
    setAmount(preset.amount);
  };

  return (
    <div className="flex min-h-screen bg-[#070b14]">
      <Navigation user={user} onOpenQuickAdd={() => setIsTxModalOpen(true)} />

      <main className="flex-1 px-4 pt-20 pb-24 md:p-10 max-w-7xl overflow-x-hidden w-full">
        <Header
          user={user}
          title="Gestor de Suscripciones"
          subtitle="Monitorea tus servicios de streaming, nube, licencias y renovaciones recurrentes"
          onOpenQuickAdd={() => setIsTxModalOpen(true)}
          onRefresh={loadData}
        />

        {loading ? (
          <div className="text-center py-20 text-slate-400">Cargando suscripciones...</div>
        ) : (
          <div className="space-y-8">
            {/* Top Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="glass-panel p-5 border-pink-500/30">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase text-slate-400">Costo Mensual Estimado</span>
                  <div className="p-2 rounded-xl bg-pink-500/20 text-pink-400">
                    <Tv className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-3">
                  <h3 className="text-3xl font-extrabold text-pink-400">
                    ${monthlyTotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    <span className="text-xs text-slate-400 font-normal"> / mes</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">{activeSubs.length} suscripciones activas</p>
                </div>
              </div>

              <div className="glass-panel p-5 border-purple-500/30">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase text-slate-400">Proyección Anual</span>
                  <div className="p-2 rounded-xl bg-purple-500/20 text-purple-400">
                    <DollarSign className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-3">
                  <h3 className="text-3xl font-extrabold text-purple-300">
                    ${yearlyTotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    <span className="text-xs text-slate-400 font-normal"> / año</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">Suma total proyectada a 12 meses</p>
                </div>
              </div>

              <div className="glass-panel p-5 border-indigo-500/30 flex flex-col justify-between">
                <div>
                  <span className="text-xs font-semibold uppercase text-slate-400">Acción Rápida</span>
                  <h4 className="text-sm font-bold text-white mt-1">¿Nueva Suscripción?</h4>
                </div>
                <button
                  onClick={() => setIsSubModalOpen(true)}
                  className="mt-3 py-2.5 px-4 rounded-xl gradient-button text-xs font-bold flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Añadir Servicio</span>
                </button>
              </div>
            </div>

            {/* Subscriptions List */}
            <div className="glass-panel p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <span>📺</span> Mis Suscripciones ({subscriptions.length})
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {subscriptions.map((sub) => {
                  const renewalDate = new Date(sub.nextRenewal);
                  const daysLeft = Math.ceil((renewalDate.getTime() - Date.now()) / (1000 * 3600 * 24));
                  const isSoon = daysLeft <= 5 && daysLeft >= 0;

                  return (
                    <div
                      key={sub.id}
                      className={`glass-card p-5 relative flex flex-col justify-between border-t-4 transition-all ${
                        sub.status === 'PAUSED' ? 'opacity-60 grayscale-[40%]' : ''
                      }`}
                      style={{ borderTopColor: sub.color || '#6366f1' }}
                    >
                      {/* Sub Card Header */}
                      <div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shadow-md text-lg"
                              style={{ backgroundColor: sub.color || '#6366f1' }}
                            >
                              {sub.name[0].toUpperCase()}
                            </div>
                            <div>
                              <h4 className="font-bold text-white text-base leading-tight">{sub.name}</h4>
                              <p className="text-xs text-slate-400">{sub.provider}</p>
                            </div>
                          </div>

                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              sub.status === 'ACTIVE'
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                : 'bg-slate-500/20 text-slate-400 border-slate-500/30'
                            }`}
                          >
                            {sub.status === 'ACTIVE' ? 'Activa' : 'Pausada'}
                          </span>
                        </div>

                        {/* Cost & Cycle */}
                        <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-baseline justify-between">
                          <span className="text-2xl font-extrabold text-white">
                            ${sub.amount.toLocaleString('es-MX')}
                          </span>
                          <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">
                            / {sub.billingCycle === 'MONTHLY' ? 'mes' : sub.billingCycle === 'YEARLY' ? 'año' : 'semana'}
                          </span>
                        </div>

                        {/* Renewal Date & Category Badge */}
                        <div className="mt-3 space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-400 flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5 text-indigo-400" /> Próx. Renovación:
                            </span>
                            <span className={`font-semibold ${isSoon ? 'text-amber-400 font-bold animate-pulse' : 'text-slate-200'}`}>
                              {renewalDate.toLocaleDateString('es-MX')}
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-400">Categoría:</span>
                            <span className="text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                              {sub.category}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Card Actions */}
                      <div className="mt-5 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                        <button
                          onClick={() => handleToggleStatus(sub.id, sub.status)}
                          className="text-xs font-semibold text-slate-300 hover:text-white flex items-center gap-1.5"
                        >
                          {sub.status === 'ACTIVE' ? (
                            <>
                              <PauseCircle className="w-4 h-4 text-amber-400" /> Pausar
                            </>
                          ) : (
                            <>
                              <PlayCircle className="w-4 h-4 text-emerald-400" /> Activar
                            </>
                          )}
                        </button>

                        <button
                          onClick={() => handleDeleteSub(sub.id)}
                          className="text-xs text-slate-400 hover:text-rose-400 p-1 transition-colors"
                          title="Eliminar suscripción"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Modal: New Subscription */}
        {isSubModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
            <div className="bg-[#131b2e] border border-slate-700/80 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
              <div className="p-5 border-b border-slate-800 flex items-center justify-between">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-indigo-400" /> Registrar Suscripción
                </h3>
                <button onClick={() => setIsSubModalOpen(false)} className="text-slate-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateSub} className="p-6 space-y-4">
                {formError && <div className="p-3 text-xs bg-rose-500/20 text-rose-300 rounded-xl">{formError}</div>}

                {/* Presets */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Servicios Populares (Auto-llenar)
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {presetServices.map((preset) => (
                      <button
                        key={preset.name}
                        type="button"
                        onClick={() => applyPreset(preset)}
                        className="text-xs px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 transition-colors"
                      >
                        {preset.name} (${preset.amount})
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Nombre *</label>
                    <input
                      type="text"
                      required
                      placeholder="Netflix, Spotify..."
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Proveedor</label>
                    <input
                      type="text"
                      placeholder="Netflix Inc, Apple..."
                      value={provider}
                      onChange={(e) => setProvider(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Monto ($ MXN) *</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="299.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Ciclo de Cobro</label>
                    <select
                      value={billingCycle}
                      onChange={(e) => setBillingCycle(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm"
                    >
                      <option value="MONTHLY">Mensual</option>
                      <option value="YEARLY">Anual</option>
                      <option value="WEEKLY">Semanal</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Próxima Renovación *</label>
                    <input
                      type="date"
                      required
                      value={nextRenewal}
                      onChange={(e) => setNextRenewal(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Categoría</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm"
                    >
                      <option value="Streaming">Streaming (TV)</option>
                      <option value="Música">Música</option>
                      <option value="Nube">Nube / Almacenamiento</option>
                      <option value="Software">Software / Dominio</option>
                      <option value="Gaming">Gaming</option>
                      <option value="Otros">Otros</option>
                    </select>
                  </div>
                </div>

                <div className="pt-3">
                  <button type="submit" className="w-full py-3 rounded-xl gradient-button font-bold text-sm">
                    Guardar Suscripción
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
