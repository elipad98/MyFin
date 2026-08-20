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

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { id } = await params;
  const body = await request.json();
  const { name, type, balance, color, icon, cutoffDay, paymentDueDay, creditLimit } = body;

  try {
    const updateData: any = {
      name,
      type,
      color,
      icon,
    };

    if (balance !== undefined) {
      updateData.balance = parseNullableFloat(balance) ?? 0;
    }
    if (cutoffDay !== undefined) {
      updateData.cutoffDay = parseNullableInt(cutoffDay);
    }
    if (paymentDueDay !== undefined) {
      updateData.paymentDueDay = parseNullableInt(paymentDueDay);
    }
    if (creditLimit !== undefined) {
      updateData.creditLimit = parseNullableFloat(creditLimit);
    }

    const updated = await prisma.account.updateMany({
      where: { id, userId: session.id },
      data: updateData,
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
