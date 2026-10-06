import path from "node:path";

export function appUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    "http://127.0.0.1:43147"
  );
}

export function hasSupabase(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
      process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

export function dataDir(): string {
  if (process.env.DATA_DIR) return process.env.DATA_DIR;
  if (process.env.VERCEL) return "/tmp/diditrun";
  return path.join(process.cwd(), ".data");
}

export function sessionSecret(): string {
  return process.env.SESSION_SECRET || "diditrun-dev-session-secret-change-me";
}

export function cronSecret(): string | undefined {
  return process.env.CRON_SECRET;
}

export function resendFrom(): string {
  return process.env.RESEND_FROM || "DidItRun <alerts@localhost>";
}

export function isDev(): boolean {
  return process.env.NODE_ENV !== "production";
}
