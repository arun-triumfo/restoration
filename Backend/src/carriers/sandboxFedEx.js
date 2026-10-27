/**
 * Sandbox FedEx-style carrier adapter.
 * Swap for real FedEx REST when credentials are ready — same interface.
 */

function money(n, currency = 'USD') {
  return { amount: Math.round(n * 100) / 100, currency }
}

export const sandboxFedEx = {
  code: 'FEDEX',
  label: 'FedEx (sandbox)',

  async getRates({ weightKg = 5, fromZip = '221001', toZip = '08817', service }) {
    const base = 12 + Number(weightKg) * 1.8
    const zones = Math.abs(Number(String(toZip).slice(0, 3) || 88) - Number(String(fromZip).slice(0, 3) || 221))
    const zoneFactor = 1 + Math.min(zones, 400) / 800
    const rates = [
      {
        service: 'FEDEX_GROUND',
        name: 'FedEx Ground',
        days: 5,
        ...money(base * zoneFactor),
      },
      {
        service: 'FEDEX_2_DAY',
        name: 'FedEx 2Day',
        days: 2,
        ...money(base * zoneFactor * 1.85),
      },
      {
        service: 'FEDEX_OVERNIGHT',
        name: 'FedEx Priority Overnight',
        days: 1,
        ...money(base * zoneFactor * 3.1),
      },
    ]
    if (service) return rates.filter((r) => r.service === service)
    return rates
  },

  async buyLabel({
    service = 'FEDEX_GROUND',
    weightKg = 5,
    fromZip = '221001',
    toZip = '08817',
    orderId,
    reference,
  }) {
    const rates = await this.getRates({ weightKg, fromZip, toZip, service })
    const rate = rates[0] || {
      service,
      name: service,
      days: 5,
      ...money(25),
    }
    const awb = `FX${Date.now().toString().slice(-10)}`
    const labelHtml = `<!DOCTYPE html><html><body style="font-family:monospace;padding:24px">
<h1>FedEx Sandbox Label</h1>
<p><strong>AWB:</strong> ${awb}</p>
<p><strong>Service:</strong> ${rate.name}</p>
<p><strong>Order:</strong> ${orderId || reference || '—'}</p>
<p><strong>From ZIP:</strong> ${fromZip} → <strong>To ZIP:</strong> ${toZip}</p>
<p><strong>Weight:</strong> ${weightKg} kg</p>
<p><strong>Charge:</strong> ${rate.currency} ${rate.amount}</p>
<svg width="220" height="60"><rect width="220" height="60" fill="#000"/><text x="20" y="38" fill="#fff" font-size="18">${awb}</text></svg>
<p style="color:#666;font-size:12px">Sandbox only — not a real carrier label</p>
</body></html>`

    return {
      awb,
      carrier: 'FEDEX',
      service: rate.service,
      serviceName: rate.name,
      amount: rate.amount,
      currency: rate.currency,
      etaDays: rate.days,
      labelHtml,
      labelMime: 'text/html',
      trackingUrl: `https://www.fedex.com/fedextrack/?trknbr=${awb}`,
      status: 'Label Created',
      events: [
        {
          at: new Date().toISOString(),
          code: 'LABEL',
          description: 'Shipping label created (sandbox)',
        },
      ],
    }
  },

  async track(awb) {
    const created = new Date(Date.now() - 36 * 3600 * 1000)
    const events = [
      { at: created.toISOString(), code: 'LABEL', description: 'Label created' },
      {
        at: new Date(created.getTime() + 6 * 3600 * 1000).toISOString(),
        code: 'PICKED_UP',
        description: 'Picked up at origin facility',
      },
      {
        at: new Date(created.getTime() + 20 * 3600 * 1000).toISOString(),
        code: 'IN_TRANSIT',
        description: 'In transit to destination hub',
      },
    ]
    return {
      awb,
      carrier: 'FEDEX',
      status: 'In Transit',
      events,
      trackingUrl: `https://www.fedex.com/fedextrack/?trknbr=${awb}`,
    }
  },
}

export const CARRIERS = {
  FEDEX: sandboxFedEx,
  DHL: {
    ...sandboxFedEx,
    code: 'DHL',
    label: 'DHL Express (sandbox)',
    async buyLabel(opts) {
      const result = await sandboxFedEx.buyLabel(opts)
      const awb = `JD${Date.now().toString().slice(-10)}`
      return {
        ...result,
        awb,
        carrier: 'DHL',
        trackingUrl: `https://www.dhl.com/en/express/tracking.html?AWB=${awb}`,
        labelHtml: result.labelHtml.replace(/FedEx/g, 'DHL').replace(/FX\d+/, awb),
      }
    },
    async track(awb) {
      const t = await sandboxFedEx.track(awb)
      return { ...t, carrier: 'DHL', awb, trackingUrl: `https://www.dhl.com/en/express/tracking.html?AWB=${awb}` }
    },
  },
}

/** Sandbox clone of the FedEx adapter with its own services, AWB prefix and tracking link */
function sandboxCourier({ code, label, prefix, services, trackingUrl }) {
  return {
    code,
    label: `${label} (sandbox)`,
    async getRates(opts) {
      const [ground] = await sandboxFedEx.getRates({ ...opts, service: 'FEDEX_GROUND' })
      const rates = services.map((s) => ({
        service: s.service,
        name: s.name,
        days: s.days,
        ...money(ground.amount * s.factor),
      }))
      return opts?.service ? rates.filter((r) => r.service === opts.service) : rates
    },
    async buyLabel(opts) {
      const svc = services.find((s) => s.service === opts.service) || services[0]
      const result = await sandboxFedEx.buyLabel({ ...opts, service: 'FEDEX_GROUND' })
      const [rate] = await this.getRates({ ...opts, service: svc.service })
      const awb = `${prefix}${Date.now().toString().slice(-10)}`
      return {
        ...result,
        awb,
        carrier: code,
        service: svc.service,
        serviceName: svc.name,
        amount: rate.amount,
        etaDays: svc.days,
        trackingUrl: trackingUrl(awb),
        labelHtml: result.labelHtml
          .replace(/FedEx Sandbox Label/, `${label} Sandbox Label`)
          .replace(/FX\d+/g, awb)
          .replace(/FedEx Ground/, svc.name),
      }
    },
    async track(awb) {
      const t = await sandboxFedEx.track(awb)
      return { ...t, carrier: code, awb, trackingUrl: trackingUrl(awb) }
    },
  }
}

CARRIERS.SHIPROCKET = sandboxCourier({
  code: 'SHIPROCKET',
  label: 'Shiprocket',
  prefix: 'SR',
  services: [
    { service: 'SR_SURFACE', name: 'Shiprocket Surface', days: 6, factor: 0.7 },
    { service: 'SR_AIR', name: 'Shiprocket Air', days: 3, factor: 1.1 },
    { service: 'SR_X_INTL', name: 'Shiprocket X International', days: 7, factor: 1.6 },
  ],
  trackingUrl: (awb) => `https://shiprocket.co/tracking/${awb}`,
})

CARRIERS.ARAMEX = sandboxCourier({
  code: 'ARAMEX',
  label: 'Aramex',
  prefix: 'AX',
  services: [
    { service: 'ARAMEX_PPX', name: 'Aramex Priority Parcel Express', days: 4, factor: 1.4 },
    { service: 'ARAMEX_EPX', name: 'Aramex Economy Parcel Express', days: 8, factor: 0.95 },
  ],
  trackingUrl: (awb) => `https://www.aramex.com/track/results?ShipmentNumber=${awb}`,
})

CARRIERS.SHIPGLOBAL = sandboxCourier({
  code: 'SHIPGLOBAL',
  label: 'ShipGlobal',
  prefix: 'SG',
  services: [
    { service: 'SG_DIRECT', name: 'ShipGlobal Direct', days: 9, factor: 0.85 },
    { service: 'SG_PREMIUM', name: 'ShipGlobal Premium', days: 5, factor: 1.25 },
  ],
  trackingUrl: (awb) => `https://shipglobal.in/tracking?awb=${awb}`,
})

export function getCarrier(code = 'FEDEX') {
  return CARRIERS[String(code).toUpperCase()] || CARRIERS.FEDEX
}
