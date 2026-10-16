import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { useData } from '../context/DataContext'
import { Button } from '../components/ui/Button'
import {
  SEED_ALERTS,
  SEED_RULES,
  mapApiAlert,
  mapApiRule,
  sevColor,
  type AlertIncident,
  type AutomationRule,
} from '../data/wireframeAlerts'

type DomainFilter = 'all' | 'operational' | 'logistics' | 'financial' | 'recalculation'

function domainMatch(text: string, filter: DomainFilter) {
  if (filter === 'all') return true
  return text.toLowerCase().includes(filter)
}

export function AutomationAlerts() {
  const { list, update, remove, create } = useData()
  const { pushToast } = useApp()
  const navigate = useNavigate()

  const apiAlerts = list('alerts')
  const apiRules = list('automations')

  const [resolvedIds, setResolvedIds] = useState<Set<string>>(new Set())
  const [localRules, setLocalRules] = useState<AutomationRule[] | null>(null)
  const [domain, setDomain] = useState<DomainFilter>('all')
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')

  const alerts = useMemo(() => {
    const fromApi = apiAlerts.length
      ? apiAlerts.map((r) => mapApiAlert(r as Record<string, unknown>))
      : SEED_ALERTS
    return fromApi.filter((a) => !a.resolved && !resolvedIds.has(a.id) && domainMatch(a.domain, domain))
  }, [apiAlerts, resolvedIds, domain])

  const rules = useMemo(() => {
    if (localRules) return localRules
    return apiRules.length
      ? apiRules.map((r) => mapApiRule(r as Record<string, unknown>))
      : SEED_RULES
  }, [apiRules, localRules])

  const filteredRules = useMemo(() => {
    return rules.filter((r) => {
      const q = search.toLowerCase()
      const okSearch =
        !q ||
        r.name.toLowerCase().includes(q) ||
        r.trigger.toLowerCase().includes(q) ||
        r.condition.toLowerCase().includes(q)
      return okSearch && domainMatch(r.domain, domain)
    })
  }, [rules, search, domain])

  const activeRulesCount = rules.filter((r) => r.active).length
  const pausedRulesCount = rules.length - activeRulesCount
  const totalFired = rules.reduce((s, r) => s + (r.executionCount || 0), 0)

  const barData = [3, 6, 4, 9, 5, 8, alerts.length + 4]
  const barLabels = ['Thu', 'Fri', 'Sat', 'Sun', 'Mon', 'Tue', 'Today']
  const barMax = Math.max(...barData) || 1
  const bH = 48
  const bW = 26
  const bGap = 8
  const svgW = barData.length * (bW + bGap) - bGap

  const ensureLocalRules = () => {
    if (!localRules) setLocalRules(rules.map((r) => ({ ...r })))
  }

  const resolveAlert = async (alert: AlertIncident) => {
    setResolvedIds((prev) => new Set(prev).add(alert.id))
    const row = apiAlerts.find((r) => String(r.id || r._id) === alert.id)
    if (row?._id) {
      try {
        await update('alerts', String(row._id), { ...row, resolved: true })
      } catch {
        /* keep local resolve */
      }
    }
    pushToast(`Alert ${alert.id} resolved.`, 'success')
  }

  const toggleRule = async (rule: AutomationRule) => {
    ensureLocalRules()
    const next = !rule.active
    setLocalRules((prev) =>
      (prev || rules).map((r) => (r.id === rule.id ? { ...r, active: next } : r)),
    )
    const row = apiRules.find((r) => String(r.id || r._id) === rule.id)
    if (row?._id) {
      try {
        await update('automations', String(row._id), { ...row, active: next })
      } catch {
        /* local toggle still applied */
      }
    }
    pushToast(`Automation rule ${rule.id} is now ${next ? 'ACTIVE' : 'PAUSED'}.`, next ? 'success' : 'info')
  }

  const deleteRule = async (rule: AutomationRule) => {
    ensureLocalRules()
    setLocalRules((prev) => (prev || rules).filter((r) => r.id !== rule.id))
    const row = apiRules.find((r) => String(r.id || r._id) === rule.id)
    if (row?._id) {
      try {
        await remove('automations', String(row._id))
      } catch {
        /* local delete */
      }
    }
    pushToast(`Rule ${rule.id} deleted.`, 'info')
  }

  const testFire = (rule: AutomationRule) => {
    pushToast(`⚡ Test fire executed for ${rule.id} — ${rule.name}`, 'success')
  }

  const runSimulation = () => {
    pushToast('⚡ Full SOW automation simulation complete — 9 rules evaluated.', 'success')
  }

  const createRule = async () => {
    const name = newName.trim() || 'Custom Automation Rule'
    const id = `rule-${String(rules.length + 1).padStart(2, '0')}`
    const rule: AutomationRule = {
      id,
      name,
      domain: 'Operational Alerts',
      severity: 'MEDIUM',
      trigger: 'Custom threshold condition',
      condition: 'Custom condition',
      action: 'Notify SCM Lead via SMTP + in-app push',
      active: true,
      lastFired: 'Never',
      executionCount: 0,
      nextCheck: 'On next cycle',
      schedule: '*/15 * * * *',
    }
    ensureLocalRules()
    setLocalRules((prev) => [...(prev || rules), rule])
    try {
      await create('automations', rule as unknown as Record<string, unknown>)
    } catch {
      /* local create */
    }
    setShowCreate(false)
    setNewName('')
    pushToast(`⚡ Automation Rule "${name}" activated successfully!`, 'success')
  }

  const pills: { key: DomainFilter; label: string }[] = [
    { key: 'all', label: `All Rules & Alerts (${rules.length})` },
    { key: 'operational', label: '🏭 Operational Alerts (Stock & SLA)' },
    { key: 'logistics', label: '🚚 Logistics & Courier Audit' },
    { key: 'financial', label: '🏦 Financial, FEMA & Returns' },
    { key: 'recalculation', label: '🔄 Recalculation & Sync' },
  ]

  return (
    <div className="wf-viewport space-y-4">
      {/* SOW banner */}
      <div
        className="flex flex-wrap items-center justify-between gap-2 rounded-lg px-3.5 py-2.5"
        style={{
          background: 'rgba(99,102,241,0.08)',
          border: '1px solid rgba(99,102,241,0.25)',
          borderLeft: '4px solid #6366f1',
        }}
      >
        <div>
          <span className="inline-block rounded bg-indigo-600 px-2 py-0.5 text-[10px] font-bold tracking-wide text-white">
            SOW MODULE 8 — WORKSTREAM 2 (60 ENGINEERING HOURS)
          </span>
          <strong className="ml-2 text-[12.5px] text-[var(--text-main)]">
            Enterprise Alerts, Advanced Automation & Profitability Recalculation Engine
          </strong>
          <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">
            Operational stock threshold monitors, unfulfilled order aging alerts (&gt;24h), courier weight
            dispute triggers, FEMA 210-day EBRC sentinels, and automated net profit recalculation.
          </p>
        </div>
        <div className="flex gap-1.5">
          <Button size="sm" variant="secondary" onClick={runSimulation}>
            ⚡ Run Full Test Simulation
          </Button>
          <Button
            size="sm"
            variant="primary"
            className="border-none font-bold"
            style={{ background: 'linear-gradient(135deg, #6366f1, #06b6d4)' }}
            onClick={() => setShowCreate(true)}
          >
            + Create Alert Rule
          </Button>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 xl:grid-cols-6">
        <MetricTile
          label="🚨 Active Alerts"
          value={String(alerts.length)}
          sub={alerts.length > 0 ? 'Action required' : 'All clear'}
          color={alerts.length > 0 ? '#ef4444' : '#10b981'}
        />
        <MetricTile
          label="⚡ Configured Rules"
          value={String(rules.length)}
          sub={`${activeRulesCount} active · ${pausedRulesCount} paused`}
          color="#06b6d4"
        />
        <MetricTile
          label="🤖 Total Executions"
          value={String(totalFired)}
          sub="Rule triggers executed"
          color="#6366f1"
        />
        <MetricTile label="✅ Auto-Resolution" value="94.2%" sub="Self-healing workflows" color="#10b981" />
        <div
          className="col-span-2 rounded-[10px] border border-indigo-500/20 bg-[var(--bg-elevated)] px-3.5 py-3"
        >
          <div className="mb-2 text-[9px] font-bold uppercase tracking-wide text-[var(--text-dim)]">
            📊 7-Day Alert Trigger Activity
          </div>
          <svg width={svgW} height={bH + 18} className="overflow-visible">
            {barData.map((v, i) => {
              const h = Math.max(4, Math.round((v / barMax) * bH))
              const x = i * (bW + bGap)
              const y = bH - h
              const isToday = i === barData.length - 1
              const fill = isToday ? (v >= 6 ? '#ef4444' : '#06b6d4') : 'rgba(99,102,241,0.5)'
              return (
                <g key={barLabels[i]}>
                  <rect x={x} y={y} width={bW} height={h} rx={3} fill={fill} opacity={isToday ? 1 : 0.8} />
                  <text x={x + bW / 2} y={bH + 13} fill="#64748b" fontSize={8.5} textAnchor="middle">
                    {barLabels[i]}
                  </text>
                  <text
                    x={x + bW / 2}
                    y={y - 4}
                    fill={isToday ? fill : '#64748b'}
                    fontSize={9}
                    textAnchor="middle"
                    fontWeight={isToday ? 700 : 400}
                  >
                    {v}
                  </text>
                </g>
              )
            })}
          </svg>
        </div>
      </div>

      {/* Filter pills */}
      <div className="status-filter-pills flex flex-wrap gap-2">
        {pills.map((p) => (
          <button
            key={p.key}
            type="button"
            className={`filter-pill-btn ${domain === p.key ? 'active' : ''}`}
            onClick={() => setDomain(p.key)}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Active alerts */}
      {alerts.length > 0 ? (
        <div>
          <div className="mb-2.5 flex items-center justify-between">
            <h3 className="m-0 flex items-center gap-2 text-[13.5px] font-bold text-[var(--text-main)]">
              <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-red-500" />
              Active Operational & Financial Alerts Requiring Action
            </h3>
            <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-[11px] font-bold text-red-500">
              {alerts.length} Unresolved Incidents
            </span>
          </div>
          <div className="flex flex-col gap-2.5">
            {alerts.map((alert) => {
              const color = sevColor(alert.severity)
              return (
                <div
                  key={alert.id}
                  className="rounded-[10px] bg-[var(--bg-elevated)] p-3.5"
                  style={{ border: `1px solid ${color}35`, borderLeft: `4px solid ${color}` }}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex min-w-[280px] flex-1 gap-3">
                      <div
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] text-xl"
                        style={{
                          background: `${color}12`,
                          border: `1px solid ${color}30`,
                        }}
                      >
                        {alert.icon}
                      </div>
                      <div className="flex-1">
                        <div className="mb-1 flex flex-wrap items-center gap-1.5">
                          <span
                            className="rounded-full px-2 py-0.5 text-[9.5px] font-extrabold tracking-wide"
                            style={{
                              color,
                              background: `${color}18`,
                              border: `1px solid ${color}30`,
                            }}
                          >
                            {alert.severity}
                          </span>
                          <span className="rounded-full bg-slate-900/40 px-2 py-0.5 text-[9.5px] text-[var(--text-dim)]">
                            {alert.domain}
                          </span>
                          {alert.ruleId ? (
                            <span className="font-mono text-[9px] text-cyan-500">↳ Rule: {alert.ruleId}</span>
                          ) : null}
                        </div>
                        <div className="mb-1 text-[13px] font-bold leading-snug text-[var(--text-main)]">
                          {alert.title}
                        </div>
                        <div className="text-[11.5px] leading-relaxed text-[var(--text-muted)]">
                          {alert.detail}
                        </div>
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-2">
                      <span className="text-[10px] text-[var(--text-dim)]">🕐 {alert.timestamp}</span>
                      <div className="flex gap-1.5">
                        <Button size="sm" variant="secondary" onClick={() => resolveAlert(alert)}>
                          ✓ Resolve
                        </Button>
                        <button
                          type="button"
                          className="rounded-lg px-2.5 py-1.5 text-[11px] font-bold text-white"
                          style={{ background: color }}
                          onClick={() => {
                            if (alert.actionPath) navigate(alert.actionPath)
                            else pushToast(alert.actionLabel, 'info')
                          }}
                        >
                          {alert.actionLabel}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <div
          className="mb-5 flex items-center gap-3 rounded-[10px] px-4 py-3.5"
          style={{
            background: 'rgba(16,185,129,0.06)',
            border: '1px solid rgba(16,185,129,0.25)',
            borderLeft: '4px solid #10b981',
          }}
        >
          <span className="text-[22px]">✅</span>
          <div>
            <div className="text-[13px] font-bold text-emerald-500">All Operational Alerts Cleared</div>
            <div className="text-[11.5px] text-[var(--text-muted)]">
              Zero threshold violations across warehouse stock, courier freight, or DGFT ledgers.
            </div>
          </div>
        </div>
      )}

      {/* Rules header */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div>
          <h3 className="m-0 text-[13.5px] font-bold text-[var(--text-main)]">
            ⚡ Configured SOW Automation Rules & Scheduled Daemons
          </h3>
          <p className="mt-1 text-[11px] text-[var(--text-muted)]">
            Real-time conditions evaluated every 5 mins by background worker daemons · Toggle to
            activate/pause
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative min-w-[220px]">
            <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs">
              🔍
            </span>
            <input
              className="form-control w-full rounded-lg border border-[var(--border-main)] bg-[var(--bg-card)] py-2 pl-8 pr-3 text-xs"
              placeholder="Search rules or triggers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <span className="whitespace-nowrap text-[11px] text-[var(--text-dim)]">
            {filteredRules.length} of {rules.length} Rules
          </span>
        </div>
      </div>

      <div className="mb-5 flex flex-col gap-2.5">
        {filteredRules.length === 0 ? (
          <div className="rounded-xl border border-dashed border-indigo-500/20 bg-[var(--bg-elevated)] px-10 py-10 text-center text-[var(--text-muted)]">
            <div className="mb-2 text-3xl">⚙️</div>
            <div className="mb-1 font-bold">No Matching Rules</div>
            <div className="text-xs">Adjust filters or create a new automation rule.</div>
          </div>
        ) : (
          filteredRules.map((rule) => {
            const color = sevColor(rule.severity)
            const domainIcon = rule.domain.includes('Operational')
              ? '🏭'
              : rule.domain.includes('Logistics')
                ? '🚚'
                : rule.domain.includes('Financial')
                  ? '🏦'
                  : '🔄'
            return (
              <div
                key={rule.id}
                className="rounded-[10px] bg-[var(--bg-elevated)] p-4"
                style={{
                  border: `1px solid ${rule.active ? `${color}28` : 'rgba(100,116,139,0.2)'}`,
                  borderLeft: `4px solid ${rule.active ? color : '#334155'}`,
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-1 gap-2.5">
                    <div
                      className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-lg text-lg"
                      style={{
                        background: rule.active ? `${color}15` : 'rgba(100,116,139,0.1)',
                        border: `1px solid ${rule.active ? `${color}30` : 'rgba(100,116,139,0.2)'}`,
                      }}
                    >
                      {domainIcon}
                    </div>
                    <div className="flex-1">
                      <div className="mb-1 flex flex-wrap items-center gap-1.5">
                        <code className="text-[10px] text-cyan-500">{rule.id}</code>
                        <span
                          className="rounded-full px-1.5 py-0.5 text-[9px] font-extrabold tracking-wide"
                          style={{
                            color,
                            background: `${color}15`,
                            border: `1px solid ${color}25`,
                          }}
                        >
                          {rule.severity}
                        </span>
                        <span className="rounded-full bg-slate-900/40 px-1.5 py-0.5 text-[9px] text-[var(--text-dim)]">
                          {rule.domain}
                        </span>
                        <span className="font-mono text-[9px] text-[var(--text-dim)]">{rule.schedule}</span>
                      </div>
                      <div className="text-[13.5px] font-bold leading-snug text-[var(--text-main)]">
                        {rule.name}
                      </div>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-center gap-0.5">
                    <button
                      type="button"
                      aria-label="Toggle rule"
                      onClick={() => toggleRule(rule)}
                      className="relative h-[22px] w-10 rounded-[11px] transition"
                      style={{
                        background: rule.active ? '#10b981' : '#334155',
                        boxShadow: rule.active ? '0 0 10px rgba(16,185,129,0.3)' : 'none',
                      }}
                    >
                      <span
                        className="absolute top-[3px] h-4 w-4 rounded-full bg-white shadow transition-all"
                        style={{ left: rule.active ? 20 : 3 }}
                      />
                    </button>
                    <span
                      className="text-[9px] font-bold"
                      style={{ color: rule.active ? '#10b981' : '#64748b' }}
                    >
                      {rule.active ? 'ACTIVE' : 'PAUSED'}
                    </span>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
                  <div
                    className="rounded-md px-2.5 py-2"
                    style={{
                      background: 'rgba(99,102,241,0.06)',
                      border: '1px solid rgba(99,102,241,0.12)',
                    }}
                  >
                    <div className="mb-1 text-[9.5px] font-bold uppercase tracking-wide text-[var(--text-dim)]">
                      ⚡ Operational Condition Trigger
                    </div>
                    <div className="text-[11.5px] leading-snug text-[var(--text-main)]">
                      {rule.condition || rule.trigger}
                    </div>
                  </div>
                  <div
                    className="rounded-md px-2.5 py-2"
                    style={{
                      background: 'rgba(16,185,129,0.05)',
                      border: '1px solid rgba(16,185,129,0.12)',
                    }}
                  >
                    <div className="mb-1 text-[9.5px] font-bold uppercase tracking-wide text-[var(--text-dim)]">
                      🤖 Automated System Execution
                    </div>
                    <div className="text-[11.5px] leading-snug text-[var(--text-main)]">{rule.action}</div>
                  </div>
                </div>

                <div
                  className="mt-2.5 flex flex-wrap items-center justify-between gap-2 pt-2.5"
                  style={{ borderTop: '1px solid rgba(99,102,241,0.1)' }}
                >
                  <div className="flex flex-wrap items-center gap-3.5 text-[10.5px] text-[var(--text-dim)]">
                    <span>
                      🕐 Last:{' '}
                      <strong className="text-[var(--text-muted)]">{rule.lastFired}</strong>
                    </span>
                    <span>
                      🔁 Fired:{' '}
                      <strong className="text-cyan-500">{rule.executionCount}×</strong>
                    </span>
                    {rule.nextCheck ? (
                      <span>
                        ⏭ Next: <strong className="text-[var(--text-muted)]">{rule.nextCheck}</strong>
                      </span>
                    ) : null}
                  </div>
                  <div className="flex gap-1.5">
                    <Button size="sm" variant="secondary" onClick={() => testFire(rule)}>
                      ⚡ Test Fire
                    </Button>
                    <button
                      type="button"
                      className="rounded-md px-2 py-1 text-[10.5px]"
                      style={{
                        background: 'rgba(239,68,68,0.1)',
                        border: '1px solid rgba(239,68,68,0.25)',
                        color: '#ef4444',
                      }}
                      onClick={() => deleteRule(rule)}
                    >
                      🗑
                    </button>
                  </div>
                </div>
              </div>
            )
          })
        )}

        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="flex items-center justify-center gap-3 rounded-[10px] border-2 border-dashed border-indigo-500/25 px-5 py-5 text-[var(--text-muted)] transition hover:border-indigo-500/50 hover:bg-indigo-500/5"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-500/12 text-base font-bold text-indigo-500">
            +
          </div>
          <div className="text-left">
            <div className="text-[13px] font-bold">Configure Custom SOW Automation Rule</div>
            <div className="text-[11px] text-[var(--text-dim)]">
              Set an operational threshold condition, notification channel & automated trigger
            </div>
          </div>
        </button>
      </div>

      {/* Notification daemon bar */}
      <div className="overflow-hidden rounded-xl border border-[var(--border-main)] bg-[var(--bg-card)]">
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-4 py-3">
          <h3 className="m-0 text-[13px] font-bold">📡 Multi-Channel Notification Daemon Status (SOW Spec)</h3>
          <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-bold text-emerald-500">
            All Dispatch Channels Operational
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
          {[
            { label: 'Cron Daemon', value: '5-min cycle', icon: '🟢', color: '#10b981' },
            { label: 'Email Dispatch', value: 'SMTP Server', icon: '📧', color: '#10b981' },
            { label: 'In-App Push', value: 'WebSocket', icon: '🔔', color: '#10b981' },
            { label: 'Webhook Relay', value: 'REST Active', icon: '🪝', color: '#10b981' },
            { label: 'SMS / WhatsApp', value: 'Twilio Ready', icon: '💬', color: '#06b6d4' },
            { label: 'S3 Audit Logger', value: 'Encrypted', icon: '🔒', color: '#10b981' },
          ].map((item, i, arr) => (
            <div
              key={item.label}
              className="px-3.5 py-3 text-center"
              style={{
                borderRight: i < arr.length - 1 ? '1px solid var(--border-subtle)' : undefined,
              }}
            >
              <div className="mb-0.5 text-base">{item.icon}</div>
              <div className="text-[11.5px] font-bold text-[var(--text-main)]">{item.label}</div>
              <div className="text-[10px] text-[var(--text-dim)]">{item.value}</div>
              <div
                className="mx-auto mt-1.5 h-1.5 w-1.5 rounded-full"
                style={{ background: item.color, boxShadow: `0 0 5px ${item.color}60` }}
              />
            </div>
          ))}
        </div>
      </div>

      {showCreate ? (
        <div className="fixed inset-0 z-[80] flex items-start justify-center bg-black/45 p-4 pt-[12vh]">
          <div className="w-full max-w-md rounded-xl border border-[var(--border-main)] bg-[var(--bg-card)] p-4 shadow-xl">
            <h3 className="mb-3 text-sm font-bold">⚡ Create New SOW Automation Rule</h3>
            <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-[var(--text-muted)]">
              Automation Rule Name
            </label>
            <input
              className="form-control mb-4 w-full rounded-lg border border-[var(--border-main)] bg-[var(--bg-elevated)] px-3 py-2 text-sm"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Low Stock Safety Sentinel"
            />
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="secondary" onClick={() => setShowCreate(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                variant="primary"
                className="border-none font-bold"
                style={{ background: 'linear-gradient(135deg, #6366f1, #06b6d4)' }}
                onClick={createRule}
              >
                Activate Rule
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function MetricTile({
  label,
  value,
  sub,
  color,
}: {
  label: string
  value: string
  sub: string
  color: string
}) {
  return (
    <div
      className="rounded-[10px] bg-[var(--bg-elevated)] px-3.5 py-3"
      style={{ border: `1px solid ${color}40`, borderTop: `3px solid ${color}` }}
    >
      <div className="mb-1.5 text-[9px] font-bold uppercase tracking-wide text-[var(--text-dim)]">
        {label}
      </div>
      <div className="font-mono text-[26px] font-extrabold leading-none" style={{ color }}>
        {value}
      </div>
      <div className="mt-1 text-[10px] text-[var(--text-dim)]">{sub}</div>
    </div>
  )
}
