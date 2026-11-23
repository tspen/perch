import { contextBridge, ipcRenderer } from "electron";
import type { AppEvent, PerchApi } from "../shared/types";

const invoke = (channel: string, ...args: unknown[]) => ipcRenderer.invoke(channel, ...args);

const api: PerchApi = {
  getSnapshot: () => invoke("state:get") as Promise<any>,
  getThreadMessages: (threadId) => invoke("thread:messages", threadId) as Promise<any>,
  getEnvelopes: (filter) => invoke("envelopes:list", filter) as Promise<any>,

  createNode: (req) => invoke("node:create", req) as Promise<any>,
  updateNode: (id, patch) => invoke("node:update", id, patch) as Promise<any>,
  setNodeApproval: (id, mode) => invoke("node:set-approval", id, mode) as Promise<any>,
  deleteNode: (id) => invoke("node:delete", id) as Promise<any>,
  createThread: (req) => invoke("thread:create", req) as Promise<any>,
  updateThread: (id, patch) => invoke("thread:update", id, patch) as Promise<any>,
  deleteThread: (id) => invoke("thread:delete", id) as Promise<any>,
  resolveThread: (id, note) => invoke("thread:resolve", id, note) as Promise<any>,
  send: (req) => invoke("thread:send", req) as Promise<any>,
  stopThread: (id) => invoke("thread:stop", id) as Promise<any>,
  restartThread: (id) => invoke("thread:restart", id) as Promise<any>,
  continueThread: (id) => invoke("thread:continue", id) as Promise<any>,
  compactThread: (id) => invoke("thread:compact", id) as Promise<any>,
  pauseThread: (id) => invoke("thread:pause", id) as Promise<any>,
  resumeThread: (id) => invoke("thread:resume", id) as Promise<any>,
  setThreadModel: (id, selector) => invoke("thread:set-model", id, selector) as Promise<any>,
  setThreadEffort: (id, effort) => invoke("thread:set-effort", id, effort) as Promise<any>,
  focusThread: (id) => invoke("thread:focus", id) as Promise<any>,
  forkThread: (id, entryId) => invoke("thread:fork", id, entryId) as Promise<any>,
  branchThread: (id, entryId) => invoke("thread:branch", id, entryId) as Promise<any>,
  navigateThread: (id, entryId, summarize) => invoke("thread:navigate", id, entryId, summarize) as Promise<any>,
  getThreadEntries: (id) => invoke("thread:entries", id) as Promise<any>,
  goalThread: (id, op, objective, tokenBudget) => invoke("thread:goal", id, op, objective, tokenBudget) as Promise<any>,
  exportThread: (id) => invoke("thread:export", id) as Promise<any>,
  exportThreadPdf: (id) => invoke("thread:export-pdf", id) as Promise<any>,
  exportThreadDocx: (id) => invoke("thread:export-docx", id) as Promise<any>,
  listCheckpoints: (threadId) => invoke("checkpoints:list", threadId) as Promise<any>,
  createCheckpoint: (threadId, label) => invoke("checkpoints:create", threadId, label) as Promise<any>,
  restoreCheckpoint: (id, mode) => invoke("checkpoints:restore", id, mode) as Promise<any>,

  sendEnvelope: (req) => invoke("envelope:send", req) as Promise<any>,
  answerEnvelope: (id, body) => invoke("envelope:answer", id, body) as Promise<any>,
  markEnvelopeRead: (id) => invoke("envelope:read", id) as Promise<any>,

  listMemory: (nodeId, query) => invoke("memory:list", nodeId, query) as Promise<any>,
  addMemory: (nodeId, text, tags, importance) => invoke("memory:add", nodeId, text, tags, importance) as Promise<any>,
  updateMemory: (id, patch) => invoke("memory:update", id, patch) as Promise<any>,
  deleteMemory: (id) => invoke("memory:delete", id) as Promise<any>,
  consolidateMemory: (nodeId) => invoke("memory:consolidate", nodeId) as Promise<any>,

  saveEnvironment: (env) => invoke("env:save", env) as Promise<any>,
  deleteEnvironment: (id) => invoke("env:delete", id) as Promise<any>,
  testEnvironment: (id) => invoke("env:test", id) as Promise<any>,

  getGitStatus: (nodeId, threadId) => invoke("git:status", nodeId, threadId) as Promise<any>,
  getGitDiff: (nodeId, threadId, path) => invoke("git:diff", nodeId, threadId, path) as Promise<any>,
  readFile: (path) => invoke("git:read-file", path) as Promise<any>,
  gitCommit: (nodeId, threadId, message, paths) => invoke("git:commit", nodeId, threadId, message, paths) as Promise<any>,
  gitMerge: (nodeId, threadId) => invoke("git:merge", nodeId, threadId) as Promise<any>,
  gitCreatePr: (nodeId, threadId, title, body) => invoke("git:pr", nodeId, threadId, title, body) as Promise<any>,
  gitDiscard: (nodeId, threadId) => invoke("git:discard", nodeId, threadId) as Promise<any>,
  gitRejectHunk: (nodeId, threadId, path, patch) => invoke("git:reject-hunk", nodeId, threadId, path, patch) as Promise<any>,
  getPrStatus: (nodeId, threadId) => invoke("pr:status", nodeId, threadId) as Promise<any>,
  listCiRuns: (nodeId, threadId) => invoke("ci:runs", nodeId, threadId) as Promise<any>,
  getCiLogs: (nodeId, threadId, runId) => invoke("ci:logs", nodeId, threadId, runId) as Promise<any>,
  rerunCi: (nodeId, threadId, runId) => invoke("ci:rerun", nodeId, threadId, runId) as Promise<any>,
  mergePr: (nodeId, threadId, number) => invoke("pr:merge", nodeId, threadId, number) as Promise<any>,
  commentPr: (nodeId, threadId, number, body) => invoke("pr:comment", nodeId, threadId, number, body) as Promise<any>,

  updateSettings: (patch) => invoke("settings:update", patch) as Promise<any>,
  completeOnboarding: (payload) => invoke("settings:complete-onboarding", payload) as Promise<any>,
  getPiConfig: () => invoke("pi-config:get") as Promise<any>,
  setPiConfig: (key, value) => invoke("pi-config:set", key, value) as Promise<any>,
  resetPiConfig: (key) => invoke("pi-config:reset", key) as Promise<any>,

  listTools: () => invoke("tools:list") as Promise<any>,
  setTool: (name, enabled, approval) => invoke("tools:set", name, enabled, approval) as Promise<any>,
  listSkills: () => invoke("skills:list") as Promise<any>,
  listMcpServers: () => invoke("mcp:list") as Promise<any>,
  listProviders: () => invoke("providers:list") as Promise<any>,
  disconnectProvider: (id) => invoke("providers:disconnect", id) as Promise<any>,
  connectProvider: (id, apiKey) => invoke("providers:connect", id, apiKey) as Promise<any>,

  refreshModels: () => invoke("models:refresh") as Promise<any>,
  getModelDefaults: () => invoke("models:defaults") as Promise<any>,
  setModelDefault: (role, selector) => invoke("models:set-default", role, selector) as Promise<any>,
  resetModelDefaults: () => invoke("models:reset-defaults") as Promise<any>,
  refreshAA: () => invoke("models:refresh-aa") as Promise<any>,
  refreshUsage: () => invoke("usage:refresh") as Promise<any>,

  runTerminal: (req) => invoke("terminal:run", req) as Promise<any>,
  killTerminal: (runId) => invoke("terminal:kill", runId) as Promise<any>,
  listTerminals: () => invoke("terminal:list") as Promise<any>,

  listArtifacts: (filter) => invoke("artifacts:list", filter) as Promise<any>,
  readArtifact: (id) => invoke("artifacts:read", id) as Promise<any>,

  listNotifications: () => invoke("notifications:list") as Promise<any>,
  markNotificationRead: (id) => invoke("notifications:read", id) as Promise<any>,
  markAllNotificationsRead: () => invoke("notifications:read-all") as Promise<any>,
  clearNotifications: () => invoke("notifications:clear") as Promise<any>,

  respondApproval: (id, response) => invoke("approval:respond", id, response) as Promise<any>,

  shareThread: (threadId) => invoke("share:create", threadId) as Promise<any>,
  stopShare: () => invoke("share:stop") as Promise<any>,

  listSites: () => invoke("sites:list") as Promise<any>,
  createSite: (input) => invoke("sites:create", input) as Promise<any>,
  publishSite: (id) => invoke("sites:publish", id) as Promise<any>,
  deleteSite: (id) => invoke("sites:delete", id) as Promise<any>,
  deploySite: (id, provider) => invoke("sites:deploy", id, provider) as Promise<any>,
  setSiteAccess: (id, enabled) => invoke("sites:access", id, enabled) as Promise<any>,
  addSiteDomain: (id, domain) => invoke("sites:domain", id, domain) as Promise<any>,
  configureCloudflareAccess: (id, domain, emails) => invoke("sites:cloudflare-access", id, domain, emails) as Promise<any>,

  connectorSecrets: () => invoke("connectors:secrets") as Promise<any>,
  setConnectorSecret: (key, value) => invoke("connectors:set-secret", key, value) as Promise<any>,
  testConnector: (provider) => invoke("connectors:test", provider) as Promise<any>,
  connectOAuth: (provider) => invoke("oauth:connect", provider) as Promise<any>,
  addMcpServer: (name, config) => invoke("mcp:add", name, config) as Promise<any>,
  removeMcpServer: (name) => invoke("mcp:remove", name) as Promise<any>,
  addCloudflareMcp: () => invoke("mcp:add-cloudflare") as Promise<any>,
  importAgentConfigs: () => invoke("mcp:import") as Promise<any>,

  createSkill: (input) => invoke("skills:create", input) as Promise<any>,
  readSkill: (path) => invoke("skills:read", path) as Promise<any>,
  saveSkill: (path, content) => invoke("skills:save", path, content) as Promise<any>,
  deleteSkill: (path) => invoke("skills:delete", path) as Promise<any>,

  listPlugins: () => invoke("plugins:list") as Promise<any>,
  previewPlugin: (source) => invoke("plugins:preview", source) as Promise<any>,
  installPlugin: (source, name) => invoke("plugins:install", source, name) as Promise<any>,
  removePlugin: (name) => invoke("plugins:remove", name) as Promise<any>,

  listAutomations: () => invoke("automations:list") as Promise<any>,
  saveAutomation: (input) => invoke("automations:save", input) as Promise<any>,
  deleteAutomation: (id) => invoke("automations:delete", id) as Promise<any>,
  runAutomation: (id) => invoke("automations:run", id) as Promise<any>,
  listAudit: (limit) => invoke("audit:list", limit) as Promise<any>,

  remoteInfo: () => invoke("remote:info") as Promise<any>,
  startRemote: () => invoke("remote:start") as Promise<any>,
  stopRemote: () => invoke("remote:stop") as Promise<any>,
  rotateRemoteToken: () => invoke("remote:rotate") as Promise<any>,
  maintenanceSweep: (dryRun?: boolean) => invoke("maintenance:sweep", dryRun) as Promise<any>,
  listRemoteTargets: () => invoke("remote:targets") as Promise<any>,
  addRemoteTarget: (input: unknown) => invoke("remote:target:add", input) as Promise<any>,
  pairRemoteTarget: (input: string) => invoke("remote:target:pair", input) as Promise<any>,
  removeRemoteTarget: (id: string) => invoke("remote:target:remove", id) as Promise<any>,
  testRemoteTarget: (id: string) => invoke("remote:target:test", id) as Promise<any>,
  moveThreadToTarget: (threadId: string, targetId: string, mode?: "wait" | "stop") => invoke("remote:move", threadId, targetId, mode) as Promise<any>,
  relayInfo: () => invoke("relay:info") as Promise<any>,
  configureRelay: (input: unknown) => invoke("relay:configure", input) as Promise<any>,
  startRelay: () => invoke("relay:start") as Promise<any>,
  stopRelay: () => invoke("relay:stop") as Promise<any>,
  exportThreadBundle: (threadId: string) => invoke("remote:export", threadId) as Promise<any>,
  importThreadBundle: (bundle: string) => invoke("remote:import", bundle) as Promise<any>,
  syncRemoteSessions: () => invoke("remote:sync") as Promise<any>,

  mobileStatus: () => invoke("mobile:status") as Promise<any>,
  listMobileDevices: () => invoke("mobile:devices") as Promise<any>,
  listAvds: () => invoke("mobile:avds") as Promise<any>,
  startAvd: (name) => invoke("mobile:start", name) as Promise<any>,
  mobileScreenshot: (device) => invoke("mobile:screenshot", device) as Promise<any>,
  mobileTap: (device, x, y) => invoke("mobile:tap", device, x, y) as Promise<any>,
  mobileText: (device, text) => invoke("mobile:text", device, text) as Promise<any>,
  mobileKey: (device, key) => invoke("mobile:key", device, key) as Promise<any>,
  mobileSwipe: (device, x1, y1, x2, y2) => invoke("mobile:swipe", device, x1, y1, x2, y2) as Promise<any>,

  pickDirectory: () => invoke("dialog:pick-directory") as Promise<any>,
  setWindowTheme: (theme) => invoke("window:theme", theme) as Promise<any>,
  openExternal: (url) => invoke("shell:open-external", url) as Promise<any>,
  openBrowser: (url) => invoke("browser:open", url) as Promise<any>,
  getBrowserDevtools: () => invoke("browser:devtools") as Promise<any>,
  pickBrowserElement: () => invoke("browser:pick") as Promise<any>,
  popOutBrowser: (url) => invoke("browser:popout", url) as Promise<any>,
  popOutPane: (input) => invoke("pane:popout", input) as Promise<any>,
  getPaneData: (kind) => invoke("pane:data", kind) as Promise<any>,
  closeWindow: () => invoke("window:close") as Promise<any>,
  captureBrowser: () => invoke("browser:screenshot") as Promise<any>,
  compareBrowserScreenshots: (before, after) => invoke("browser:diff", before, after) as Promise<any>,

  listPtySessions: () => invoke("pty:list") as Promise<any>,
  startPty: (input) => invoke("pty:start", input) as Promise<any>,
  writePty: (id, data) => invoke("pty:write", id, data) as Promise<any>,
  resizePty: (id, cols, rows) => invoke("pty:resize", id, cols, rows) as Promise<any>,
  readPty: (id) => invoke("pty:read", id) as Promise<any>,
  killPty: (id) => invoke("pty:kill", id) as Promise<any>,
  startDevServer: (input) => invoke("pty:dev-start", input) as Promise<any>,

  listWorkspaceFiles: (input) => invoke("files:list", input) as Promise<any>,
  searchWorkspaceSymbols: (input) => invoke("files:symbols", input) as Promise<any>,
  searchWorkspaceContent: (input) => invoke("files:content", input) as Promise<any>,
  workspaceMap: (input) => invoke("files:map", input) as Promise<any>,
  attachImage: (input) => invoke("files:attach-image", input) as Promise<any>,
  openPath: (path) => invoke("shell:open-path", path) as Promise<any>,
  downloadEngine: () => invoke("engine:download") as Promise<any>,
  restartApp: () => invoke("app:restart") as Promise<any>,

  onEvent: (cb) => {
    const listener = (_event: Electron.IpcRendererEvent, event: AppEvent) => cb(event);
    ipcRenderer.on("perch:event", listener);
    return () => ipcRenderer.removeListener("perch:event", listener);
  },
};

contextBridge.exposeInMainWorld("perch", api);












