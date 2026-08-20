'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navigation from '@/components/Navigation';
import Header from '@/components/Header';
import TransactionModal from '@/components/TransactionModal';
import CreditHealthCharts from '@/components/CreditHealthCharts';
import CreditTips from '@/components/CreditTips';
import {
  Wallet,
  Plus,
  CreditCard,
  Trash2,
  X,
  Edit2,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Clock,
  ArrowRight,
  ShieldAlert,
  Percent,
} from 'lucide-react';

export default function AccountsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [creditSummary, setCreditSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [isAccModalOpen, setIsAccModalOpen] = useState(false);
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [type, setType] = useState('BANK');
  const [balance, setBalance] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [color, setColor] = useState('#6366f1');
  const [cutoffDay, setCutoffDay] = useState('');
  const [paymentDueDay, setPaymentDueDay] = useState('');
  const [creditLimit, setCreditLimit] = useState('');
  const [error, setError] = useState('');

  const loadData = async () => {
    try {
      const uRes = await fetch('/api/auth/me');
      if (!uRes.ok) {
        router.push('/login');
        return;
      }
      setUser((await uRes.json()).user);

      const [accsRes, creditRes] = await Promise.all([
        fetch('/api/accounts').then((r) => r.json()),
        fetch('/api/accounts/credit-summary').then((r) => r.json()),
      ]);

      setAccounts(accsRes);
      setCreditSummary(creditRes);
    } catch (e) {
      // Ignored
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openCreateModal = () => {
    setEditingAccountId(null);
    setName('');
    setType('BANK');
    setBalance('');
    setAccountNumber('');
    setColor('#6366f1');
    setCutoffDay('');
    setPaymentDueDay('');
    setCreditLimit('');
    setError('');
    setIsAccModalOpen(true);
  };

  const openEditModal = (acc: any) => {
    setEditingAccountId(acc.id);
    setName(acc.name || '');
    setType(acc.type || 'BANK');
    setBalance(acc.balance !== undefined ? String(acc.balance) : '0');
    setAccountNumber(acc.accountNumber || '');
    setColor(acc.color || '#6366f1');
    setCutoffDay(acc.cutoffDay ? String(acc.cutoffDay) : '');
    setPaymentDueDay(acc.paymentDueDay ? String(acc.paymentDueDay) : '');
    setCreditLimit(acc.creditLimit ? String(acc.creditLimit) : '');
    setError('');
    setIsAccModalOpen(true);
  };

  const handleSaveAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) {
      setError('El nombre de la cuenta es requerido');
      return;
    }

    try {
      const payload = {
        name,
        type,
        balance: parseFloat(balance || '0'),
        accountNumber,
        color,
        cutoffDay: type === 'CREDIT' ? cutoffDay : null,
        paymentDueDay: type === 'CREDIT' ? paymentDueDay : null,
        creditLimit: type === 'CREDIT' ? creditLimit : null,
      };

      let res;
      if (editingAccountId) {
        res = await fetch(`/api/accounts/${editingAccountId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch('/api/accounts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      if (!res.ok) throw new Error('Error al guardar la cuenta');

      setIsAccModalOpen(false);
      loadData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeleteAccount = async (id: string) => {
    if (!confirm('¿Seguro que deseas eliminar esta cuenta?')) return;
    await fetch(`/api/accounts/${id}`, { method: 'DELETE' });
    loadData();
  };

  const totalNet = accounts.reduce((acc, a) => acc + a.balance, 0);

  return (
    <div className="flex min-h-screen bg-[#070b14]">
      <Navigation user={user} onOpenQuickAdd={() => setIsTxModalOpen(true)} />

      <main className="flex-1 px-4 pt-20 pb-24 md:p-10 max-w-7xl overflow-x-hidden w-full">
        <Header
          user={user}
          title="Gestión de Cuentas y Tarjetas"
          subtitle="Monitorea saldos, fechas de corte, límites de pago y salud crediticia"
          onOpenQuickAdd={() => setIsTxModalOpen(true)}
          onRefresh={loadData}
        />

        {loading ? (
          <div className="text-center py-20 text-slate-400 font-medium">Cargando información bancaria...</div>
        ) : (
          <div className="space-y-10">
            {/* Patrimonio Total & Botón Nueva Cuenta */}
            <div className="glass-panel p-6 flex flex-col sm:flex-row items-center justify-between gap-4 border-indigo-500/20">
              <div>
                <span className="text-xs uppercase text-slate-400 font-semibold tracking-wider">Patrimonio Neto Estimado</span>
                <h2 className="text-3xl font-extrabold text-white mt-1">
                  ${totalNet.toLocaleString('es-MX', { minimumFractionDigits: 2 })} {user?.currency}
                </h2>
              </div>

              <button
                onClick={openCreateModal}
                className="gradient-button px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 shadow-lg"
              >
                <Plus className="w-4.5 h-4.5" />
                <span>Nueva Cuenta / Tarjeta</span>
              </button>
            </div>

            {/* SECCIÓN ESPECIAL: TRACKING DE TARJETAS DE CRÉDITO */}
            {creditSummary?.cards && creditSummary.cards.length > 0 && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
                      <CreditCard className="w-6 h-6 text-indigo-400" />
                      Tracking de Tarjetas de Crédito
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Fechas de corte, fechas límite de pago y monto para no generar intereses
                    </p>
                  </div>
                </div>

                {/* Tarjetas de Crédito Visuales */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {creditSummary.cards.map((card: any) => {
                    const originalAccount = accounts.find((a) => a.id === card.accountId);

                    return (
                      <div
                        key={card.accountId}
                        className="glass-panel p-6 relative flex flex-col justify-between border-t-4 transition-all hover:border-indigo-500/50"
                        style={{ borderTopColor: card.color }}
                      >
                        <div>
                          {/* Encabezado Tarjeta */}
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                              <div
                                className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold shadow-md"
                                style={{ backgroundColor: card.color }}
                              >
                                💳
                              </div>
                              <div>
                                <h3 className="font-bold text-white text-base">{card.accountName}</h3>
                                {card.accountNumber && (
                                  <p className="text-xs font-mono text-slate-400">•••• {card.accountNumber.slice(-4)}</p>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => openEditModal(originalAccount || { id: card.accountId, name: card.accountName, type: 'CREDIT', balance: card.balance, color: card.color, cutoffDay: card.cutoffDay, paymentDueDay: card.paymentDueDay, creditLimit: card.creditLimit })}
                                className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800"
                                title="Editar tarjeta"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteAccount(card.accountId)}
                                className="text-slate-500 hover:text-rose-400 p-1.5 rounded-lg hover:bg-rose-500/10"
                                title="Eliminar tarjeta"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          {/* Status Badge */}
                          <div className="mb-4">
                            {card.status === 'PAID' && (
                              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                <CheckCircle className="w-3.5 h-3.5" />
                                <span>Corte Pagado</span>
                              </div>
                            )}
                            {card.status === 'DUE_SOON' && (
                              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                <AlertTriangle className="w-3.5 h-3.5" />
                                <span>Próximo a Vencer ({card.daysUntilPaymentDue} días)</span>
                              </div>
                            )}
                            {card.status === 'OVERDUE' && (
                              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                                <ShieldAlert className="w-3.5 h-3.5" />
                                <span>Pago Vencido</span>
                              </div>
                            )}
                            {card.status === 'IN_PROGRESS' && (
                              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                                <Clock className="w-3.5 h-3.5" />
                                <span>En Periodo Activo</span>
                              </div>
                            )}
                          </div>

                          {/* Pago para No Generar Intereses */}
                          <div className="bg-slate-900/70 rounded-xl p-3.5 mb-4 border border-slate-800">
                            <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider block">
                              Monto a Pagar (Corte Anterior)
                            </span>
                            <div className="flex items-baseline justify-between mt-1">
                              <span className="text-xl font-black text-rose-400">
                                ${card.statementBalance.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                              </span>
                              <span className="text-[10px] text-slate-400 font-medium">No generar intereses</span>
                            </div>
                          </div>

                          {/* Fechas Importantes */}
                          <div className="grid grid-cols-2 gap-3 text-xs mb-4">
                            <div className="bg-slate-900/40 p-2.5 rounded-xl border border-slate-800">
                              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Día de Corte</span>
                              <span className="font-extrabold text-white text-sm">
                                Día {card.cutoffDay} ({card.daysUntilCutoff}d faltan)
                              </span>
                            </div>
                            <div className="bg-slate-900/40 p-2.5 rounded-xl border border-slate-800">
                              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Límite de Pago</span>
                              <span className="font-extrabold text-amber-400 text-sm">
                                Día {card.paymentDueDay} ({new Date(card.paymentDueDate).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })})
                              </span>
                            </div>
                          </div>

                          {/* Línea de Crédito & Barra de Utilización */}
                          <div className="space-y-1.5 pt-2 border-t border-slate-800">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-slate-400">Deuda Total / Límite</span>
                              <span className="font-bold text-white">
                                ${card.balance.toLocaleString('es-MX')} / ${card.creditLimit.toLocaleString('es-MX')}
                              </span>
                            </div>
                            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                              <div
                                className={`h-full transition-all rounded-full ${
                                  card.utilizationRate > 80
                                    ? 'bg-rose-500'
                                    : card.utilizationRate > 50
                                    ? 'bg-amber-500'
                                    : 'bg-emerald-500'
                                }`}
                                style={{ width: `${card.utilizationRate}%` }}
                              />
                            </div>
                            <div className="flex items-center justify-between text-[10px] text-slate-400">
                              <span>Disponible: ${card.availableCredit.toLocaleString('es-MX')}</span>
                              <span className="font-semibold text-slate-300">{card.utilizationRate}% Uso</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* GRÁFICAS DE SALUD CREDITICIA */}
                <CreditHealthCharts cards={creditSummary.cards} globalMetrics={creditSummary.globalMetrics} />

                {/* CONSEJOS DE SALUD CREDITICIA */}
                <CreditTips />
              </div>
            )}

            {/* TODAS LAS CUENTAS (Bancos, Efectivo, Ahorros, etc.) */}
            <div className="space-y-4">
              <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
                <Wallet className="w-6 h-6 text-emerald-400" />
                Todas tus Cuentas Financieras ({accounts.length})
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {accounts.map((acc) => (
                  <div
                    key={acc.id}
                    className="glass-panel p-6 relative flex flex-col justify-between border-t-4"
                    style={{ borderTopColor: acc.color }}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold shadow"
                            style={{ backgroundColor: acc.color }}
                          >
                            {acc.type === 'CREDIT' ? '💳' : acc.type === 'CASH' ? '💵' : acc.type === 'SAVINGS' ? '🐖' : '🏦'}
                          </div>
                          <div>
                            <h3 className="font-bold text-white text-base">{acc.name}</h3>
                            <p className="text-xs text-slate-400 uppercase tracking-wider">{acc.type}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openEditModal(acc)}
                            className="text-slate-400 hover:text-white p-1"
                            title="Editar cuenta"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteAccount(acc.id)}
                            className="text-slate-500 hover:text-rose-400 p-1"
                            title="Eliminar cuenta"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {acc.accountNumber && (
                        <p className="text-xs font-mono text-slate-400 mb-2">{acc.accountNumber}</p>
                      )}

                      {acc.type === 'CREDIT' && (acc.cutoffDay || acc.paymentDueDay) && (
                        <div className="text-[11px] text-indigo-300 bg-indigo-500/10 p-2 rounded-lg border border-indigo-500/20 mb-3 space-y-0.5">
                          {acc.cutoffDay && <p>• Día de corte: {acc.cutoffDay} de cada mes</p>}
                          {acc.paymentDueDay && <p>• Día límite de pago: {acc.paymentDueDay} de cada mes</p>}
                        </div>
                      )}

                      <div className="mt-4 pt-4 border-t border-slate-800">
                        <span className="text-xs text-slate-400">Saldo Registrado</span>
                        <p className={`text-2xl font-extrabold mt-0.5 ${acc.balance < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                          ${acc.balance.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Modal: Crear / Editar Cuenta */}
        {isAccModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-[#131b2e] border border-slate-700/80 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl p-6">
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
                <h3 className="font-bold text-white text-lg">
                  {editingAccountId ? 'Editar Cuenta / Tarjeta' : 'Nueva Cuenta Financiera'}
                </h3>
                <button onClick={() => setIsAccModalOpen(false)} className="text-slate-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveAccount} className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
                {error && <div className="p-3 text-xs bg-rose-500/20 text-rose-300 rounded-xl border border-rose-500/30">{error}</div>}

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Nombre de la cuenta *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Nu México, BBVA Nómina, Efectivo"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Tipo de cuenta</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm"
                  >
                    <option value="BANK">Banco / Débito</option>
                    <option value="CREDIT">Tarjeta de Crédito</option>
                    <option value="CASH">Efectivo</option>
                    <option value="INVESTMENT">Inversión / Ahorro</option>
                    <option value="OTHER">Otro</option>
                  </select>
                </div>

                {/* Campos Específicos para Tarjeta de Crédito */}
                {type === 'CREDIT' && (
                  <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/30 space-y-3.5">
                    <h4 className="text-xs font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
                      <CreditCard className="w-4 h-4" /> Configuración de Tarjeta de Crédito
                    </h4>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Límite de Crédito Otorgado ($ MXN)</label>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="Ej. 25000"
                        value={creditLimit}
                        onChange={(e) => setCreditLimit(e.target.value)}
                        className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm font-bold"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">Día de Corte (1-31)</label>
                        <input
                          type="number"
                          min="1"
                          max="31"
                          placeholder="Ej. 15"
                          value={cutoffDay}
                          onChange={(e) => setCutoffDay(e.target.value)}
                          className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">Día Límite de Pago (1-31)</label>
                        <input
                          type="number"
                          min="1"
                          max="31"
                          placeholder="Ej. 5"
                          value={paymentDueDay}
                          onChange={(e) => setPaymentDueDay(e.target.value)}
                          className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm font-bold"
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Saldo Actual / Deuda Inicial ($ MXN)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={balance}
                    onChange={(e) => setBalance(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Número de Cuenta / Tarjeta (Opcional)</label>
                  <input
                    type="text"
                    placeholder="Ej. 4500 1234 5678 9012"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Color representativo</label>
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="w-full h-10 bg-slate-900 border border-slate-700 rounded-xl cursor-pointer"
                  />
                </div>

                <div className="pt-3">
                  <button type="submit" className="w-full py-3 gradient-button font-bold text-sm rounded-xl shadow-lg">
                    {editingAccountId ? 'Guardar Cambios' : 'Crear Cuenta'}
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
