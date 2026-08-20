export interface CreditCardSummary {
  accountId: string;
  accountName: string;
  color: string;
  balance: number;
  creditLimit: number;
  availableCredit: number;
  utilizationRate: number; // 0 to 100%
  cutoffDay: number;
  paymentDueDay: number;
  lastCutoffDate: string; // ISO String
  nextCutoffDate: string; // ISO String
  paymentDueDate: string; // ISO String
  statementBalance: number; // Monto a pagar para no generar intereses
  currentCycleBalance: number; // Consumos en el periodo actual
  daysUntilCutoff: number;
  daysUntilPaymentDue: number;
  status: 'PAID' | 'DUE_SOON' | 'OVERDUE' | 'IN_PROGRESS';
  statusMessage: string;
  healthLevel: 'EXCELLENT' | 'GOOD' | 'WARNING' | 'CRITICAL';
}

function getValidDate(year: number, month: number, day: number): Date {
  const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
  const validDay = Math.min(day, lastDayOfMonth);
  return new Date(year, month, validDay, 23, 59, 59, 999);
}

export function calculateCreditCardMetrics(account: {
  id: string;
  name: string;
  color: string;
  balance: number;
  creditLimit?: number | null;
  cutoffDay?: number | null;
  paymentDueDay?: number | null;
  transactions?: Array<{
    amount: number;
    type: string;
    date: Date | string;
  }>;
}): CreditCardSummary | null {
  if (!account.cutoffDay || !account.paymentDueDay) {
    return null;
  }

  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();
  const cutoffDay = Math.max(1, Math.min(31, account.cutoffDay));
  const paymentDueDay = Math.max(1, Math.min(31, account.paymentDueDay));
  const creditLimit = account.creditLimit || 0;

  let lastCutoff: Date;
  let nextCutoff: Date;

  if (today.getDate() > cutoffDay) {
    lastCutoff = getValidDate(currentYear, currentMonth, cutoffDay);
    nextCutoff = getValidDate(currentYear, currentMonth + 1, cutoffDay);
  } else {
    lastCutoff = getValidDate(currentYear, currentMonth - 1, cutoffDay);
    nextCutoff = getValidDate(currentYear, currentMonth, cutoffDay);
  }

  let paymentDueYear = lastCutoff.getFullYear();
  let paymentDueMonth = lastCutoff.getMonth();

  if (paymentDueDay <= cutoffDay) {
    paymentDueMonth += 1;
  }
  const paymentDueDate = getValidDate(paymentDueYear, paymentDueMonth, paymentDueDay);

  const prevCycleStart = getValidDate(lastCutoff.getFullYear(), lastCutoff.getMonth() - 1, cutoffDay + 1);
  prevCycleStart.setHours(0, 0, 0, 0);

  const txs = account.transactions || [];
  let statementExpenses = 0;
  let statementPayments = 0;
  let currentCycleExpenses = 0;

  txs.forEach((tx) => {
    const txDate = new Date(tx.date);
    if (txDate >= prevCycleStart && txDate <= lastCutoff) {
      if (tx.type === 'EXPENSE') statementExpenses += tx.amount;
      if (tx.type === 'INCOME' || tx.type === 'TRANSFER') statementPayments += tx.amount;
    }
    if (txDate > lastCutoff && txDate <= today) {
      if (tx.type === 'EXPENSE') currentCycleExpenses += tx.amount;
    }
  });

  const statementBalance = Math.max(0, statementExpenses - statementPayments);
  const currentBalance = Math.max(0, account.balance);
  const availableCredit = Math.max(0, creditLimit - currentBalance);
  const utilizationRate = creditLimit > 0 ? Math.min(100, Math.round((currentBalance / creditLimit) * 100)) : 0;

  const msPerDay = 1000 * 60 * 60 * 24;
  const daysUntilCutoff = Math.max(0, Math.ceil((nextCutoff.getTime() - today.getTime()) / msPerDay));
  const daysUntilPaymentDue = Math.ceil((paymentDueDate.getTime() - today.getTime()) / msPerDay);

  let status: 'PAID' | 'DUE_SOON' | 'OVERDUE' | 'IN_PROGRESS' = 'IN_PROGRESS';
  let statusMessage = '';

  if (statementBalance <= 0) {
    status = 'PAID';
    statusMessage = '¡Corte pagado! Sin saldo pendiente para este periodo.';
  } else if (daysUntilPaymentDue < 0) {
    status = 'OVERDUE';
    statusMessage = `¡Atención! Fecha límite de pago vencida hace ${Math.abs(daysUntilPaymentDue)} días.`;
  } else if (daysUntilPaymentDue <= 5) {
    status = 'DUE_SOON';
    statusMessage = `¡Próximo a vencer! Faltan ${daysUntilPaymentDue} días para tu fecha límite de pago.`;
  } else {
    status = 'IN_PROGRESS';
    statusMessage = `Fecha límite de pago en ${daysUntilPaymentDue} días.`;
  }

  let healthLevel: 'EXCELLENT' | 'GOOD' | 'WARNING' | 'CRITICAL' = 'EXCELLENT';
  if (utilizationRate > 80 || status === 'OVERDUE') {
    healthLevel = 'CRITICAL';
  } else if (utilizationRate > 50 || status === 'DUE_SOON') {
    healthLevel = 'WARNING';
  } else if (utilizationRate > 30) {
    healthLevel = 'GOOD';
  }

  return {
    accountId: account.id,
    accountName: account.name,
    color: account.color,
    balance: currentBalance,
    creditLimit,
    availableCredit,
    utilizationRate,
    cutoffDay,
    paymentDueDay,
    lastCutoffDate: lastCutoff.toISOString(),
    nextCutoffDate: nextCutoff.toISOString(),
    paymentDueDate: paymentDueDate.toISOString(),
    statementBalance,
    currentCycleBalance: currentCycleExpenses,
    daysUntilCutoff,
    daysUntilPaymentDue,
    status,
    statusMessage,
    healthLevel,
  };
}
