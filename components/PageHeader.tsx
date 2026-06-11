type PageHeaderProps = {
  title: string;
  subtitle: string;
  updatedAt?: string;
  loading?: boolean;
  actions?: React.ReactNode;
};

export function PageHeader({
  title,
  subtitle,
  updatedAt,
  loading,
  actions,
}: PageHeaderProps) {
  return (
    <div className="flex flex-col items-start justify-between gap-sm md:flex-row md:items-center">
      <div>
        <h2 className="text-headline-md font-headline-md font-bold text-on-background">
          {title}
        </h2>
        <p className="text-body-md font-body-md text-on-surface-variant">
          {subtitle}
        </p>
        {updatedAt && !loading && (
          <p className="mt-1 text-label-md font-label-md text-on-surface-variant opacity-70">
            Updated {new Date(updatedAt).toLocaleString("en-GB")}
          </p>
        )}
      </div>
      {actions}
    </div>
  );
}
