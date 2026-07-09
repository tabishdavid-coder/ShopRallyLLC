-- Platform subscription billing fields on Shop
ALTER TABLE "Shop" ADD COLUMN "stripeCustomerId" TEXT;
ALTER TABLE "Shop" ADD COLUMN "stripeSubscriptionId" TEXT;
ALTER TABLE "Shop" ADD COLUMN "lastActiveAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "Shop_stripeCustomerId_key" ON "Shop"("stripeCustomerId");
CREATE UNIQUE INDEX "Shop_stripeSubscriptionId_key" ON "Shop"("stripeSubscriptionId");

-- Support ticket status enum
CREATE TYPE "SupportTicketStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');

-- Global FAQ library
CREATE TABLE "FaqArticle" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FaqArticle_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FaqArticle_slug_key" ON "FaqArticle"("slug");
CREATE INDEX "FaqArticle_category_sortOrder_idx" ON "FaqArticle"("category", "sortOrder");
CREATE INDEX "FaqArticle_published_idx" ON "FaqArticle"("published");

-- Support tickets
CREATE TABLE "SupportTicket" (
    "id" TEXT NOT NULL,
    "shopId" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" "SupportTicketStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupportTicket_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SupportTicket_shopId_idx" ON "SupportTicket"("shopId");
CREATE INDEX "SupportTicket_status_idx" ON "SupportTicket"("status");
CREATE INDEX "SupportTicket_createdAt_idx" ON "SupportTicket"("createdAt");

ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE SET NULL ON UPDATE CASCADE;
