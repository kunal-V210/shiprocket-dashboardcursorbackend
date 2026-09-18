export interface Order {
  orderId?: string | null
  orderDate?: string | null
  channel?: string | null
  product?: string | null
  sku?: string | null
  quantity?: number | null
  revenue?: number | null
  productCost?: number | null
  shippingCost?: number | null
  fees?: number | null
  paymentMethod?: string | null
  status?: string | null
  state?: string | null
  city?: string | null
  rto?: boolean | null
  return?: boolean | null
  profit?: number | null
  profitMargin?: number | null
}

export interface Filters {
  startDate?: string
  endDate?: string
  channel?: string
  status?: string
  paymentMethod?: string
  product?: string
  sku?: string
  state?: string
  city?: string
  search?: string
  page?: number
  pageSize?: number
  sortBy?: keyof Order
  sortOrder?: 'asc' | 'desc'
}

export type Dataset = Order[]

export interface GroupMetrics extends Record<string, unknown> {
  orders: number
  quantity: number | null
  revenue: number | null
  cost: number | null
  profit: number | null
  margin: number | null
  delivered: number
  rto: number
  returns: number
}

export interface MetabaseData {
  columns: string[]
  rows: Record<string, unknown>[]
  rowCount: number
}
