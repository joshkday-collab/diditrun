import { hasSupabase } from "@/lib/config";
import { createFileStore } from "@/lib/store/file-store";
import { createSupabaseStore } from "@/lib/store/supabase-store";
import type { Store } from "@/lib/store/types";

let cached: Store | null = null;

export function getStore(): Store {
  if (cached) return cached;
  cached = hasSupabase() ? createSupabaseStore() : createFileStore();
  return cached;
}

export async function readyStore(): Promise<Store> {
  const store = getStore();
  await store.ensureReady();
  return store;
}
