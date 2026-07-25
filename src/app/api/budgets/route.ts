import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const now = new Date();
  const month = parseInt(searchParams.get('month') || String(now.getMonth() + 1));
  const year = parseInt(searchParams.get('year') || String(now.getFullYear()));

  const budgets = await prisma.budget.findMany({
    where: { userId: session.id, month, year },
    include: {
      category: true,
    },
  });

  // Calculate actual spending for each budgeted category in this month
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);

  const budgetsWithSpent = await Promise.all(
    budgets.map(async (budget) => {
      const spentResult = await prisma.transaction.aggregate({
        where: {
          userId: session.id,
          categoryId: budget.categoryId,
          type: 'EXPENSE',
          date: { gte: startDate, lte: endDate },
        },
        _sum: { amount: true },
      });

      return {
        ...budget,
        spent: spentResult._sum.amount || 0,
      };
    })
  );

  return NextResponse.json(budgetsWithSpent);
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  try {
    const { categoryId, amount, month, year } = await request.json();

    if (!categoryId || !amount) {
      return NextResponse.json({ error: 'Categoría y monto son obligatorios' }, { status: 400 });
    }

    const now = new Date();
    const targetMonth = month || now.getMonth() + 1;
    const targetYear = year || now.getFullYear();

    const budget = await prisma.budget.upsert({
      where: {
        userId_categoryId_month_year: {
          userId: session.id,
          categoryId,
          month: targetMonth,
          year: targetYear,
        },
      },
      update: { amount: parseFloat(amount) },
      create: {
        userId: session.id,
        categoryId,
        amount: parseFloat(amount),
        month: targetMonth,
        year: targetYear,
      },
      include: { category: true },
    });

    return NextResponse.json(budget);
  } catch (error) {
    console.error('Error saving budget:', error);
    return NextResponse.json({ error: 'Error al guardar presupuesto' }, { status: 500 });
  }
}
