import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { calculateCreditCardMetrics, CreditCardSummary } from '@/lib/creditCard';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  // Buscar todas las cuentas tipo CREDIT del usuario
  const creditAccounts = await prisma.account.findMany({
    where: {
      userId: session.id,
      type: 'CREDIT',
    },
    include: {
      transactions: {
        orderBy: { date: 'desc' },
      },
    },
  });

  const summaries: CreditCardSummary[] = [];

  creditAccounts.forEach((acc) => {
    const summary = calculateCreditCardMetrics(acc);
    if (summary) {
      summaries.push(summary);
    }
  });

  // Métricas de salud global
  const totalCreditLimit = summaries.reduce((acc, c) => acc + c.creditLimit, 0);
  const totalCreditUsed = summaries.reduce((acc, c) => acc + c.balance, 0);
  const totalStatementBalance = summaries.reduce((acc, c) => acc + c.statementBalance, 0);
  const globalUtilizationRate = totalCreditLimit > 0 ? Math.round((totalCreditUsed / totalCreditLimit) * 100) : 0;

  return NextResponse.json({
    cards: summaries,
    globalMetrics: {
      totalCreditLimit,
      totalCreditUsed,
      totalAvailableCredit: Math.max(0, totalCreditLimit - totalCreditUsed),
      totalStatementBalance,
      globalUtilizationRate,
      cardsCount: summaries.length,
    },
  });
}
