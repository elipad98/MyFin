import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { id } = await params;
  const { currentAmount, status, name, targetAmount, deadline, color, icon } = await request.json();

  try {
    const existing = await prisma.savingsGoal.findFirst({
      where: { id, userId: session.id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Meta no encontrada' }, { status: 404 });
    }

    const updatedTarget = targetAmount !== undefined ? parseFloat(targetAmount) : existing.targetAmount;
    const updatedCurrent = currentAmount !== undefined ? parseFloat(currentAmount) : existing.currentAmount;
    const newStatus = updatedCurrent >= updatedTarget ? 'COMPLETED' : status || existing.status;

    const goal = await prisma.savingsGoal.update({
      where: { id },
      data: {
        name: name !== undefined ? name : existing.name,
        targetAmount: updatedTarget,
        currentAmount: updatedCurrent,
        deadline: deadline ? new Date(deadline) : existing.deadline,
        color: color || existing.color,
        icon: icon || existing.icon,
        status: newStatus,
      },
    });

    return NextResponse.json(goal);
  } catch (error) {
    console.error('Error updating goal:', error);
    return NextResponse.json({ error: 'Error al actualizar meta' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { id } = await params;

  try {
    await prisma.savingsGoal.deleteMany({
      where: { id, userId: session.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting goal:', error);
    return NextResponse.json({ error: 'Error al eliminar meta' }, { status: 500 });
  }
}
