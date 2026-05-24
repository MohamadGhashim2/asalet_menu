# AGENT CONTEXT

This repository contains the MVP QR Menu for a single restaurant client.
It uses Next.js App Router, Tailwind CSS, and Supabase.

## Architecture
- `src/app`: Next.js App Router.
- `src/app/admin`: Admin dashboard, protected by Supabase Auth (via `src/middleware.ts`).
- `src/lib/supabase`: Supabase clients for server and browser.
- `src/types/supabase.ts`: Database types generated from the schema.
- `supabase/sql/schema.sql`: Contains the database schema and RLS policies.

## Key Decisions
- No complex multi-tenant SaaS logic.
- Single client setup.
- Image URLs are mostly static strings pointing to `/menu-assets/` for now, or Supabase Storage bucket `menu-images`.
- RTL/Arabic UI.
