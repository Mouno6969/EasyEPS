import type { ReadinessReport } from "@/lib/readiness";
import { ArrowDownRight, ArrowUpRight, CalendarClock, Minus, Target, TrendingUp } from "lucide-react";
import { Link } from "wouter";

function TrendChart({ report }: { report: ReadinessReport }) {
  const width = 360;
  const height = 116;
  const padX = 14;
  const padY = 12;
  const points = report.trend.map((point, index) => ({
    ...point,
    x: padX + (index / Math.max(1, report.trend.length - 1)) * (width - padX * 2),
    y: padY + (1 - point.score / 100) * (height - padY * 2),
  }));
  const polyline = points.map(point => `${point.x},${point.y}`).join(" ");

  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="গত ছয় সপ্তাহের readiness score" className="h-32 w-full overflow-visible">
        {[25, 50, 75].map(value => {
          const y = padY + (1 - value / 100) * (height - padY * 2);
          return <line key={value} x1={padX} x2={width - padX} y1={y} y2={y} stroke="currentColor" strokeOpacity="0.08" strokeDasharray="4 5" />;
        })}
        <polyline fill="none" stroke="var(--gold-dark)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" points={polyline} />
        {points.map(point => <circle key={point.date} cx={point.x} cy={point.y} r="4.5" fill="var(--cream)" stroke="var(--gold-dark)" strokeWidth="3" />)}
      </svg>
      <div className="grid grid-cols-6 gap-1 text-center text-[10px] font-semibold text-[var(--navy)]/40">
        {report.trend.map(point => <span key={point.date}>{point.label}</span>)}
      </div>
    </div>
  );
}

export function ReadinessCard({ report }: { report: ReadinessReport }) {
  const changeIcon = report.change > 0 ? ArrowUpRight : report.change < 0 ? ArrowDownRight : Minus;
  const ChangeIcon = changeIcon;

  return (
    <section className="paper-card mt-7 overflow-hidden">
      <div className="grid lg:grid-cols-[.82fr_1.18fr]">
        <div className="bg-[var(--navy)] p-6 text-white md:p-8">
          <div className="flex items-center justify-between gap-3">
            <div><p className="text-xs font-bold uppercase tracking-[.18em] text-[var(--gold)]">EPS readiness</p><h2 className="mt-2 font-serif text-2xl font-bold">পরীক্ষার প্রস্তুতি</h2></div>
            <Target className="size-6 text-[var(--gold)]" />
          </div>
          <div className="mt-7 flex items-center gap-6">
            <div className="relative grid size-28 shrink-0 place-items-center rounded-full" style={{ background: `conic-gradient(var(--gold) ${report.score}%, rgba(255,255,255,.12) 0)` }}>
              <div className="grid size-[5.6rem] place-items-center rounded-full bg-[var(--navy)] text-center"><span className="font-serif text-3xl font-bold">{report.score}</span><span className="-mt-3 text-[10px] text-white/45">/ 100</span></div>
            </div>
            <div>
              <p className="font-bold text-[var(--gold)]">{report.bandLabelBn}</p>
              <p className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-white/60"><ChangeIcon className="size-3.5" />গত সপ্তাহ থেকে {report.change > 0 ? "+" : ""}{report.change}</p>
              {report.targetDaysRemaining != null && <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs"><CalendarClock className="size-3.5 text-[var(--gold)]" />লক্ষ্য পরীক্ষার {report.targetDaysRemaining} দিন বাকি</p>}
            </div>
          </div>
          <div className="mt-7 space-y-3">
            {report.components.map(component => <div key={component.id}><div className="mb-1 flex justify-between gap-3 text-xs"><span className="font-semibold text-white/70">{component.labelBn} · {component.weight}%</span><span className="font-bold">{component.score}</span></div><div className="h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-[var(--gold)]" style={{ width: `${component.score}%` }} /></div><p className="mt-1 text-[10px] text-white/38">{component.detailBn}</p></div>)}
          </div>
        </div>
        <div className="p-6 md:p-8">
          <div className="flex items-center gap-2"><TrendingUp className="size-5 text-[var(--gold-dark)]" /><h3 className="font-serif text-xl font-bold text-[var(--navy)]">৬ সপ্তাহের trend</h3></div>
          <div className="mt-4"><TrendChart report={report} /></div>
          <div className="mt-5 rounded-2xl bg-[var(--cream)] p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-[var(--gold-dark)]">এখন সবচেয়ে কার্যকর</p>
            <div className="mt-3 space-y-2 text-sm leading-6 text-[var(--navy)]/65">{report.insights.map(insight => <p key={insight}>• {insight}</p>)}</div>
            <Link href="/mock-test?count=10&mode=smart" className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-[var(--navy)]">Smart baseline নিন <ArrowUpRight className="size-4" /></Link>
          </div>
          <p className="mt-4 text-[10px] leading-4 text-[var(--navy)]/38">Readiness একটি সহায়ক সূচক; এটি সাম্প্রতিক score, curriculum coverage, scheduled-review mastery ও study consistency মিলিয়ে হিসাব করা হয়—আনুষ্ঠানিক EPS-TOPIK ফল নয়।</p>
        </div>
      </div>
    </section>
  );
}
