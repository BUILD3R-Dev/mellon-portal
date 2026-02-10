/**
 * Feature flags database query helpers
 *
 * Contains reusable query functions for per-tenant feature flag operations
 * including lookups, listings, and upserts.
 */

import { db, featureFlags } from '@/lib/db';
import { eq, and } from 'drizzle-orm';

/**
 * Checks if a specific feature flag is enabled for a tenant
 *
 * @param tenantId - The tenant ID
 * @param featureKey - The feature key to check
 * @returns true if the flag exists and is enabled, false otherwise
 */
export async function isFeatureEnabled(
  tenantId: string,
  featureKey: string
): Promise<boolean> {
  const result = await db
    .select({ enabled: featureFlags.enabled })
    .from(featureFlags)
    .where(
      and(
        eq(featureFlags.tenantId, tenantId),
        eq(featureFlags.featureKey, featureKey)
      )
    )
    .limit(1);

  return result[0]?.enabled ?? false;
}

/**
 * Gets all feature flags for a tenant
 *
 * @param tenantId - The tenant ID
 * @returns Array of feature flag key/enabled pairs
 */
export async function getFeatureFlagsForTenant(
  tenantId: string
): Promise<Array<{ featureKey: string; enabled: boolean }>> {
  const result = await db
    .select({
      featureKey: featureFlags.featureKey,
      enabled: featureFlags.enabled,
    })
    .from(featureFlags)
    .where(eq(featureFlags.tenantId, tenantId));

  return result;
}

/**
 * Creates or updates a feature flag for a tenant (upsert)
 *
 * Uses Drizzle's onConflictDoUpdate on the (tenantId, featureKey) unique index
 * to insert a new flag or update an existing one.
 *
 * @param tenantId - The tenant ID
 * @param featureKey - The feature key
 * @param enabled - Whether the feature is enabled
 */
export async function setFeatureFlag(
  tenantId: string,
  featureKey: string,
  enabled: boolean
): Promise<void> {
  await db
    .insert(featureFlags)
    .values({
      tenantId,
      featureKey,
      enabled,
    })
    .onConflictDoUpdate({
      target: [featureFlags.tenantId, featureFlags.featureKey],
      set: {
        enabled,
        updatedAt: new Date(),
      },
    });
}
