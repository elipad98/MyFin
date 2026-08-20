import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const accountId = searchParams.get('accountId');

  if (!accountId) {
    return NextResponse.json({ error: 'accountId es requerido' }, { status: 400 });
  }

  // Verificar que la cuenta pertenece al usuario
  const account = await prisma.account.findFirst({
    where: { id: accountId, userId: session.id },
  });

  if (!account) {
    return NextResponse.json({ error: 'Cuenta no encontrada' }, { status: 404 });
  }

  const payments = await prisma.creditCardPayment.findMany({
    where: { accountId },
    orderBy: { paymentDate: 'desc' },
    take: 20,
  });

  return NextResponse.json(payments);
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  try {
    const body = await request.json();
    const { accountId, amount, paymentDate, method, notes } = body;

    if (!accountId || !amount) {
      return NextResponse.json({ error: 'accountId y amount son requeridos' }, { status: 400 });
    }

    const parsedAmount = parseFloat(String(amount));
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return NextResponse.json({ error: 'El monto debe ser un número positivo' }, { status: 400 });
    }

    // Verificar que la cuenta pertenece al usuario y es tipo CREDIT
    const account = await prisma.account.findFirst({
      where: { id: accountId, userId: session.id, type: 'CREDIT' },
    });

    if (!account) {
      return NextResponse.json({ error: 'Tarjeta de crédito no encontrada' }, { status: 404 });
    }

    // Crear el registro de pago y actualizar el saldo de la tarjeta en una transacción
    const [payment] = await prisma.$transaction([
      prisma.creditCardPayment.create({
        data: {
          accountId,
          amount: parsedAmount,
          paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
          method: method || 'TRANSFER',
          notes: notes || null,
        },
      }),
      prisma.account.update({
        where: { id: accountId },
        data: {
          balance: { decrement: parsedAmount },
        },
      }),
    ]);

    return NextResponse.json(payment);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Error al registrar el pago' }, { status: 500 });
  }
}
