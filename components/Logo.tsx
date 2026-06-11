type LogoProps = {
  /** Icon size in pixels (32–40 recommended for sidebar) */
  size?: number;
  /** Show Dashy wordmark beside the icon */
  showWordmark?: boolean;
  /** Subtitle under the wordmark */
  subtitle?: string;
  className?: string;
};

/** Bolt Food green — distinct from app primary blue */
const BOLT_GREEN = "#34D186";
const BOLT_GREEN_DARK = "#2AAF6A";

export function LogoIcon({ size = 40, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={className}
    >
      <defs>
        <linearGradient id="dashy-bg" x1="4" y1="4" x2="36" y2="36" gradientUnits="userSpaceOnUse">
          <stop stopColor={BOLT_GREEN} />
          <stop offset="1" stopColor={BOLT_GREEN_DARK} />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="10" fill="url(#dashy-bg)" />
      {/* Speed dashes — "dash" motion, delivery energy */}
      <line x1="5" y1="13" x2="11" y2="13" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.45" />
      <line x1="4" y1="19" x2="12" y2="19" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.65" />
      <line x1="3" y1="25" x2="13" y2="25" stroke="white" strokeWidth="2.5" strokeLinecap="round" opacity="0.85" />
      {/* Stylized D — brand initial */}
      <path
        d="M15 9.5V30.5H19.5C27.5 30.5 33 25.5 33 20C33 14.5 27.5 9.5 19.5 9.5H15Z"
        fill="white"
      />
      {/* Ascending sales bars + trend arrow inside D */}
      <rect x="21" y="24" width="2.5" height="4" rx="0.5" fill={BOLT_GREEN_DARK} />
      <rect x="24.5" y="20" width="2.5" height="8" rx="0.5" fill={BOLT_GREEN_DARK} />
      <rect x="28" y="15" width="2.5" height="13" rx="0.5" fill={BOLT_GREEN_DARK} />
      <path
        d="M20.5 13.5H29.5M27 11L29.5 13.5L27 16"
        stroke="white"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Logo({
  size = 40,
  showWordmark = true,
  subtitle = "Ultimate Sales Dashboard",
  className = "",
}: LogoProps) {
  if (!showWordmark) {
    return <LogoIcon size={size} className={className} />;
  }

  return (
    <div className={`flex items-center gap-xs ${className}`}>
      <LogoIcon size={size} />
      <div>
        <h1 className="text-title-lg font-title-lg font-black tracking-tight text-on-surface">
          Dashy
        </h1>
        {subtitle ? (
          <p className="text-label-md font-label-md text-on-surface-variant opacity-70">
            {subtitle}
          </p>
        ) : null}
      </div>
    </div>
  );
}
