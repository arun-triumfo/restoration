import {
  ArrowRight,
  Building2,
  CheckCircle2,
  CircleDashed,
  ExternalLink,
  GitBranch,
  Layers,
  Map as MapIcon,
  Rocket,
  Users,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  DEPARTMENTS,
  JOURNEY_STEPS,
  MENU_GUIDE,
  PLANNED,
  STATUS_META,
  type DevStatus,
} from '../data/workflows'

type Tab = 'journey' | 'departments' | 'menus' | 'planned'

function StatusPill({ status }: { status: DevStatus }) {
  const meta = STATUS_META[status]
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${meta.className}`}
    >
      {meta.short}
    </span>
  )
}

export function SystemWorkflow() {
  const [tab, setTab] = useState<Tab>('journey')
  const [activeDept, setActiveDept] = useState(DEPARTMENTS[0].id)

  const counts = useMemo(() => {
    const menuItems = MENU_GUIDE.flatMap((s) => s.items)
    return {
      live: menuItems.filter((i) => i.status === 'live').length,
      partial: menuItems.filter((i) => i.status === 'partial').length,
      planned: PLANNED.length,
      steps: JOURNEY_STEPS.length,
      depts: DEPARTMENTS.length,
    }
  }, [])

  const dept = DEPARTMENTS.find((d) => d.id === activeDept) || DEPARTMENTS[0]

  const tabs: { id: Tab; label: string; icon: typeof GitBranch }[] = [
    { id: 'journey', label: 'Business journey', icon: GitBranch },
    { id: 'departments', label: 'By department', icon: Users },
    { id: 'menus', label: 'Menu guide', icon: MapIcon },
    { id: 'planned', label: 'Still to build', icon: Rocket },
  ]

  return (
    <div className="mx-auto max-w-6xl space-y-5 pb-10">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-2xl border border-[var(--border-main)] bg-[var(--bg-card)] px-5 py-6 sm:px-8 sm:py-8">
        <div
          className="pointer-events-none absolute inset-0 opacity-90"
          style={{
            background:
              'radial-gradient(ellipse 80% 60% at 0% 0%, rgba(99,102,241,0.14), transparent 55%), radial-gradient(ellipse 70% 50% at 100% 20%, rgba(8,145,178,0.12), transparent 50%)',
          }}
        />
        <div className="relative">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-indigo-500/25 bg-indigo-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-300">
            <Layers className="h-3.5 w-3.5" />
            Client walkthrough · How RugOS works
          </div>
          <h1 className="max-w-2xl text-2xl font-extrabold tracking-tight text-[var(--text-main)] sm:text-3xl">
            One simple map of the whole rug business system
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--text-muted)] sm:text-[15px]">
            RugOS follows a rug from <strong className="text-[var(--text-main)]">sale → stock → make →
            ship → money → next buy</strong>. Below you can see what is already built, what each
            department uses, and what we still need to develop for SaaS and role-wise work.
          </p>

          <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              { n: counts.steps, l: 'Journey steps' },
              { n: counts.live, l: 'Menus built' },
              { n: counts.partial, l: 'Partial (UI + next)' },
              { n: counts.planned, l: 'To be developed' },
            ].map((c) => (
              <div
                key={c.l}
                className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)]/80 px-3 py-3"
              >
                <div className="font-mono text-2xl font-extrabold text-[var(--text-main)]">{c.n}</div>
                <div className="text-[11px] font-medium text-[var(--text-dim)]">{c.l}</div>
              </div>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap gap-2 text-[11px]">
            {(Object.keys(STATUS_META) as DevStatus[]).map((s) => (
              <span
                key={s}
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-semibold ${STATUS_META[s].className}`}
              >
                {s === 'live' ? (
                  <CheckCircle2 className="h-3 w-3" />
                ) : (
                  <CircleDashed className="h-3 w-3" />
                )}
                {STATUS_META[s].label}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1.5 rounded-xl border border-[var(--border-main)] bg-[var(--bg-card)] p-1.5">
        {tabs.map((t) => {
          const Icon = t.icon
          const on = tab === t.id
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`inline-flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-xs font-semibold transition sm:flex-none sm:text-[13px] ${
                on
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-main)]'
              }`}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" />
              {t.label}
            </button>
          )
        })}
      </div>

      {tab === 'journey' ? (
        <section className="space-y-3">
          <header className="px-1">
            <h2 className="text-lg font-bold text-[var(--text-main)]">End-to-end business journey</h2>
            <p className="text-sm text-[var(--text-muted)]">
              Read top to bottom like a story. Click any step to open that menu.
            </p>
          </header>

          <ol className="space-y-3">
            {JOURNEY_STEPS.map((step, idx) => (
              <li
                key={step.id}
                className="relative rounded-2xl border border-[var(--border-main)] bg-[var(--bg-card)] p-4 sm:p-5"
              >
                {idx < JOURNEY_STEPS.length - 1 ? (
                  <div className="absolute left-[1.85rem] top-[4.25rem] hidden h-[calc(100%-1rem)] w-px bg-[var(--border-main)] sm:block" />
                ) : null}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-sm font-extrabold text-white shadow-sm">
                    {step.step}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-[15px] font-bold text-[var(--text-main)]">{step.title}</h3>
                      <StatusPill status={step.status} />
                      <span className="rounded-full bg-[var(--bg-elevated)] px-2 py-0.5 text-[10px] font-semibold text-[var(--text-dim)]">
                        {step.department}
                      </span>
                    </div>
                    <p className="mt-1 text-sm font-medium text-[var(--text-main)]">{step.plain}</p>
                    <p className="mt-1 text-[13px] leading-relaxed text-[var(--text-muted)]">
                      {step.detail}
                    </p>
                    <Link
                      to={step.menuPath}
                      className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-3 py-1.5 text-xs font-bold text-indigo-700 no-underline hover:bg-indigo-500/15 dark:text-indigo-300"
                    >
                      Open {step.menuLabel}
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {tab === 'departments' ? (
        <section className="grid gap-4 lg:grid-cols-[240px_1fr]">
          <div className="flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible">
            {DEPARTMENTS.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => setActiveDept(d.id)}
                className={`shrink-0 rounded-xl border px-3 py-2.5 text-left text-xs font-semibold transition lg:w-full ${
                  activeDept === d.id
                    ? 'border-indigo-500 bg-indigo-600 text-white'
                    : 'border-[var(--border-main)] bg-[var(--bg-card)] text-[var(--text-muted)] hover:bg-[var(--bg-elevated)]'
                }`}
              >
                <span className="mr-1.5">{d.emoji}</span>
                {d.role}
              </button>
            ))}
          </div>

          <div className="rounded-2xl border border-[var(--border-main)] bg-[var(--bg-card)] p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-3xl">{dept.emoji}</div>
                <h2 className="mt-1 text-xl font-extrabold text-[var(--text-main)]">{dept.role}</h2>
                <p className="mt-1 max-w-xl text-sm text-[var(--text-muted)]">{dept.plain}</p>
              </div>
              <StatusPill status={dept.status} />
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)]/60 p-4">
                <h3 className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-dim)]">
                  What they see
                </h3>
                <ul className="mt-2 space-y-1.5 text-sm text-[var(--text-main)]">
                  {dept.sees.map((s) => (
                    <li key={s} className="flex gap-2">
                      <span className="text-emerald-500">✓</span>
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)]/60 p-4">
                <h3 className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-dim)]">
                  What they do every day
                </h3>
                <ul className="mt-2 space-y-1.5 text-sm text-[var(--text-main)]">
                  {dept.does.map((s) => (
                    <li key={s} className="flex gap-2">
                      <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-indigo-500" />
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="mt-4">
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-dim)]">
                Menus for this role
              </h3>
              <div className="mt-2 flex flex-wrap gap-2">
                {dept.menus.map((m) => (
                  <Link
                    key={m.path + m.label}
                    to={m.path}
                    className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-main)] bg-[var(--bg-elevated)] px-2.5 py-1.5 text-xs font-semibold text-[var(--text-main)] no-underline hover:border-indigo-400"
                  >
                    {m.label}
                    <ExternalLink className="h-3 w-3 text-[var(--text-dim)]" />
                  </Link>
                ))}
              </div>
            </div>

            {dept.planned?.length ? (
              <div className="mt-4 rounded-xl border border-dashed border-amber-500/40 bg-amber-500/5 p-4">
                <h3 className="text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">
                  Still to develop for this role
                </h3>
                <ul className="mt-2 space-y-1 text-sm text-[var(--text-muted)]">
                  {dept.planned.map((p) => (
                    <li key={p}>• {p}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      {tab === 'menus' ? (
        <section className="space-y-4">
          <header className="px-1">
            <h2 className="text-lg font-bold text-[var(--text-main)]">Every menu — what it is for</h2>
            <p className="text-sm text-[var(--text-muted)]">
              Same sidebar the client clicks. Status shows what is ready today.
            </p>
          </header>
          {MENU_GUIDE.map((section) => (
            <div
              key={section.section}
              className="overflow-hidden rounded-2xl border border-[var(--border-main)] bg-[var(--bg-card)]"
            >
              <div className="border-b border-[var(--border-subtle)] bg-[var(--bg-elevated)]/50 px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-[var(--text-dim)]">
                {section.section}
              </div>
              <ul className="divide-y divide-[var(--border-subtle)]">
                {section.items.map((item) => (
                  <li
                    key={item.path + item.label}
                    className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-[var(--text-main)]">{item.label}</span>
                        <StatusPill status={item.status} />
                      </div>
                      <p className="mt-0.5 text-[13px] text-[var(--text-muted)]">{item.plain}</p>
                      {item.note ? (
                        <p className="mt-1 text-[12px] text-amber-700 dark:text-amber-300">
                          Note: {item.note}
                        </p>
                      ) : null}
                    </div>
                    <Link
                      to={item.path}
                      className="inline-flex shrink-0 items-center gap-1 self-start rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white no-underline hover:bg-indigo-700 sm:self-center"
                    >
                      Open
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      ) : null}

      {tab === 'planned' ? (
        <section className="space-y-4">
          <header className="px-1">
            <h2 className="text-lg font-bold text-[var(--text-main)]">
              To be developed — SaaS & role-wise next
            </h2>
            <p className="text-sm text-[var(--text-muted)]">
              These are not missing by accident. The wireframe screens exist; these items make the
              product safe for many companies and many staff roles.
            </p>
          </header>

          <div className="grid gap-3 sm:grid-cols-2">
            {PLANNED.map((p) => (
              <article
                key={p.title}
                className="rounded-2xl border border-[var(--border-main)] bg-[var(--bg-card)] p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-[15px] font-bold text-[var(--text-main)]">{p.title}</h3>
                  <span className="shrink-0 rounded-full border border-slate-500/25 bg-slate-500/10 px-2 py-0.5 text-[10px] font-bold uppercase text-[var(--text-dim)]">
                    {p.area}
                  </span>
                </div>
                <p className="mt-2 text-sm text-[var(--text-main)]">{p.plain}</p>
                <p className="mt-2 text-[12px] leading-relaxed text-[var(--text-muted)]">
                  <strong className="text-[var(--text-dim)]">Why it matters:</strong> {p.why}
                </p>
              </article>
            ))}
          </div>

          <div className="rounded-2xl border border-indigo-500/25 bg-indigo-500/5 p-5">
            <div className="flex items-start gap-3">
              <Building2 className="mt-0.5 h-5 w-5 shrink-0 text-indigo-500" />
              <div>
                <h3 className="font-bold text-[var(--text-main)]">SaaS in one sentence</h3>
                <p className="mt-1 text-sm leading-relaxed text-[var(--text-muted)]">
                  Today the product is a rich operational wireframe wired to a backend database for
                  one Restoration / Odette style business. To sell it as SaaS we still need{' '}
                  <strong className="text-[var(--text-main)]">
                    login, company isolation, role-locked menus, and live channel/courier APIs
                  </strong>
                  . Until then, every department can already click through the same screens and
                  understand the intended workflow.
                </p>
              </div>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  )
}
