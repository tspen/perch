import React, { useEffect, useMemo, useState } from "react";
import {
  Activity,
  Bell,
  Check,
  CircleStop,
  Cloud,
  ChevronDown,
  ChevronRight,
  Clock,
  Cpu,
  Copy,
  Download,
  ExternalLink,
  Folder,
  FolderGit2,
  Gauge,
  KeyRound,
  MemoryStick,
  Package,
  Pause,
  Play,
  Power,
  QrCode,
  Plug,
  Plus,
  RefreshCw,
  Save,
  Search,
  Settings2,
  Shield,
  SlidersHorizontal,
  Sparkles,
  Terminal,
  Trash2,
  Wifi,
  Wrench,
  X,
} from "lucide-react";
import type { ApprovalMode, AuditEntry, Automation, Environment, EnvVar, InstalledPlugin, McpServerInfo, ModelInfo, PiConfigEntry, PluginPreview, ProviderInfo, MaintenanceReport, RelayInfo, RemoteInfo, RemoteTarget, SkillInfo, ToolApproval, ToolInfo } from "../../../shared/types";
import { selectedNode, selectedThread, useApp } from "../store";
import { Badge, Button, Field, IconButton, Modal, Select, Spinner, Toggle, cx, formatCost, formatNumber, relativeTime, statusLabel, truncate } from "./Common";
import { ModelPicker } from "./ModelPicker";
import { playSound } from "../sounds";

const TABS = [
  { id: "general", label: "General", icon: <Settings2 size={15} /> },
  { id: "workspace", label: "Workspace", icon: <FolderGit2 size={15} /> },
  { id: "models", label: "Models", icon: <Sparkles size={15} /> },
  { id: "tools", label: "Tools", icon: <Wrench size={15} /> },
  { id: "remote", label: "Remote", icon: <Wifi size={15} /> },
  { id: "advanced", label: "Advanced", icon: <SlidersHorizontal size={15} /> },
] as const;

export function SettingsModal() {
  const state = useApp();
  const requestedTab = state.settingsTab;
  const tab = TABS.some((item) => item.id === requestedTab) ? requestedTab : "general";
  const node = selectedNode(state);
  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && state.setOverlay("none")}>
      <div className="settings-modal" role="dialog" aria-modal="true">
        <aside className="settings-nav">
          <div className="settings-brand">
            <div className="settings-brand-icon"><Settings2 size={16} /></div>
            <div>
              <strong>Settings</strong>
              <span>{node?.name ?? "Perch"}</span>
            </div>
          </div>
          <nav>
            {TABS.map((item) => (
              <button key={item.id} type="button" className={cx(tab === item.id && "active")} onClick={() => state.setSettingsTab(item.id)}>
                {item.icon}
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
        </aside>
        <section className="settings-content">
          <header className="settings-head">
            <div>
              <h2>{TABS.find((item) => item.id === tab)?.label}</h2>
              <p>{settingsBlurb(tab)}</p>
            </div>
            <IconButton icon={<X size={17} />} label="Close settings" onClick={() => state.setOverlay("none")} />
          </header>
          <div className="settings-scroll">
            {tab === "general" ? <GeneralTab /> : null}
            {tab === "workspace" ? <WorkspaceTab /> : null}
            {tab === "models" ? <ModelsTab /> : null}
            {tab === "tools" ? <ToolsTab /> : null}
            {tab === "remote" ? <RemoteTab /> : null}
            {tab === "advanced" ? <AdvancedTab /> : null}
          </div>
        </section>
      </div>
    </div>
  );
}

function settingsBlurb(tab: string): string {
  switch (tab) {
    case "general":
      return "Appearance, defaults and notifications.";
    case "workspace":
      return "Rename, move and configure the selected project or group.";
    case "models":
      return "Choose the model each level uses. The defaults are tuned for quality and cost.";
    case "tools":
      return "Tools follow the approval mode by default. Override individual tools only when you need to.";
    case "remote":
      return "Scan once to use Perch from your phone, or connect another machine.";
    case "advanced":
      return "Rarely used defaults and integrations. Most people never need this page.";
    default:
      return "";
  }
}

function Section({ title, subtitle, children, right }: { title: string; subtitle?: string; children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <section className="setting-section">
      <div className="setting-section-head">
        <div>
          <h3>{title}</h3>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
        {right}
      </div>
      <div className="setting-section-body">{children}</div>
    </section>
  );
}

function Disclosure({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <section className={cx("setting-section", "setting-disclosure", open && "open")}>
      <button type="button" className="setting-section-head disclosure-head" onClick={() => setOpen((value) => !value)}>
        <div>
          <h3>{title}</h3>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
        {open ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
      </button>
      {open ? <div className="setting-section-body">{children}</div> : null}
    </section>
  );
}

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="setting-row">
      <div className="setting-row-text">
        <strong>{label}</strong>
        {hint ? <span>{hint}</span> : null}
      </div>
      <div className="setting-row-control">{children}</div>
    </div>
  );
}

function GeneralTab() {
  const state = useApp();
  const settings = state.snapshot?.settings;
  if (!settings) return null;
  const update = (patch: any) => state.updateSettings({ settings: patch });
  return (
    <>
      <Section title="Appearance & behavior" subtitle="These settings apply to the whole cockpit.">
        <Row label="Theme" hint="Light is the default; dark is available for low-light work.">
          <Select value={settings.theme} onChange={(value) => update({ theme: value })}>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
            <option value="system">System</option>
          </Select>
        </Row>
        <Row label="Workspace root" hint="New projects and groups are created as folders named after them here. Existing nodes keep their paths.">
          <div className="inline-actions">
            <input value={settings.workspaceRoot ?? ""} onChange={(event) => update({ workspaceRoot: event.target.value })} placeholder="C:\\Users\\you\\code" />
            <Button size="sm" variant="soft" onClick={async () => { const picked = await window.perch.pickDirectory(); if (picked) update({ workspaceRoot: picked }); }}><Folder size={13} /> Browse</Button>
          </div>
        </Row>
        <Row label="Default tool approval" hint="Auto-approve all runs every tool call without asking, including shell and destructive commands. Applies to new nodes and sessions.">
          <div className="inline-actions">
            <Select value={settings.defaultApprovalMode ?? "yolo"} onChange={(value) => update({ defaultApprovalMode: value as ApprovalMode })}>
              <option value="yolo">Auto-approve all</option>
              <option value="write">Auto-approve writes</option>
              <option value="always-ask">Ask each time</option>
            </Select>
            <Button size="sm" variant="soft" onClick={async () => {
              const mode = (settings.defaultApprovalMode ?? "yolo") as ApprovalMode;
              for (const item of state.snapshot?.nodes ?? []) await window.perch.setNodeApproval(item.id, mode);
              await state.refresh();
            }}>Apply to all</Button>
          </div>
        </Row>
        <Row label="Auto-name threads" hint="Uses the cheap naming model to name threads and refresh long-running worker titles every few turns.">
          <Toggle checked={settings.autoName} onChange={(value) => update({ autoName: value })} />
        </Row>
        <Row label="Report upward automatically" hint="Each completed thread sends a compact result to its parent orchestrator.">
          <Toggle checked={settings.autoReport} onChange={(value) => update({ autoReport: value })} />
        </Row>
        <Row label="Wake parent on report" hint="If the parent is parked, a child report starts it. Disable to queue reports silently.">
          <Toggle checked={settings.autoWakeParent} onChange={(value) => update({ autoWakeParent: value })} />
        </Row>
        <Row label="Show thinking blocks" hint="Display model reasoning inline.">
          <Toggle checked={settings.ui.showThinking} onChange={(value) => update({ ui: { ...settings.ui, showThinking: value } })} />
        </Row>
        <Row label="Interface sounds" hint="Quiet chimes when you send, when a thread completes or asks for input, and when a turn fails.">
          <div className="inline-actions">
            <Toggle checked={settings.ui.sounds !== false} onChange={(value) => update({ ui: { ...settings.ui, sounds: value } })} />
            <input
              className="sound-volume"
              type="range"
              min={0}
              max={1}
              step={0.05}
              disabled={settings.ui.sounds === false}
              value={settings.ui.soundVolume ?? 0.25}
              onChange={(event) => update({ ui: { ...settings.ui, soundVolume: Number(event.target.value) } })}
            />
            <Button size="sm" variant="ghost" disabled={settings.ui.sounds === false} onClick={() => playSound("complete", { enabled: true, volume: settings.ui.soundVolume ?? 0.25 })}><Play size={12} /> Test</Button>
          </div>
        </Row>
      </Section>

      <Disclosure title="Advanced defaults" subtitle="Intervals, concurrency, compaction, shell and setup.">
        <Row label="Tree summary interval" hint="Minutes between a roll-up of running, waiting and failed threads. 0 disables summaries.">
          <input className="num-input" type="number" min={0} value={settings.digestIntervalMin} onChange={(event) => update({ digestIntervalMin: Number(event.target.value) })} />
        </Row>
        <Row label="Status check interval" hint="Minutes between Mission Control status requests to child orchestrators. 0 disables them.">
          <input className="num-input" type="number" min={0} value={settings.statusCheckIntervalMin ?? 15} onChange={(event) => update({ statusCheckIntervalMin: Number(event.target.value) })} />
        </Row>
        <Row label="Max concurrent Pi sessions" hint="Idle sessions are parked to stay under this cap.">
          <input className="num-input" type="number" min={1} max={32} value={settings.maxConcurrentThreads} onChange={(event) => update({ maxConcurrentThreads: Number(event.target.value) })} />
        </Row>
        <Row label="Auto-compact context" hint="Pi summarizes older history as the context window fills, including mid-turn.">
          <Toggle checked={settings.contextCompaction !== false} onChange={(value) => update({ contextCompaction: value })} />
        </Row>
        <Row label="Background compact idle sessions" hint="Summarize idle sessions in the background when their context is above the threshold.">
          <Toggle checked={settings.idleCompaction !== false} onChange={(value) => update({ idleCompaction: value })} />
        </Row>
        <Row label="Idle compaction threshold" hint="Percent of the context window that triggers background compaction.">
          <input className="num-input" type="number" min={30} max={95} step={5} disabled={settings.idleCompaction === false} value={settings.idleCompactionThreshold ?? 60} onChange={(event) => update({ idleCompactionThreshold: Number(event.target.value) })} />
        </Row>
        <Row label="Terminal shell" hint="Blank uses PowerShell on Windows and $SHELL elsewhere.">
          <input value={settings.terminalShell ?? ""} onChange={(event) => update({ terminalShell: event.target.value })} placeholder="powershell.exe" />
        </Row>
        <Row label="Auto-open preview URLs" hint="Open localhost URLs printed by a terminal in the in-app Browser.">
          <Toggle checked={settings.previewAutoOpen !== false} onChange={(value) => update({ previewAutoOpen: value })} />
        </Row>
        <Row label="Advisor runtime" hint="Passively reviews each turn and injects notes. More tokens, more scrutiny.">
          <Toggle checked={settings.advisor} onChange={(value) => update({ advisor: value })} />
        </Row>
        <Row label="Auto-resolve finished workers" hint="Archive completed worker threads after 30 seconds so the tree stays focused. Results stay in Messages and Artifacts.">
          <Toggle checked={settings.autoResolveWorkers !== false} onChange={(value) => update({ autoResolveWorkers: value })} />
        </Row>
        <Row label="Setup wizard" hint="Re-run provider connection and model selection.">
          <Button size="sm" variant="soft" onClick={() => void state.updateSettings({ settings: { onboardingCompleted: false } })}>Run setup again</Button>
        </Row>
      </Disclosure>

      <NotificationsSection />


    </>
  );
}

function WorkspaceTab() {
  const state = useApp();
  const node = selectedNode(state);
  const thread = selectedThread(state);
  const [name, setName] = useState(node?.name ?? "");
  const [path, setPath] = useState(node?.path ?? "");
  useEffect(() => { setName(node?.name ?? ""); setPath(node?.path ?? ""); }, [node?.id]);
  if (!node) return <div className="settings-loading"><Spinner /> Loading workspace...</div>;
  return (
    <>
      <Section title="Selected node" subtitle="Rename, move, isolate and remove the selected project or group." right={<div className="inline-actions"><Badge tone={node.type === "root" ? "accent" : node.type === "group" ? "blue" : "green"}>{node.type}</Badge><Button size="sm" variant="soft" disabled={!name.trim()} onClick={() => void window.perch.updateNode(node.id, { name, path }).then(() => state.refresh())}><Save size={13} /> Save node</Button></div>}>
        <Row label="Name">
          <div className="inline-actions">
            <input value={name} onChange={(event) => setName(event.target.value)} />
          </div>
        </Row>
        <Row label="Path" hint="Projects use this repo path; groups use a workspace directory.">
          <div className="inline-actions">
            <input value={path} onChange={(event) => setPath(event.target.value)} />
            <Button size="sm" variant="soft" onClick={async () => { const picked = await window.perch.pickDirectory(); if (picked) setPath(picked); }}><Folder size={13} /> Browse</Button>
          </div>
        </Row>
        {node.type !== "root" ? (
        <Row label="Parent" hint="Move this node under another group or the root. Existing child nodes move with it.">
          <Select value={node.parentId ?? ""} onChange={(value) => void window.perch.updateNode(node.id, { parentId: value || null }).then(() => state.refresh())}>
            {(state.snapshot?.nodes ?? []).filter((candidate) => candidate.type !== "project" && candidate.id !== node.id).map((candidate) => (
              <option key={candidate.id} value={candidate.id}>{candidate.name}</option>
            ))}
          </Select>
        </Row>
        ) : null}
        <Row label="Orchestrator model">
          <span className="mono muted">{state.models.find((model) => model.selector === node.model)?.name ?? node.model}</span>
        </Row>
        {node.type !== "root" ? <Row label="Git isolation">
          <Select value={node.gitMode} onChange={(value) => void window.perch.updateNode(node.id, { gitMode: value as any }).then(() => state.refresh())}>
            <option value="auto">Auto (orchestrator decides)</option>
            <option value="shared">Shared checkout</option>
            <option value="branch">Branch per worker</option>
            <option value="worktree">Worktree per worker</option>
          </Select>
        </Row> : null}
        <Row label="Tool approval">
          <Select value={node.approvalMode} onChange={(value) => void window.perch.updateNode(node.id, { approvalMode: value as any }).then(() => state.refresh())}>
            <option value="always-ask">Always ask</option>
            <option value="write">Auto-approve writes</option>
            <option value="yolo">Auto-approve all</option>
          </Select>
        </Row>
        <Row label="Node budget (USD)" hint="Overrides the app budget for this subtree. 0 uses the app budget.">
          <input className="num-input" type="number" min={0} step={1} value={node.budgetUsd ?? ""} onChange={(event) => void window.perch.updateNode(node.id, { budgetUsd: event.target.value ? Number(event.target.value) : undefined }).then(() => state.refresh())} />
        </Row>
        <Row label="Mute this node" hint="Suppresses toasts, not the in-app inbox.">
          <Toggle checked={node.muted} onChange={(value) => void window.perch.updateNode(node.id, { muted: value }).then(() => state.refresh())} />
        </Row>
        {node.type !== "root" ? <Row label="Delete node" hint="Removes app state and child threads. Repository files and branches are left in place.">
          <Button size="sm" variant="danger" onClick={async () => {
            if (!confirm(`Delete ${node.name} and its child threads? Files stay on disk.`)) return;
            await window.perch.deleteNode(node.id);
            await state.refresh();
            await state.selectRoot();
            state.setOverlay("none");
          }}><Trash2 size={13} /> Delete</Button>
        </Row> : null}
        {thread ? (
          <Row label="Current thread">
            <span className="muted">{thread.title} · {statusLabel(thread.status)}</span>
          </Row>
        ) : null}
      </Section>
    </>
  );
}

function ModelsTab() {
  const state = useApp();
  const settings = state.snapshot?.settings;
  const [pick, setPick] = useState<string | null>(null);
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [providerBusy, setProviderBusy] = useState("");
  const [catalogBusy, setCatalogBusy] = useState(false);
  useEffect(() => {
    void window.perch.listProviders().then(setProviders).catch(() => undefined);
  }, []);
  const roles = [
    { key: "root", label: "Root orchestrator", hint: "Above all projects. Best global reasoning." },
    { key: "group", label: "Group orchestrator", hint: "Coordinates a group of projects." },
    { key: "project", label: "Project orchestrator", hint: "Owns a repository and implementation." },
    { key: "worker", label: "Thread / subagent", hint: "Default for spawned worker threads." },
    { key: "naming", label: "Naming", hint: "Cheap model for titles and auto-names." },
    { key: "memory", label: "Memory curator", hint: "Extracts durable memory from completed work." },
  ] as const;
  if (!settings) return null;
  const aaCount = state.models.filter((model) => model.aa?.intelligence != null).length;
  const connectedProviders = providers.filter((provider) => provider.connected && provider.modelCount > 0);
  const refreshCatalog = async () => {
    setCatalogBusy(true);
    try {
      await state.refreshModels();
      setProviders(await window.perch.listProviders());
      state.pushToast({ kind: "success", title: "Model catalog refreshed" });
    } catch (error) {
      state.pushToast({ kind: "error", title: "Could not refresh models", body: String(error) });
    } finally {
      setCatalogBusy(false);
    }
  };
  const disconnect = async (provider: ProviderInfo) => {
    const affected = roles
      .filter((role) => {
        const selector = (settings.models as any)[role.key] as string;
        return state.models.find((model) => model.selector === selector)?.provider === provider.id;
      })
      .map((role) => role.label);
    const warning = affected.length ? `\n\nThese role defaults use it and will need a new model: ${affected.join(", ")}.` : "";
    if (!confirm(`Disconnect ${provider.name}? Stored credentials will be removed.${warning}`)) return;
    setProviderBusy(provider.id);
    try {
      const result = await window.perch.disconnectProvider(provider.id);
      setProviders(result.providers);
      await state.refreshModels();
      state.pushToast({
        kind: affected.length ? "warning" : "info",
        title: `${provider.name} disconnected`,
        body: affected.length ? `Change the ${affected.join(", ")} model${affected.length === 1 ? "" : "s"} before starting a thread.` : "Stored credentials were removed.",
      });
    } catch (error) {
      state.pushToast({ kind: "error", title: "Could not disconnect provider", body: String(error) });
    } finally {
      setProviderBusy("");
    }
  };
  return (
    <>
      <Section title="Role defaults" subtitle="Every level can override this. New threads inherit the role default, then can switch independently." right={<div className="inline-actions"><Button size="sm" variant="soft" disabled={catalogBusy} onClick={() => void refreshCatalog()}>{catalogBusy ? <Spinner size={13} /> : <RefreshCw size={13} />} Refresh catalog</Button><Button size="sm" variant="soft" onClick={() => void state.resetModelDefaults()}><Sparkles size={13} /> Reset to recommended</Button></div>}>
        {roles.map((role) => {
          const selector = (settings.models as any)[role.key] as string;
          const model = state.models.find((item) => item.selector === selector);
          return (
            <div key={role.key} className="role-row">
              <div className="role-copy">
                <strong>{role.label}</strong>
                <span>{role.hint}</span>
                <div className="role-model">
                  <Sparkles size={13} />
                  <span>{model?.name ?? (selector || "Not set")}</span>
                  {model && role.key !== "naming" && role.key !== "memory" ? (
                    <Select
                      value={(settings.models as any)[`${role.key}Effort`] ?? "high"}
                      onChange={(value) => state.updateSettings({ settings: { models: { ...settings.models, [`${role.key}Effort`]: value } as any } })}
                    >
                      {(model.thinking?.length ? model.thinking : ["off", "minimal", "low", "medium", "high", "xhigh", "max"]).map((effort) => <option key={effort} value={effort}>{effort}</option>)}
                    </Select>
                  ) : null}
                </div>
              </div>
              <Button size="sm" variant="soft" onClick={() => setPick(pick === role.key ? null : role.key)}>Change</Button>
            </div>
          );
        })}
      </Section>
      {pick ? (
        <div className="settings-model-picker">
          <ModelPicker
            models={state.models}
            value={(settings.models as any)[pick] ?? ""}
            role={pick as any}
            onSelect={async (selector) => {
              await state.setModelDefault(pick, selector);
              setPick(null);
            }}
            onClose={() => setPick(null)}
          />
        </div>
      ) : null}
      <Section title="Providers" subtitle="Connected providers that supply models. Disconnecting removes stored credentials and hides the provider.">
        {connectedProviders.map((provider) => (
          <div key={provider.id} className="simple-row">
            <div>
              <strong>{provider.name}</strong>
              <span>{provider.modelCount} model{provider.modelCount === 1 ? "" : "s"}{provider.billing !== "unknown" ? ` · ${provider.billing}` : ""}</span>
            </div>
            <Button size="sm" variant="danger" disabled={providerBusy === provider.id} onClick={() => void disconnect(provider)}>
              {providerBusy === provider.id ? <Spinner size={12} /> : <Trash2 size={12} />} Disconnect
            </Button>
          </div>
        ))}
        {!connectedProviders.length ? <p className="muted">No connected providers are supplying models.</p> : null}
      </Section>
      <Disclosure title="Artificial Analysis & catalog" subtitle="Benchmark data and catalog refresh. The recommended defaults already use this.">
        <Row label="Catalog" hint={`${state.models.length} models available through Pi. ${aaCount} have AA scores.`}>
          <Button size="sm" variant="soft" disabled={catalogBusy} onClick={() => void refreshCatalog()}>{catalogBusy ? <Spinner size={13} /> : <RefreshCw size={13} />} Refresh Pi catalog</Button>
        </Row>
        <Row label="AA data" hint={settings.models.lastAAUpdate ? `Last updated ${new Date(settings.models.lastAAUpdate).toLocaleString()} · source ${settings.models.aaSource ?? "unknown"}` : "Not fetched yet. The public leaderboard is fetched daily."}>
          <Button size="sm" variant="primary" onClick={() => void state.refreshAA()}><Download size={13} /> Refresh now</Button>
        </Row>
        <Row label="Auto-update daily" hint="Refreshes the AA leaderboard every 24 hours.">
          <Toggle checked={settings.models.autoUpdateAA} onChange={(value) => state.updateSettings({ settings: { models: { ...settings.models, autoUpdateAA: value } } })} />
        </Row>
        <div className="aa-note">Defaults rank by AA agentic score (terminal-bench, τ²-bench, IFBench, long-context) divided by blended cost. Batch routes, free routers, and models above $15/M output are excluded from auto-defaults. Data and pricing are attributed to artificialanalysis.ai; unmatched models use a local estimate labelled Q.</div>
      </Disclosure>
    </>
  );
}

function UsageTab() {
  const state = useApp();
  const usage = state.snapshot?.usage;
  const settings = state.snapshot?.settings;
  useEffect(() => { if (!usage?.generatedAt) void state.refreshUsage(); }, []);
  if (!usage || !settings) return null;
  const nodes = [...(state.snapshot?.nodes ?? [])]
    .map((node) => ({ node, stat: usage.perNode[node.id] }))
    .filter((item) => item.stat)
    .sort((a, b) => (b.stat?.cost ?? 0) - (a.stat?.cost ?? 0))
    .slice(0, 12);
  return (
    <>
      <Section title="Totals" subtitle="Accumulated across all threads in this app." right={<Button size="sm" variant="soft" onClick={() => void state.refreshUsage()}><RefreshCw size={13} /> Refresh</Button>}>
        <Row label="Tokens"><strong>{formatNumber(usage.totalTokens)}</strong></Row>
        <Row label="Metered spend"><strong>{formatCost(usage.meteredCost ?? usage.totalCost)}</strong></Row>
        <Row label="Included reference value" hint="Token value at reference prices; not billed on subscription plans."><strong>{formatCost(usage.referenceCost ?? 0)}</strong></Row>
        <Row label="Budget" hint="Optional budget in USD for the whole app.">
          <input className="num-input" type="number" min={0} step={1} value={settings.usage.budgetUsd ?? ""} onChange={(event) => state.updateSettings({ settings: { usage: { ...settings.usage, budgetUsd: event.target.value ? Number(event.target.value) : undefined } } })} />
        </Row>
        <Row label="At budget" hint="Warn once per hour, or block new prompts and threads until the budget is raised.">
          <Select value={settings.usage.budgetAction ?? "warn"} onChange={(value) => state.updateSettings({ settings: { usage: { ...settings.usage, budgetAction: value as "warn" | "pause" } } })}>
            <option value="warn">Warn only</option>
            <option value="pause">Pause new work</option>
          </Select>
        </Row>
        <Row label="Auto-continue on usage reset" hint="If a thread fails on a usage limit, retry after the reset window with a continuation instruction.">
          <Toggle checked={settings.usage.autoContinueOnReset} onChange={(value) => state.updateSettings({ settings: { usage: { ...settings.usage, autoContinueOnReset: value } } })} />
        </Row>
      </Section>
      <Section title="Provider windows" subtitle="Read from the provider usage reported by Pi sessions.">
        {usage.providers.length ? usage.providers.map((provider) => {
          const windows = ((provider.metadata?.limits ?? []) as Array<{ id?: string; label?: string; used?: number; limit?: number; remaining?: number; unit?: string; status?: string; resetsAt?: number }>);
          return (
          <div key={`${provider.provider}-${provider.label}`} className="provider-row">
            <div>
              <strong>{provider.provider}</strong>
              <span>{provider.label} · {provider.status ?? "ok"}</span>
            </div>
            <div className="provider-amount">
              {windows.length ? windows.map((window) => (
                <span key={window.id ?? window.label}>{window.label ?? "window"}: {window.used ?? 0}% used{window.resetsAt ? ` · resets ${new Date(window.resetsAt).toLocaleDateString()}` : ""}</span>
              )) : provider.limit != null ? <strong>{provider.remaining ?? "?"} / {provider.limit} {provider.unit ?? ""}</strong> : <strong>{provider.status ?? "ok"}</strong>}
            </div>
          </div>
          );
        }) : <p className="muted">No provider reports. Authenticate a provider and refresh.</p>}
      </Section>
      <Section title="Cost by node" subtitle="Where the tree is spending.">
        {nodes.map(({ node, stat }) => (
          <div key={node.id} className="provider-row">
            <div><strong>{node.name}</strong><span>{node.type} · {stat?.threads ?? 0} threads</span></div>
            <div className="provider-amount"><strong>{formatCost(stat?.cost ?? 0)}</strong><span>{formatNumber(stat?.tokens ?? 0)} tokens{stat?.referenceCost ? ` · ${formatCost(stat.referenceCost)} ref` : ""}</span></div>
          </div>
        ))}
        {!nodes.length ? <p className="muted">No usage recorded yet.</p> : null}
      </Section>
    </>
  );
}

function ToolsTab() {
  const state = useApp();
  const [tools, setTools] = useState<ToolInfo[]>([]);
  const [skills, setSkills] = useState<SkillInfo[]>([]);
  const [mcps, setMcps] = useState<McpServerInfo[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [skillForm, setSkillForm] = useState<{ name: string; description: string; body: string } | null>(null);
  const [skillEdit, setSkillEdit] = useState<{ path: string; content: string } | null>(null);
  const refreshSkills = async () => setSkills(await window.perch.listSkills());
  useEffect(() => {
    void Promise.all([window.perch.listTools(), window.perch.listSkills(), window.perch.listMcpServers()])
      .then(([toolList, skillList, mcpList]) => { setTools(toolList); setSkills(skillList); setMcps(mcpList); })
      .finally(() => setLoading(false));
  }, []);
  const filtered = tools.filter((tool) => tool.source !== "host" && (!query || tool.name.toLowerCase().includes(query.toLowerCase()) || tool.group.toLowerCase().includes(query.toLowerCase())));
  const groups = [...new Set(filtered.map((tool) => tool.group))];
  const refresh = async () => setTools(await window.perch.listTools());
  if (loading) return <div className="settings-loading"><Spinner /> Loading tools...</div>;
  const approval = state.snapshot?.settings.defaultApprovalMode;
  return (
    <>
      <Section title="Tool permissions" subtitle="Tools follow the approval mode you choose in chat. Use this page only for exceptions.">
        <Row label="Default approval" hint="Change it per node from the chat toolbar, or for all new nodes in General.">
          <span className="muted">{approval === "yolo" ? "Auto-approve all" : approval === "write" ? "Auto-approve writes" : "Ask each time"}</span>
        </Row>
        <Row label="Host tools" hint="Tree, browser, LSP, AST, Python, notebook, web search and mobile tools are always available.">
          <Badge tone="green">always available</Badge>
        </Row>
      </Section>
      <Disclosure title="Per-tool overrides" subtitle="Turn individual Pi tools off or change their approval. Changes apply to newly started sessions.">
        <input className="settings-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Filter tools..." />
        {groups.map((group) => (
          <div key={group} className="tool-group">
            <div className="tool-group-label">{group}</div>
            {filtered.filter((tool) => tool.group === group).map((tool) => (
              <div key={tool.name} className="tool-row">
                <div className="tool-row-copy">
                  <strong>{tool.label || tool.name}</strong>
                  <span>{tool.description}</span>
                  <div className="tool-row-tags"><span className="mono">{tool.name}</span></div>
                </div>
                <div className="tool-row-controls">
                  <Select value={tool.approval} onChange={async (value) => { await window.perch.setTool(tool.name, tool.enabled, value as ToolApproval); await refresh(); }}>
                    <option value="allow">allow</option>
                    <option value="prompt">prompt</option>
                    <option value="deny">deny</option>
                  </Select>
                  <Toggle checked={tool.enabled} onChange={async (value) => { await window.perch.setTool(tool.name, value, tool.approval); await refresh(); }} />
                </div>
              </div>
            ))}
          </div>
        ))}
        {!groups.length ? <p className="muted">No Pi tools match this filter.</p> : null}
      </Disclosure>
      <Disclosure title="Skills" subtitle="Discovered from Pi and Claude skill directories. Pi skills are editable here.">
        <div className="inline-actions" style={{ justifyContent: "flex-end", marginBottom: 8 }}>
          <Button size="sm" variant="soft" onClick={() => setSkillForm({ name: "", description: "", body: "" })}><Plus size={12} /> New skill</Button>
        </div>
        {skillForm ? (
          <div className="skill-form">
            <input value={skillForm.name} onChange={(event) => setSkillForm({ ...skillForm, name: event.target.value })} placeholder="Skill name" />
            <input value={skillForm.description} onChange={(event) => setSkillForm({ ...skillForm, description: event.target.value })} placeholder="Short description" />
            <textarea value={skillForm.body} onChange={(event) => setSkillForm({ ...skillForm, body: event.target.value })} placeholder="Instructions the agent should follow when this skill applies." />
            <div className="inline-actions">
              <Button size="sm" variant="primary" disabled={!skillForm.name.trim()} onClick={async () => {
                await window.perch.createSkill(skillForm);
                setSkillForm(null);
                await refreshSkills();
                state.pushToast({ kind: "success", title: "Skill created" });
              }}><Save size={12} /> Create</Button>
              <Button size="sm" variant="ghost" onClick={() => setSkillForm(null)}>Cancel</Button>
            </div>
          </div>
        ) : null}
        {skillEdit ? (
          <div className="skill-form">
            <span className="mono">{skillEdit.path}</span>
            <textarea className="skill-editor" value={skillEdit.content} onChange={(event) => setSkillEdit({ ...skillEdit, content: event.target.value })} />
            <div className="inline-actions">
              <Button size="sm" variant="primary" onClick={async () => {
                await window.perch.saveSkill(skillEdit.path, skillEdit.content);
                setSkillEdit(null);
                await refreshSkills();
                state.pushToast({ kind: "success", title: "Skill saved" });
              }}><Save size={12} /> Save</Button>
              <Button size="sm" variant="ghost" onClick={() => setSkillEdit(null)}>Cancel</Button>
            </div>
          </div>
        ) : null}
        {skills.length ? skills.map((skill) => (
          <div key={`${skill.source}-${skill.path}`} className="simple-row">
            <div><strong>{skill.name}</strong><span>{skill.description || skill.path}</span></div>
            <div className="inline-actions">
              <Badge tone="blue">{skill.source}</Badge>
              <Button size="sm" variant="ghost" onClick={async () => {
                const skillFile = await window.perch.readSkill(skill.path);
                setSkillEdit({ path: skill.path, content: skillFile.content });
              }}>Edit</Button>
              <IconButton icon={<Trash2 size={12} />} label="Delete skill" onClick={async () => {
                if (!confirm(`Delete skill ${skill.name}?`)) return;
                await window.perch.deleteSkill(skill.path);
                await refreshSkills();
              }} />
            </div>
          </div>
        )) : <p className="muted">No skills discovered.</p>}
      </Disclosure>
      <Disclosure title="MCP servers" subtitle="Project and user MCP configuration.">
        {mcps.length ? mcps.map((mcp) => (
          <div key={mcp.name} className="simple-row"><div><strong>{mcp.name}</strong><span>{mcp.command || mcp.url || mcp.source}</span></div><Badge tone={mcp.enabled ? "green" : "neutral"}>{mcp.enabled ? "enabled" : "disabled"}</Badge></div>
        )) : <p className="muted">No MCP servers configured.</p>}
      </Disclosure>
    </>
  );
}

function MemoryTab() {
  const state = useApp();
  const node = selectedNode(state);
  const [text, setText] = useState("");
  const [tags, setTags] = useState("");
  useEffect(() => { if (node) void state.loadMemory(node.id); }, [node?.id]);
  if (!node) return null;
  return (
    <>
      <Section title="Memory at this level" subtitle="Durable facts and decisions. Orchestrators call tree_memory_write; you can edit or remove anything." right={<Badge tone="purple">{state.memory.length} entries</Badge>}>
        <div className="memory-add">
          <textarea value={text} onChange={(event) => setText(event.target.value)} placeholder="A decision, constraint or lesson worth remembering…" />
          <div className="memory-add-row">
            <input value={tags} onChange={(event) => setTags(event.target.value)} placeholder="tags, comma separated" />
            <Button size="sm" variant="primary" disabled={!text.trim()} onClick={async () => { await state.addMemory(text, tags.split(",").map((tag) => tag.trim()).filter(Boolean)); setText(""); setTags(""); }}><Plus size={13} /> Remember</Button>
          </div>
        </div>
        <div className="memory-list">
          {state.memory.map((entry) => (
            <div key={entry.id} className="memory-entry">
              <div className="memory-entry-top">
                <Badge tone={entry.source === "auto" ? "amber" : entry.source === "user" ? "blue" : "purple"}>{entry.source}</Badge>
                <span className="memory-importance">importance {entry.importance.toFixed(2)}</span>
                {entry.tags.map((tag) => <Badge key={tag} tone="neutral">{tag}</Badge>)}
                <IconButton icon={<Trash2 size={13} />} label="Delete" onClick={() => void state.deleteMemory(entry.id)} />
              </div>
              <p>{entry.text}</p>
              <span className="memory-meta">{new Date(entry.updatedAt).toLocaleString()}</span>
            </div>
          ))}
          {!state.memory.length ? <p className="muted">No memories at this level yet. The orchestrator decides what is worth keeping.</p> : null}
        </div>
      </Section>
      <Section title="Auto memory" subtitle="A safety net for completed work; orchestrators can still write their own entries.">
        <Row label="Auto-capture thread outcomes" hint="Stores a compact, low-importance summary when a thread finishes.">
          <Toggle checked={state.snapshot?.settings.memory.autoCapture ?? true} onChange={(value) => state.updateSettings({ settings: { memory: { ...state.snapshot!.settings.memory, autoCapture: value } } })} />
        </Row>
        <Row label="Inject token budget" hint="Approximate cap for memory guidance in each session prompt.">
          <input className="num-input" type="number" min={500} step={500} value={state.snapshot?.settings.memory.injectTokenLimit ?? 3000} onChange={(event) => state.updateSettings({ settings: { memory: { ...state.snapshot!.settings.memory, injectTokenLimit: Number(event.target.value) } } })} />
        </Row>
        <Row label="Maximum entries" hint="Oldest low-importance entries are pruned beyond this.">
          <input className="num-input" type="number" min={100} value={state.snapshot?.settings.memory.maxEntries ?? 2000} onChange={(event) => state.updateSettings({ settings: { memory: { ...state.snapshot!.settings.memory, maxEntries: Number(event.target.value) } } })} />
        </Row>
        <Row label="Consolidate" hint="Merge near-duplicate entries at this level.">
          <Button size="sm" variant="soft" onClick={async () => { await window.perch.consolidateMemory(node.id); await state.loadMemory(node.id); }}>Consolidate</Button>
        </Row>
      </Section>
    </>
  );
}

function EnvironmentsTab() {
  const state = useApp();
  const node = selectedNode(state);
  const envs = state.snapshot?.environments ?? [];
  const [selected, setSelected] = useState<string | null>(envs[0]?.id ?? null);
  const [draft, setDraft] = useState<Environment | null>(null);
  useEffect(() => {
    const env = envs.find((item) => item.id === selected) ?? envs[0];
    setDraft(env ? structuredClone(env) : null);
  }, [selected, envs.length]);
  if (!node) return null;
  const assign = envs.find((env) => env.id === node.environmentId);
  return (
    <>
      <Section title="Environment profiles" subtitle="Local only for now: env vars, setup scripts, shell and git policy." right={<Button size="sm" variant="soft" onClick={() => {
        const now = Date.now();
        const env: Environment = { id: `env_${Math.random().toString(36).slice(2, 10)}`, name: "New environment", envVars: [], setupCommands: [], teardownCommands: [], inheritEnv: true, gitMode: "auto", approvalMode: "write", createdAt: now, updatedAt: now };
        setSelected(env.id);
        setDraft(env);
      }}><Plus size={13} /> New</Button>}>
        <Row label="Environment for this node" hint={assign ? `Inherited: ${assign.name}` : "Falls back to the first environment."}>
          <Select value={node.environmentId ?? ""} onChange={(value) => void window.perch.updateNode(node.id, { environmentId: value || undefined }).then(() => state.refresh())}>
            <option value="">Inherit / default</option>
            {envs.map((env) => <option key={env.id} value={env.id}>{env.name}</option>)}
          </Select>
        </Row>
        <div className="env-list">
          {envs.map((env) => (
            <button key={env.id} type="button" className={cx("env-row", selected === env.id && "active")} onClick={() => setSelected(env.id)}>
              <Terminal size={14} />
              <span>{env.name}</span>
              <span className="muted">{env.envVars.length} vars · {env.setupCommands.length} setup</span>
            </button>
          ))}
        </div>
      </Section>
      {draft ? (
        <Section title={draft.name || "Environment"} subtitle="Secrets are stored with Windows DPAPI via Electron safeStorage." right={<div className="inline-actions">
          <Button size="sm" variant="soft" onClick={async () => { const result = await window.perch.testEnvironment(draft.id); state.pushToast({ kind: result.ok ? "success" : "error", title: result.ok ? "Environment ready" : "Environment failed", body: result.output.slice(0, 500) }); }}>Test</Button>
          <Button size="sm" variant="primary" onClick={async () => { await window.perch.saveEnvironment(draft); await state.refresh(); state.pushToast({ kind: "success", title: "Environment saved", body: draft.name }); }}><Save size={13} /> Save</Button>
          <Button size="sm" variant="danger" onClick={async () => { if (confirm(`Delete ${draft.name}?`)) { await window.perch.deleteEnvironment(draft.id); setSelected(null); await state.refresh(); } }}><Trash2 size={13} /></Button>
        </div>}>
          <Row label="Name"><input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></Row>
          <Row label="Working directory" hint="Leave blank to use the project/thread directory.">
            <div className="inline-actions"><input value={draft.cwd ?? ""} onChange={(event) => setDraft({ ...draft, cwd: event.target.value })} placeholder="Project directory" /><Button size="sm" variant="soft" onClick={async () => { const picked = await window.perch.pickDirectory(); if (picked) setDraft({ ...draft, cwd: picked }); }}><Folder size={13} /></Button></div>
          </Row>
          <Row label="Inherit process environment" hint="Start from the app's environment variables."><Toggle checked={draft.inheritEnv} onChange={(value) => setDraft({ ...draft, inheritEnv: value })} /></Row>
          <Row label="Shell" hint="Defaults to cmd.exe on Windows."><input value={draft.shell ?? ""} onChange={(event) => setDraft({ ...draft, shell: event.target.value })} placeholder="cmd.exe" /></Row>
          <Row label="Git policy">
            <Select value={draft.gitMode} onChange={(value) => setDraft({ ...draft, gitMode: value as any })}>
              <option value="auto">Auto</option><option value="shared">Shared</option><option value="branch">Branch</option><option value="worktree">Worktree</option>
            </Select>
          </Row>
          <Row label="Approval mode">
            <Select value={draft.approvalMode} onChange={(value) => setDraft({ ...draft, approvalMode: value as any })}>
              <option value="always-ask">Ask each time</option><option value="write">Auto-approve writes</option><option value="yolo">Auto-approve all</option>
            </Select>
          </Row>
          <div className="env-block">
            <div className="env-block-head"><strong>Environment variables</strong><Button size="sm" variant="soft" onClick={() => setDraft({ ...draft, envVars: [...draft.envVars, { key: "", value: "", secret: false }] })}><Plus size={12} /> Add</Button></div>
            {draft.envVars.map((item, index) => (
              <div key={index} className="env-var">
                <input value={item.key} onChange={(event) => replaceAt(draft, setDraft, "envVars", index, { ...item, key: event.target.value })} placeholder="KEY" />
                <input type={item.secret ? "password" : "text"} value={item.value} onChange={(event) => replaceAt(draft, setDraft, "envVars", index, { ...item, value: event.target.value })} placeholder={item.secret ? "stored secret" : "value"} />
                <label className="secret-check"><input type="checkbox" checked={item.secret} onChange={(event) => replaceAt(draft, setDraft, "envVars", index, { ...item, secret: event.target.checked })} /> secret</label>
                <IconButton icon={<Trash2 size={13} />} label="Remove" onClick={() => setDraft({ ...draft, envVars: draft.envVars.filter((_, i) => i !== index) })} />
              </div>
            ))}
            {!draft.envVars.length ? <p className="muted">No variables.</p> : null}
          </div>
          <div className="env-block">
            <div className="env-block-head"><strong>Setup commands</strong></div>
            <textarea className="code-input" value={draft.setupCommands.join("\n")} onChange={(event) => setDraft({ ...draft, setupCommands: event.target.value.split("\n") })} placeholder="npm install&#10;npm run build" />
          </div>
          <div className="env-block">
            <div className="env-block-head"><strong>Teardown commands</strong></div>
            <textarea className="code-input" value={draft.teardownCommands.join("\n")} onChange={(event) => setDraft({ ...draft, teardownCommands: event.target.value.split("\n") })} placeholder="docker compose down" />
          </div>
        </Section>
      ) : null}
    </>
  );
}

function GitTab() {
  const state = useApp();
  const settings = state.snapshot?.settings;
  if (!settings) return null;
  return (
    <Section title="Git policy" subtitle="The orchestrator can override isolation per thread. These are the defaults.">
      <Row label="Default isolation" hint="Auto lets the project orchestrator choose; worktree gives each worker a branch and directory.">
        <Select value={settings.git.defaultMode} onChange={(value) => state.updateSettings({ settings: { git: { ...settings.git, defaultMode: value as any } } })}>
          <option value="auto">Auto (orchestrator decides)</option>
          <option value="shared">Shared checkout</option>
          <option value="branch">Branch per worker</option>
          <option value="worktree">Worktree per worker</option>
        </Select>
      </Row>
      <Row label="Branch prefix" hint="Worker branches are <prefix>/<slug>-<id>."><input value={settings.git.branchPrefix} onChange={(event) => state.updateSettings({ settings: { git: { ...settings.git, branchPrefix: event.target.value } } })} /></Row>
      <Row label="Automatically commit" hint="Off by default; workers leave diffs for the orchestrator."><Toggle checked={settings.git.autoCommit} onChange={(value) => state.updateSettings({ settings: { git: { ...settings.git, autoCommit: value } } })} /></Row>
      <Row label="Automatically merge" hint="Off by default. The orchestrator can merge a completed worker branch, but auto-merge is risky."><Toggle checked={settings.git.autoMerge} onChange={(value) => state.updateSettings({ settings: { git: { ...settings.git, autoMerge: value } } })} /></Row>
      <div className="aa-note">Worktrees live under the Perch data directory, not inside the repository. Removing a thread does not delete its branch, so unmerged work is never silently lost.</div>
    </Section>
  );
}

function NotificationsSection() {
  const state = useApp();
  const settings = state.snapshot?.settings;
  if (!settings) return null;
  const n = settings.notifications;
  const update = (patch: any) => state.updateSettings({ settings: { notifications: { ...n, ...patch } } });
  return (
    <>
      <Section title="Windows notifications" subtitle="Toasts and tray badge. In-app notifications are always stored.">
        <Row label="Enable notifications"><Toggle checked={n.enabled} onChange={(value) => update({ enabled: value })} /></Row>
        <Row label="Windows toast"><Toggle checked={n.toast} onChange={(value) => update({ toast: value })} /></Row>
        <Row label="Thread completed"><Toggle checked={n.onComplete} onChange={(value) => update({ onComplete: value })} /></Row>
        <Row label="Decision needed"><Toggle checked={n.onQuestion} onChange={(value) => update({ onQuestion: value })} /></Row>
        <Row label="Errors"><Toggle checked={n.onError} onChange={(value) => update({ onError: value })} /></Row>
        <Row label="Tree summaries"><Toggle checked={n.onDigest} onChange={(value) => update({ onDigest: value })} /></Row>
      </Section>
      <Section title="Muted nodes" subtitle="Muted nodes still appear in the inbox.">
        {(state.snapshot?.nodes ?? []).filter((node) => node.type !== "root").map((node) => (
          <Row key={node.id} label={node.name}>
            <Toggle checked={n.mutedNodeIds.includes(node.id)} onChange={(value) => update({ mutedNodeIds: value ? [...n.mutedNodeIds, node.id] : n.mutedNodeIds.filter((id) => id !== node.id) })} />
          </Row>
        ))}
      </Section>
    </>
  );
}

function EngineTab() {
  const state = useApp();
  const engine = state.engine;
  const settings = state.snapshot?.settings;
  return (
    <>
      <Section title="Pi runtime" subtitle="Perch launches the bundled Pi coding agent over RPC. No separate engine download is needed.">
        <Row label="Status"><Badge tone={engine?.found ? "green" : "red"}>{engine?.found ? "ready" : "not found"}</Badge></Row>
        <Row label="Version"><span className="mono">{engine?.version ?? "—"}</span></Row>
        <Row label="Path"><span className="mono muted">{engine?.path ?? "—"}</span></Row>
        <Row label="Source"><span>{engine?.source ?? "—"}</span></Row>
        <Row label="Custom engine path" hint="Optional. Restart after changing. Blank uses the bundled/installed engine.">
          <input defaultValue={settings?.enginePath ?? ""} onBlur={(event) => state.updateSettings({ settings: { enginePath: event.target.value } })} placeholder="node_modules/@earendil-works/pi-coding-agent/dist/cli.js" />
        </Row>
        {engine?.downloading ? <Row label="Download"><div className="download-bar"><i style={{ width: `${engine.progress ?? 0}%` }} /><span>{engine.progress ?? 0}%</span></div></Row> : null}
        <Row label="Install / update" hint="Pi ships as an npm dependency; reinstall Perch to repair it.">
          <Button size="sm" variant="primary" disabled={engine?.downloading} onClick={() => void window.perch.downloadEngine().then(() => state.refresh())}><Download size={13} /> Recheck engine</Button>
        </Row>
        <Row label="Restart app" hint="Required after changing the engine or some global settings.">
          <Button size="sm" variant="soft" onClick={() => void window.perch.restartApp()}><RefreshCw size={13} /> Restart</Button>
        </Row>
        <Row label="Open config file" hint="The raw Pi config YAML is also editable from Advanced.">
          <Button size="sm" variant="soft" onClick={() => state.piConfig?.path && void window.perch.openPath(state.piConfig.path)}>Open config</Button>
        </Row>
      </Section>
      <Section title="Pi config" subtitle="The advanced tab exposes the full config surface.">
        <Row label="Config file"><span className="mono muted">{state.piConfig?.path ?? "—"}</span></Row>
        <Row label="Entries"><span>{state.piConfig?.entries.length ?? 0}</span></Row>
        <Row label="Refresh"><Button size="sm" variant="soft" onClick={() => void state.refreshConfig()}><RefreshCw size={13} /> Reload</Button></Row>
      </Section>
    </>
  );
}

type AdvancedSection = "usage" | "memory" | "environments" | "git" | "connectors" | "automations" | "sandbox" | "plugins" | "engine" | "pi";

const ADVANCED_SECTIONS: Array<{ id: AdvancedSection; label: string; description: string; icon: React.ReactNode }> = [
  { id: "usage", label: "Usage & budgets", description: "Provider windows, spend, budgets and auto-resume.", icon: <Gauge size={16} /> },
  { id: "memory", label: "Memory", description: "Durable facts and decisions at the selected level.", icon: <MemoryStick size={16} /> },
  { id: "environments", label: "Environments", description: "Shell, setup scripts and per-node execution profiles.", icon: <Terminal size={16} /> },
  { id: "git", label: "Git defaults", description: "Isolation, branch prefix and automatic integration.", icon: <FolderGit2 size={16} /> },
  { id: "connectors", label: "Connectors", description: "GitHub, Cloudflare, Slack, Linear and Figma tokens.", icon: <Plug size={16} /> },
  { id: "automations", label: "Automations", description: "Scheduled prompts that spawn fresh worker threads.", icon: <Clock size={16} /> },
  { id: "sandbox", label: "Sandbox & audit", description: "Command rules, path scope, network policy and audit log.", icon: <Shield size={16} /> },
  { id: "plugins", label: "Plugins", description: "Install skills and MCP servers from Git or disk.", icon: <Package size={16} /> },
  { id: "engine", label: "Pi engine", description: "Runtime status, version and repair actions.", icon: <Cpu size={16} /> },
  { id: "pi", label: "Pi settings", description: "The raw Pi configuration surface.", icon: <SlidersHorizontal size={16} /> },
];

function AdvancedTab() {
  const [section, setSection] = useState<AdvancedSection | null>(null);
  if (section) {
    const item = ADVANCED_SECTIONS.find((entry) => entry.id === section);
    return (
      <>
        <button type="button" className="advanced-back" onClick={() => setSection(null)}>
          <ChevronRight size={14} /> Back to Advanced
        </button>
        <div className="advanced-section-head">
          <span className="advanced-card-icon">{item?.icon}</span>
          <div>
            <h3>{item?.label}</h3>
            <p>{item?.description}</p>
          </div>
        </div>
        {section === "usage" ? <UsageTab /> : null}
        {section === "memory" ? <MemoryTab /> : null}
        {section === "environments" ? <EnvironmentsTab /> : null}
        {section === "git" ? <GitTab /> : null}
        {section === "connectors" ? <ConnectorsTab /> : null}
        {section === "automations" ? <AutomationsTab /> : null}
        {section === "sandbox" ? <SandboxTab /> : null}
        {section === "plugins" ? <PluginsTab /> : null}
        {section === "engine" ? <EngineTab /> : null}
        {section === "pi" ? <PiConfigTab /> : null}
      </>
    );
  }
  return (
    <div className="advanced-grid">
      {ADVANCED_SECTIONS.map((item) => (
        <button key={item.id} type="button" className="advanced-card" onClick={() => setSection(item.id)}>
          <span className="advanced-card-icon">{item.icon}</span>
          <span className="advanced-card-copy">
            <strong>{item.label}</strong>
            <span>{item.description}</span>
          </span>
          <ChevronRight size={15} className="advanced-card-chev" />
        </button>
      ))}
    </div>
  );
}

function PiConfigTab() {
  const state = useApp();
  const config = state.piConfig;
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState("all");
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  useEffect(() => { if (!config?.entries.length) void state.refreshConfig(); }, []);
  if (!config) return <div className="settings-loading"><Spinner /> Loading Pi config…</div>;
  const groups = [...new Set(config.entries.map((entry) => entry.group))].sort();
  const entries = config.entries.filter((entry) => (group === "all" || entry.group === group) && (!query || entry.key.toLowerCase().includes(query.toLowerCase()) || entry.description.toLowerCase().includes(query.toLowerCase())));
  return (
    <>
      <Section title="Pi configuration" subtitle={`Generated from pi-agent/settings.json · ${config.entries.length} settings. Changes are written to the real Pi config.`} right={<div className="inline-actions"><input className="settings-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search settings…" /><Button size="sm" variant="soft" onClick={() => void state.refreshConfig()}><RefreshCw size={13} /></Button></div>}>
        <div className="config-groups">
          <button type="button" className={cx(group === "all" && "active")} onClick={() => setGroup("all")}>all</button>
          {groups.map((item) => <button key={item} type="button" className={cx(group === item && "active")} onClick={() => setGroup(item)}>{item}</button>)}
        </div>
        <div className="config-list">
          {entries.slice(0, 160).map((entry) => (
            <ConfigRow key={entry.key} entry={entry} draft={drafts[entry.key]} setDraft={(value) => setDrafts({ ...drafts, [entry.key]: value })} onSave={async (value) => {
              await window.perch.setPiConfig(entry.key, value);
              await state.refreshConfig();
            }} onReset={async () => { await window.perch.resetPiConfig(entry.key); await state.refreshConfig(); }} />
          ))}
          {entries.length > 160 ? <p className="muted">Showing 160 of {entries.length}. Use search or a group filter.</p> : null}
        </div>
      </Section>
    </>
  );
}

function ConfigRow({ entry, draft, setDraft, onSave, onReset }: { entry: PiConfigEntry; draft?: string; setDraft: (value: string) => void; onSave: (value: unknown) => Promise<void>; onReset: () => Promise<void> }) {
  const [value, setValue] = useState(draft ?? serialize(entry.value));
  useEffect(() => setValue(serialize(entry.value)), [entry.value]);
  const isComplex = entry.type === "array" || entry.type === "record" || entry.type === "unknown";
  return (
    <div className="config-row">
      <div className="config-row-copy">
        <strong>{entry.key}</strong>
        {entry.description ? <span>{entry.description}</span> : null}
      </div>
      <div className="config-row-control">
        {entry.type === "boolean" ? (
          <Toggle checked={!!entry.value} onChange={(next) => void onSave(next)} />
        ) : entry.type === "enum" ? (
          <input value={value} onChange={(event) => setValue(event.target.value)} onBlur={() => value !== serialize(entry.value) && void onSave(value)} />
        ) : entry.type === "number" ? (
          <input className="num-input" type="number" value={value} onChange={(event) => setValue(event.target.value)} onBlur={() => value !== serialize(entry.value) && void onSave(Number(value))} />
        ) : isComplex ? (
          <textarea className="config-json" value={value} onChange={(event) => setValue(event.target.value)} onBlur={() => value !== serialize(entry.value) && void onSave(parseJson(value))} />
        ) : (
          <input value={value} onChange={(event) => setValue(event.target.value)} onBlur={() => value !== serialize(entry.value) && void onSave(value)} />
        )}
        <IconButton icon={<RefreshCw size={12} />} label="Reset" onClick={() => void onReset()} />
      </div>
    </div>
  );
}

function serialize(value: unknown): string {
  if (typeof value === "string") return value;
  if (value == null) return "";
  return JSON.stringify(value);
}

function parseJson(value: string): unknown {
  try { return JSON.parse(value); } catch { return value; }
}

function replaceAt<T extends keyof Environment>(draft: Environment, setDraft: (value: Environment) => void, key: T, index: number, value: any) {
  const list = [...(draft[key] as any[])];
  list[index] = value;
  setDraft({ ...draft, [key]: list });
}

function ConnectorsTab() {
  const state = useApp();
  const settings = state.snapshot?.settings;
  const [secrets, setSecrets] = useState<Record<string, boolean>>({});
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [results, setResults] = useState<Record<string, string>>({});
  const [mcps, setMcps] = useState<McpServerInfo[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  useEffect(() => {
    void window.perch.connectorSecrets().then(setSecrets);
    void window.perch.listMcpServers().then(setMcps);
  }, []);
  if (!settings) return null;
  const cf = settings.connectors?.cloudflare ?? { mcp: false };
  const update = (patch: any) => state.updateSettings({ settings: { connectors: { ...settings.connectors, ...patch } } });
  const save = async (key: string) => {
    const value = drafts[key] ?? "";
    const next = await window.perch.setConnectorSecret(key, value);
    setSecrets(next);
    setDrafts((items) => ({ ...items, [key]: "" }));
    state.pushToast({ kind: "success", title: "Credential saved", body: key });
  };
  const test = async (provider: string) => {
    setBusy(provider);
    try {
      const result = await window.perch.testConnector(provider);
      setResults((items) => ({ ...items, [provider]: `${result.ok ? "OK" : "Failed"}: ${result.output}` }));
    } finally {
      setBusy(null);
    }
  };
  const oauthFields = (provider: string, label: string) => {
    const current = (settings.connectors as any)?.[provider] ?? {};
    return (
      <>
        <Row label={`${label} OAuth client ID`} hint="Create an OAuth app with the provider and paste its client ID. Callback URL: http://127.0.0.1:43110/oauth/callback">
          <input value={current.clientId ?? ""} onChange={(event) => update({ [provider]: { ...current, clientId: event.target.value } })} placeholder="Client ID" />
        </Row>
        <Row label="OAuth client secret" hint="Encrypted locally with Windows safeStorage.">
          <div className="inline-actions">
            <input type="password" value={drafts[`oauth.${provider}.secret`] ?? ""} placeholder={secrets[`oauth.${provider}.secret`] ? "Saved (enter to replace)" : "Client secret"} onChange={(event) => setDrafts((items) => ({ ...items, [`oauth.${provider}.secret`]: event.target.value }))} />
            <Button size="sm" variant="soft" disabled={!drafts[`oauth.${provider}.secret`]} onClick={() => void save(`oauth.${provider}.secret`)}><Save size={12} /> Save</Button>
            <Button size="sm" variant="outline" disabled={busy === `oauth-${provider}`} onClick={async () => {
              setBusy(`oauth-${provider}`);
              try {
                const result = await window.perch.connectOAuth(provider);
                setResults((items) => ({ ...items, [provider]: `${result.ok ? "OK" : "Failed"}: ${result.output}` }));
                setSecrets(await window.perch.connectorSecrets());
              } catch (error) {
                setResults((items) => ({ ...items, [provider]: `Failed: ${String(error)}` }));
              } finally {
                setBusy(null);
              }
            }}>{busy === `oauth-${provider}` ? <Spinner /> : <ExternalLink size={12} />} Connect with OAuth</Button>
          </div>
        </Row>
      </>
    );
  };
  const credential = (provider: string, key: string, label: string, placeholder: string, hint: string) => (
    <Row label={label} hint={hint}>
      <div className="inline-actions">
        <input type="password" value={drafts[key] ?? ""} placeholder={secrets[key] ? "Saved (enter to replace)" : placeholder} onChange={(event) => setDrafts((items) => ({ ...items, [key]: event.target.value }))} />
        <Button size="sm" variant="soft" disabled={!drafts[key]} onClick={() => void save(key)}><Save size={12} /> Save</Button>
        <Button size="sm" variant="outline" disabled={busy === provider} onClick={() => void test(provider)}>{busy === provider ? <Spinner /> : <Check size={12} />} Test</Button>
      </div>
      {results[provider] ? <small className="connector-result">{results[provider]}</small> : null}
    </Row>
  );
  return (
    <>
      <Section title="Cloudflare" subtitle="Use the Cloudflare API MCP for account-wide work, and a token for Pages deployments from Sites." right={<Badge tone={cf.mcp ? "green" : "neutral"}>{cf.mcp ? "MCP added" : "MCP not added"}</Badge>}>
        <Row label="Cloudflare MCP" hint="Adds https://mcp.cloudflare.com/mcp to pi-agent/mcp.json. Pi prompts for Cloudflare OAuth on first use.">
          <div className="inline-actions">
            <Button size="sm" variant="primary" onClick={async () => {
              const result = await window.perch.addCloudflareMcp();
              setMcps(result.servers);
              state.pushToast({ kind: "success", title: "Cloudflare MCP added", body: result.path });
              await state.refresh();
            }}><Plus size={12} /> Add Cloudflare MCP</Button>
            <Button size="sm" variant="soft" onClick={async () => { setMcps(await window.perch.listMcpServers()); }}><RefreshCw size={12} /> Refresh</Button>
          </div>
        </Row>
        {mcps.filter((mcp) => /cloudflare/i.test(mcp.name)).map((mcp) => (
          <div key={mcp.name} className="simple-row"><div><strong>{mcp.name}</strong><span>{mcp.url || mcp.command}</span></div><Badge tone={mcp.enabled ? "green" : "neutral"}>{mcp.enabled ? "enabled" : "disabled"}</Badge></div>
        ))}
        {credential("cloudflare", "cloudflare.token", "API token", "Cloudflare API token", "Needs Pages:Edit and Account:Read. Used only for Sites deploys and the MCP fallback.")}
        <Row label="Account ID" hint="Cloudflare dashboard ? Workers & Pages ? Account ID.">
          <input value={cf.accountId ?? ""} onChange={(event) => update({ cloudflare: { ...cf, accountId: event.target.value } })} placeholder="023e105f..." />
        </Row>
        <Row label="Pages project" hint="Blank derives a project name from the site name.">
          <input value={cf.projectName ?? ""} onChange={(event) => update({ cloudflare: { ...cf, projectName: event.target.value } })} placeholder="my-site" />
        </Row>
        <Row label="Production branch" hint="Cloudflare Pages production branch used for deployments.">
          <input value={cf.branch ?? "main"} onChange={(event) => update({ cloudflare: { ...cf, branch: event.target.value } })} placeholder="main" />
        </Row>
      </Section>
      <Section title="GitHub" subtitle="Optional personal token. Without it, the app uses the GitHub CLI (gh) session.">
        {credential("github", "github.token", "Personal access token", "ghp_...", "Repo scope is enough for PRs, Pages and CI logs.")}
        {oauthFields("github", "GitHub")}
      </Section>
      <Section title="Slack" subtitle="OAuth bot token or incoming webhook for automation and CI summaries.">
        {oauthFields("slack", "Slack")}
        {credential("slack", "slack.webhook", "Webhook URL", "https://hooks.slack.com/...", "Messages are posted as Perch.")}
      </Section>
      <Section title="Linear" subtitle="OAuth app or API key for issue creation and project context.">
        {oauthFields("linear", "Linear")}
        {credential("linear", "linear.token", "API key", "lin_api_...", "Read access is enough to start.")}
      </Section>
      <Section title="Figma" subtitle="OAuth app or personal access token for design context.">
        {oauthFields("figma", "Figma")}
        {credential("figma", "figma.token", "Personal access token", "figd_...", "Used by agents through the browser and connectors.")}
      </Section>
      <Section title="MCP servers" subtitle="Remote and local MCP servers discovered from pi-agent/mcp.json." right={<Button size="sm" variant="soft" onClick={async () => {
        const result = await window.perch.importAgentConfigs();
        setMcps(await window.perch.listMcpServers());
        state.pushToast({ kind: "success", title: "Imported agent configs", body: result.imported.length ? result.imported.join(", ") : "No MCP servers found to import." });
      }}><Download size={12} /> Import from Claude/Codex</Button>}>
        {mcps.length ? mcps.map((mcp) => (
          <div key={mcp.name} className="simple-row">
            <div><strong>{mcp.name}</strong><span>{mcp.url || mcp.command || mcp.source}</span></div>
            <div className="inline-actions">
              <Badge tone={mcp.enabled ? "green" : "neutral"}>{mcp.enabled ? "enabled" : "disabled"}</Badge>
              <IconButton icon={<Trash2 size={12} />} label="Remove MCP server" onClick={async () => { setMcps(await window.perch.removeMcpServer(mcp.name)); }} />
            </div>
          </div>
        )) : <p className="muted">No MCP servers configured.</p>}
      </Section>
    </>
  );
}

function AutomationsTab() {
  const state = useApp();
  const [items, setItems] = useState<Automation[]>([]);
  const [name, setName] = useState("");
  const [prompt, setPrompt] = useState("");
  const [intervalMin, setIntervalMin] = useState(60);
  const [nodeId, setNodeId] = useState("");
  const projects = (state.snapshot?.nodes ?? []).filter((node) => node.type === "project");
  const load = async () => setItems(await window.perch.listAutomations());
  useEffect(() => {
    void load();
    if (!nodeId && projects[0]) setNodeId(projects[0].id);
  }, [projects.length]);
  const save = async () => {
    if (!name.trim() || !prompt.trim() || !nodeId) return;
    await window.perch.saveAutomation({ name, prompt, intervalMin, nodeId });
    setName("");
    setPrompt("");
    await load();
    state.pushToast({ kind: "success", title: "Automation saved" });
  };
  return (
    <>
      <Section title="New automation" subtitle="Each run creates a fresh worker thread under the selected project. It never reuses idle threads.">
        <Row label="Name"><input value={name} onChange={(event) => setName(event.target.value)} placeholder="Nightly dependency audit" /></Row>
        <Row label="Project">
          <Select value={nodeId} onChange={setNodeId}>
            {projects.map((node) => <option key={node.id} value={node.id}>{node.name}</option>)}
          </Select>
        </Row>
        <Row label="Interval (minutes)" hint="Minimum 5 minutes."><input className="num-input" type="number" min={5} value={intervalMin} onChange={(event) => setIntervalMin(Number(event.target.value))} /></Row>
        <Row label="Instructions"><textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder="Check dependencies for security updates, run tests, and report anything that needs a human." /></Row>
        <Button size="sm" variant="primary" disabled={!name.trim() || !prompt.trim() || !nodeId} onClick={() => void save()}><Plus size={13} /> Save automation</Button>
      </Section>
      <Section title="Scheduled jobs" subtitle="Results appear as threads under their project.">
        {items.map((item) => (
          <div key={item.id} className="automation-row">
            <div className="automation-main">
              <strong>{item.name}</strong>
              <span>every {item.intervalMin} min � {state.snapshot?.nodes.find((node) => node.id === item.nodeId)?.name ?? item.nodeId}{item.lastRunAt ? ` � last ${relativeTime(item.lastRunAt)}` : ""}</span>
              {item.lastStatus ? <small>{item.lastStatus}</small> : null}
            </div>
            <div className="inline-actions">
              {item.lastThreadId ? <Button size="sm" variant="ghost" onClick={() => void state.selectThread(item.lastThreadId!, item.nodeId)}>Open thread</Button> : null}
              <Button size="sm" variant="soft" onClick={async () => { await window.perch.runAutomation(item.id); await load(); }}><Play size={12} /> Run now</Button>
              <Toggle checked={item.enabled} onChange={async (value) => { await window.perch.saveAutomation({ ...item, enabled: value }); await load(); }} />
              <IconButton icon={<Trash2 size={13} />} label="Delete automation" onClick={async () => { await window.perch.deleteAutomation(item.id); await load(); }} />
            </div>
          </div>
        ))}
        {!items.length ? <p className="muted">No automations yet.</p> : null}
      </Section>
      <Section title="Results queue" subtitle="Latest runs and their outcome. Click a thread to inspect it; resolve it from the tree when done.">
        {items.filter((item) => item.lastThreadId).map((item) => {
          const thread = state.snapshot?.threads.find((entry) => entry.id === item.lastThreadId);
          return (
            <div key={`${item.id}-result`} className="simple-row">
              <div><strong>{item.name}</strong><span>{thread ? `${thread.title} � ${thread.status}` : item.lastThreadId}</span></div>
              {thread ? <Badge tone={thread.status === "error" ? "red" : thread.status === "running" ? "blue" : "neutral"}>{thread.status}</Badge> : null}
              <Button size="sm" variant="ghost" onClick={() => item.lastThreadId && void state.selectThread(item.lastThreadId, item.nodeId)}>Open</Button>
            </div>
          );
        })}
        {!items.some((item) => item.lastThreadId) ? <p className="muted">No runs yet.</p> : null}
      </Section>
    </>
  );
}

function SandboxTab() {
  const state = useApp();
  const settings = state.snapshot?.settings;
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [rulePattern, setRulePattern] = useState("");
  const [ruleAction, setRuleAction] = useState<"allow" | "ask" | "deny">("ask");
  const load = async () => setEntries(await window.perch.listAudit(200));
  useEffect(() => { void load(); }, []);
  if (!settings) return null;
  const sandbox = settings.sandbox ?? { enabled: false, allowedPaths: [], deniedCommands: [], allowNetwork: true };
  const update = (patch: any) => state.updateSettings({ settings: { sandbox: { ...sandbox, ...patch } } });
  return (
    <>
      <Section title="Policy" subtitle="Applies to app terminals, dev servers and the agent's environment prompt. Not a kernel sandbox.">
        <Row label="Enable policy" hint="Blocks matching commands in the app terminal and dev-server runner."><Toggle checked={sandbox.enabled} onChange={(value) => update({ enabled: value })} /></Row>
        <Row label="Allowed paths" hint="One per line. Injected into agent guidance; empty means the project plus app data."><textarea value={(sandbox.allowedPaths ?? []).join("\n")} onChange={(event) => update({ allowedPaths: event.target.value.split(/\r?\n/).filter(Boolean) })} placeholder="C:\\Users\\you\\code" /></Row>
        <Row label="Denied command fragments" hint="One per line. Case-insensitive substring match, e.g. rm -rf /, format C:, del /s."><textarea value={(sandbox.deniedCommands ?? []).join("\n")} onChange={(event) => update({ deniedCommands: event.target.value.split(/\r?\n/).filter(Boolean) })} placeholder="git push --force" /></Row>
        <Row label="Allow network" hint="When off, agent guidance forbids network commands and browser use is still explicit."><Toggle checked={sandbox.allowNetwork !== false} onChange={(value) => update({ allowNetwork: value })} /></Row>
        <Row label="Windows computer use" hint="Allows desktop screenshots and mouse/keyboard tools. Off by default."><Toggle checked={settings.computerUse} onChange={(value) => state.updateSettings({ settings: { computerUse: value } })} /></Row>
        <Row label="Auto-fix CI" hint="Lets the CI panel send failing logs to the thread automatically."><Toggle checked={settings.autoFixCi} onChange={(value) => state.updateSettings({ settings: { autoFixCi: value } })} /></Row>
        <Row label="Automatic file checkpoints" hint="Snapshot the checkout before each prompt so you can restore code later."><Toggle checked={settings.autoCheckpoints !== false} onChange={(value) => state.updateSettings({ settings: { autoCheckpoints: value } })} /></Row>
      </Section>
      <Section title="Permission rules" subtitle="Rules are opt-in exceptions evaluated before auto-approval." right={<Badge tone="green">Auto-approve default</Badge>}>
        <Row label="Add rule" hint="Patterns like Bash(npm run *), Edit, Write, mcp__*, or * for everything.">
          <div className="inline-actions">
            <input value={rulePattern} onChange={(event) => setRulePattern(event.target.value)} placeholder="Bash(git push *)" />
            <Select value={ruleAction} onChange={(value) => setRuleAction(value as "allow" | "ask" | "deny")}>
              <option value="allow">allow</option>
              <option value="ask">ask</option>
              <option value="deny">deny</option>
            </Select>
            <Button size="sm" variant="soft" disabled={!rulePattern.trim()} onClick={() => {
              const rules = [...(settings.permissions?.rules ?? []), { id: `rule_${Date.now().toString(36)}`, pattern: rulePattern.trim(), action: ruleAction }];
              state.updateSettings({ settings: { permissions: { rules } } });
              setRulePattern("");
            }}><Plus size={12} /> Add</Button>
          </div>
        </Row>
        {(settings.permissions?.rules ?? []).map((rule) => (
          <div key={rule.id} className="simple-row">
            <div><strong className="mono">{rule.pattern}</strong><span>{rule.action === "deny" ? "Always blocked" : rule.action === "ask" ? "Always asks" : "Auto-approved"}</span></div>
            <div className="inline-actions">
              <Badge tone={rule.action === "deny" ? "red" : rule.action === "ask" ? "amber" : "green"}>{rule.action}</Badge>
              <IconButton icon={<Trash2 size={12} />} label="Delete rule" onClick={() => {
                const rules = (settings.permissions?.rules ?? []).filter((item) => item.id !== rule.id);
                state.updateSettings({ settings: { permissions: { rules } } });
              }} />
            </div>
          </div>
        ))}
        {!(settings.permissions?.rules ?? []).length ? <p className="muted">No rules. Every tool call is auto-approved.</p> : null}
      </Section>
      <Section title="Audit trail" subtitle="Prompts, host tools, approvals, rule hits, terminals and deploys, newest first." right={<Button size="sm" variant="soft" onClick={() => void load()}><RefreshCw size={12} /> Refresh</Button>}>
        <div className="audit-list">
          {entries.map((entry, index) => (
            <div key={`${entry.at}-${index}`} className="audit-row">
              <span className="mono">{new Date(entry.at).toLocaleTimeString()}</span>
              <Badge tone={entry.tag.includes("block") ? "red" : entry.tag.includes("deploy") ? "green" : "neutral"}>{entry.tag}</Badge>
              <span>{truncate(typeof entry.detail === "string" ? entry.detail : JSON.stringify(entry.detail), 160)}</span>
            </div>
          ))}
          {!entries.length ? <p className="muted">No audit entries yet.</p> : null}
        </div>
      </Section>
    </>
  );
}

function PluginsTab() {
  const state = useApp();
  const [installed, setInstalled] = useState<InstalledPlugin[]>([]);
  const [source, setSource] = useState("");
  const [previews, setPreviews] = useState<PluginPreview[]>([]);
  const [selected, setSelected] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const load = async () => setInstalled(await window.perch.listPlugins());
  useEffect(() => { void load(); }, []);
  const preview = async () => {
    setBusy("preview");
    try {
      const list = await window.perch.previewPlugin(source);
      setPreviews(list);
      setSelected(list.length === 1 ? list[0].name : "");
      if (!list.length) state.pushToast({ kind: "warning", title: "No plugins found", body: "Check the repository or folder." });
    } catch (error) {
      state.pushToast({ kind: "error", title: "Plugin preview failed", body: String(error) });
    } finally {
      setBusy(null);
    }
  };
  const install = async () => {
    setBusy("install");
    try {
      const plugin = await window.perch.installPlugin(source, selected || undefined);
      state.pushToast({ kind: "success", title: "Plugin installed", body: `${plugin.name}: ${plugin.skills.length} skills, ${plugin.mcpServers.length} MCP servers` });
      setPreviews([]);
      setSource("");
      await load();
    } catch (error) {
      state.pushToast({ kind: "error", title: "Plugin install failed", body: String(error) });
    } finally {
      setBusy(null);
    }
  };
  return (
    <>
      <Section title="Install a plugin" subtitle="Git URL or local folder with plugin.json or .claude-plugin/marketplace.json. Skills and MCP servers are installed; hook code is counted but never executed.">
        <Row label="Source">
          <div className="inline-actions">
            <input value={source} onChange={(event) => setSource(event.target.value)} placeholder="https://github.com/org/plugin or C:\\plugins\\mine" />
            <Button size="sm" variant="soft" disabled={!source.trim() || busy !== null} onClick={() => void preview()}>{busy === "preview" ? <Spinner /> : <Search size={12} />} Preview</Button>
          </div>
        </Row>
        {previews.length ? (
          <div className="plugin-preview-list">
            {previews.map((plugin) => (
              <button key={plugin.name} type="button" className={cx("plugin-preview", selected === plugin.name && "active")} onClick={() => setSelected(plugin.name)}>
                <div><strong>{plugin.name}</strong><span>{plugin.description || "No description"}</span></div>
                <div className="plugin-components">
                  <Badge tone="blue">{plugin.skills} skills</Badge>
                  <Badge tone="purple">{plugin.commands} commands</Badge>
                  <Badge tone="neutral">{plugin.agents} agents</Badge>
                  <Badge tone="amber">{plugin.hooks} hooks (not run)</Badge>
                  <Badge tone="green">{plugin.mcpServers} MCP</Badge>
                </div>
              </button>
            ))}
            <Button size="sm" variant="primary" disabled={!selected || busy !== null} onClick={() => void install()}>{busy === "install" ? <Spinner /> : <Download size={12} />} Install {selected || "selected"}</Button>
          </div>
        ) : null}
      </Section>
      <Section title="Installed plugins" subtitle="Remove restores skills and MCP entries added by the plugin.">
        {installed.map((plugin) => (
          <div key={plugin.name} className="simple-row">
            <div>
              <strong>{plugin.name}</strong>
              <span>{plugin.skills.length} skills � {plugin.commands} commands � {plugin.mcpServers.length} MCP � {plugin.agents} agents � {plugin.hooks} hooks unused</span>
              <small className="mono">{plugin.source}</small>
            </div>
            <Button size="sm" variant="danger" onClick={async () => {
              if (!confirm(`Remove ${plugin.name} and its installed skills/MCP entries?`)) return;
              await window.perch.removePlugin(plugin.name);
              await load();
            }}>Remove</Button>
          </div>
        ))}
        {!installed.length ? <p className="muted">No plugins installed.</p> : null}
      </Section>
      <Section title="Safety" subtitle="Plugin hooks and mods are code execution. This app does not execute plugin hooks; only declarative skills, commands-as-skills and MCP servers are installed.">
        <p className="muted">Review a plugin before installing. MCP servers start local processes or connect to remote URLs, so install only sources you trust.</p>
      </Section>
    </>
  );
}

function RemoteTab() {
  const state = useApp();
  const settings = state.snapshot?.settings;
  const [info, setInfo] = useState<RemoteInfo | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [showToken, setShowToken] = useState(false);
  const [report, setReport] = useState<MaintenanceReport | null>(null);
  const [targets, setTargets] = useState<RemoteTarget[]>([]);
  const load = async () => setInfo(await window.perch.remoteInfo());
  const refreshTargets = async () => {
    setTargets(await window.perch.listRemoteTargets().catch(() => []));
  };
  useEffect(() => { void load(); }, []);
  useEffect(() => { void refreshTargets(); }, []);
  if (!settings) return null;
  const remote = settings.remote ?? { enabled: true, port: 43120, host: "127.0.0.1", keepRunning: false };
  const apply = async (patch: Partial<typeof remote>) => {
    setBusy("apply");
    try {
      await window.perch.stopRemote();
      await state.updateSettings({ settings: { remote: { ...remote, ...patch } } });
      const next = await window.perch.startRemote();
      setInfo(next);
    } catch (error) {
      state.pushToast({ kind: "error", title: "Could not apply remote settings", body: String(error) });
      await load();
    } finally {
      setBusy(null);
    }
  };
  const link = info?.urls[0] ? `${info.urls[0]}/#t=${encodeURIComponent(info.token)}` : "";
  const enable = async () => {
    setBusy("power");
    try {
      let next = await window.perch.startRemote();
      if (next.urls[0]?.includes("127.0.0.1")) {
        await window.perch.stopRemote();
        await state.updateSettings({ settings: { remote: { ...remote, host: "0.0.0.0" } } });
        next = await window.perch.startRemote();
      }
      setInfo(next);
    } catch (error) {
      state.pushToast({ kind: "error", title: "Could not start remote access", body: String(error) });
    } finally {
      setBusy(null);
    }
  };
  const disable = async () => {
    setBusy("power");
    try {
      setInfo(await window.perch.stopRemote());
    } catch (error) {
      state.pushToast({ kind: "error", title: "Could not stop remote access", body: String(error) });
    } finally {
      setBusy(null);
    }
  };
  return (
    <>
      <Section
        title="Use your phone"
        subtitle="Scan a QR code. Same Wi-Fi, no account, no setup."
        right={<Badge tone={info?.running ? "green" : "neutral"}>{info?.running ? "Ready" : "Off"}</Badge>}
      >
        {info?.running ? (
          <div className="remote-pair">
            {info.qr ? <img src={info.qr} alt="Phone pairing QR" /> : null}
            <div className="remote-pair-text">
              <strong>Scan with your phone camera</strong>
              <span>Point the camera at the code. Pi opens and installs itself.</span>
              <div className="inline-actions">
                <Button size="sm" variant="soft" disabled={!link} onClick={() => { void navigator.clipboard.writeText(link); state.pushToast({ kind: "info", title: "Link copied" }); }}><Copy size={12} /> Copy link</Button>
                <Button size="sm" variant="ghost" disabled={busy !== null} onClick={() => void disable()}>{busy === "power" ? <Spinner /> : <Power size={12} />} Turn off</Button>
              </div>
              <small>Phone on the same Wi-Fi. For another network, open More options.</small>
            </div>
          </div>
        ) : (
          <div className="remote-off">
            <div>
              <strong>Ready to pair</strong>
              <span>We show a QR code. Scan it with your phone.</span>
            </div>
            <Button size="md" variant="primary" disabled={busy !== null} onClick={() => void enable()}>{busy === "power" ? <Spinner /> : <QrCode size={14} />} Show QR</Button>
          </div>
        )}
        {info?.error ? <p className="connector-result">{info.error}</p> : null}
      </Section>

      {targets.length ? <MachinesCard targets={targets} onChange={setTargets} /> : null}

      <Disclosure title="More options" subtitle="Another network, other machines, server settings and cleanup.">
        <RelaySettings />
        <PairMachine targets={targets} onChange={setTargets} />
        <Section title="Server" subtitle="Defaults work. Change these only if you need to.">
          <Row label="Bind address" hint="0.0.0.0 lets phones on the same Wi-Fi connect. Use 127.0.0.1 to keep it local-only.">
            <div className="inline-actions">
              <input value={remote.host} onChange={(event) => state.updateSettings({ settings: { remote: { ...remote, host: event.target.value } } })} />
              <input className="num-input" type="number" min={1024} max={65535} value={remote.port} onChange={(event) => state.updateSettings({ settings: { remote: { ...remote, port: Number(event.target.value) } } })} />
              <Button size="sm" variant="soft" disabled={busy !== null} onClick={() => void apply({})}>{busy === "apply" ? <Spinner /> : <RefreshCw size={12} />} Apply</Button>
            </div>
          </Row>
          <Row label="Keep running when the window closes" hint="Hide to the tray instead of quitting, so your phone can keep using this machine.">
            <Toggle checked={!!remote.keepRunning} onChange={(value) => state.updateSettings({ settings: { remote: { ...remote, keepRunning: value } } })} />
          </Row>
          {info?.urls.length ? (
            <Row label="Addresses">
              <div className="remote-urls">
                {info.urls.map((url) => <button key={url} type="button" className="remote-url" onClick={() => void window.perch.openExternal(url)}>{url}</button>)}
              </div>
            </Row>
          ) : null}
          {info ? (
            <Row label="Pairing token" hint="Required by every device. Rotate to revoke all phones.">
              <div className="inline-actions">
                <input type={showToken ? "text" : "password"} readOnly value={info.token} />
                <Button size="sm" variant="ghost" onClick={() => setShowToken((value) => !value)}>{showToken ? "Hide" : "Show"}</Button>
                <Button size="sm" variant="outline" disabled={busy !== null} onClick={async () => {
                  if (!confirm("Rotate the token? Every paired phone will be disconnected.")) return;
                  setBusy("rotate");
                  try { setInfo(await window.perch.rotateRemoteToken()); state.pushToast({ kind: "success", title: "Token rotated" }); } finally { setBusy(null); }
                }}>Rotate</Button>
              </div>
            </Row>
          ) : null}
        </Section>
        <Section title="Cleanup" subtitle="Prunes sessions, workspaces, worktrees, share bundles, artifacts and logs inside the Pi data directory.">
          <div className="inline-actions">
            <Button size="sm" variant="soft" disabled={busy !== null} onClick={async () => {
              setBusy("sweep");
              try { setReport(await window.perch.maintenanceSweep(false)); } catch (error) { state.pushToast({ kind: "error", title: "Cleanup failed", body: String(error) }); } finally { setBusy(null); }
            }}>{busy === "sweep" ? <Spinner /> : <Trash2 size={12} />} Clean up now</Button>
            <Button size="sm" variant="ghost" disabled={busy !== null} onClick={async () => {
              setBusy("preview");
              try { setReport(await window.perch.maintenanceSweep(true)); } finally { setBusy(null); }
            }}>Preview</Button>
          </div>
          {report ? (
            <p className="muted">
              {report.dryRun ? "Would reclaim " : "Reclaimed "}{formatBytes(report.bytesReclaimed)} across {report.actions.length} item{report.actions.length === 1 ? "" : "s"} in {report.durationMs} ms.
              {report.warnings.length ? ` ${report.warnings.join("; ")}` : ""}
            </p>
          ) : <p className="muted">Runs automatically at startup and every five minutes.</p>}
        </Section>
      </Disclosure>
    </>
  );
}

function RelaySettings() {
  const state = useApp();
  const [info, setInfo] = useState<RelayInfo | null>(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ url: "", room: "", token: "", secret: "" });
  useEffect(() => {
    void window.perch.relayInfo().then((next: RelayInfo) => {
      setInfo(next);
      setForm({ url: next.url, room: next.room, token: "", secret: "" });
    }).catch(() => undefined);
  }, []);
  const save = async (enabled: boolean) => {
    setBusy(true);
    try {
      const next = await window.perch.configureRelay({ enabled, url: form.url, room: form.room, token: form.token, secret: form.secret });
      setInfo(next);
      setForm({ url: next.url, room: next.room, token: "", secret: "" });
    } catch (error) {
      state.pushToast({ kind: "error", title: "Relay failed", body: String(error) });
    } finally {
      setBusy(false);
    }
  };
  const relayCommand = "docker run -d --restart unless-stopped --name perch-relay -p 43150:43150 ghcr.io/tspen/perch-relay:latest";
  return (
    <Section
      title="Use away from home"
      subtitle="Run this on a VPS you own, paste its HTTPS address once, then scan the relay QR."
      right={<Badge tone={info?.connected ? "green" : info?.running ? "amber" : "neutral"}>{info?.connected ? "Connected" : info?.running ? "Connecting" : "Off"}</Badge>}
    >
      <div className="remote-command">
        <code>{relayCommand}</code>
        <Button size="sm" variant="ghost" onClick={() => { void navigator.clipboard.writeText(relayCommand); state.pushToast({ kind: "info", title: "Command copied" }); }}><Copy size={12} /> Copy</Button>
      </div>
      <p className="muted">Use an HTTPS address (Caddy, nginx or a Cloudflare Tunnel). The relay only forwards encrypted frames.</p>
      <div className="remote-target-form">
        <input placeholder="https://relay.example.com" value={form.url} onChange={(event) => setForm({ ...form, url: event.target.value })} />
        <Button size="sm" variant="soft" disabled={busy || !form.url.trim()} onClick={() => void save(true)}>{busy ? <Spinner /> : <Cloud size={12} />} Connect</Button>
        {info?.running ? <Button size="sm" variant="outline" disabled={busy} onClick={() => void save(false)}>Disconnect</Button> : null}
      </div>
      {info?.error ? <p className="muted">{info.error}</p> : null}
      {info?.connected ? (
        <div className="remote-qr">
          {info.qr ? <img src={info.qr} alt="Relay pairing QR" /> : null}
          <div>
            <strong>Scan once to use Pi anywhere</strong>
            <span>Room {info.room} · {info.clients} client(s). Prompts and files stay encrypted; the relay sees ciphertext only.</span>
            <div className="inline-actions">
              {info.link ? <Button size="sm" variant="soft" onClick={() => { void navigator.clipboard.writeText(info.link!); state.pushToast({ kind: "info", title: "Relay link copied" }); }}><Copy size={12} /> Copy link</Button> : null}
              {info.link ? <Button size="sm" variant="ghost" onClick={() => void window.perch.openExternal(info!.link!)}><ExternalLink size={12} /> Open</Button> : null}
            </div>
          </div>
        </div>
      ) : null}
    </Section>
  );
}

function MachinesCard({ targets, onChange }: { targets: RemoteTarget[]; onChange: (targets: RemoteTarget[]) => void }) {
  const state = useApp();
  const threads = useMemo(() => [...(state.snapshot?.threads ?? [])].sort((a, b) => b.updatedAt - a.updatedAt), [state.snapshot?.threads]);
  const [threadId, setThreadId] = useState(state.selectedThreadId ?? "");
  const [targetId, setTargetId] = useState(targets[0]?.id ?? "");
  const [busy, setBusy] = useState<string | null>(null);
  const [result, setResult] = useState("");
  const target = targets.find((item) => item.id === targetId) ?? targets[0];
  const selectedThread = threads.find((thread) => thread.id === threadId);
  const selectedRunning = !!selectedThread && ["running", "starting", "waiting", "queued"].includes(selectedThread.status);
  const move = async (mode: "wait" | "stop") => {
    if (!target) return;
    setBusy("move");
    setResult("");
    try {
      const moved = await window.perch.moveThreadToTarget(threadId, target.id, mode);
      if ("queued" in moved) {
        setResult(moved.message);
      } else {
        setResult(`Moved to ${target.name}.`);
      }
    } catch (error) {
      setResult(String(error));
    } finally {
      setBusy(null);
    }
  };
  return (
    <Section title="Your machines" subtitle="Send this session to another machine. It keeps its workspace and chat.">
      <div className="remote-targets">
        {targets.map((item) => (
          <div key={item.id} className="remote-target">
            <div>
              <strong>{item.name}</strong>
              <span>{item.status}{item.latencyMs ? ` · ${item.latencyMs} ms` : ""}{item.error ? ` · ${item.error}` : ""}</span>
            </div>
            <div className="inline-actions">
              <Button size="sm" variant="ghost" disabled={busy !== null} onClick={async () => {
                setBusy(item.id);
                try { onChange(await window.perch.testRemoteTarget(item.id)); } finally { setBusy(null); }
              }}>Test</Button>
              <Button size="sm" variant="outline" disabled={busy !== null} onClick={async () => {
                if (!confirm(`Remove ${item.name}? The token is deleted from this device.`)) return;
                onChange(await window.perch.removeRemoteTarget(item.id));
              }}>Remove</Button>
            </div>
          </div>
        ))}
      </div>
      <div className="remote-target-form">
        <select value={threadId} onChange={(event) => setThreadId(event.target.value)}>
          <option value="">Choose a session…</option>
          {threads.map((thread) => <option key={thread.id} value={thread.id}>{thread.title}</option>)}
        </select>
        {targets.length > 1 ? (
          <select value={targetId} onChange={(event) => setTargetId(event.target.value)}>
            {targets.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        ) : null}
        <Button size="sm" variant="soft" disabled={busy !== null || !threadId || !target} onClick={() => void move("wait")}>
          {busy === "move" ? <Spinner /> : <Clock size={12} />} {selectedRunning ? "Move after turn" : "Move"}
        </Button>
        {selectedRunning ? (
          <Button size="sm" variant="danger" disabled={busy !== null || !threadId || !target} onClick={() => void move("stop")}>
            <CircleStop size={12} /> Stop & move
          </Button>
        ) : null}
      </div>
      {result ? <p className="muted">{result}</p> : null}
    </Section>
  );
}

function PairMachine({ targets, onChange }: { targets: RemoteTarget[]; onChange: (targets: RemoteTarget[]) => void }) {
  const state = useApp();
  const [pairLink, setPairLink] = useState("");
  const [busy, setBusy] = useState(false);
  const command = "docker run -d --restart unless-stopped -p 43120:43120 -v perch-data:/data ghcr.io/tspen/perch-runner:latest";
  return (
    <Section title="Add another machine" subtitle="Run this on a VPS or spare PC, then paste the pairing link from its logs (swap 127.0.0.1 for its address).">
      <div className="remote-command">
        <code>{command}</code>
        <Button size="sm" variant="ghost" onClick={() => { void navigator.clipboard.writeText(command); state.pushToast({ kind: "info", title: "Command copied" }); }}><Copy size={12} /> Copy</Button>
      </div>
      <div className="remote-target-form">
        <input placeholder="http://host:43120/#t=..." value={pairLink} onChange={(event) => setPairLink(event.target.value)} />
        <Button size="sm" variant="soft" disabled={busy || !pairLink.trim()} onClick={async () => {
          setBusy(true);
          try {
            const paired = await window.perch.pairRemoteTarget(pairLink);
            onChange(paired.targets);
            setPairLink("");
            state.pushToast({ kind: "success", title: "Machine added", body: paired.target.name });
          } catch (error) {
            state.pushToast({ kind: "error", title: "Could not add machine", body: String(error) });
          } finally {
            setBusy(false);
          }
        }}>{busy ? <Spinner /> : <Plus size={12} />} Add machine</Button>
      </div>
      {targets.length ? <p className="muted">{targets.length} machine{targets.length === 1 ? "" : "s"} connected.</p> : null}
    </Section>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}















