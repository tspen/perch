import { app, dialog, ipcMain, shell, BrowserWindow } from "electron";
import type { AppEvent, NewNodeRequest, NewThreadRequest, OnboardingPayload, PaneDiff, PaneKind, SendMessageRequest, SettingsPatch } from "../shared/types";
import type { EngineLocator } from "./engine/engine-locator";
import type { Orchestrator } from "./orchestrator/orchestrator";
import type { ArtifactService } from "./services/artifacts";
import type { EnvironmentService } from "./services/environment";
import type { GitService } from "./services/git";
import type { ModelService } from "./services/models";
import type { NotificationService } from "./services/notifications";
import type { SettingsService } from "./services/settings";
import type { ShareService } from "./services/share";
import type { SiteService } from "./services/sites";
import type { BrowserController } from "./services/browser";
import type { PtyService } from "./services/pty";
import type { WorkspaceService } from "./services/workspace";
import type { PrService } from "./services/pr";
import type { DeployService } from "./services/deploy";
import type { ExportService } from "./services/exporter";
import type { OAuthService } from "./services/oauth";
import type { MobileService } from "./services/mobile";
import type { PluginService } from "./services/plugins";
import type { RemoteService } from "./services/remote";
import type { RelayService } from "./services/relay";
import type { Store } from "./services/store";
import { collectGarbage } from "./services/maintenance";
import { trace } from "./diagnostics";
import { audit, readAudit } from "./audit";
import type { TerminalService } from "./services/terminal";
import type { UsageService } from "./services/usage";
import type { ProviderService } from "./services/providers";

export interface IpcContext {
  store: Store;
  engine: EngineLocator;
  orchestrator: Orchestrator;
  environments: EnvironmentService;
  models: ModelService;
  providers: ProviderService;
  settings: SettingsService;
  git: GitService;
  artifacts: ArtifactService;
  notifications: NotificationService;
  terminal: TerminalService;
  share: ShareService;
  sites: SiteService;
  browser: BrowserController;
  pty: PtyService;
  workspace: WorkspaceService;
  pr: PrService;
  deploy: DeployService;
  exporter: ExportService;
  oauth: OAuthService;
  mobile: MobileService;
  plugins: PluginService;
  remote: RemoteService;
  relay: RelayService;
  usage: UsageService;
  broadcast: (event: AppEvent) => void;
  openBrowser: (url: string) => void;
  popOutBrowser: (url: string) => void;
  popOutPane: (input: { kind: PaneKind; threadId?: string; diff?: PaneDiff }) => void;
  getPaneData: (kind: PaneKind) => PaneDiff | null;
}

export function registerIpc(context: IpcContext): void {
  const { store, orchestrator, environments, models, providers, settings, git, artifacts, notifications, terminal, pty, workspace, pr, deploy, exporter, oauth, mobile, plugins, remote, relay, share, sites, browser, engine, usage, broadcast, openBrowser, popOutBrowser, popOutPane, getPaneData } = context;

  ipcMain.handle("state:get", () => orchestrator.snapshot());
  ipcMain.handle("thread:messages", (_event, threadId: string) => {
    const chat = store.getChat(threadId);
    let chars = 0;
    for (const message of chat) for (const block of message.blocks) if ("text" in block) chars += block.text.length;
    if (chars > 1_000_000) trace("ipc-messages-large", { threadId, messages: chat.length, chars });
    return chat;
  });
  ipcMain.handle("envelopes:list", (_event, filter) => orchestrator.getEnvelopes(filter ?? {}));

  ipcMain.handle("node:create", (_event, req: NewNodeRequest) => orchestrator.createNode(req));
  ipcMain.handle("node:update", (_event, id: string, patch) => orchestrator.updateNode(id, patch));
  ipcMain.handle("node:set-approval", (_event, id: string, mode) => orchestrator.setNodeApproval(id, mode));
  ipcMain.handle("node:delete", (_event, id: string) => orchestrator.deleteNode(id));

  ipcMain.handle("thread:create", (_event, req: NewThreadRequest) => orchestrator.createThread(req));
  ipcMain.handle("thread:update", (_event, id: string, patch) => orchestrator.updateThread(id, patch));
  ipcMain.handle("thread:delete", (_event, id: string) => orchestrator.deleteThread(id));
  ipcMain.handle("thread:resolve", (_event, id: string, note?: string) => orchestrator.resolveThread(id, note));
  ipcMain.handle("thread:send", async (_event, req: SendMessageRequest) => {
    if (await remote.proxyThreadAction(req.threadId, "send", { text: req.text })) return;
    return orchestrator.sendUserMessage(req);
  });
  ipcMain.handle("thread:stop", async (_event, id: string) => {
    if (await remote.proxyThreadAction(id, "stop")) return;
    return orchestrator.stopThread(id);
  });
  ipcMain.handle("thread:restart", async (_event, id: string) => {
    if (await remote.proxyThreadAction(id, "continue")) return;
    return orchestrator.restartThread(id);
  });
  ipcMain.handle("thread:continue", async (_event, id: string) => {
    if (await remote.proxyThreadAction(id, "continue")) return;
    return orchestrator.continueThread(id);
  });
  ipcMain.handle("thread:compact", async (_event, id: string) => {
    if (await remote.proxyThreadAction(id, "compact")) return;
    return orchestrator.compactThread(id);
  });
  ipcMain.handle("thread:pause", async (_event, id: string) => {
    if (await remote.proxyThreadAction(id, "pause")) return;
    return orchestrator.suspendThread(id);
  });
  ipcMain.handle("thread:resume", async (_event, id: string) => {
    if (await remote.proxyThreadAction(id, "resume")) return;
    return orchestrator.resumeThread(id);
  });
  ipcMain.handle("thread:set-model", (_event, id: string, selector: string) => orchestrator.setThreadModel(id, selector));
  ipcMain.handle("thread:set-effort", (_event, id: string, effort: string) => orchestrator.setThreadEffort(id, effort));
  ipcMain.handle("thread:focus", (_event, id: string | null) => orchestrator.setFocusedThread(id));
  ipcMain.handle("thread:fork", (_event, id: string, entryId?: string) => orchestrator.forkThread(id, entryId));
  ipcMain.handle("thread:branch", (_event, id: string, entryId: string) => orchestrator.branchThread(id, entryId));
  ipcMain.handle("thread:navigate", (_event, id: string, entryId: string, summarize?: boolean) =>
    orchestrator.navigateThread(id, entryId, summarize),
  );
  ipcMain.handle("thread:entries", (_event, id: string) => orchestrator.getThreadEntries(id));
  ipcMain.handle("thread:goal", (_event, id: string, op: string, objective?: string, tokenBudget?: number) =>
    orchestrator.goalThread(id, op as any, objective, tokenBudget),
  );
  ipcMain.handle("thread:export", (_event, id: string) => orchestrator.exportThread(id));
  ipcMain.handle("thread:export-pdf", (_event, id: string) => exporter.threadPdf(id));
  ipcMain.handle("thread:export-docx", (_event, id: string) => exporter.threadDocx(id));
  ipcMain.handle("checkpoints:list", (_event, threadId?: string) => orchestrator.listCheckpoints(threadId));
  ipcMain.handle("checkpoints:create", (_event, threadId: string, label?: string) => orchestrator.createCheckpoint(threadId, label));
  ipcMain.handle("checkpoints:restore", (_event, id: string, mode: "code" | "both") => orchestrator.restoreCheckpoint(id, mode));

  ipcMain.handle("envelope:send", (_event, req) => orchestrator.sendEnvelope(req));
  ipcMain.handle("envelope:answer", (_event, id: string, body: string) => orchestrator.answerEnvelope(id, body));
  ipcMain.handle("envelope:read", (_event, id: string) => orchestrator.markEnvelopeRead(id));

  ipcMain.handle("memory:list", (_event, nodeId: string, query?: string) => orchestrator.memoryList(nodeId, query));
  ipcMain.handle("memory:add", (_event, nodeId: string, text: string, tags?: string[], importance?: number) =>
    orchestrator.addMemory(nodeId, text, tags, importance),
  );
  ipcMain.handle("memory:update", (_event, id: string, patch) => orchestrator.updateMemory(id, patch));
  ipcMain.handle("memory:delete", (_event, id: string) => orchestrator.deleteMemory(id));
  ipcMain.handle("memory:consolidate", (_event, nodeId: string) => orchestrator.consolidateMemory(nodeId));

  ipcMain.handle("env:save", (_event, env) => {
    const saved = environments.save(env);
    broadcast({ type: "snapshot", payload: orchestrator.snapshot() });
    return saved;
  });
  ipcMain.handle("env:delete", (_event, id: string) => {
    environments.remove(id);
    broadcast({ type: "snapshot", payload: orchestrator.snapshot() });
  });
  ipcMain.handle("env:test", (_event, id: string) => {
    const env = store.getEnvironment(id);
    const cwd = env?.cwd || store.baseDir;
    return environments.test(id, cwd);
  });

  ipcMain.handle("git:status", (_event, nodeId: string, threadId?: string) => orchestrator.gitStatus(nodeId, threadId));
  ipcMain.handle("git:diff", (_event, nodeId: string, threadId?: string, path?: string) =>
    orchestrator.gitDiff(nodeId, threadId, path),
  );
  ipcMain.handle("git:read-file", (_event, path: string) => git.readFile(path));
  ipcMain.handle("git:commit", (_event, nodeId: string, threadId: string | undefined, message: string, paths?: string[]) =>
    orchestrator.gitCommit(nodeId, threadId, message, paths),
  );
  ipcMain.handle("git:merge", (_event, nodeId: string, threadId: string) => orchestrator.gitMerge(nodeId, threadId));
  ipcMain.handle("git:pr", (_event, nodeId: string, threadId: string, title: string, body: string) =>
    orchestrator.gitCreatePr(nodeId, threadId, title, body),
  );
  ipcMain.handle("git:discard", (_event, nodeId: string, threadId: string) => orchestrator.gitDiscard(nodeId, threadId));
  ipcMain.handle("git:reject-hunk", (_event, nodeId: string, threadId: string, path: string, patch: string) =>
    orchestrator.gitRejectHunk(nodeId, threadId, path, patch),
  );

  const cwdFor = (nodeId: string, threadId?: string): string => {
    const thread = threadId ? store.getThread(threadId) : undefined;
    const node = store.getNode(nodeId);
    const cwd = thread?.worktreePath || node?.repoPath || node?.path;
    if (!cwd) throw new Error("Project has no working directory");
    return cwd;
  };
  ipcMain.handle("pr:status", (_event, nodeId: string, threadId?: string) => pr.status(cwdFor(nodeId, threadId)));
  ipcMain.handle("ci:runs", (_event, nodeId: string, threadId?: string) => pr.runs(cwdFor(nodeId, threadId)));
  ipcMain.handle("ci:logs", (_event, nodeId: string, threadId: string | undefined, runId: string) => pr.logs(cwdFor(nodeId, threadId), runId));
  ipcMain.handle("ci:rerun", (_event, nodeId: string, threadId: string | undefined, runId: string) => pr.rerun(cwdFor(nodeId, threadId), runId));
  ipcMain.handle("pr:merge", (_event, nodeId: string, threadId: string | undefined, number: number) => pr.merge(cwdFor(nodeId, threadId), number));
  ipcMain.handle("pr:comment", (_event, nodeId: string, threadId: string | undefined, number: number, body: string) => pr.comment(cwdFor(nodeId, threadId), number, body));

  ipcMain.handle("settings:update", async (_event, patch: SettingsPatch) => {
    const updated = store.setSettings(patch.settings ?? {});
    if (patch.settings?.models) models.ensureDefaults();
    if (patch.settings?.contextCompaction !== undefined) {
      await orchestrator.setContextCompaction(!!patch.settings.contextCompaction);
    }
    if (patch.settings?.statusCheckIntervalMin !== undefined) orchestrator.refreshStatusTimer();
    if (patch.settings?.autoResolveWorkers !== undefined) orchestrator.refreshAutoResolve();
    broadcast({ type: "snapshot", payload: orchestrator.snapshot() });
    return updated;
  });
  ipcMain.handle("settings:complete-onboarding", async (_event, payload: OnboardingPayload) => {
    const current = store.settings;
    const models = {
      ...current.models,
      ...payload.models,
      group: payload.models.group ?? payload.models.root,
      project: payload.models.project ?? payload.models.worker,
      memory: payload.models.memory ?? payload.models.naming,
      rootEffort: payload.efforts.root,
      groupEffort: payload.efforts.group ?? payload.efforts.root,
      projectEffort: payload.efforts.project ?? payload.efforts.worker,
      workerEffort: payload.efforts.worker,
    };
    store.setSettings({
      onboardingCompleted: true,
      autoName: payload.autoName,
      notifications: { ...current.notifications, enabled: payload.notificationsEnabled },
      models,
    });
    orchestrator.applyDefaultsToEmptyTree();
    let node: any;
    const first = payload.firstProject;
    if (first && (first.name?.trim() || first.brief?.trim())) {
      const root = store.nodes.find((item) => item.type === "root");
      if (root) {
        node = await orchestrator.createNode({
          parentId: root.id,
          type: "project",
          name: first.name?.trim() ?? "",
          path: first.path?.trim() || undefined,
          brief: first.brief?.trim() || undefined,
          model: models.project,
          effort: models.projectEffort,
          gitInit: !!first.gitInit,
        });
      }
    }
    const snapshot = orchestrator.snapshot();
    broadcast({ type: "snapshot", payload: snapshot });
    return { snapshot, node };
  });
  ipcMain.handle("pi-config:get", async () => {
    const cached = store.data.piConfig;
    if (cached.fetchedAt && Date.now() - cached.fetchedAt < 5 * 60_000) return cached;
    return settings.refresh();
  });
  ipcMain.handle("pi-config:set", async (_event, key: string, value: unknown) => {
    const snapshot = await settings.set(key, value);
    broadcast({ type: "config:updated", payload: snapshot });
    return snapshot;
  });
  ipcMain.handle("pi-config:reset", async (_event, key: string) => {
    const snapshot = await settings.reset(key);
    broadcast({ type: "config:updated", payload: snapshot });
    return snapshot;
  });

  ipcMain.handle("tools:list", () => settings.tools());
  ipcMain.handle("tools:set", async (_event, name: string, enabled: boolean, approval?) => {
    const tools = await settings.setTool(name, enabled, approval);
    return tools;
  });
  ipcMain.handle("skills:list", () => settings.skills());
  ipcMain.handle("mcp:list", () => settings.mcpServers());
  ipcMain.handle("providers:list", () => providers.list());
  ipcMain.handle("providers:disconnect", async (_event, id: string) => {
    const result = await providers.disconnect(id);
    const list = await models.refresh().catch(() => models.list());
    broadcast({ type: "models:updated", payload: { models: list, updatedAt: Date.now() } });
    broadcast({ type: "snapshot", payload: orchestrator.snapshot() });
    return result;
  });
  ipcMain.handle("providers:connect", async (_event, id: string, apiKey?: string) => {
    const result = await providers.connect(id, apiKey);
    if (result.ok) {
      const list = await models.refresh().catch(() => models.list());
      broadcast({ type: "models:updated", payload: { models: list, updatedAt: Date.now() } });
      const usageSnapshot = await usage.refresh().catch(() => null);
      if (usageSnapshot) broadcast({ type: "usage:updated", payload: usageSnapshot });
      broadcast({ type: "snapshot", payload: orchestrator.snapshot() });
    }
    return result;
  });

  ipcMain.handle("models:refresh", async () => {
    const list = await models.refresh();
    broadcast({ type: "models:updated", payload: { models: list, updatedAt: Date.now() } });
    return list;
  });
  ipcMain.handle("models:defaults", () => store.settings.models);
  ipcMain.handle("models:set-default", (_event, role: string, selector: string) => {
    const updated = store.setSettings({ models: { ...store.settings.models, [role]: selector } as any });
    return updated;
  });
  ipcMain.handle("models:reset-defaults", () => {
    models.resetDefaults();
    orchestrator.applyDefaultsToEmptyTree();
    return store.settings;
  });
  ipcMain.handle("models:refresh-aa", async () => {
    const result = await models.refreshAA(true);
    broadcast({ type: "models:updated", payload: { models: models.list(), updatedAt: models.updatedAt() } });
    return result;
  });
  ipcMain.handle("usage:refresh", async () => {
    const snapshot = await usage.refresh();
    broadcast({ type: "usage:updated", payload: snapshot });
    return snapshot;
  });

  ipcMain.handle("terminal:run", (_event, req) => terminal.run(req));
  ipcMain.handle("terminal:kill", (_event, runId: string) => terminal.kill(runId));
  ipcMain.handle("terminal:list", () => terminal.list());

  ipcMain.handle("artifacts:list", (_event, filter) => artifacts.list(filter ?? {}));
  ipcMain.handle("artifacts:read", (_event, id: string) => artifacts.read(id));

  ipcMain.handle("notifications:list", () => notifications.list());
  ipcMain.handle("notifications:read", (_event, id: string) => notifications.markRead(id));
  ipcMain.handle("notifications:read-all", () => notifications.markAllRead());
  ipcMain.handle("notifications:clear", () => notifications.clear());

  ipcMain.handle("approval:respond", (_event, id: string, response: unknown) => orchestrator.respondApproval(id, response));

  ipcMain.handle("share:create", async (_event, threadId: string) => {
    const info = await share.start(threadId);
    broadcast({ type: "share:updated", payload: info });
    return info;
  });
  ipcMain.handle("share:stop", async () => {
    await share.stop();
    broadcast({ type: "share:updated", payload: null });
  });

  ipcMain.handle("sites:list", () => sites.list());
  ipcMain.handle("sites:create", async (_event, input: { name: string; nodeId: string; path: string }) => {
    const site = sites.create(input);
    broadcast({ type: "sites:updated", payload: sites.list() });
    return site;
  });
  ipcMain.handle("sites:publish", async (_event, id: string) => {
    const site = await sites.publish(id);
    broadcast({ type: "sites:updated", payload: sites.list() });
    return site;
  });
  ipcMain.handle("sites:delete", async (_event, id: string) => {
    sites.remove(id);
    broadcast({ type: "sites:updated", payload: sites.list() });
  });
  ipcMain.handle("sites:deploy", async (_event, id: string, provider: "cloudflare" | "github-pages") => {    const deployment = await deploy.deploy(id, provider);
    audit("site-deploy", { siteId: id, provider, url: deployment.url });
    broadcast({ type: "sites:updated", payload: sites.list() });
    return deployment;
  });
  ipcMain.handle("sites:access", async (_event, id: string, enabled: boolean) => {
    const site = sites.setAccess(id, enabled);
    broadcast({ type: "sites:updated", payload: sites.list() });
    return site;
  });
  ipcMain.handle("sites:domain", (_event, id: string, domain: string) => deploy.addCloudflareDomain(id, domain));
  ipcMain.handle("sites:cloudflare-access", (_event, id: string, domain: string, emails: string[]) => deploy.configureCloudflareAccess(id, domain, emails));

  const connectorState = () => ({
    "cloudflare.token": store.hasSecret("cloudflare.token"),
    "github.token": store.hasSecret("github.token"),
    "slack.webhook": store.hasSecret("slack.webhook"),
    "linear.token": store.hasSecret("linear.token"),
    "figma.token": store.hasSecret("figma.token"),
    "oauth.github.secret": store.hasSecret("oauth.github.secret"),
    "oauth.slack.secret": store.hasSecret("oauth.slack.secret"),
    "oauth.linear.secret": store.hasSecret("oauth.linear.secret"),
    "oauth.figma.secret": store.hasSecret("oauth.figma.secret"),
  });
  ipcMain.handle("connectors:secrets", () => connectorState());
  ipcMain.handle("connectors:set-secret", (_event, key: string, value: string) => {
    if (!key) throw new Error("Secret name required");
    store.setSecret(key, value);
    audit("connector-secret", { key, set: !!value });
    return connectorState();
  });
  ipcMain.handle("oauth:connect", (_event, provider: string) => oauth.connect(provider));
  ipcMain.handle("connectors:test", async (_event, provider: string) => {    const signal = AbortSignal.timeout(20_000);
    try {
      if (provider === "cloudflare") {
        const token = store.getSecret("cloudflare.token");
        if (!token) return { ok: false, output: "No Cloudflare API token saved." };
        const response = await fetch("https://api.cloudflare.com/client/v4/user/tokens/verify", { headers: { authorization: `Bearer ${token}` }, signal });
        const data = (await response.json().catch(() => ({}))) as any;
        return { ok: response.ok && data.success !== false, output: response.ok ? `Token ${data.result?.status ?? "active"}` : JSON.stringify(data.errors ?? data).slice(0, 300) };
      }
      if (provider === "github") {
        const token = store.getSecret("github.token");
        if (!token) return { ok: false, output: "No GitHub token saved." };
        const response = await fetch("https://api.github.com/user", { headers: { authorization: `Bearer ${token}`, accept: "application/vnd.github+json" }, signal });
        const data = (await response.json().catch(() => ({}))) as any;
        return { ok: response.ok, output: response.ok ? `Signed in as ${data.login}` : String(data.message ?? response.status) };
      }
      if (provider === "slack") {
        const webhook = store.getSecret("slack.webhook");
        if (webhook) {
          const response = await fetch(webhook, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text: "Perch connected." }), signal });
          return { ok: response.ok, output: response.ok ? "Test message sent." : `Slack returned ${response.status}` };
        }
        const token = store.getSecret("slack.token");
        if (!token) return { ok: false, output: "No Slack token or webhook saved." };
        const response = await fetch("https://slack.com/api/auth.test", { method: "POST", headers: { authorization: `Bearer ${token}`, "content-type": "application/x-www-form-urlencoded" }, signal });
        const data = (await response.json().catch(() => ({}))) as any;
        return { ok: response.ok && data.ok, output: data.ok ? `Signed in to ${data.team ?? "Slack"} as ${data.user ?? "bot"}` : String(data.error ?? response.status) };
      }
      if (provider === "linear") {
        const token = store.getSecret("linear.token");
        if (!token) return { ok: false, output: "No Linear API key saved." };
        const response = await fetch("https://api.linear.app/graphql", {
          method: "POST",
          headers: { authorization: token, "content-type": "application/json" },
          body: JSON.stringify({ query: "{ viewer { name email } }" }),
          signal,
        });
        const data = (await response.json().catch(() => ({}))) as any;
        return { ok: response.ok && !data.errors, output: data.data?.viewer ? `Signed in as ${data.data.viewer.name ?? data.data.viewer.email}` : JSON.stringify(data.errors ?? data).slice(0, 300) };
      }
      if (provider === "figma") {
        const token = store.getSecret("figma.token");
        if (!token) return { ok: false, output: "No Figma token saved." };
        const response = await fetch("https://api.figma.com/v1/me", { headers: { "x-figma-token": token }, signal });
        const data = (await response.json().catch(() => ({}))) as any;
        return { ok: response.ok, output: response.ok ? `Signed in as ${data.handle ?? data.email}` : String(data.message ?? response.status) };
      }
      return { ok: false, output: `Unknown connector: ${provider}` };
    } catch (error) {
      return { ok: false, output: error instanceof Error ? error.message : String(error) };
    }
  });
  ipcMain.handle("mcp:add", (_event, name: string, config: Record<string, unknown>) => settings.addMcpServer(name, config));
  ipcMain.handle("mcp:remove", (_event, name: string) => settings.removeMcpServer(name));
  ipcMain.handle("mcp:import", () => settings.importAgentConfigs());
  ipcMain.handle("mcp:add-cloudflare", () => {    const servers = settings.addMcpServer("cloudflare-api", { type: "http", url: "https://mcp.cloudflare.com/mcp" });
    store.setSettings({ connectors: { ...store.settings.connectors, cloudflare: { ...store.settings.connectors.cloudflare, mcp: true } } });
    return { path: settings.mcpConfigPath(), servers };
  });

  ipcMain.handle("skills:create", (_event, input: { name: string; description: string; body: string }) => settings.createSkill(input));
  ipcMain.handle("skills:read", (_event, path: string) => settings.readSkill(path));
  ipcMain.handle("skills:save", (_event, path: string, content: string) => settings.saveSkill(path, content));
  ipcMain.handle("skills:delete", (_event, path: string) => settings.deleteSkill(path));

  ipcMain.handle("plugins:list", () => plugins.list());
  ipcMain.handle("plugins:preview", (_event, source: string) => plugins.preview(source));
  ipcMain.handle("plugins:install", (_event, source: string, name?: string) => plugins.install(source, name));
  ipcMain.handle("plugins:remove", (_event, name: string) => plugins.remove(name));

  ipcMain.handle("automations:list", () => orchestrator.listAutomations());
  ipcMain.handle("automations:save", (_event, input: any) => orchestrator.saveAutomation(input));
  ipcMain.handle("automations:delete", (_event, id: string) => orchestrator.deleteAutomation(id));
  ipcMain.handle("automations:run", (_event, id: string) => orchestrator.runAutomation(id).then(() => undefined));
  ipcMain.handle("audit:list", (_event, limit?: number) => readAudit(limit ?? 200));
  ipcMain.handle("remote:info", () => remote.info());
  ipcMain.handle("remote:start", () => remote.start());
  ipcMain.handle("remote:stop", () => remote.stop());
  ipcMain.handle("remote:rotate", () => {
    remote.rotateToken();
    return remote.info();
  });
  ipcMain.handle("maintenance:sweep", (_event, dryRun?: boolean) =>
    collectGarbage(store.baseDir, { nodes: store.nodes, threads: store.threads }, { dryRun: dryRun !== false }),
  );
  ipcMain.handle("remote:targets", () => remote.listTargets());
  ipcMain.handle("remote:target:add", (_event, input) => remote.addTarget(input));
  ipcMain.handle("remote:target:pair", (_event, input: string) => remote.pairTarget(input));
  ipcMain.handle("remote:target:remove", (_event, id: string) => remote.removeTarget(id));
  ipcMain.handle("remote:target:test", (_event, id: string) => remote.testTarget(id));
  ipcMain.handle("remote:move", (_event, threadId: string, targetId: string, mode?: "wait" | "stop") => remote.moveThread(threadId, targetId, mode));
  ipcMain.handle("relay:info", () => relay.info());
  ipcMain.handle("relay:configure", (_event, input) => relay.configure(input));
  ipcMain.handle("relay:start", () => relay.start());
  ipcMain.handle("relay:stop", () => relay.stop());
  ipcMain.handle("remote:export", (_event, threadId: string) => remote.exportThreadBundle(threadId));
  ipcMain.handle("remote:import", (_event, bundle: string) => remote.importThreadBundle(bundle));
  ipcMain.handle("remote:sync", () => remote.syncRemoteThreads());
  ipcMain.handle("mobile:status", () => mobile.available());
  ipcMain.handle("mobile:devices", () => mobile.devices());
  ipcMain.handle("mobile:avds", () => mobile.avds());
  ipcMain.handle("mobile:start", (_event, name: string) => mobile.startAvd(name));
  ipcMain.handle("mobile:screenshot", (_event, device?: string) => mobile.screenshot(device));
  ipcMain.handle("mobile:tap", (_event, device: string | undefined, x: number, y: number) => mobile.tap(device, x, y));
  ipcMain.handle("mobile:text", (_event, device: string | undefined, text: string) => mobile.text(device, text));
  ipcMain.handle("mobile:key", (_event, device: string | undefined, key: string) => mobile.key(device, key));
  ipcMain.handle("mobile:swipe", (_event, device: string | undefined, x1: number, y1: number, x2: number, y2: number) => mobile.swipe(device, x1, y1, x2, y2));

  ipcMain.handle("dialog:pick-directory", async () => {
    const result = await dialog.showOpenDialog({ properties: ["openDirectory", "createDirectory"] });
    return result.canceled ? null : result.filePaths[0] ?? null;
  });
  ipcMain.handle("shell:open-external", (_event, url: string) => shell.openExternal(url));
  ipcMain.handle("browser:open", (_event, url: string) => {
    if (/^https?:\/\//i.test(url)) openBrowser(url);
  });
  ipcMain.handle("browser:devtools", () => browser.history());
  ipcMain.handle("browser:pick", () => browser.pickElement());
  ipcMain.handle("browser:popout", (_event, url: string) => {
    if (/^https?:\/\//i.test(url)) popOutBrowser(url);
  });
  ipcMain.handle("browser:screenshot", () => browser.screenshot());
  ipcMain.handle("browser:diff", (_event, before: string, after: string) => browser.compare(before, after));
  ipcMain.handle("pane:popout", (_event, input: { kind: PaneKind; threadId?: string; diff?: PaneDiff }) => popOutPane(input));
  ipcMain.handle("pane:data", (_event, kind: PaneKind) => getPaneData(kind));
  ipcMain.handle("window:close", (event) => BrowserWindow.fromWebContents(event.sender)?.close());

  ipcMain.handle("pty:list", () => pty.list());
  ipcMain.handle("pty:start", (_event, input) => pty.start(input ?? {}));
  ipcMain.handle("pty:write", (_event, id: string, data: string) => pty.write(id, data));
  ipcMain.handle("pty:resize", (_event, id: string, cols: number, rows: number) => pty.resize(id, cols, rows));
  ipcMain.handle("pty:read", (_event, id: string) => pty.read(id));
  ipcMain.handle("pty:kill", (_event, id: string) => pty.kill(id));
  ipcMain.handle("pty:dev-start", (_event, input) => pty.startDevServer(input));

  ipcMain.handle("files:list", (_event, input) => workspace.listFiles(input ?? {}));
  ipcMain.handle("files:symbols", (_event, input) => workspace.searchSymbols(input ?? {}));
  ipcMain.handle("files:content", (_event, input) => workspace.searchContent(input));
  ipcMain.handle("files:map", (_event, input) => workspace.map(input ?? {}));
  ipcMain.handle("files:attach-image", (_event, input) => workspace.attachImage(input));
  ipcMain.handle("shell:open-path", (_event, path: string) => shell.openPath(path));

  ipcMain.handle("engine:download", async () => {
    engine.setProgressHandler((status) => broadcast({ type: "engine:progress", payload: status }));
    return engine.download();
  });
  ipcMain.handle("app:restart", () => {
    app.relaunch();
    app.exit(0);
  });

  ipcMain.handle("window:minimize", () => undefined);
  ipcMain.handle("window:maximize", () => undefined);
  ipcMain.handle("window:theme", (_event, theme: "light" | "dark") => {
    const win = BrowserWindow.getAllWindows()[0];
    if (!win) return;
    const dark = theme === "dark";
    win.setBackgroundColor(dark ? "#141417" : "#f7f7f8");
    win.setTitleBarOverlay({
      color: dark ? "#17171b" : "#f7f7f8",
      symbolColor: dark ? "#e6e6ef" : "#3b3b43",
      height: 40,
    });
  });
}













