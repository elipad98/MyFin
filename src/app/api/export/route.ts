import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { calculateCreditCardMetrics } from '@/lib/creditCard';
import { formatDateOnly } from '@/lib/dateUtils';
import { startOfMonth, endOfMonth } from 'date-fns';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.id },
      select: { id: true, name: true, email: true, currency: true, createdAt: true },
    });

    if (!user) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });

    const [accounts, transactions, subscriptions, budgets, savingsGoals, categories] = await Promise.all([
      prisma.account.findMany({
        where: { userId: session.id },
        include: {
          transactions: {
            orderBy: { date: 'desc' },
          },
        },
      }),
      prisma.transaction.findMany({
        where: { userId: session.id },
        include: {
          account: { select: { id: true, name: true, type: true } },
          category: { select: { id: true, name: true } },
        },
        orderBy: { date: 'desc' },
      }),
      prisma.subscription.findMany({
        where: { userId: session.id },
        orderBy: { nextRenewal: 'asc' },
      }),
      prisma.budget.findMany({
        where: { userId: session.id },
        include: { category: true },
      }),
      prisma.savingsGoal.findMany({
        where: { userId: session.id },
      }),
      prisma.category.findMany({
        where: { OR: [{ userId: session.id }, { isSystem: true }] },
      }),
    ]);

    // Financial Metrics Calculation
    const now = new Date();
    const mStart = startOfMonth(now);
    const mEnd = endOfMonth(now);

    let monthlyIncome = 0;
    let monthlyExpenses = 0;
    const categorySpending: Record<string, number> = {};

    transactions.forEach((t) => {
      const tDate = new Date(t.date);
      if (tDate >= mStart && tDate <= mEnd) {
        if (t.type === 'INCOME') monthlyIncome += t.amount;
        if (t.type === 'EXPENSE') {
          monthlyExpenses += t.amount;
          const catName = t.category?.name || 'Sin Categoría';
          categorySpending[catName] = (categorySpending[catName] || 0) + t.amount;
        }
      }
    });

    let totalLiquidAssets = 0;
    let totalCreditDebt = 0;
    let totalCreditLimit = 0;

    const creditCardsDetailed: any[] = [];
    const formattedAccounts = accounts.map((acc) => {
      const isCredit = acc.type === 'CREDIT';
      const debt = isCredit ? (acc.balance < 0 ? Math.abs(acc.balance) : acc.balance) : 0;
      if (isCredit) {
        totalCreditDebt += debt;
        totalCreditLimit += acc.creditLimit || 0;
        const metrics = calculateCreditCardMetrics(acc);
        creditCardsDetailed.push(metrics);
      } else {
        totalLiquidAssets += acc.balance;
      }

      return {
        id: acc.id,
        nombre: acc.name,
        tipo: acc.type,
        moneda: acc.currency,
        saldoOdeuda: isCredit ? debt : acc.balance,
        esDeudaCredito: isCredit,
        limiteCredito: acc.creditLimit || null,
        diaDeCorte: acc.cutoffDay || null,
        diaLimitePago: acc.paymentDueDay || null,
      };
    });

    const totalNetWorth = totalLiquidAssets - totalCreditDebt;
    const creditUtilizationRate =
      totalCreditLimit > 0 ? Math.round((totalCreditDebt / totalCreditLimit) * 100) : 0;

    const activeSubs = subscriptions.filter((s) => s.status === 'ACTIVE');
    const monthlySubscriptionsCost = activeSubs.reduce((acc, sub) => {
      if (sub.billingCycle === 'YEARLY') return acc + sub.amount / 12;
      if (sub.billingCycle === 'WEEKLY') return acc + sub.amount * 4;
      return acc + sub.amount;
    }, 0);

    const formattedTransactions = transactions.map((t) => ({
      id: t.id,
      fecha: formatDateOnly(t.date),
      fechaISO: t.date,
      concepto: t.description,
      tipo: t.type,
      monto: t.amount,
      cuenta: t.account?.name || 'N/A',
      tipoCuenta: t.account?.type || 'N/A',
      categoria: t.category?.name || 'Sin Categoría',
      notas: t.notes || null,
    }));

    const formattedSubscriptions = subscriptions.map((s) => ({
      id: s.id,
      servicio: s.name,
      proveedor: s.provider,
      monto: s.amount,
      cicloCobro: s.billingCycle,
      proximaRenovacion: formatDateOnly(s.nextRenewal),
      categoria: s.category,
      estado: s.status,
    }));

    const exportPayload = {
      metadataExportacion: {
        aplicacion: 'MyFin - Gestor Financiero Personal',
        fechaExportacion: new Date().toISOString(),
        proposito: 'Análisis financiero estructurado para herramientas de IA (ChatGPT, Claude, Gemini, DeepSeek)',
        monedaPrincipal: user.currency,
      },
      usuario: {
        nombre: user.name,
        email: user.email,
      },
      resumenFinancieroEjecutivo: {
        patrimonioNetoEstimado: totalNetWorth,
        activosLiquidosDisponibles: totalLiquidAssets,
        deudaTotalTarjetasCredito: totalCreditDebt,
        limiteCreditoTotal: totalCreditLimit,
        porcentajeUsoCredito: `${creditUtilizationRate}%`,
        ingresosMesActual: monthlyIncome,
        gastosMesActual: monthlyExpenses,
        ahorroNetoMesActual: monthlyIncome - monthlyExpenses,
        gastoMensualSuscripciones: Math.round(monthlySubscriptionsCost * 100) / 100,
        suscripcionesActivas: activeSubs.length,
        desgloseGastosPorCategoriaMes: categorySpending,
      },
      tarjetasDeCredito: creditCardsDetailed.map((c) => ({
        nombre: c.accountName,
        deudaTotal: c.balance,
        limiteCredito: c.creditLimit,
        creditoDisponible: c.availableCredit,
        porcentajeUso: `${c.utilizationRate}%`,
        montoAPagarAlCorte: c.statementBalance,
        consumosPeriodoActual: c.currentCycleBalance,
        diaDeCorte: c.cutoffDay,
        diaLimiteDePago: c.paymentDueDay,
        fechaLimiteDePago: formatDateOnly(c.paymentDueDate),
        estadoPago: c.status,
        mensajeEstado: c.statusMessage,
        saludCrediticia: c.healthLevel,
      })),
      cuentasBancariasYefectivo: formattedAccounts.filter((a) => !a.esDeudaCredito),
      suscripciones: formattedSubscriptions,
      metasDeAhorro: savingsGoals.map((g) => ({
        meta: g.name,
        montoObjetivo: g.targetAmount,
        montoActual: g.currentAmount,
        progreso: `${Math.round((g.currentAmount / (g.targetAmount || 1)) * 100)}%`,
        estado: g.status,
        fechaLimite: g.deadline ? formatDateOnly(g.deadline) : null,
      })),
      presupuestos: budgets.map((b) => ({
        categoria: b.category?.name || 'General',
        montoPresupuestado: b.amount,
        mes: b.month,
        año: b.year,
      })),
      totalTransaccionesRegistradas: formattedTransactions.length,
      transacciones: formattedTransactions,
    };

    return NextResponse.json(exportPayload);
  } catch (error) {
    console.error('Error exporting financial data:', error);
    return NextResponse.json({ error: 'Error al exportar datos' }, { status: 500 });
  }
}
