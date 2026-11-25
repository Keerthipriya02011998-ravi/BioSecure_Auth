import { promises as fs } from "fs";
import path from "path";

// Tiny JSON-file database so the project runs with zero setup.
// To move to Postgres/MySQL, replace the functions in this file only.
const FILE = path.join(process.cwd(), "data", "db.json");
const EMPTY = { users: [], codes: [], challenges: [] };

// Serialise every read-modify-write so concurrent requests cannot corrupt the file.
const g = globalThis;
g.__dbQueue = g.__dbQueue || Promise.resolve();

async function load() {
  try {
    return { ...EMPTY, ...JSON.parse(await fs.readFile(FILE, "utf8")) };
  } catch {
    return structuredClone(EMPTY);
  }
}

async function save(db) {
  await fs.mkdir(path.dirname(FILE), { recursive: true });
  const tmp = FILE + ".tmp";
  await fs.writeFile(tmp, JSON.stringify(db, null, 2));
  await fs.rename(tmp, FILE);
}

/** Run fn(db) with exclusive access; whatever fn does to db is saved. */
export function withDb(fn) {
  const run = g.__dbQueue.then(async () => {
    const db = await load();
    const result = await fn(db);
    await save(db);
    return result;
  });
  g.__dbQueue = run.catch(() => {});
  return run;
}

export async function readDb() {
  await g.__dbQueue;
  return load();
}
