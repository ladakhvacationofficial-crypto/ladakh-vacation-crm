/**
 * Set a user's login email and password from the command line.
 *
 *   npm run set-login
 *
 * WHY THIS EXISTS: the console has no change-password screen, and the
 * forgot-password email only works once Brevo is configured. The owner is
 * seeded with a random password nobody knows, so this is how the owner sets
 * their real one.
 *
 * Run it YOURSELF, in PowerShell or Windows Terminal. It asks for the password
 * with typing hidden and never prints it, so nobody else — including an
 * assistant helping you — has to see it. It refuses to run where it cannot
 * hide the input.
 *
 * Reads the database URL from backend/.env, so there is nothing to export
 * first.
 */
import { config } from 'dotenv';
import * as path from 'path';
import * as readline from 'readline';
import * as bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

config({ path: path.join(__dirname, '..', '.env'), quiet: true });

const MIN_LENGTH = 12;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** One prompt. When `hidden`, every keystroke echoes as "*". */
function ask(question: string, hidden = false): Promise<string> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: true,
    });
    const muted = rl as unknown as {
      stdoutMuted: boolean;
      _writeToOutput: (s: string) => void;
    };
    muted.stdoutMuted = false;
    muted._writeToOutput = (s: string) => {
      process.stdout.write(muted.stdoutMuted ? '*' : s);
    };
    rl.question(question, (answer) => {
      rl.close();
      if (hidden) process.stdout.write('\n');
      // Never trim a password: it has to match exactly what is typed at login.
      resolve(hidden ? answer : answer.trim());
    });
    if (hidden) muted.stdoutMuted = true;
  });
}

async function main() {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    console.error(
      'This needs an interactive terminal so the password can be hidden.\n' +
        'Run it in PowerShell or Windows Terminal: cd backend; npm run set-login',
    );
    process.exit(1);
  }
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is not set. Put the Neon connection string in backend/.env first.');
    process.exit(1);
  }

  const prisma = new PrismaClient();
  try {
    const current = (
      (await ask('Current login email [admin@ladakhvacation.in]: ')) ||
      'admin@ladakhvacation.in'
    ).toLowerCase();

    const user = await prisma.user.findUnique({ where: { email: current } });
    if (!user) {
      console.error(`No user with the email ${current}.`);
      process.exit(1);
    }
    console.log(`Found ${user.name} (${user.role}).`);

    const nextEmailRaw = (
      await ask('New login email — press Enter to keep the current one: ')
    ).toLowerCase();
    const nextEmail = nextEmailRaw || current;
    if (!EMAIL.test(nextEmail)) {
      console.error(`"${nextEmail}" is not an email address.`);
      process.exit(1);
    }
    if (nextEmail !== current) {
      const taken = await prisma.user.findUnique({ where: { email: nextEmail } });
      if (taken) {
        console.error(`${nextEmail} already belongs to another user.`);
        process.exit(1);
      }
    }

    const password = await ask(`New password (at least ${MIN_LENGTH} characters): `, true);
    if (password.length < MIN_LENGTH) {
      console.error(`Too short: ${password.length} characters. Nothing was changed.`);
      process.exit(1);
    }
    if (password === 'ChangeMe123!') {
      console.error('That is the seed default. Choose a different one. Nothing was changed.');
      process.exit(1);
    }
    const confirm = await ask('Type it again: ', true);
    if (confirm !== password) {
      console.error('The two entries did not match. Nothing was changed.');
      process.exit(1);
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        email: nextEmail,
        passwordHash: await bcrypt.hash(password, 10),
      },
    });

    console.log(
      `Done. Log in to the console as ${nextEmail} with the new password.` +
        (nextEmail !== current ? ` The old email ${current} no longer works.` : ''),
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error('Failed:', e instanceof Error ? e.message : e);
  process.exit(1);
});
