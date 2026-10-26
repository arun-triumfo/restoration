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
  Users,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  DEMO_LOGINS,
  DEMO_PASSWORD,
  DEPARTMENT_USERS,
  DEPARTMENTS,
  FULL_TEST_FLOW,
  JOURNEY_STEPS,
  MENU_GUIDE,
  OWNER_REQUIRED,
  SHIPPED,
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
  const [tab, setTab] = useState<Tab>('planned')
  const [activeDept, setActiveDept] = useState(DEPARTMENTS[0].id)

  const dept = DEPARTMENTS.find((d) => d.id === activeDept) || DEPARTMENTS[0]

  const tabs: { id: Tab; label: string; icon: typeof GitBranch }[] = [
    { id: 'planned', label: 'Status & next steps', icon: Rocket },
    { id: 'journey', label: 'Business journey', icon: GitBranch },
    { id: 'departments', label: 'Users by dept', icon: Users },
    { id: 'menus', label: 'Menu guide', icon: MapIcon },
  ]

  const remainingCount = useMemo(() => OWNER_REQUIRED.length, [])

  return (
    <div className="mx-auto max-w-6xl space-y-5 pb-10">
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
            Restoration · RugOS status
          </div>
          <h1 className="max-w-2xl text-2xl font-extrabold tracking-tight text-[var(--text-main)] sm:text-3xl">
            Platform status for Restoration
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--text-muted)] sm:text-[15px]">
            The sandbox ERP is ready to use today (login, roles, inventory, orders, packing,
            shipping demo, multi-company isolation). Below:{' '}
            <strong className="text-[var(--text-main)]">what is left</strong> and{' '}
            <strong className="text-[var(--text-main)]">why</strong> — items waiting on Restoration
            owner credentials (Amazon, Shopify, payment gateway, courier accounts).
          </p>

          <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)]/80 px-3 py-3">
              <div className="font-mono text-xl font-extrabold text-[var(--text-main)] sm:text-2xl">
                Ready
              </div>
              <div className="text-[11px] font-medium text-[var(--text-dim)]">Sandbox platform</div>
            </div>
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-3 py-3">
              <div className="font-mono text-xl font-extrabold text-[var(--text-main)] sm:text-2xl">
                {remainingCount}
              </div>
              <div className="text-[11px] font-medium text-[var(--text-dim)]">
                Waiting on Restoration
              </div>
            </div>
            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)]/80 px-3 py-3 sm:col-span-1 col-span-2">
              <div className="font-mono text-xl font-extrabold text-[var(--text-main)] sm:text-2xl">
                Demo
              </div>
              <div className="text-[11px] font-medium text-[var(--text-dim)]">
                Password {DEMO_PASSWORD}
              </div>
            </div>
          </div>
        </div>
      </section>

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
            <h2 className="text-lg font-bold text-[var(--text-main)]">What is left — and why</h2>
            <p className="text-sm text-[var(--text-muted)]">
              Nothing below is blocked on missing product screens. Live Amazon / Shopify / payments /
              real courier labels need Restoration company API accounts. Until then, sandbox demos
              work for review.
            </p>
          </header>

          <div className="rounded-2xl border border-amber-500/40 bg-amber-500/5 p-4 sm:p-5">
            <h3 className="text-sm font-bold text-[var(--text-main)]">
              Waiting on Restoration owner
            </h3>
            <p className="mt-0.5 text-[12px] text-[var(--text-muted)]">
              Share these credentials when ready — live wiring can start immediately after.
            </p>
            <div className="mt-3 grid gap-3 lg:grid-cols-2">
              {OWNER_REQUIRED.map((c) => (
                <div
                  key={c.title}
                  className="rounded-xl border border-[var(--border-main)] bg-[var(--bg-card)] p-3"
                >
                  <div className="text-[10px] font-bold uppercase tracking-wide text-amber-700 dark:text-amber-300">
                    {c.area}
                  </div>
                  <div className="mt-0.5 text-sm font-bold text-[var(--text-main)]">{c.title}</div>
                  <p className="mt-1 text-[11px] text-[var(--text-muted)]">
                    <strong className="text-amber-800 dark:text-amber-200">Why left: </strong>
                    {c.whyLeft}
                  </p>
                  <p className="mt-2 text-[10px] font-bold uppercase text-[var(--text-dim)]">
                    Restoration should provide
                  </p>
                  <ul className="mt-1 space-y-0.5 text-[11px] text-[var(--text-main)]">
                    {c.provide.map((p) => (
                      <li key={p} className="flex gap-1.5">
                        <span className="text-amber-600">•</span>
                        {p}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2 text-[11px] text-[var(--text-dim)]">
                    <span className="font-bold text-emerald-700 dark:text-emerald-400">
                      Ready now:{' '}
                    </span>
                    {c.readyNow}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-[var(--border-main)] bg-[var(--bg-card)] p-4 sm:p-5">
            <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-dim)]">
              Test logins · shared password
            </div>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Password for every demo account:{' '}
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
            <h3 className="text-sm font-bold text-[var(--text-main)]">Department demo users</h3>
            <p className="mt-1 text-[12px] text-[var(--text-muted)]">
              See what each role can view and edit under{' '}
              <button
                type="button"
                className="font-bold text-indigo-600 underline"
                onClick={() => setTab('departments')}
              >
                Users by dept
              </button>
              . Add / Edit / Delete work on allowed menus (Auditor is read-only).
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

          <div className="rounded-2xl border border-indigo-500/30 bg-indigo-500/5 p-4 sm:p-5">
            <h3 className="flex items-center gap-2 text-sm font-bold text-[var(--text-main)]">
              <ClipboardList className="h-4 w-4 text-indigo-500" />
              Suggested review walkthrough
            </h3>
            <p className="mt-1 text-[12px] text-[var(--text-muted)]">
              Follow each step. Match the expected result. If something fails, note the login email
              used.
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
                      Login: {flow.loginAs}
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
                          <span className="font-bold text-emerald-700 dark:text-emerald-400">
                            Expect:{' '}
                          </span>
                          {s.expect}
                        </div>
                      </li>
                    ))}
                  </ol>
                </article>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4 sm:p-5">
            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Already available in sandbox
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {SHIPPED.map((block) => (
                <div key={block.phase}>
                  <div className="text-sm font-bold text-[var(--text-main)]">{block.title}</div>
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
        </section>
      ) : null}

      {tab === 'journey' ? (
        <section className="space-y-3">
          <header className="px-1">
            <h2 className="text-lg font-bold text-[var(--text-main)]">End-to-end business journey</h2>
            <p className="text-sm text-[var(--text-muted)]">
              Read top to bottom like a story. Open any step to jump into that menu.
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
              Department users — Restoration review
            </h2>
            <p className="text-sm text-[var(--text-muted)]">
              One demo user per department. Shared password:{' '}
              <code className="font-mono font-bold text-[var(--text-main)]">{DEMO_PASSWORD}</code>.
              Sign in and verify the sidebar plus Add / Edit / Delete on allowed screens. Auditor is
              read-only.
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
                    Open login
                  </Link>
                </div>

                <div className="mt-3 grid gap-3 lg:grid-cols-2">
                  <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)]/50 p-3">
                    <h4 className="text-[10px] font-bold uppercase text-[var(--text-dim)]">
                      Menus this role sees
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
                      Blocked
                    </h4>
                    <ul className="mt-1 space-y-1 text-[12px] text-[var(--text-muted)]">
                      {u.cannot.map((s) => (
                        <li key={s}>• {s}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                <p className="mt-3 rounded-lg border border-cyan-500/25 bg-cyan-500/5 px-3 py-2 text-[12px] text-[var(--text-main)]">
                  <strong className="text-cyan-700 dark:text-cyan-300">Review tip: </strong>
                  {u.reviewTip}
                </p>
              </article>
            ))}
          </div>

          <div className="rounded-xl border border-dashed border-[var(--border-main)] p-3 text-[12px] text-[var(--text-muted)]">
            Department chips:{' '}
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
              Same sidebar Restoration teams use. Status shows what is ready today.
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
                        <p className="mt-0.5 text-[11px] text-[var(--text-dim)]">{item.note}</p>
                      ) : null}
                    </div>
                    <Link
                      to={item.path}
                      className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-[var(--border-main)] bg-[var(--bg-elevated)] px-2.5 py-1.5 text-xs font-bold text-[var(--text-main)] no-underline"
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
            <h3 className="font-bold text-[var(--text-main)]">For Restoration owners</h3>
            <p className="mt-1 text-sm leading-relaxed text-[var(--text-muted)]">
              Use the review walkthrough and department logins to explore the sandbox. Live Amazon,
              Shopify, payment gateway, and courier labels unlock after Restoration shares the
              credentials listed under <strong className="text-[var(--text-main)]">What is left</strong>.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
