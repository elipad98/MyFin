'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navigation from '@/components/Navigation';
import Header from '@/components/Header';
import TransactionModal from '@/components/TransactionModal';
import { Settings, Users, Shield, HardDrive, Plus, Check, UserPlus, Sparkles, X } from 'lucide-react';

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);

  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const [memberName, setMemberName] = useState('');
  const [memberEmail, setMemberEmail] = useState('');
  const [memberPassword, setMemberPassword] = useState('');
  const [memberRole, setMemberRole] = useState('MEMBER');
  const [error, setError] = useState('');

  const loadData = async () => {
    try {
      const uRes = await fetch('/api/auth/me');
      if (!uRes.ok) {
        router.push('/login');
        return;
      }
      const uData = await uRes.json();
      setUser(uData.user);

      if (uData.user?.role === 'ADMIN') {
        const mData = await (await fetch('/api/users')).json();
        setMembers(mData);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberName || !memberEmail || !memberPassword) {
      setError('Todos los campos son obligatorios');
      return;
    }

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: memberName,
          email: memberEmail,
          password: memberPassword,
          role: memberRole,
        }),
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Error al agregar miembro');
      }

      setMemberName('');
      setMemberEmail('');
      setMemberPassword('');
      setIsMemberModalOpen(false);
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
          title="Configuración & Usuarios"
          subtitle="Administración de la app y usuarios familiares"
          onOpenQuickAdd={() => setIsTxModalOpen(true)}
          onRefresh={loadData}
        />

        {loading ? (
          <div className="text-center py-20 text-slate-400">Cargando configuración...</div>
        ) : (
          <div className="space-y-8">
            {/* User Profile Card */}
            <div className="glass-panel p-6">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5 text-indigo-400" /> Perfil de Usuario
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-slate-400 text-xs uppercase">Nombre</span>
                  <p className="font-bold text-white mt-1">{user?.name}</p>
                </div>
                <div>
                  <span className="text-slate-400 text-xs uppercase">Correo</span>
                  <p className="font-bold text-white mt-1">{user?.email}</p>
                </div>
                <div>
                  <span className="text-slate-400 text-xs uppercase">Rol</span>
                  <p className="font-bold text-indigo-300 mt-1">{user?.role}</p>
                </div>
                <div>
                  <span className="text-slate-400 text-xs uppercase">Moneda</span>
                  <p className="font-bold text-emerald-400 mt-1">{user?.currency}</p>
                </div>
              </div>
            </div>

            {/* Multi-user Section (Admin Only) */}
            {user?.role === 'ADMIN' && (
              <div className="glass-panel p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      <Users className="w-5 h-5 text-purple-400" /> Usuarios de la Familia ({members.length})
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">Agrega cuentas para tus familiares</p>
                  </div>

                  <button
                    onClick={() => setIsMemberModalOpen(true)}
                    className="gradient-button px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>Agregar Miembro</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {members.map((m) => (
                    <div key={m.id} className="glass-card p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-purple-500/20 text-purple-300 font-bold flex items-center justify-center">
                          {m.name[0].toUpperCase()}
                        </div>
                        <div>
                          <h4 className="font-bold text-white text-sm">{m.name}</h4>
                          <p className="text-xs text-slate-400">{m.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
                            m.emailVerified
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                              : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                          }`}
                        >
                          {m.emailVerified ? '✓ Correo Verificado' : 'Pendiente Verificación'}
                        </span>
                        <span className="text-xs font-semibold text-indigo-300 bg-indigo-500/10 px-2.5 py-1 rounded-full border border-indigo-500/20">
                          {m.role}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Server Deployment Info Card */}
            <div className="glass-panel p-6 border-slate-700/60">
              <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                <HardDrive className="w-5 h-5 text-emerald-400" /> Despliegue en Servidor
              </h3>
              <p className="text-xs text-slate-400 mb-4">
                Instrucciones para correr MyFin en tu servidor con Docker Compose.
              </p>

              <div className="bg-slate-950 p-4 rounded-xl font-mono text-xs text-slate-300 space-y-2 border border-slate-800 overflow-x-auto">
                <p className="text-indigo-400"># Clonar e Iniciar con Docker:</p>
                <p>git clone https://github.com/tu-repo/myfin.git</p>
                <p>cd myfin</p>
                <p>docker-compose up -d --build</p>
                <p className="text-emerald-400"># Acceso local: http://ip-tu-servidor:3000</p>
              </div>
            </div>
          </div>
        )}

        {/* Modal: New Member */}
        {isMemberModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
            <div className="bg-[#131b2e] border border-slate-700/80 rounded-2xl w-full max-w-md overflow-hidden p-6 shadow-2xl">
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
                <h3 className="font-bold text-white text-lg">Agregar Miembro Familiar</h3>
                <button onClick={() => setIsMemberModalOpen(false)} className="text-slate-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAddMember} className="space-y-4">
                {error && <div className="p-2 text-xs bg-rose-500/20 text-rose-300 rounded-lg">{error}</div>}

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Nombre Completo *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. María Pérez"
                    value={memberName}
                    onChange={(e) => setMemberName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Correo Electrónico *</label>
                  <input
                    type="email"
                    required
                    placeholder="maria@myfin.local"
                    value={memberEmail}
                    onChange={(e) => setMemberEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Contraseña Inicial *</label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={memberPassword}
                    onChange={(e) => setMemberPassword(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Rol</label>
                  <select
                    value={memberRole}
                    onChange={(e) => setMemberRole(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm"
                  >
                    <option value="MEMBER">Miembro</option>
                    <option value="ADMIN">Administrador</option>
                  </select>
                </div>

                <div className="pt-2">
                  <button type="submit" className="w-full py-3 gradient-button font-bold text-sm rounded-xl">
                    Crear Usuario
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
