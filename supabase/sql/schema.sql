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

-- Enable RLS
ALTER TABLE restaurant_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_option_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_options ENABLE ROW LEVEL SECURITY;

-- Create policies (Public can read, authenticated can do everything)
-- Note: Assuming authenticated users are admins for this single-client MVP

CREATE POLICY "Public read access for restaurant_settings" ON restaurant_settings FOR SELECT USING (true);
CREATE POLICY "Admin full access for restaurant_settings" ON restaurant_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Public read access for categories" ON categories FOR SELECT USING (true);
CREATE POLICY "Admin full access for categories" ON categories FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Public read access for menu_items" ON menu_items FOR SELECT USING (true);
CREATE POLICY "Admin full access for menu_items" ON menu_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Public read access for item_option_groups" ON item_option_groups FOR SELECT USING (true);
CREATE POLICY "Admin full access for item_option_groups" ON item_option_groups FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Public read access for item_options" ON item_options FOR SELECT USING (true);
CREATE POLICY "Admin full access for item_options" ON item_options FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Insert default restaurant settings row
INSERT INTO restaurant_settings (whatsapp, currency) VALUES ('', 'ر.س') ON CONFLICT DO NOTHING;

-- Storage setup
-- Create bucket if you are able to run this as superuser, otherwise do it from the dashboard.
INSERT INTO storage.buckets (id, name, public) VALUES ('menu-images', 'menu-images', true) ON CONFLICT DO NOTHING;

CREATE POLICY "Public read access for menu-images" ON storage.objects FOR SELECT USING (bucket_id = 'menu-images');
CREATE POLICY "Admin full access for menu-images" ON storage.objects FOR ALL TO authenticated USING (bucket_id = 'menu-images') WITH CHECK (bucket_id = 'menu-images');
