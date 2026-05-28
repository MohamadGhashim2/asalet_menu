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

-- Enable RLS
ALTER TABLE option_group_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE option_template_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_option_template_links ENABLE ROW LEVEL SECURITY;

-- Create policies (Public can read, authenticated can do everything)
CREATE POLICY "Public read access for option_group_templates" ON option_group_templates FOR SELECT USING (true);
CREATE POLICY "Admin full access for option_group_templates" ON option_group_templates FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Public read access for option_template_options" ON option_template_options FOR SELECT USING (true);
CREATE POLICY "Admin full access for option_template_options" ON option_template_options FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Public read access for item_option_template_links" ON item_option_template_links FOR SELECT USING (true);
CREATE POLICY "Admin full access for item_option_template_links" ON item_option_template_links FOR ALL TO authenticated USING (true) WITH CHECK (true);
