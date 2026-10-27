import crypto from 'crypto'
import { formBody, httpJson } from '../http.js'
import { mapOrder, matchCatalogSku } from '../orderMap.js'

const HOSTS = {
  na: { host: 'sellingpartnerapi-na.amazon.com', region: 'us-east-1' },
  eu: { host: 'sellingpartnerapi-eu.amazon.com', region: 'eu-west-1' },
  fe: { host: 'sellingpartnerapi-fe.amazon.com', region: 'us-west-2' },
}

function sha256Hex(s) {
  return crypto.createHash('sha256').update(s, 'utf8').digest('hex')
}
function hmac(key, s) {
  return crypto.createHmac('sha256', key).update(s, 'utf8').digest()
}

export async function lwaToken(fields) {
  const body = formBody({
    grant_type: 'refresh_token',
    refresh_token: fields.refreshToken,
    client_id: fields.lwaClientId,
    client_secret: fields.lwaClientSecret,
  })
  const json = await httpJson('https://api.amazon.com/auth/o2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  if (!json?.access_token) throw new Error('Amazon LWA did not return an access token')
  return json.access_token
}

async function spapi(fields, accessToken, { method = 'GET', path, query = {} }) {
  const cfg = HOSTS[String(fields.region || 'na').toLowerCase()] || HOSTS.na
  const qs = Object.keys(query)
    .sort()
    .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(query[k])}`)
    .join('&')
  const url = `https://${cfg.host}${path}${qs ? `?${qs}` : ''}`

  const headers = {
    'x-amz-access-token': accessToken,
    accept: 'application/json',
  }

  if (fields.awsAccessKey && fields.awsSecretKey) {
    const now = new Date()
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '')
    const dateStamp = amzDate.slice(0, 8)
    const payloadHash = sha256Hex('')
    const canonicalHeaders = `host:${cfg.host}\nx-amz-access-token:${accessToken}\nx-amz-date:${amzDate}\n`
    const signedHeaders = 'host;x-amz-access-token;x-amz-date'
    const canonical = `${method}\n${path}\n${qs}\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`
    const scope = `${dateStamp}/${cfg.region}/execute-api/aws4_request`
    const stringToSign = `AWS4-HMAC-SHA256\n${amzDate}\n${scope}\n${sha256Hex(canonical)}`
    const kDate = hmac(`AWS4${fields.awsSecretKey}`, dateStamp)
    const kRegion = hmac(kDate, cfg.region)
    const kService = hmac(kRegion, 'execute-api')
    const kSigning = hmac(kService, 'aws4_request')
    const signature = crypto.createHmac('sha256', kSigning).update(stringToSign, 'utf8').digest('hex')
    headers['x-amz-date'] = amzDate
    headers.Authorization = `AWS4-HMAC-SHA256 Credential=${fields.awsAccessKey}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`
  }

  return httpJson(url, { method, headers })
}

export async function test(fields) {
  const token = await lwaToken(fields)
  const marketplaceId = fields.marketplaceId || 'ATVPDKIKX0DER'
  try {
    await spapi(fields, token, {
      path: '/orders/v0/orders',
      query: {
        MarketplaceIds: marketplaceId,
        CreatedAfter: new Date(Date.now() - 7 * 86400000).toISOString(),
        MaxResultsPerPage: '1',
      },
    })
    return { ok: true, message: `Amazon SP-API live (marketplace ${marketplaceId})` }
  } catch (err) {
    if (!fields.awsAccessKey) {
      throw new Error(
        `LWA token OK, but Orders call failed (${err.message}). Add AWS IAM access key + secret if the SP-API app still requires SigV4.`,
      )
    }
    throw err
  }
}

export async function sync(fields, { tenantId, catalog = [] }) {
  const token = await lwaToken(fields)
  const marketplaceId = fields.marketplaceId || 'ATVPDKIKX0DER'
  const list = await spapi(fields, token, {
    path: '/orders/v0/orders',
    query: {
      MarketplaceIds: marketplaceId,
      CreatedAfter: new Date(Date.now() - 14 * 86400000).toISOString(),
      MaxResultsPerPage: '50',
    },
  })
  const orders = list?.payload?.Orders || []
  const imported = []
  for (const o of orders.slice(0, 30)) {
    let sku = ''
    let qty = 1
    let title
    try {
      const items = await spapi(fields, token, {
        path: `/orders/v0/orders/${encodeURIComponent(o.AmazonOrderId)}/orderItems`,
      })
      const item = items?.payload?.OrderItems?.[0]
      sku = item?.SellerSKU || ''
      qty = Number(item?.QuantityOrdered) || 1
      title = item?.Title
    } catch {
      /* keep order without SKU */
    }
    const hit = matchCatalogSku(sku, catalog)
    imported.push(
      mapOrder({
        orderId: `AMZ-${o.AmazonOrderId}`,
        channel: 'Amazon',
        buyerName: o.BuyerInfo?.BuyerName || 'Amazon Customer',
        sku: hit?.sku || sku || 'UNMAPPED',
        title: title || hit?.title,
        imageUrl: hit?.imageUrl,
        qty,
        total: o.OrderTotal?.Amount,
        extra: {
          tenantId,
          currency: o.OrderTotal?.CurrencyCode || 'USD',
          marketplaceId: o.AmazonOrderId,
          source: 'amazon_live',
          orderDate: (o.PurchaseDate || '').slice(0, 10),
        },
      }),
    )
  }
  return { imported, message: `Amazon live: ${imported.length} orders pulled` }
}
