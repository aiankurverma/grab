import type { ReactNode } from "react";

export function SectionHeading({
  eyebrow,
  title,
  body,
  align = "center",
  action,
}: {
  eyebrow: string;
  title: ReactNode;
  body?: ReactNode;
  align?: "center" | "left";
  action?: ReactNode;
}) {
  const centered = align === "center";
  return (
    <div
      className={
        centered
          ? "mx-auto max-w-2xl text-center"
          : "flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"
      }
    >
      <div className={centered ? "" : "max-w-2xl"}>
        <p className="text-xs font-bold uppercase tracking-[0.24em] text-wave">{eyebrow}</p>
        <h2 className="mt-3 text-balance text-[1.7rem] font-semibold tracking-tight text-white sm:text-4xl">
          {title}
        </h2>
        {body ? (
          <p className="mt-3.5 text-pretty text-[15px] leading-relaxed text-mist sm:text-base">{body}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
