import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { dataDir } from "@/lib/config";
import { checkLimit } from "@/lib/plans";
import { isOverdue } from "@/lib/stale";
import {
  META_CHECK_NAME,
  META_GRACE_SECONDS,
  META_PERIOD_SECONDS,
  META_USER_ID,
  RATE_LIMIT_MAX,
  RATE_LIMIT_WINDOW_MS,
  type AlertRecord,
  type BillingIntent,
  type Check,
  type MetaState,
  type Ping,
  type PlanId,
  type Profile,
} from "@/lib/types";
import { newUuidV4 } from "@/lib/uuid";
import type { CreateCheckInput, RecordPingInput, Store } from "@/lib/store/types";

interface FileDb {
  profiles: Profile[];
  checks: Check[];
  pings: Ping[];
  alerts: AlertRecord[];
  billing: BillingIntent[];
  rate: Record<string, number[]>;
  meta: MetaState;
}

function emptyDb(): FileDb {
  const checkId = newUuidV4();
  return {
    profiles: [
      {
        id: META_USER_ID,
        email: "meta@diditrun.internal",
        plan: "pro",
        alertEmail: "jdenquiryautopilot@gmail.com",
        createdAt: new Date().toISOString(),
      },
    ],
    checks: [
      {
        id: checkId,
        userId: META_USER_ID,
        name: META_CHECK_NAME,
        periodSeconds: META_PERIOD_SECONDS,
        graceSeconds: META_GRACE_SECONDS,
        paused: false,
        lastPingAt: null,
        lastOkPingAt: null,
        lastCount: null,
        lastCountProvided: false,
        lastStatus: null,
        assertZero: false,
        isMeta: true,
        createdAt: new Date().toISOString(),
      },
    ],
    pings: [],
    alerts: [],
    billing: [],
    rate: {},
    meta: {
      checkId,
      lastPingAt: null,
      lastEvaluateAt: null,
      periodSeconds: META_PERIOD_SECONDS,
      graceSeconds: META_GRACE_SECONDS,
      p0: false,
    },
  };
}

let queue: Promise<unknown> = Promise.resolve();

function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(fn, fn);
  queue = run.then(
    () => undefined,
    () => undefined
  );
  return run;
}

function filePath(): string {
  return path.join(dataDir(), "store.json");
}

async function load(): Promise<FileDb> {
  await mkdir(dataDir(), { recursive: true });
  try {
    const raw = await readFile(filePath(), "utf8");
    return JSON.parse(raw) as FileDb;
  } catch {
    const db = emptyDb();
    await writeFile(filePath(), JSON.stringify(db, null, 2));
    return db;
  }
}

async function save(db: FileDb): Promise<void> {
  await mkdir(dataDir(), { recursive: true });
  await writeFile(filePath(), JSON.stringify(db, null, 2));
}

export function createFileStore(): Store {
  return {
    kind: "file",

    async ensureReady() {
      await withLock(async () => {
        await load();
      });
    },

    async getProfile(id) {
      const db = await load();
      return db.profiles.find((p) => p.id === id) ?? null;
    },

    async getProfileByEmail(email) {
      const db = await load();
      const needle = email.trim().toLowerCase();
      return db.profiles.find((p) => p.email === needle) ?? null;
    },

    async createProfile(input) {
      return withLock(async () => {
        const db = await load();
        const email = input.email.trim().toLowerCase();
        if (db.profiles.some((p) => p.email === email)) {
          throw new Error("An account with that email already exists.");
        }
        const profile: Profile = {
          id: input.id ?? newUuidV4(),
          email,
          passwordHash: input.passwordHash,
          plan: input.plan ?? "free",
          alertEmail: email,
          createdAt: new Date().toISOString(),
        };
        db.profiles.push(profile);
        await save(db);
        return profile;
      });
    },

    async updateProfile(id, patch) {
      return withLock(async () => {
        const db = await load();
        const profile = db.profiles.find((p) => p.id === id);
        if (!profile) return null;
        Object.assign(profile, patch);
        await save(db);
        return profile;
      });
    },

    async countUserChecks(userId) {
      const db = await load();
      return db.checks.filter((c) => c.userId === userId && !c.isMeta).length;
    },

    async listChecks(userId) {
      const db = await load();
      return db.checks
        .filter((c) => c.userId === userId && !c.isMeta)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    },

    async getCheck(id) {
      const db = await load();
      return db.checks.find((c) => c.id === id) ?? null;
    },

    async createCheck(input: CreateCheckInput) {
      return withLock(async () => {
        const db = await load();
        const profile = db.profiles.find((p) => p.id === input.userId);
        if (!profile) throw new Error("Unknown user.");
        const used = db.checks.filter(
          (c) => c.userId === input.userId && !c.isMeta
        ).length;
        if (used >= checkLimit(profile.plan)) {
          throw new Error(
            `Plan limit reached (${checkLimit(profile.plan)} checks on ${profile.plan}).`
          );
        }
        const check: Check = {
          id: newUuidV4(),
          userId: input.userId,
          name: input.name.trim() || "Untitled check",
          periodSeconds: input.periodSeconds,
          graceSeconds: input.graceSeconds,
          paused: false,
          lastPingAt: null,
          lastOkPingAt: null,
          lastCount: null,
          lastCountProvided: false,
          lastStatus: null,
          assertZero: input.assertZero,
          isMeta: false,
          createdAt: new Date().toISOString(),
        };
        db.checks.push(check);
        await save(db);
        return check;
      });
    },

    async updateCheck(id, patch) {
      return withLock(async () => {
        const db = await load();
        const check = db.checks.find((c) => c.id === id);
        if (!check) return null;
        Object.assign(check, patch);
        await save(db);
        return check;
      });
    },

    async deleteCheck(id, userId) {
      return withLock(async () => {
        const db = await load();
        const idx = db.checks.findIndex(
          (c) => c.id === id && c.userId === userId && !c.isMeta
        );
        if (idx === -1) return false;
        db.checks.splice(idx, 1);
        db.pings = db.pings.filter((p) => p.checkId !== id);
        db.alerts = db.alerts.filter((a) => a.checkId !== id);
        await save(db);
        return true;
      });
    },

    async recordPing(input: RecordPingInput) {
      return withLock(async () => {
        const db = await load();
        const check = db.checks.find((c) => c.id === input.checkId);
        if (!check) throw new Error("not_found");
        const now = new Date().toISOString();
        const ping: Ping = {
          id: newUuidV4(),
          checkId: check.id,
          receivedAt: now,
          status: input.status,
          count: input.count,
          countProvided: input.countProvided,
          ip: input.ip,
          userAgent: input.userAgent,
        };
        db.pings.push(ping);
        check.lastPingAt = now;
        check.lastStatus = input.status;
        check.lastCount = input.count;
        check.lastCountProvided = input.countProvided;
        if (input.status === "ok") check.lastOkPingAt = now;
        await save(db);
        return { ping, check: { ...check } };
      });
    },

    async listPings(checkId, limit = 40) {
      const db = await load();
      return db.pings
        .filter((p) => p.checkId === checkId)
        .sort((a, b) => b.receivedAt.localeCompare(a.receivedAt))
        .slice(0, limit);
    },

    async listAlerts(userId, limit = 40) {
      const db = await load();
      return db.alerts
        .filter((a) => a.userId === userId)
        .sort((a, b) => b.sentAt.localeCompare(a.sentAt))
        .slice(0, limit);
    },

    async listCheckAlerts(checkId, limit = 40) {
      const db = await load();
      return db.alerts
        .filter((a) => a.checkId === checkId)
        .sort((a, b) => b.sentAt.localeCompare(a.sentAt))
        .slice(0, limit);
    },

    async hasOpenOverdue(checkId) {
      const db = await load();
      const check = db.checks.find((c) => c.id === checkId);
      if (!check) return false;
      const lastOk = check.lastOkPingAt;
      return db.alerts.some(
        (a) =>
          a.checkId === checkId &&
          a.type === "overdue" &&
          (!lastOk || a.sentAt > lastOk)
      );
    },

    async recordAlert(input) {
      return withLock(async () => {
        const db = await load();
        const alert: AlertRecord = {
          id: newUuidV4(),
          checkId: input.checkId,
          userId: input.userId,
          type: input.type,
          sentAt: new Date().toISOString(),
          channel: input.channel,
          payload: input.payload,
        };
        db.alerts.push(alert);
        await save(db);
        return alert;
      });
    },

    async listDueChecks(now) {
      const db = await load();
      return db.checks.filter(
        (c) =>
          !c.isMeta &&
          isOverdue({
            paused: c.paused,
            periodSeconds: c.periodSeconds,
            graceSeconds: c.graceSeconds,
            lastOkPingAt: c.lastOkPingAt,
            createdAt: c.createdAt,
            now,
          })
      );
    },

    async consumeRateLimit(checkId) {
      return withLock(async () => {
        const db = await load();
        const now = Date.now();
        const windowStart = now - RATE_LIMIT_WINDOW_MS;
        const hits = (db.rate[checkId] ?? []).filter((t) => t > windowStart);
        if (hits.length >= RATE_LIMIT_MAX) {
          db.rate[checkId] = hits;
          await save(db);
          const retryAfterSeconds = Math.max(
            1,
            Math.ceil((hits[0] + RATE_LIMIT_WINDOW_MS - now) / 1000)
          );
          return { allowed: false, remaining: 0, retryAfterSeconds };
        }
        hits.push(now);
        db.rate[checkId] = hits;
        await save(db);
        return {
          allowed: true,
          remaining: RATE_LIMIT_MAX - hits.length,
          retryAfterSeconds: 0,
        };
      });
    },

    async getMeta() {
      const db = await load();
      const overdue = isOverdue({
        paused: false,
        periodSeconds: db.meta.periodSeconds,
        graceSeconds: db.meta.graceSeconds,
        lastOkPingAt: db.meta.lastPingAt,
        createdAt: db.meta.lastPingAt ?? new Date(0).toISOString(),
      });
      // First boot: no ping yet is "not yet proven", not P0.
      const p0 = Boolean(db.meta.lastPingAt) && overdue;
      return { ...db.meta, p0 };
    },

    async touchMeta(now) {
      return withLock(async () => {
        const db = await load();
        const iso = now.toISOString();
        db.meta.lastPingAt = iso;
        db.meta.lastEvaluateAt = iso;
        db.meta.p0 = false;
        const check = db.checks.find((c) => c.id === db.meta.checkId);
        if (check) {
          check.lastPingAt = iso;
          check.lastOkPingAt = iso;
          check.lastStatus = "ok";
        }
        db.pings.push({
          id: newUuidV4(),
          checkId: db.meta.checkId,
          receivedAt: iso,
          status: "ok",
          count: null,
          countProvided: false,
          userAgent: "diditrun-meta",
        });
        await save(db);
        return { ...db.meta, p0: false };
      });
    },

    async silenceMeta(iso) {
      return withLock(async () => {
        const db = await load();
        db.meta.lastPingAt = iso;
        db.meta.lastEvaluateAt = iso;
        const check = db.checks.find((c) => c.id === db.meta.checkId);
        if (check) {
          check.lastPingAt = iso;
          check.lastOkPingAt = iso;
        }
        await save(db);
        return this.getMeta();
      });
    },

    async createBillingIntent(userId, plan: Exclude<PlanId, "free">) {
      return withLock(async () => {
        const db = await load();
        const intent: BillingIntent = {
          id: newUuidV4(),
          userId,
          plan,
          createdAt: new Date().toISOString(),
          status: "stub_pending",
        };
        db.billing.push(intent);
        await save(db);
        return intent;
      });
    },

    async listBillingIntents(userId) {
      const db = await load();
      return db.billing
        .filter((b) => b.userId === userId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    },
  };
}
