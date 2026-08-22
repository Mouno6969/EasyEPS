import type { ReactNode } from "react";

export function PageIntro({ eyebrow, title, description, actions }: { eyebrow: string; title: string; description: string; actions?: ReactNode }) {
  return <section className="border-b border-[var(--navy)]/10 bg-[radial-gradient(circle_at_85%_20%,rgba(204,166,92,.18),transparent_28%)]"><div className="container flex flex-col gap-6 py-12 md:flex-row md:items-end md:justify-between md:py-16"><div className="max-w-3xl"><p className="eyebrow">{eyebrow}</p><h1 className="mt-3 font-serif text-4xl font-bold tracking-tight text-[var(--navy)] md:text-5xl">{title}</h1><p className="mt-4 max-w-2xl text-base leading-8 text-[var(--navy)]/68 md:text-lg">{description}</p></div>{actions && <div className="shrink-0">{actions}</div>}</div></section>;
}
