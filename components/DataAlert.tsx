type DataAlertProps = {
  error?: string | null;
  sourceHint?: string | null;
  /** When provided alongside `sourceHint`, the banner shows how stale the data is. */
  updatedAt?: string | null;
};

function formatAge(updatedAt: string): string | null {
  const ts = new Date(updatedAt).getTime();
  if (Number.isNaN(ts)) return null;
  const diffMs = Date.now() - ts;
  if (diffMs < 0) return "actualizat acum";
  const mins = Math.round(diffMs / 60000);
  if (mins < 60) return `acum ${Math.max(1, mins)}m`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `acum ${hours}h`;
  const days = Math.round(hours / 24);
  return `acum ${days}z`;
}

export function DataAlert({ error, sourceHint, updatedAt }: DataAlertProps) {
  if (!error && !sourceHint) {
    return null;
  }

  const age = sourceHint && updatedAt ? formatAge(updatedAt) : null;

  return (
    <div className="space-y-sm">
      {error && (
        <div
          role="alert"
          className="flex items-start gap-sm rounded-xl border border-error/40 bg-error/10 px-md py-sm text-body-md font-body-md text-error"
        >
          <span className="material-symbols-outlined mt-[1px] text-[20px] leading-none">
            error
          </span>
          <p className="font-semibold">{error}</p>
        </div>
      )}
      {sourceHint && (
        <div className="flex items-start gap-sm rounded-xl border border-amber-500/40 bg-amber-500/10 px-md py-sm text-body-md font-body-md text-amber-700">
          <span className="material-symbols-outlined mt-[1px] text-[20px] leading-none">
            warning
          </span>
          <p>
            <span className="font-semibold">Date din cache</span>
            {age ? <span className="font-medium"> · actualizate {age}</span> : null} · {sourceHint}
          </p>
        </div>
      )}
    </div>
  );
}
