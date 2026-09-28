-- CreateEnum
CREATE TYPE "WebProperty" AS ENUM ('LANDERS', 'WEBSITE', 'CRM');

-- AlterTable
-- Nullable on purpose: existing rows are payments, AI and scraping keys that
-- are not tied to a web property, and the site-scoped ones are few enough to
-- re-point by hand.
ALTER TABLE "Integration" ADD COLUMN     "webProperty" "WebProperty";
