import { NextResponse } from 'next/server';
import { getSession, hashPassword } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, currency: true, emailVerified: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  });

  return NextResponse.json(users);
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Solo administradores pueden añadir usuarios' }, { status: 403 });
  }

  try {
    const { name, email, password, role = 'MEMBER', currency = 'MXN' } = await request.json();

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Campos requeridos faltantes' }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (existing) {
      return NextResponse.json({ error: 'El usuario ya existe' }, { status: 400 });
    }

    const hashedPassword = await hashPassword(password);
    const newUser = await prisma.user.create({
      data: {
        name,
        email: email.toLowerCase().trim(),
        password: hashedPassword,
        role,
        currency,
        emailVerified: true,
      },
    });

    // Create standard accounts for member
    await prisma.account.createMany({
      data: [
        { userId: newUser.id, name: 'Efectivo', type: 'CASH', balance: 0, currency, color: '#10b981', icon: 'wallet' },
        { userId: newUser.id, name: 'Cuenta Bancaria', type: 'BANK', balance: 0, currency, color: '#3b82f6', icon: 'landmark' },
      ],
    });

    return NextResponse.json({
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
    });
  } catch (error) {
    console.error('Error adding user:', error);
    return NextResponse.json({ error: 'Error al agregar usuario' }, { status: 500 });
  }
}
