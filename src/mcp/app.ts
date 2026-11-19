import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import prisma from "../lib/prisma.js";

/**
 * Resuelve el usuario activo. Si se pasa `userEmail` o `userId`, lo busca;
 * de lo contrario, toma el primer usuario que tenga cuentas creadas o el primer usuario registrado.
 */
async function resolveUser(userId?: string, userEmail?: string) {
  if (userId) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user) return user;
  }
  if (userEmail) {
    const user = await prisma.user.findUnique({ where: { email: userEmail } });
    if (user) return user;
  }

  const userWithAccounts = await prisma.user.findFirst({
    where: { accounts: { some: {} } },
    include: { _count: { select: { accounts: true } } },
    orderBy: { accounts: { _count: "desc" } },
  });

  if (userWithAccounts) return userWithAccounts;

  const fallbackUser = await prisma.user.findFirst();
  if (!fallbackUser) {
    throw new Error("No se encontró ningún usuario registrado en la base de datos.");
  }
  return fallbackUser;
}

/**
 * Busca una cuenta por su ID o por coincidencia parcial en su nombre.
 */
async function resolveAccount(accountIdentifier: string, userId: string) {
  const byId = await prisma.account.findFirst({
    where: { id: accountIdentifier, userId },
  });
  if (byId) return byId;

  const byName = await prisma.account.findFirst({
    where: {
      userId,
      name: { contains: accountIdentifier },
    },
  });
  return byName;
}

/**
 * Busca una categoría por ID o nombre.
 */
async function resolveCategory(categoryIdentifier?: string, userId?: string) {
  if (!categoryIdentifier) return null;

  const byId = await prisma.category.findUnique({
    where: { id: categoryIdentifier },
  });
  if (byId) return byId;

  const byName = await prisma.category.findFirst({
    where: {
      name: { contains: categoryIdentifier },
      OR: [{ userId }, { isSystem: true }],
    },
  });
  return byName;
}

/**
 * Crea y configura una nueva instancia del servidor MCP con todas las herramientas de MyFin.
 */
export function createMyFinMcpServer(): McpServer {
  const server = new McpServer({
    name: "MyFin MCP Server",
    version: "1.0.0",
  });

  // 1. Listar usuarios
  server.tool(
    "obtener_usuarios",
    "Devuelve la lista de usuarios registrados en la aplicación para identificar sobre cuál operar.",
    {},
    async () => {
      const users = await prisma.user.findMany({
        select: { id: true, name: true, email: true, role: true, currency: true },
      });
      return {
        content: [{ type: "text", text: JSON.stringify(users, null, 2) }],
      };
    }
  );

  // 2. Obtener cuentas y saldos
  server.tool(
    "obtener_cuentas",
    "Consulta todas las cuentas financieras (bancos, tarjetas de crédito, efectivo, inversiones) con sus saldos actuales.",
    {
      userId: z.string().optional().describe("ID del usuario (opcional)"),
      userEmail: z.string().optional().describe("Email del usuario (opcional)"),
    },
    async ({ userId, userEmail }) => {
      const user = await resolveUser(userId, userEmail);
      const accounts = await prisma.account.findMany({
        where: { userId: user.id },
        select: {
          id: true,
          name: true,
          type: true,
          balance: true,
          currency: true,
          cutoffDay: true,
          paymentDueDay: true,
          creditLimit: true,
        },
        orderBy: { name: "asc" },
      });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                usuario: { id: user.id, name: user.name, email: user.email },
                totalCuentas: accounts.length,
                cuentas: accounts,
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  // 3. Listar transacciones
  server.tool(
    "listar_transacciones",
    "Lista el historial de transacciones (ingresos, gastos o transferencias) con filtros opcionales.",
    {
      userId: z.string().optional().describe("ID del usuario (opcional)"),
      userEmail: z.string().optional().describe("Email del usuario (opcional)"),
      cuenta: z.string().optional().describe("Nombre o ID de la cuenta a filtrar"),
      categoria: z.string().optional().describe("Nombre o ID de la categoría a filtrar"),
      tipo: z.enum(["INCOME", "EXPENSE", "TRANSFER"]).optional().describe("Tipo de transacción"),
      limite: z.number().default(15).describe("Cantidad máxima de transacciones a devolver (por defecto 15)"),
    },
    async ({ userId, userEmail, cuenta, categoria, tipo, limite }) => {
      const user = await resolveUser(userId, userEmail);

      let accountId: string | undefined;
      if (cuenta) {
        const acc = await resolveAccount(cuenta, user.id);
        if (acc) accountId = acc.id;
      }

      let categoryId: string | undefined;
      if (categoria) {
        const cat = await resolveCategory(categoria, user.id);
        if (cat) categoryId = cat.id;
      }

      const transactions = await prisma.transaction.findMany({
        where: {
          userId: user.id,
          ...(accountId ? { accountId } : {}),
          ...(categoryId ? { categoryId } : {}),
          ...(tipo ? { type: tipo } : {}),
        },
        take: limite,
        orderBy: { date: "desc" },
        include: {
          account: { select: { name: true, type: true } },
          category: { select: { name: true } },
        },
      });

      const formatTx = transactions.map((t) => ({
        id: t.id,
        fecha: t.date.toISOString().split("T")[0],
        descripcion: t.description,
        monto: t.amount,
        tipo: t.type,
        cuenta: t.account.name,
        categoria: t.category?.name || "Sin categoría",
        notas: t.notes || undefined,
      }));

      return {
        content: [{ type: "text", text: JSON.stringify(formatTx, null, 2) }],
      };
    }
  );

  // 4. Registrar nueva transacción
  server.tool(
    "registrar_transaccion",
    "Registra una transacción financiera (gasto, ingreso o transferencia) y actualiza automáticamente el saldo de la cuenta.",
    {
      cuenta: z.string().describe("Nombre o ID de la cuenta donde se realiza el movimiento (ej. 'BBVA Débito', 'Efectivo')"),
      monto: z.number().positive().describe("Monto de la transacción (positivo)"),
      tipo: z.enum(["EXPENSE", "INCOME", "TRANSFER"]).describe("Tipo de transacción"),
      descripcion: z.string().describe("Concepto o motivo del movimiento (ej. 'Comida en restaurante', 'Pago nómina')"),
      categoria: z.string().optional().describe("Nombre o ID de la categoría (ej. 'Alimentación y Súper', 'Transporte y Auto')"),
      fecha: z.string().optional().describe("Fecha en formato YYYY-MM-DD (por defecto hoy)"),
      notas: z.string().optional().describe("Notas o comentarios adicionales"),
      userId: z.string().optional().describe("ID del usuario (opcional)"),
      userEmail: z.string().optional().describe("Email del usuario (opcional)"),
    },
    async ({ cuenta, monto, tipo, descripcion, categoria, fecha, notas, userId, userEmail }) => {
      const user = await resolveUser(userId, userEmail);

      const targetAccount = await resolveAccount(cuenta, user.id);
      if (!targetAccount) {
        throw new Error(`No se encontró ninguna cuenta asociada a '${cuenta}' para el usuario ${user.name}.`);
      }

      const targetCategory = await resolveCategory(categoria, user.id);
      const transactionDate = fecha ? new Date(fecha) : new Date();

      const created = await prisma.$transaction(async (tx) => {
        const newTransaction = await tx.transaction.create({
          data: {
            userId: user.id,
            accountId: targetAccount.id,
            categoryId: targetCategory?.id || null,
            amount: monto,
            type: tipo,
            description,
            notes: notas || null,
            date: transactionDate,
          },
        });

        const balanceDelta = tipo === "INCOME" ? monto : -monto;
        const updatedAccount = await tx.account.update({
          where: { id: targetAccount.id },
          data: { balance: { increment: balanceDelta } },
        });

        return { newTransaction, updatedAccount };
      });

      return {
        content: [
          {
            type: "text",
            text: `Transacción registrada con éxito.\n` +
              `- ID: ${created.newTransaction.id}\n` +
              `- Concepto: ${created.newTransaction.description}\n` +
              `- Monto: $${monto} (${tipo})\n` +
              `- Cuenta: ${created.updatedAccount.name} (Nuevo saldo: $${created.updatedAccount.balance})\n` +
              `- Categoría: ${targetCategory?.name || "Sin categoría"}`,
          },
        ],
      };
    }
  );

  // 5. Listar categorías disponibles
  server.tool(
    "listar_categorias",
    "Devuelve la lista de categorías registradas (de ingresos y gastos) para poder clasificar movimientos.",
    {
      tipo: z.enum(["EXPENSE", "INCOME"]).optional().describe("Filtrar por tipo (opcional)"),
      userId: z.string().optional().describe("ID del usuario (opcional)"),
    },
    async ({ tipo, userId }) => {
      const categories = await prisma.category.findMany({
        where: {
          ...(tipo ? { type: tipo } : {}),
          OR: [{ isSystem: true }, ...(userId ? [{ userId }] : [])],
        },
        select: {
          id: true,
          name: true,
          type: true,
          icon: true,
          color: true,
          isSystem: true,
        },
        orderBy: { name: "asc" },
      });

      return {
        content: [{ type: "text", text: JSON.stringify(categories, null, 2) }],
      };
    }
  );

  // 6. Resumen financiero mensual
  server.tool(
    "obtener_resumen_mensual",
    "Calcula el total de ingresos, gastos, balance neto y desglose por categorías de un mes específico o el mes actual.",
    {
      mes: z.number().min(1).max(12).optional().describe("Número de mes (1 a 12). Por defecto mes actual."),
      anio: z.number().optional().describe("Año (ej. 2026). Por defecto año actual."),
      userId: z.string().optional().describe("ID del usuario (opcional)"),
      userEmail: z.string().optional().describe("Email del usuario (opcional)"),
    },
    async ({ mes, anio, userId, userEmail }) => {
      const user = await resolveUser(userId, userEmail);

      const now = new Date();
      const targetMonth = mes !== undefined ? mes - 1 : now.getMonth();
      const targetYear = anio || now.getFullYear();

      const startOfMonth = new Date(targetYear, targetMonth, 1);
      const endOfMonth = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59, 999);

      const transactions = await prisma.transaction.findMany({
        where: {
          userId: user.id,
          date: { gte: startOfMonth, lte: endOfMonth },
        },
        include: {
          category: { select: { name: true } },
        },
      });

      let totalIngresos = 0;
      let totalGastos = 0;
      const desgloseCategorias: Record<string, number> = {};

      for (const t of transactions) {
        if (t.type === "INCOME") {
          totalIngresos += t.amount;
        } else if (t.type === "EXPENSE") {
          totalGastos += t.amount;
          const catName = t.category?.name || "Sin Categoría";
          desgloseCategorias[catName] = (desgloseCategorias[catName] || 0) + t.amount;
        }
      }

      const balanceNeto = totalIngresos - totalGastos;

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                periodo: `${targetYear}-${String(targetMonth + 1).padStart(2, "0")}`,
                usuario: user.name,
                totalIngresos,
                totalGastos,
                balanceNeto,
                desgloseGastosPorCategoria: desgloseCategorias,
                cantidadTransacciones: transactions.length,
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  // 7. Listar suscripciones
  server.tool(
    "listar_suscripciones",
    "Lista todas las suscripciones activas del usuario, sus montos, ciclo de facturación y fecha de próxima renovación.",
    {
      userId: z.string().optional().describe("ID del usuario (opcional)"),
      userEmail: z.string().optional().describe("Email del usuario (opcional)"),
    },
    async ({ userId, userEmail }) => {
      const user = await resolveUser(userId, userEmail);
      const subscriptions = await prisma.subscription.findMany({
        where: { userId: user.id },
        select: {
          id: true,
          name: true,
          provider: true,
          amount: true,
          billingCycle: true,
          nextRenewal: true,
          category: true,
          status: true,
          autoPay: true,
        },
        orderBy: { nextRenewal: "asc" },
      });

      return {
        content: [{ type: "text", text: JSON.stringify(subscriptions, null, 2) }],
      };
    }
  );

  // 8. Listar metas de ahorro
  server.tool(
    "listar_metas_ahorro",
    "Consulta las metas de ahorro del usuario, montos objetivo, acumulados y porcentaje de progreso.",
    {
      userId: z.string().optional().describe("ID del usuario (opcional)"),
      userEmail: z.string().optional().describe("Email del usuario (opcional)"),
    },
    async ({ userId, userEmail }) => {
      const user = await resolveUser(userId, userEmail);
      const goals = await prisma.savingsGoal.findMany({
        where: { userId: user.id },
        select: {
          id: true,
          name: true,
          targetAmount: true,
          currentAmount: true,
          status: true,
          deadline: true,
        },
        orderBy: { createdAt: "desc" },
      });

      const goalsWithProgress = goals.map((g) => ({
        ...g,
        progresoPorcentaje: g.targetAmount > 0 ? ((g.currentAmount / g.targetAmount) * 100).toFixed(1) + "%" : "0%",
        deadline: g.deadline ? g.deadline.toISOString().split("T")[0] : null,
      }));

      return {
        content: [{ type: "text", text: JSON.stringify(goalsWithProgress, null, 2) }],
      };
    }
  );

  return server;
}
