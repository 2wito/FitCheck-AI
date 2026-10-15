-- CreateTable
CREATE TABLE "outfit_plans" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "outfitId" UUID NOT NULL,
    "date" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "outfit_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outfit_wears" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "outfitId" UUID,
    "clothingItemId" UUID NOT NULL,
    "wornAt" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "outfit_wears_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "outfit_plans_outfitId_idx" ON "outfit_plans"("outfitId");

-- CreateIndex
CREATE UNIQUE INDEX "outfit_plans_userId_date_key" ON "outfit_plans"("userId", "date");

-- CreateIndex
CREATE INDEX "outfit_wears_userId_wornAt_idx" ON "outfit_wears"("userId", "wornAt");

-- CreateIndex
CREATE INDEX "outfit_wears_outfitId_idx" ON "outfit_wears"("outfitId");

-- CreateIndex
CREATE UNIQUE INDEX "outfit_wears_userId_clothingItemId_wornAt_key" ON "outfit_wears"("userId", "clothingItemId", "wornAt");

-- AddForeignKey
ALTER TABLE "outfit_plans" ADD CONSTRAINT "outfit_plans_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outfit_plans" ADD CONSTRAINT "outfit_plans_outfitId_fkey" FOREIGN KEY ("outfitId") REFERENCES "outfits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outfit_wears" ADD CONSTRAINT "outfit_wears_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outfit_wears" ADD CONSTRAINT "outfit_wears_outfitId_fkey" FOREIGN KEY ("outfitId") REFERENCES "outfits"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outfit_wears" ADD CONSTRAINT "outfit_wears_clothingItemId_fkey" FOREIGN KEY ("clothingItemId") REFERENCES "clothing_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Accessed only through Prisma (bypasses RLS); block the public REST API.
ALTER TABLE "outfit_plans" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "outfit_wears" ENABLE ROW LEVEL SECURITY;
