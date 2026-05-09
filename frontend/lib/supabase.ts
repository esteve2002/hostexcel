import { createClient } from '@supabase/supabase-js'

type QueryData = { data: unknown; error: { message: string } | null }

interface SupabaseQueryBuilder extends PromiseLike<QueryData> {
  select(columns?: string): SupabaseQueryBuilder
  insert(values: unknown): SupabaseQueryBuilder
  update(values: unknown): SupabaseQueryBuilder
  delete(): SupabaseQueryBuilder
  eq(column: string, value: unknown): SupabaseQueryBuilder
  gte(column: string, value: unknown): SupabaseQueryBuilder
  lte(column: string, value: unknown): SupabaseQueryBuilder
  order(column: string, options?: { ascending?: boolean }): SupabaseQueryBuilder
  single(): Promise<QueryData>
}

interface SupabaseClientLike {
  from(table: string): SupabaseQueryBuilder
}

const createMissingClient = (): SupabaseClientLike => {
  const stub = new Proxy({} as Record<string, unknown>, {
    get: () => () => createMissingClient(),
  })

  return stub as unknown as SupabaseClientLike
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export const supabase: SupabaseClientLike =
  (supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : createMissingClient()) as SupabaseClientLike
