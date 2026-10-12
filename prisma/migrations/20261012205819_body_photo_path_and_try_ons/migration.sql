-- Rename instead of drop + add, so no data is lost. The column now holds a private
-- storage path rather than a public URL.
ALTER TABLE "users" RENAME COLUMN "bodyPhotoUrl" TO "bodyPhotoPath";

-- CreateTable
CREATE TABLE "try_ons" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "outfitId" UUID,
    "imagePath" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "try_ons_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "try_ons_userId_createdAt_idx" ON "try_ons"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "try_ons_outfitId_idx" ON "try_ons"("outfitId");

-- AddForeignKey
ALTER TABLE "try_ons" ADD CONSTRAINT "try_ons_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "try_ons" ADD CONSTRAINT "try_ons_outfitId_fkey" FOREIGN KEY ("outfitId") REFERENCES "outfits"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- The app reads this table through Prisma (which bypasses RLS). Enabling RLS with no
-- policies blocks access through Supabase's public REST API.
ALTER TABLE "try_ons" ENABLE ROW LEVEL SECURITY;
