# AGENT CONTEXT

This repository contains the MVP QR Menu for a single restaurant client.
It uses Next.js App Router, Tailwind CSS, and Supabase.

## Architecture
- `src/app`: Next.js App Router.
- `src/app/asalaadmin26`: Admin dashboard, protected by Supabase Auth (via `src/middleware.ts` / `src/proxy.ts`).
- `src/lib/supabase`: Supabase clients for server and browser.
- `src/types/supabase.ts`: Database types generated from the schema.
- `supabase/sql/schema.sql`: Contains the database schema and RLS policies.

## Key Decisions
- No complex multi-tenant SaaS logic.
- Single client setup.
- Image URLs point to the Supabase Storage bucket `menu-images`. Local static assets and import features have been removed.
- RTL/Arabic UI.
