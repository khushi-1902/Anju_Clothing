import 'dotenv/config'
import { Pool } from 'pg'

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is missing. Add it to backend/.env')
}

/** One shared connection pool for the whole server. */
export const pool = new Pool({ connectionString: process.env.DATABASE_URL })
