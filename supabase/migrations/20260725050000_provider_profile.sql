-- ====================================================================
-- SBOS — provider directory profile fields
-- Migration: 20260725050000_provider_profile.sql
--
-- Backs src/components/patient/ProviderSearch.tsx (Find Care & Book). Adds the
-- display fields a provider directory needs. `full_name` is denormalized so a
-- directory entry does not require a linked login account.
-- ====================================================================

ALTER TABLE public.providers
  ADD COLUMN IF NOT EXISTS full_name TEXT,
  ADD COLUMN IF NOT EXISTS rating NUMERIC(2, 1) NOT NULL DEFAULT 5.0,
  ADD COLUMN IF NOT EXISTS review_count INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS in_network BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS hospital_affiliation TEXT,
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS next_available_slot TEXT,
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS bio TEXT,
  ADD COLUMN IF NOT EXISTS education TEXT;
