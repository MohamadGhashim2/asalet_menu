-- ==============================================================================
-- RESTRICT ADMIN RLS POLICIES
-- Only the real admin can insert, update, or delete menu data.
--
-- IMPORTANT:
-- Change 'admin@admin.com' below to your actual admin email before running!
-- ==============================================================================

-- 1. CATEGORIES
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON "public"."categories";
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON "public"."categories";
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON "public"."categories";

CREATE POLICY "Admin can insert categories" ON "public"."categories"
FOR INSERT TO authenticated WITH CHECK (auth.jwt()->>'email' = 'admin@admin.com');

CREATE POLICY "Admin can update categories" ON "public"."categories"
FOR UPDATE TO authenticated USING (auth.jwt()->>'email' = 'admin@admin.com') WITH CHECK (auth.jwt()->>'email' = 'admin@admin.com');

CREATE POLICY "Admin can delete categories" ON "public"."categories"
FOR DELETE TO authenticated USING (auth.jwt()->>'email' = 'admin@admin.com');


-- 2. MENU ITEMS
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON "public"."menu_items";
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON "public"."menu_items";
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON "public"."menu_items";

CREATE POLICY "Admin can insert menu_items" ON "public"."menu_items"
FOR INSERT TO authenticated WITH CHECK (auth.jwt()->>'email' = 'admin@admin.com');

CREATE POLICY "Admin can update menu_items" ON "public"."menu_items"
FOR UPDATE TO authenticated USING (auth.jwt()->>'email' = 'admin@admin.com') WITH CHECK (auth.jwt()->>'email' = 'admin@admin.com');

CREATE POLICY "Admin can delete menu_items" ON "public"."menu_items"
FOR DELETE TO authenticated USING (auth.jwt()->>'email' = 'admin@admin.com');


-- 3. OPTION GROUPS
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON "public"."option_groups";
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON "public"."option_groups";
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON "public"."option_groups";

CREATE POLICY "Admin can insert option_groups" ON "public"."option_groups"
FOR INSERT TO authenticated WITH CHECK (auth.jwt()->>'email' = 'admin@admin.com');

CREATE POLICY "Admin can update option_groups" ON "public"."option_groups"
FOR UPDATE TO authenticated USING (auth.jwt()->>'email' = 'admin@admin.com') WITH CHECK (auth.jwt()->>'email' = 'admin@admin.com');

CREATE POLICY "Admin can delete option_groups" ON "public"."option_groups"
FOR DELETE TO authenticated USING (auth.jwt()->>'email' = 'admin@admin.com');


-- 4. OPTIONS
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON "public"."options";
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON "public"."options";
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON "public"."options";

CREATE POLICY "Admin can insert options" ON "public"."options"
FOR INSERT TO authenticated WITH CHECK (auth.jwt()->>'email' = 'admin@admin.com');

CREATE POLICY "Admin can update options" ON "public"."options"
FOR UPDATE TO authenticated USING (auth.jwt()->>'email' = 'admin@admin.com') WITH CHECK (auth.jwt()->>'email' = 'admin@admin.com');

CREATE POLICY "Admin can delete options" ON "public"."options"
FOR DELETE TO authenticated USING (auth.jwt()->>'email' = 'admin@admin.com');


-- 5. TEMPLATES
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON "public"."option_group_templates";
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON "public"."option_group_templates";
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON "public"."option_group_templates";

CREATE POLICY "Admin can insert option_group_templates" ON "public"."option_group_templates"
FOR INSERT TO authenticated WITH CHECK (auth.jwt()->>'email' = 'admin@admin.com');

CREATE POLICY "Admin can update option_group_templates" ON "public"."option_group_templates"
FOR UPDATE TO authenticated USING (auth.jwt()->>'email' = 'admin@admin.com') WITH CHECK (auth.jwt()->>'email' = 'admin@admin.com');

CREATE POLICY "Admin can delete option_group_templates" ON "public"."option_group_templates"
FOR DELETE TO authenticated USING (auth.jwt()->>'email' = 'admin@admin.com');


-- 6. TEMPLATE OPTIONS
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON "public"."option_template_options";
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON "public"."option_template_options";
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON "public"."option_template_options";

CREATE POLICY "Admin can insert option_template_options" ON "public"."option_template_options"
FOR INSERT TO authenticated WITH CHECK (auth.jwt()->>'email' = 'admin@admin.com');

CREATE POLICY "Admin can update option_template_options" ON "public"."option_template_options"
FOR UPDATE TO authenticated USING (auth.jwt()->>'email' = 'admin@admin.com') WITH CHECK (auth.jwt()->>'email' = 'admin@admin.com');

CREATE POLICY "Admin can delete option_template_options" ON "public"."option_template_options"
FOR DELETE TO authenticated USING (auth.jwt()->>'email' = 'admin@admin.com');


-- 7. TEMPLATE LINKS
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON "public"."item_option_template_links";
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON "public"."item_option_template_links";

CREATE POLICY "Admin can insert item_option_template_links" ON "public"."item_option_template_links"
FOR INSERT TO authenticated WITH CHECK (auth.jwt()->>'email' = 'admin@admin.com');

CREATE POLICY "Admin can delete item_option_template_links" ON "public"."item_option_template_links"
FOR DELETE TO authenticated USING (auth.jwt()->>'email' = 'admin@admin.com');
