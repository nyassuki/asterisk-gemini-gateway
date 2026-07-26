import { PrismaClient } from "@prisma/client";

declare global {
  var prisma: PrismaClient | undefined;
}

const getDatabaseUrl = () => {
  if (process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith("postgresql://")) {
    return process.env.DATABASE_URL;
  }

  const host = process.env.SQL_HOST || "localhost";
  const user = encodeURIComponent(process.env.SQL_USER || "postgres");
  const password = encodeURIComponent(process.env.SQL_PASSWORD || "");
  const dbName = process.env.SQL_DB_NAME || "postgres";
  const port = process.env.SQL_PORT || "5432";

  // If host is a socket path (starts with /), Prisma expects host in query param
  if (host.startsWith("/")) {
    return `postgresql://${user}:${password}@localhost/${dbName}?host=${host}&connect_timeout=15`;
  }

  // Ensure port is just digits to avoid "invalid port number"
  const cleanPort = port.replace(/[^0-9]/g, "");

  return `postgresql://${user}:${password}@${host}:${cleanPort || "5432"}/${dbName}?connect_timeout=15`;
};

export const prisma = global.prisma || new PrismaClient({
  datasources: {
    db: {
      url: getDatabaseUrl(),
    },
  },
});

if (process.env.NODE_ENV !== "production") {
  global.prisma = prisma;
}

export const db = prisma;
