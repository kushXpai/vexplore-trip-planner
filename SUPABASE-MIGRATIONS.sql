-- ============================================
-- MIGRATIONS FOR NEW FEATURES
-- Run these in Supabase SQL Editor
-- ============================================

-- 1. Add profit_mode to trips table
--    Stores whether the admin charge was entered as 'flat' total, 'per_person', or 'percentage'
ALTER TABLE public.trips
  ADD COLUMN IF NOT EXISTS profit_mode TEXT NOT NULL DEFAULT 'flat'
  CHECK (profit_mode IN ('flat', 'percentage', 'per_person'));

-- 2. Add cost_type to trip_activities table
--    'per_person' = costs multiplied by participant count (existing behavior)
--    'lump_sum'   = costs are a flat total, NOT multiplied by participants
ALTER TABLE public.trip_activities
  ADD COLUMN IF NOT EXISTS cost_type TEXT NOT NULL DEFAULT 'per_person'
  CHECK (cost_type IN ('per_person', 'lump_sum'));

-- ============================================
-- VERIFICATION QUERIES
-- Run after migrations to confirm columns exist
-- ============================================

-- Check trips table has profit_mode
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'trips' AND column_name = 'profit_mode';

-- Check trip_activities table has cost_type
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'trip_activities' AND column_name = 'cost_type';
