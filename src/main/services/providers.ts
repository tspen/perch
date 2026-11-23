import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import providersData from "../data/providers.json";
import type { ProviderInfo } from "../../shared/types";
import { providerBilling } from "./billing";
import type { EngineLocator } from "../engine/engine-locator";
import type { ModelService } from "./models";
import type { Store } from "./store";

interface RawProvider {
  id: string;
  name: string;
  login: string;
  authUrl?: string;
  instructions?: string;
  prompt?: string;
  envVar?: string;
  recommended?: boolean;
}

const RAW_PROVIDERS = providersData as RawProvider[];

export class ProviderService {
  private store: Store;
  private engine: EngineLocator;
  private models: ModelService;

  constructor(store: Store, engine: EngineLocator, models: ModelService) {
    this.store = store;
    this.engine = engine;
    this.models = models;
  }

  list(): ProviderInfo[] {
    const supported = new Set(this.store.data.models.map((model) => model.provider));
    const counts = new Map<string, number>();
    for (const model of this.store.data.models) {
      if (model.available) counts.set(model.provider, (counts.get(model.provider) ?? 0) + 1);
    }
    return RAW_PROVIDERS
      .filter((provider) => supported.has(provider.id))
      .map((provider) => ({
        id: provider.id,
        name: provider.name,
        login: provider.login,
        authUrl: provider.authUrl,
        instructions: provider.instructions,
        prompt: provider.prompt,
        envVar: provider.envVar,
        recommended: !!provider.recommended,
        connected: (counts.get(provider.id) ?? 0) > 0,
        modelCount: counts.get(provider.id) ?? 0,
        billing: providerBilling(provider.id),
      }))
      .sort((a, b) => providerRank(a) - providerRank(b) || a.name.localeCompare(b.name));
  }

  async disconnect(id: string): Promise<{ ok: boolean; output: string; providers: ProviderInfo[] }> {
    const provider = RAW_PROVIDERS.find((item) => item.id === id);
    if (!provider) throw new Error("Unknown Pi provider: " + id);
    const authPath = join(this.store.baseDir, "pi-agent", "auth.json");
    let auth: Record<string, unknown> = {};
    if (existsSync(authPath)) {
      try { auth = JSON.parse(readFileSync(authPath, "utf8")); } catch { auth = {}; }
    }
    if (auth[provider.id]) {
      delete auth[provider.id];
      writeFileSync(authPath, JSON.stringify(auth, null, 2) + "\n", "utf8");
    }
    await this.models.refresh().catch(() => undefined);
    return { ok: true, output: provider.name + " disconnected.", providers: this.list() };
  }

  async connect(id: string, apiKey?: string): Promise<{ ok: boolean; output: string; providers: ProviderInfo[] }> {
    const provider = RAW_PROVIDERS.find((item) => item.id === id);
    if (!provider) throw new Error("Unknown Pi provider: " + id);
    if (provider.login === "none") {
      return {
        ok: false,
        output: provider.name + " is configured through its local endpoint, not a login.",
        providers: this.list(),
      };
    }
    if (provider.id === "opencode-go" && apiKey?.trim()) {
      const validation = await validateOpenCodeGo(apiKey.trim());
      if (!validation.ok) {
        return { ok: false, output: validation.error ?? "OpenCode Go rejected that API key.", providers: this.list() };
      }
    }
    if (apiKey?.trim()) {
      const authPath = join(this.store.baseDir, "pi-agent", "auth.json");
      let auth: Record<string, unknown> = {};
      if (existsSync(authPath)) {
        try { auth = JSON.parse(readFileSync(authPath, "utf8")); } catch { auth = {}; }
      }
      auth[provider.id] = { type: "api_key", key: apiKey.trim() };
      mkdirSync(dirname(authPath), { recursive: true });
      writeFileSync(authPath, JSON.stringify(auth, null, 2) + "\n", "utf8");
      this.store.setSettings({ models: { ...this.store.settings.models, preferredProvider: provider.id } });
      await this.models.refresh().catch(() => undefined);
      await this.models.refreshAA().catch(() => undefined);
      this.models.resetDefaults();
      return { ok: true, output: provider.name + " connected.", providers: this.list() };
    }
    if (provider.login === "api-key") {
      return { ok: false, output: provider.name + " requires an API key.", providers: this.list() };
    }
    // OAuth/device flows need a real terminal. Open one with the Pi CLI so the
    // provider can complete its browser or device-code flow.
    const cli = this.engine.resolveForSpawn();
    const command = [
      "$env:ELECTRON_RUN_AS_NODE=1",
      "& " + JSON.stringify(process.execPath) + " " + JSON.stringify(cli) + " auth login " + provider.id,
    ].join("; ");
    try {
      const child = spawn("powershell.exe", ["-NoExit", "-Command", command], {
        detached: true,
        stdio: "ignore",
        windowsHide: false,
      });
      child.unref();
    } catch (error) {
      return { ok: false, output: String(error), providers: this.list() };
    }
    return {
      ok: true,
      output: "Complete the " + provider.name + " sign-in in the opened window, then refresh the model catalog.",
      providers: this.list(),
    };
  }
}

function stripAnsi(value: string): string {
  return value.replace(/\u001b\[[0-9;?]*[ -/]*[@-~]/g, "").replace(/\u001b\][^\u0007]*\u0007/g, "");
}

async function validateOpenCodeGo(apiKey: string): Promise<{ ok: boolean; error?: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetch("https://opencode.ai/inference/go/v1/models", {
      headers: { Authorization: `Bearer ${apiKey}`, "user-agent": "Perch" },
      signal: controller.signal,
    });
    if (response.ok) return { ok: true };
    if (response.status === 401 || response.status === 403) {
      return { ok: false, error: `OpenCode Go rejected that API key (HTTP ${response.status}).` };
    }
    return { ok: false, error: `OpenCode Go validation failed (HTTP ${response.status}).` };
  } catch (error) {
    return { ok: false, error: `Could not reach OpenCode Go to validate the key: ${error instanceof Error ? error.message : String(error)}` };
  } finally {
    clearTimeout(timer);
  }
}

function providerRank(provider: ProviderInfo): number {
  if (provider.id === "opencode-go") return 0;
  if (provider.connected) return 1;
  if (provider.recommended) return 2;
  return 3;
}
