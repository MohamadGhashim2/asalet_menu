-- Schema for MVP QR Menu

-- Create tables
CREATE TABLE IF NOT EXISTS restaurant_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  whatsapp text,
  currency text DEFAULT 'ر.س',
  tax_rate numeric DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  image_url text,
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS menu_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid REFERENCES categories(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  base_price numeric, -- nullable
  image_url text,
  is_available boolean DEFAULT true,
  is_featured boolean DEFAULT false,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS restaurant_tables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  code text NOT NULL UNIQUE,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS item_option_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid REFERENCES menu_items(id) ON DELETE CASCADE,
  title text NOT NULL,
  kind text CHECK (kind IN ('variant', 'addon', 'modifier')),
  selection_type text CHECK (selection_type IN ('single', 'multiple')),
  is_required boolean DEFAULT false,
  min_select integer DEFAULT 0,
  max_select integer,
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS item_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid REFERENCES item_option_groups(id) ON DELETE CASCADE,
  name text NOT NULL,
  price numeric DEFAULT 0,
  is_default boolean DEFAULT false,
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS categories_active_sort_order_idx ON categories (is_active, sort_order);
CREATE INDEX IF NOT EXISTS menu_items_category_available_sort_order_idx ON menu_items (category_id, is_available, sort_order);
CREATE INDEX IF NOT EXISTS item_option_groups_item_active_sort_order_idx ON item_option_groups (item_id, is_active, sort_order);
CREATE INDEX IF NOT EXISTS item_options_group_active_sort_order_idx ON item_options (group_id, is_active, sort_order);
CREATE INDEX IF NOT EXISTS restaurant_tables_active_code_idx ON restaurant_tables (code, is_active);

-- Enable RLS
ALTER TABLE restaurant_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurant_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_option_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_options ENABLE ROW LEVEL SECURITY;

-- Replace admin@admin.com with the real admin email before running this schema.
-- The production hardening migration also rebuilds these policies safely on existing databases.

CREATE POLICY "Public read access for restaurant_settings" ON restaurant_settings FOR SELECT TO anon USING (true);
CREATE POLICY "Admin can read restaurant_settings" ON restaurant_settings FOR SELECT TO authenticated USING ((select auth.jwt()) ->> 'email' = 'admin@admin.com');
CREATE POLICY "Admin can insert restaurant_settings" ON restaurant_settings FOR INSERT TO authenticated WITH CHECK ((select auth.jwt()) ->> 'email' = 'admin@admin.com');
CREATE POLICY "Admin can update restaurant_settings" ON restaurant_settings FOR UPDATE TO authenticated USING ((select auth.jwt()) ->> 'email' = 'admin@admin.com') WITH CHECK ((select auth.jwt()) ->> 'email' = 'admin@admin.com');
CREATE POLICY "Admin can delete restaurant_settings" ON restaurant_settings FOR DELETE TO authenticated USING ((select auth.jwt()) ->> 'email' = 'admin@admin.com');

CREATE POLICY "Public read access for categories" ON categories FOR SELECT TO anon USING (is_active = true);
CREATE POLICY "Admin can read categories" ON categories FOR SELECT TO authenticated USING ((select auth.jwt()) ->> 'email' = 'admin@admin.com');
CREATE POLICY "Admin can insert categories" ON categories FOR INSERT TO authenticated WITH CHECK ((select auth.jwt()) ->> 'email' = 'admin@admin.com');
CREATE POLICY "Admin can update categories" ON categories FOR UPDATE TO authenticated USING ((select auth.jwt()) ->> 'email' = 'admin@admin.com') WITH CHECK ((select auth.jwt()) ->> 'email' = 'admin@admin.com');
CREATE POLICY "Admin can delete categories" ON categories FOR DELETE TO authenticated USING ((select auth.jwt()) ->> 'email' = 'admin@admin.com');

CREATE POLICY "Public read access for menu_items" ON menu_items FOR SELECT TO anon USING (
  is_available = true
  AND EXISTS (SELECT 1 FROM categories WHERE categories.id = menu_items.category_id AND categories.is_active = true)
);
CREATE POLICY "Admin can read menu_items" ON menu_items FOR SELECT TO authenticated USING ((select auth.jwt()) ->> 'email' = 'admin@admin.com');
CREATE POLICY "Admin can insert menu_items" ON menu_items FOR INSERT TO authenticated WITH CHECK ((select auth.jwt()) ->> 'email' = 'admin@admin.com');
CREATE POLICY "Admin can update menu_items" ON menu_items FOR UPDATE TO authenticated USING ((select auth.jwt()) ->> 'email' = 'admin@admin.com') WITH CHECK ((select auth.jwt()) ->> 'email' = 'admin@admin.com');
CREATE POLICY "Admin can delete menu_items" ON menu_items FOR DELETE TO authenticated USING ((select auth.jwt()) ->> 'email' = 'admin@admin.com');

CREATE POLICY "Public can read active restaurant tables" ON restaurant_tables FOR SELECT TO anon USING (is_active = true);
CREATE POLICY "Admin can read restaurant tables" ON restaurant_tables FOR SELECT TO authenticated USING ((select auth.jwt()) ->> 'email' = 'admin@admin.com');
CREATE POLICY "Admin can insert restaurant tables" ON restaurant_tables FOR INSERT TO authenticated WITH CHECK ((select auth.jwt()) ->> 'email' = 'admin@admin.com');
CREATE POLICY "Admin can update restaurant tables" ON restaurant_tables FOR UPDATE TO authenticated USING ((select auth.jwt()) ->> 'email' = 'admin@admin.com') WITH CHECK ((select auth.jwt()) ->> 'email' = 'admin@admin.com');
CREATE POLICY "Admin can delete restaurant tables" ON restaurant_tables FOR DELETE TO authenticated USING ((select auth.jwt()) ->> 'email' = 'admin@admin.com');

CREATE POLICY "Public read access for item_option_groups" ON item_option_groups FOR SELECT TO anon USING (
  is_active = true
  AND EXISTS (SELECT 1 FROM menu_items WHERE menu_items.id = item_option_groups.item_id AND menu_items.is_available = true)
);
CREATE POLICY "Admin can read item_option_groups" ON item_option_groups FOR SELECT TO authenticated USING ((select auth.jwt()) ->> 'email' = 'admin@admin.com');
CREATE POLICY "Admin can insert item_option_groups" ON item_option_groups FOR INSERT TO authenticated WITH CHECK ((select auth.jwt()) ->> 'email' = 'admin@admin.com');
CREATE POLICY "Admin can update item_option_groups" ON item_option_groups FOR UPDATE TO authenticated USING ((select auth.jwt()) ->> 'email' = 'admin@admin.com') WITH CHECK ((select auth.jwt()) ->> 'email' = 'admin@admin.com');
CREATE POLICY "Admin can delete item_option_groups" ON item_option_groups FOR DELETE TO authenticated USING ((select auth.jwt()) ->> 'email' = 'admin@admin.com');

CREATE POLICY "Public read access for item_options" ON item_options FOR SELECT TO anon USING (
  is_active = true
  AND EXISTS (
    SELECT 1
    FROM item_option_groups
    JOIN menu_items ON menu_items.id = item_option_groups.item_id
    WHERE item_option_groups.id = item_options.group_id
      AND item_option_groups.is_active = true
      AND menu_items.is_available = true
  )
);
CREATE POLICY "Admin can read item_options" ON item_options FOR SELECT TO authenticated USING ((select auth.jwt()) ->> 'email' = 'admin@admin.com');
CREATE POLICY "Admin can insert item_options" ON item_options FOR INSERT TO authenticated WITH CHECK ((select auth.jwt()) ->> 'email' = 'admin@admin.com');
CREATE POLICY "Admin can update item_options" ON item_options FOR UPDATE TO authenticated USING ((select auth.jwt()) ->> 'email' = 'admin@admin.com') WITH CHECK ((select auth.jwt()) ->> 'email' = 'admin@admin.com');
CREATE POLICY "Admin can delete item_options" ON item_options FOR DELETE TO authenticated USING ((select auth.jwt()) ->> 'email' = 'admin@admin.com');

-- Insert default restaurant settings row
INSERT INTO restaurant_settings (whatsapp, currency)
SELECT '', 'ر.س'
WHERE NOT EXISTS (SELECT 1 FROM restaurant_settings);

-- Storage setup
-- Create bucket if you are able to run this as superuser, otherwise do it from the dashboard.
INSERT INTO storage.buckets (id, name, public) VALUES ('menu-images', 'menu-images', true) ON CONFLICT DO NOTHING;

CREATE POLICY "Public read access for menu-images" ON storage.objects FOR SELECT USING (bucket_id = 'menu-images');
CREATE POLICY "Admin can insert menu-images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (
  bucket_id = 'menu-images'
  AND (storage.foldername(name))[1] IN ('items', 'categories')
  AND (select auth.jwt()) ->> 'email' = 'admin@admin.com'
);
CREATE POLICY "Admin can update menu-images" ON storage.objects FOR UPDATE TO authenticated USING (
  bucket_id = 'menu-images'
  AND (storage.foldername(name))[1] IN ('items', 'categories')
  AND (select auth.jwt()) ->> 'email' = 'admin@admin.com'
) WITH CHECK (
  bucket_id = 'menu-images'
  AND (storage.foldername(name))[1] IN ('items', 'categories')
  AND (select auth.jwt()) ->> 'email' = 'admin@admin.com'
);
CREATE POLICY "Admin can delete menu-images" ON storage.objects FOR DELETE TO authenticated USING (
  bucket_id = 'menu-images'
  AND (storage.foldername(name))[1] IN ('items', 'categories')
  AND (select auth.jwt()) ->> 'email' = 'admin@admin.com'
);
