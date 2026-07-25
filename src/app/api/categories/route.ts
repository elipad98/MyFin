import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const categories = await prisma.category.findMany({
    where: {
      OR: [
        { isSystem: true },
        { userId: session.id },
      ],
    },
    orderBy: { name: 'asc' },
  });

  return NextResponse.json(categories);
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  try {
    const { name, type = 'EXPENSE', color = '#8b5cf6', icon = 'tag' } = await request.json();

    if (!name) return NextResponse.json({ error: 'El nombre es obligatorio' }, { status: 400 });

    const category = await prisma.category.create({
      data: {
        userId: session.id,
        name,
        type,
        color,
        icon,
        isSystem: false,
      },
    });

    return NextResponse.json(category);
  } catch (error) {
    console.error('Error creating category:', error);
    return NextResponse.json({ error: 'Error al crear la categoría' }, { status: 500 });
  }
}
