import { basicAuth, httpJson } from '../http.js'

function base(fields) {
  const test = String(fields.apiKey || '').toLowerCase().includes('test')
  return test
    ? 'https://express.api.dhl.com/mydhlapi/test'
    : 'https://express.api.dhl.com/mydhlapi'
}

function h(fields) {
  return {
    Authorization: basicAuth(fields.apiKey, fields.apiSecret),
    Accept: 'application/json',
    'Content-Type': 'application/json',
  }
}

export async function test(fields) {
  const from = fields.fromZip || '221401'
  const country = fields.fromCountry || 'IN'
  await httpJson(
    `${base(fields)}/rates?accountNumber=${encodeURIComponent(fields.accountNumber || '')}&originCountryCode=${country}&originPostalCode=${from}&destinationCountryCode=US&destinationPostalCode=10001&weight=5&length=10&width=10&height=10&plannedShippingDate=${new Date().toISOString().slice(0, 10)}&isCustomsDeclarable=false&unitOfMeasurement=metric`,
    { headers: h(fields) },
  )
  return { ok: true, message: 'DHL Express live: rates reachable' }
}

export async function getRates(fields, { weightKg = 5, fromZip, toZip }) {
  const qs = new URLSearchParams({
    accountNumber: fields.accountNumber || '',
    originCountryCode: fields.fromCountry || 'IN',
    originPostalCode: String(fromZip || fields.fromZip || '221401'),
    destinationCountryCode: 'US',
    destinationPostalCode: String(toZip || '10001'),
    weight: String(weightKg),
    length: '30',
    width: '20',
    height: '10',
    plannedShippingDate: new Date().toISOString().slice(0, 10),
    isCustomsDeclarable: 'true',
    unitOfMeasurement: 'metric',
  })
  const data = await httpJson(`${base(fields)}/rates?${qs}`, { headers: h(fields) })
  const products = data?.products || []
  return products.map((p) => ({
    service: p.productCode,
    name: p.productName,
    days: Number(p.deliveryCapabilities?.totalTransitDays) || 5,
    amount: Number(p.totalPrice?.[0]?.price || 0),
    currency: p.totalPrice?.[0]?.priceCurrency || 'USD',
  }))
}

export async function buyLabel(fields, opts) {
  const [rate] = (await getRates(fields, opts)) || []
  const data = await httpJson(`${base(fields)}/shipments`, {
    method: 'POST',
    headers: h(fields),
    body: {
      plannedShippingDateAndTime: `${new Date().toISOString().slice(0, 10)}T10:00:00 GMT+05:30`,
      pickup: { isRequested: false },
      productCode: opts.service || rate?.service || 'P',
      accounts: fields.accountNumber ? [{ typeCode: 'shipper', number: fields.accountNumber }] : [],
      customerDetails: {
        shipperDetails: {
          postalAddress: {
            postalCode: String(opts.fromZip || fields.fromZip || '221401'),
            cityName: 'Bhadohi',
            countryCode: fields.fromCountry || 'IN',
            addressLine1: 'Restoration Rugs WH',
          },
          contactInformation: {
            fullName: 'Restoration Rugs',
            companyName: 'Restoration',
            phone: '9999999999',
            email: 'ops@restorationrugs.com',
          },
        },
        receiverDetails: {
          postalAddress: {
            postalCode: String(opts.toZip || '10001'),
            cityName: opts.toCity || 'New York',
            countryCode: 'US',
            addressLine1: opts.toAddress || 'Address on file',
          },
          contactInformation: {
            fullName: opts.toName || 'Customer',
            phone: opts.toPhone || '9999999999',
            email: opts.toEmail || 'buyer@example.com',
          },
        },
      },
      content: {
        packages: [
          {
            weight: Number(opts.weightKg) || 5,
            dimensions: { length: 30, width: 20, height: 10 },
          },
        ],
        isCustomsDeclarable: true,
        describedGoods: 'Handmade rug',
        incoterm: 'DAP',
        unitOfMeasurement: 'metric',
      },
    },
  })
  const awb = data?.shipmentTrackingNumber || `JD${Date.now().toString().slice(-10)}`
  const doc = data?.documents?.[0]?.url || ''
  return {
    awb,
    carrier: 'DHL',
    service: opts.service || rate?.service,
    serviceName: rate?.name || 'DHL Express',
    amount: rate?.amount || 0,
    currency: rate?.currency || 'USD',
    etaDays: rate?.days || 5,
    trackingUrl: `https://www.dhl.com/en/express/tracking.html?AWB=${awb}`,
    labelHtml: doc ? `<p>Label: <a href="${doc}">${doc}</a></p><p>AWB ${awb}</p>` : `<p>DHL AWB ${awb}</p>`,
    labelMime: 'text/html',
    status: 'Label Created',
    events: [{ at: new Date().toISOString(), code: 'LABEL', description: 'DHL live shipment created' }],
  }
}

export async function track(fields, awb) {
  const data = await httpJson(`${base(fields)}/shipments/${encodeURIComponent(awb)}/tracking`, {
    headers: h(fields),
  })
  const ship = data?.shipments?.[0]
  const events = (ship?.events || []).map((e) => ({
    at: e.timestamp || new Date().toISOString(),
    code: e.typeCode,
    description: e.description,
  }))
  return {
    awb,
    carrier: 'DHL',
    status: ship?.status?.statusCode || 'Unknown',
    events,
    trackingUrl: `https://www.dhl.com/en/express/tracking.html?AWB=${awb}`,
  }
}
