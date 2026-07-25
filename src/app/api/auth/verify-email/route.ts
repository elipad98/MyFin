import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { createSession } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json({ error: 'Token de verificación faltante' }, { status: 400 });
    }

    const user = await prisma.user.findFirst({
      where: { emailVerificationToken: token },
    });

    if (!user) {
      return NextResponse.json({ error: 'El enlace de verificación es inválido o ya ha sido utilizado' }, { status: 400 });
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        emailVerificationToken: null,
      },
    });

    // Automatically log in user after verification
    await createSession({
      id: updatedUser.id,
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role,
      currency: updatedUser.currency,
    });

    return NextResponse.json({
      success: true,
      message: '¡Correo verificado con éxito!',
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
      },
    });
  } catch (error) {
    console.error('Verify email error:', error);
    return NextResponse.json({ error: 'Error al verificar el correo' }, { status: 500 });
  }
}
