-- =============================================================================
-- PRODUCTION RESOURCE HARDENING
--
-- Run this once in the Supabase SQL editor after replacing admin@admin.com with
-- the real admin email. Review the replacement before executing.
--
-- This migration:
-- 1. Adds read-path indexes.
-- 2. Removes policy drift from earlier bootstrap files.
-- 3. Rebuilds anonymous reads for active menu data only.
-- 4. Limits database and menu-images writes to the configured admin email.
-- =============================================================================

CREATE INDEX IF NOT EXISTS categories_active_sort_order_idx
  ON public.categories (is_active, sort_order);

CREATE INDEX IF NOT EXISTS menu_items_category_available_sort_order_idx
  ON public.menu_items (category_id, is_available, sort_order);

CREATE INDEX IF NOT EXISTS item_option_groups_item_active_sort_order_idx
  ON public.item_option_groups (item_id, is_active, sort_order);

CREATE INDEX IF NOT EXISTS item_options_group_active_sort_order_idx
  ON public.item_options (group_id, is_active, sort_order);

CREATE INDEX IF NOT EXISTS option_group_templates_active_sort_order_idx
  ON public.option_group_templates (is_active, sort_order);

CREATE INDEX IF NOT EXISTS option_template_options_template_active_sort_order_idx
  ON public.option_template_options (template_id, is_active, sort_order);

CREATE INDEX IF NOT EXISTS item_option_template_links_item_active_sort_order_idx
  ON public.item_option_template_links (item_id, is_active, sort_order);

CREATE INDEX IF NOT EXISTS restaurant_tables_active_code_idx
  ON public.restaurant_tables (code, is_active);

DO $$
DECLARE
  target_table text;
  target_policy record;
BEGIN
  FOREACH target_table IN ARRAY ARRAY[
    'restaurant_settings',
    'categories',
    'menu_items',
    'item_option_groups',
    'item_options',
    'option_group_templates',
    'option_template_options',
    'item_option_template_links',
    'restaurant_tables'
  ]
  LOOP
    FOR target_policy IN
      SELECT policyname
      FROM pg_policies
      WHERE schemaname = 'public' AND tablename = target_table
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', target_policy.policyname, target_table);
    END LOOP;
  END LOOP;
END
$$;

CREATE POLICY "Public can read restaurant settings"
ON public.restaurant_settings FOR SELECT TO anon USING (true);

CREATE POLICY "Public can read active categories"
ON public.categories FOR SELECT TO anon USING (is_active = true);

CREATE POLICY "Public can read available menu items"
ON public.menu_items FOR SELECT TO anon USING (
  is_available = true
  AND EXISTS (
    SELECT 1
    FROM public.categories
    WHERE categories.id = menu_items.category_id
      AND categories.is_active = true
  )
);

CREATE POLICY "Public can read active option groups"
ON public.item_option_groups FOR SELECT TO anon USING (
  is_active = true
  AND EXISTS (
    SELECT 1
    FROM public.menu_items
    WHERE menu_items.id = item_option_groups.item_id
      AND menu_items.is_available = true
  )
);

CREATE POLICY "Public can read active options"
ON public.item_options FOR SELECT TO anon USING (
  is_active = true
  AND EXISTS (
    SELECT 1
    FROM public.item_option_groups
    JOIN public.menu_items ON menu_items.id = item_option_groups.item_id
    WHERE item_option_groups.id = item_options.group_id
      AND item_option_groups.is_active = true
      AND menu_items.is_available = true
  )
);

CREATE POLICY "Public can read active templates"
ON public.option_group_templates FOR SELECT TO anon USING (is_active = true);

CREATE POLICY "Public can read active template options"
ON public.option_template_options FOR SELECT TO anon USING (
  is_active = true
  AND EXISTS (
    SELECT 1
    FROM public.option_group_templates
    WHERE option_group_templates.id = option_template_options.template_id
      AND option_group_templates.is_active = true
  )
);

CREATE POLICY "Public can read active template links"
ON public.item_option_template_links FOR SELECT TO anon USING (
  is_active = true
  AND EXISTS (
    SELECT 1
    FROM public.menu_items
    WHERE menu_items.id = item_option_template_links.item_id
      AND menu_items.is_available = true
  )
  AND EXISTS (
    SELECT 1
    FROM public.option_group_templates
    WHERE option_group_templates.id = item_option_template_links.template_id
      AND option_group_templates.is_active = true
  )
);

CREATE POLICY "Public can read active restaurant tables"
ON public.restaurant_tables FOR SELECT TO anon USING (is_active = true);

DO $$
DECLARE
  target_table text;
BEGIN
  FOREACH target_table IN ARRAY ARRAY[
    'restaurant_settings',
    'categories',
    'menu_items',
    'item_option_groups',
    'item_options',
    'option_group_templates',
    'option_template_options',
    'item_option_template_links',
    'restaurant_tables'
  ]
  LOOP
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (((select auth.jwt()) ->> ''email'') = ''admin@admin.com'')',
      'Admin can read ' || target_table,
      target_table
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (((select auth.jwt()) ->> ''email'') = ''admin@admin.com'')',
      'Admin can insert ' || target_table,
      target_table
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (((select auth.jwt()) ->> ''email'') = ''admin@admin.com'') WITH CHECK (((select auth.jwt()) ->> ''email'') = ''admin@admin.com'')',
      'Admin can update ' || target_table,
      target_table
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (((select auth.jwt()) ->> ''email'') = ''admin@admin.com'')',
      'Admin can delete ' || target_table,
      target_table
    );
  END LOOP;
END
$$;

DROP POLICY IF EXISTS "Public read access for menu-images" ON storage.objects;
DROP POLICY IF EXISTS "Public can read menu images" ON storage.objects;
DROP POLICY IF EXISTS "Admin full access for menu-images" ON storage.objects;
DROP POLICY IF EXISTS "Admin can read menu images" ON storage.objects;
DROP POLICY IF EXISTS "Admin can insert menu images" ON storage.objects;
DROP POLICY IF EXISTS "Admin can update menu images" ON storage.objects;
DROP POLICY IF EXISTS "Admin can delete menu images" ON storage.objects;

CREATE POLICY "Public can read menu images"
ON storage.objects FOR SELECT TO anon
USING (bucket_id = 'menu-images');

CREATE POLICY "Admin can read menu images"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'menu-images'
  AND ((select auth.jwt()) ->> 'email') = 'admin@admin.com'
);

CREATE POLICY "Admin can insert menu images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'menu-images'
  AND (storage.foldername(name))[1] IN ('items', 'categories')
  AND ((select auth.jwt()) ->> 'email') = 'admin@admin.com'
);

CREATE POLICY "Admin can update menu images"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'menu-images'
  AND (storage.foldername(name))[1] IN ('items', 'categories')
  AND ((select auth.jwt()) ->> 'email') = 'admin@admin.com'
)
WITH CHECK (
  bucket_id = 'menu-images'
  AND (storage.foldername(name))[1] IN ('items', 'categories')
  AND ((select auth.jwt()) ->> 'email') = 'admin@admin.com'
);

CREATE POLICY "Admin can delete menu images"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'menu-images'
  AND (storage.foldername(name))[1] IN ('items', 'categories')
  AND ((select auth.jwt()) ->> 'email') = 'admin@admin.com'
);
