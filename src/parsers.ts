import { parse } from 'csv-parse/sync'
import * as XLSX from 'xlsx'
import type { Order } from './types.js'

const aliases: Record<keyof Order, string[]> = {
  orderId: ['order id', 'orderid', 'order number'], orderDate: ['order date', 'created at', 'date'], channel: ['channel', 'sales channel'], product: ['product', 'product name', 'item'], sku: ['sku', 'product sku'], quantity: ['quantity', 'qty'], revenue: ['revenue', 'selling price', 'order value', 'amount'], productCost: ['product cost', 'cost'], shippingCost: ['shipping cost', 'shipping'], fees: ['fees', 'platform fee'], paymentMethod: ['payment method', 'payment mode'], status: ['status', 'order status'], state: ['state'], city: ['city'], rto: ['rto'], return: ['return', 'returned'], profit: ['profit', 'net profit'], profitMargin: ['profit margin', 'margin'],
}
const clean = (value: string) => value.trim().toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ')
const number = (value: unknown) => { if (value === undefined || value === null || value === '') return null; const parsed = Number(String(value).replace(/[,₹$%]/g, '')); return Number.isFinite(parsed) ? parsed : null }
const bool = (value: unknown) => value === undefined || value === null || value === '' ? null : /^(true|yes|y|1)$/i.test(String(value))

export function normalize(rows: Record<string, unknown>[]) {
  const keys = Object.keys(rows[0] ?? {})
  const map: Partial<Record<keyof Order, string>> = {}
  for (const field of Object.keys(aliases) as (keyof Order)[]) {
    const match = keys.find((key) => aliases[field].includes(clean(key)))
    if (match) map[field] = match
  }
  const orders = rows.map((row) => {
    const value = (field: keyof Order) => map[field] ? row[map[field] as string] : undefined
    return { orderId: value('orderId')?.toString() ?? null, orderDate: value('orderDate')?.toString() ?? null, channel: value('channel')?.toString() ?? null, product: value('product')?.toString() ?? null, sku: value('sku')?.toString() ?? null, quantity: number(value('quantity')), revenue: number(value('revenue')), productCost: number(value('productCost')), shippingCost: number(value('shippingCost')), fees: number(value('fees')), paymentMethod: value('paymentMethod')?.toString() ?? null, status: value('status')?.toString() ?? null, state: value('state')?.toString() ?? null, city: value('city')?.toString() ?? null, rto: bool(value('rto')), return: bool(value('return')), profit: number(value('profit')), profitMargin: number(value('profitMargin')) }
  })
  return { orders, detectedColumns: keys, mappedColumns: Object.values(map).filter(Boolean) as string[], unmappedColumns: keys.filter((key) => !Object.values(map).includes(key)) }
}

export function parseFile(filename: string, buffer: Buffer) {
  const extension = filename.toLowerCase().split('.').pop()
  if (!['csv', 'xlsx', 'xls'].includes(extension ?? '')) throw new Error('Only CSV, XLSX, and XLS files are supported')
  const workbook = extension === 'xlsx' || extension === 'xls' ? XLSX.read(buffer, { type: 'buffer' }) : undefined
  const rows = workbook ? XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[workbook.SheetNames[0]], { defval: null }) : parse(buffer.toString('utf8'), { columns: true, skip_empty_lines: true, relax_column_count: true }) as Record<string, unknown>[]
  return normalize(rows)
}
