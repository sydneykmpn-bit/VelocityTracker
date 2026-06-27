import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient } from "@/generated/prisma/client";

const dbUrl = process.env.DATABASE_URL ?? "file:prisma/dev.db";
const authToken = process.env.TURSO_AUTH_TOKEN; // undefined locally = uses file, required on Vercel

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter: new PrismaLibSql({ url: dbUrl, authToken }),
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;