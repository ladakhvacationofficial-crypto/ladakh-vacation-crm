-- Baseline for Ladakh Vacation: the full schema from prisma/schema.prisma.
--
-- Replaces the 21 migrations inherited from Glitz, which do not replay on a
-- fresh database: 14 tables in the schema (Attachment, B2bPartner, Campaign,
-- CampaignRecipient, ContentIdea, Integration, LeadRoutingSettings, MediaAsset,
-- SeoDomainSignals, SeoOffPage, SeoSearchAnalytics, SeoSearchDimensionDaily,
-- SocialAccount, SocialPost) were never created by any migration, because the
-- Glitz database was evolved with 'prisma db push'. The first one referenced,
-- SeoOffPage, failed migration 20260831120000_canonical_domain. The old
-- history is in git (commit 4d567c2). Generated with:
--   prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('SUPER_ADMIN', 'OWNER', 'SALES_MANAGER', 'SALES_EXEC', 'ACCOUNTS', 'MARKETING', 'OPERATIONS');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'PAID', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('NEW', 'CONTACTED', 'INTERESTED', 'QUOTATION_SENT', 'NEGOTIATION', 'CONFIRMED', 'CANCELLED', 'LOST', 'FUTURE_FOLLOWUP');

-- CreateEnum
CREATE TYPE "ItineraryItemKind" AS ENUM ('STAY', 'TRANSFER', 'SIGHTSEEING', 'MEAL', 'ACTIVITY', 'FREE_TIME', 'NOTE');

-- CreateEnum
CREATE TYPE "EmploymentType" AS ENUM ('FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN', 'CONSULTANT');

-- CreateEnum
CREATE TYPE "EmploymentStatus" AS ENUM ('ACTIVE', 'ON_LEAVE', 'NOTICE', 'EXITED');

-- CreateEnum
CREATE TYPE "InterviewOutcome" AS ENUM ('PENDING', 'SELECTED', 'ON_HOLD', 'REJECTED');

-- CreateEnum
CREATE TYPE "AdChannel" AS ENUM ('GOOGLE_ADS', 'META_ADS', 'INSTAGRAM', 'YOUTUBE', 'LINKEDIN', 'SEO', 'EMAIL', 'AFFILIATE', 'OTHER');

-- CreateEnum
CREATE TYPE "LeadSource" AS ENUM ('GOOGLE_ADS', 'META_ADS', 'INSTAGRAM', 'FACEBOOK', 'LANDING_PAGE', 'WEBSITE', 'ORGANIC', 'REFERRAL', 'WALK_IN', 'PHONE', 'WHATSAPP', 'TRADE_FAIR', 'EMAIL', 'B2B_AGENT', 'OTHER');

-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('NOTE', 'CALL', 'WHATSAPP', 'EMAIL', 'MEETING', 'STATUS_CHANGE', 'ASSIGNMENT', 'RE_ENQUIRY', 'SYSTEM');

-- CreateEnum
CREATE TYPE "VendorType" AS ENUM ('HOTEL', 'HOUSEBOAT', 'TRANSPORT', 'GUIDE', 'ACTIVITY', 'RESTAURANT', 'PHOTOGRAPHER', 'EVENT', 'OTHER');

-- CreateEnum
CREATE TYPE "Season" AS ENUM ('PEAK', 'SHOULDER', 'OFF', 'FESTIVE');

-- CreateEnum
CREATE TYPE "MealPlan" AS ENUM ('EP', 'CP', 'MAP', 'AP');

-- CreateEnum
CREATE TYPE "RateBasis" AS ENUM ('PER_ROOM_NIGHT', 'PER_PERSON', 'PER_PERSON_NIGHT', 'PER_VEHICLE_DAY', 'PER_TRANSFER', 'PER_UNIT');

-- CreateEnum
CREATE TYPE "ServiceType" AS ENUM ('HOTEL', 'TRANSPORT', 'ACTIVITY', 'FLIGHT', 'GUIDE', 'MEAL', 'PERMIT', 'MISC');

-- CreateEnum
CREATE TYPE "MarkupMode" AS ENUM ('INHERIT', 'PERCENT', 'FIXED', 'MANUAL');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('PENDING', 'CONFIRMED', 'PARTIALLY_PAID', 'PAID', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentMode" AS ENUM ('CASH', 'BANK_TRANSFER', 'UPI', 'CARD', 'CHEQUE', 'RAZORPAY', 'OTHER');

-- CreateEnum
CREATE TYPE "IntegrationCategory" AS ENUM ('PAYMENT_DOMESTIC', 'PAYMENT_INTERNATIONAL', 'AI', 'ADS', 'SOCIAL', 'ANALYTICS');

-- CreateEnum
CREATE TYPE "IntegrationTestStatus" AS ENUM ('UNTESTED', 'OK', 'FAILED');

-- CreateEnum
CREATE TYPE "CampaignChannel" AS ENUM ('WHATSAPP', 'EMAIL');

-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'SENDING', 'SENT', 'CANCELLED', 'FAILED');

-- CreateEnum
CREATE TYPE "CampaignRecipientStatus" AS ENUM ('PENDING', 'SENT', 'DELIVERED', 'READ', 'FAILED', 'BOUNCED', 'UNSUBSCRIBED');

-- CreateEnum
CREATE TYPE "RoutingStrategy" AS ENUM ('ROUND_ROBIN', 'PERFORMANCE_WEIGHTED', 'LOAD_BALANCED', 'MANUAL');

-- CreateEnum
CREATE TYPE "SocialPlatform" AS ENUM ('INSTAGRAM', 'FACEBOOK', 'PINTEREST', 'LINKEDIN', 'X');

-- CreateEnum
CREATE TYPE "SocialPostStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'PUBLISHING', 'PUBLISHED', 'FAILED');

-- CreateEnum
CREATE TYPE "ContentTone" AS ENUM ('STORYTELLING', 'PROMOTIONAL', 'PUNCHY_REEL', 'INFORMATIVE');

-- CreateTable
CREATE TABLE "Itinerary" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "createdById" TEXT,
    "title" TEXT NOT NULL,
    "headline" TEXT,
    "intro" TEXT,
    "totalPax" INTEGER NOT NULL DEFAULT 2,
    "inclusions" TEXT,
    "exclusions" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Itinerary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItineraryOption" (
    "id" TEXT NOT NULL,
    "itineraryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isRecommended" BOOLEAN NOT NULL DEFAULT false,
    "markupPercent" DOUBLE PRECISION,
    "totalNet" INTEGER NOT NULL DEFAULT 0,
    "totalSell" INTEGER NOT NULL DEFAULT 0,
    "totalMargin" INTEGER NOT NULL DEFAULT 0,
    "marginPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "markupPercentEffective" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "perPersonSell" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ItineraryOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItineraryDay" (
    "id" TEXT NOT NULL,
    "itineraryId" TEXT NOT NULL,
    "dayNumber" INTEGER NOT NULL,
    "date" TIMESTAMP(3),
    "city" TEXT,
    "headline" TEXT,
    "summary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ItineraryDay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItineraryItem" (
    "id" TEXT NOT NULL,
    "dayId" TEXT NOT NULL,
    "kind" "ItineraryItemKind" NOT NULL DEFAULT 'SIGHTSEEING',
    "time" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "location" TEXT,
    "vendorId" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "units" INTEGER NOT NULL DEFAULT 1,
    "priceable" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ItineraryItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItineraryItemPricing" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "optionId" TEXT NOT NULL,
    "vendorRateId" TEXT,
    "vendorId" TEXT,
    "unitNet" INTEGER NOT NULL,
    "markupPercent" DOUBLE PRECISION,
    "lineNet" INTEGER NOT NULL DEFAULT 0,
    "lineSell" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ItineraryItemPricing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Employee" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "fatherName" TEXT,
    "photoUrl" TEXT,
    "bloodGroup" TEXT,
    "dob" TIMESTAMP(3),
    "gender" TEXT,
    "nationality" TEXT DEFAULT 'Indian',
    "phone" TEXT NOT NULL,
    "altPhone" TEXT,
    "email" TEXT,
    "addressLine" TEXT,
    "city" TEXT,
    "state" TEXT,
    "pincode" TEXT,
    "emergencyContactName" TEXT,
    "emergencyContactPhone" TEXT,
    "emergencyContactRelation" TEXT,
    "aadhaar" TEXT,
    "pan" TEXT,
    "designation" TEXT NOT NULL,
    "department" TEXT,
    "employmentType" "EmploymentType" NOT NULL DEFAULT 'FULL_TIME',
    "status" "EmploymentStatus" NOT NULL DEFAULT 'ACTIVE',
    "joinedOn" TIMESTAMP(3) NOT NULL,
    "confirmedOn" TIMESTAMP(3),
    "exitedOn" TIMESTAMP(3),
    "reportsToId" TEXT,
    "userId" TEXT,
    "ctcMonthly" INTEGER,
    "basicMonthly" INTEGER,
    "hraMonthly" INTEGER,
    "allowMonthly" INTEGER,
    "pfMonthly" INTEGER,
    "esiMonthly" INTEGER,
    "taxMonthly" INTEGER,
    "otherDedMonthly" INTEGER,
    "bankName" TEXT,
    "accountNumber" TEXT,
    "ifsc" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalarySlip" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "periodMonth" TIMESTAMP(3) NOT NULL,
    "daysWorked" INTEGER,
    "daysInMonth" INTEGER,
    "lop" INTEGER,
    "basic" INTEGER NOT NULL DEFAULT 0,
    "hra" INTEGER NOT NULL DEFAULT 0,
    "allowances" INTEGER NOT NULL DEFAULT 0,
    "bonus" INTEGER NOT NULL DEFAULT 0,
    "arrears" INTEGER NOT NULL DEFAULT 0,
    "pf" INTEGER NOT NULL DEFAULT 0,
    "esi" INTEGER NOT NULL DEFAULT 0,
    "tax" INTEGER NOT NULL DEFAULT 0,
    "otherDed" INTEGER NOT NULL DEFAULT 0,
    "grossPay" INTEGER NOT NULL DEFAULT 0,
    "totalDed" INTEGER NOT NULL DEFAULT 0,
    "netPay" INTEGER NOT NULL DEFAULT 0,
    "paidOn" TIMESTAMP(3),
    "reference" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalarySlip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Interview" (
    "id" TEXT NOT NULL,
    "candidateName" TEXT NOT NULL,
    "candidatePhone" TEXT NOT NULL,
    "candidateEmail" TEXT,
    "role" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "durationMinutes" INTEGER DEFAULT 45,
    "interviewerId" TEXT,
    "interviewerName" TEXT,
    "questionnaire" JSONB DEFAULT '[]',
    "overallRating" INTEGER,
    "strengths" TEXT,
    "concerns" TEXT,
    "outcome" "InterviewOutcome" NOT NULL DEFAULT 'PENDING',
    "outcomeNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Interview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SeoSite" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "crawlPaths" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SeoSite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SeoSearchAnalytics" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "page" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "ctr" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "position" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SeoSearchAnalytics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SeoSearchDimensionDaily" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "dimension" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "ctr" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "position" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SeoSearchDimensionDaily_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SeoDomainSignals" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "gbpCompleteness" INTEGER,
    "gbpReviewCount" INTEGER,
    "gbpAverageRating" DOUBLE PRECISION,
    "gbpPostsLast30d" INTEGER,
    "citationsTotal" INTEGER,
    "citationsNapConsistent" INTEGER,
    "brandMentionsLinked" INTEGER,
    "brandMentionsUnlinked" INTEGER,
    "referringDomainsTotal" INTEGER,
    "toxicDomainCount" INTEGER,
    "verifiedOn" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SeoDomainSignals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SeoAudit" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "score" INTEGER NOT NULL DEFAULT 0,
    "perfScore" INTEGER,
    "a11yScore" INTEGER,
    "bpScore" INTEGER,
    "seoScore" INTEGER,
    "lcpMs" INTEGER,
    "clsX1k" INTEGER,
    "inpMs" INTEGER,
    "checks" JSONB,
    "tasks" JSONB,
    "errors" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SeoAudit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'SALES_EXEC',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "address" TEXT,
    "state" TEXT,
    "city" TEXT,
    "country" TEXT,
    "destination" TEXT,
    "travelDate" TIMESTAMP(3),
    "nights" INTEGER,
    "adults" INTEGER,
    "children" INTEGER,
    "budget" INTEGER,
    "message" TEXT,
    "status" "LeadStatus" NOT NULL DEFAULT 'NEW',
    "source" "LeadSource" NOT NULL DEFAULT 'OTHER',
    "score" INTEGER NOT NULL DEFAULT 0,
    "scoreNotes" TEXT,
    "lostReason" TEXT,
    "b2bPartnerId" TEXT,
    "assignedToId" TEXT,
    "utmSource" TEXT,
    "utmMedium" TEXT,
    "utmCampaign" TEXT,
    "utmTerm" TEXT,
    "utmContent" TEXT,
    "gclid" TEXT,
    "fbclid" TEXT,
    "landingPage" TEXT,
    "referrer" TEXT,
    "keyword" TEXT,
    "device" TEXT,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "enquiryCount" INTEGER NOT NULL DEFAULT 1,
    "lastContact" TIMESTAMP(3),
    "firstContactAt" TIMESTAMP(3),
    "nextFollowUp" TIMESTAMP(3),
    "followUpManual" BOOLEAN NOT NULL DEFAULT false,
    "slaBreachAt" TIMESTAMP(3),
    "visitId" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "externalSource" TEXT,
    "externalId" TEXT,
    "externalRaw" JSONB,
    "importedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LandingPage" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT,
    "campaign" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LandingPage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Visit" (
    "id" TEXT NOT NULL,
    "visitorId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "landingPageId" TEXT,
    "pagePath" TEXT NOT NULL,
    "utmSource" TEXT,
    "utmMedium" TEXT,
    "utmCampaign" TEXT,
    "utmTerm" TEXT,
    "utmContent" TEXT,
    "gclid" TEXT,
    "fbclid" TEXT,
    "referrer" TEXT,
    "keyword" TEXT,
    "device" TEXT,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "country" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Visit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdSpend" (
    "id" TEXT NOT NULL,
    "spendDate" TIMESTAMP(3) NOT NULL,
    "channel" "AdChannel" NOT NULL DEFAULT 'GOOGLE_ADS',
    "campaign" TEXT,
    "adGroup" TEXT,
    "landingPageId" TEXT,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "impressions" INTEGER,
    "clicks" INTEGER,
    "notes" TEXT,
    "externalSource" TEXT,
    "externalId" TEXT,
    "syncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdSpend_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Activity" (
    "id" TEXT NOT NULL,
    "type" "ActivityType" NOT NULL DEFAULT 'NOTE',
    "content" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Activity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vendor" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "VendorType" NOT NULL DEFAULT 'HOTEL',
    "city" TEXT,
    "area" TEXT,
    "address" TEXT,
    "starRating" INTEGER,
    "falconGrade" TEXT,
    "contactPerson" TEXT,
    "phone" TEXT,
    "altPhone" TEXT,
    "email" TEXT,
    "bankName" TEXT,
    "accountNumber" TEXT,
    "ifsc" TEXT,
    "gstin" TEXT,
    "panNumber" TEXT,
    "paymentTerms" TEXT,
    "unionZone" TEXT,
    "checkInTime" TEXT,
    "checkOutTime" TEXT,
    "roomCount" INTEGER,
    "amenities" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vendor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorRate" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "variant" TEXT NOT NULL,
    "season" "Season" NOT NULL DEFAULT 'PEAK',
    "mealPlan" "MealPlan",
    "rateBasis" "RateBasis" NOT NULL DEFAULT 'PER_ROOM_NIGHT',
    "netRate" INTEGER NOT NULL,
    "rackRate" INTEGER,
    "extraBedRate" INTEGER,
    "childRate" INTEGER,
    "maxOccupancy" INTEGER,
    "validFrom" TIMESTAMP(3),
    "validTo" TIMESTAMP(3),
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VendorRate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PricingSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "defaultMarkupPercent" DOUBLE PRECISION NOT NULL DEFAULT 20,
    "hotelMarkupPercent" DOUBLE PRECISION,
    "transportMarkupPercent" DOUBLE PRECISION,
    "activityMarkupPercent" DOUBLE PRECISION,
    "flightMarkupPercent" DOUBLE PRECISION,
    "guideMarkupPercent" DOUBLE PRECISION,
    "mealMarkupPercent" DOUBLE PRECISION,
    "permitMarkupPercent" DOUBLE PRECISION,
    "miscMarkupPercent" DOUBLE PRECISION,
    "minMarginPercent" DOUBLE PRECISION NOT NULL DEFAULT 15,
    "monthlyOverhead" INTEGER,
    "filesPerMonth" INTEGER,
    "gstPercent" DOUBLE PRECISION NOT NULL DEFAULT 5,
    "roundTo" INTEGER NOT NULL DEFAULT 10,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PricingSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Booking" (
    "id" TEXT NOT NULL,
    "bookingNumber" TEXT NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'PENDING',
    "leadId" TEXT NOT NULL,
    "itineraryId" TEXT,
    "itineraryOptionId" TEXT,
    "createdById" TEXT,
    "packageName" TEXT,
    "travelStartDate" TIMESTAMP(3),
    "travelEndDate" TIMESTAMP(3),
    "adults" INTEGER NOT NULL DEFAULT 2,
    "children" INTEGER NOT NULL DEFAULT 0,
    "nights" INTEGER NOT NULL DEFAULT 0,
    "totalSell" INTEGER NOT NULL DEFAULT 0,
    "totalNet" INTEGER NOT NULL DEFAULT 0,
    "totalReceived" INTEGER NOT NULL DEFAULT 0,
    "totalCostPaid" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "cancelledReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingPayment" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "mode" "PaymentMode" NOT NULL DEFAULT 'BANK_TRANSFER',
    "reference" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "isRefund" BOOLEAN NOT NULL DEFAULT false,
    "recordedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookingPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingCost" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "vendorId" TEXT,
    "description" TEXT NOT NULL,
    "amountDue" INTEGER NOT NULL,
    "amountPaid" INTEGER NOT NULL DEFAULT 0,
    "paidAt" TIMESTAMP(3),
    "reference" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BookingCost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Integration" (
    "id" TEXT NOT NULL,
    "category" "IntegrationCategory" NOT NULL,
    "provider" TEXT NOT NULL,
    "label" TEXT,
    "credentials" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "lastTestedAt" TIMESTAMP(3),
    "lastTestStatus" "IntegrationTestStatus" NOT NULL DEFAULT 'UNTESTED',
    "lastTestMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Integration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "B2bPartner" (
    "id" TEXT NOT NULL,
    "agencyName" TEXT NOT NULL,
    "contactName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "city" TEXT,
    "state" TEXT,
    "address" TEXT,
    "commissionRate" DOUBLE PRECISION NOT NULL DEFAULT 10.0,
    "assignedToId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "B2bPartner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "subtotal" DOUBLE PRECISION NOT NULL,
    "gstRate" DOUBLE PRECISION NOT NULL DEFAULT 18.0,
    "gstAmount" DOUBLE PRECISION NOT NULL,
    "total" DOUBLE PRECISION NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "dueDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceLineItem" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "total" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "InvoiceLineItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadApprovalRequest" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "reason" TEXT,
    "requestedById" TEXT NOT NULL,
    "reviewedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeadApprovalRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attachment" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "folder" TEXT NOT NULL DEFAULT 'general',
    "entityType" TEXT,
    "entityId" TEXT,
    "uploadedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Attachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Campaign" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "channel" "CampaignChannel" NOT NULL,
    "status" "CampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "audienceFilter" JSONB NOT NULL DEFAULT '{}',
    "targetCount" INTEGER NOT NULL DEFAULT 0,
    "templateName" TEXT,
    "templateLang" TEXT DEFAULT 'en',
    "templateParams" JSONB,
    "emailSubject" TEXT,
    "emailHtml" TEXT,
    "scheduledAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "totalSent" INTEGER NOT NULL DEFAULT 0,
    "totalDelivered" INTEGER NOT NULL DEFAULT 0,
    "totalRead" INTEGER NOT NULL DEFAULT 0,
    "totalFailed" INTEGER NOT NULL DEFAULT 0,
    "estimatedCost" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignRecipient" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "leadId" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "name" TEXT,
    "status" "CampaignRecipientStatus" NOT NULL DEFAULT 'PENDING',
    "externalId" TEXT,
    "errorMessage" TEXT,
    "sentAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),
    "unsubscribedAt" TIMESTAMP(3),
    "unsubscribeToken" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CampaignRecipient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadRoutingSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "strategy" "RoutingStrategy" NOT NULL DEFAULT 'ROUND_ROBIN',
    "highScoreThreshold" INTEGER NOT NULL DEFAULT 60,
    "lastAssignedUserId" TEXT,
    "excludedUserIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeadRoutingSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SocialAccount" (
    "id" TEXT NOT NULL,
    "platform" "SocialPlatform" NOT NULL,
    "accountName" TEXT NOT NULL,
    "handle" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "avatarUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SocialAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SocialPost" (
    "id" TEXT NOT NULL,
    "platform" "SocialPlatform" NOT NULL,
    "caption" TEXT NOT NULL,
    "mediaUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "SocialPostStatus" NOT NULL DEFAULT 'DRAFT',
    "scheduledAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "externalPostId" TEXT,
    "errorMessage" TEXT,
    "metrics" JSONB DEFAULT '{}',
    "accountId" TEXT,
    "packageId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SocialPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentIdea" (
    "id" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "tone" "ContentTone" NOT NULL DEFAULT 'STORYTELLING',
    "promptSeed" TEXT,
    "generatedVariants" JSONB NOT NULL,
    "hashtags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" TEXT NOT NULL DEFAULT 'IDEA',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentIdea_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SeoOffPage" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "backlinkCount" INTEGER NOT NULL DEFAULT 0,
    "referringDomains" INTEGER NOT NULL DEFAULT 0,
    "pageAuthority" INTEGER,
    "prMentions" INTEGER NOT NULL DEFAULT 0,
    "socialShares" INTEGER NOT NULL DEFAULT 0,
    "searchConsoleCtr" DOUBLE PRECISION,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SeoOffPage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaAsset" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "altText" TEXT NOT NULL DEFAULT '',
    "caption" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "pageSlug" TEXT,
    "folder" TEXT NOT NULL DEFAULT 'website',
    "uploadedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MediaAsset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Itinerary_code_key" ON "Itinerary"("code");

-- CreateIndex
CREATE INDEX "Itinerary_leadId_idx" ON "Itinerary"("leadId");

-- CreateIndex
CREATE INDEX "ItineraryOption_itineraryId_idx" ON "ItineraryOption"("itineraryId");

-- CreateIndex
CREATE INDEX "ItineraryDay_itineraryId_idx" ON "ItineraryDay"("itineraryId");

-- CreateIndex
CREATE UNIQUE INDEX "ItineraryDay_itineraryId_dayNumber_key" ON "ItineraryDay"("itineraryId", "dayNumber");

-- CreateIndex
CREATE INDEX "ItineraryItem_dayId_sortOrder_idx" ON "ItineraryItem"("dayId", "sortOrder");

-- CreateIndex
CREATE INDEX "ItineraryItemPricing_optionId_idx" ON "ItineraryItemPricing"("optionId");

-- CreateIndex
CREATE UNIQUE INDEX "ItineraryItemPricing_itemId_optionId_key" ON "ItineraryItemPricing"("itemId", "optionId");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_code_key" ON "Employee"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_userId_key" ON "Employee"("userId");

-- CreateIndex
CREATE INDEX "Employee_status_idx" ON "Employee"("status");

-- CreateIndex
CREATE INDEX "Employee_department_idx" ON "Employee"("department");

-- CreateIndex
CREATE INDEX "Employee_reportsToId_idx" ON "Employee"("reportsToId");

-- CreateIndex
CREATE INDEX "SalarySlip_periodMonth_idx" ON "SalarySlip"("periodMonth");

-- CreateIndex
CREATE UNIQUE INDEX "SalarySlip_employeeId_periodMonth_key" ON "SalarySlip"("employeeId", "periodMonth");

-- CreateIndex
CREATE INDEX "Interview_outcome_idx" ON "Interview"("outcome");

-- CreateIndex
CREATE INDEX "Interview_scheduledAt_idx" ON "Interview"("scheduledAt");

-- CreateIndex
CREATE UNIQUE INDEX "SeoSite_url_key" ON "SeoSite"("url");

-- CreateIndex
CREATE INDEX "SeoSite_isActive_idx" ON "SeoSite"("isActive");

-- CreateIndex
CREATE INDEX "SeoSearchAnalytics_siteId_date_idx" ON "SeoSearchAnalytics"("siteId", "date");

-- CreateIndex
CREATE INDEX "SeoSearchAnalytics_siteId_page_idx" ON "SeoSearchAnalytics"("siteId", "page");

-- CreateIndex
CREATE INDEX "SeoSearchAnalytics_siteId_position_idx" ON "SeoSearchAnalytics"("siteId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "SeoSearchAnalytics_natural_key" ON "SeoSearchAnalytics"("siteId", "date", "page", "query");

-- CreateIndex
CREATE INDEX "SeoSearchDimensionDaily_siteId_dimension_date_idx" ON "SeoSearchDimensionDaily"("siteId", "dimension", "date");

-- CreateIndex
CREATE UNIQUE INDEX "SeoSearchDimensionDaily_natural_key" ON "SeoSearchDimensionDaily"("siteId", "date", "dimension", "key");

-- CreateIndex
CREATE UNIQUE INDEX "SeoDomainSignals_siteId_key" ON "SeoDomainSignals"("siteId");

-- CreateIndex
CREATE INDEX "SeoAudit_siteId_createdAt_idx" ON "SeoAudit"("siteId", "createdAt");

-- CreateIndex
CREATE INDEX "SeoAudit_runId_idx" ON "SeoAudit"("runId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "Lead_status_idx" ON "Lead"("status");

-- CreateIndex
CREATE INDEX "Lead_source_idx" ON "Lead"("source");

-- CreateIndex
CREATE INDEX "Lead_phone_idx" ON "Lead"("phone");

-- CreateIndex
CREATE INDEX "Lead_assignedToId_idx" ON "Lead"("assignedToId");

-- CreateIndex
CREATE INDEX "Lead_createdAt_idx" ON "Lead"("createdAt");

-- CreateIndex
CREATE INDEX "Lead_visitId_idx" ON "Lead"("visitId");

-- CreateIndex
CREATE INDEX "Lead_externalSource_idx" ON "Lead"("externalSource");

-- CreateIndex
CREATE UNIQUE INDEX "Lead_external_natural_key" ON "Lead"("externalSource", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "LandingPage_slug_key" ON "LandingPage"("slug");

-- CreateIndex
CREATE INDEX "LandingPage_isActive_idx" ON "LandingPage"("isActive");

-- CreateIndex
CREATE INDEX "Visit_visitorId_idx" ON "Visit"("visitorId");

-- CreateIndex
CREATE INDEX "Visit_sessionId_idx" ON "Visit"("sessionId");

-- CreateIndex
CREATE INDEX "Visit_landingPageId_createdAt_idx" ON "Visit"("landingPageId", "createdAt");

-- CreateIndex
CREATE INDEX "Visit_createdAt_idx" ON "Visit"("createdAt");

-- CreateIndex
CREATE INDEX "AdSpend_spendDate_idx" ON "AdSpend"("spendDate");

-- CreateIndex
CREATE INDEX "AdSpend_channel_idx" ON "AdSpend"("channel");

-- CreateIndex
CREATE INDEX "AdSpend_landingPageId_idx" ON "AdSpend"("landingPageId");

-- CreateIndex
CREATE INDEX "AdSpend_externalSource_idx" ON "AdSpend"("externalSource");

-- CreateIndex
CREATE UNIQUE INDEX "AdSpend_natural_key" ON "AdSpend"("spendDate", "channel", "campaign", "landingPageId");

-- CreateIndex
CREATE UNIQUE INDEX "AdSpend_external_natural_key" ON "AdSpend"("externalSource", "externalId");

-- CreateIndex
CREATE INDEX "Activity_leadId_idx" ON "Activity"("leadId");

-- CreateIndex
CREATE INDEX "Activity_createdAt_idx" ON "Activity"("createdAt");

-- CreateIndex
CREATE INDEX "Vendor_type_idx" ON "Vendor"("type");

-- CreateIndex
CREATE INDEX "Vendor_city_idx" ON "Vendor"("city");

-- CreateIndex
CREATE INDEX "Vendor_isActive_idx" ON "Vendor"("isActive");

-- CreateIndex
CREATE INDEX "VendorRate_vendorId_idx" ON "VendorRate"("vendorId");

-- CreateIndex
CREATE INDEX "VendorRate_season_idx" ON "VendorRate"("season");

-- CreateIndex
CREATE INDEX "VendorRate_isActive_idx" ON "VendorRate"("isActive");

-- CreateIndex
CREATE INDEX "VendorRate_validFrom_validTo_idx" ON "VendorRate"("validFrom", "validTo");

-- CreateIndex
CREATE UNIQUE INDEX "VendorRate_natural_key" ON "VendorRate"("vendorId", "variant", "season", "mealPlan", "rateBasis", "validFrom");

-- CreateIndex
CREATE UNIQUE INDEX "Booking_bookingNumber_key" ON "Booking"("bookingNumber");

-- CreateIndex
CREATE INDEX "Booking_leadId_idx" ON "Booking"("leadId");

-- CreateIndex
CREATE INDEX "Booking_status_idx" ON "Booking"("status");

-- CreateIndex
CREATE INDEX "Booking_travelStartDate_idx" ON "Booking"("travelStartDate");

-- CreateIndex
CREATE INDEX "BookingPayment_bookingId_idx" ON "BookingPayment"("bookingId");

-- CreateIndex
CREATE INDEX "BookingPayment_receivedAt_idx" ON "BookingPayment"("receivedAt");

-- CreateIndex
CREATE INDEX "BookingCost_bookingId_idx" ON "BookingCost"("bookingId");

-- CreateIndex
CREATE INDEX "BookingCost_vendorId_idx" ON "BookingCost"("vendorId");

-- CreateIndex
CREATE INDEX "Integration_category_isActive_priority_idx" ON "Integration"("category", "isActive", "priority");

-- CreateIndex
CREATE INDEX "Integration_provider_idx" ON "Integration"("provider");

-- CreateIndex
CREATE UNIQUE INDEX "B2bPartner_phone_key" ON "B2bPartner"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_invoiceNumber_key" ON "Invoice"("invoiceNumber");

-- CreateIndex
CREATE INDEX "Attachment_entityType_entityId_idx" ON "Attachment"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "Attachment_uploadedById_idx" ON "Attachment"("uploadedById");

-- CreateIndex
CREATE INDEX "Campaign_status_idx" ON "Campaign"("status");

-- CreateIndex
CREATE INDEX "Campaign_channel_idx" ON "Campaign"("channel");

-- CreateIndex
CREATE INDEX "Campaign_createdById_idx" ON "Campaign"("createdById");

-- CreateIndex
CREATE UNIQUE INDEX "CampaignRecipient_unsubscribeToken_key" ON "CampaignRecipient"("unsubscribeToken");

-- CreateIndex
CREATE INDEX "CampaignRecipient_campaignId_status_idx" ON "CampaignRecipient"("campaignId", "status");

-- CreateIndex
CREATE INDEX "CampaignRecipient_leadId_idx" ON "CampaignRecipient"("leadId");

-- CreateIndex
CREATE INDEX "CampaignRecipient_unsubscribeToken_idx" ON "CampaignRecipient"("unsubscribeToken");

-- CreateIndex
CREATE UNIQUE INDEX "SocialAccount_platform_externalId_key" ON "SocialAccount"("platform", "externalId");

-- CreateIndex
CREATE INDEX "SocialPost_platform_status_idx" ON "SocialPost"("platform", "status");

-- CreateIndex
CREATE INDEX "SocialPost_scheduledAt_idx" ON "SocialPost"("scheduledAt");

-- CreateIndex
CREATE INDEX "SeoOffPage_siteId_idx" ON "SeoOffPage"("siteId");

-- CreateIndex
CREATE UNIQUE INDEX "SeoOffPage_siteId_url_key" ON "SeoOffPage"("siteId", "url");

-- CreateIndex
CREATE INDEX "MediaAsset_pageSlug_idx" ON "MediaAsset"("pageSlug");

-- CreateIndex
CREATE INDEX "MediaAsset_uploadedById_idx" ON "MediaAsset"("uploadedById");

-- AddForeignKey
ALTER TABLE "Itinerary" ADD CONSTRAINT "Itinerary_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Itinerary" ADD CONSTRAINT "Itinerary_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItineraryOption" ADD CONSTRAINT "ItineraryOption_itineraryId_fkey" FOREIGN KEY ("itineraryId") REFERENCES "Itinerary"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItineraryDay" ADD CONSTRAINT "ItineraryDay_itineraryId_fkey" FOREIGN KEY ("itineraryId") REFERENCES "Itinerary"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItineraryItem" ADD CONSTRAINT "ItineraryItem_dayId_fkey" FOREIGN KEY ("dayId") REFERENCES "ItineraryDay"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItineraryItem" ADD CONSTRAINT "ItineraryItem_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItineraryItemPricing" ADD CONSTRAINT "ItineraryItemPricing_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "ItineraryItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItineraryItemPricing" ADD CONSTRAINT "ItineraryItemPricing_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "ItineraryOption"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_reportsToId_fkey" FOREIGN KEY ("reportsToId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalarySlip" ADD CONSTRAINT "SalarySlip_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Interview" ADD CONSTRAINT "Interview_interviewerId_fkey" FOREIGN KEY ("interviewerId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeoSearchAnalytics" ADD CONSTRAINT "SeoSearchAnalytics_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "SeoSite"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeoSearchDimensionDaily" ADD CONSTRAINT "SeoSearchDimensionDaily_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "SeoSite"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeoDomainSignals" ADD CONSTRAINT "SeoDomainSignals_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "SeoSite"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeoAudit" ADD CONSTRAINT "SeoAudit_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "SeoSite"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_b2bPartnerId_fkey" FOREIGN KEY ("b2bPartnerId") REFERENCES "B2bPartner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "Visit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Visit" ADD CONSTRAINT "Visit_landingPageId_fkey" FOREIGN KEY ("landingPageId") REFERENCES "LandingPage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdSpend" ADD CONSTRAINT "AdSpend_landingPageId_fkey" FOREIGN KEY ("landingPageId") REFERENCES "LandingPage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorRate" ADD CONSTRAINT "VendorRate_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingPayment" ADD CONSTRAINT "BookingPayment_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingPayment" ADD CONSTRAINT "BookingPayment_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingCost" ADD CONSTRAINT "BookingCost_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "B2bPartner" ADD CONSTRAINT "B2bPartner_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceLineItem" ADD CONSTRAINT "InvoiceLineItem_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadApprovalRequest" ADD CONSTRAINT "LeadApprovalRequest_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadApprovalRequest" ADD CONSTRAINT "LeadApprovalRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadApprovalRequest" ADD CONSTRAINT "LeadApprovalRequest_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignRecipient" ADD CONSTRAINT "CampaignRecipient_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignRecipient" ADD CONSTRAINT "CampaignRecipient_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialPost" ADD CONSTRAINT "SocialPost_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "SocialAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialPost" ADD CONSTRAINT "SocialPost_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "Itinerary"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialPost" ADD CONSTRAINT "SocialPost_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeoOffPage" ADD CONSTRAINT "SeoOffPage_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "SeoSite"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaAsset" ADD CONSTRAINT "MediaAsset_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

