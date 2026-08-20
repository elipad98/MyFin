import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import prisma from '@/lib/prisma';

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
    const {
      name,
      type,
      balance,
      currency = 'MXN',
      color = '#6366f1',
      icon = 'landmark',
      accountNumber,
      cutoffDay,
      paymentDueDay,
      creditLimit,
    } = await request.json();

    if (!name) return NextResponse.json({ error: 'El nombre de la cuenta es requerido' }, { status: 400 });

    const account = await prisma.account.create({
      data: {
        userId: session.id,
        name,
        type: type || 'BANK',
        balance: parseFloat(balance) || 0,
        currency,
        color,
        icon,
        accountNumber,
        cutoffDay: cutoffDay ? parseInt(cutoffDay, 10) : null,
        paymentDueDay: paymentDueDay ? parseInt(paymentDueDay, 10) : null,
        creditLimit: creditLimit ? parseFloat(creditLimit) : null,
      },
    });

    return NextResponse.json(account);
  } catch (error) {
    console.error('Error creating account:', error);
    return NextResponse.json({ error: 'Error al crear la cuenta' }, { status: 500 });
  }
}
