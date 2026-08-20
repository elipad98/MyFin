import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {

  // 1. Create Default Categories
  const systemCategories = [
    // EXPENSES
    { name: 'Alimentación y Súper', type: 'EXPENSE', color: '#f59e0b', icon: 'shopping-bag', isSystem: true },
    { name: 'Restaurantes y Cafés', type: 'EXPENSE', color: '#ef4444', icon: 'utensils', isSystem: true },
    { name: 'Vivienda y Servicios', type: 'EXPENSE', color: '#3b82f6', icon: 'home', isSystem: true },
    { name: 'Transporte y Auto', type: 'EXPENSE', color: '#6366f1', icon: 'car', isSystem: true },
    { name: 'Entretenimiento y Ocio', type: 'EXPENSE', color: '#8b5cf6', icon: 'film', isSystem: true },
    { name: 'Suscripciones y Nube', type: 'EXPENSE', color: '#ec4899', icon: 'tv', isSystem: true },
    { name: 'Salud y Farmacia', type: 'EXPENSE', color: '#10b981', icon: 'heart-pulse', isSystem: true },
    { name: 'Educación y Cursos', type: 'EXPENSE', color: '#14b8a6', icon: 'graduation-cap', isSystem: true },
    { name: 'Ropa y Compras', type: 'EXPENSE', color: '#f97316', icon: 'shirt', isSystem: true },
    { name: 'Mascotas', type: 'EXPENSE', color: '#a855f7', icon: 'dog', isSystem: true },
    { name: 'Otros Gastos', type: 'EXPENSE', color: '#64748b', icon: 'more-horizontal', isSystem: true },

    // INCOME
    { name: 'Sueldo y Salario', type: 'INCOME', color: '#10b981', icon: 'briefcase', isSystem: true },
    { name: 'Ventas y Freelance', type: 'INCOME', color: '#06b6d4', icon: 'laptop', isSystem: true },
    { name: 'Inversiones y Rendimientos', type: 'INCOME', color: '#8b5cf6', icon: 'trending-up', isSystem: true },
    { name: 'Regalos y Bonos', type: 'INCOME', color: '#f59e0b', icon: 'gift', isSystem: true },
    { name: 'Otros Ingresos', type: 'INCOME', color: '#64748b', icon: 'dollar-sign', isSystem: true },
  ];

  for (const cat of systemCategories) {
    const existing = await prisma.category.findFirst({
      where: { name: cat.name, isSystem: true },
    });
    if (!existing) {
      await prisma.category.create({
        data: cat as any,
      });
    }
  }

  // 2. Create Admin User
  const hashedPassword = await bcrypt.hash('!Thehellcat98!', 10);
  const adminUser = await prisma.user.upsert({
    where: { email: 'epadila@admin.com' },
    update: { emailVerified: true },
    create: {
      name: 'Eliezer (Admin)',
      email: 'epadila@admin.com',
      password: hashedPassword,
      role: 'ADMIN',
      currency: 'MXN',
      emailVerified: true,
    },
  });

  // 3. Create Sample Accounts
  const existingAccounts = await prisma.account.findMany({
    where: { userId: adminUser.id },
  });

  if (existingAccounts.length === 0) {
    const bankAcc = await prisma.account.create({
      data: {
        userId: adminUser.id,
        name: 'BBVA Débito',
        type: 'BANK',
        balance: 24500.00,
        currency: 'MXN',
        color: '#1d4ed8',
        icon: 'landmark',
        accountNumber: '**** 4589',
      },
    });

    const cashAcc = await prisma.account.create({
      data: {
        userId: adminUser.id,
        name: 'Efectivo',
        type: 'CASH',
        balance: 1850.00,
        currency: 'MXN',
        color: '#10b981',
        icon: 'wallet',
      },
    });

    const creditAcc = await prisma.account.create({
      data: {
        userId: adminUser.id,
        name: 'Mercado Pago TC',
        type: 'CREDIT',
        balance: 3200.00,
        currency: 'MXN',
        color: '#0284c7',
        icon: 'credit-card',
        accountNumber: '**** 1204',
        cutoffDay: 15,
        paymentDueDay: 5,
        creditLimit: 15000.00,
      },
    });

    const nuCreditAcc = await prisma.account.create({
      data: {
        userId: adminUser.id,
        name: 'Nu Tarjeta de Crédito',
        type: 'CREDIT',
        balance: 5400.00,
        currency: 'MXN',
        color: '#8b5cf6',
        icon: 'credit-card',
        accountNumber: '**** 8841',
        cutoffDay: 25,
        paymentDueDay: 15,
        creditLimit: 25000.00,
      },
    });

    const savingsAcc = await prisma.account.create({
      data: {
        userId: adminUser.id,
        name: 'Nu Cetes / Fondo Ahorro',
        type: 'INVESTMENT',
        balance: 45000.00,
        currency: 'MXN',
        color: '#8b5cf6',
        icon: 'piggy-bank',
      },
    });

    // 4. Sample Subscriptions
    const subCategories = ['Streaming', 'Música', 'Nube', 'Software', 'Gaming'];
    const sampleSubs = [
      { name: 'Netflix 4K', provider: 'Netflix', amount: 299, billingCycle: 'MONTHLY', category: 'Streaming', color: '#e50914', logo: 'https://assets.nflxext.com/us/ffe/siteui/common/icons/nficon2016.ico', nextRenewal: new Date(Date.now() + 5 * 86400000) },
      { name: 'Spotify Family', provider: 'Spotify', amount: 199, billingCycle: 'MONTHLY', category: 'Música', color: '#1db954', logo: 'https://open.spotifycdn.com/cdn/images/favicon.0f31d2ea.ico', nextRenewal: new Date(Date.now() + 12 * 86400000) },
      { name: 'YouTube Premium', provider: 'Google', amount: 139, billingCycle: 'MONTHLY', category: 'Streaming', color: '#ff0000', logo: 'https://www.youtube.com/s/desktop/f5d72f91/img/favicon.ico', nextRenewal: new Date(Date.now() + 18 * 86400000) },
      { name: 'iCloud 200GB', provider: 'Apple', amount: 49, billingCycle: 'MONTHLY', category: 'Nube', color: '#0070c9', nextRenewal: new Date(Date.now() + 2 * 86400000) },
      { name: 'Xbox Game Pass Ultimate', provider: 'Microsoft', amount: 249, billingCycle: 'MONTHLY', category: 'Gaming', color: '#107c41', nextRenewal: new Date(Date.now() + 25 * 86400000) },
      { name: 'Hetznervps / Homelab Domain', provider: 'Cloudflare', amount: 350, billingCycle: 'YEARLY', category: 'Software', color: '#f38020', nextRenewal: new Date(Date.now() + 120 * 86400000) },
    ];

    for (const sub of sampleSubs) {
      await prisma.subscription.create({
        data: {
          userId: adminUser.id,
          ...sub,
          status: 'ACTIVE',
          autoPay: true,
        } as any,
      });
    }

    // 5. Sample Savings Goals
    await prisma.savingsGoal.createMany({
      data: [
        { userId: adminUser.id, name: 'Fondo de Emergencia (6 meses)', targetAmount: 60000, currentAmount: 35000, color: '#10b981', icon: 'shield', status: 'IN_PROGRESS' },
        { userId: adminUser.id, name: 'Viaje Fin de Año', targetAmount: 25000, currentAmount: 12000, color: '#06b6d4', icon: 'plane', status: 'IN_PROGRESS' },
        { userId: adminUser.id, name: 'Nuevo Servidor Homelab', targetAmount: 15000, currentAmount: 15000, color: '#8b5cf6', icon: 'server', status: 'COMPLETED' },
      ],
    });

    // 6. Sample Transactions
    const foodCat = await prisma.category.findFirst({ where: { name: 'Alimentación y Súper' } });
    const salaryCat = await prisma.category.findFirst({ where: { name: 'Sueldo y Salario' } });
    const subCat = await prisma.category.findFirst({ where: { name: 'Suscripciones y Nube' } });
    const restCat = await prisma.category.findFirst({ where: { name: 'Restaurantes y Cafés' } });

    await prisma.transaction.createMany({
      data: [
        { userId: adminUser.id, accountId: bankAcc.id, categoryId: salaryCat?.id, amount: 28000, type: 'INCOME', description: 'Pago de Nómina Quincenal', date: new Date(Date.now() - 3 * 86400000) },
        { userId: adminUser.id, accountId: bankAcc.id, categoryId: foodCat?.id, amount: 1850.50, type: 'EXPENSE', description: 'Supermercado Walmart', date: new Date(Date.now() - 2 * 86400000) },
        { userId: adminUser.id, accountId: creditAcc.id, categoryId: restCat?.id, amount: 420.00, type: 'EXPENSE', description: 'Cena Restaurante', date: new Date(Date.now() - 1 * 86400000) },
        { userId: adminUser.id, accountId: bankAcc.id, categoryId: subCat?.id, amount: 299.00, type: 'EXPENSE', description: 'Suscripción Netflix 4K', date: new Date() },
        { userId: adminUser.id, accountId: cashAcc.id, categoryId: foodCat?.id, amount: 120.00, type: 'EXPENSE', description: 'Frutas y Verduras Mercado', date: new Date() },
      ],
    });

    // 7. Sample Budgets
    const now = new Date();
    if (foodCat) {
      await prisma.budget.create({
        data: { userId: adminUser.id, categoryId: foodCat.id, amount: 6000, month: now.getMonth() + 1, year: now.getFullYear() },
      });
    }
    if (restCat) {
      await prisma.budget.create({
        data: { userId: adminUser.id, categoryId: restCat.id, amount: 2500, month: now.getMonth() + 1, year: now.getFullYear() },
      });
    }
    if (subCat) {
      await prisma.budget.create({
        data: { userId: adminUser.id, categoryId: subCat.id, amount: 1500, month: now.getMonth() + 1, year: now.getFullYear() },
      });
    }
  }

}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
