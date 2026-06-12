"use client";

/**
 * Tiny in-memory cache for admin console tab data. Survives tab switches within
 * a session (cleared on a full page reload), giving "stale-while-revalidate":
 * a tab you've already opened renders its last data INSTANTLY (no spinner) and
 * silently re-fetches in the background. This is what makes the console feel
 * snappy on the free tier, where the first hit of a function can cold-start.
 */
const cache = new Map<string, unknown>();

export function getAdminCache<T>(key: string): T | undefined {
  return cache.get(key) as T | undefined;
}

export function setAdminCache<T>(key: string, data: T): void {
  cache.set(key, data);
}
