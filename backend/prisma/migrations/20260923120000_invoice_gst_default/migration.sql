-- Align the database fallback with the existing application default.
-- Existing invoices retain their recorded rates.
ALTER TABLE "Invoice" ALTER COLUMN "gstRate" SET DEFAULT 5;
