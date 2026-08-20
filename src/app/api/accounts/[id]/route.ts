import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { id } = await params;
  const { name, type, balance, color, icon, accountNumber, cutoffDay, paymentDueDay, creditLimit } = await request.json();

  try {
    const updated = await prisma.account.updateMany({
      where: { id, userId: session.id },
      data: {
        name,
        type,
        balance: balance !== undefined ? parseFloat(balance) : undefined,
        color,
        icon,
        accountNumber,
        cutoffDay: cutoffDay !== undefined ? (cutoffDay ? parseInt(cutoffDay, 10) : null) : undefined,
        paymentDueDay: paymentDueDay !== undefined ? (paymentDueDay ? parseInt(paymentDueDay, 10) : null) : undefined,
        creditLimit: creditLimit !== undefined ? (creditLimit ? parseFloat(creditLimit) : null) : undefined,
      },
    });

    if (updated.count === 0) {
      return NextResponse.json({ error: 'Cuenta no encontrada' }, { status: 404 });
    }

    const account = await prisma.account.findUnique({ where: { id } });
    return NextResponse.json(account);
  } catch (error) {
    console.error('Error updating account:', error);
    return NextResponse.json({ error: 'Error al actualizar cuenta' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { id } = await params;

  try {
    const deleted = await prisma.account.deleteMany({
      where: { id, userId: session.id },
    });

    if (deleted.count === 0) {
      return NextResponse.json({ error: 'Cuenta no encontrada' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting account:', error);
    return NextResponse.json({ error: 'Error al eliminar cuenta' }, { status: 500 });
  }
}
