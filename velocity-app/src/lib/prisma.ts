import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient } from "@prisma/client";

const dbUrl = process.env.DATABASE_URL ?? "file:prisma/dev.db";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter: new PrismaLibSql({ url: dbUrl }),
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
