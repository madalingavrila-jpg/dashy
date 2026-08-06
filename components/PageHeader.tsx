type PageHeaderProps = {
  title: string;
  subtitle: string;
  /**
   * Kept for API compatibility but no longer rendered here — the canonical
   * "last updated" stamp lives once in the TopBar (see components/TopBar.tsx)
   * to avoid three conflicting timestamps across the app.
   */
  updatedAt?: string;
  loading?: boolean;
  actions?: React.ReactNode;
};

export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-col items-start justify-between gap-sm border-b border-outline-variant/50 pb-sm md:flex-row md:items-end">
      <div>
        <h1 className="text-[26px] font-bold leading-9 tracking-[-0.02em] text-on-background">
          {title}
        </h1>
        <p className="mt-1 max-w-3xl text-[13px] leading-5 text-on-surface-variant">
          {subtitle}
        </p>
      </div>
      {actions}
    </div>
  );
}
