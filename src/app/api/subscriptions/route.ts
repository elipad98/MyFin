import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const subscriptions = await prisma.subscription.findMany({
    where: { userId: session.id },
    orderBy: { nextRenewal: 'asc' },
  });

  return NextResponse.json(subscriptions);
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  try {
    const {
      name,
      provider,
      amount,
      billingCycle = 'MONTHLY',
      nextRenewal,
      category = 'Streaming',
      color = '#e11d48',
      logo,
      autoPay = true,
      notes,
    } = await request.json();

    if (!name || !amount || !nextRenewal) {
      return NextResponse.json({ error: 'Nombre, monto y fecha de renovación son requeridos' }, { status: 400 });
    }

    const subscription = await prisma.subscription.create({
      data: {
        userId: session.id,
        name,
        provider: provider || name,
        amount: parseFloat(amount),
        billingCycle,
        nextRenewal: new Date(nextRenewal),
        category,
        color,
        logo: logo || null,
        autoPay: Boolean(autoPay),
        notes,
        status: 'ACTIVE',
      },
    });

    return NextResponse.json(subscription);
  } catch (error) {
    console.error('Error creating subscription:', error);
    return NextResponse.json({ error: 'Error al crear suscripción' }, { status: 500 });
  }
}
