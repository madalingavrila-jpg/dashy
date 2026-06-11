"use client";

import { useMemo, useState } from "react";
import type { WeeklyHistoryView } from "@/types/dashboard";

type ChartMode = "weekly" | "cumulative";

type WowYtdTrendChartProps = {
  history?: WeeklyHistoryView[];
  loading?: boolean;
};

type ChartPoint = {
  week: string;
  closedWon: number;
  active: number;
};

const CHART = {
  width: 960,
  height: 280,
  padTop: 24,
  padRight: 24,
  padBottom: 48,
  padLeft: 52,
} as const;

const WON_COLOR = "#059669";
const ACTIVE_COLOR = "#7c3aed";

function buildSeries(history: WeeklyHistoryView[], mode: ChartMode): ChartPoint[] {
  let cumWon = 0;
  let cumActive = 0;
  return history.map((row) => {
    if (mode === "cumulative") {
      cumWon += row.closedWon;
      cumActive += row.active;
      return { week: row.week, closedWon: cumWon, active: cumActive };
    }
    return { week: row.week, closedWon: row.closedWon, active: row.active };
  });
}

function niceMax(value: number): number {
  if (value <= 0) return 10;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const normalized = value / magnitude;
  const step = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return step * magnitude;
}

function linePath(values: number[], xAt: (index: number) => number, yAt: (value: number) => number): string {
  if (!values.length) return "";
  return values
    .map((value, index) => `${index === 0 ? "M" : "L"} ${xAt(index).toFixed(1)} ${yAt(value).toFixed(1)}`)
    .join(" ");
}

function ModeToggle({
  mode,
  onChange,
}: {
  mode: ChartMode;
  onChange: (mode: ChartMode) => void;
}) {
  return (
    <div className="inline-flex rounded-lg border border-outline-variant bg-white p-[3px]">
      <button
        type="button"
        onClick={() => onChange("weekly")}
        className={`rounded-md px-sm py-xs text-label-md font-semibold transition-colors ${
          mode === "weekly"
            ? "bg-primary text-on-primary shadow-sm"
            : "text-on-surface-variant hover:bg-surface-container-low"
        }`}
      >
        Weekly
      </button>
      <button
        type="button"
        onClick={() => onChange("cumulative")}
        className={`rounded-md px-sm py-xs text-label-md font-semibold transition-colors ${
          mode === "cumulative"
            ? "bg-primary text-on-primary shadow-sm"
            : "text-on-surface-variant hover:bg-surface-container-low"
        }`}
      >
        Cumulative YTD
      </button>
    </div>
  );
}

export function WowYtdTrendChart({ history, loading }: WowYtdTrendChartProps) {
  const [mode, setMode] = useState<ChartMode>("weekly");
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const series = useMemo(() => buildSeries(history ?? [], mode), [history, mode]);

  const plotWidth = CHART.width - CHART.padLeft - CHART.padRight;
  const plotHeight = CHART.height - CHART.padTop - CHART.padBottom;

  const maxValue = useMemo(() => {
    const peak = Math.max(
      ...(series.map((row) => Math.max(row.closedWon, row.active))),
      1,
    );
    return niceMax(peak);
  }, [series]);

  const yTicks = useMemo(() => {
    const count = 4;
    return Array.from({ length: count + 1 }, (_, index) => Math.round((maxValue / count) * index));
  }, [maxValue]);

  const xAt = (index: number) =>
    CHART.padLeft + (series.length <= 1 ? plotWidth / 2 : (index / (series.length - 1)) * plotWidth);

  const yAt = (value: number) => CHART.padTop + plotHeight - (value / maxValue) * plotHeight;

  const wonPath = linePath(
    series.map((row) => row.closedWon),
    xAt,
    yAt,
  );
  const activePath = linePath(
    series.map((row) => row.active),
    xAt,
    yAt,
  );

  const hoverPoint = hoverIndex !== null ? series[hoverIndex] : null;
  const labelStep = series.length > 16 ? 2 : 1;

  if (loading && !history?.length) {
    return <div className="glass-card h-80 animate-pulse rounded-xl" />;
  }

  if (!history?.length) {
    return (
      <div className="glass-card rounded-xl p-lg text-on-surface-variant">
        No weekly history available for YTD trend.
      </div>
    );
  }

  return (
    <div id="wow-ytd-chart" className="glass-card rounded-xl p-lg">
      <div className="mb-lg flex flex-wrap items-start justify-between gap-md">
        <div>
          <h3 className="text-title-lg font-title-lg font-bold">Closed Won &amp; Active — YTD Evolution</h3>
          <p className="text-body-md text-on-surface-variant">
            Weekly counts from Salesforce field history · {history.length} weeks YTD
          </p>
        </div>
        <ModeToggle mode={mode} onChange={setMode} />
      </div>

      <div className="relative overflow-x-auto pb-sm">
        <svg
          viewBox={`0 0 ${CHART.width} ${CHART.height}`}
          className="min-w-[720px] w-full"
          role="img"
          aria-label={`Line chart of Closed Won and Active ${mode === "weekly" ? "per week" : "cumulative YTD"}`}
          onMouseLeave={() => setHoverIndex(null)}
        >
          {yTicks.map((tick) => {
            const y = yAt(tick);
            return (
              <g key={tick}>
                <line
                  x1={CHART.padLeft}
                  y1={y}
                  x2={CHART.width - CHART.padRight}
                  y2={y}
                  stroke="#e2e8f0"
                  strokeWidth={1}
                />
                <text
                  x={CHART.padLeft - 10}
                  y={y + 4}
                  textAnchor="end"
                  className="fill-on-surface-variant text-[11px]"
                >
                  {tick}
                </text>
              </g>
            );
          })}

          <path d={wonPath} fill="none" stroke={WON_COLOR} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
          <path
            d={activePath}
            fill="none"
            stroke={ACTIVE_COLOR}
            strokeWidth={2.5}
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {series.map((row, index) => {
            const x = xAt(index);
            const showLabel = index % labelStep === 0 || index === series.length - 1;
            const isHover = hoverIndex === index;
            return (
              <g key={row.week}>
                <rect
                  x={x - plotWidth / Math.max(series.length - 1, 1) / 2}
                  y={CHART.padTop}
                  width={plotWidth / Math.max(series.length - 1, 1)}
                  height={plotHeight}
                  fill="transparent"
                  onMouseEnter={() => setHoverIndex(index)}
                />
                <circle
                  cx={x}
                  cy={yAt(row.closedWon)}
                  r={isHover ? 5 : 3.5}
                  fill={WON_COLOR}
                  stroke="#fff"
                  strokeWidth={1.5}
                  pointerEvents="none"
                />
                <circle
                  cx={x}
                  cy={yAt(row.active)}
                  r={isHover ? 5 : 3.5}
                  fill={ACTIVE_COLOR}
                  stroke="#fff"
                  strokeWidth={1.5}
                  pointerEvents="none"
                />
                {showLabel && (
                  <text x={x} y={CHART.height - 14} textAnchor="middle" className="fill-on-surface-variant text-[11px] font-semibold">
                    {row.week}
                  </text>
                )}
              </g>
            );
          })}

          {hoverPoint && hoverIndex !== null && (
            <g pointerEvents="none">
              <line
                x1={xAt(hoverIndex)}
                y1={CHART.padTop}
                x2={xAt(hoverIndex)}
                y2={CHART.padTop + plotHeight}
                stroke="#94a3b8"
                strokeWidth={1}
                strokeDasharray="4 3"
              />
              <rect
                x={Math.min(xAt(hoverIndex) + 8, CHART.width - 148)}
                y={CHART.padTop + 8}
                width={136}
                height={56}
                rx={8}
                fill="rgba(255,255,255,0.96)"
                stroke="#cbd5e1"
              />
              <text x={Math.min(xAt(hoverIndex) + 16, CHART.width - 140)} y={CHART.padTop + 26} className="fill-on-surface text-[12px] font-bold">
                {hoverPoint.week}
              </text>
              <text x={Math.min(xAt(hoverIndex) + 16, CHART.width - 140)} y={CHART.padTop + 42} className="fill-[#059669] text-[11px] font-semibold">
                Closed Won: {hoverPoint.closedWon}
              </text>
              <text x={Math.min(xAt(hoverIndex) + 16, CHART.width - 140)} y={CHART.padTop + 56} className="fill-[#7c3aed] text-[11px] font-semibold">
                Active: {hoverPoint.active}
              </text>
            </g>
          )}
        </svg>
      </div>

      <div className="mt-md flex flex-wrap items-center gap-md text-label-md">
        <span className="flex items-center gap-xs">
          <span className="h-0.5 w-5 rounded bg-won" />
          <span className="h-2.5 w-2.5 rounded-full bg-won" />
          Closed Won
        </span>
        <span className="flex items-center gap-xs">
          <span className="h-0.5 w-5 rounded bg-activated" />
          <span className="h-2.5 w-2.5 rounded-full bg-activated" />
          Active
        </span>
        <span className="text-on-surface-variant">
          {mode === "weekly" ? "Per-week counts" : "Running total from W01"}
        </span>
      </div>
    </div>
  );
}
