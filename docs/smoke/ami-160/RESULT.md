# AMI-160 smoke result

**Branch:** `feat/ami-160-paywall-entitlement`  
**Date:** 2026-11-02

| Check | Result | Notes |
| --- | --- | --- |
| Unit: tab entitlement + RC fallback | **PASS** | `node --test` on tab-entitlement, refresh-entitlement-fallback, cold-start-route |
| Typecheck | **PASS** | `pnpm typecheck` |
| Manual Expo Go entitled cold start | **PENDING** | Amit / day-test device |

**Code paths:** `(tabs)/_layout` uses `resolveEffectiveEntitlementStatus` (me cache + Zustand); `use-purchases` fallback maps unentitled → `none`.
