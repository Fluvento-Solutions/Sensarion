-- AlterTable
ALTER TABLE "Patient" ADD COLUMN     "address" JSONB,
ADD COLUMN     "contact" JSONB,
ADD COLUMN     "gender" TEXT,
ADD COLUMN     "insurance" JSONB,
ADD COLUMN     "vitalsHistory" JSONB NOT NULL DEFAULT '[]';
