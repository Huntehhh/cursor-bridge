import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

export interface Config {
  anthropicKey: string;
  localToken: string;
  port: number;
  defaultModel: string;
  modelAliases: Record<string, string>;
}

const CONFIG_DIR = join(homedir(), ".cursor-bridge");
const CONFIG_PATH = join(CONFIG_DIR, "config.json");

const DEFAULT_ALIASES: Record<string, string> = {
  "gpt-4": "claude-sonnet-4-5-20250929",
  "gpt-4o": "claude-sonnet-4-5-20250929",
  "gpt-4o-mini": "claude-haiku-3-5-20241022",
  "gpt-4-turbo": "claude-opus-4-6",
  "gpt-3.5-turbo": "claude-haiku-3-5-20241022",
};

export function configExists(): boolean {
  return existsSync(CONFIG_PATH);
}

export function loadConfig(): Config {
  const raw = readFileSync(CONFIG_PATH, "utf-8");
  return JSON.parse(raw) as Config;
}

export function saveConfig(config: Config): void {
  mkdirSync(CONFIG_DIR, { recursive: true });
  writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), "utf-8");
}

export function generateLocalToken(): string {
  const id = crypto.randomUUID().replace(/-/g, "").slice(0, 24);
  return `cb-local-${id}`;
}

export function defaultConfig(
  anthropicKey: string,
  port = 4101
): Config {
  return {
    anthropicKey,
    localToken: generateLocalToken(),
    port,
    defaultModel: "claude-sonnet-4-5-20250929",
    modelAliases: { ...DEFAULT_ALIASES },
  };
}
