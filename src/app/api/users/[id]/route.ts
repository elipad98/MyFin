import { NextResponse } from 'next/server';
import { getSession, hashPassword } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Solo administradores pueden editar usuarios' }, { status: 403 });
  }

  const { id } = await params;
  const { name, email, role, password } = await request.json();

  try {
    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    const updateData: any = {
      name: name !== undefined ? name : existing.name,
      email: email !== undefined ? email.toLowerCase().trim() : existing.email,
      role: role !== undefined ? role : existing.role,
    };

    if (password && password.trim() !== '') {
      updateData.password = await hashPassword(password);
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      select: { id: true, name: true, email: true, role: true, currency: true, emailVerified: true, createdAt: true },
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json({ error: 'Error al actualizar usuario' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Solo administradores pueden eliminar usuarios' }, { status: 403 });
  }

  const { id } = await params;

  if (session.id === id) {
    return NextResponse.json({ error: 'No puedes eliminar tu propio usuario administrador' }, { status: 400 });
  }

  try {
    await prisma.user.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json({ error: 'Error al eliminar usuario' }, { status: 500 });
  }
}
