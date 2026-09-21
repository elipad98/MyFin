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
      include: { account: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Transacción no encontrada' }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      // Reverse balance change
      const isCredit = existing.account.type === 'CREDIT';
      let balanceReversal = 0;

      if (isCredit) {
        // En tarjetas de crédito: eliminar un gasto resta de la deuda (-), eliminar un ingreso suma a la deuda (+)
        balanceReversal = existing.type === 'EXPENSE' ? -existing.amount : existing.amount;
      } else {
        // En cuentas regulares: eliminar un ingreso resta del saldo (-), eliminar un gasto devuelve el saldo (+)
        balanceReversal = existing.type === 'INCOME' ? -existing.amount : existing.amount;
      }

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
