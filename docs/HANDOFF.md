# HANDOFF

## Project Status
The QR Menu MVP has been implemented as requested.

## Completed Features
- Supabase SQL schema generated (`supabase/sql/schema.sql`).
- Next.js App Router configured for Arabic RTL (using Cairo font).
- Database types generated.
- Supabase SSR authentication and middleware set up.
- Public Menu (`/`) with categories, items, dynamic pricing, and variants.
- Admin Layout with Sidebar.
- Admin Login page (uses access-code UX, where the code is actually the Supabase user's password mapped to a fixed admin email).
- Admin Dashboard with stats.
- Admin Settings page.
- Admin Categories CRUD.
- Admin Items CRUD (with complex form for options/groups).
- Admin QR page for printing.
- Admin Import functionality (Option A).

## Next Steps
- Execute the SQL schema (`supabase/sql/schema.sql`) in the Supabase project.
- For an existing Supabase project, replace `admin@admin.com` with the real admin email in `supabase/sql/harden-production-resources.sql`, review it, and run it once from the Supabase SQL editor. This adds read-path indexes and replaces earlier permissive policies with active-read/admin-write policies.
- To enable English and Turkish catalog content, replace `admin@admin.com` with that same real admin email in `supabase/sql/add-catalog-translations.sql`, review it, and run it once from the Supabase SQL editor. Arabic remains the source data; English and Turkish fields are optional and automatically fall back to Arabic when blank.
- Execute `supabase/sql/clear-legacy-menu-assets-image-urls.sql` in your Supabase SQL editor to clean up legacy image references.
- Configure environment variables `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `NEXT_PUBLIC_ADMIN_LOGIN_EMAIL`.
- Create the `menu-images` bucket in Supabase Storage.
- Create an admin user via Supabase Auth dashboard (the email MUST match `NEXT_PUBLIC_ADMIN_LOGIN_EMAIL`, and the password will be the access code).
- Ensure all product/category images are uploaded via the admin panel. Local menu assets and the import tool have been removed.

## Supabase Storage Image Lifecycle
- Older product/category image replacements may have left orphaned files in the `menu-images` bucket before the cleanup fix.
- Future admin product/category image replacement, image clearing, product deletion, and category deletion now attempt to remove unused Supabase Storage objects after the database update/delete succeeds.
- Cleanup only targets public URLs from this project's `menu-images` bucket. External URLs and legacy `/menu-assets/` paths are ignored.
- Shared images are protected: before removing a file, the admin UI checks `menu_items.image_url` and `categories.image_url`; if the URL is still referenced, the file is not removed.
- If Storage deletion fails because of RLS/policy, the admin action still succeeds and shows/logs a warning. The Storage bucket needs an authenticated admin DELETE policy for `menu-images`; do not add a broad public delete policy.

### Audit Orphaned Storage Images
Run this locally after setting `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_ADMIN_LOGIN_EMAIL`, and either `ADMIN_ACCESS_CODE` or `ADMIN_LOGIN_PASSWORD` in local env:

```bash
node scripts/audit-storage-orphans.mjs
```

The audit signs in as the configured admin, recursively lists `menu-images`, compares files against `menu_items.image_url` and `categories.image_url`, and prints orphan paths without deleting anything.

### Delete Orphaned Storage Images
The delete script refuses to run unless `--confirm` is provided:

```bash
node scripts/delete-storage-orphans.mjs --confirm
```

It reuses the audit result, deletes only unreferenced files from `menu-images` in batches, logs each deleted path, and continues safely if an individual delete fails.

Run the audit periodically, especially after bulk menu edits. Keep the delete step manual so orphan paths can be reviewed before removal.

## Public Menu Cache And Vercel Firewall
- Public customers load one cached payload from `/api/public-menu`. The response is fresh at the CDN for 5 minutes and can be served stale while revalidating for 24 hours.
- The public menu fetches `/api/public-menu?locale=ar`, `locale=en`, or `locale=tr`; each locale has an independent CDN and session-storage cache entry.
- Recommended Vercel Firewall rate limits:
  - `/asalaadmin26/login`: 10 requests per 1 minute per IP.
  - `/asalaadmin26/*`: 120 requests per 1 minute per IP.
  - `/api/public-menu`: 300-600 requests per 1 minute per IP.
- Do not aggressively rate-limit `/`. Restaurant customers can share the same Wi-Fi and public IP.

## GitHub Deployment & Production Readiness
This project is built as a single-client MVP ready for deployment on Vercel:
1. **Repository Setup**: Initialize Git (`git init`), add the files (`git add .`), commit (`git commit -m "Initial MVP commit"`), and push to a private GitHub repository.
2. **Vercel Deployment**: Link your GitHub repository to Vercel. 
3. **Environment Variables**: Configure `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `NEXT_PUBLIC_SITE_URL` in Vercel settings.
4. **Static Assets**: Local static menu images have been removed. All images must be uploaded to the Supabase Storage bucket (`menu-images`) via the admin UI.
