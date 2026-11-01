import Link from "next/link";

export function BrandMark({ linked = true }: { linked?: boolean }) {
  const content = (
    <>
      <span
        aria-hidden="true"
        className="relative grid size-10 place-items-center rounded-xl border border-white/10 bg-gradient-to-br from-wave to-wave-deep text-base font-black text-ink shadow-lg shadow-wave/20 select-none"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="text-ink"
        >
          <path
            d="M3 14.5C6.5 14.5 7.5 9.5 12 9.5C16.5 9.5 17.5 14.5 21 14.5"
            stroke="currentColor"
            strokeWidth="2.8"
            strokeLinecap="round"
          />
        </svg>
        <span className="absolute -right-0.5 -top-0.5 size-2 rounded-full border border-ink bg-grab" />
      </span>
      <span className="flex flex-col leading-none">
        <span className="text-lg font-bold tracking-tight text-white">MediaRift</span>
        <span className="mt-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-mist/70">
          media, simplified
        </span>
      </span>
    </>
  );

  if (!linked) {
    return <span className="inline-flex items-center gap-2.5">{content}</span>;
  }

  return (
    <Link href="/" className="inline-flex items-center gap-2.5" aria-label="MediaRift home">
      {content}
    </Link>
  );
}
