// Called from the browser after the admin dashboard writes to Supabase, to
// invalidate the cached public menu API (see lib/public-menu-data.ts). Without
// this, edits to existing menu items would not show up on the customer menu
// until the data cache happened to expire.
//
// Calls are debounced so a burst of writes (e.g. saving an item plus its
// translations, or reordering many rows at once) collapses into a single
// revalidation request.

let pendingTimer: ReturnType<typeof setTimeout> | null = null

export function revalidatePublicMenu() {
  if (typeof window === 'undefined') return

  if (pendingTimer) clearTimeout(pendingTimer)
  pendingTimer = setTimeout(() => {
    pendingTimer = null
    void fetch('/api/revalidate-menu', { method: 'POST', cache: 'no-store' }).catch((error) => {
      console.warn('Failed to revalidate public menu cache:', error)
    })
  }, 400)
}
