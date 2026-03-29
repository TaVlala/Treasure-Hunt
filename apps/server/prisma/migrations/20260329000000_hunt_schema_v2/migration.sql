-- Migration: hunt_schema_v2
-- Adds HuntStartMode, UnlockType, ContentType enums.
-- Adds startMode to Hunt, unlockType + locationHidden to Clue.
-- Adds ClueContent and ClueAnswer tables for multi-content clues and password unlock.

-- Create new enums
CREATE TYPE "HuntStartMode" AS ENUM ('CLUE_FIRST', 'LOCATION_FIRST');
CREATE TYPE "UnlockType" AS ENUM ('GPS_PROXIMITY', 'PASSWORD', 'PHOTO');
CREATE TYPE "ContentType" AS ENUM ('TEXT', 'IMAGE');

-- Add startMode column to hunts
ALTER TABLE "hunts" ADD COLUMN "start_mode" "HuntStartMode" NOT NULL DEFAULT 'LOCATION_FIRST';

-- Add unlockType and locationHidden to clues
ALTER TABLE "clues" ADD COLUMN "unlock_type" "UnlockType" NOT NULL DEFAULT 'GPS_PROXIMITY';
ALTER TABLE "clues" ADD COLUMN "location_hidden" BOOLEAN NOT NULL DEFAULT false;

-- Create clue_contents table
CREATE TABLE "clue_contents" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "clue_id" UUID NOT NULL,
    "type" "ContentType" NOT NULL,
    "content" TEXT,
    "image_url" VARCHAR(500),
    "is_hint" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clue_contents_pkey" PRIMARY KEY ("id")
);

-- Create clue_answers table
CREATE TABLE "clue_answers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "clue_id" UUID NOT NULL,
    "answer" VARCHAR(200) NOT NULL,

    CONSTRAINT "clue_answers_pkey" PRIMARY KEY ("id")
);

-- Add foreign key constraints
ALTER TABLE "clue_contents" ADD CONSTRAINT "clue_contents_clue_id_fkey"
    FOREIGN KEY ("clue_id") REFERENCES "clues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "clue_answers" ADD CONSTRAINT "clue_answers_clue_id_fkey"
    FOREIGN KEY ("clue_id") REFERENCES "clues"("id") ON DELETE CASCADE ON UPDATE CASCADE;
