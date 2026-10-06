import type {
  AlertRecord,
  AlertType,
  BillingIntent,
  Check,
  MetaState,
  Ping,
  PingStatus,
  PlanId,
  Profile,
} from "@/lib/types";

export type StoreKind = "file" | "supabase";

export interface CreateCheckInput {
  userId: string;
  name: string;
  periodSeconds: number;
  graceSeconds: number;
  assertZero: boolean;
}

export interface RecordPingInput {
  checkId: string;
  status: PingStatus;
  count: number | null;
  countProvided: boolean;
  ip?: string;
  userAgent?: string;
}

export interface Store {
  kind: StoreKind;
  ensureReady(): Promise<void>;
  getProfile(id: string): Promise<Profile | null>;
  getProfileByEmail(email: string): Promise<Profile | null>;
  createProfile(input: {
    id?: string;
    email: string;
    passwordHash?: string;
    plan?: PlanId;
  }): Promise<Profile>;
  updateProfile(
    id: string,
    patch: Partial<Pick<Profile, "alertEmail" | "plan">>
  ): Promise<Profile | null>;
  countUserChecks(userId: string): Promise<number>;
  listChecks(userId: string): Promise<Check[]>;
  getCheck(id: string): Promise<Check | null>;
  createCheck(input: CreateCheckInput): Promise<Check>;
  updateCheck(
    id: string,
    patch: Partial<
      Pick<
        Check,
        | "name"
        | "periodSeconds"
        | "graceSeconds"
        | "paused"
        | "assertZero"
        | "lastPingAt"
        | "lastOkPingAt"
        | "lastCount"
        | "lastCountProvided"
        | "lastStatus"
      >
    >
  ): Promise<Check | null>;
  deleteCheck(id: string, userId: string): Promise<boolean>;
  recordPing(input: RecordPingInput): Promise<{ ping: Ping; check: Check }>;
  listPings(checkId: string, limit?: number): Promise<Ping[]>;
  listAlerts(userId: string, limit?: number): Promise<AlertRecord[]>;
  listCheckAlerts(checkId: string, limit?: number): Promise<AlertRecord[]>;
  hasOpenOverdue(checkId: string): Promise<boolean>;
  recordAlert(input: {
    checkId: string;
    userId: string;
    type: AlertType;
    channel: AlertRecord["channel"];
    payload: Record<string, unknown>;
  }): Promise<AlertRecord>;
  listDueChecks(now: Date): Promise<Check[]>;
  consumeRateLimit(checkId: string): Promise<{
    allowed: boolean;
    remaining: number;
    retryAfterSeconds: number;
  }>;
  getMeta(): Promise<MetaState>;
  touchMeta(now: Date): Promise<MetaState>;
  silenceMeta(iso: string): Promise<MetaState>;
  createBillingIntent(
    userId: string,
    plan: Exclude<PlanId, "free">
  ): Promise<BillingIntent>;
  listBillingIntents(userId: string): Promise<BillingIntent[]>;
}
