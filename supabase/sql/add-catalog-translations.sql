-- =============================================================================
-- CATALOG TRANSLATIONS
--
-- Arabic remains in the existing catalog tables. This migration adds optional
-- translations for any supported locale, including `en` and `tr`.
--
-- Before running: replace admin@admin.com with the real admin email used by
-- your existing RLS policies.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.category_translations (
  category_id uuid NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  locale text NOT NULL CHECK (locale ~ '^[a-z]{2}(-[A-Z]{2})?$'),
  name text NOT NULL CHECK (btrim(name) <> ''),
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (category_id, locale)
);

CREATE TABLE IF NOT EXISTS public.menu_item_translations (
  menu_item_id uuid NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
  locale text NOT NULL CHECK (locale ~ '^[a-z]{2}(-[A-Z]{2})?$'),
  name text NOT NULL CHECK (btrim(name) <> ''),
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (menu_item_id, locale)
);

CREATE TABLE IF NOT EXISTS public.item_option_group_translations (
  item_option_group_id uuid NOT NULL REFERENCES public.item_option_groups(id) ON DELETE CASCADE,
  locale text NOT NULL CHECK (locale ~ '^[a-z]{2}(-[A-Z]{2})?$'),
  title text NOT NULL CHECK (btrim(title) <> ''),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (item_option_group_id, locale)
);

CREATE TABLE IF NOT EXISTS public.item_option_translations (
  item_option_id uuid NOT NULL REFERENCES public.item_options(id) ON DELETE CASCADE,
  locale text NOT NULL CHECK (locale ~ '^[a-z]{2}(-[A-Z]{2})?$'),
  name text NOT NULL CHECK (btrim(name) <> ''),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (item_option_id, locale)
);

CREATE TABLE IF NOT EXISTS public.option_group_template_translations (
  option_group_template_id uuid NOT NULL REFERENCES public.option_group_templates(id) ON DELETE CASCADE,
  locale text NOT NULL CHECK (locale ~ '^[a-z]{2}(-[A-Z]{2})?$'),
  display_title text NOT NULL CHECK (btrim(display_title) <> ''),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (option_group_template_id, locale)
);

CREATE TABLE IF NOT EXISTS public.option_template_option_translations (
  option_template_option_id uuid NOT NULL REFERENCES public.option_template_options(id) ON DELETE CASCADE,
  locale text NOT NULL CHECK (locale ~ '^[a-z]{2}(-[A-Z]{2})?$'),
  name text NOT NULL CHECK (btrim(name) <> ''),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (option_template_option_id, locale)
);

-- The composite primary keys serve record-plus-locale lookups. Locale indexes
-- cover the public menu's one-locale bulk reads.
CREATE INDEX IF NOT EXISTS category_translations_locale_idx ON public.category_translations (locale);
CREATE INDEX IF NOT EXISTS menu_item_translations_locale_idx ON public.menu_item_translations (locale);
CREATE INDEX IF NOT EXISTS item_option_group_translations_locale_idx ON public.item_option_group_translations (locale);
CREATE INDEX IF NOT EXISTS item_option_translations_locale_idx ON public.item_option_translations (locale);
CREATE INDEX IF NOT EXISTS option_group_template_translations_locale_idx ON public.option_group_template_translations (locale);
CREATE INDEX IF NOT EXISTS option_template_option_translations_locale_idx ON public.option_template_option_translations (locale);

ALTER TABLE public.category_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_item_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.item_option_group_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.item_option_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.option_group_template_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.option_template_option_translations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read active category translations" ON public.category_translations;
CREATE POLICY "Public can read active category translations"
ON public.category_translations FOR SELECT TO anon
USING (EXISTS (
  SELECT 1 FROM public.categories
  WHERE categories.id = category_translations.category_id
    AND categories.is_active = true
));

DROP POLICY IF EXISTS "Public can read available item translations" ON public.menu_item_translations;
CREATE POLICY "Public can read available item translations"
ON public.menu_item_translations FOR SELECT TO anon
USING (EXISTS (
  SELECT 1 FROM public.menu_items
  JOIN public.categories ON categories.id = menu_items.category_id
  WHERE menu_items.id = menu_item_translations.menu_item_id
    AND menu_items.is_available = true
    AND categories.is_active = true
));

DROP POLICY IF EXISTS "Public can read active option group translations" ON public.item_option_group_translations;
CREATE POLICY "Public can read active option group translations"
ON public.item_option_group_translations FOR SELECT TO anon
USING (EXISTS (
  SELECT 1 FROM public.item_option_groups
  JOIN public.menu_items ON menu_items.id = item_option_groups.item_id
  JOIN public.categories ON categories.id = menu_items.category_id
  WHERE item_option_groups.id = item_option_group_translations.item_option_group_id
    AND item_option_groups.is_active = true
    AND menu_items.is_available = true
    AND categories.is_active = true
));

DROP POLICY IF EXISTS "Public can read active option translations" ON public.item_option_translations;
CREATE POLICY "Public can read active option translations"
ON public.item_option_translations FOR SELECT TO anon
USING (EXISTS (
  SELECT 1 FROM public.item_options
  JOIN public.item_option_groups ON item_option_groups.id = item_options.group_id
  JOIN public.menu_items ON menu_items.id = item_option_groups.item_id
  JOIN public.categories ON categories.id = menu_items.category_id
  WHERE item_options.id = item_option_translations.item_option_id
    AND item_options.is_active = true
    AND item_option_groups.is_active = true
    AND menu_items.is_available = true
    AND categories.is_active = true
));

DROP POLICY IF EXISTS "Public can read active template translations" ON public.option_group_template_translations;
CREATE POLICY "Public can read active template translations"
ON public.option_group_template_translations FOR SELECT TO anon
USING (EXISTS (
  SELECT 1 FROM public.option_group_templates
  WHERE option_group_templates.id = option_group_template_translations.option_group_template_id
    AND option_group_templates.is_active = true
));

DROP POLICY IF EXISTS "Public can read active template option translations" ON public.option_template_option_translations;
CREATE POLICY "Public can read active template option translations"
ON public.option_template_option_translations FOR SELECT TO anon
USING (EXISTS (
  SELECT 1 FROM public.option_template_options
  JOIN public.option_group_templates ON option_group_templates.id = option_template_options.template_id
  WHERE option_template_options.id = option_template_option_translations.option_template_option_id
    AND option_template_options.is_active = true
    AND option_group_templates.is_active = true
));

DO $$
DECLARE
  target_table text;
BEGIN
  FOREACH target_table IN ARRAY ARRAY[
    'category_translations',
    'menu_item_translations',
    'item_option_group_translations',
    'item_option_translations',
    'option_group_template_translations',
    'option_template_option_translations'
  ]
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Admin can read ' || target_table, target_table);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Admin can insert ' || target_table, target_table);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Admin can update ' || target_table, target_table);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Admin can delete ' || target_table, target_table);
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
