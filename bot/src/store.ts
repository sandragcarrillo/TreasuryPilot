import { readFileSync, writeFileSync, existsSync } from "fs";

const STORE_FILE = "store.json";

interface StoreData {
  walletLinks: Record<string, number>;   
  chatOrgs: Record<string, number[]>;  
}

function load(): StoreData {
  if (!existsSync(STORE_FILE)) {
    return { walletLinks: {}, chatOrgs: {} };
  }
  try {
    return JSON.parse(readFileSync(STORE_FILE, "utf-8"));
  } catch {
    return { walletLinks: {}, chatOrgs: {} };
  }
}

function save(data: StoreData) {
  writeFileSync(STORE_FILE, JSON.stringify(data, null, 2));
}


const stored = load();

export const walletLinks = new Map<string, number>(Object.entries(stored.walletLinks).map(([k, v]) => [k, v]));
export const chatOrgs = new Map<number, number[]>(
  Object.entries(stored.chatOrgs).map(([k, v]) => [Number(k), v])
);

export function persist() {
  const data: StoreData = {
    walletLinks: Object.fromEntries(walletLinks),
    chatOrgs: Object.fromEntries(
      Array.from(chatOrgs.entries()).map(([k, v]) => [String(k), v])
    ),
  };
  save(data);
}
