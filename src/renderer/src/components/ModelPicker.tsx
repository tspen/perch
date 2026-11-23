import React, { useMemo, useRef, useState } from "react";
import { Check, Search, Sparkles, X } from "lucide-react";
import type { ModelInfo } from "../../../shared/types";
import { Badge, Button, IconButton, formatCost, formatNumber, cx } from "./Common";

export function ModelPicker({
  models,
  value,
  role,
  onSelect,
  onClose,
}: {
  models: ModelInfo[];
  value: string;
  role?: "root" | "group" | "project" | "worker" | "naming" | "memory";
  onSelect: (selector: string) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [provider, setProvider] = useState("all");
  const inputRef = useRef<HTMLInputElement>(null);
  React.useEffect(() => {
    inputRef.current?.focus();
  }, []);
  const candidates = useMemo(
    () => models.filter((model) => model.available && !model.id.includes(":batch") && !/\\(batch\\)/i.test(model.name) && !model.id.includes("~")),
    [models],
  );
  const providers = useMemo(() => ["all", ...new Set(candidates.map((model) => model.provider))], [candidates]);
  React.useEffect(() => {
    if (provider !== "all" && !providers.includes(provider)) setProvider("all");
  }, [providers, provider]);
  const filtered = useMemo(() => {
    const lower = query.toLowerCase();
    return candidates
      .filter((model) => provider === "all" || model.provider === provider)
      .filter((model) => !lower || model.name.toLowerCase().includes(lower) || model.selector.toLowerCase().includes(lower))
      .sort((a, b) => b.quality - a.quality);
  }, [candidates, provider, query]);
  const recommended = filtered.filter((model) => model.recommended).slice(0, 6);

  return (
    <div className="model-picker" onMouseDown={(event) => event.stopPropagation()}>
      <header>
        <div className="model-picker-title">
          <Sparkles size={15} />
          <strong>Choose model</strong>
          <span>Pi selector · Artificial Analysis score</span>
        </div>
        <IconButton icon={<X size={14} />} label="Close" onClick={onClose} />
      </header>
      <div className="model-picker-search">
        <Search size={14} />
        <input ref={inputRef} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search models…" />
      </div>
      <div className="model-picker-providers">
        {providers.map((item) => (
          <button key={item} type="button" className={cx(item === provider && "active")} onClick={() => setProvider(item)}>
            {item === "all" ? "All providers" : item}
          </button>
        ))}
      </div>
      <div className="model-picker-list">
        {recommended.length ? (
          <div className="model-section-label">Recommended for {role ?? "this thread"}</div>
        ) : null}
        {recommended.map((model) => (
          <ModelRow key={`rec-${model.selector}`} model={model} active={model.selector === value} onSelect={onSelect} />
        ))}
        {recommended.length ? <div className="model-section-label">All models</div> : null}
        {filtered.map((model) => (
          <ModelRow key={model.selector} model={model} active={model.selector === value} onSelect={onSelect} />
        ))}
        {!filtered.length ? <div className="model-empty">No models match.</div> : null}
      </div>
      <footer>
        <span>{filtered.length} models available</span>
        <span>AA data refreshes daily · attribution artificialanalysis.ai</span>
      </footer>
    </div>
  );
}

function ModelRow({ model, active, onSelect }: { model: ModelInfo; active: boolean; onSelect: (selector: string) => void }) {
  return (
    <button type="button" className={cx("model-row", active && "active")} onClick={() => onSelect(model.selector)}>
      <div className="model-row-main">
        <span className="model-name">{model.name}</span>
        <span className="model-sub">{model.selector}</span>
      </div>
      <div className="model-metrics">
        <Badge tone={scoreTone(model.aa?.agentic ?? model.quality)}>{model.aa?.agentic != null ? `AG ${model.aa.agentic.toFixed(0)}` : model.aa?.intelligence != null ? `AA ${model.aa.intelligence.toFixed(0)}` : `Q ${model.quality.toFixed(0)}`}</Badge>
        {model.aa?.value != null ? <Badge tone="purple">V {model.aa.value.toFixed(1)}</Badge> : null}
        <span>{formatNumber(model.contextWindow)} ctx</span>
        {model.included ? <><Badge tone="green">included</Badge><span className="model-ref">ref {formatCost(model.cost.input)}/{formatCost(model.cost.output)}</span></> : <span>{formatCost(model.cost.input)}/{formatCost(model.cost.output)}</span>}
        {model.reasoning ? <Badge tone="purple">reasoning</Badge> : null}
      </div>
      {active ? <Check size={15} className="model-check" /> : null}
    </button>
  );
}

function scoreTone(score: number): "green" | "blue" | "amber" | "neutral" {
  if (score >= 80) return "green";
  if (score >= 65) return "blue";
  if (score >= 50) return "amber";
  return "neutral";
}

