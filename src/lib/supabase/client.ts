import { createBrowserClient } from '@supabase/ssr'
import { Database } from '@/types/supabase'
import { revalidatePublicMenu } from '@/lib/revalidate-public-menu'

// Methods on a Supabase query builder that change data. After any of these
// succeeds we invalidate the cached public menu so the change shows up for
// customers right away.
const MUTATING_METHODS = ['insert', 'update', 'upsert', 'delete'] as const

/* eslint-disable @typescript-eslint/no-explicit-any */

// Supabase query builders are thenables: the request only runs when awaited.
// We patch `then` so that, once a mutation resolves without an error, the public
// menu cache is revalidated. Filter chains like `.eq(...).select()` return the
// same builder instance, so patching once here covers the whole chain.
function tapForRevalidation<T extends PromiseLike<unknown>>(builder: T): T {
  const thenable = builder as any
  const originalThen = thenable.then.bind(thenable)

  thenable.then = (onFulfilled: any, onRejected: any) =>
    originalThen((result: any) => {
      if (result && typeof result === 'object' && !result.error) {
        revalidatePublicMenu()
      }
      return onFulfilled ? onFulfilled(result) : result
    }, onRejected)

  return builder
}

export function createClient() {
  const client = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // The admin dashboard writes directly to Supabase from the browser across many
  // pages. Rather than remember to revalidate at every call site, we wrap the
  // mutating builder methods once here so freshness is handled automatically.
  const originalFrom = client.from.bind(client)
  client.from = ((relation: string) => {
    const queryBuilder = originalFrom(relation as never) as any

    for (const method of MUTATING_METHODS) {
      const originalMethod = queryBuilder[method]
      if (typeof originalMethod !== 'function') continue

      queryBuilder[method] = (...args: any[]) =>
        tapForRevalidation(originalMethod.apply(queryBuilder, args))
    }

    return queryBuilder
  }) as typeof client.from

  return client
}
