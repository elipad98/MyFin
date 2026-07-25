import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { id } = await params;
  const body = await request.json();

  try {
    const existing = await prisma.subscription.findFirst({
      where: { id, userId: session.id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Suscripción no encontrada' }, { status: 404 });
    }

    const updated = await prisma.subscription.update({
      where: { id },
      data: {
        name: body.name ?? existing.name,
        provider: body.provider ?? existing.provider,
        amount: body.amount ? parseFloat(body.amount) : existing.amount,
        billingCycle: body.billingCycle ?? existing.billingCycle,
        nextRenewal: body.nextRenewal ? new Date(body.nextRenewal) : existing.nextRenewal,
        category: body.category ?? existing.category,
        color: body.color ?? existing.color,
        logo: body.logo ?? existing.logo,
        status: body.status ?? existing.status,
        autoPay: body.autoPay !== undefined ? Boolean(body.autoPay) : existing.autoPay,
        notes: body.notes ?? existing.notes,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating subscription:', error);
    return NextResponse.json({ error: 'Error al actualizar suscripción' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { id } = await params;

  try {
    await prisma.subscription.deleteMany({
      where: { id, userId: session.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting subscription:', error);
    return NextResponse.json({ error: 'Error al eliminar suscripción' }, { status: 500 });
  }
}
