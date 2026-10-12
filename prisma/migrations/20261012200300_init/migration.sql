-- CreateEnum
CREATE TYPE "Category" AS ENUM ('TOPS', 'BOTTOMS', 'SHOES', 'OUTERWEAR', 'ACCESSORIES');

-- CreateEnum
CREATE TYPE "Season" AS ENUM ('SUMMER', 'WINTER', 'SPRING', 'AUTUMN', 'ALL_WEATHER');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "avatarUrl" TEXT,
    "bodyPhotoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clothing_items" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "category" "Category" NOT NULL,
    "color" TEXT,
    "secondaryColor" TEXT,
    "season" "Season" NOT NULL DEFAULT 'ALL_WEATHER',
    "style" TEXT,
    "imageUrl" TEXT NOT NULL,
    "bgRemovedUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clothing_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outfits" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "occasion" TEXT,
    "isFavorite" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "outfits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outfit_items" (
    "id" UUID NOT NULL,
    "outfitId" UUID NOT NULL,
    "clothingItemId" UUID NOT NULL,
    "positionX" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "positionY" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "scale" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "zIndex" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "outfit_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "clothing_items_userId_category_idx" ON "clothing_items"("userId", "category");

-- CreateIndex
CREATE INDEX "outfits_userId_isFavorite_idx" ON "outfits"("userId", "isFavorite");

-- CreateIndex
CREATE INDEX "outfit_items_clothingItemId_idx" ON "outfit_items"("clothingItemId");

-- CreateIndex
CREATE UNIQUE INDEX "outfit_items_outfitId_clothingItemId_key" ON "outfit_items"("outfitId", "clothingItemId");

-- AddForeignKey
ALTER TABLE "clothing_items" ADD CONSTRAINT "clothing_items_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outfits" ADD CONSTRAINT "outfits_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outfit_items" ADD CONSTRAINT "outfit_items_outfitId_fkey" FOREIGN KEY ("outfitId") REFERENCES "outfits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outfit_items" ADD CONSTRAINT "outfit_items_clothingItemId_fkey" FOREIGN KEY ("clothingItemId") REFERENCES "clothing_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
