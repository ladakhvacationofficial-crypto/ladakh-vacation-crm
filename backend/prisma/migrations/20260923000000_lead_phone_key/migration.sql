ALTER TABLE "Lead" ADD COLUMN "phoneKey" VARCHAR(20);
UPDATE "Lead" SET "phoneKey" = RIGHT(regexp_replace("phone", '[^0-9]', '', 'g'), 10);
CREATE INDEX "Lead_phoneKey_idx" ON "Lead"("phoneKey");
