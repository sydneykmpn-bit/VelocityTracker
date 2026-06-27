import "dotenv/config";
import { defineConfig } from "prisma/config";
import { createClient } from "@libsql/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

const dbUrl = process.env["DATABASE_URL"] ?? "file:prisma/dev.db";
const isLibSQL = dbUrl.startsWith("libsql://") || dbUrl.startsWith("libsql+");

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: isLibSQL
    ? {
        adapter: () => {
          const client = createClient({
            url: dbUrl,
            authToken: process.env["TURSO_AUTH_TOKEN"],
          });
          return new PrismaLibSql(client);
        },
      }
    : {
        url: dbUrl,
      },
});
