-- Add live option templates system

CREATE TABLE IF NOT EXISTS option_group_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_name text NOT NULL,
  display_title text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('variant', 'addon', 'modifier')),
  selection_type text NOT NULL CHECK (selection_type IN ('single', 'multiple')),
  is_required boolean NOT NULL DEFAULT false,
  min_select int NOT NULL DEFAULT 0,
  max_select int,
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS option_template_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES option_group_templates(id) ON DELETE CASCADE,
  name text NOT NULL,
  price numeric(10,2) NOT NULL DEFAULT 0,
  is_default boolean NOT NULL DEFAULT false,
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS item_option_template_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  template_id uuid NOT NULL REFERENCES option_group_templates(id) ON DELETE CASCADE,
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(item_id, template_id)
);

CREATE INDEX IF NOT EXISTS option_group_templates_active_sort_order_idx ON option_group_templates (is_active, sort_order);
CREATE INDEX IF NOT EXISTS option_template_options_template_active_sort_order_idx ON option_template_options (template_id, is_active, sort_order);
CREATE INDEX IF NOT EXISTS item_option_template_links_item_active_sort_order_idx ON item_option_template_links (item_id, is_active, sort_order);

-- Enable RLS
ALTER TABLE option_group_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE option_template_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_option_template_links ENABLE ROW LEVEL SECURITY;

-- Replace admin@admin.com with the real admin email before running this schema.
CREATE POLICY "Public read access for option_group_templates" ON option_group_templates FOR SELECT TO anon USING (is_active = true);
CREATE POLICY "Admin can read option_group_templates" ON option_group_templates FOR SELECT TO authenticated USING ((select auth.jwt()) ->> 'email' = 'admin@admin.com');
CREATE POLICY "Admin can insert option_group_templates" ON option_group_templates FOR INSERT TO authenticated WITH CHECK ((select auth.jwt()) ->> 'email' = 'admin@admin.com');
CREATE POLICY "Admin can update option_group_templates" ON option_group_templates FOR UPDATE TO authenticated USING ((select auth.jwt()) ->> 'email' = 'admin@admin.com') WITH CHECK ((select auth.jwt()) ->> 'email' = 'admin@admin.com');
CREATE POLICY "Admin can delete option_group_templates" ON option_group_templates FOR DELETE TO authenticated USING ((select auth.jwt()) ->> 'email' = 'admin@admin.com');

CREATE POLICY "Public read access for option_template_options" ON option_template_options FOR SELECT TO anon USING (
  is_active = true
  AND EXISTS (SELECT 1 FROM option_group_templates WHERE option_group_templates.id = option_template_options.template_id AND option_group_templates.is_active = true)
);
CREATE POLICY "Admin can read option_template_options" ON option_template_options FOR SELECT TO authenticated USING ((select auth.jwt()) ->> 'email' = 'admin@admin.com');
CREATE POLICY "Admin can insert option_template_options" ON option_template_options FOR INSERT TO authenticated WITH CHECK ((select auth.jwt()) ->> 'email' = 'admin@admin.com');
CREATE POLICY "Admin can update option_template_options" ON option_template_options FOR UPDATE TO authenticated USING ((select auth.jwt()) ->> 'email' = 'admin@admin.com') WITH CHECK ((select auth.jwt()) ->> 'email' = 'admin@admin.com');
CREATE POLICY "Admin can delete option_template_options" ON option_template_options FOR DELETE TO authenticated USING ((select auth.jwt()) ->> 'email' = 'admin@admin.com');

CREATE POLICY "Public read access for item_option_template_links" ON item_option_template_links FOR SELECT TO anon USING (
  is_active = true
  AND EXISTS (SELECT 1 FROM menu_items WHERE menu_items.id = item_option_template_links.item_id AND menu_items.is_available = true)
  AND EXISTS (SELECT 1 FROM option_group_templates WHERE option_group_templates.id = item_option_template_links.template_id AND option_group_templates.is_active = true)
);
CREATE POLICY "Admin can read item_option_template_links" ON item_option_template_links FOR SELECT TO authenticated USING ((select auth.jwt()) ->> 'email' = 'admin@admin.com');
CREATE POLICY "Admin can insert item_option_template_links" ON item_option_template_links FOR INSERT TO authenticated WITH CHECK ((select auth.jwt()) ->> 'email' = 'admin@admin.com');
CREATE POLICY "Admin can update item_option_template_links" ON item_option_template_links FOR UPDATE TO authenticated USING ((select auth.jwt()) ->> 'email' = 'admin@admin.com') WITH CHECK ((select auth.jwt()) ->> 'email' = 'admin@admin.com');
CREATE POLICY "Admin can delete item_option_template_links" ON item_option_template_links FOR DELETE TO authenticated USING ((select auth.jwt()) ->> 'email' = 'admin@admin.com');
