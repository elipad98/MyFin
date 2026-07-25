'use client';

import { useState } from 'react';
import { Search, Plus, Bell, RefreshCw } from 'lucide-react';

interface HeaderProps {
  user: {
    name: string;
    currency: string;
  } | null;
  title: string;
  subtitle?: string;
  onOpenQuickAdd?: () => void;
  onRefresh?: () => void;
}

export default function Header({ user, title, subtitle, onOpenQuickAdd, onRefresh }: HeaderProps) {
  return (
    <header className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 mb-6 border-b border-slate-800/80 gap-4">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-slate-400 mt-1">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-3">
        {onRefresh && (
          <button
            onClick={onRefresh}
            title="Actualizar datos"
            className="p-2.5 rounded-xl glass-card text-slate-400 hover:text-white transition-colors"
          >
            <RefreshCw className="w-4.5 h-4.5" />
          </button>
        )}

        <div className="px-3 py-1.5 rounded-xl bg-slate-800/60 border border-slate-700/60 text-xs font-semibold text-indigo-300 flex items-center gap-1.5">
          <span>🇲🇽 Moneda:</span>
          <span className="font-bold text-white">{user?.currency || 'MXN'}</span>
        </div>

        {onOpenQuickAdd && (
          <button
            onClick={onOpenQuickAdd}
            className="gradient-button text-sm font-medium px-4 py-2 rounded-xl flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Agregar</span>
          </button>
        )}
      </div>
    </header>
  );
}
