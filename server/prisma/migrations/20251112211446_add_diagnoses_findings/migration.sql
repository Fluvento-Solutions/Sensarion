-- AlterTable
ALTER TABLE "Patient" ADD COLUMN     "diagnoses" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "findings" JSONB NOT NULL DEFAULT '[]';
