'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2, XCircle, ArrowRight, ShieldCheck } from 'lucide-react';

function VerifyEmailForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token') || '';

  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) {
      setError('Token de verificación no proporcionado');
      setLoading(false);
      return;
    }

    fetch('/api/auth/verify-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setSuccess(true);
        } else {
          setError(data.error || 'Error al verificar correo');
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="text-center py-8 space-y-3">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-slate-300 font-medium text-sm">Verificando tu correo electrónico...</p>
      </div>
    );
  }

  if (success) {
    return (
      <div className="text-center space-y-4 py-4">
        <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto shadow-lg">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-extrabold text-white">¡Correo Verificado!</h2>
        <p className="text-sm text-slate-300">
          Tu cuenta en <strong>MyFin</strong> ha sido confirmada exitosamente.
        </p>

        <div className="pt-4">
          <button
            onClick={() => router.push('/dashboard')}
            className="w-full py-3 rounded-xl gradient-button font-bold text-sm flex items-center justify-center gap-2"
          >
            <span>Ir al Dashboard</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="text-center space-y-4 py-4">
      <div className="w-14 h-14 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center mx-auto">
        <XCircle className="w-8 h-8" />
      </div>
      <h2 className="text-2xl font-extrabold text-white">Verificación Fallida</h2>
      <p className="text-sm text-rose-300 bg-rose-500/10 p-3 rounded-xl border border-rose-500/20">
        {error}
      </p>

      <div className="pt-4">
        <Link href="/login" className="text-xs font-bold text-indigo-400 hover:underline">
          Volver al Inicio de Sesión
        </Link>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <main className="min-h-screen bg-[#070b14] text-white flex items-center justify-center p-4 relative overflow-hidden">
      <div className="w-full max-w-md z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl gradient-button text-3xl mb-4 shadow-xl">
            ✉️
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">Verificación de Correo</h1>
        </div>

        <div className="glass-panel p-8 shadow-2xl">
          <Suspense fallback={<div className="text-center text-slate-400 py-6">Cargando...</div>}>
            <VerifyEmailForm />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
