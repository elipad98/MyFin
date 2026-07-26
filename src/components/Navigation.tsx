'use client';

import { useState, useEffect } from 'react';
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
  Menu,
  X,
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
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Close mobile drawer on route change
  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

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

  const bottomNavItems = [
    { name: 'Inicio', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Transacciones', href: '/transactions', icon: Receipt },
    { name: 'Suscripciones', href: '/subscriptions', icon: Tv },
    { name: 'Cuentas', href: '/accounts', icon: Wallet },
    { name: 'Más', href: '#menu', icon: Menu, isMenuTrigger: true },
  ];

  if (!user && pathname !== '/login' && pathname !== '/register') {
    return null;
  }

  const renderNavList = () => (
    <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setIsMobileOpen(false)}
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
  );

  return (
    <>
      {/* ================= MOBILE TOP HEADER ================= */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-[#0d1322]/90 backdrop-blur-md px-4 py-3 border-b border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsMobileOpen(true)}
            className="p-2 rounded-xl bg-slate-800/80 text-slate-300 hover:text-white"
            aria-label="Abrir menú"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg overflow-hidden border border-slate-700/60 bg-slate-900">
              <img src="/logo.png" alt="MyFin Logo" className="w-full h-full object-cover" />
            </div>
            <span className="font-extrabold text-white tracking-tight text-base">MyFin</span>
          </div>
        </div>

        {onOpenQuickAdd && (
          <button
            onClick={onOpenQuickAdd}
            className="gradient-button p-2 rounded-xl font-bold text-xs flex items-center gap-1 shadow-md"
          >
            <Plus className="w-4 h-4" />
            <span>Transacción</span>
          </button>
        )}
      </div>

      {/* ================= DESKTOP SIDEBAR ================= */}
      <aside className="hidden md:flex w-64 bg-[#0d1322] border-r border-slate-800 flex-col h-screen sticky top-0 z-30 select-none shrink-0">
        {/* Brand Header */}
        <div className="p-6 flex items-center justify-between border-b border-slate-800/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl overflow-hidden shadow-lg border border-slate-700/60 bg-slate-900">
              <img src="/logo.png" alt="MyFin Logo" className="w-full h-full object-cover" />
            </div>
            <div>
              <h1 className="font-bold text-lg text-white tracking-tight flex items-center gap-1.5">
                MyFin{' '}
                <span className="text-[10px] uppercase font-bold bg-indigo-500/20 text-indigo-400 px-1.5 py-0.5 rounded border border-indigo-500/30">
                  v1.0
                </span>
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
        {renderNavList()}

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

      {/* ================= MOBILE DRAWER MENU ================= */}
      {isMobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          {/* Backdrop Overlay */}
          <div
            onClick={() => setIsMobileOpen(false)}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
          />

          {/* Drawer Sidebar */}
          <div className="relative w-4/5 max-w-xs bg-[#0d1322] h-full flex flex-col z-50 border-r border-slate-800 shadow-2xl">
            <div className="p-5 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl overflow-hidden border border-slate-700 bg-slate-900">
                  <img src="/logo.png" alt="MyFin Logo" className="w-full h-full object-cover" />
                </div>
                <span className="font-extrabold text-white text-lg">MyFin</span>
              </div>
              <button
                onClick={() => setIsMobileOpen(false)}
                className="p-2 text-slate-400 hover:text-white rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {renderNavList()}

            <div className="p-4 border-t border-slate-800 bg-[#0a0e19]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5 overflow-hidden">
                  <div className="w-8 h-8 rounded-full bg-indigo-600/30 text-indigo-300 font-bold flex items-center justify-center text-xs">
                    {user?.name ? user.name[0].toUpperCase() : 'U'}
                  </div>
                  <div className="truncate">
                    <p className="text-xs font-bold text-white truncate">{user?.name}</p>
                    <p className="text-[10px] text-slate-400 truncate">{user?.email}</p>
                  </div>
                </div>
                <button onClick={handleLogout} className="p-2 text-rose-400 hover:bg-rose-500/10 rounded-lg">
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= MOBILE BOTTOM NAVIGATION BAR ================= */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0d1322]/95 backdrop-blur-lg border-t border-slate-800 px-2 py-1.5 flex items-center justify-around">
        {bottomNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = !item.isMenuTrigger && pathname === item.href;

          if (item.isMenuTrigger) {
            return (
              <button
                key={item.name}
                onClick={() => setIsMobileOpen(true)}
                className="flex flex-col items-center py-1 px-3 text-slate-400 hover:text-white transition-colors"
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px] font-medium mt-0.5">{item.name}</span>
              </button>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center py-1 px-3 rounded-xl transition-colors ${
                isActive ? 'text-indigo-400 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium mt-0.5">{item.name}</span>
            </Link>
          );
        })}
      </div>
    </>
  );
}
