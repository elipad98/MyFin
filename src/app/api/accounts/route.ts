import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import prisma from '@/lib/prisma';

function parseNullableInt(val: any): number | null {
  if (val === null || val === undefined || val === '') return null;
  const parsed = parseInt(String(val), 10);
  return isNaN(parsed) ? null : parsed;
}

function parseNullableFloat(val: any): number | null {
  if (val === null || val === undefined || val === '') return null;
  const parsed = parseFloat(String(val));
  return isNaN(parsed) ? null : parsed;
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const accounts = await prisma.account.findMany({
    where: { userId: session.id },
    orderBy: { createdAt: 'asc' },
  });

  return NextResponse.json(accounts);
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  try {
    let body: any = {};
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Formato de petición inválido (se esperaba JSON)' }, { status: 400 });
    }

    const {
      name,
      type,
      balance,
      currency = 'MXN',
      color = '#6366f1',
      icon = 'landmark',
      cutoffDay,
      paymentDueDay,
      creditLimit,
    } = body;

    if (!name) return NextResponse.json({ error: 'El nombre de la cuenta es requerido' }, { status: 400 });

    const parsedBalance = parseNullableFloat(balance) ?? 0;
    const parsedCutoffDay = parseNullableInt(cutoffDay);
    const parsedPaymentDueDay = parseNullableInt(paymentDueDay);
    const parsedCreditLimit = parseNullableFloat(creditLimit);

    const account = await prisma.account.create({
      data: {
        userId: session.id,
        name,
        type: type || 'BANK',
        balance: parsedBalance,
        currency,
        color,
        icon,
        cutoffDay: parsedCutoffDay,
        paymentDueDay: parsedPaymentDueDay,
        creditLimit: parsedCreditLimit,
      },
    });

    return NextResponse.json(account);
  } catch (error: any) {
    const errorMessage = error?.message || 'Error al crear la cuenta';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
