-- ====================================================================
-- SBOS — claims lifecycle: payment posting + denials
-- Migration: 20260725080000_claims_lifecycle.sql
--
-- Extends claims for revenue-cycle management: record the posted payment amount
-- and timestamp, and capture a denial reason. Status transitions (submitted ->
-- in_review -> adjudicated -> approved/denied -> paid) use the existing status
-- column; these fields carry the financial + denial detail.
-- ====================================================================

ALTER TABLE public.claims
  ADD COLUMN IF NOT EXISTS paid_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS denial_reason TEXT;
