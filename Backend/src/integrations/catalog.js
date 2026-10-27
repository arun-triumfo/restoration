/** Admin-facing key catalog. Live adapters turn on as soon as these values are saved. */
export const CATALOG = {
  razorpay: {
    id: 'razorpay',
    label: 'Razorpay',
    kind: 'billing',
    hint: 'Settings → API Keys. Webhook URL: {origin}/api/webhooks/razorpay',
    fields: [
      { key: 'keyId', label: 'Key ID', placeholder: 'rzp_live_… or rzp_test_…', required: true },
      { key: 'keySecret', label: 'Key Secret', secret: true, required: true },
      { key: 'webhookSecret', label: 'Webhook secret', secret: true },
      { key: 'currency', label: 'Currency', placeholder: 'INR' },
    ],
  },
  stripe: {
    id: 'stripe',
    label: 'Stripe',
    kind: 'billing',
    hint: 'Developers → API keys. Webhook URL: {origin}/api/webhooks/stripe',
    fields: [
      { key: 'publishableKey', label: 'Publishable key', placeholder: 'pk_live_…' },
      { key: 'secretKey', label: 'Secret key', secret: true, placeholder: 'sk_live_…', required: true },
      { key: 'webhookSecret', label: 'Webhook signing secret', secret: true, placeholder: 'whsec_…' },
      { key: 'currency', label: 'Currency', placeholder: 'usd' },
    ],
  },
  shopify: {
    id: 'shopify',
    label: 'Shopify',
    kind: 'marketplace',
    hint: 'Shopify admin → Settings → Apps → Develop apps → Admin API token. Domain must be xxx.myshopify.com (not odetterugs.com).',
    fields: [
      { key: 'shopDomain', label: 'Shop domain', placeholder: 'store.myshopify.com', required: true },
      { key: 'accessToken', label: 'Admin API access token', secret: true, placeholder: 'shpat_…', required: true },
      { key: 'apiVersion', label: 'API version', placeholder: '2024-10' },
    ],
  },
  amazon: {
    id: 'amazon',
    label: 'Amazon SP-API',
    kind: 'marketplace',
    hint: 'Seller Central → Apps → LWA credentials. Refresh token comes from the app authorization flow.',
    fields: [
      { key: 'lwaClientId', label: 'LWA App ID (client id)', required: true },
      { key: 'lwaClientSecret', label: 'LWA App Secret', secret: true, required: true },
      { key: 'refreshToken', label: 'Refresh token', secret: true, required: true },
      { key: 'marketplaceId', label: 'Marketplace ID', placeholder: 'ATVPDKIKX0DER' },
      { key: 'region', label: 'Region (na / eu / fe)', placeholder: 'na' },
      { key: 'awsAccessKey', label: 'AWS access key (IAM)', secret: true },
      { key: 'awsSecretKey', label: 'AWS secret key (IAM)', secret: true },
    ],
  },
  etsy: {
    id: 'etsy',
    label: 'Etsy',
    kind: 'marketplace',
    hint: 'Etsy developers → app → API key + OAuth access token + shop id.',
    fields: [
      { key: 'shopId', label: 'Shop ID', required: true },
      { key: 'apiKey', label: 'API key (x-api-key)', secret: true, required: true },
      { key: 'accessToken', label: 'OAuth access token', secret: true, required: true },
    ],
  },
  shiprocket: {
    id: 'shiprocket',
    label: 'Shiprocket',
    kind: 'courier',
    hint: 'Shiprocket → Settings → API → Configure. Use the API user, not the main panel login.',
    fields: [
      { key: 'email', label: 'API user email', required: true },
      { key: 'password', label: 'API user password', secret: true, required: true },
      { key: 'pickupPincode', label: 'Pickup pincode', placeholder: '221401' },
      { key: 'pickupLocation', label: 'Pickup location name', placeholder: 'Primary' },
    ],
  },
  aramex: {
    id: 'aramex',
    label: 'Aramex',
    kind: 'courier',
    hint: 'Aramex account username, password, account number, PIN, entity and country code.',
    fields: [
      { key: 'username', label: 'Username', required: true },
      { key: 'password', label: 'Password', secret: true, required: true },
      { key: 'accountNumber', label: 'Account number', required: true },
      { key: 'accountPin', label: 'Account PIN', secret: true, required: true },
      { key: 'accountEntity', label: 'Account entity', placeholder: 'BOM' },
      { key: 'accountCountry', label: 'Account country', placeholder: 'IN' },
    ],
  },
  shipglobal: {
    id: 'shipglobal',
    label: 'ShipGlobal.in',
    kind: 'courier',
    hint: 'ShipGlobal integration user + API token from the merchant dashboard.',
    fields: [
      { key: 'email', label: 'User ID / email', required: true },
      { key: 'apiKey', label: 'API key / password', secret: true, required: true },
    ],
  },
  fedex: {
    id: 'fedex',
    label: 'FedEx',
    kind: 'courier',
    hint: 'FedEx Developer Portal → API key, secret, account number. Use production hosts when keys are live.',
    fields: [
      { key: 'clientId', label: 'API key (client id)', required: true },
      { key: 'clientSecret', label: 'API secret', secret: true, required: true },
      { key: 'accountNumber', label: 'Account number', required: true },
      { key: 'meterNumber', label: 'Meter number' },
      { key: 'fromZip', label: 'Ship-from ZIP', placeholder: '08817' },
    ],
  },
  dhl: {
    id: 'dhl',
    label: 'DHL Express',
    kind: 'courier',
    hint: 'DHL Express MyDHL API site ID + password (or API key + secret).',
    fields: [
      { key: 'apiKey', label: 'API key / site ID', required: true },
      { key: 'apiSecret', label: 'API secret / password', secret: true, required: true },
      { key: 'accountNumber', label: 'Account number' },
      { key: 'fromCountry', label: 'From country', placeholder: 'IN' },
      { key: 'fromZip', label: 'From postal code', placeholder: '221401' },
    ],
  },
}

export const CHANNEL_IDS = Object.keys(CATALOG)

export function publicCatalog(origin = '') {
  return CHANNEL_IDS.map((id) => {
    const c = CATALOG[id]
    return {
      id: c.id,
      label: c.label,
      kind: c.kind,
      hint: String(c.hint || '').replace('{origin}', origin || ''),
      fields: c.fields.map((f) => ({
        key: f.key,
        label: f.label,
        secret: Boolean(f.secret),
        required: Boolean(f.required),
        placeholder: f.placeholder || '',
      })),
    }
  })
}
