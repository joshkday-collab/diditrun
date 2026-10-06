import { hasSupabase } from "@/lib/config";
import { SESSION_COOKIE } from "@/lib/auth";
import { createSupabaseServer } from "@/lib/supabase/server";
import { cookies } from "next/headers";

export async function POST() {
  if (hasSupabase()) {
    try {
      const supabase = await createSupabaseServer();
      await supabase.auth.signOut();
    } catch {
      // Local cookie still cleared below.
    }
  }
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
  return Response.json({ ok: true });
}
