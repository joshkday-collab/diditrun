export type PlanId = "free" | "solo" | "pro";
export type PingStatus = "ok" | "fail";
export type AlertType = "overdue" | "zero_count" | "meta";
export type AlertChannel = "email" | "log";
export type CheckRuntimeStatus =
  | "waiting"
  | "ok"
  | "overdue"
  | "zero"
  | "paused"
  | "fail";

export interface Profile {
  id: string;
  email: string;
  passwordHash?: string;
  plan: PlanId;
  alertEmail: string;
  createdAt: string;
}

export interface Check {
  id: string;
  userId: string;
  name: string;
  periodSeconds: number;
  graceSeconds: number;
  paused: boolean;
  lastPingAt: string | null;
  lastOkPingAt: string | null;
  lastCount: number | null;
  lastCountProvided: boolean;
  lastStatus: PingStatus | null;
  assertZero: boolean;
  isMeta: boolean;
  createdAt: string;
}

export interface Ping {
  id: string;
  checkId: string;
  receivedAt: string;
  status: PingStatus;
  count: number | null;
  countProvided: boolean;
  ip?: string;
  userAgent?: string;
}

export interface AlertRecord {
  id: string;
  checkId: string;
  userId: string;
  type: AlertType;
  sentAt: string;
  channel: AlertChannel;
  payload: Record<string, unknown>;
}

export interface BillingIntent {
  id: string;
  userId: string;
  plan: Exclude<PlanId, "free">;
  createdAt: string;
  status: "stub_pending";
}

export interface MetaState {
  checkId: string;
  lastPingAt: string | null;
  lastEvaluateAt: string | null;
  periodSeconds: number;
  graceSeconds: number;
  p0: boolean;
}

export interface RateWindow {
  checkId: string;
  hits: number[];
}

export const META_USER_ID = "00000000-0000-4000-8000-000000000001";
export const META_CHECK_NAME = "DidItRun meta-heartbeat";
export const META_PERIOD_SECONDS = 60;
export const META_GRACE_SECONDS = 30;

export const RATE_LIMIT_MAX = 30;
export const RATE_LIMIT_WINDOW_MS = 60_000;
