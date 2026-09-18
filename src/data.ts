import { MongoClient } from 'mongodb'
import { parse } from 'csv-parse/sync'
import { env } from './config.js'
import type { Dataset, Filters, GroupMetrics, MetabaseData, Order } from './types.js'

let dataset: Dataset = []
let client: MongoClient | undefined
let connectPromise: Promise<MongoClient> | undefined

export function setDataset(rows: Dataset) { dataset = rows }
export function getDataset() { return dataset }
export async function closeMongo() { await client?.close(); client = undefined; connectPromise = undefined }

export async function getMongo() {
  if (!env.MONGODB_URI || !env.MONGODB_DATABASE) throw new Error('MongoDB is not configured')
  if (!connectPromise) connectPromise = new MongoClient(env.MONGODB_URI).connect()
  client = await connectPromise
  return client.db(env.MONGODB_DATABASE).collection<Order>(env.MONGODB_COLLECTION)
}

const comparable = (value: unknown) => String(value ?? '').trim().toLowerCase()

export function filterRows(rows: Dataset, f: Filters) {
  const filters: [keyof Order, unknown][] = [
    ['channel', f.channel], ['status', f.status], ['paymentMethod', f.paymentMethod],
    ['product', f.product], ['sku', f.sku], ['state', f.state], ['city', f.city],
  ]
  return rows.filter((row) => {
    if (f.startDate && row.orderDate && row.orderDate < f.startDate) return false
    if (f.endDate && row.orderDate && row.orderDate > f.endDate) return false
    if (filters.some(([key, value]) => value !== undefined && value !== '' && comparable(row[key]) !== comparable(value))) return false
    if (f.search && !Object.values(row).some((value) => comparable(value).includes(comparable(f.search)))) return false
    return true
  })
}

const sum = (rows: Dataset, key: keyof Order) => {
  const values = rows.map((row) => row[key]).filter((value): value is number => typeof value === 'number' && Number.isFinite(value))
  return values.length ? values.reduce((total, value) => total + value, 0) : null
}

export function metrics(rows: Dataset) {
  const revenue = sum(rows, 'revenue')
  const productCost = sum(rows, 'productCost')
  const shippingCost = sum(rows, 'shippingCost')
  const fees = sum(rows, 'fees')
  const profit = sum(rows, 'profit')
  const costValues = [productCost, shippingCost, fees].filter((value): value is number => value !== null)
  const totalCosts = costValues.length ? costValues.reduce((total, value) => total + value, 0) : null
  return {
    totalOrders: rows.length,
    revenue,
    productCost,
    shippingCost,
    fees,
    profit,
    profitMargin: revenue !== null && revenue !== 0 && profit !== null ? profit / revenue : null,
    delivered: rows.filter((row) => comparable(row.status) === 'delivered').length,
    cancelled: rows.filter((row) => comparable(row.status) === 'cancelled').length,
    rto: rows.filter((row) => row.rto === true).length,
    returns: rows.filter((row) => row.return === true).length,
    totalCosts,
  }
}

export function groups(rows: Dataset, key: keyof Order): (GroupMetrics & Record<string, unknown>)[] {
  const buckets = new Map<string, Dataset>()
  for (const row of rows) {
    const name = String(row[key] ?? 'Unknown')
    buckets.set(name, [...(buckets.get(name) ?? []), row])
  }
  return [...buckets.entries()].map(([name, grouped]) => {
    const m = metrics(grouped)
    const costParts = [m.productCost, m.shippingCost, m.fees].filter((value): value is number => value !== null)
    const cost = costParts.length ? costParts.reduce((total, value) => total + value, 0) : null
    return { [key]: name, orders: m.totalOrders, quantity: sum(grouped, 'quantity'), revenue: m.revenue, cost, profit: m.profit, margin: m.profitMargin, delivered: m.delivered, rto: m.rto, returns: m.returns }
  })
}

export async function fetchFromMongo(filters: Filters) {
  const collection = await getMongo()
  const query: Record<string, unknown> = {}
  for (const key of ['channel', 'status', 'paymentMethod', 'product', 'sku', 'state', 'city'] as const) if (filters[key]) query[key] = filters[key]
  if (filters.startDate || filters.endDate) query.orderDate = { ...(filters.startDate ? { $gte: filters.startDate } : {}), ...(filters.endDate ? { $lte: filters.endDate } : {}) }
  if (filters.search) query.$or = Object.keys({ orderId: 1, product: 1, sku: 1, channel: 1, status: 1, state: 1, city: 1 }).map((key) => ({ [key]: { $regex: filters.search, $options: 'i' } }))
  const page = filters.page ?? 1
  const pageSize = filters.pageSize ?? 50
  const total = await collection.countDocuments(query)
  const rows = await collection.find(query).project({ _id: 0 }).skip((page - 1) * pageSize).limit(pageSize).toArray()
  return { rows, total }
}

export async function fetchFromMetabase(url: string): Promise<MetabaseData> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10000)
  try {
    const response = await fetch(url, { signal: controller.signal })
    if (!response.ok) throw new Error(`Metabase request failed with status ${response.status}`)
    const text = await response.text()
    const rows = parse(text, { columns: true, skip_empty_lines: true, relax_column_count: true }) as Record<string, unknown>[]
    return { columns: Object.keys(rows[0] ?? {}), rows, rowCount: rows.length }
  } finally {
    clearTimeout(timeout)
  }
}
