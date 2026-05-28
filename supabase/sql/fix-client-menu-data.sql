-- ==============================================================================
-- FIX CLIENT MENU DATA
-- This script safely cleans up specific known data issues without breaking other data.
-- ==============================================================================

DO $$
DECLARE
    chicken_cat_id UUID;
    fish_cat_id UUID;
BEGIN
    -- 1. Get the category IDs
    SELECT id INTO chicken_cat_id FROM public.categories WHERE name = 'وجبات دجاج' LIMIT 1;
    SELECT id INTO fish_cat_id FROM public.categories WHERE name = 'الاسماك' LIMIT 1;

    -- 2. Move specifically misplaced chicken items from "الاسماك" to "وجبات دجاج"
    -- Only update specific known misplaced items
    IF chicken_cat_id IS NOT NULL AND fish_cat_id IS NOT NULL THEN
        UPDATE public.menu_items
        SET category_id = chicken_cat_id
        WHERE category_id = fish_cat_id
          AND name IN ('مندي دجاج/ نصف', 'مظبي دجاج/ نصف', 'مندي دجاج حبة', 'مظبي دجاج حبة', 'مندي دجاج', 'مظبي دجاج');
    END IF;

    -- 3. Fix base_price = 0 for variant-required items
    -- Find items that have a required variant group and their base_price is currently exactly 0.
    -- Set them to NULL so the UI correctly shows "اختر النوع".
    UPDATE public.menu_items
    SET base_price = NULL
    WHERE base_price = 0
      AND id IN (
          SELECT item_id 
          FROM public.option_groups 
          WHERE kind = 'variant' 
            AND is_required = true 
            AND is_active = true
      );

END $$;
