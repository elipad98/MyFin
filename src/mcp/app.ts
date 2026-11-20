import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import prisma from "../lib/prisma.js";
import { parseDateSafe, formatDateOnly } from "../lib/dateUtils.js";

/**
 * Esquema tolerante para montos numéricos o de texto (ej. 4446.46, -4446.46, "$4,446.46").
 * Retorna siempre un valor positivo (valor absoluto).
 */
const AmountSchema = z.union([z.number(), z.string()]).transform((val) => {
  const num = typeof val === "number" ? val : parseFloat(String(val).replace(/[$€,\s]/g, "").trim());
  if (isNaN(num) || num === 0) {
    throw new Error(`El monto '${val}' no es válido o debe ser distinto de cero.`);
  }
  return Math.abs(num);
});

/**
 * Esquema tolerante para tipos de transacción con soporte en español e inglés.
 */
const TransactionTypeSchema = z
  .string()
  .optional()
  .default("EXPENSE")
  .transform((val) => {
    const norm = String(val).toUpperCase().trim();
    if (["INCOME", "INGRESO", "ABONO", "DEPOSITO", "DEPÓSITO", "PAGO_RECIBIDO"].includes(norm)) {
      return "INCOME" as const;
    }
    if (["TRANSFER", "TRANSFERENCIA"].includes(norm)) {
      return "TRANSFER" as const;
    }
    return "EXPENSE" as const;
  });

/**
 * Calcula el impacto en el saldo de la cuenta.
 * - Tarjetas de crédito: el saldo representa DEUDA acumulada.
 *   Gasto/cargo aumenta la deuda (+), abono/pago disminuye la deuda (-).
 * - Cuentas regulares (débito/efectivo/inversión): el saldo representa DINERO DISPONIBLE.
 *   Ingreso aumenta saldo (+), gasto disminuye saldo (-).
 */
function calculateBalanceDelta(type: "EXPENSE" | "INCOME" | "TRANSFER", amount: number, isCredit: boolean): number {
  if (isCredit) {
    return type === "EXPENSE" ? amount : -amount;
  }
  return type === "INCOME" ? amount : -amount;
}

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

  // 3. Listar transacciones (con soporte de fechas desde/hasta y límite configurable)
  server.tool(
    "listar_transacciones",
    "Lista el historial de transacciones (ingresos, gastos o transferencias) con filtros por cuenta, categoría, fechas y límite.",
    {
      userId: z.string().optional().describe("ID del usuario (opcional)"),
      userEmail: z.string().optional().describe("Email del usuario (opcional)"),
      cuenta: z.string().optional().describe("Nombre o ID de la cuenta a filtrar"),
      categoria: z.string().optional().describe("Nombre o ID de la categoría a filtrar"),
      tipo: z.string().optional().describe("Tipo de transacción (EXPENSE, INCOME o TRANSFER)"),
      desde: z.string().optional().describe("Fecha inicial en formato YYYY-MM-DD para filtrar por rango"),
      hasta: z.string().optional().describe("Fecha final en formato YYYY-MM-DD para filtrar por rango"),
      limite: z
        .union([z.number(), z.string()])
        .optional()
        .default(50)
        .transform((v) => (typeof v === "string" ? parseInt(v, 10) || 50 : v))
        .describe("Cantidad máxima de transacciones a devolver (por defecto 50, máx 200)"),
    },
    async ({ userId, userEmail, cuenta, categoria, tipo, desde, hasta, limite }) => {
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

      const dateFilter: Record<string, Date> = {};
      if (desde) {
        const d = new Date(desde);
        if (!isNaN(d.getTime())) dateFilter.gte = d;
      }
      if (hasta) {
        const h = new Date(hasta.includes("T") ? hasta : `${hasta}T23:59:59.999Z`);
        if (!isNaN(h.getTime())) dateFilter.lte = h;
      }

      const transactions = await prisma.transaction.findMany({
        where: {
          userId: user.id,
          ...(accountId ? { accountId } : {}),
          ...(categoryId ? { categoryId } : {}),
          ...(tipo ? { type: tipo.toUpperCase() as any } : {}),
          ...(Object.keys(dateFilter).length > 0 ? { date: dateFilter } : {}),
        },
        take: Math.min(limite, 200),
        orderBy: { date: "desc" },
        include: {
          account: { select: { name: true, type: true } },
          category: { select: { name: true } },
        },
      });

      const formatTx = transactions.map((t) => ({
        id: t.id,
        fecha: formatDateOnly(t.date),
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

  // 4. Registrar nueva transacción (Tolerante a tipos, montos y descripciones opcionales)
  server.tool(
    "registrar_transaccion",
    "Registra una transacción financiera (gasto, ingreso o transferencia) y actualiza automáticamente el saldo de la cuenta.",
    {
      cuenta: z
        .string()
        .describe("Nombre o ID de la cuenta donde se realiza el movimiento (ej. 'Cuenta Bancaria', 'BBVA Débito', 'Efectivo')"),
      monto: AmountSchema.describe("Monto de la transacción (ej. 4446.46 o '4,446.46')"),
      tipo: TransactionTypeSchema.describe(
        "Tipo de transacción: EXPENSE (gasto/cargo), INCOME (ingreso/abono) o TRANSFER (por defecto EXPENSE)"
      ),
      descripcion: z
        .string()
        .optional()
        .default("Movimiento registrado")
        .describe("Concepto o motivo del movimiento (opcional, ej. 'Supermercado')"),
      categoria: z.string().optional().describe("Nombre o ID de la categoría (opcional, ej. 'Alimentación')"),
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
      const transactionDate = parseDateSafe(fecha);

      const created = await prisma.$transaction(async (tx) => {
        const newTransaction = await tx.transaction.create({
          data: {
            userId: user.id,
            accountId: targetAccount.id,
            categoryId: targetCategory?.id || null,
            amount: monto,
            type: tipo,
            description: descripcion || "Movimiento registrado",
            notes: notas || null,
            date: transactionDate,
          },
        });

        const isCredit = targetAccount.type === "CREDIT";
        const balanceDelta = calculateBalanceDelta(tipo, monto, isCredit);

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
            text:
              `Transacción registrada con éxito.\n` +
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

  // 5. Actualizar transacción existente
  server.tool(
    "actualizar_transaccion",
    "Actualiza una transacción existente por su ID (usa listar_transacciones para obtener el ID). Permite corregir monto, concepto, fecha, tipo o categoría y reajusta automáticamente los saldos.",
    {
      id: z.string().describe("ID de la transacción a corregir o actualizar"),
      monto: AmountSchema.optional().describe("Nuevo monto corregido (opcional)"),
      descripcion: z.string().optional().describe("Nuevo concepto o descripción (opcional)"),
      tipo: z.enum(["EXPENSE", "INCOME", "TRANSFER"]).optional().describe("Nuevo tipo de transacción (opcional)"),
      categoria: z.string().optional().describe("Nombre o ID de la nueva categoría (opcional)"),
      fecha: z.string().optional().describe("Nueva fecha en formato YYYY-MM-DD (opcional)"),
      notas: z.string().optional().describe("Nuevas notas (opcional)"),
      userId: z.string().optional().describe("ID del usuario (opcional)"),
      userEmail: z.string().optional().describe("Email del usuario (opcional)"),
    },
    async ({ id, monto, descripcion, tipo, categoria, fecha, notas, userId, userEmail }) => {
      const user = await resolveUser(userId, userEmail);

      const existing = await prisma.transaction.findFirst({
        where: { id, userId: user.id },
        include: { account: true, category: true },
      });
      if (!existing) {
        throw new Error(`No se encontró ninguna transacción con ID '${id}' para este usuario.`);
      }

      let categoryId = existing.categoryId;
      if (categoria !== undefined) {
        const cat = await resolveCategory(categoria, user.id);
        categoryId = cat?.id || null;
      }

      const updated = await prisma.$transaction(async (tx) => {
        const isCredit = existing.account.type === "CREDIT";
        const oldDelta = calculateBalanceDelta(existing.type, existing.amount, isCredit);

        const newType = tipo || existing.type;
        const newAmount = monto !== undefined ? monto : existing.amount;
        const newDelta = calculateBalanceDelta(newType, newAmount, isCredit);

        // Revertir el impacto anterior y aplicar el nuevo cambio neto al saldo
        const netBalanceChange = newDelta - oldDelta;
        if (netBalanceChange !== 0) {
          await tx.account.update({
            where: { id: existing.accountId },
            data: { balance: { increment: netBalanceChange } },
          });
        }

        return await tx.transaction.update({
          where: { id },
          data: {
            ...(monto !== undefined ? { amount: monto } : {}),
            ...(descripcion !== undefined ? { description: descripcion } : {}),
            ...(tipo !== undefined ? { type: newType } : {}),
            ...(categoria !== undefined ? { categoryId } : {}),
            ...(fecha !== undefined ? { date: parseDateSafe(fecha) } : {}),
            ...(notas !== undefined ? { notes: notas } : {}),
          },
          include: { account: true, category: true },
        });
      });

      return {
        content: [
          {
            type: "text",
            text:
              `Transacción corregida con éxito:\n` +
              `- ID: ${updated.id}\n` +
              `- Concepto: ${updated.description}\n` +
              `- Monto: $${updated.amount} (${updated.type})\n` +
              `- Cuenta: ${updated.account.name}\n` +
              `- Categoría: ${updated.category?.name || "Sin categoría"}`,
          },
        ],
      };
    }
  );

  // 6. Eliminar transacción existente
  server.tool(
    "eliminar_transaccion",
    "Elimina una transacción existente y revierte automáticamente su saldo en la cuenta.",
    {
      id: z.string().describe("ID de la transacción a eliminar"),
      userId: z.string().optional().describe("ID del usuario (opcional)"),
      userEmail: z.string().optional().describe("Email del usuario (opcional)"),
    },
    async ({ id, userId, userEmail }) => {
      const user = await resolveUser(userId, userEmail);

      const existing = await prisma.transaction.findFirst({
        where: { id, userId: user.id },
        include: { account: true },
      });
      if (!existing) {
        throw new Error(`No se encontró ninguna transacción con ID '${id}' para este usuario.`);
      }

      await prisma.$transaction(async (tx) => {
        const isCredit = existing.account.type === "CREDIT";
        const delta = calculateBalanceDelta(existing.type, existing.amount, isCredit);

        // Restar el impacto anterior para devolver el saldo
        await tx.account.update({
          where: { id: existing.accountId },
          data: { balance: { decrement: delta } },
        });

        await tx.transaction.delete({ where: { id } });
      });

      return {
        content: [
          {
            type: "text",
            text: `Transacción eliminada con éxito (ID: ${id}, '${existing.description}', $${existing.amount}) y saldo restaurado.`,
          },
        ],
      };
    }
  );

  // 7. Listar categorías disponibles
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

  // 8. Resumen financiero mensual
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

  // 9. Listar suscripciones
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

  // 10. Listar metas de ahorro
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
