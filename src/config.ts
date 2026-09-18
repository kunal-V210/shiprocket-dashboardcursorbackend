import { z } from 'zod'

const schema = z.object({ PORT: z.coerce.number().int().positive().default(4000), NODE_ENV: z.string().default('development'), FRONTEND_ORIGIN: z.string().url().default('http://localhost:3000'), DATA_SOURCE: z.enum(['local','mongodb','metabase']).default('local'), MONGODB_URI: z.string().optional(), MONGODB_DATABASE: z.string().optional(), MONGODB_COLLECTION: z.string().default('orders'), METABASE_URL: z.string().url().optional() })
export const env = schema.parse(process.env)
