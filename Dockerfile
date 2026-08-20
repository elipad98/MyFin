FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
COPY . .
RUN npm ci --legacy-peer-deps
RUN npx prisma generate
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Crear directorio separado para la BD persistente
RUN mkdir -p /data

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/prisma ./prisma

EXPOSE 3000

# Copiar el schema actualizado a /data, luego ejecutar prisma con la BD en /data
CMD ["sh", "-c", "cp /app/prisma/schema.prisma /data/schema.prisma && DATABASE_URL=file:/data/dev.db npx prisma db push --schema=/app/prisma/schema.prisma && DATABASE_URL=file:/data/dev.db npx tsx prisma/seed.ts && DATABASE_URL=file:/data/dev.db npm start"]
