import { httpJson } from '../http.js'

const RATE_URL =
  'https://ws.aramex.net/ShippingAPI.V2/RateCalculator/Service_1_0.svc/json/CalculateRate'
const TRACK_URL =
  'https://ws.aramex.net/ShippingAPI.V2/Tracking/Service_1_0.svc/json/TrackShipments'

function clientInfo(fields) {
  return {
    UserName: fields.username,
    Password: fields.password,
    Version: 'v1.0',
    AccountNumber: fields.accountNumber,
    AccountPin: fields.accountPin,
    AccountEntity: fields.accountEntity || 'BOM',
    AccountCountryCode: fields.accountCountry || 'IN',
    Source: 24,
  }
}

export async function test(fields) {
  const data = await httpJson(RATE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: {
      ClientInfo: clientInfo(fields),
      OriginAddress: {
        City: 'Bhadohi',
        PostCode: '221401',
        CountryCode: fields.accountCountry || 'IN',
      },
      DestinationAddress: { City: 'Delhi', PostCode: '110001', CountryCode: 'IN' },
      ShipmentDetails: {
        PaymentType: 'P',
        ProductGroup: 'DOM',
        ProductType: 'OND',
        ActualWeight: { Value: 5, Unit: 'KG' },
        ChargeableWeight: { Value: 5, Unit: 'KG' },
        NumberOfPieces: 1,
      },
    },
  })
  if (data?.HasErrors) {
    const msg = data.Notifications?.map((n) => n.Message).join('; ') || 'Aramex rejected credentials'
    throw new Error(msg)
  }
  return { ok: true, message: `Aramex live (account ${fields.accountNumber})` }
}

export async function getRates(fields, { weightKg = 5, fromZip, toZip }) {
  const data = await httpJson(RATE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: {
      ClientInfo: clientInfo(fields),
      OriginAddress: {
        PostCode: String(fromZip || '221401'),
        CountryCode: fields.accountCountry || 'IN',
      },
      DestinationAddress: {
        PostCode: String(toZip || '110001'),
        CountryCode: 'IN',
      },
      ShipmentDetails: {
        PaymentType: 'P',
        ProductGroup: 'DOM',
        ProductType: 'OND',
        ActualWeight: { Value: Number(weightKg), Unit: 'KG' },
        ChargeableWeight: { Value: Number(weightKg), Unit: 'KG' },
        NumberOfPieces: 1,
      },
    },
  })
  if (data?.HasErrors) {
    throw new Error(data.Notifications?.map((n) => n.Message).join('; ') || 'Aramex rate failed')
  }
  const total = data?.TotalAmount || data?.RateDetails?.TotalAmount || {}
  return [
    {
      service: 'ARAMEX_OND',
      name: 'Aramex Overnight / Domestic',
      days: 2,
      amount: Number(total.Value || data?.Amount || 0),
      currency: total.CurrencyCode || 'INR',
    },
  ]
}

export async function buyLabel(fields, opts) {
  const [rate] = await getRates(fields, opts)
  const awb = `AX${Date.now().toString().slice(-10)}`
  return {
    awb,
    carrier: 'ARAMEX',
    service: rate.service,
    serviceName: rate.name,
    amount: rate.amount,
    currency: rate.currency,
    etaDays: rate.days,
    trackingUrl: `https://www.aramex.com/track/results?ShipmentNumber=${awb}`,
    labelHtml: `<p>Aramex live rate confirmed (${rate.currency} ${rate.amount}). CreateShipments needs consignee name/phone/street — add those on the shipment to print a real AWB. Quoted service: ${rate.name}.</p>`,
    labelMime: 'text/html',
    status: 'Rate Confirmed',
    events: [
      {
        at: new Date().toISOString(),
        code: 'RATE',
        description: 'Aramex live rate OK. Full label needs consignee address on the order.',
      },
    ],
  }
}

export async function track(fields, awb) {
  const data = await httpJson(TRACK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: {
      ClientInfo: clientInfo(fields),
      Shipments: [awb],
      GetLastTrackingUpdateOnly: false,
    },
  })
  const upd = data?.TrackingResults?.[0]?.Value?.[0] || {}
  return {
    awb,
    carrier: 'ARAMEX',
    status: upd.UpdateDescription || upd.UpdateCode || 'Unknown',
    events: [
      {
        at: upd.UpdateDateTime || new Date().toISOString(),
        code: upd.UpdateCode || 'TRACK',
        description: upd.UpdateDescription || 'No scan yet',
      },
    ],
    trackingUrl: `https://www.aramex.com/track/results?ShipmentNumber=${awb}`,
  }
}
