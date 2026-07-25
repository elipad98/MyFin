import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const goals = await prisma.savingsGoal.findMany({
    where: { userId: session.id },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(goals);
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  try {
    const { name, targetAmount, currentAmount = 0, deadline, color = '#10b981', icon = 'target' } = await request.json();

    if (!name || !targetAmount) {
      return NextResponse.json({ error: 'Nombre y meta son requeridos' }, { status: 400 });
    }

    const goal = await prisma.savingsGoal.create({
      data: {
        userId: session.id,
        name,
        targetAmount: parseFloat(targetAmount),
        currentAmount: parseFloat(currentAmount),
        deadline: deadline ? new Date(deadline) : null,
        color,
        icon,
        status: parseFloat(currentAmount) >= parseFloat(targetAmount) ? 'COMPLETED' : 'IN_PROGRESS',
      },
    });

    return NextResponse.json(goal);
  } catch (error) {
    console.error('Error creating goal:', error);
    return NextResponse.json({ error: 'Error al crear meta de ahorro' }, { status: 500 });
  }
}
