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
  hasCutoffConfigured: boolean;
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
}): CreditCardSummary {
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();
  const creditLimit = account.creditLimit || 0;

  // En caso de que el saldo sea negativo por el error de signo previo, corregir a valor absoluto
  const rawBalance = account.balance || 0;
  const currentBalance = rawBalance < 0 ? Math.abs(rawBalance) : rawBalance;
  const availableCredit = Math.max(0, creditLimit - currentBalance);
  const utilizationRate = creditLimit > 0 ? Math.min(100, Math.round((currentBalance / creditLimit) * 100)) : 0;

  const hasCutoffConfigured = Boolean(account.cutoffDay && account.paymentDueDay);

  // Si no tiene fechas de corte configuradas, proveer métricas útiles en lugar de descartar la tarjeta
  if (!hasCutoffConfigured) {
    const txs = account.transactions || [];
    let currentMonthExpenses = 0;
    const startOfMonth = new Date(currentYear, currentMonth, 1);

    txs.forEach((tx) => {
      const txDate = new Date(tx.date);
      if (txDate >= startOfMonth && txDate <= today && tx.type === 'EXPENSE') {
        currentMonthExpenses += tx.amount;
      }
    });

    let healthLevel: 'EXCELLENT' | 'GOOD' | 'WARNING' | 'CRITICAL' = 'EXCELLENT';
    if (utilizationRate > 80) healthLevel = 'CRITICAL';
    else if (utilizationRate > 50) healthLevel = 'WARNING';
    else if (utilizationRate > 30) healthLevel = 'GOOD';

    return {
      accountId: account.id,
      accountName: account.name,
      color: account.color,
      balance: currentBalance,
      creditLimit,
      availableCredit,
      utilizationRate,
      cutoffDay: account.cutoffDay || 0,
      paymentDueDay: account.paymentDueDay || 0,
      hasCutoffConfigured: false,
      lastCutoffDate: today.toISOString(),
      nextCutoffDate: today.toISOString(),
      paymentDueDate: today.toISOString(),
      statementBalance: currentBalance,
      currentCycleBalance: currentMonthExpenses > 0 ? currentMonthExpenses : currentBalance,
      daysUntilCutoff: 0,
      daysUntilPaymentDue: 0,
      status: currentBalance > 0 ? 'IN_PROGRESS' : 'PAID',
      statusMessage: currentBalance > 0
        ? 'Configura el día de corte y día límite para calcular fechas exactas.'
        : '¡Sin deuda pendiente!',
      healthLevel,
    };
  }

  const cutoffDay = Math.max(1, Math.min(31, account.cutoffDay!));
  const paymentDueDay = Math.max(1, Math.min(31, account.paymentDueDay!));

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

  let statementBalance = Math.max(0, statementExpenses - statementPayments);

  // Si no hay transacciones en el periodo anterior pero existe saldo deudor registrado en la cuenta,
  // el saldo exigible al corte es el saldo pendiente total menos los consumos recientes del nuevo periodo.
  if (statementExpenses === 0 && currentBalance > 0) {
    if (currentCycleExpenses > 0 && currentBalance > currentCycleExpenses) {
      statementBalance = currentBalance - currentCycleExpenses;
    } else if (currentCycleExpenses === 0) {
      statementBalance = currentBalance;
    }
  }

  const msPerDay = 1000 * 60 * 60 * 24;
  const daysUntilCutoff = Math.max(0, Math.ceil((nextCutoff.getTime() - today.getTime()) / msPerDay));
  const daysUntilPaymentDue = Math.ceil((paymentDueDate.getTime() - today.getTime()) / msPerDay);

  let status: 'PAID' | 'DUE_SOON' | 'OVERDUE' | 'IN_PROGRESS' = 'IN_PROGRESS';
  let statusMessage = '';

  if (currentBalance <= 0) {
    status = 'PAID';
    statusMessage = '¡Tarjeta al corriente! Sin saldo pendiente.';
  } else if (statementBalance <= 0) {
    status = 'PAID';
    statusMessage = `Corte anterior liquidado. Consumos actuales: $${currentCycleExpenses.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;
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
    hasCutoffConfigured: true,
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
