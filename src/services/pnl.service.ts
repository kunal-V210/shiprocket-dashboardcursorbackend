import { existsSync, readFileSync } from 'node:fs'
import { read } from 'xlsx'
import type { Dataset, Filters } from '../types.js'

export const pnlMapping = [
  { excelLabel: 'Total Orders', apiField: 'totalOrders', formula: 'SUM(C2:E2)', sourceFields: ['Aug PnL Summary!C2:E2'], available: true },
  { excelLabel: 'Gross Revenue', apiField: 'grossRevenue', formula: 'SUM(C3:E3)', sourceFields: ['Aug PnL Summary!C3:E3'], available: true },
  { excelLabel: 'Tax', apiField: 'tax', formula: 'SUM(C4:E4)', sourceFields: ['Aug PnL Summary!C4:E4'], available: true },
  { excelLabel: 'Gross Revenue (Excl. Tax)', apiField: 'grossRevenueExclTax', formula: 'SUM(C5:E5)', sourceFields: ['Aug PnL Summary!C5:E5'], available: true },
  { excelLabel: 'Cancellation (Excl. Tax)', apiField: 'cancellationExclTax', formula: 'SUM(C6:E6)', sourceFields: ['Aug PnL Summary!C6:E6'], available: true },
  { excelLabel: 'RTO (Excl. Tax)', apiField: 'rtoExclTax', formula: 'SUM(C7:E7)', sourceFields: ['Aug PnL Summary!C7:E7'], available: true },
  { excelLabel: 'Lost & Misrouted (Excl. Tax)', apiField: 'lostAndMisroutedExclTax', formula: 'SUM(C8:E8)', sourceFields: ['Aug PnL Summary!C8:E8'], available: true },
  { excelLabel: 'Net Revenue (Excl. Tax)', apiField: 'netRevenueExclTax', formula: 'SUM(C9:E9)', sourceFields: ['C5-C6-C7-C8', 'D5-D6-D7', 'E5-E6-E7'], available: true },
  { excelLabel: 'Marketing Spends (Excl. Tax)', apiField: 'marketingSpendsExclTax', formula: 'SUM(C10:E10)', sourceFields: ['C11+C12', 'Aug PnL Summary!D10:E10'], available: true },
  { excelLabel: 'Google (Excl. Tax)', apiField: 'googleExclTax', formula: 'SUM(C11:E11)', sourceFields: ['Aug PnL Summary!C11:E11'], available: true },
  { excelLabel: 'Meta (Excl. Tax)', apiField: 'metaExclTax', formula: 'SUM(C12:E12)', sourceFields: ['Aug PnL Summary!C12:E12'], available: true },
  { excelLabel: 'COGS', apiField: 'cogs', formula: 'SUM(C13:E13)', sourceFields: ['Aug PnL Summary!C13:E13'], available: true },
  { excelLabel: 'Shipping, Logistics & PF Fee', apiField: 'shippingLogisticsAndPfFee', formula: 'SUM(C14:E14)', sourceFields: ['C15+C16', 'Aug PnL Summary!D14:E14'], available: true },
  { excelLabel: 'Shipping (Excl. Tax)', apiField: 'shippingExclTax', formula: 'SUM(C15:E15)', sourceFields: ['Aug PnL Summary!C15:E15'], available: true },
  { excelLabel: 'PG + VAS Charges (Excl. Tax)', apiField: 'pgAndVasChargesExclTax', formula: 'SUM(C16:E16)', sourceFields: ['Aug PnL Summary!C16:E16'], available: true },
  { excelLabel: 'Content Cost', apiField: 'contentCost', formula: 'SUM(C17:E17)', sourceFields: ['Aug PnL Summary!C17:E17'], available: true },
  { excelLabel: 'Cost of doing Business', apiField: 'costOfDoingBusiness', formula: 'SUM(C18:E18)', sourceFields: ['C17+C14+C13+C10', 'D17+D14+D13+D10', 'Aug PnL Summary!E18'], available: true },
  { excelLabel: 'Net Profit (Excl. Tax)', apiField: 'netProfitExclTax', formula: 'SUM(C19:E19)', sourceFields: ['C9-C18', 'D9-D18', 'Aug PnL Summary!E19'], available: true },
] as const

export type PnlSummary = Record<string, number | null> & { totalOrders: number | null }

const workbookPath = new URL('../../data/PnL-August-1831c0.xlsx', import.meta.url).pathname

function readWorkbookSummary() {
  if (!existsSync(workbookPath)) return null
  const workbook = read(readFileSync(workbookPath), { type: 'buffer', cellFormula: true, cellDates: true })
  const sheet = workbook.Sheets['Aug PnL Summary']
  if (!sheet) return null
  const value = (cell: string) => sheet[cell]?.v
  const num = (cell: string) => typeof value(cell) === 'number' ? value(cell) as number : null
  const c = { orders: num('C2'), grossRevenue: num('C3'), tax: num('C4'), grossRevenueExclTax: num('C5'), cancellationExclTax: num('C6'), rtoExclTax: num('C7'), lostAndMisroutedExclTax: num('C8'), netRevenueExclTax: num('C9'), marketingSpendsExclTax: num('C10'), googleExclTax: num('C11'), metaExclTax: num('C12'), cogs: num('C13'), shippingLogisticsAndPfFee: num('C14'), shippingExclTax: num('C15'), pgAndVasChargesExclTax: num('C16'), contentCost: num('C17'), costOfDoingBusiness: num('C18'), netProfitExclTax: num('C19') }
  const d = { orders: num('D2'), grossRevenue: num('D3'), tax: num('D4'), grossRevenueExclTax: num('D5'), cancellationExclTax: num('D6'), rtoExclTax: num('D7'), lostAndMisroutedExclTax: num('D8'), netRevenueExclTax: num('D9'), marketingSpendsExclTax: num('D10'), googleExclTax: num('D11'), metaExclTax: num('D12'), cogs: num('D13'), shippingLogisticsAndPfFee: num('D14'), shippingExclTax: num('D15'), pgAndVasChargesExclTax: num('D16'), contentCost: num('D17'), costOfDoingBusiness: num('D18'), netProfitExclTax: num('D19') }
  const e = { orders: num('E2'), grossRevenue: num('E3'), tax: num('E4'), grossRevenueExclTax: num('E5'), cancellationExclTax: num('E6'), rtoExclTax: num('E7'), lostAndMisroutedExclTax: num('E8'), netRevenueExclTax: num('E9'), marketingSpendsExclTax: num('E10'), googleExclTax: num('E11'), metaExclTax: num('E12'), cogs: num('E13'), shippingLogisticsAndPfFee: num('E14'), shippingExclTax: num('E15'), pgAndVasChargesExclTax: num('E16'), contentCost: num('E17'), costOfDoingBusiness: num('E18'), netProfitExclTax: num('E19') }
  const total = (key: keyof typeof c) => [c[key], d[key], e[key]].every((v) => typeof v === 'number') ? (c[key] as number) + (d[key] as number) + (e[key] as number) : null
  return { summary: { totalOrders: total('orders'), ...Object.fromEntries(Object.keys(c).filter((k) => k !== 'orders').map((k) => [k, total(k as keyof typeof c)])) } as PnlSummary, channels: { website: c, amazon: d, flipkart: e } }
}

export function calculatePnl(_rows: Dataset, filters: Filters) {
  const hasFilters = Object.entries(filters).some(([key, value]) => !['page', 'pageSize', 'sortBy', 'sortOrder'].includes(key) && value !== undefined && value !== '')
  const workbook = readWorkbookSummary()
  if (!workbook) return { available: false, reason: 'Aug PnL Summary workbook is not available', summary: null, mapping: pnlMapping }
  if (hasFilters) return { available: false, reason: 'The workbook summary contains aggregated manual inputs; filtered P&L requires source-level mappings not present in the normalized Order type', summary: null, mapping: pnlMapping }
  return { available: true, summary: workbook.summary, channelBreakdown: Object.entries(workbook.channels).map(([channel, values]) => ({ channel, ...values })), dailyTrend: [], productBreakdown: [], mapping: pnlMapping, rounding: 'No ROUND formulas were present; raw Excel numeric values are returned.' }
}
