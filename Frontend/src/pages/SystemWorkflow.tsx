import {
  ArrowRight,
  Building2,
  CheckCircle2,
  ClipboardList,
  ExternalLink,
  GitBranch,
  Layers,
  Map as MapIcon,
  Rocket,
  Server,
  Users,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  CLIENT_REQUIRED,
  DEMO_LOGINS,
  DEMO_PASSWORD,
  DEPARTMENT_USERS,
  DEPARTMENTS,
  DEV_ROADMAP,
  FULL_TEST_FLOW,
  JOURNEY_STEPS,
  MENU_GUIDE,
  PLANNED,
  SHIPPED,
  STATUS_META,
  UAT_CHECKLISTS,
  roadmapTotals,
  shippedTaskIds,
  type DevStatus,
  type DevTask,
} from '../data/workflows'

type Tab = 'journey' | 'departments' | 'menus' | 'planned'

const DONE_KEY = 'rugos-dev-roadmap-done'

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

function sideBadge(side: DevTask['side']) {
  const map = {
    backend: 'bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/30',
    frontend: 'bg-cyan-500/15 text-cyan-800 dark:text-cyan-300 border-cyan-500/30',
    both: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30',
    ops: 'bg-orange-500/15 text-orange-800 dark:text-orange-300 border-orange-500/30',
  }
  return map[side]
}

export function SystemWorkflow() {
  const [tab, setTab] = useState<Tab>('planned')
  const [activeDept, setActiveDept] = useState(DEPARTMENTS[0].id)
  const [phaseId, setPhaseId] = useState(DEV_ROADMAP[0].id)
  const [epicId, setEpicId] = useState(DEV_ROADMAP[0].epics[0].id)
  const [doneIds, setDoneIds] = useState<Set<string>>(() => {
    const seeded = shippedTaskIds()
    try {
      const raw = localStorage.getItem(DONE_KEY)
      const stored = raw ? (JSON.parse(raw) as string[]) : []
      return new Set([...seeded, ...stored])
    } catch {
      return new Set(seeded)
    }
  })

  useEffect(() => {
    localStorage.setItem(DONE_KEY, JSON.stringify([...doneIds]))
  }, [doneIds])

  const totals = useMemo(() => roadmapTotals(), [])
  const allTaskIds = useMemo(
    () => DEV_ROADMAP.flatMap((p) => p.epics.flatMap((e) => e.tasks.map((t) => t.id))),
    [],
  )
  const doneCount = allTaskIds.filter((id) => doneIds.has(id)).length

  const counts = useMemo(() => {
    const menuItems = MENU_GUIDE.flatMap((s) => s.items)
    return {
      live: menuItems.filter((i) => i.status === 'live').length,
      partial: menuItems.filter((i) => i.status === 'partial').length,
      planned: PLANNED.length,
      steps: JOURNEY_STEPS.length,
      tasks: totals.tasks,
      days: totals.days,
      shipped: totals.shipped,
    }
  }, [totals])

  const dept = DEPARTMENTS.find((d) => d.id === activeDept) || DEPARTMENTS[0]
  const phase = DEV_ROADMAP.find((p) => p.id === phaseId) || DEV_ROADMAP[0]
  const epic = phase.epics.find((e) => e.id === epicId) || phase.epics[0]

  const toggleTask = (id: string) => {
    setDoneIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectPhase = (id: string) => {
    setPhaseId(id)
    const p = DEV_ROADMAP.find((x) => x.id === id)
    if (p?.epics[0]) setEpicId(p.epics[0].id)
  }

  const tabs: { id: Tab; label: string; icon: typeof GitBranch }[] = [
    { id: 'planned', label: 'Build roadmap', icon: Rocket },
    { id: 'journey', label: 'Business journey', icon: GitBranch },
    { id: 'departments', label: 'Users by dept', icon: Users },
    { id: 'menus', label: 'Menu guide', icon: MapIcon },
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
            Development playbook · SaaS next
          </div>
          <h1 className="max-w-2xl text-2xl font-extrabold tracking-tight text-[var(--text-main)] sm:text-3xl">
            What to build next — full development workflow
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--text-muted)] sm:text-[15px]">
            P0–P5 development hamare end se complete hai (sandbox). Neeche:{' '}
            <strong className="text-[var(--text-main)]">kya ship ho chuka</strong>,{' '}
            <strong className="text-[var(--text-main)]">client se kya chahiye</strong> (Amazon /
            Shopify / payment / courier keys), aur{' '}
            <strong className="text-[var(--text-main)]">easy full test flow</strong>.
          </p>

          <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            {[
              { n: totals.phases, l: 'Phases (P0–P5)' },
              { n: totals.epics, l: 'Epics' },
              { n: `${counts.shipped}`, l: 'Shipped in code' },
              { n: `~${totals.days}d`, l: 'Est. effort' },
              { n: `${doneCount}/${totals.tasks}`, l: 'Tasks done' },
              { n: counts.planned, l: 'Still to build' },
            ].map((c) => (
              <div
                key={c.l}
                className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)]/80 px-3 py-3"
              >
                <div className="font-mono text-xl font-extrabold text-[var(--text-main)] sm:text-2xl">
                  {c.n}
                </div>
                <div className="text-[11px] font-medium text-[var(--text-dim)]">{c.l}</div>
              </div>
            ))}
          </div>

          <div className="mt-4 h-2 overflow-hidden rounded-full bg-[var(--bg-elevated)]">
            <div
              className="h-full rounded-full bg-indigo-600 transition-all"
              style={{
                width: `${totals.tasks ? Math.round((doneCount / totals.tasks) * 100) : 0}%`,
              }}
            />
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

      {tab === 'planned' ? (
        <section className="space-y-4">
          <header className="px-1">
            <h2 className="text-lg font-bold text-[var(--text-main)]">
              Client playbook — shipped · aap se chahiye · test flow
            </h2>
            <p className="text-sm text-[var(--text-muted)]">
              Hamari taraf se (bina aapke API keys ke) jo ban sakta tha woh done hai. Live Amazon /
              Shopify / payment / courier tab start hoga jab aap neeche wali keys share karenge.
            </p>
          </header>

          {/* Passwords first for easy testing */}
          <div className="rounded-2xl border border-[var(--border-main)] bg-[var(--bg-card)] p-4 sm:p-5">
            <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-dim)]">
              Test logins · shared password
            </div>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Password sab accounts:{' '}
              <code className="rounded bg-[var(--bg-elevated)] px-1.5 py-0.5 font-mono text-[13px] font-bold text-[var(--text-main)]">
                {DEMO_PASSWORD}
              </code>
              {' · '}
              <Link to="/login" className="font-bold text-indigo-600 no-underline dark:text-indigo-300">
                Open Login →
              </Link>
            </p>
            <div className="mt-3 max-h-52 overflow-y-auto rounded-xl border border-[var(--border-subtle)]">
              <table className="w-full text-left text-[12px]">
                <thead className="sticky top-0 bg-[var(--bg-elevated)] text-[10px] uppercase tracking-wide text-[var(--text-dim)]">
                  <tr>
                    <th className="px-2.5 py-2 font-bold">Role</th>
                    <th className="px-2.5 py-2 font-bold">Email</th>
                  </tr>
                </thead>
                <tbody>
                  {DEMO_LOGINS.map((u) => (
                    <tr key={u.email} className="border-t border-[var(--border-subtle)]">
                      <td className="px-2.5 py-2 font-semibold text-[var(--text-main)]">{u.role}</td>
                      <td className="px-2.5 py-2 font-mono text-[var(--text-muted)]">{u.email}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-2xl border border-cyan-500/30 bg-cyan-500/5 p-4">
            <h3 className="text-sm font-bold text-[var(--text-main)]">
              Department-wise users (client review)
            </h3>
            <p className="mt-1 text-[12px] text-[var(--text-muted)]">
              Poori detail — kya dikhega, CRUD kya kar sakta hai, kya block —{' '}
              <button
                type="button"
                className="font-bold text-indigo-600 underline"
                onClick={() => setTab('departments')}
              >
                By department tab
              </button>{' '}
              pe hai. Har user ke liye Add / Edit / Delete live Mongo pe chalna chahiye (Auditor
              read-only).
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {DEPARTMENT_USERS.map((u) => (
                <span
                  key={u.email}
                  className="rounded-full border border-[var(--border-main)] bg-[var(--bg-card)] px-2.5 py-1 text-[11px] font-semibold text-[var(--text-main)]"
                  title={u.email}
                >
                  {u.name} · {u.roleCode}
                </span>
              ))}
            </div>
          </div>

          {/* Full easy test flow */}
          <div className="rounded-2xl border border-indigo-500/30 bg-indigo-500/5 p-4 sm:p-5">
            <h3 className="flex items-center gap-2 text-sm font-bold text-[var(--text-main)]">
              <ClipboardList className="h-4 w-4 text-indigo-500" />
              Full flow test (≈35 min) — isi order mein chalao
            </h3>
            <p className="mt-1 text-[12px] text-[var(--text-muted)]">
              Har step pe <em>Do</em> karo, <em>Expect</em> match hona chahiye. Fail ho to screenshot +
              email role bhejo.
            </p>
            <div className="mt-4 space-y-4">
              {FULL_TEST_FLOW.map((flow) => (
                <article
                  key={flow.id}
                  className="rounded-xl border border-[var(--border-main)] bg-[var(--bg-card)] p-3 sm:p-4"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h4 className="text-sm font-extrabold text-[var(--text-main)]">{flow.title}</h4>
                    <span className="text-[10px] font-bold uppercase text-[var(--text-dim)]">
                      ~{flow.minutes} min · {flow.loginAs}
                    </span>
                  </div>
                  <ol className="mt-2 space-y-2">
                    {flow.steps.map((s, i) => (
                      <li
                        key={flow.id + i}
                        className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)]/40 px-3 py-2 text-[12px]"
                      >
                        <div className="font-semibold text-[var(--text-main)]">
                          {i + 1}. {s.do}
                          {s.link ? (
                            <Link
                              to={s.link}
                              className="ml-2 inline-flex items-center gap-0.5 text-[11px] font-bold text-indigo-600 no-underline dark:text-indigo-300"
                            >
                              Open
                              <ExternalLink className="h-2.5 w-2.5" />
                            </Link>
                          ) : null}
                        </div>
                        <div className="mt-0.5 text-[var(--text-muted)]">
                          <span className="font-bold text-emerald-700 dark:text-emerald-400">Expect: </span>
                          {s.expect}
                        </div>
                      </li>
                    ))}
                  </ol>
                </article>
              ))}
            </div>
          </div>

          {/* Client must provide */}
          <div className="rounded-2xl border border-amber-500/40 bg-amber-500/5 p-4 sm:p-5">
            <h3 className="text-sm font-bold text-[var(--text-main)]">
              Client se required (jab tak keys nahi — live API nahi)
            </h3>
            <p className="mt-0.5 text-[12px] text-[var(--text-muted)]">
              Yeh hamare code pe pending nahi — aapke accounts / API credentials pe depend karte hain.
              Share karte hi live wire-up start hoga.
            </p>
            <div className="mt-3 grid gap-3 lg:grid-cols-2">
              {CLIENT_REQUIRED.map((c) => (
                <div
                  key={c.title}
                  className="rounded-xl border border-[var(--border-main)] bg-[var(--bg-card)] p-3"
                >
                  <div className="text-[10px] font-bold uppercase tracking-wide text-amber-700 dark:text-amber-300">
                    {c.area}
                  </div>
                  <div className="mt-0.5 text-sm font-bold text-[var(--text-main)]">{c.title}</div>
                  <p className="mt-1 text-[11px] text-[var(--text-muted)]">{c.why}</p>
                  <p className="mt-2 text-[10px] font-bold uppercase text-[var(--text-dim)]">Aap provide karein</p>
                  <ul className="mt-1 space-y-0.5 text-[11px] text-[var(--text-main)]">
                    {c.provide.map((p) => (
                      <li key={p} className="flex gap-1.5">
                        <span className="text-amber-600">•</span>
                        {p}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2 text-[11px] text-[var(--text-dim)]">
                    <span className="font-bold text-emerald-700 dark:text-emerald-400">Hamara status: </span>
                    {c.ourStatus}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Shipped */}
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4 sm:p-5">
            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Shipped · P0 → P5 (hamare end — sandbox ready)
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {SHIPPED.map((block) => (
                <div key={block.phase}>
                  <div className="text-sm font-bold text-[var(--text-main)]">
                    {block.phase} · {block.title}
                  </div>
                  <ul className="mt-1.5 space-y-1 text-[12px] text-[var(--text-muted)]">
                    {block.items.map((item) => (
                      <li key={item} className="flex gap-2">
                        <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-emerald-500" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          {/* Short role UAT */}
          <div className="rounded-2xl border border-[var(--border-main)] bg-[var(--bg-card)] p-4 sm:p-5">
            <h3 className="text-sm font-bold text-[var(--text-main)]">Short role UAT</h3>
            <p className="mt-0.5 text-[12px] text-[var(--text-muted)]">
              Password: <code className="font-mono">{DEMO_PASSWORD}</code>
            </p>
            <div className="mt-3 grid gap-3 lg:grid-cols-2">
              {UAT_CHECKLISTS.map((u) => (
                <div
                  key={u.email}
                  className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)]/50 p-3"
                >
                  <div className="text-sm font-bold text-[var(--text-main)]">{u.role}</div>
                  <div className="font-mono text-[11px] text-[var(--text-dim)]">{u.email}</div>
                  <ol className="mt-2 list-decimal space-y-1 pl-4 text-[12px] text-[var(--text-muted)]">
                    {u.steps.map((s) => (
                      <li key={s}>{s}</li>
                    ))}
                  </ol>
                </div>
              ))}
            </div>
          </div>

          {/* Phase rail */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            {DEV_ROADMAP.map((p, idx) => {
              const phaseTasks = p.epics.flatMap((e) => e.tasks)
              const phaseDone = phaseTasks.filter((t) => doneIds.has(t.id)).length
              const on = phaseId === p.id
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => selectPhase(p.id)}
                  className={`min-w-[140px] shrink-0 rounded-xl border px-3 py-3 text-left transition ${
                    on
                      ? 'border-indigo-500 bg-indigo-600 text-white shadow-sm'
                      : 'border-[var(--border-main)] bg-[var(--bg-card)] hover:bg-[var(--bg-elevated)]'
                  }`}
                >
                  <div className={`text-[10px] font-bold uppercase tracking-wider ${on ? 'text-indigo-100' : 'text-[var(--text-dim)]'}`}>
                    {p.code}
                    {idx < DEV_ROADMAP.length - 1 ? ' →' : ''}
                  </div>
                  <div className={`mt-0.5 text-sm font-bold ${on ? 'text-white' : 'text-[var(--text-main)]'}`}>
                    {p.title}
                  </div>
                  <div className={`mt-1 text-[10px] ${on ? 'text-indigo-100' : 'text-[var(--text-dim)]'}`}>
                    {phaseDone}/{phaseTasks.length} tasks
                  </div>
                </button>
              )
            })}
          </div>

          <div className="rounded-2xl border border-[var(--border-main)] bg-[var(--bg-card)] p-4 sm:p-5">
            <p className="text-sm text-[var(--text-main)]">{phase.plain}</p>
            <p className="mt-1 text-[12px] text-[var(--text-muted)]">
              <strong className="text-[var(--text-dim)]">Why this order:</strong> {phase.whyOrder}
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
            <div className="flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible">
              {phase.epics.map((e) => {
                const ed = e.tasks.filter((t) => doneIds.has(t.id)).length
                const on = epicId === e.id
                return (
                  <button
                    key={e.id}
                    type="button"
                    onClick={() => setEpicId(e.id)}
                    className={`min-w-[200px] shrink-0 rounded-xl border px-3 py-3 text-left text-xs transition lg:w-full lg:min-w-0 ${
                      on
                        ? 'border-cyan-500/50 bg-cyan-500/10'
                        : 'border-[var(--border-main)] bg-[var(--bg-card)] hover:bg-[var(--bg-elevated)]'
                    }`}
                  >
                    <div className="font-bold text-[var(--text-main)]">{e.title}</div>
                    <div className="mt-1 text-[10px] text-[var(--text-dim)]">
                      ~{e.estimateDays}d · {ed}/{e.tasks.length} done
                    </div>
                  </button>
                )
              })}
            </div>

            <article className="rounded-2xl border border-[var(--border-main)] bg-[var(--bg-card)] p-4 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400">
                    Epic · {phase.code}
                  </div>
                  <h3 className="mt-1 text-lg font-extrabold text-[var(--text-main)]">{epic.title}</h3>
                  <p className="mt-1 text-sm text-[var(--text-muted)]">{epic.plain}</p>
                </div>
                <span className="rounded-full border border-[var(--border-main)] bg-[var(--bg-elevated)] px-2.5 py-1 font-mono text-xs font-bold text-[var(--text-main)]">
                  ~{epic.estimateDays} days
                </span>
              </div>

              <div className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-3 py-2.5 text-sm text-[var(--text-main)]">
                <strong className="text-emerald-700 dark:text-emerald-400">Done when: </strong>
                {epic.outcome}
              </div>

              {epic.dependsOn.length ? (
                <p className="mt-3 text-[12px] text-[var(--text-dim)]">
                  Depends on:{' '}
                  {epic.dependsOn.map((d) => (
                    <code key={d} className="mr-1 rounded bg-[var(--bg-elevated)] px-1.5 py-0.5 text-[11px]">
                      {d}
                    </code>
                  ))}
                </p>
              ) : null}

              <div className="mt-4">
                <h4 className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[var(--text-dim)]">
                  <ClipboardList className="h-3.5 w-3.5" /> Acceptance checklist
                </h4>
                <ul className="mt-2 space-y-1.5 text-sm text-[var(--text-main)]">
                  {epic.acceptance.map((a) => (
                    <li key={a} className="flex gap-2">
                      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-indigo-500" />
                      {a}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-5">
                <h4 className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[var(--text-dim)]">
                  <Server className="h-3.5 w-3.5" /> Development tasks — tick as you finish
                </h4>
                <ul className="mt-2 space-y-2">
                  {epic.tasks.map((t) => {
                    const done = doneIds.has(t.id)
                    return (
                      <li key={t.id}>
                        <label
                          className={`flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-2.5 transition ${
                            done
                              ? 'border-emerald-500/30 bg-emerald-500/5'
                              : 'border-[var(--border-subtle)] bg-[var(--bg-elevated)]/40 hover:border-indigo-400/40'
                          }`}
                        >
                          <input
                            type="checkbox"
                            className="mt-1 h-4 w-4 accent-indigo-600"
                            checked={done}
                            onChange={() => toggleTask(t.id)}
                          />
                          <span className="min-w-0 flex-1">
                            <span
                              className={`block text-sm font-semibold ${done ? 'text-[var(--text-dim)] line-through' : 'text-[var(--text-main)]'}`}
                            >
                              {t.title}
                            </span>
                            <span className="mt-1 inline-flex items-center gap-2">
                              <span
                                className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${sideBadge(t.side)}`}
                              >
                                {t.side}
                              </span>
                              <code className="text-[10px] text-[var(--text-dim)]">{t.id}</code>
                            </span>
                          </span>
                        </label>
                      </li>
                    )
                  })}
                </ul>
              </div>

              {epic.menusTouched.length ? (
                <div className="mt-4 flex flex-wrap gap-1.5">
                  <span className="w-full text-[10px] font-bold uppercase tracking-wider text-[var(--text-dim)]">
                    Menus / areas touched
                  </span>
                  {epic.menusTouched.map((m) =>
                    m.startsWith('/') ? (
                      <Link
                        key={m}
                        to={m === '/workflow' ? '/workflow' : m}
                        className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-main)] bg-[var(--bg-elevated)] px-2 py-1 text-[11px] font-semibold text-[var(--text-main)] no-underline"
                      >
                        {m}
                        <ExternalLink className="h-2.5 w-2.5 text-[var(--text-dim)]" />
                      </Link>
                    ) : (
                      <span
                        key={m}
                        className="rounded-lg border border-[var(--border-main)] bg-[var(--bg-elevated)] px-2 py-1 text-[11px] font-semibold text-[var(--text-muted)]"
                      >
                        {m}
                      </span>
                    ),
                  )}
                </div>
              ) : null}
            </article>
          </div>

        </section>
      ) : null}

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
        <section className="space-y-4">
          <header className="px-1">
            <h2 className="text-lg font-bold text-[var(--text-main)]">
              Department users — client review matrix
            </h2>
            <p className="text-sm text-[var(--text-muted)]">
              Har department ka ek demo user. Password sab:{' '}
              <code className="font-mono font-bold text-[var(--text-main)]">{DEMO_PASSWORD}</code>.
              Login karke sidebar + CRUD (Add / Edit / Delete) verify karo. Auditor = read-only.
            </p>
          </header>

          <div className="grid gap-3">
            {DEPARTMENT_USERS.map((u) => (
              <article
                key={u.email}
                className="rounded-2xl border border-[var(--border-main)] bg-[var(--bg-card)] p-4 sm:p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-300">
                      {u.department}
                    </div>
                    <h3 className="text-lg font-extrabold text-[var(--text-main)]">{u.name}</h3>
                    <p className="mt-0.5 font-mono text-[12px] text-[var(--text-muted)]">
                      {u.email} · <span className="font-bold text-[var(--text-main)]">{u.password}</span>
                    </p>
                  </div>
                  <Link
                    to="/login"
                    className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white no-underline"
                  >
                    Login as this user
                  </Link>
                </div>

                <div className="mt-3 grid gap-3 lg:grid-cols-2">
                  <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)]/50 p-3">
                    <h4 className="text-[10px] font-bold uppercase text-[var(--text-dim)]">
                      Kya dikhai deta hai (menus)
                    </h4>
                    <ul className="mt-1.5 space-y-1 text-[12px] text-[var(--text-main)]">
                      {u.seesMenus.map((m) => (
                        <li key={m} className="flex gap-1.5">
                          <span className="text-emerald-500">✓</span>
                          {m}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)]/50 p-3">
                    <h4 className="text-[10px] font-bold uppercase text-[var(--text-dim)]">
                      CRUD — Add / Edit / Delete
                    </h4>
                    <ul className="mt-1.5 space-y-1.5 text-[12px]">
                      {u.canCrud.map((c) => (
                        <li key={c.path + c.resource}>
                          <Link
                            to={c.path}
                            className="font-semibold text-indigo-600 no-underline dark:text-indigo-300"
                          >
                            {c.resource}
                          </Link>
                          <span className="text-[var(--text-muted)]"> — {c.actions}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div>
                    <h4 className="text-[10px] font-bold uppercase text-[var(--text-dim)]">
                      Extra actions
                    </h4>
                    <ul className="mt-1 space-y-1 text-[12px] text-[var(--text-main)]">
                      {u.specialActions.map((s) => (
                        <li key={s} className="flex gap-1.5">
                          <ArrowRight className="mt-0.5 h-3 w-3 shrink-0 text-indigo-500" />
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="text-[10px] font-bold uppercase text-red-600/80 dark:text-red-400">
                      Blocked / cannot
                    </h4>
                    <ul className="mt-1 space-y-1 text-[12px] text-[var(--text-muted)]">
                      {u.cannot.map((s) => (
                        <li key={s}>• {s}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                <p className="mt-3 rounded-lg border border-cyan-500/25 bg-cyan-500/5 px-3 py-2 text-[12px] text-[var(--text-main)]">
                  <strong className="text-cyan-700 dark:text-cyan-300">Client tip: </strong>
                  {u.reviewTip}
                </p>
              </article>
            ))}
          </div>

          <div className="rounded-xl border border-dashed border-[var(--border-main)] p-3 text-[12px] text-[var(--text-muted)]">
            Quick chips (same as left nav roles):{' '}
            {DEPARTMENTS.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => setActiveDept(d.id)}
                className={`mr-1 mt-1 inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
                  activeDept === d.id
                    ? 'border-indigo-500 bg-indigo-600 text-white'
                    : 'border-[var(--border-main)] bg-[var(--bg-card)]'
                }`}
              >
                {d.emoji} {d.role}
              </button>
            ))}
            <p className="mt-2 text-[var(--text-main)]">{dept.plain}</p>
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

      <div className="rounded-2xl border border-indigo-500/25 bg-indigo-500/5 p-5">
        <div className="flex items-start gap-3">
          <Building2 className="mt-0.5 h-5 w-5 shrink-0 text-indigo-500" />
          <div>
            <h3 className="font-bold text-[var(--text-main)]">Client: test + keys</h3>
            <p className="mt-1 text-sm leading-relaxed text-[var(--text-muted)]">
              Build roadmap tab pe <strong className="text-[var(--text-main)]">Full flow test</strong>{' '}
              chalao (password table ke saath). Live Amazon / Shopify / payment / FedEx ke liye{' '}
              <strong className="text-[var(--text-main)]">Client se required</strong> section mein
              keys list hain — bina keys ke sandbox pehle se kaam karta hai.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
