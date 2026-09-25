-- CreateEnum
CREATE TYPE "ScrapeDraftStatus" AS ENUM ('PENDING_REVIEW', 'APPROVED', 'REJECTED', 'MERGED');

-- CreateEnum
CREATE TYPE "VehicleType" AS ENUM ('INNOVA', 'INNOVA_CRYSTA', 'FORTUNER', 'SCORPIO', 'XYLO', 'TEMPO_TRAVELLER_12', 'TEMPO_TRAVELLER_17', 'URBANIA', 'HATCHBACK', 'SEDAN', 'MOTORBIKE', 'OTHER');

-- CreateEnum
CREATE TYPE "FleetOwnership" AS ENUM ('COMPANY_OWNED', 'ATTACHED_TAXI_UNION', 'VENDOR_FLEET');

-- CreateEnum
CREATE TYPE "FleetAssignmentStatus" AS ENUM ('ASSIGNED', 'DISPATCHED', 'ON_TRIP', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PermitType" AS ENUM ('ILP_DOMESTIC', 'PAP_FOREIGN');

-- CreateEnum
CREATE TYPE "PermitStatus" AS ENUM ('DRAFT', 'PENDING_DOCS', 'DOCS_VERIFIED', 'APPLIED_DC_OFFICE', 'ISSUED', 'REJECTED');

-- AlterEnum
ALTER TYPE "IntegrationCategory" ADD VALUE 'SCRAPING';

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'INR',
ADD COLUMN     "fxRate" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
ADD COLUMN     "handedOverAt" TIMESTAMP(3),
ADD COLUMN     "handedOverById" TEXT,
ADD COLUMN     "handoverNotes" TEXT,
ADD COLUMN     "operationsOwnerId" TEXT;

-- AlterTable
ALTER TABLE "BookingCost" ADD COLUMN     "confirmationRef" TEXT,
ADD COLUMN     "confirmationStatus" TEXT NOT NULL DEFAULT 'DRAFT',
ADD COLUMN     "dueDate" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "BookingPayment" ADD COLUMN     "dueDate" TIMESTAMP(3),
ADD COLUMN     "verificationStatus" TEXT NOT NULL DEFAULT 'VERIFIED',
ADD COLUMN     "verifiedAt" TIMESTAMP(3),
ADD COLUMN     "verifiedById" TEXT;

-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "bookingId" TEXT;

-- AlterTable
ALTER TABLE "Itinerary" ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'INR',
ADD COLUMN     "fxRate" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
ADD COLUMN     "shareToken" TEXT;

-- AlterTable
ALTER TABLE "Lead" ALTER COLUMN "phoneKey" SET DATA TYPE TEXT;

-- CreateTable
CREATE TABLE "VendorDraft" (
    "id" TEXT NOT NULL,
    "sourceProvider" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "city" TEXT,
    "propertyType" "VendorType" NOT NULL DEFAULT 'HOTEL',
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "starRating" INTEGER,
    "roomCount" INTEGER,
    "checkInTime" TEXT,
    "checkOutTime" TEXT,
    "roomCategories" JSONB NOT NULL DEFAULT '[]',
    "seasonalFrom" TIMESTAMP(3),
    "seasonalTo" TIMESTAMP(3),
    "reportedAmenities" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "rawPayload" JSONB,
    "status" "ScrapeDraftStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdVendorId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VendorDraft_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanyProfile" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "legalName" TEXT NOT NULL DEFAULT 'Ladakh Vacation Private Limited',
    "brandName" TEXT NOT NULL DEFAULT 'Ladakh Vacation',
    "gstin" TEXT,
    "pan" TEXT,
    "address" TEXT NOT NULL DEFAULT 'Main Bazaar Road, Near SBI Bank',
    "city" TEXT NOT NULL DEFAULT 'Leh',
    "state" TEXT NOT NULL DEFAULT 'Ladakh (UT)',
    "stateCode" TEXT NOT NULL DEFAULT '38',
    "pincode" TEXT NOT NULL DEFAULT '194101',
    "phone" TEXT NOT NULL DEFAULT '+91 94191 78901',
    "email" TEXT NOT NULL DEFAULT 'reservations@ladakhvacation.in',
    "website" TEXT NOT NULL DEFAULT 'https://ladakhvacation.com',
    "bankName" TEXT,
    "accountNumber" TEXT,
    "ifscCode" TEXT,
    "accountHolder" TEXT,
    "upiId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanyProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItineraryRevision" (
    "id" TEXT NOT NULL,
    "itineraryId" TEXT NOT NULL,
    "revisionNumber" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "totalPax" INTEGER NOT NULL DEFAULT 2,
    "snapshot" JSONB NOT NULL,
    "totalNet" INTEGER NOT NULL DEFAULT 0,
    "totalSell" INTEGER NOT NULL DEFAULT 0,
    "perPersonSell" INTEGER NOT NULL DEFAULT 0,
    "changeSummary" TEXT,
    "createdById" TEXT,
    "isAccepted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ItineraryRevision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vehicle" (
    "id" TEXT NOT NULL,
    "plateNumber" TEXT NOT NULL,
    "makeModel" TEXT NOT NULL,
    "vehicleType" "VehicleType" NOT NULL DEFAULT 'INNOVA_CRYSTA',
    "ownership" "FleetOwnership" NOT NULL DEFAULT 'ATTACHED_TAXI_UNION',
    "capacity" INTEGER NOT NULL DEFAULT 6,
    "seatingConfig" TEXT,
    "fuelType" TEXT,
    "vendorId" TEXT,
    "defaultDriverId" TEXT,
    "insuranceExpiry" TIMESTAMP(3),
    "fitnessExpiry" TIMESTAMP(3),
    "permitExpiry" TIMESTAMP(3),
    "pucExpiry" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Driver" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "altPhone" TEXT,
    "licenseNumber" TEXT NOT NULL,
    "licenseExpiry" TIMESTAMP(3),
    "policeVerified" BOOLEAN NOT NULL DEFAULT true,
    "bloodGroup" TEXT,
    "isLocalLadakhi" BOOLEAN NOT NULL DEFAULT true,
    "badgeNumber" TEXT,
    "vendorId" TEXT,
    "employeeId" TEXT,
    "rating" DOUBLE PRECISION,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Driver_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FleetAssignment" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "vehicleId" TEXT,
    "driverId" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "circuit" TEXT NOT NULL,
    "pickupLocation" TEXT,
    "dropLocation" TEXT,
    "status" "FleetAssignmentStatus" NOT NULL DEFAULT 'ASSIGNED',
    "dutySlipNumber" TEXT,
    "startKm" INTEGER,
    "endKm" INTEGER,
    "fuelAllowance" INTEGER DEFAULT 0,
    "driverBatta" INTEGER DEFAULT 0,
    "parkingTollPaid" INTEGER DEFAULT 0,
    "notes" TEXT,
    "assignedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FleetAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PermitApplication" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "permitType" "PermitType" NOT NULL DEFAULT 'ILP_DOMESTIC',
    "status" "PermitStatus" NOT NULL DEFAULT 'PENDING_DOCS',
    "sectors" TEXT[],
    "validFrom" TIMESTAMP(3) NOT NULL,
    "validTo" TIMESTAMP(3) NOT NULL,
    "dcOfficeRef" TEXT,
    "permitNumber" TEXT,
    "issuedAt" TIMESTAMP(3),
    "environmentalFee" INTEGER NOT NULL DEFAULT 0,
    "wildlifeFee" INTEGER NOT NULL DEFAULT 0,
    "redCrossFee" INTEGER NOT NULL DEFAULT 0,
    "totalFee" INTEGER NOT NULL DEFAULT 0,
    "feeReceiptNumber" TEXT,
    "documentScanUrl" TEXT,
    "rejectedReason" TEXT,
    "notes" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PermitApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PermitTraveller" (
    "id" TEXT NOT NULL,
    "permitApplicationId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "age" INTEGER,
    "gender" TEXT,
    "nationality" TEXT NOT NULL DEFAULT 'Indian',
    "stateOrCountry" TEXT,
    "idType" TEXT NOT NULL DEFAULT 'AADHAAR',
    "idNumber" TEXT NOT NULL,
    "idDocumentUrl" TEXT,
    "passportIssueDate" TIMESTAMP(3),
    "passportExpiryDate" TIMESTAMP(3),
    "visaNumber" TEXT,
    "visaExpiryDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PermitTraveller_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VendorDraft_city_status_idx" ON "VendorDraft"("city", "status");

-- CreateIndex
CREATE INDEX "VendorDraft_sourceProvider_idx" ON "VendorDraft"("sourceProvider");

-- CreateIndex
CREATE INDEX "VendorDraft_status_idx" ON "VendorDraft"("status");

-- CreateIndex
CREATE INDEX "ItineraryRevision_itineraryId_idx" ON "ItineraryRevision"("itineraryId");

-- CreateIndex
CREATE UNIQUE INDEX "ItineraryRevision_itineraryId_revisionNumber_key" ON "ItineraryRevision"("itineraryId", "revisionNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Vehicle_plateNumber_key" ON "Vehicle"("plateNumber");

-- CreateIndex
CREATE INDEX "Vehicle_vehicleType_idx" ON "Vehicle"("vehicleType");

-- CreateIndex
CREATE INDEX "Vehicle_ownership_idx" ON "Vehicle"("ownership");

-- CreateIndex
CREATE INDEX "Vehicle_vendorId_idx" ON "Vehicle"("vendorId");

-- CreateIndex
CREATE UNIQUE INDEX "Driver_licenseNumber_key" ON "Driver"("licenseNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Driver_employeeId_key" ON "Driver"("employeeId");

-- CreateIndex
CREATE INDEX "Driver_phone_idx" ON "Driver"("phone");

-- CreateIndex
CREATE INDEX "Driver_vendorId_idx" ON "Driver"("vendorId");

-- CreateIndex
CREATE INDEX "FleetAssignment_bookingId_idx" ON "FleetAssignment"("bookingId");

-- CreateIndex
CREATE INDEX "FleetAssignment_vehicleId_idx" ON "FleetAssignment"("vehicleId");

-- CreateIndex
CREATE INDEX "FleetAssignment_driverId_idx" ON "FleetAssignment"("driverId");

-- CreateIndex
CREATE INDEX "FleetAssignment_startDate_endDate_idx" ON "FleetAssignment"("startDate", "endDate");

-- CreateIndex
CREATE INDEX "PermitApplication_bookingId_idx" ON "PermitApplication"("bookingId");

-- CreateIndex
CREATE INDEX "PermitApplication_status_idx" ON "PermitApplication"("status");

-- CreateIndex
CREATE INDEX "PermitApplication_validFrom_validTo_idx" ON "PermitApplication"("validFrom", "validTo");

-- CreateIndex
CREATE INDEX "PermitTraveller_permitApplicationId_idx" ON "PermitTraveller"("permitApplicationId");

-- CreateIndex
CREATE INDEX "Booking_operationsOwnerId_idx" ON "Booking"("operationsOwnerId");

-- CreateIndex
CREATE INDEX "BookingCost_dueDate_idx" ON "BookingCost"("dueDate");

-- CreateIndex
CREATE INDEX "BookingPayment_dueDate_idx" ON "BookingPayment"("dueDate");

-- CreateIndex
CREATE INDEX "BookingPayment_verificationStatus_idx" ON "BookingPayment"("verificationStatus");

-- CreateIndex
CREATE INDEX "Invoice_bookingId_idx" ON "Invoice"("bookingId");

-- CreateIndex
CREATE INDEX "Invoice_leadId_idx" ON "Invoice"("leadId");

-- CreateIndex
CREATE UNIQUE INDEX "Itinerary_shareToken_key" ON "Itinerary"("shareToken");

-- AddForeignKey
ALTER TABLE "VendorDraft" ADD CONSTRAINT "VendorDraft_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorDraft" ADD CONSTRAINT "VendorDraft_createdVendorId_fkey" FOREIGN KEY ("createdVendorId") REFERENCES "Vendor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_operationsOwnerId_fkey" FOREIGN KEY ("operationsOwnerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_handedOverById_fkey" FOREIGN KEY ("handedOverById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingPayment" ADD CONSTRAINT "BookingPayment_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItineraryRevision" ADD CONSTRAINT "ItineraryRevision_itineraryId_fkey" FOREIGN KEY ("itineraryId") REFERENCES "Itinerary"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItineraryRevision" ADD CONSTRAINT "ItineraryRevision_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_defaultDriverId_fkey" FOREIGN KEY ("defaultDriverId") REFERENCES "Driver"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Driver" ADD CONSTRAINT "Driver_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Driver" ADD CONSTRAINT "Driver_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FleetAssignment" ADD CONSTRAINT "FleetAssignment_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FleetAssignment" ADD CONSTRAINT "FleetAssignment_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FleetAssignment" ADD CONSTRAINT "FleetAssignment_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FleetAssignment" ADD CONSTRAINT "FleetAssignment_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PermitApplication" ADD CONSTRAINT "PermitApplication_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PermitApplication" ADD CONSTRAINT "PermitApplication_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PermitTraveller" ADD CONSTRAINT "PermitTraveller_permitApplicationId_fkey" FOREIGN KEY ("permitApplicationId") REFERENCES "PermitApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;