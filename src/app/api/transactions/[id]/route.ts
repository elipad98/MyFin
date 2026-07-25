import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { id } = await params;

  try {
    const existing = await prisma.transaction.findFirst({
      where: { id, userId: session.id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Transacción no encontrada' }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      // Reverse balance change
      const balanceReversal = existing.type === 'INCOME' ? -existing.amount : existing.amount;
      await tx.account.update({
        where: { id: existing.accountId },
        data: { balance: { increment: balanceReversal } },
      });

      await tx.transaction.delete({ where: { id } });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting transaction:', error);
    return NextResponse.json({ error: 'Error al eliminar transacción' }, { status: 500 });
  }
}
