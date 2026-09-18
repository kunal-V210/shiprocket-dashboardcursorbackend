import Fastify from 'fastify'
import cors from '@fastify/cors'
import multipart from '@fastify/multipart'
import { z } from 'zod'
import * as XLSX from 'xlsx'
import { env } from './config.js'
import { parseFile } from './parsers.js'
import { setDataset, getDataset, filterRows, metrics, groups, closeMongo, fetchFromMetabase } from './data.js'
import type { Filters, Order } from './types.js'

const querySchema = z.object({ startDate: z.string().optional(), endDate: z.string().optional(), channel: z.string().optional(), status: z.string().optional(), paymentMethod: z.string().optional(), product: z.string().optional(), sku: z.string().optional(), state: z.string().optional(), city: z.string().optional(), search: z.string().optional(), page: z.coerce.number().int().positive().default(1), pageSize: z.coerce.number().int().positive().max(1000).default(50), sortBy: z.string().optional(), sortOrder: z.enum(['asc', 'desc']).default('desc') })
const getFilters = (query: unknown) => querySchema.parse(query) as Filters
let source = env.DATA_SOURCE
let metabaseUrl = env.METABASE_URL

const csv = (rows: Record<string, unknown>[]) => {
  const headers = Object.keys(rows[0] ?? {})
  const escape = (value: unknown) => { const text = String(value ?? ''); return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text }
  return [headers.map(escape).join(','), ...rows.map((row) => headers.map((header) => escape(row[header])).join(','))].join('\n')
}

const sendExport = async (reply: any, rows: Record<string, unknown>[], format: 'csv' | 'xlsx', name: string) => {
  if (format === 'csv') {
    reply.header('Content-Type', 'text/csv; charset=utf-8').header('Content-Disposition', `attachment; filename="${name}.csv"`)
    return csv(rows)
  }
  const workbook = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), name)
  reply.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet').header('Content-Disposition', `attachment; filename="${name}.xlsx"`)
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })
}

export function buildApp() {
  const app = Fastify({ logger: true })
  app.register(cors, { origin: env.FRONTEND_ORIGIN })
  app.register(multipart, { limits: { fileSize: 25 * 1024 * 1024 } })
  app.get('/health', async () => ({ success: true, service: 'shiprocket-dashboard-backend' }))

  app.post('/api/upload', async (req, reply) => {
    try {
      const file = await req.file(); if (!file) return reply.code(400).send({ success: false, error: 'File is required' })
      const parsed = parseFile(file.filename, await file.toBuffer()); setDataset(parsed.orders)
      return { success: true, fileName: file.filename, rowCount: parsed.orders.length, detectedColumns: parsed.detectedColumns, mappedColumns: parsed.mappedColumns, unmappedColumns: parsed.unmappedColumns, errors: [] }
    } catch (error) { return reply.code(400).send({ success: false, error: error instanceof Error ? error.message : 'Upload failed' }) }
  })

  app.get('/api/orders', async (req, reply) => {
    try {
      const filters = getFilters(req.query); let rows = filterRows(getDataset(), filters)
      if (filters.sortBy) rows.sort((a, b) => { const av = a[filters.sortBy as keyof Order]; const bv = b[filters.sortBy as keyof Order]; const compare = typeof av === 'number' && typeof bv === 'number' ? av - bv : String(av ?? '').localeCompare(String(bv ?? '')); return filters.sortOrder === 'asc' ? compare : -compare })
      const page = filters.page ?? 1; const pageSize = filters.pageSize ?? 50; const total = rows.length
      return { success: true, rows: rows.slice((page - 1) * pageSize, page * pageSize), page, pageSize, total, totalPages: Math.ceil(total / pageSize) }
    } catch (error) { return reply.code(400).send({ success: false, error: error instanceof Error ? error.message : 'Orders fetch failed' }) }
  })

  app.get('/api/dashboard', async (req, reply) => {
    try { const rows = filterRows(getDataset(), getFilters(req.query)); const byDate = groups(rows, 'orderDate'); const byChannel = groups(rows, 'channel'); return { success: true, ...metrics(rows), ordersOverTime: byDate, revenueOverTime: byDate.map((item) => ({ date: item.orderDate, revenue: item.revenue })), profitOverTime: byDate.map((item) => ({ date: item.orderDate, profit: item.profit })), revenueByChannel: byChannel.map((item) => ({ channel: item.channel, revenue: item.revenue })), profitByChannel: byChannel.map((item) => ({ channel: item.channel, profit: item.profit, profitMargin: item.margin })), ordersByStatus: groups(rows, 'status'), topProductsByRevenue: groups(rows, 'product').sort((a, b) => (Number(b.revenue ?? 0) - Number(a.revenue ?? 0))).slice(0, 10), topProductsByProfit: groups(rows, 'product').sort((a, b) => (Number(b.profit ?? 0) - Number(a.profit ?? 0))).slice(0, 10) } } catch (error) { return reply.code(400).send({ success: false, error: error instanceof Error ? error.message : 'Dashboard fetch failed' }) }
  })

  app.get('/api/pnl', async (req, reply) => {
    try { const rows = filterRows(getDataset(), getFilters(req.query)); const m = metrics(rows); return { success: true, revenue: m.revenue, productCost: m.productCost, shippingCost: m.shippingCost, fees: m.fees, returnRtoCost: null, totalCosts: m.totalCosts, profit: m.profit, profitMargin: m.profitMargin, dailyTrend: groups(rows, 'orderDate'), channelBreakdown: groups(rows, 'channel'), productBreakdown: groups(rows, 'product') } } catch (error) { return reply.code(400).send({ success: false, error: error instanceof Error ? error.message : 'P&L fetch failed' }) }
  })
  app.get('/api/products', async (req) => ({ success: true, rows: groups(filterRows(getDataset(), getFilters(req.query)), 'product') }))
  app.get('/api/channels', async (req) => ({ success: true, rows: groups(filterRows(getDataset(), getFilters(req.query)), 'channel') }))
  app.get('/api/data-source', async () => ({ success: true, source }))
  app.put('/api/data-source', async (req, reply) => { const result = z.object({ source: z.enum(['local', 'mongodb', 'metabase']) }).safeParse(req.body); if (!result.success) return reply.code(400).send({ success: false, error: 'source must be local, mongodb, or metabase' }); source = result.data.source; return { success: true, source } })
  app.get('/api/metabase', async () => ({ success: true, url: metabaseUrl ?? null }))
  app.put('/api/metabase', async (req, reply) => { const result = z.object({ url: z.string().url().refine((value) => ['http:', 'https:'].includes(new URL(value).protocol), 'URL must use HTTP or HTTPS') }).safeParse(req.body); if (!result.success) return reply.code(400).send({ success: false, error: 'A valid HTTP/HTTPS URL is required' }); metabaseUrl = result.data.url; return { success: true, url: metabaseUrl } })
  app.get('/api/metabase/data', async (req, reply) => { if (!metabaseUrl) return reply.code(400).send({ success: false, error: 'Metabase URL not configured' }); try { return { success: true, ...(await fetchFromMetabase(metabaseUrl)) } } catch (error) { return reply.code(502).send({ success: false, error: error instanceof Error ? error.message : 'Metabase request failed' }) } })

  app.get('/api/export/orders', async (req, reply) => { const query = req.query as Record<string, unknown>; const format = z.enum(['csv', 'xlsx']).catch('csv').parse(query.format); const rows = filterRows(getDataset(), getFilters(query)) as Record<string, unknown>[]; return sendExport(reply, rows, format, 'orders') })
  app.get('/api/export/pnl', async (req, reply) => { const query = req.query as Record<string, unknown>; const format = z.enum(['csv', 'xlsx']).catch('csv').parse(query.format); const m = metrics(filterRows(getDataset(), getFilters(query))); const rows = [{ category: 'Revenue', value: m.revenue }, { category: 'Product Cost', value: m.productCost }, { category: 'Shipping Cost', value: m.shippingCost }, { category: 'Fees', value: m.fees }, { category: 'Return/RTO Cost', value: null }, { category: 'Total Costs', value: m.totalCosts }, { category: 'Profit', value: m.profit }, { category: 'Profit Margin', value: m.profitMargin }]; return sendExport(reply, rows, format, 'pnl') })
  app.addHook('onClose', async () => { await closeMongo() })
  return app
}
