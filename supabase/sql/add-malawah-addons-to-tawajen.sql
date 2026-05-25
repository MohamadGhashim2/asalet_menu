DO $$
DECLARE
    item_record RECORD;
    new_group_id uuid;
    group_exists boolean;
BEGIN
    FOR item_record IN
        SELECT m.id, m.name 
        FROM menu_items m
        JOIN categories c ON m.category_id = c.id
        WHERE c.name LIKE '%طواجن%'
    LOOP
        -- Check if group "الإضافات المدفوعة" exists for this item
        SELECT EXISTS (
            SELECT 1 FROM item_option_groups 
            WHERE item_id = item_record.id 
            AND title = 'الإضافات المدفوعة'
        ) INTO group_exists;

        IF NOT group_exists THEN
            -- Create the group
            INSERT INTO item_option_groups (item_id, title, kind, selection_type, is_required, min_select, max_select)
            VALUES (item_record.id, 'الإضافات المدفوعة', 'addon', 'multiple', false, 0, null)
            RETURNING id INTO new_group_id;
        ELSE
            -- Get the existing group id
            SELECT id INTO new_group_id 
            FROM item_option_groups 
            WHERE item_id = item_record.id 
            AND title = 'الإضافات المدفوعة'
            LIMIT 1;
        END IF;

        -- Insert "ملوح كبير (إضافي)" if not exists
        IF NOT EXISTS (
            SELECT 1 FROM item_options 
            WHERE group_id = new_group_id 
            AND name = 'ملوح كبير (إضافي)'
        ) THEN
            INSERT INTO item_options (group_id, name, price)
            VALUES (new_group_id, 'ملوح كبير (إضافي)', 150);
        END IF;

        -- Insert "ملوح صغير (إضافي)" if not exists
        IF NOT EXISTS (
            SELECT 1 FROM item_options 
            WHERE group_id = new_group_id 
            AND name = 'ملوح صغير (إضافي)'
        ) THEN
            INSERT INTO item_options (group_id, name, price)
            VALUES (new_group_id, 'ملوح صغير (إضافي)', 110);
        END IF;

    END LOOP;
END $$;
