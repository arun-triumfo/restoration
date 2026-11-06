import {
  ArrowRight,
  Boxes,
  Building2,
  Check,
  Factory,
  FileText,
  Menu,
  PieChart,
  ShoppingCart,
  Store,
  Warehouse,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api, ApiError, type SaasPlanDto } from '../api/client'
import { DEMO_PASSWORD } from '../auth/roles'
import { Modal } from '../components/ui/Modal'
import { useAuth } from '../context/AuthContext'

const FEATURES = [
  {
    icon: ShoppingCart,
    title: 'Multichannel Orders',
    text: 'Manage Amazon, Etsy, Shopify, Walmart and direct B2B orders in one place.',
  },
  {
    icon: Boxes,
    title: 'Multi-Warehouse Inventory',
    text: 'Track India and USA stock with rack / bin locations for pick & dispatch.',
  },
  {
    icon: Factory,
    title: 'Purchasing & MTO',
    text: 'Buy sheet, POs, mill stages Queued → Weaving → QC → Ready.',
  },
  {
    icon: Warehouse,
    title: 'Warehouse & Shipping',
    text: 'Pack, weigh, live courier rates, labels and tracking India → customer / US.',
  },
  {
    icon: PieChart,
    title: 'Landed Cost & Profitability',
    text: 'Freight, returns P&L, courier audit and monthly profitability.',
  },
  {
    icon: FileText,
    title: 'Export Docs & Ops',
    text: 'Export documents, receivables and role-locked India / US / Finance workspaces.',
  },
]

const PERSONAS = [
  {
    title: 'RugOS Seller',
    text: 'USA inventory, sales channels, fulfillment and profitability.',
    icon: Store,
  },
  {
    title: 'RugOS Importer',
    text: 'Seller features plus purchasing, international shipments and landed costs.',
    icon: Building2,
  },
  {
    title: 'RugOS Manufacturer',
    text: 'Indian production, MTO mill flow, export documentation.',
    icon: Factory,
  },
]

const FLOW_STEPS = [
  {
    title: 'Inventory: USA → India → Make',
    text: 'Allocate USA stock, India stock or made-to-order — by destination and deadline.',
  },
  {
    title: 'QC · Pick · Pack · Weigh · Label',
    text: 'Pick from rack/bin, pack, capture weight and dimensions, print labels.',
  },
  {
    title: 'Ship · Track · Reconcile',
    text: 'Ship, track delivery, lock costs & profit. Courier bills and returns reconcile later.',
  },
]

const BUSINESS_TYPES = [
  'Seller',
  'Importer',
  'Manufacturer',
  'Importer & Seller',
  'Manufacturer & Exporter',
  'Other',
]

function formatUsd(n: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(Number(n || 0))
}

function loadRazorpay() {
  return new Promise<void>((resolve, reject) => {
    if (document.querySelector('script[src*="checkout.razorpay.com"]')) return resolve()
    const s = document.createElement('script')
    s.src = 'https://checkout.razorpay.com/v1/checkout.js'
    s.onload = () => resolve()
    s.onerror = () => reject(new Error('Could not load Razorpay checkout'))
    document.body.appendChild(s)
  })
}

export function Landing() {
  const { user, loading, login, isPlatformOwner } = useAuth()
  const navigate = useNavigate()
  const [plans, setPlans] = useState<SaasPlanDto[]>([])
  const [cycle, setCycle] = useState<'monthly' | 'yearly'>('monthly')
  const [buyOpen, setBuyOpen] = useState<SaasPlanDto | null>(null)
  const [form, setForm] = useState({ companyName: '', contactName: '', email: '', phone: '' })
  const [submitted, setSubmitted] = useState(false)
  const [paidRef, setPaidRef] = useState('')
  const [buyBusy, setBuyBusy] = useState(false)
  const [buyError, setBuyError] = useState('')
  const [navOpen, setNavOpen] = useState(false)
  const [demoForm, setDemoForm] = useState({
    companyName: '',
    email: '',
    country: '',
    businessType: '',
    phone: '',
    message: '',
  })
  const [demoSubmitted, setDemoSubmitted] = useState(false)
  const [demoError, setDemoError] = useState('')
  const [demoLoading, setDemoLoading] = useState(false)
  const [loginBusy, setLoginBusy] = useState(false)
  const [loginError, setLoginError] = useState('')

  useEffect(() => {
    api.platform
      .listPlans()
      .then((res) => setPlans(res.data || []))
      .catch(() => setPlans([]))
  }, [])

  useEffect(() => {
    if (!loading && user) {
      navigate(isPlatformOwner ? '/saas' : '/dashboard', { replace: true })
    }
  }, [loading, user, isPlatformOwner, navigate])

  const activePlans = useMemo(() => plans.filter((p) => p.active !== false), [plans])

  const submitBuy = async () => {
    if (!buyOpen || !form.companyName || !form.contactName || !form.email) return
    setBuyBusy(true)
    setBuyError('')
    try {
      const order = await api.platform.checkout({
        ...form,
        planId: buyOpen.id,
        billingCycle: cycle,
      })
      await loadRazorpay()
      const Razorpay = (
        window as unknown as {
          Razorpay: new (opts: object) => { open: () => void }
        }
      ).Razorpay
      const priceLabel = formatUsd(order.displayAmount)
      const chargeNote =
        order.chargedCurrency === 'USD'
          ? priceLabel
          : `${priceLabel} (charged ${order.chargedCurrency} ${order.chargedAmount} on this Razorpay account)`
      const rzp = new Razorpay({
        key: order.keyId,
        order_id: order.orderId,
        amount: order.amount,
        currency: order.currency,
        name: 'RugOS',
        description: `${buyOpen.name} · ${cycle} · ${chargeNote}`,
        prefill: {
          name: form.contactName,
          email: form.email,
          contact: form.phone,
        },
        theme: { color: '#0e7490' },
        handler: async (response: {
          razorpay_order_id: string
          razorpay_payment_id: string
          razorpay_signature: string
        }) => {
          try {
            const verified = await api.platform.verifyCheckout({
              tenantId: order.tenantId,
              ...response,
            })
            setPaidRef(verified.paymentId)
            setSubmitted(true)
          } catch (err) {
            setBuyError(err instanceof ApiError ? err.message : 'Payment verification failed')
          } finally {
            setBuyBusy(false)
          }
        },
        modal: {
          ondismiss: () => setBuyBusy(false),
        },
      })
      rzp.open()
    } catch (err) {
      setBuyError(err instanceof ApiError ? err.message : 'Could not start Razorpay checkout')
      setBuyBusy(false)
    }
  }

  const submitDemo = async (e: React.FormEvent) => {
    e.preventDefault()
    setDemoError('')
    setDemoLoading(true)
    try {
      await api.platform.requestDemo({
        ...demoForm,
        contactName: demoForm.companyName,
      })
      setDemoSubmitted(true)
      setDemoForm({
        companyName: '',
        email: '',
        country: '',
        businessType: '',
        phone: '',
        message: '',
      })
    } catch (err) {
      setDemoError(err instanceof ApiError ? err.message : 'Could not submit demo request')
    } finally {
      setDemoLoading(false)
    }
  }

  const launchOps = async () => {
    setLoginError('')
    setLoginBusy(true)
    try {
      const res = await login('india@restoration.com', DEMO_PASSWORD)
      if (res.isPlatformOwner) {
        navigate('/saas', { replace: true })
        return
      }
      navigate(res.redirectTo || '/dashboard', { replace: true })
    } catch (err) {
      setLoginError(err instanceof ApiError ? err.message : 'Could not launch demo')
    } finally {
      setLoginBusy(false)
    }
  }

  return (
    <div className="landing-root rugos-public">
      <header className="sticky top-0 z-20 border-b border-[#d5dde6]/80 bg-white/80 pt-[env(safe-area-inset-top)] backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-3 py-3 sm:px-6">
          <div className="min-w-0">
            <p className="landing-display text-lg font-semibold text-[#0f2744] sm:text-xl">RugOS</p>
            <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[#0e7490] sm:text-[10px] sm:tracking-[0.2em]">
              ExportOS Platform
            </p>
          </div>
          <nav className="hidden items-center gap-6 text-sm font-medium text-[#5b6b7c] md:flex">
            <a href="#product" className="hover:text-[#0f2744]">
              Product
            </a>
            <a href="#demo" className="hover:text-[#0f2744]">
              Book a Demo
            </a>
            <a href="#pricing" className="hover:text-[#0f2744]">
              Pricing
            </a>
            <a href="#view-demo" className="hover:text-[#0f2744]">
              View Product Demo
            </a>
          </nav>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Link
              to="/login/company"
              className="hidden rounded-lg px-2.5 py-1.5 text-sm font-medium text-[#0f2744] hover:bg-[#0f2744]/5 sm:inline-block sm:px-3"
            >
              Company
            </Link>
            <Link
              to="/login/owner"
              className="hidden rounded-lg px-2.5 py-1.5 text-sm font-medium text-[#0f2744] hover:bg-[#0f2744]/5 sm:inline-block sm:px-3"
            >
              Owner
            </Link>
            <Link
              to="/login"
              className="rounded-lg px-2.5 py-1.5 text-sm font-medium text-[#0f2744] hover:bg-[#0f2744]/5 sm:px-3"
            >
              Sign in
            </Link>
            <a
              href="#demo"
              className="hidden items-center gap-1 rounded-lg bg-[#0e7490] px-3 py-1.5 text-sm font-semibold text-white shadow-sm shadow-teal-900/10 hover:bg-[#0f5f6e] sm:inline-flex"
            >
              Book a Demo <ArrowRight size={14} />
            </a>
            <button
              type="button"
              className="rounded-lg p-2 text-[#0f2744] hover:bg-[#0f2744]/5 md:hidden"
              onClick={() => setNavOpen((v) => !v)}
              aria-label={navOpen ? 'Close menu' : 'Open menu'}
            >
              {navOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
        {navOpen ? (
          <nav className="border-t border-[#d5dde6] bg-white px-4 py-3 md:hidden">
            <ul className="space-y-1 text-sm font-medium text-[#0f2744]">
              {[
                { href: '#product', label: 'Product' },
                { href: '#demo', label: 'Book a Demo' },
                { href: '#pricing', label: 'Pricing' },
                { href: '#view-demo', label: 'View Product Demo' },
              ].map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    className="block rounded-lg px-3 py-2.5 hover:bg-[#e8f4f8]"
                    onClick={() => setNavOpen(false)}
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        ) : null}
      </header>

      <section className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0 opacity-70"
          style={{
            backgroundImage:
              'linear-gradient(rgba(15,39,68,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(15,39,68,0.04) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
            maskImage: 'linear-gradient(180deg, black 40%, transparent 95%)',
          }}
        />
        <div className="relative mx-auto max-w-6xl px-4 pb-16 pt-14 sm:px-6 sm:pt-20 lg:pb-24 lg:pt-24">
          <div className="max-w-3xl">
            <p className="landing-fade-up text-xs font-semibold uppercase tracking-[0.22em] text-[#0e7490]">
              Software for Rug Importers, Sellers & Manufacturers
            </p>
            <h1 className="landing-display landing-fade-up-delay mt-4 text-[2rem] font-semibold leading-[1.08] text-[#0f2744] sm:text-5xl lg:text-6xl">
              RugOS / ExportOS
            </h1>
            <p className="landing-fade-up-delay-2 mt-5 max-w-xl text-base leading-relaxed text-[#5b6b7c] sm:text-lg">
              Built for India → USA rug operations. Connect Indian suppliers, USA warehouses and your
              sales channels — subscribe monthly or yearly and run your company workspace.
            </p>
            <div className="landing-fade-up-delay-2 mt-8 flex w-full flex-col gap-2.5 sm:mt-9 sm:w-auto sm:flex-row sm:flex-wrap sm:gap-3">
              <a
                href="#pricing"
                className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#0f2744] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-[#0f2744]/20 hover:bg-[#173658] sm:w-auto"
              >
                View pricing <ArrowRight size={16} />
              </a>
              <a
                href="#demo"
                className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#d5dde6] bg-white/80 px-5 py-3 text-sm font-semibold text-[#0f2744] hover:border-[#0e7490] sm:w-auto"
              >
                Book a demo
              </a>
            </div>
          </div>
          <div className="landing-float mt-14 max-w-xl rounded-2xl border border-white/70 bg-white/70 p-5 shadow-[0_20px_50px_-24px_rgba(15,39,68,0.35)] backdrop-blur-sm sm:p-6 lg:absolute lg:right-6 lg:top-24 lg:mt-0 lg:w-[min(100%,22rem)]">
            <p className="text-xs font-bold uppercase tracking-wider text-[#0e7490]">Ops flow</p>
            <ul className="mt-3 space-y-3">
              {FLOW_STEPS.map((s, i) => (
                <li key={s.title} className="flex gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#e8f4f8] text-xs font-bold text-[#0e7490]">
                    {i + 1}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-[#0f2744]">{s.title}</p>
                    <p className="text-xs text-[#5b6b7c]">{s.text}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section id="product" className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <h2 className="landing-display text-3xl font-semibold text-[#0f2744] sm:text-4xl">
          What the product does
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-[#5b6b7c]">
          One SaaS workspace per company — India WH, US WH and Finance roles under your subscription.
        </p>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => {
            const Icon = f.icon
            return (
              <article
                key={f.title}
                className="rounded-2xl border border-[#d5dde6] bg-white/70 p-5 shadow-sm"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e8f4f8] text-[#0e7490]">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-3 text-base font-bold text-[#0f2744]">{f.title}</h3>
                <p className="mt-1 text-sm text-[#5b6b7c]">{f.text}</p>
              </article>
            )
          })}
        </div>
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {PERSONAS.map((p) => {
            const Icon = p.icon
            return (
              <div key={p.title} className="rounded-2xl border border-[#d5dde6] bg-[#f7f4ef]/80 p-5">
                <Icon className="h-6 w-6 text-[#0e7490]" />
                <h3 className="landing-display mt-2 text-xl font-semibold text-[#0f2744]">{p.title}</h3>
                <p className="mt-1 text-sm text-[#5b6b7c]">{p.text}</p>
              </div>
            )
          })}
        </div>
      </section>

      <section id="demo" className="border-y border-[#d5dde6]/80 bg-white/50 py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="landing-display text-3xl font-semibold text-[#0f2744] sm:text-4xl">
            Book a Personalized Demo
          </h2>
          <p className="mt-2 text-sm text-[#5b6b7c]">
            Tell us your company — the platform owner will contact you.
          </p>
          {demoSubmitted ? (
            <div className="mt-8 max-w-lg rounded-2xl border border-teal-200 bg-teal-50 p-6">
              <p className="landing-display text-2xl font-semibold text-teal-700">Request received</p>
              <p className="mt-2 text-sm text-teal-900/80">We will reach out on your work email.</p>
            </div>
          ) : (
            <form onSubmit={submitDemo} className="mt-8 grid max-w-2xl gap-3 sm:grid-cols-2">
              <label className="block text-xs font-semibold text-[#0f2744]">
                Company name
                <input
                  required
                  className="landing-input mt-1"
                  value={demoForm.companyName}
                  onChange={(e) => setDemoForm((f) => ({ ...f, companyName: e.target.value }))}
                />
              </label>
              <label className="block text-xs font-semibold text-[#0f2744]">
                Work email
                <input
                  required
                  type="email"
                  className="landing-input mt-1"
                  value={demoForm.email}
                  onChange={(e) => setDemoForm((f) => ({ ...f, email: e.target.value }))}
                />
              </label>
              <label className="block text-xs font-semibold text-[#0f2744]">
                Country
                <input
                  className="landing-input mt-1"
                  value={demoForm.country}
                  onChange={(e) => setDemoForm((f) => ({ ...f, country: e.target.value }))}
                />
              </label>
              <label className="block text-xs font-semibold text-[#0f2744]">
                Business type
                <select
                  className="landing-input mt-1"
                  value={demoForm.businessType}
                  onChange={(e) => setDemoForm((f) => ({ ...f, businessType: e.target.value }))}
                >
                  <option value="">Select…</option>
                  {BUSINESS_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-xs font-semibold text-[#0f2744]">
                Phone
                <input
                  className="landing-input mt-1"
                  value={demoForm.phone}
                  onChange={(e) => setDemoForm((f) => ({ ...f, phone: e.target.value }))}
                />
              </label>
              <label className="block text-xs font-semibold text-[#0f2744] sm:col-span-2">
                Message
                <textarea
                  rows={3}
                  className="landing-input mt-1"
                  value={demoForm.message}
                  onChange={(e) => setDemoForm((f) => ({ ...f, message: e.target.value }))}
                />
              </label>
              {demoError ? <p className="text-sm text-red-600 sm:col-span-2">{demoError}</p> : null}
              <button
                type="submit"
                disabled={demoLoading}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0e7490] px-5 py-3 text-sm font-semibold text-white hover:bg-[#0f5f6e] disabled:opacity-60 sm:col-span-2 sm:w-fit"
              >
                {demoLoading ? 'Sending…' : 'Submit demo request'}
              </button>
            </form>
          )}
        </div>
      </section>

      <section id="pricing" className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="landing-display text-3xl font-semibold text-[#0f2744] sm:text-4xl">
              Pricing
            </h2>
            <p className="mt-2 text-sm text-[#5b6b7c]">
              Monthly or yearly. After purchase, the platform owner activates your company login.
            </p>
          </div>
          <div className="inline-flex rounded-xl border border-[#d5dde6] bg-white p-1 text-sm font-semibold">
            <button
              type="button"
              className={`rounded-lg px-3 py-1.5 ${cycle === 'monthly' ? 'bg-[#0f2744] text-white' : 'text-[#5b6b7c]'}`}
              onClick={() => setCycle('monthly')}
            >
              Monthly
            </button>
            <button
              type="button"
              className={`rounded-lg px-3 py-1.5 ${cycle === 'yearly' ? 'bg-[#0f2744] text-white' : 'text-[#5b6b7c]'}`}
              onClick={() => setCycle('yearly')}
            >
              Yearly
            </button>
          </div>
        </div>
        <div className="mt-10 grid gap-4 lg:grid-cols-3">
          {activePlans.map((plan) => {
            const price = cycle === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice
            return (
              <article
                key={plan.id}
                className={`relative flex flex-col rounded-2xl border bg-white/80 p-6 shadow-sm ${
                  plan.popular ? 'border-[#0e7490] ring-2 ring-[#0e7490]/20' : 'border-[#d5dde6]'
                }`}
              >
                {plan.popular ? (
                  <span className="absolute -top-3 right-4 rounded-full bg-[#0e7490] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                    Popular
                  </span>
                ) : null}
                <h3 className="landing-display text-2xl font-semibold text-[#0f2744]">{plan.name}</h3>
                <p className="mt-1 text-sm text-[#5b6b7c]">{plan.description}</p>
                <p className="mt-4">
                  <span className="landing-display text-3xl font-semibold tabular-nums text-[#0f2744]">
                    {formatUsd(price)}
                  </span>
                  <span className="text-sm text-[#5b6b7c]">
                    /{cycle === 'yearly' ? 'year' : 'month'}
                  </span>
                </p>
                <ul className="mt-5 flex-1 space-y-2">
                  {(plan.features || []).map((f) => (
                    <li key={f} className="flex gap-2 text-sm text-[#0f2744]">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#0e7490]" />
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={() => {
                    setBuyOpen(plan)
                    setSubmitted(false)
                    setPaidRef('')
                    setBuyError('')
                    setForm({ companyName: '', contactName: '', email: '', phone: '' })
                  }}
                  className="mt-6 w-full rounded-xl bg-[#0f2744] py-2.5 text-sm font-semibold text-white hover:bg-[#173658]"
                >
                  Subscribe {cycle}
                </button>
              </article>
            )
          })}
        </div>
      </section>

      <section id="view-demo" className="border-t border-[#d5dde6] bg-[#0f2744] py-14 text-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <h2 className="landing-display text-2xl font-semibold sm:text-3xl">View product demo</h2>
            <p className="mt-2 max-w-xl text-sm text-slate-300">
              Company ops (India WH → Orders, Inventory, MTO, Shipping) or Platform Owner SaaS
              console — separate logins.
            </p>
            {loginError ? <p className="mt-2 text-sm text-red-300">{loginError}</p> : null}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <button
              type="button"
              disabled={loginBusy}
              onClick={() => void launchOps()}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0e7490] px-5 py-3 text-sm font-semibold text-white hover:bg-teal-600 disabled:opacity-60"
            >
              {loginBusy ? 'Opening…' : 'Open company ops'} <ArrowRight size={16} />
            </button>
            <Link
              to="/login/owner"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/30 px-5 py-3 text-sm font-semibold text-white hover:bg-white/10"
            >
              Owner SaaS login
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-[#d5dde6]/80 py-8 text-center text-xs text-[#5b6b7c]">
        RugOS / ExportOS · Subscription SaaS ·{' '}
        <Link to="/login/company" className="font-semibold text-[#0e7490] hover:underline">
          Company sign-in
        </Link>
        {' · '}
        <Link to="/login/owner" className="font-semibold text-indigo-700 hover:underline">
          Owner (SaaS)
        </Link>
      </footer>

      <Modal
        open={!!buyOpen}
        title={buyOpen ? `Subscribe · ${buyOpen.name}` : 'Subscribe'}
        badge={cycle}
        onClose={() => setBuyOpen(null)}
        footer={
          submitted ? (
            <button
              type="button"
              className="rounded-lg bg-[#0f2744] px-4 py-2 text-sm font-semibold text-white"
              onClick={() => setBuyOpen(null)}
            >
              Close
            </button>
          ) : (
            <>
              <button
                type="button"
                className="rounded-lg border border-[var(--border-main)] px-4 py-2 text-sm font-semibold"
                onClick={() => setBuyOpen(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={buyBusy}
                className="rounded-lg bg-[#0e7490] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                onClick={() => void submitBuy()}
              >
                {buyBusy ? 'Opening Razorpay…' : 'Pay with Razorpay'}
              </button>
            </>
          )
        }
      >
        {submitted ? (
          <div className="space-y-2 text-sm">
            <p className="font-bold text-emerald-700">Payment received</p>
            <p className="text-[var(--text-muted)]">
              Razorpay reference <strong className="font-mono">{paidRef || 'confirmed'}</strong>.
              Status: <strong>Pending Approval</strong>. Platform owner will activate your company
              and share login. Validity starts on activation ({cycle}).
            </p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            <p className="text-sm text-[var(--text-muted)] sm:col-span-2">
              {buyOpen?.name} · {formatUsd(cycle === 'yearly' ? buyOpen?.yearlyPrice || 0 : buyOpen?.monthlyPrice || 0)}{' '}
              / {cycle === 'yearly' ? 'year' : 'month'} · Razorpay test mode
            </p>
            <p className="text-[11px] text-[var(--text-dim)] sm:col-span-2">
              Test card 5267 3181 8797 5449 · any future expiry · any CVV. No real charge.
            </p>
            {(
              [
                ['Company name', 'companyName'],
                ['Contact name', 'contactName'],
                ['Work email', 'email'],
                ['Phone', 'phone'],
              ] as const
            ).map(([label, key]) => (
              <label key={key} className="block text-xs font-semibold">
                {label}
                <input
                  required={key !== 'phone'}
                  type={key === 'email' ? 'email' : 'text'}
                  className="mt-1 h-10 w-full rounded-lg border border-[var(--border-main)] bg-[var(--bg-elevated)] px-3 text-sm"
                  value={form[key]}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                />
              </label>
            ))}
            {buyError ? <p className="text-sm text-red-600 sm:col-span-2">{buyError}</p> : null}
          </div>
        )}
      </Modal>
    </div>
  )
}
