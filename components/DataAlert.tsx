type DataAlertProps = {
  error?: string | null;
  sourceHint?: string | null;
};

export function DataAlert({ error, sourceHint }: DataAlertProps) {
  if (!error && !sourceHint) {
    return null;
  }

  return (
    <div className="rounded-xl border border-outline-variant bg-surface-container-low px-md py-sm text-body-md font-body-md text-on-surface-variant">
      {error && <p className="text-error">{error}</p>}
      {sourceHint && <p>{sourceHint}</p>}
    </div>
  );
}
