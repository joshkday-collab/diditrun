import { cookies } from "next/headers";
import { hasSupabase } from "@/lib/config";
import { hashPassword, isLikelyEmail, signSession, verifyPassword, verifySession } from "@/lib/crypto";
import { readyStore } from "@/lib/store";
import { createSupabaseServer } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

export const SESSION_COOKIE = "diditrun_session";

export async function getSessionUser(): Promise<Profile | null> {
  const store = await readyStore();
  if (hasSupabase()) {
    try {
      const supabase = await createSupabaseServer();
      const { data } = await supabase.auth.getUser();
      if (!data.user) return null;
      const existing = await store.getProfile(data.user.id);
      if (existing) return existing;
      if (data.user.email) {
        return store.createProfile({
          id: data.user.id,
          email: data.user.email,
        });
      }
      return null;
    } catch {
      // Fall through to the local cookie if Supabase auth is misconfigured.
    }
  }
  const jar = await cookies();
  const userId = verifySession(jar.get(SESSION_COOKIE)?.value);
  if (!userId) return null;
  return store.getProfile(userId);
}

export async function requireUser(): Promise<Profile> {
  const user = await getSessionUser();
  if (!user) {
    throw new Error("unauthenticated");
  }
  return user;
}

export async function signupLocal(email: string, password: string): Promise<Profile> {
  if (!isLikelyEmail(email)) throw new Error("Enter a valid email.");
  if (password.length < 8) throw new Error("Password must be at least 8 characters.");
  const store = await readyStore();
  const existing = await store.getProfileByEmail(email);
  if (existing) throw new Error("An account with that email already exists.");
  return store.createProfile({
    email,
    passwordHash: await hashPassword(password),
  });
}

export async function loginLocal(email: string, password: string): Promise<Profile> {
  const store = await readyStore();
  const profile = await store.getProfileByEmail(email);
  if (!profile?.passwordHash) throw new Error("Unknown email or password.");
  const ok = await verifyPassword(password, profile.passwordHash);
  if (!ok) throw new Error("Unknown email or password.");
  return profile;
}

export function sessionCookieValue(userId: string): string {
  return signSession(userId);
}

export const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 24 * 30,
  secure: process.env.NODE_ENV === "production",
};
