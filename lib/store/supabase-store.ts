import { checkLimit } from "@/lib/plans";
import { isOverdue } from "@/lib/stale";
import { createAdminClient } from "@/lib/supabase/admin";
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
import type { SupabaseClient } from "@supabase/supabase-js";

type Admin = SupabaseClient;

function mapProfile(row: Record<string, unknown>): Profile {
  return {
    id: row.id as string,
    email: row.email as string,
    plan: row.plan as PlanId,
    alertEmail: row.alert_email as string,
    createdAt: row.created_at as string,
  };
}

function mapCheck(row: Record<string, unknown>): Check {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    name: row.name as string,
    periodSeconds: row.period_seconds as number,
    graceSeconds: row.grace_seconds as number,
    paused: row.paused as boolean,
    lastPingAt: (row.last_ping_at as string | null) ?? null,
    lastOkPingAt: (row.last_ok_ping_at as string | null) ?? null,
    lastCount: (row.last_count as number | null) ?? null,
    lastCountProvided: Boolean(row.last_count_provided),
    lastStatus: (row.last_status as Check["lastStatus"]) ?? null,
    assertZero: Boolean(row.assert_zero),
    isMeta: Boolean(row.is_meta),
    createdAt: row.created_at as string,
  };
}

function mapPing(row: Record<string, unknown>): Ping {
  return {
    id: row.id as string,
    checkId: row.check_id as string,
    receivedAt: row.received_at as string,
    status: row.status as Ping["status"],
    count: (row.count as number | null) ?? null,
    countProvided: Boolean(row.count_provided),
    ip: (row.ip as string | undefined) ?? undefined,
    userAgent: (row.user_agent as string | undefined) ?? undefined,
  };
}

function mapAlert(row: Record<string, unknown>): AlertRecord {
  return {
    id: row.id as string,
    checkId: row.check_id as string,
    userId: row.user_id as string,
    type: row.type as AlertRecord["type"],
    sentAt: row.sent_at as string,
    channel: row.channel as AlertRecord["channel"],
    payload: (row.payload as Record<string, unknown>) ?? {},
  };
}

async function ensureMeta(admin: Admin): Promise<void> {
  const { data } = await admin
    .from("meta_state")
    .select("check_id")
    .eq("id", "singleton")
    .maybeSingle();
  if (data?.check_id) return;

  const checkId = newUuidV4();
  await admin.from("profiles").upsert({
    id: META_USER_ID,
    email: "meta@diditrun.internal",
    plan: "pro",
    alert_email: "jdenquiryautopilot@gmail.com",
  });
  await admin.from("checks").insert({
    id: checkId,
    user_id: META_USER_ID,
    name: META_CHECK_NAME,
    period_seconds: META_PERIOD_SECONDS,
    grace_seconds: META_GRACE_SECONDS,
    assert_zero: false,
    is_meta: true,
  });
  await admin.from("meta_state").upsert({
    id: "singleton",
    check_id: checkId,
    period_seconds: META_PERIOD_SECONDS,
    grace_seconds: META_GRACE_SECONDS,
  });
}

export function createSupabaseStore(): Store {
  const admin = () => createAdminClient();

  return {
    kind: "supabase",

    async ensureReady() {
      await ensureMeta(admin());
    },

    async getProfile(id) {
      const { data, error } = await admin()
        .from("profiles")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data ? mapProfile(data) : null;
    },

    async getProfileByEmail(email) {
      const { data, error } = await admin()
        .from("profiles")
        .select("*")
        .eq("email", email.trim().toLowerCase())
        .maybeSingle();
      if (error) throw error;
      return data ? mapProfile(data) : null;
    },

    async createProfile(input) {
      const row = {
        id: input.id ?? newUuidV4(),
        email: input.email.trim().toLowerCase(),
        plan: input.plan ?? "free",
        alert_email: input.email.trim().toLowerCase(),
      };
      const { data, error } = await admin()
        .from("profiles")
        .insert(row)
        .select("*")
        .single();
      if (error) throw error;
      return mapProfile(data);
    },

    async updateProfile(id, patch) {
      const payload: Record<string, unknown> = {};
      if (patch.alertEmail !== undefined) payload.alert_email = patch.alertEmail;
      if (patch.plan !== undefined) payload.plan = patch.plan;
      const { data, error } = await admin()
        .from("profiles")
        .update(payload)
        .eq("id", id)
        .select("*")
        .maybeSingle();
      if (error) throw error;
      return data ? mapProfile(data) : null;
    },

    async countUserChecks(userId) {
      const { count, error } = await admin()
        .from("checks")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("is_meta", false);
      if (error) throw error;
      return count ?? 0;
    },

    async listChecks(userId) {
      const { data, error } = await admin()
        .from("checks")
        .select("*")
        .eq("user_id", userId)
        .eq("is_meta", false)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map(mapCheck);
    },

    async getCheck(id) {
      const { data, error } = await admin()
        .from("checks")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data ? mapCheck(data) : null;
    },

    async createCheck(input: CreateCheckInput) {
      const profile = await this.getProfile(input.userId);
      if (!profile) throw new Error("Unknown user.");
      const used = await this.countUserChecks(input.userId);
      if (used >= checkLimit(profile.plan)) {
        throw new Error(
          `Plan limit reached (${checkLimit(profile.plan)} checks on ${profile.plan}).`
        );
      }
      const { data, error } = await admin()
        .from("checks")
        .insert({
          id: newUuidV4(),
          user_id: input.userId,
          name: input.name.trim() || "Untitled check",
          period_seconds: input.periodSeconds,
          grace_seconds: input.graceSeconds,
          assert_zero: input.assertZero,
          is_meta: false,
        })
        .select("*")
        .single();
      if (error) throw error;
      return mapCheck(data);
    },

    async updateCheck(id, patch) {
      const payload: Record<string, unknown> = {};
      if (patch.name !== undefined) payload.name = patch.name;
      if (patch.periodSeconds !== undefined)
        payload.period_seconds = patch.periodSeconds;
      if (patch.graceSeconds !== undefined)
        payload.grace_seconds = patch.graceSeconds;
      if (patch.paused !== undefined) payload.paused = patch.paused;
      if (patch.assertZero !== undefined) payload.assert_zero = patch.assertZero;
      if (patch.lastPingAt !== undefined) payload.last_ping_at = patch.lastPingAt;
      if (patch.lastOkPingAt !== undefined)
        payload.last_ok_ping_at = patch.lastOkPingAt;
      if (patch.lastCount !== undefined) payload.last_count = patch.lastCount;
      if (patch.lastCountProvided !== undefined)
        payload.last_count_provided = patch.lastCountProvided;
      if (patch.lastStatus !== undefined) payload.last_status = patch.lastStatus;
      const { data, error } = await admin()
        .from("checks")
        .update(payload)
        .eq("id", id)
        .select("*")
        .maybeSingle();
      if (error) throw error;
      return data ? mapCheck(data) : null;
    },

    async deleteCheck(id, userId) {
      const { data, error } = await admin()
        .from("checks")
        .delete()
        .eq("id", id)
        .eq("user_id", userId)
        .eq("is_meta", false)
        .select("id")
        .maybeSingle();
      if (error) throw error;
      return Boolean(data);
    },

    async recordPing(input: RecordPingInput) {
      const check = await this.getCheck(input.checkId);
      if (!check) throw new Error("not_found");
      const now = new Date().toISOString();
      const pingRow = {
        id: newUuidV4(),
        check_id: check.id,
        received_at: now,
        status: input.status,
        count: input.count,
        count_provided: input.countProvided,
        ip: input.ip ?? null,
        user_agent: input.userAgent ?? null,
      };
      const { data: ping, error } = await admin()
        .from("pings")
        .insert(pingRow)
        .select("*")
        .single();
      if (error) throw error;
      const updated = await this.updateCheck(check.id, {
        lastPingAt: now,
        lastStatus: input.status,
        lastCount: input.count,
        lastCountProvided: input.countProvided,
        lastOkPingAt: input.status === "ok" ? now : check.lastOkPingAt,
      });
      if (!updated) throw new Error("not_found");
      return { ping: mapPing(ping), check: updated };
    },

    async listPings(checkId, limit = 40) {
      const { data, error } = await admin()
        .from("pings")
        .select("*")
        .eq("check_id", checkId)
        .order("received_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []).map(mapPing);
    },

    async listAlerts(userId, limit = 40) {
      const { data, error } = await admin()
        .from("alerts")
        .select("*")
        .eq("user_id", userId)
        .order("sent_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []).map(mapAlert);
    },

    async listCheckAlerts(checkId, limit = 40) {
      const { data, error } = await admin()
        .from("alerts")
        .select("*")
        .eq("check_id", checkId)
        .order("sent_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []).map(mapAlert);
    },

    async hasOpenOverdue(checkId) {
      const check = await this.getCheck(checkId);
      if (!check) return false;
      let query = admin()
        .from("alerts")
        .select("id")
        .eq("check_id", checkId)
        .eq("type", "overdue")
        .limit(1);
      if (check.lastOkPingAt) {
        query = query.gt("sent_at", check.lastOkPingAt);
      }
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []).length > 0;
    },

    async recordAlert(input) {
      const { data, error } = await admin()
        .from("alerts")
        .insert({
          id: newUuidV4(),
          check_id: input.checkId,
          user_id: input.userId,
          type: input.type,
          channel: input.channel,
          payload: input.payload,
        })
        .select("*")
        .single();
      if (error) throw error;
      return mapAlert(data);
    },

    async listDueChecks(now) {
      const { data, error } = await admin()
        .from("checks")
        .select("*")
        .eq("is_meta", false)
        .eq("paused", false);
      if (error) throw error;
      return (data ?? [])
        .map(mapCheck)
        .filter((c) =>
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
      const db = admin();
      const { data } = await db
        .from("ping_rate")
        .select("*")
        .eq("check_id", checkId)
        .maybeSingle();
      const now = Date.now();
      const hits = ((data?.hits as number[] | undefined) ?? []).filter(
        (t) => t > now - RATE_LIMIT_WINDOW_MS
      );
      if (hits.length >= RATE_LIMIT_MAX) {
        await db.from("ping_rate").upsert({
          check_id: checkId,
          hits,
          updated_at: new Date().toISOString(),
        });
        return {
          allowed: false,
          remaining: 0,
          retryAfterSeconds: Math.max(
            1,
            Math.ceil((hits[0] + RATE_LIMIT_WINDOW_MS - now) / 1000)
          ),
        };
      }
      hits.push(now);
      await db.from("ping_rate").upsert({
        check_id: checkId,
        hits,
        updated_at: new Date().toISOString(),
      });
      return {
        allowed: true,
        remaining: RATE_LIMIT_MAX - hits.length,
        retryAfterSeconds: 0,
      };
    },

    async getMeta() {
      await ensureMeta(admin());
      const { data, error } = await admin()
        .from("meta_state")
        .select("*")
        .eq("id", "singleton")
        .single();
      if (error) throw error;
      const state: MetaState = {
        checkId: data.check_id,
        lastPingAt: data.last_ping_at,
        lastEvaluateAt: data.last_evaluate_at,
        periodSeconds: data.period_seconds,
        graceSeconds: data.grace_seconds,
        p0: Boolean(
          data.last_ping_at &&
            isOverdue({
              paused: false,
              periodSeconds: data.period_seconds,
              graceSeconds: data.grace_seconds,
              lastOkPingAt: data.last_ping_at,
              createdAt: data.last_ping_at,
            })
        ),
      };
      return state;
    },

    async touchMeta(now) {
      await ensureMeta(admin());
      const iso = now.toISOString();
      const current = await this.getMeta();
      await admin()
        .from("meta_state")
        .update({
          last_ping_at: iso,
          last_evaluate_at: iso,
        })
        .eq("id", "singleton");
      await this.recordPing({
        checkId: current.checkId,
        status: "ok",
        count: null,
        countProvided: false,
        userAgent: "diditrun-meta",
      });
      return { ...current, lastPingAt: iso, lastEvaluateAt: iso, p0: false };
    },

    async silenceMeta(iso) {
      await ensureMeta(admin());
      await admin()
        .from("meta_state")
        .update({
          last_ping_at: iso,
          last_evaluate_at: iso,
        })
        .eq("id", "singleton");
      return this.getMeta();
    },

    async createBillingIntent(userId, plan: Exclude<PlanId, "free">) {
      const { data, error } = await admin()
        .from("billing_intents")
        .insert({
          id: newUuidV4(),
          user_id: userId,
          plan,
          status: "stub_pending",
        })
        .select("*")
        .single();
      if (error) throw error;
      return {
        id: data.id,
        userId: data.user_id,
        plan: data.plan,
        createdAt: data.created_at,
        status: "stub_pending",
      } satisfies BillingIntent;
    },

    async listBillingIntents(userId) {
      const { data, error } = await admin()
        .from("billing_intents")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map(
        (row) =>
          ({
            id: row.id,
            userId: row.user_id,
            plan: row.plan,
            createdAt: row.created_at,
            status: "stub_pending",
          }) satisfies BillingIntent
      );
    },
  };
}
