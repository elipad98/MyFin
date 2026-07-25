import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { subMonths, startOfMonth, endOfMonth, format } from 'date-fns';
import { es } from 'date-fns/locale';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const now = new Date();

  // 1. Current Month Totals
  const currentMonthStart = startOfMonth(now);
  const currentMonthEnd = endOfMonth(now);

  const currentIncome = await prisma.transaction.aggregate({
    where: {
      userId: session.id,
      type: 'INCOME',
      date: { gte: currentMonthStart, lte: currentMonthEnd },
    },
    _sum: { amount: true },
  });

  const currentExpense = await prisma.transaction.aggregate({
    where: {
      userId: session.id,
      type: 'EXPENSE',
      date: { gte: currentMonthStart, lte: currentMonthEnd },
    },
    _sum: { amount: true },
  });

  // 2. Category Breakdown for Expenses (Current Month)
  const expenseTransactions = await prisma.transaction.findMany({
    where: {
      userId: session.id,
      type: 'EXPENSE',
      date: { gte: currentMonthStart, lte: currentMonthEnd },
    },
    include: { category: true },
  });

  const categoryMap: { [key: string]: { name: string; color: string; total: number } } = {};

  expenseTransactions.forEach((tx) => {
    const catName = tx.category?.name || 'Sin Categoría';
    const catColor = tx.category?.color || '#64748b';
    if (!categoryMap[catName]) {
      categoryMap[catName] = { name: catName, color: catColor, total: 0 };
    }
    categoryMap[catName].total += tx.amount;
  });

  const categoryBreakdown = Object.values(categoryMap).sort((a, b) => b.total - a.total);

  // 3. 6-Month Historical Trend
  const monthlyTrend = [];
  for (let i = 5; i >= 0; i--) {
    const targetDate = subMonths(now, i);
    const mStart = startOfMonth(targetDate);
    const mEnd = endOfMonth(targetDate);
    const monthLabel = format(targetDate, 'MMM yyyy', { locale: es });

    const inc = await prisma.transaction.aggregate({
      where: {
        userId: session.id,
        type: 'INCOME',
        date: { gte: mStart, lte: mEnd },
      },
      _sum: { amount: true },
    });

    const exp = await prisma.transaction.aggregate({
      where: {
        userId: session.id,
        type: 'EXPENSE',
        date: { gte: mStart, lte: mEnd },
      },
      _sum: { amount: true },
    });

    const incomeVal = inc._sum.amount || 0;
    const expenseVal = exp._sum.amount || 0;

    monthlyTrend.push({
      month: monthLabel,
      ingresos: incomeVal,
      gastos: expenseVal,
      ahorro: Math.max(0, incomeVal - expenseVal),
    });
  }

  // 4. Subscriptions stats
  const activeSubs = await prisma.subscription.findMany({
    where: { userId: session.id, status: 'ACTIVE' },
  });

  const monthlySubsTotal = activeSubs.reduce((acc, sub) => {
    if (sub.billingCycle === 'YEARLY') return acc + sub.amount / 12;
    if (sub.billingCycle === 'WEEKLY') return acc + sub.amount * 4;
    return acc + sub.amount;
  }, 0);

  return NextResponse.json({
    totalIncome: currentIncome._sum.amount || 0,
    totalExpense: currentExpense._sum.amount || 0,
    netBalance: (currentIncome._sum.amount || 0) - (currentExpense._sum.amount || 0),
    monthlySubsTotal,
    categoryBreakdown,
    monthlyTrend,
  });
}
