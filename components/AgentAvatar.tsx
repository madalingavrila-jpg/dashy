import Image from "next/image";

const AVATARS: Array<[RegExp, string]> = [
  [/gavril|madalin/i, "madalin.jpg"],
  [/ringheanu|rîngheanu|paul/i, "paul.jpg"],
  [/corneliu|corne/i, "corne.jpg"],
  [/vlad.*popa|popa.*vlad/i, "vlad.jpg"],
  [/patru|pătru/i, "andrei.jpg"],
  [/teodorescu|ciprian/i, "ciprian.jpg"],
  [/boboc/i, "boboc.jpg"],
  [/toltic|toltică/i, "toltica.jpg"],
  [/hanganu|eusebiu/i, "eusebiu.jpg"],
  [/borcaeas|georgian/i, "georgian.jpg"],
  [/mihnea|silviu.*voicu/i, "mihnea.jpg"],
  [/oroles|roșu|rosu/i, "oroles.jpg"],
];

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function avatarPathForName(name: string): string | null {
  return AVATARS.find(([pattern]) => pattern.test(name))?.[1] ?? null;
}

export function AgentAvatar({
  name,
  size = 32,
  className = "",
}: {
  name: string;
  size?: number;
  className?: string;
}) {
  const avatar = avatarPathForName(name);

  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface-container text-[10px] font-bold text-on-surface-variant ring-1 ring-outline-variant/70 ${className}`}
      style={{ width: size, height: size }}
      aria-label={name}
    >
      {avatar ? (
        <Image
          src={`/avatars/${avatar}`}
          alt=""
          fill
          sizes={`${size}px`}
          className="object-cover"
        />
      ) : (
        initials(name)
      )}
    </span>
  );
}
