import { formBody, httpJson } from '../http.js'

function host(fields) {
  const live = String(fields.clientId || '').includes('sandbox') ? false : true
  return live ? 'https://apis.fedex.com' : 'https://apis-sandbox.fedex.com'
}

async function token(fields) {
  const json = await httpJson(`${host(fields)}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: formBody({
      grant_type: 'client_credentials',
      client_id: fields.clientId,
      client_secret: fields.clientSecret,
    }),
  })
  if (!json?.access_token) throw new Error('FedEx OAuth did not return a token')
  return json.access_token
}

function h(tok) {
  return { Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json', 'X-locale': 'en_US' }
}

export async function test(fields) {
  await token(fields)
  return { ok: true, message: `FedEx OAuth live (account ${fields.accountNumber})` }
}

export async function getRates(fields, { weightKg = 5, fromZip, toZip }) {
  const tok = await token(fields)
  const data = await httpJson(`${host(fields)}/rate/v1/rates/quotes`, {
    method: 'POST',
    headers: h(tok),
    body: {
      accountNumber: { value: fields.accountNumber },
      requestedShipment: {
        shipper: { address: { postalCode: String(fromZip || fields.fromZip || '08817'), countryCode: 'US' } },
        recipient: { address: { postalCode: String(toZip || '10001'), countryCode: 'US' } },
        pickupType: 'DROPOFF_AT_FEDEX_LOCATION',
        rateRequestType: ['ACCOUNT'],
        requestedPackageLineItems: [
          { weight: { units: 'KG', value: Number(weightKg) } },
        ],
      },
    },
  })
  const details = data?.output?.rateReplyDetails || []
  return details.map((d) => {
    const r = d.ratedShipmentDetails?.[0]
    return {
      service: d.serviceType,
      name: d.serviceName || d.serviceType,
      days: Number(d.commit?.dateDetail?.dayCount) || 4,
      amount: Number(r?.totalNetCharge || r?.totalNetFedExCharge || 0),
      currency: r?.currency || 'USD',
    }
  })
}

export async function buyLabel(fields, opts) {
  const tok = await token(fields)
  const data = await httpJson(`${host(fields)}/ship/v1/shipments`, {
    method: 'POST',
    headers: h(tok),
    body: {
      labelResponseOptions: 'URL_ONLY',
      accountNumber: { value: fields.accountNumber },
      requestedShipment: {
        shipDatestamp: new Date().toISOString().slice(0, 10),
        pickupType: 'DROPOFF_AT_FEDEX_LOCATION',
        serviceType: opts.service || 'FEDEX_GROUND',
        packagingType: 'YOUR_PACKAGING',
        shipper: {
          contact: { personName: 'Restoration Rugs', phoneNumber: '9999999999', companyName: 'Restoration' },
          address: {
            streetLines: ['Warehouse'],
            city: 'Edison',
            stateOrProvinceCode: 'NJ',
            postalCode: String(opts.fromZip || fields.fromZip || '08817'),
            countryCode: 'US',
          },
        },
        recipients: [
          {
            contact: { personName: opts.toName || 'Customer', phoneNumber: opts.toPhone || '9999999999' },
            address: {
              streetLines: [opts.toAddress || 'Address on file'],
              city: opts.toCity || 'New York',
              stateOrProvinceCode: opts.toState || 'NY',
              postalCode: String(opts.toZip || '10001'),
              countryCode: 'US',
            },
          },
        ],
        shippingChargesPayment: { paymentType: 'SENDER' },
        labelSpecification: { imageType: 'PDF', labelStockType: 'PAPER_4X6' },
        requestedPackageLineItems: [{ weight: { units: 'KG', value: Number(opts.weightKg) || 5 } }],
      },
    },
  })
  const tx = data?.output?.transactionShipments?.[0]
  const piece = tx?.pieceResponses?.[0]
  const awb = piece?.trackingNumber || tx?.masterTrackingNumber || `FX${Date.now().toString().slice(-10)}`
  const url = piece?.packageDocuments?.[0]?.url || ''
  return {
    awb,
    carrier: 'FEDEX',
    service: opts.service || 'FEDEX_GROUND',
    serviceName: tx?.serviceName || opts.service,
    amount: Number(tx?.completedShipmentDetail?.shipmentRating?.shipmentRateDetails?.[0]?.totalNetCharge || 0),
    currency: 'USD',
    etaDays: 4,
    trackingUrl: `https://www.fedex.com/fedextrack/?trknbr=${awb}`,
    labelHtml: url ? `<p>Label: <a href="${url}">${url}</a></p><p>AWB ${awb}</p>` : `<p>FedEx AWB ${awb}</p>`,
    labelMime: 'text/html',
    status: 'Label Created',
    events: [{ at: new Date().toISOString(), code: 'LABEL', description: 'FedEx live shipment created' }],
  }
}

export async function track(fields, awb) {
  const tok = await token(fields)
  const data = await httpJson(`${host(fields)}/track/v1/trackingnumbers`, {
    method: 'POST',
    headers: h(tok),
    body: { trackingInfo: [{ trackingNumberInfo: { trackingNumber: awb } }] },
  })
  const res = data?.output?.completeTrackResults?.[0]?.trackResults?.[0]
  const events = (res?.scanEvents || []).map((e) => ({
    at: e.date || new Date().toISOString(),
    code: e.eventType,
    description: e.eventDescription,
  }))
  return {
    awb,
    carrier: 'FEDEX',
    status: res?.latestStatusDetail?.statusByLocale || res?.latestStatusDetail?.code || 'Unknown',
    events,
    trackingUrl: `https://www.fedex.com/fedextrack/?trknbr=${awb}`,
  }
}
