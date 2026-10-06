import { hasSupabase } from "@/lib/config";
import {
  cookieOptions,
  loginLocal,
  SESSION_COOKIE,
  sessionCookieValue,
} from "@/lib/auth";
import { createSupabaseServer } from "@/lib/supabase/server";
import { cookies } from "next/headers";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    email?: string;
    password?: string;
  };
  const email = body.email?.trim() ?? "";
  const password = body.password ?? "";

  if (hasSupabase()) {
    try {
      const supabase = await createSupabaseServer();
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        return Response.json({ ok: false, error: error.message }, { status: 400 });
      }
      return Response.json({
        ok: true,
        userId: data.user?.id ?? null,
        mode: "supabase",
      });
    } catch (error) {
      return Response.json(
        {
          ok: false,
          error: error instanceof Error ? error.message : "Login failed",
        },
        { status: 400 }
      );
    }
  }

  try {
    const profile = await loginLocal(email, password);
    const jar = await cookies();
    jar.set(SESSION_COOKIE, sessionCookieValue(profile.id), cookieOptions);
    return Response.json({ ok: true, userId: profile.id, mode: "local" });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Login failed",
      },
      { status: 400 }
    );
  }
}
