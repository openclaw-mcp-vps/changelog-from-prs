import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

const DATA_DIR = path.join(process.cwd(), ".data");
const DATA_FILE = path.join(DATA_DIR, "store.json");
const SESSION_DURATION_DAYS = 30;

type PurchaseRecord = {
  email: string;
  source: "stripe" | "manual";
  purchasedAt: string;
};

type SessionRecord = {
  email: string;
  expiresAt: string;
};

type UsageRecord = {
  month: string;
  releasesGenerated: number;
};

type DatabaseShape = {
  purchases: Record<string, PurchaseRecord>;
  sessions: Record<string, SessionRecord>;
  usage: Record<string, UsageRecord[]>;
};

const EMPTY_DB: DatabaseShape = {
  purchases: {},
  sessions: {},
  usage: {}
};

async function ensureDatabaseFile() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(DATA_FILE);
  } catch {
    await fs.writeFile(DATA_FILE, JSON.stringify(EMPTY_DB, null, 2), "utf-8");
  }
}

async function readDatabase(): Promise<DatabaseShape> {
  await ensureDatabaseFile();
  const contents = await fs.readFile(DATA_FILE, "utf-8");
  try {
    const parsed = JSON.parse(contents) as DatabaseShape;
    return {
      purchases: parsed.purchases ?? {},
      sessions: parsed.sessions ?? {},
      usage: parsed.usage ?? {}
    };
  } catch {
    return EMPTY_DB;
  }
}

async function writeDatabase(db: DatabaseShape) {
  await ensureDatabaseFile();
  await fs.writeFile(DATA_FILE, JSON.stringify(db, null, 2), "utf-8");
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function monthKey(date = new Date()): string {
  const year = date.getUTCFullYear();
  const month = `${date.getUTCMonth() + 1}`.padStart(2, "0");
  return `${year}-${month}`;
}

export async function recordPurchase(email: string, source: "stripe" | "manual" = "manual") {
  const normalized = normalizeEmail(email);
  const db = await readDatabase();
  db.purchases[normalized] = {
    email: normalized,
    source,
    purchasedAt: new Date().toISOString()
  };
  await writeDatabase(db);
}

export async function hasPurchase(email: string): Promise<boolean> {
  const normalized = normalizeEmail(email);
  const db = await readDatabase();
  return Boolean(db.purchases[normalized]);
}

export async function createPaidSession(email: string) {
  const normalized = normalizeEmail(email);
  const db = await readDatabase();
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000).toISOString();

  db.sessions[token] = {
    email: normalized,
    expiresAt
  };

  await writeDatabase(db);

  return {
    token,
    expiresAt
  };
}

export async function getSessionEmail(token?: string | null): Promise<string | null> {
  if (!token) {
    return null;
  }

  const db = await readDatabase();
  const session = db.sessions[token];

  if (!session) {
    return null;
  }

  if (new Date(session.expiresAt).getTime() < Date.now()) {
    delete db.sessions[token];
    await writeDatabase(db);
    return null;
  }

  return session.email;
}

export async function revokeSession(token?: string | null) {
  if (!token) {
    return;
  }

  const db = await readDatabase();
  if (db.sessions[token]) {
    delete db.sessions[token];
    await writeDatabase(db);
  }
}

export async function incrementUsage(email: string) {
  const normalized = normalizeEmail(email);
  const db = await readDatabase();
  const bucket = db.usage[normalized] ?? [];
  const key = monthKey();

  const existing = bucket.find((entry) => entry.month === key);
  if (existing) {
    existing.releasesGenerated += 1;
  } else {
    bucket.push({ month: key, releasesGenerated: 1 });
  }

  db.usage[normalized] = bucket;
  await writeDatabase(db);

  return getUsageSummaryForEmail(normalized, db);
}

function getUsageSummaryForEmail(email: string, db: DatabaseShape) {
  const records = db.usage[email] ?? [];
  const current = records.find((entry) => entry.month === monthKey());
  const total = records.reduce((sum, entry) => sum + entry.releasesGenerated, 0);

  return {
    currentMonth: current?.releasesGenerated ?? 0,
    lifetime: total
  };
}

export async function getUsageSummary(email: string) {
  const normalized = normalizeEmail(email);
  const db = await readDatabase();
  return getUsageSummaryForEmail(normalized, db);
}
