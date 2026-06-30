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
    <div className="flex flex-col items-start justify-between gap-sm md:flex-row md:items-center">
      <div>
        <h2 className="text-headline-md font-headline-md font-bold text-on-background">
          {title}
        </h2>
        <p className="text-body-md font-body-md text-on-surface-variant">
          {subtitle}
        </p>
      </div>
      {actions}
    </div>
  );
}
