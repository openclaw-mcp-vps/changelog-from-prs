import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

export type PlanType = "single" | "monthly";

export interface GenerationRecord {
  id: string;
  createdAt: string;
  accessToken: string;
  repository: string;
  fromTag: string;
  toTag: string;
  markdown: string;
  sourcePrCount: number;
  sourceCommitCount: number;
}

export interface Entitlement {
  accessToken: string;
  credits: number;
  subscriptionEndsAt: string | null;
  updatedAt: string;
}

interface CheckoutSession {
  id: string;
  accessToken: string;
  plan: PlanType;
  status: "pending" | "paid" | "failed";
  createdAt: string;
  updatedAt: string;
  lemonOrderId?: string;
}

interface DatabaseSchema {
  entitlements: Record<string, Entitlement>;
  checkoutSessions: CheckoutSession[];
  generations: GenerationRecord[];
}

const DATA_DIR = path.join(process.cwd(), ".data");
const DB_PATH = path.join(DATA_DIR, "db.json");

let mutateQueue: Promise<unknown> = Promise.resolve();

function emptyDb(): DatabaseSchema {
  return {
    entitlements: {},
    checkoutSessions: [],
    generations: []
  };
}

async function ensureDbFile() {
  await mkdir(DATA_DIR, { recursive: true });

  try {
    await readFile(DB_PATH, "utf8");
  } catch {
    await writeFile(DB_PATH, JSON.stringify(emptyDb(), null, 2), "utf8");
  }
}

async function readDb(): Promise<DatabaseSchema> {
  await ensureDbFile();
  const raw = await readFile(DB_PATH, "utf8");

  try {
    const parsed = JSON.parse(raw) as DatabaseSchema;
    return {
      entitlements: parsed.entitlements ?? {},
      checkoutSessions: parsed.checkoutSessions ?? [],
      generations: parsed.generations ?? []
    };
  } catch {
    return emptyDb();
  }
}

async function writeDb(db: DatabaseSchema) {
  await writeFile(DB_PATH, JSON.stringify(db, null, 2), "utf8");
}

async function mutateDb<T>(mutator: (db: DatabaseSchema) => T | Promise<T>): Promise<T> {
  const resultPromise = mutateQueue.then(async () => {
    const db = await readDb();
    const result = await mutator(db);
    await writeDb(db);
    return result;
  });

  mutateQueue = resultPromise.then(
    () => undefined,
    () => undefined
  );

  return resultPromise;
}

export function generateOpaqueToken() {
  return crypto.randomBytes(24).toString("hex");
}

export function hasActiveAccess(entitlement: Entitlement | null) {
  if (!entitlement) {
    return false;
  }

  if (entitlement.credits > 0) {
    return true;
  }

  if (!entitlement.subscriptionEndsAt) {
    return false;
  }

  return new Date(entitlement.subscriptionEndsAt).getTime() > Date.now();
}

export async function getEntitlement(accessToken: string): Promise<Entitlement | null> {
  const db = await readDb();
  return db.entitlements[accessToken] ?? null;
}

export async function getAccessSnapshot(accessToken: string) {
  const entitlement = await getEntitlement(accessToken);

  return {
    active: hasActiveAccess(entitlement),
    credits: entitlement?.credits ?? 0,
    subscriptionEndsAt: entitlement?.subscriptionEndsAt ?? null
  };
}

export async function createCheckoutSession(params: { accessToken: string; plan: PlanType }) {
  return mutateDb((db) => {
    const now = new Date().toISOString();
    const session: CheckoutSession = {
      id: generateOpaqueToken(),
      accessToken: params.accessToken,
      plan: params.plan,
      status: "pending",
      createdAt: now,
      updatedAt: now
    };

    db.checkoutSessions.unshift(session);
    db.checkoutSessions = db.checkoutSessions.slice(0, 2000);

    return session;
  });
}

export async function grantEntitlement(params: {
  accessToken: string;
  plan: PlanType;
  lemonOrderId?: string;
  subscriptionEndsAt?: string | null;
}) {
  return mutateDb((db) => {
    const now = new Date().toISOString();
    const existing = db.entitlements[params.accessToken];

    const next: Entitlement = {
      accessToken: params.accessToken,
      credits: existing?.credits ?? 0,
      subscriptionEndsAt: existing?.subscriptionEndsAt ?? null,
      updatedAt: now
    };

    if (params.plan === "single") {
      next.credits += 1;
    } else {
      const currentEnd = existing?.subscriptionEndsAt ? new Date(existing.subscriptionEndsAt).getTime() : 0;
      const candidateEnd = params.subscriptionEndsAt
        ? new Date(params.subscriptionEndsAt).getTime()
        : Date.now() + 30 * 24 * 60 * 60 * 1000;
      const chosenEnd = Math.max(currentEnd, candidateEnd);
      next.subscriptionEndsAt = new Date(chosenEnd).toISOString();
    }

    db.entitlements[params.accessToken] = next;

    const latestPending = db.checkoutSessions.find(
      (session) => session.accessToken === params.accessToken && session.plan === params.plan && session.status === "pending"
    );

    if (latestPending) {
      latestPending.status = "paid";
      latestPending.updatedAt = now;
      if (params.lemonOrderId) {
        latestPending.lemonOrderId = params.lemonOrderId;
      }
    }

    return next;
  });
}

export async function consumeGeneration(accessToken: string) {
  return mutateDb((db) => {
    const entitlement = db.entitlements[accessToken];
    if (!entitlement) {
      return { allowed: false as const, reason: "No active entitlement" };
    }

    const hasSub = entitlement.subscriptionEndsAt
      ? new Date(entitlement.subscriptionEndsAt).getTime() > Date.now()
      : false;

    if (hasSub) {
      return { allowed: true as const, source: "subscription" as const };
    }

    if (entitlement.credits > 0) {
      entitlement.credits -= 1;
      entitlement.updatedAt = new Date().toISOString();
      return { allowed: true as const, source: "credit" as const, remainingCredits: entitlement.credits };
    }

    return { allowed: false as const, reason: "No credits remaining" };
  });
}

export async function recordGeneration(input: Omit<GenerationRecord, "id" | "createdAt">) {
  return mutateDb((db) => {
    const record: GenerationRecord = {
      id: generateOpaqueToken(),
      createdAt: new Date().toISOString(),
      ...input
    };

    db.generations.unshift(record);
    db.generations = db.generations.slice(0, 3000);

    return record;
  });
}

export async function listGenerationHistory(accessToken: string, limit = 30) {
  const db = await readDb();
  return db.generations.filter((record) => record.accessToken === accessToken).slice(0, limit);
}
