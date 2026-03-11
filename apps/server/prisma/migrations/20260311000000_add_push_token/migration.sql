-- Add push_token column to users table for Expo Push Notifications.
-- Nullable — not all users will have a registered device token.
ALTER TABLE "users" ADD COLUMN "push_token" VARCHAR(500);
