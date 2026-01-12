import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Division data matching SimpleSearchInterface
const divisions = [
  {
    code: "DEP",
    name: "Division des Etudes et Projets",
    description: "Gestion des etudes et projets informatiques",
  },
  {
    code: "DEL",
    name: "Division de l Exploitation et des Logiciels",
    description: "Exploitation des systemes et developpement logiciel",
  },
  {
    code: "DTB",
    name: "Division de la Teleinformatique et de la Bureautique",
    description: "Reseaux, telecommunications et bureautique",
  },
  {
    code: "DIRE",
    name: "Division de l Informatique appliquee a la Recherche et a l Enseignement",
    description: "Applications pour la recherche et l enseignement",
  },
  {
    code: "DAAF",
    name: "Division des Affaires Administratives et Financieres",
    description: "Gestion administrative et financiere",
  },
];

// Default admin user
const adminUser = {
  email: "admin@cenadi.cm",
  password: "admin123",
  name: "Administrateur Systeme",
  role: Role.ADMIN,
  division: "DIRE",
};

async function main() {
  console.log("Seeding database...");

  // Create divisions
  console.log("Creating divisions...");
  for (const division of divisions) {
    await prisma.division.upsert({
      where: { code: division.code },
      update: {
        name: division.name,
        description: division.description,
      },
      create: division,
    });
    console.log(`  Created division: ${division.code} - ${division.name}`);
  }

  // Create admin user
  console.log("Creating admin user...");
  const hashedPassword = await bcrypt.hash(adminUser.password, 12);
  
  await prisma.user.upsert({
    where: { email: adminUser.email },
    update: {
      name: adminUser.name,
      role: adminUser.role,
      division: adminUser.division,
      password: hashedPassword,
    },
    create: {
      email: adminUser.email,
      password: hashedPassword,
      name: adminUser.name,
      role: adminUser.role,
      division: adminUser.division,
      isActive: true,
    },
  });
  console.log(`  Created admin user: ${adminUser.email}`);

  console.log("Seeding completed!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
