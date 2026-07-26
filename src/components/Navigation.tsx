'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Wallet,
  Receipt,
  PieChart,
  Target,
  Tv,
  BarChart3,
  Settings,
  LogOut,
  Plus,
  User as UserIcon,
  Sparkles,
} from 'lucide-react';

interface NavigationProps {
  user: {
    name: string;
    email: string;
    role: string;
    currency: string;
  } | null;
  onOpenQuickAdd?: () => void;
}

export default function Navigation({ user, onOpenQuickAdd }: NavigationProps) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };

  const navItems = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Cuentas', href: '/accounts', icon: Wallet },
    { name: 'Transacciones', href: '/transactions', icon: Receipt },
    { name: 'Suscripciones', href: '/subscriptions', icon: Tv, badge: 'Popular' },
    { name: 'Presupuestos', href: '/budgets', icon: PieChart },
    { name: 'Metas de Ahorro', href: '/goals', icon: Target },
    { name: 'Reportes', href: '/reports', icon: BarChart3 },
    { name: 'Configuración', href: '/settings', icon: Settings },
  ];

  if (!user && pathname !== '/login' && pathname !== '/register') {
    return null;
  }

  return (
    <aside className="w-64 bg-[#0d1322] border-r border-slate-800 flex flex-col h-screen sticky top-0 z-30 select-none">
      {/* Brand Header */}
      <div className="p-6 flex items-center justify-between border-b border-slate-800/60">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl overflow-hidden shadow-lg border border-slate-700/60 bg-slate-900">
            <img src="/logo.png" alt="MyFin Logo" className="w-full h-full object-cover" />
          </div>
          <div>
            <h1 className="font-bold text-lg text-white tracking-tight flex items-center gap-1.5">
              MyFin <span className="text-[10px] uppercase font-bold bg-indigo-500/20 text-indigo-400 px-1.5 py-0.5 rounded border border-indigo-500/30">v1.0</span>
            </h1>
            <p className="text-xs text-slate-400">Finanzas Personales</p>
          </div>
        </div>
      </div>

      {/* Quick Add Button */}
      {onOpenQuickAdd && (
        <div className="px-4 pt-5 pb-2">
          <button
            onClick={onOpenQuickAdd}
            className="w-full py-2.5 px-4 rounded-xl gradient-button font-medium text-sm flex items-center justify-center gap-2 shadow-md hover:scale-[1.02] active:scale-[0.98] transition-transform"
          >
            <Plus className="w-4.5 h-4.5" />
            <span>Nueva Transacción</span>
          </button>
        </div>
      )}

      {/* Nav List */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 shadow-inner'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4.5 h-4.5 ${isActive ? 'text-indigo-400' : 'text-slate-400'}`} />
                <span>{item.name}</span>
              </div>
              {item.badge && (
                <span className="text-[10px] font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30 px-1.5 py-0.5 rounded-full">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User Info & Footer */}
      <div className="p-4 border-t border-slate-800/60 bg-[#0a0e19]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-9 h-9 rounded-full bg-indigo-600/30 border border-indigo-400/40 flex items-center justify-center text-indigo-300 font-semibold text-sm">
              {user?.name ? user.name[0].toUpperCase() : <UserIcon className="w-4 h-4" />}
            </div>
            <div className="truncate">
              <p className="text-sm font-medium text-slate-200 truncate">{user?.name || 'Usuario'}</p>
              <p className="text-xs text-slate-400 truncate">{user?.email || 'myfin@local'}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            title="Cerrar Sesión"
            className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
          >
            <LogOut className="w-4.5 h-4.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
