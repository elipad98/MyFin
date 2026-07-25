import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const accountId = searchParams.get('accountId');
  const categoryId = searchParams.get('categoryId');
  const type = searchParams.get('type');
  const search = searchParams.get('search');
  const limit = parseInt(searchParams.get('limit') || '100');

  const whereClause: any = { userId: session.id };

  if (accountId) whereClause.accountId = accountId;
  if (categoryId) whereClause.categoryId = categoryId;
  if (type) whereClause.type = type;
  if (search) {
    whereClause.OR = [
      { description: { contains: search } },
      { notes: { contains: search } },
    ];
  }

  const transactions = await prisma.transaction.findMany({
    where: whereClause,
    include: {
      account: { select: { id: true, name: true, color: true, icon: true } },
      category: { select: { id: true, name: true, color: true, icon: true } },
    },
    orderBy: { date: 'desc' },
    take: limit,
  });

  return NextResponse.json(transactions);
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  try {
    const { accountId, categoryId, amount, type, description, date, notes } = await request.json();

    if (!accountId || !amount || !description) {
      return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 });
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return NextResponse.json({ error: 'Monto inválido' }, { status: 400 });
    }

    const transaction = await prisma.$transaction(async (tx) => {
      const createdTx = await tx.transaction.create({
        data: {
          userId: session.id,
          accountId,
          categoryId: categoryId || null,
          amount: numAmount,
          type: type || 'EXPENSE',
          description,
          notes,
          date: date ? new Date(date) : new Date(),
        },
        include: {
          account: true,
          category: true,
        },
      });

      // Update account balance
      const balanceChange = type === 'INCOME' ? numAmount : -numAmount;
      await tx.account.update({
        where: { id: accountId },
        data: { balance: { increment: balanceChange } },
      });

      return createdTx;
    });

    return NextResponse.json(transaction);
  } catch (error) {
    console.error('Error creating transaction:', error);
    return NextResponse.json({ error: 'Error al registrar transacción' }, { status: 500 });
  }
}
