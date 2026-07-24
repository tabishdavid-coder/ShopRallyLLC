-- Baseline: maintenance program domain (was previously db-push only).
-- Later migrations add cannedJobId, pageTemplate, service-visit audit, gatekeeper fields.

CREATE TYPE "MaintenancePlanScope" AS ENUM ('PER_VEHICLE', 'PER_HOUSEHOLD', 'PER_CUSTOMER');
CREATE TYPE "MaintenancePlanArchetype" AS ENUM ('BUNDLE', 'MONTHLY_CLUB', 'HOUSEHOLD', 'UNLIMITED_TIER');
CREATE TYPE "EntitlementKind" AS ENUM ('COUNTED', 'UNLIMITED', 'INTERVAL', 'EVERY_VISIT', 'DISCOUNT', 'CREDIT', 'COUPON', 'ACCESS');
CREATE TYPE "PlanSubscriptionStatus" AS ENUM ('PENDING', 'ACTIVE', 'PAST_DUE', 'PAUSED', 'CANCELLED', 'EXPIRED');
CREATE TYPE "SubscriptionPaymentMode" AS ENUM ('PAY_IN_FULL', 'MONTHLY', 'ANNUAL', 'SEMI_ANNUAL', 'MANUAL');
CREATE TYPE "MaintenanceVehicleClass" AS ENUM ('CAR', 'SUV_TRUCK', 'HEAVY_DUTY', 'EV', 'LUXURY', 'OTHER');
CREATE TYPE "ProgramServiceType" AS ENUM ('VISITS', 'UNLIMITED', 'SCHEDULED', 'EVERY_VISIT', 'DISCOUNT', 'CREDIT');

CREATE TABLE "MaintenanceProgramSettings" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "plansSlug" TEXT,
    "heroTitle" TEXT,
    "heroSubtitle" TEXT,
    "termsDefault" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MaintenanceProgramSettings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MaintenanceProgramSettings_shopId_key" ON "MaintenanceProgramSettings"("shopId");
CREATE UNIQUE INDEX "MaintenanceProgramSettings_plansSlug_key" ON "MaintenanceProgramSettings"("plansSlug");
ALTER TABLE "MaintenanceProgramSettings" ADD CONSTRAINT "MaintenanceProgramSettings_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "MaintenanceProgramService" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "serviceType" "ProgramServiceType" NOT NULL DEFAULT 'VISITS',
    "defaultQuantity" INTEGER,
    "defaultIntervalDays" INTEGER,
    "defaultDiscountBps" INTEGER,
    "unitCostCents" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MaintenanceProgramService_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MaintenanceProgramService_shopId_active_idx" ON "MaintenanceProgramService"("shopId", "active");
CREATE INDEX "MaintenanceProgramService_shopId_sortOrder_idx" ON "MaintenanceProgramService"("shopId", "sortOrder");
ALTER TABLE "MaintenanceProgramService" ADD CONSTRAINT "MaintenanceProgramService_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "MaintenancePlan" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tagline" TEXT,
    "description" TEXT,
    "idealFor" TEXT,
    "archetype" "MaintenancePlanArchetype" NOT NULL DEFAULT 'BUNDLE',
    "scope" "MaintenancePlanScope" NOT NULL DEFAULT 'PER_VEHICLE',
    "maxVehicles" INTEGER,
    "termMonths" INTEGER NOT NULL DEFAULT 12,
    "autoRenew" BOOLEAN NOT NULL DEFAULT true,
    "allowRollover" BOOLEAN NOT NULL DEFAULT false,
    "transferable" BOOLEAN NOT NULL DEFAULT false,
    "useClassPricing" BOOLEAN NOT NULL DEFAULT false,
    "retailCents" INTEGER,
    "payInFullCents" INTEGER,
    "monthlyCents" INTEGER,
    "monthlyTermMonths" INTEGER,
    "annualCents" INTEGER,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "terms" TEXT,
    "rules" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MaintenancePlan_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MaintenancePlan_shopId_active_idx" ON "MaintenancePlan"("shopId", "active");
CREATE INDEX "MaintenancePlan_shopId_sortOrder_idx" ON "MaintenancePlan"("shopId", "sortOrder");
ALTER TABLE "MaintenancePlan" ADD CONSTRAINT "MaintenancePlan_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "PlanEntitlement" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "programServiceId" TEXT,
    "kind" "EntitlementKind" NOT NULL,
    "label" TEXT NOT NULL,
    "quantity" INTEGER,
    "intervalDays" INTEGER,
    "discountBps" INTEGER,
    "discountCapCents" INTEGER,
    "creditCents" INTEGER,
    "cannedJobId" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "PlanEntitlement_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PlanEntitlement_planId_idx" ON "PlanEntitlement"("planId");
CREATE INDEX "PlanEntitlement_shopId_idx" ON "PlanEntitlement"("shopId");
CREATE INDEX "PlanEntitlement_programServiceId_idx" ON "PlanEntitlement"("programServiceId");
ALTER TABLE "PlanEntitlement" ADD CONSTRAINT "PlanEntitlement_planId_fkey" FOREIGN KEY ("planId") REFERENCES "MaintenancePlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PlanEntitlement" ADD CONSTRAINT "PlanEntitlement_programServiceId_fkey" FOREIGN KEY ("programServiceId") REFERENCES "MaintenanceProgramService"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "PlanVehicleClassPrice" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "vehicleClass" "MaintenanceVehicleClass" NOT NULL,
    "payInFullCents" INTEGER,
    "monthlyCents" INTEGER,
    "annualCents" INTEGER,
    "surchargeCents" INTEGER,
    CONSTRAINT "PlanVehicleClassPrice_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PlanVehicleClassPrice_planId_vehicleClass_key" ON "PlanVehicleClassPrice"("planId", "vehicleClass");
CREATE INDEX "PlanVehicleClassPrice_shopId_idx" ON "PlanVehicleClassPrice"("shopId");
ALTER TABLE "PlanVehicleClassPrice" ADD CONSTRAINT "PlanVehicleClassPrice_planId_fkey" FOREIGN KEY ("planId") REFERENCES "MaintenancePlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "PlanSubscription" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "status" "PlanSubscriptionStatus" NOT NULL DEFAULT 'PENDING',
    "paymentMode" "SubscriptionPaymentMode" NOT NULL,
    "vehicleClass" "MaintenanceVehicleClass",
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "autoRenew" BOOLEAN NOT NULL DEFAULT true,
    "stripeSubscriptionId" TEXT,
    "stripePaymentIntentId" TEXT,
    "memberPortalToken" TEXT NOT NULL,
    "enrolledByUserId" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PlanSubscription_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PlanSubscription_memberPortalToken_key" ON "PlanSubscription"("memberPortalToken");
CREATE INDEX "PlanSubscription_shopId_status_idx" ON "PlanSubscription"("shopId", "status");
CREATE INDEX "PlanSubscription_customerId_idx" ON "PlanSubscription"("customerId");
CREATE INDEX "PlanSubscription_planId_idx" ON "PlanSubscription"("planId");
ALTER TABLE "PlanSubscription" ADD CONSTRAINT "PlanSubscription_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PlanSubscription" ADD CONSTRAINT "PlanSubscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "MaintenancePlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PlanSubscription" ADD CONSTRAINT "PlanSubscription_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "SubscriptionVehicle" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    CONSTRAINT "SubscriptionVehicle_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SubscriptionVehicle_subscriptionId_vehicleId_key" ON "SubscriptionVehicle"("subscriptionId", "vehicleId");
CREATE INDEX "SubscriptionVehicle_shopId_idx" ON "SubscriptionVehicle"("shopId");
ALTER TABLE "SubscriptionVehicle" ADD CONSTRAINT "SubscriptionVehicle_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "PlanSubscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SubscriptionVehicle" ADD CONSTRAINT "SubscriptionVehicle_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "SubscriptionEntitlement" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "planEntitlementId" TEXT NOT NULL,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "remainingCount" INTEGER,
    "creditBalanceCents" INTEGER,
    "nextEligibleAt" TIMESTAMP(3),
    CONSTRAINT "SubscriptionEntitlement_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SubscriptionEntitlement_subscriptionId_planEntitlementId_key" ON "SubscriptionEntitlement"("subscriptionId", "planEntitlementId");
CREATE INDEX "SubscriptionEntitlement_shopId_idx" ON "SubscriptionEntitlement"("shopId");
ALTER TABLE "SubscriptionEntitlement" ADD CONSTRAINT "SubscriptionEntitlement_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "PlanSubscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "PlanRedemption" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "repairOrderId" TEXT,
    "vehicleId" TEXT,
    "mileageIn" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PlanRedemption_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PlanRedemption_shopId_subscriptionId_idx" ON "PlanRedemption"("shopId", "subscriptionId");
CREATE INDEX "PlanRedemption_repairOrderId_idx" ON "PlanRedemption"("repairOrderId");
ALTER TABLE "PlanRedemption" ADD CONSTRAINT "PlanRedemption_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "PlanSubscription"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PlanRedemption" ADD CONSTRAINT "PlanRedemption_repairOrderId_fkey" FOREIGN KEY ("repairOrderId") REFERENCES "RepairOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "RedeemedEntitlement" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "redemptionId" TEXT NOT NULL,
    "subscriptionEntitlementId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT "RedeemedEntitlement_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "RedeemedEntitlement_redemptionId_idx" ON "RedeemedEntitlement"("redemptionId");
CREATE INDEX "RedeemedEntitlement_subscriptionEntitlementId_idx" ON "RedeemedEntitlement"("subscriptionEntitlementId");
CREATE INDEX "RedeemedEntitlement_shopId_idx" ON "RedeemedEntitlement"("shopId");
ALTER TABLE "RedeemedEntitlement" ADD CONSTRAINT "RedeemedEntitlement_redemptionId_fkey" FOREIGN KEY ("redemptionId") REFERENCES "PlanRedemption"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RedeemedEntitlement" ADD CONSTRAINT "RedeemedEntitlement_subscriptionEntitlementId_fkey" FOREIGN KEY ("subscriptionEntitlementId") REFERENCES "SubscriptionEntitlement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "SubscriptionPayment" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "stripePaymentId" TEXT,
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "periodStart" TIMESTAMP(3),
    "periodEnd" TIMESTAMP(3),
    CONSTRAINT "SubscriptionPayment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SubscriptionPayment_subscriptionId_idx" ON "SubscriptionPayment"("subscriptionId");
CREATE INDEX "SubscriptionPayment_shopId_idx" ON "SubscriptionPayment"("shopId");
ALTER TABLE "SubscriptionPayment" ADD CONSTRAINT "SubscriptionPayment_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "PlanSubscription"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
