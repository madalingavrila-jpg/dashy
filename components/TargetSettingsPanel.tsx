"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { AgentViewRow, MtdHistoryMonth, WeeklyHistoryRow } from "@/types/dashboard";
import {
  TARGET_SETTINGS_PASSWORD,
  clearTargetConfig,
  defaultTargetConfig,
  fetchTargetConfig,
  formatTargetSummary,
  isTargetSettingsUnlocked,
  loadTargetConfig,
  saveTargetConfig,
  setTargetSettingsUnlocked,
  type TargetConfig,
  type WeeklyStatusTargets,
} from "@/lib/targetConfig";
import { currentMonthKey, mtdMonthOptions } from "@/lib/mtdMonth";
import { weekOptionsFromHistory } from "@/lib/wowCompare";
import { WEEKLY_STATUS_KEYS, WEEKLY_STATUS_LABELS } from "@/lib/weekly-stages";

type TargetSettingsPanelProps = {
  agents?: AgentViewRow[];
  loading?: boolean;
  mtdHistory?: MtdHistoryMonth[];
  weeklyHistory?: WeeklyHistoryRow[];
  currentWeek?: string;
};

function NumberField({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}) {
  return (
    <label className="block space-y-xs">
      <span className="text-label-md font-semibold text-on-surface-variant">{label}</span>
      <input
        type="number"
        min={0}
        step={1}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(Math.max(0, Number.parseInt(event.target.value, 10) || 0))}
        className="w-full rounded-lg border-none bg-surface-container px-md py-2 text-body-md font-data-mono focus:ring-2 focus:ring-primary disabled:opacity-60"
      />
    </label>
  );
}

export function TargetSettingsPanel({
  agents,
  loading,
  mtdHistory,
  weeklyHistory,
  currentWeek,
}: TargetSettingsPanelProps) {
  const [unlocked, setUnlocked] = useState(false);
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [draft, setDraft] = useState<TargetConfig>(defaultTargetConfig());
  const [savedSummary, setSavedSummary] = useState(formatTargetSummary(defaultTargetConfig()));
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setUnlocked(isTargetSettingsUnlocked());
    void fetchTargetConfig()
      .then((config) => {
        setDraft(config);
        setSavedSummary(formatTargetSummary(config));
      })
      .catch(() => {
        const config = loadTargetConfig();
        setDraft(config);
        setSavedSummary(formatTargetSummary(config));
      });
  }, []);

  const sortedAgents = useMemo(
    () =>
      (agents ?? [])
        .slice()
        .sort((a, b) => a.segment.localeCompare(b.segment) || a.name.localeCompare(b.name)),
    [agents],
  );

  const defaultMonthKey = useMemo(() => currentMonthKey(), []);
  const monthOptions = useMemo(() => {
    const options = mtdMonthOptions(mtdHistory);
    if (options.length) return options;
    if (!defaultMonthKey) return [];
    return [{ value: defaultMonthKey, label: defaultMonthKey }];
  }, [mtdHistory, defaultMonthKey]);
  const weekOptions = useMemo(
    () => weekOptionsFromHistory(weeklyHistory),
    [weeklyHistory],
  );
  const defaultWeek = useMemo(
    () => currentWeek ?? weekOptions.at(-1) ?? "",
    [currentWeek, weekOptions],
  );

  const selectClass =
    "min-w-[6.5rem] rounded-lg border border-outline-variant/60 bg-surface-container px-sm py-1 text-[11px] font-medium text-on-surface focus:border-primary focus:ring-2 focus:ring-primary/30 disabled:opacity-50";

  const handleUnlock = useCallback(() => {
    if (password === TARGET_SETTINGS_PASSWORD) {
      setTargetSettingsUnlocked(true);
      setUnlocked(true);
      setPasswordError(null);
      setPassword("");
      return;
    }
    setPasswordError("Incorrect password.");
  }, [password]);

  const handleLock = useCallback(() => {
    setTargetSettingsUnlocked(false);
    setUnlocked(false);
    setPassword("");
    setPasswordError(null);
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setSaveMessage(null);
    try {
      await saveTargetConfig(draft);
      setSavedSummary(formatTargetSummary(draft));
      setSaveMessage("Targets saved — visible to all users.");
    } catch {
      setSaveMessage("Saved locally only — server unavailable. Retry when online.");
    } finally {
      setSaving(false);
      window.setTimeout(() => setSaveMessage(null), 5000);
    }
  }, [draft]);

  const handleReset = useCallback(async () => {
    setSaving(true);
    setSaveMessage(null);
    const defaults = defaultTargetConfig();
    setDraft(defaults);
    try {
      await clearTargetConfig();
      setSavedSummary(formatTargetSummary(defaults));
      setSaveMessage("Reset to defaults — visible to all users.");
    } catch {
      setSavedSummary(formatTargetSummary(defaults));
      setSaveMessage("Reset locally — server unavailable.");
    } finally {
      setSaving(false);
      window.setTimeout(() => setSaveMessage(null), 5000);
    }
  }, []);

  const updateSegment = (
    segment: "complex" | "density",
    field: "won" | "activated",
    value: number,
  ) => {
    setDraft((prev) => ({
      ...prev,
      segment: {
        ...prev.segment,
        [segment]: { ...prev.segment[segment], [field]: value },
      },
    }));
  };

  const updateWeeklySegment = (
    segment: "complex" | "density",
    field: keyof WeeklyStatusTargets,
    value: number,
  ) => {
    setDraft((prev) => ({
      ...prev,
      weekly: {
        ...prev.weekly,
        [segment]: { ...prev.weekly[segment], [field]: value },
      },
    }));
  };

  const updatePerRep = (ownerId: string, field: "won" | "activated", value: string) => {
    const parsed = value === "" ? undefined : Math.max(0, Number.parseInt(value, 10) || 0);
    setDraft((prev) => {
      const nextPerRep = { ...prev.perRep };
      const existing = { ...nextPerRep[ownerId] };
      if (parsed === undefined) {
        delete existing[field];
      } else {
        existing[field] = parsed;
        if (!existing.monthKey) {
          existing.monthKey = defaultMonthKey;
        }
      }
      if (existing.won == null && existing.activated == null) {
        delete nextPerRep[ownerId];
      } else {
        nextPerRep[ownerId] = existing;
      }
      return { ...prev, perRep: nextPerRep };
    });
  };

  const updatePerRepMonth = (ownerId: string, monthKey: string) => {
    setDraft((prev) => {
      const existing = prev.perRep[ownerId];
      if (!existing) return prev;
      return {
        ...prev,
        perRep: {
          ...prev.perRep,
          [ownerId]: { ...existing, monthKey },
        },
      };
    });
  };

  const updateWeeklyPerRep = (ownerId: string, field: keyof WeeklyStatusTargets, value: string) => {
    const parsed = value === "" ? undefined : Math.max(0, Number.parseInt(value, 10) || 0);
    setDraft((prev) => {
      const nextWeeklyPerRep = { ...prev.weeklyPerRep };
      const existing = { ...nextWeeklyPerRep[ownerId] };
      if (parsed === undefined) {
        delete existing[field];
      } else {
        existing[field] = parsed;
        if (!existing.week) {
          existing.week = defaultWeek;
        }
      }
      const hasWeeklyValues = WEEKLY_STATUS_KEYS.some((key) => existing[key] != null);
      if (!hasWeeklyValues) {
        delete nextWeeklyPerRep[ownerId];
      } else {
        nextWeeklyPerRep[ownerId] = existing;
      }
      return { ...prev, weeklyPerRep: nextWeeklyPerRep };
    });
  };

  const updateWeeklyPerRepWeek = (ownerId: string, week: string) => {
    setDraft((prev) => {
      const existing = prev.weeklyPerRep[ownerId];
      if (!existing) return prev;
      return {
        ...prev,
        weeklyPerRep: {
          ...prev.weeklyPerRep,
          [ownerId]: { ...existing, week },
        },
      };
    });
  };

  const toggleAgentPause = (ownerId: string, paused: boolean) => {
    setDraft((prev) => ({
      ...prev,
      pausedAgentIds: paused
        ? [...new Set([...prev.pausedAgentIds, ownerId])]
        : prev.pausedAgentIds.filter((id) => id !== ownerId),
    }));
  };

  const pausedCount = draft.pausedAgentIds.length;

  return (
    <div className="glass-card rounded-xl border-l-4 border-l-primary p-lg shadow-md">
      <div className="mb-md flex flex-wrap items-start justify-between gap-md">
        <div>
          <div className="mb-xs flex items-center gap-sm">
            <span className="material-symbols-outlined text-primary">flag</span>
            <h3 id="mtd-targets-heading" className="text-title-lg font-title-lg font-bold">
              Targets (MTD + Weekly)
            </h3>
          </div>
          <p className="text-body-md text-on-surface-variant">
            Segment defaults and per-rep overrides. Saved to the shared server config — all users
            see the same targets. Does not change <code className="text-sm">data/dashboard.json</code>.
          </p>
          <p className="mt-xs text-label-md text-on-surface-variant">
            Active: {savedSummary}
          </p>
        </div>
        {unlocked && (
          <button
            type="button"
            onClick={handleLock}
            className="rounded-lg bg-surface-container px-md py-sm text-label-md font-semibold text-on-surface-variant transition-colors hover:bg-surface-container-high"
          >
            Lock
          </button>
        )}
      </div>

      {!unlocked ? (
        <div className="space-y-md">
          <div className="rounded-lg border border-outline-variant/60 bg-surface-container-low/80 p-md">
            <p className="mb-sm text-label-md font-bold uppercase tracking-wide text-on-surface-variant">
              Weekly status targets (preview)
            </p>
            <p className="text-body-md text-on-surface-variant">
              Used in Weekly tab drill-down: Qualified, Negotiations, Closed Won, Active — per rep,
              per week.
            </p>
            <dl className="mt-md grid grid-cols-1 gap-sm text-body-md md:grid-cols-2">
              <div>
                <dt className="font-semibold text-on-surface">Complex / rep / week</dt>
                <dd className="text-on-surface-variant">
                  {WEEKLY_STATUS_KEYS.map((key) => draft.weekly.complex[key]).join(" · ")} (Qual ·
                  Neg · Won · Act)
                </dd>
              </div>
              <div>
                <dt className="font-semibold text-on-surface">Density / rep / week</dt>
                <dd className="text-on-surface-variant">
                  {WEEKLY_STATUS_KEYS.map((key) => draft.weekly.density[key]).join(" · ")} (Qual ·
                  Neg · Won · Act)
                </dd>
              </div>
            </dl>
          </div>
          <div className="max-w-sm space-y-sm">
          <p className="text-body-md text-on-surface-variant">
            Enter the admin password to edit MTD and weekly targets.
          </p>
          <div className="flex gap-sm">
            <input
              type="password"
              value={password}
              placeholder="Password"
              onChange={(event) => {
                setPassword(event.target.value);
                setPasswordError(null);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") handleUnlock();
              }}
              className="flex-1 rounded-lg border-none bg-surface-container px-md py-2 text-body-md focus:ring-2 focus:ring-primary"
            />
            <button
              type="button"
              onClick={handleUnlock}
              className="rounded-lg bg-primary px-md py-2 text-label-md font-bold text-on-primary transition-opacity hover:opacity-90"
            >
              Unlock
            </button>
          </div>
          {passwordError && <p className="text-label-md text-error">{passwordError}</p>}
          </div>
        </div>
      ) : (
        <div className="space-y-lg">
          <div className="grid grid-cols-1 gap-md md:grid-cols-2">
            <div className="rounded-lg bg-surface-container-low/60 p-md">
              <h4 className="mb-md text-label-md font-bold uppercase tracking-wide text-on-surface-variant">
                Complex segment defaults
              </h4>
              <div className="grid grid-cols-2 gap-md">
                <NumberField
                  label="Won / rep / month"
                  value={draft.segment.complex.won}
                  onChange={(value) => updateSegment("complex", "won", value)}
                />
                <NumberField
                  label="Activated / rep / month"
                  value={draft.segment.complex.activated}
                  onChange={(value) => updateSegment("complex", "activated", value)}
                />
              </div>
            </div>
            <div className="rounded-lg bg-surface-container-low/60 p-md">
              <h4 className="mb-md text-label-md font-bold uppercase tracking-wide text-on-surface-variant">
                Density segment defaults
              </h4>
              <div className="grid grid-cols-2 gap-md">
                <NumberField
                  label="Won / rep / month"
                  value={draft.segment.density.won}
                  onChange={(value) => updateSegment("density", "won", value)}
                />
                <NumberField
                  label="Activated / rep / month"
                  value={draft.segment.density.activated}
                  onChange={(value) => updateSegment("density", "activated", value)}
                />
              </div>
            </div>
          </div>

          <div>
            <h4 className="mb-sm text-label-md font-bold uppercase tracking-wide text-on-surface-variant">
              Weekly status targets · per rep
            </h4>
            <p className="mb-md text-body-md text-on-surface-variant">
              Used in Weekly tab drill-down: Qualified, Negotiations, Closed Won, Active.
            </p>
            <div className="grid grid-cols-1 gap-md md:grid-cols-2">
              {(["complex", "density"] as const).map((segment) => (
                <div key={segment} className="rounded-lg bg-surface-container-low/60 p-md">
                  <h5 className="mb-md text-label-md font-bold uppercase tracking-wide text-on-surface-variant">
                    {segment === "complex" ? "Complex" : "Density"} weekly / rep
                  </h5>
                  <div className="grid grid-cols-2 gap-md">
                    {WEEKLY_STATUS_KEYS.map((key) => (
                      <NumberField
                        key={key}
                        label={WEEKLY_STATUS_LABELS[key]}
                        value={draft.weekly[segment][key]}
                        onChange={(value) => updateWeeklySegment(segment, key, value)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="mb-sm text-label-md font-bold uppercase tracking-wide text-on-surface-variant">
              Paused agents
            </h4>
            <p className="mb-md text-body-md text-on-surface-variant">
              Paused reps stay visible with their actual MTD and weekly counts, but are excluded
              from team target totals and rep-count denominators
              {pausedCount > 0 ? ` (${pausedCount} paused)` : ""}.
            </p>
            {loading && !sortedAgents.length ? (
              <p className="text-on-surface-variant">Loading agents…</p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-outline-variant/60">
                <table className="w-full min-w-[480px] text-left text-body-md">
                  <thead className="bg-surface-container-low">
                    <tr>
                      <th className="px-md py-sm text-label-md font-semibold uppercase text-on-surface-variant">
                        Agent
                      </th>
                      <th className="px-md py-sm text-label-md font-semibold uppercase text-on-surface-variant">
                        Segment
                      </th>
                      <th className="px-md py-sm text-label-md font-semibold uppercase text-on-surface-variant">
                        On pause
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedAgents.map((agent) => {
                      const paused = draft.pausedAgentIds.includes(agent.ownerId);
                      return (
                        <tr
                          key={agent.ownerId}
                          className={`border-t border-outline-variant/40 ${paused ? "bg-surface-container-low/80" : ""}`}
                        >
                          <td className="px-md py-sm font-semibold">{agent.name}</td>
                          <td className="px-md py-sm text-on-surface-variant">{agent.segment}</td>
                          <td className="px-md py-sm">
                            <label className="inline-flex cursor-pointer items-center gap-sm">
                              <input
                                type="checkbox"
                                checked={paused}
                                onChange={(event) =>
                                  toggleAgentPause(agent.ownerId, event.target.checked)
                                }
                                className="h-4 w-4 rounded border-outline-variant text-primary focus:ring-primary"
                              />
                              <span className="text-label-md text-on-surface-variant">
                                {paused ? "Paused — excluded from targets" : "Active"}
                              </span>
                            </label>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div>
            <h4 className="mb-sm text-label-md font-bold uppercase tracking-wide text-on-surface-variant">
              Per-rep overrides
            </h4>
            <p className="mb-md text-body-md text-on-surface-variant">
              Leave blank to use the segment default. When you enter a number, pick the month (MTD)
              or week (weekly status) it applies to.
            </p>
            {loading && !sortedAgents.length ? (
              <p className="text-on-surface-variant">Loading agents…</p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-outline-variant/60">
                <table className="w-full min-w-[1100px] text-left text-body-md">
                  <thead className="bg-surface-container-low">
                    <tr>
                      <th
                        rowSpan={2}
                        className="border-b border-outline-variant/40 px-md py-sm text-label-md font-semibold uppercase text-on-surface-variant"
                      >
                        Agent
                      </th>
                      <th
                        rowSpan={2}
                        className="border-b border-outline-variant/40 px-md py-sm text-label-md font-semibold uppercase text-on-surface-variant"
                      >
                        Segment
                      </th>
                      <th
                        colSpan={3}
                        className="border-b border-outline-variant/40 px-md py-xs text-center text-label-md font-semibold uppercase text-on-surface-variant"
                      >
                        MTD / month
                      </th>
                      <th
                        colSpan={5}
                        className="border-b border-outline-variant/40 px-md py-xs text-center text-label-md font-semibold uppercase text-on-surface-variant"
                      >
                        Weekly / rep
                      </th>
                    </tr>
                    <tr>
                      <th className="px-md py-sm text-label-md font-semibold uppercase text-on-surface-variant">
                        Won
                      </th>
                      <th className="px-md py-sm text-label-md font-semibold uppercase text-on-surface-variant">
                        Activated
                      </th>
                      <th className="px-md py-sm text-label-md font-semibold uppercase text-on-surface-variant">
                        Month
                      </th>
                      {WEEKLY_STATUS_KEYS.map((key) => (
                        <th
                          key={key}
                          className="px-md py-sm text-label-md font-semibold uppercase text-on-surface-variant"
                          title={WEEKLY_STATUS_LABELS[key]}
                        >
                          {key === "closedWon" ? "Won" : key === "negotiations" ? "Neg" : key === "qualified" ? "Qual" : "Act"}
                        </th>
                      ))}
                      <th className="px-md py-sm text-label-md font-semibold uppercase text-on-surface-variant">
                        Week
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedAgents.map((agent) => {
                      const segmentKey = agent.segment === "Complex" ? "complex" : "density";
                      const mtdDefaults = draft.segment[segmentKey];
                      const weeklyDefaults = draft.weekly[segmentKey];
                      const mtdOverride = draft.perRep[agent.ownerId];
                      const weeklyOverride = draft.weeklyPerRep[agent.ownerId];
                      const hasMtdOverride =
                        mtdOverride?.won != null || mtdOverride?.activated != null;
                      const hasWeeklyOverride = WEEKLY_STATUS_KEYS.some(
                        (key) => weeklyOverride?.[key] != null,
                      );
                      const inputClass =
                        "w-16 rounded-lg border-none bg-surface-container px-sm py-1 text-body-md font-data-mono focus:ring-2 focus:ring-primary";
                      return (
                        <tr key={agent.ownerId} className="border-t border-outline-variant/40">
                          <td className="px-md py-sm font-semibold">{agent.name}</td>
                          <td className="px-md py-sm text-on-surface-variant">{agent.segment}</td>
                          <td className="px-md py-sm">
                            <input
                              type="number"
                              min={0}
                              step={1}
                              placeholder={String(mtdDefaults.won)}
                              value={mtdOverride?.won ?? ""}
                              onChange={(event) =>
                                updatePerRep(agent.ownerId, "won", event.target.value)
                              }
                              className={inputClass}
                              title={`Default: ${mtdDefaults.won}`}
                            />
                          </td>
                          <td className="px-md py-sm">
                            <input
                              type="number"
                              min={0}
                              step={1}
                              placeholder={String(mtdDefaults.activated)}
                              value={mtdOverride?.activated ?? ""}
                              onChange={(event) =>
                                updatePerRep(agent.ownerId, "activated", event.target.value)
                              }
                              className={inputClass}
                              title={`Default: ${mtdDefaults.activated}`}
                            />
                          </td>
                          <td className="px-md py-sm">
                            <select
                              value={mtdOverride?.monthKey ?? defaultMonthKey}
                              onChange={(event) =>
                                updatePerRepMonth(agent.ownerId, event.target.value)
                              }
                              disabled={!hasMtdOverride || !monthOptions.length}
                              className={selectClass}
                              title="Month this MTD override applies to"
                            >
                              {monthOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </td>
                          {WEEKLY_STATUS_KEYS.map((key) => (
                            <td key={key} className="px-md py-sm">
                              <input
                                type="number"
                                min={0}
                                step={1}
                                placeholder={String(weeklyDefaults[key])}
                                value={weeklyOverride?.[key] ?? ""}
                                onChange={(event) =>
                                  updateWeeklyPerRep(agent.ownerId, key, event.target.value)
                                }
                                className={inputClass}
                                title={`${WEEKLY_STATUS_LABELS[key]} default: ${weeklyDefaults[key]}`}
                              />
                            </td>
                          ))}
                          <td className="px-md py-sm">
                            <select
                              value={weeklyOverride?.week ?? defaultWeek}
                              onChange={(event) =>
                                updateWeeklyPerRepWeek(agent.ownerId, event.target.value)
                              }
                              disabled={!hasWeeklyOverride || !weekOptions.length}
                              className={selectClass}
                              title="Week this weekly override applies to"
                            >
                              {weekOptions.map((week) => (
                                <option key={week} value={week}>
                                  {week}
                                </option>
                              ))}
                            </select>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-sm">
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={saving}
              className="rounded-lg bg-primary px-lg py-2 text-label-md font-bold text-on-primary transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save targets"}
            </button>
            <button
              type="button"
              onClick={() => void handleReset()}
              disabled={saving}
              className="rounded-lg bg-surface-container px-lg py-2 text-label-md font-semibold text-on-surface-variant transition-colors hover:bg-surface-container-high disabled:opacity-60"
            >
              Reset to defaults
            </button>
            {saveMessage && (
              <span className="text-label-md font-semibold text-won">{saveMessage}</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
