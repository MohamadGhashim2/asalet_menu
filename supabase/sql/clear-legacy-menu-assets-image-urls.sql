-- Clear legacy local image assets from menu items
update public.menu_items
set image_url = null
where image_url like '/menu-assets/%';

-- Clear legacy local image assets from categories
update public.categories
set image_url = null
where image_url like '/menu-assets/%';
