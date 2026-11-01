import { platformMeta, type PlatformId } from "@/lib/platforms";

const SIZES = {
  sm: "size-8 rounded-lg text-[9px]",
  md: "size-10 rounded-xl text-[10px]",
  lg: "size-12 rounded-xl text-xs",
} as const;

export function PlatformMark({
  platform,
  size = "md",
  className = "",
}: {
  platform: PlatformId;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const meta = platformMeta(platform);
  return (
    <span
      aria-hidden="true"
      className={`grid shrink-0 place-items-center border font-black tracking-tight ${meta.markClass} ${SIZES[size]} ${className}`}
    >
      {meta.mark}
    </span>
  );
}
