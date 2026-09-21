import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';

const prisma = new PrismaClient();

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL ?? 'admin@ladakhvacation.in';
  // No well-known default password. When SEED_ADMIN_PASSWORD is unset or
  // empty, the owner gets a random one nobody sees; set the real one with
  // `npm run set-login`.
  const password =
    process.env.SEED_ADMIN_PASSWORD || randomBytes(24).toString('base64url');
  const name = process.env.SEED_ADMIN_NAME ?? 'Ladakh Vacation Owner';

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, name, passwordHash, role: Role.OWNER },
  });

  console.log(
    process.env.SEED_ADMIN_PASSWORD
      ? `Seeded owner: ${user.email}  (password from SEED_ADMIN_PASSWORD)`
      : `Seeded owner: ${user.email}  (random password; run \`npm run set-login\` to set yours)`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
