import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import bcrypt from "bcryptjs";

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL!,
});
const prisma = new PrismaClient({ adapter });

async function main() {
  const adminPassword = await bcrypt.hash("admin123", 12);

  const admin = await prisma.user.upsert({
    where: { email: "admin@localservices.fr" },
    update: {},
    create: {
      name: "Admin",
      email: "admin@localservices.fr",
      hashedPassword: adminPassword,
      role: "ADMIN",
    },
  });
  console.log("Admin cr\u00e9\u00e9:", admin.email);

  const clientPassword = await bcrypt.hash("client123", 12);
  await prisma.user.upsert({
    where: { email: "client@test.fr" },
    update: {},
    create: {
      name: "Jean Client",
      email: "client@test.fr",
      hashedPassword: clientPassword,
      role: "CLIENT",
    },
  });
  console.log("Client cr\u00e9\u00e9: client@test.fr");

  const providerPassword = await bcrypt.hash("pro123", 12);
  await prisma.user.upsert({
    where: { email: "pro@test.fr" },
    update: {},
    create: {
      name: "Marie Pro",
      email: "pro@test.fr",
      hashedPassword: providerPassword,
      role: "PROVIDER",
      providerProfile: {
        create: {
          businessName: "Electricit\u00e9 Pro SARL",
          category: "Electricit\u00e9",
          location: "Paris",
          offerTokens: 5,
        },
      },
    },
  });
  console.log("Prestataire cr\u00e9\u00e9: pro@test.fr");

  const defaultCategories = [
    "Electricit\u00e9", "Plomberie", "Climatisation", "R\u00e9novation",
    "Peinture", "Menuiserie", "Serrurerie", "Jardinage", "M\u00e9nage", "Autre",
  ];
  for (const name of defaultCategories) {
    await prisma.category.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }
  console.log("Cat\u00e9gories par d\u00e9faut cr\u00e9\u00e9es");

  console.log("\nComptes de d\u00e9monstration :");
  console.log("  Admin        | admin@localservices.fr | admin123");
  console.log("  Client       | client@test.fr         | client123");
  console.log("  Prestataire  | pro@test.fr            | pro123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
