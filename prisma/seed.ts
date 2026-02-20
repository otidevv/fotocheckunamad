import "dotenv/config";
import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const existing = await prisma.adminUser.findUnique({
    where: { username: "admin" },
  });

  if (existing) {
    console.log("Admin ya existe: admin / admin2026");
    return;
  }

  await prisma.adminUser.create({
    data: {
      username: "admin",
      password: "admin2026",
      name: "Administrador OTI",
    },
  });

  console.log("Admin creado: admin / admin2026");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
