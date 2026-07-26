'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navigation from '@/components/Navigation';
import Header from '@/components/Header';
import TransactionModal from '@/components/TransactionModal';
import { Wallet, Plus, CreditCard, Landmark, PiggyBank, Trash2, X } from 'lucide-react';

export default function AccountsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [isAccModalOpen, setIsAccModalOpen] = useState(false);

  const [name, setName] = useState('');
  const [type, setType] = useState('BANK');
  const [balance, setBalance] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [color, setColor] = useState('#3b82f6');
  const [error, setError] = useState('');

  const loadData = async () => {
    try {
      const uRes = await fetch('/api/auth/me');
      if (!uRes.ok) {
        router.push('/login');
        return;
      }
      setUser((await uRes.json()).user);
      setAccounts(await (await fetch('/api/accounts')).json());
    } catch (e) {
      // Ignored
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) {
      setError('El nombre de la cuenta es requerido');
      return;
    }

    try {
      const res = await fetch('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          type,
          balance: parseFloat(balance || '0'),
          accountNumber,
          color,
        }),
      });

      if (!res.ok) throw new Error('Error al crear cuenta');

      setName('');
      setBalance('');
      setAccountNumber('');
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
          title="Gestión de Cuentas"
          subtitle="Administra tus tarjetas de crédito, débito, cuentas de ahorro y efectivo"
          onOpenQuickAdd={() => setIsTxModalOpen(true)}
          onRefresh={loadData}
        />

        {loading ? (
          <div className="text-center py-20 text-slate-400">Cargando cuentas...</div>
        ) : (
          <div className="space-y-8">
            <div className="glass-panel p-6 flex flex-col sm:flex-row items-center justify-between gap-4 border-indigo-500/20">
              <div>
                <span className="text-xs uppercase text-slate-400 font-semibold tracking-wider">Patrimonio Total Estimado</span>
                <h2 className="text-3xl font-extrabold text-white mt-1">
                  ${totalNet.toLocaleString('es-MX', { minimumFractionDigits: 2 })} {user?.currency}
                </h2>
              </div>

              <button
                onClick={() => setIsAccModalOpen(true)}
                className="gradient-button px-4 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>Nueva Cuenta</span>
              </button>
            </div>

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
                          💳
                        </div>
                        <div>
                          <h3 className="font-bold text-white text-base">{acc.name}</h3>
                          <p className="text-xs text-slate-400 uppercase tracking-wider">{acc.type}</p>
                        </div>
                      </div>

                      <button
                        onClick={() => handleDeleteAccount(acc.id)}
                        className="text-slate-500 hover:text-rose-400 p-1"
                        title="Eliminar cuenta"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {acc.accountNumber && (
                      <p className="text-xs font-mono text-slate-400 mb-2">{acc.accountNumber}</p>
                    )}

                    <div className="mt-4 pt-4 border-t border-slate-800">
                      <span className="text-xs text-slate-400">Saldo Disponible</span>
                      <p className={`text-2xl font-extrabold mt-0.5 ${acc.balance < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                        ${acc.balance.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Modal: New Account */}
        {isAccModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
            <div className="bg-[#131b2e] border border-slate-700/80 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl p-6">
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
                <h3 className="font-bold text-white text-lg">Nueva Cuenta Financiera</h3>
                <button onClick={() => setIsAccModalOpen(false)} className="text-slate-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateAccount} className="space-y-4">
                {error && <div className="p-2 text-xs bg-rose-500/20 text-rose-300 rounded-lg">{error}</div>}

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Nombre de la cuenta *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. BBVA Nómina, Efectivo, TC Mercado Pago"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Tipo de cuenta</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm"
                  >
                    <option value="BANK">Banco / Débito</option>
                    <option value="CREDIT">Tarjeta de Crédito</option>
                    <option value="CASH">Efectivo</option>
                    <option value="INVESTMENT">Inversión / Ahorro</option>
                    <option value="OTHER">Otro</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Saldo Inicial ($ MXN)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={balance}
                    onChange={(e) => setBalance(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm font-bold"
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

                <div className="pt-2">
                  <button type="submit" className="w-full py-3 gradient-button font-bold text-sm rounded-xl">
                    Crear Cuenta
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
