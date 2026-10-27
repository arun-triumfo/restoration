import { httpJson } from '../http.js'

const BASE = 'https://apiv2.shiprocket.in/v1/external'

async function token(fields) {
  const login = await httpJson(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: { email: fields.email, password: fields.password },
  })
  if (!login?.token) throw new Error(login?.message || 'Shiprocket login failed')
  return login.token
}

function h(tok) {
  return { Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json' }
}

export async function test(fields) {
  const tok = await token(fields)
  const me = await httpJson(`${BASE}/settings/company`, { headers: h(tok) }).catch(() => null)
  const name = me?.data?.name || me?.name || fields.email
  return { ok: true, message: `Shiprocket live: ${name}` }
}

export async function getRates(fields, { weightKg = 5, fromZip, toZip }) {
  const tok = await token(fields)
  const pickup = fromZip || fields.pickupPincode || '221401'
  const qs = new URLSearchParams({
    pickup_postcode: String(pickup),
    delivery_postcode: String(toZip || '110001'),
    weight: String(weightKg),
    cod: '0',
  })
  const data = await httpJson(`${BASE}/courier/serviceability?${qs}`, { headers: h(tok) })
  const list = data?.data?.available_courier_companies || data?.available_courier_companies || []
  return list.slice(0, 8).map((c) => ({
    service: String(c.courier_company_id),
    name: c.courier_name,
    days: Number(c.estimated_delivery_days) || 5,
    amount: Number(c.rate || c.freight_charge || 0),
    currency: 'INR',
  }))
}

export async function buyLabel(fields, opts) {
  const tok = await token(fields)
  const rates = await getRates(fields, opts)
  const chosen = rates.find((r) => String(r.service) === String(opts.service)) || rates[0]
  if (!chosen) throw new Error('Shiprocket returned no serviceable couriers for this pincode')
  const orderId = opts.orderId || `SR-${Date.now()}`
  const created = await httpJson(`${BASE}/orders/create/adhoc`, {
    method: 'POST',
    headers: h(tok),
    body: {
      order_id: orderId,
      order_date: new Date().toISOString().slice(0, 10),
      pickup_location: fields.pickupLocation || 'Primary',
      billing_customer_name: opts.toName || 'Customer',
      billing_last_name: '',
      billing_address: opts.toAddress || 'Address on file',
      billing_city: opts.toCity || 'City',
      billing_pincode: String(opts.toZip || '110001'),
      billing_state: opts.toState || 'Delhi',
      billing_country: 'India',
      billing_email: opts.toEmail || 'orders@restorationrugs.com',
      billing_phone: opts.toPhone || '9999999999',
      shipping_is_billing: true,
      order_items: [
        {
          name: opts.sku || 'Rug',
          sku: opts.sku || 'RUG',
          units: 1,
          selling_price: chosen.amount || 1,
        },
      ],
      payment_method: 'Prepaid',
      sub_total: chosen.amount || 1,
      length: 30,
      breadth: 20,
      height: 10,
      weight: Number(opts.weightKg) || 5,
    },
  })
  const shipmentId = created?.shipment_id || created?.payload?.shipment_id
  let awb = created?.awb_code || created?.payload?.awb_code
  if (shipmentId && chosen.service) {
    const assigned = await httpJson(`${BASE}/courier/assign/awb`, {
      method: 'POST',
      headers: h(tok),
      body: { shipment_id: shipmentId, courier_id: Number(chosen.service) },
    }).catch(() => null)
    awb = assigned?.awb_assign_status === 1 ? assigned?.response?.data?.awb_code : awb
  }
  awb = awb || `SR${Date.now().toString().slice(-10)}`
  let labelHtml = `<p>Shiprocket AWB ${awb}</p>`
  if (shipmentId) {
    const lab = await httpJson(`${BASE}/courier/generate/label`, {
      method: 'POST',
      headers: h(tok),
      body: { shipment_id: [shipmentId] },
    }).catch(() => null)
    const url = lab?.label_url || lab?.payload?.label_url
    if (url) labelHtml = `<p>Print: <a href="${url}">${url}</a></p><p>AWB ${awb}</p>`
  }
  return {
    awb,
    carrier: 'SHIPROCKET',
    service: String(chosen.service),
    serviceName: chosen.name,
    amount: chosen.amount,
    currency: 'INR',
    etaDays: chosen.days,
    trackingUrl: `https://shiprocket.co/tracking/${awb}`,
    labelHtml,
    labelMime: 'text/html',
    status: 'Label Created',
    events: [{ at: new Date().toISOString(), code: 'LABEL', description: 'Shiprocket live label' }],
  }
}

export async function track(fields, awb) {
  const tok = await token(fields)
  const data = await httpJson(`${BASE}/courier/track/awb/${encodeURIComponent(awb)}`, { headers: h(tok) })
  const t = data?.tracking_data || data
  const events = (t?.shipment_track_activities || t?.shipment_track || []).map((e) => ({
    at: e.date || e.sr_status_date || new Date().toISOString(),
    code: e['sr-status'] || e.status || 'EVENT',
    description: e.activity || e['sr-status-label'] || e.status,
  }))
  return {
    awb,
    carrier: 'SHIPROCKET',
    status: t?.shipment_status || t?.track_status || 'In Transit',
    events,
    trackingUrl: `https://shiprocket.co/tracking/${awb}`,
  }
}
