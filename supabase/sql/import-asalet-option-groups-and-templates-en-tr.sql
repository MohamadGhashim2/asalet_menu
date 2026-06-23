-- =============================================================================
-- AS ALET: OPTION GROUP + TEMPLATE TRANSLATIONS (ENGLISH + TURKISH)
-- Generated from the live public-menu payload on 2026-06-24.
--
-- Prerequisite: add-catalog-translations.sql must already be applied.
-- Safe to re-run: all rows use UPSERT.
-- =============================================================================

begin;

insert into public.item_option_group_translations (item_option_group_id, locale, title, updated_at)
values
  ('c33808ad-2da0-45a0-b407-69e204f2c091', 'en', 'Add-ons', now()),
  ('c33808ad-2da0-45a0-b407-69e204f2c091', 'tr', 'Ekstralar', now()),
  ('947951b6-1f54-4998-99d1-a7efed2c80b7', 'en', 'Choices', now()),
  ('947951b6-1f54-4998-99d1-a7efed2c80b7', 'tr', 'Seçenekler', now()),
  ('2b816867-2bf5-444a-aa8c-d891bdd13cb9', 'en', 'Choices', now()),
  ('2b816867-2bf5-444a-aa8c-d891bdd13cb9', 'tr', 'Seçenekler', now()),
  ('1cb2b865-9e7f-4a0c-b2cd-ff00ca9cd408', 'en', 'Paid Add-ons', now()),
  ('1cb2b865-9e7f-4a0c-b2cd-ff00ca9cd408', 'tr', 'Ücretli Ekstralar', now()),
  ('31f6a48b-a1b3-4140-a4ec-3868d9e35537', 'en', 'Paid Add-ons', now()),
  ('31f6a48b-a1b3-4140-a4ec-3868d9e35537', 'tr', 'Ücretli Ekstralar', now()),
  ('053d03d0-7eef-4a17-80ea-555c24d6180d', 'en', 'Paid Add-ons', now()),
  ('053d03d0-7eef-4a17-80ea-555c24d6180d', 'tr', 'Ücretli Ekstralar', now()),
  ('5288526a-8d37-4621-90b6-004e00ebfc0c', 'en', 'Paid Add-ons', now()),
  ('5288526a-8d37-4621-90b6-004e00ebfc0c', 'tr', 'Ücretli Ekstralar', now()),
  ('6c0841bc-2333-4de5-b10d-4d463628399e', 'en', 'Add-ons', now()),
  ('6c0841bc-2333-4de5-b10d-4d463628399e', 'tr', 'Ekstralar', now()),
  ('ca6d8d30-6a2c-45d8-acdc-c830f4c2d0f8', 'en', 'Choices', now()),
  ('ca6d8d30-6a2c-45d8-acdc-c830f4c2d0f8', 'tr', 'Seçenekler', now())
on conflict (item_option_group_id, locale) do update
set title = excluded.title,
    updated_at = now();

insert into public.item_option_translations (item_option_id, locale, name, updated_at)
values
  ('b780d970-5139-4348-83e7-16b46eefcc27', 'en', 'Madghoot Rice', now()),
  ('b780d970-5139-4348-83e7-16b46eefcc27', 'tr', 'Madghoot Pilavı', now()),
  ('23afbefb-06e0-4db6-8686-5617f8efba62', 'en', 'Dried Beans', now()),
  ('23afbefb-06e0-4db6-8686-5617f8efba62', 'tr', 'Kuru Fasulye', now()),
  ('45ae7374-f089-447d-8e91-91b2744183a3', 'en', 'Extra Sahawiq', now()),
  ('45ae7374-f089-447d-8e91-91b2744183a3', 'tr', 'Ek Sahawiq', now()),
  ('f72b78f0-5ee5-4fd8-b48d-79e28980806c', 'en', 'Nuts', now()),
  ('f72b78f0-5ee5-4fd8-b48d-79e28980806c', 'tr', 'Kuruyemiş', now()),
  ('5af67442-9090-4448-b535-6441d40500e0', 'en', 'Zurbian Rice', now()),
  ('5af67442-9090-4448-b535-6441d40500e0', 'tr', 'Zurbian Pilavı', now()),
  ('02cf64d8-6979-4c8a-b8a5-4aaf7f5e6b13', 'en', 'Large Malawah (Extra)', now()),
  ('02cf64d8-6979-4c8a-b8a5-4aaf7f5e6b13', 'tr', 'Büyük Malawah (Ekstra)', now()),
  ('94641442-4d91-4087-9c4b-343405f3fe48', 'en', 'Small Malawah (Extra)', now()),
  ('94641442-4d91-4087-9c4b-343405f3fe48', 'tr', 'Küçük Malawah (Ekstra)', now()),
  ('332999c7-dc9c-4454-aa16-087e9b535131', 'en', 'Large Malawah (Extra)', now()),
  ('332999c7-dc9c-4454-aa16-087e9b535131', 'tr', 'Büyük Malawah (Ekstra)', now()),
  ('96ac41cd-74d4-4ac1-b77a-a652641a8d1a', 'en', 'Mandi Rice', now()),
  ('96ac41cd-74d4-4ac1-b77a-a652641a8d1a', 'tr', 'Mandi Pilavı', now()),
  ('3a72f4d0-0851-4c38-bf1c-27d3d709c3f7', 'en', 'Small Malawah (Extra)', now()),
  ('3a72f4d0-0851-4c38-bf1c-27d3d709c3f7', 'tr', 'Küçük Malawah (Ekstra)', now()),
  ('bba9b7aa-9157-478e-8920-3783f61c5565', 'en', 'Large Malawah (Extra)', now()),
  ('bba9b7aa-9157-478e-8920-3783f61c5565', 'tr', 'Büyük Malawah (Ekstra)', now()),
  ('78549ae9-ef00-49cb-a8c3-7ac5e0ae4ed6', 'en', 'Small Malawah (Extra)', now()),
  ('78549ae9-ef00-49cb-a8c3-7ac5e0ae4ed6', 'tr', 'Küçük Malawah (Ekstra)', now()),
  ('07d47f0f-8150-4a8c-ad09-4809a63524c2', 'en', 'Large Malawah (Extra)', now()),
  ('07d47f0f-8150-4a8c-ad09-4809a63524c2', 'tr', 'Büyük Malawah (Ekstra)', now()),
  ('b8033328-cbb7-4c77-8b4b-a957698c6506', 'en', 'Zurbian Rice', now()),
  ('b8033328-cbb7-4c77-8b4b-a957698c6506', 'tr', 'Zurbian Pilavı', now()),
  ('2e97e3bb-2463-4231-a004-f0347f15dc53', 'en', 'Small Malawah (Extra)', now()),
  ('2e97e3bb-2463-4231-a004-f0347f15dc53', 'tr', 'Küçük Malawah (Ekstra)', now()),
  ('8855ba23-9b25-47a5-8ae4-b5700383a556', 'en', 'Nuts', now()),
  ('8855ba23-9b25-47a5-8ae4-b5700383a556', 'tr', 'Kuruyemiş', now()),
  ('d0407a27-5d8c-478e-81d7-2f1a0254b198', 'en', 'Madghoot Rice', now()),
  ('d0407a27-5d8c-478e-81d7-2f1a0254b198', 'tr', 'Madghoot Pilavı', now()),
  ('1836a526-8cf7-4a92-aee4-38509b423521', 'en', 'Mandi Rice', now()),
  ('1836a526-8cf7-4a92-aee4-38509b423521', 'tr', 'Mandi Pilavı', now()),
  ('6ff03d89-7d39-4704-bdc6-c283f107aab5', 'en', 'Extra Sahawiq', now()),
  ('6ff03d89-7d39-4704-bdc6-c283f107aab5', 'tr', 'Ek Sahawiq', now()),
  ('1839fba5-c4d3-48ee-b93e-0652847e141c', 'en', 'Fresh Beans', now()),
  ('1839fba5-c4d3-48ee-b93e-0652847e141c', 'tr', 'Taze Fasulye', now())
on conflict (item_option_id, locale) do update
set name = excluded.name,
    updated_at = now();

insert into public.option_group_template_translations (option_group_template_id, locale, display_title, updated_at)
values
  ('c550d7ae-5e4b-4ed0-975e-7e4597453653', 'en', 'Paid Add-ons', now()),
  ('c550d7ae-5e4b-4ed0-975e-7e4597453653', 'tr', 'Ücretli Ekstralar', now()),
  ('af23093e-805f-4df7-a0fc-dd02a2941ee8', 'en', 'Paid Add-ons', now()),
  ('af23093e-805f-4df7-a0fc-dd02a2941ee8', 'tr', 'Ücretli Ekstralar', now()),
  ('22218484-ebfe-4118-b7f8-c5811e29bb2e', 'en', 'Extra Malawah', now()),
  ('22218484-ebfe-4118-b7f8-c5811e29bb2e', 'tr', 'Ekstra Malawah', now()),
  ('2de1e115-66a4-41f3-8b2c-845864f8e7bd', 'en', 'Choices', now()),
  ('2de1e115-66a4-41f3-8b2c-845864f8e7bd', 'tr', 'Seçenekler', now()),
  ('c51d7b97-3f89-4cf4-ab08-d33bed221685', 'en', 'Choices', now()),
  ('c51d7b97-3f89-4cf4-ab08-d33bed221685', 'tr', 'Seçenekler', now()),
  ('94e50f04-a671-4ab8-8c5b-ebe9d0b10ea2', 'en', 'Paid Add-on', now()),
  ('94e50f04-a671-4ab8-8c5b-ebe9d0b10ea2', 'tr', 'Ücretli Ekstra', now())
on conflict (option_group_template_id, locale) do update
set display_title = excluded.display_title,
    updated_at = now();

insert into public.option_template_option_translations (option_template_option_id, locale, name, updated_at)
values
  ('d28181ec-5a4e-4006-8b5f-44c31c151323', 'en', 'Extra Sahawiq', now()),
  ('d28181ec-5a4e-4006-8b5f-44c31c151323', 'tr', 'Ek Sahawiq', now()),
  ('62259a3c-8c1b-4aa3-b3a6-8e8c2d525dfc', 'en', 'Cucumber Yogurt', now()),
  ('62259a3c-8c1b-4aa3-b3a6-8e8c2d525dfc', 'tr', 'Salatalıklı Yoğurt', now()),
  ('bf681e2b-4081-40c6-8524-a7f65a97f56a', 'en', 'Nuts', now()),
  ('bf681e2b-4081-40c6-8524-a7f65a97f56a', 'tr', 'Kuruyemiş', now()),
  ('26ea7ecb-c7e2-4752-880c-37269b4bbc48', 'en', 'Meat Broth', now()),
  ('26ea7ecb-c7e2-4752-880c-37269b4bbc48', 'tr', 'Et Suyu', now()),
  ('9a499fb1-d0ed-440f-b709-9cb816a8d1e0', 'en', 'Includes Sahawiq, Cashews, and Cucumber Yogurt', now()),
  ('9a499fb1-d0ed-440f-b709-9cb816a8d1e0', 'tr', 'Sahawiq, Kaju ve Salatalıklı Yoğurt Dahil', now()),
  ('df7ac655-4c9d-4dfa-a2c7-24a0667b1057', 'en', 'Includes Sahawiq Only', now()),
  ('df7ac655-4c9d-4dfa-a2c7-24a0667b1057', 'tr', 'Yalnızca Sahawiq Dahil', now()),
  ('26bdc484-50fa-4ed6-abd0-7537255f064f', 'en', 'Large', now()),
  ('26bdc484-50fa-4ed6-abd0-7537255f064f', 'tr', 'Büyük', now()),
  ('628875d2-c333-42b8-a42e-802348cf4e69', 'en', 'Small', now()),
  ('628875d2-c333-42b8-a42e-802348cf4e69', 'tr', 'Küçük', now()),
  ('04cfbcba-ac4a-4643-9597-1337840bc6e1', 'en', 'Includes Sahawiq Only', now()),
  ('04cfbcba-ac4a-4643-9597-1337840bc6e1', 'tr', 'Yalnızca Sahawiq Dahil', now()),
  ('7be87867-e5b3-41f9-b83e-0fca317403ac', 'en', 'Includes Sahawiq, Cashews, and Cucumber Yogurt', now()),
  ('7be87867-e5b3-41f9-b83e-0fca317403ac', 'tr', 'Sahawiq, Kaju ve Salatalıklı Yoğurt Dahil', now()),
  ('c32de225-3e68-4039-8b0b-d045efb67b60', 'en', 'Extra Honey', now()),
  ('c32de225-3e68-4039-8b0b-d045efb67b60', 'tr', 'Ekstra Bal', now()),
  ('0db0a0dd-530b-4d63-b84e-62f991d8eee3', 'en', 'Cucumber Yogurt', now()),
  ('0db0a0dd-530b-4d63-b84e-62f991d8eee3', 'tr', 'Salatalıklı Yoğurt', now()),
  ('01db9d3a-2d1d-48b9-a94a-98ff272b82a6', 'en', 'Extra Sahawiq', now()),
  ('01db9d3a-2d1d-48b9-a94a-98ff272b82a6', 'tr', 'Ek Sahawiq', now()),
  ('8d68b154-a44b-4870-af25-5d8bb4a4fb31', 'en', 'Nuts', now()),
  ('8d68b154-a44b-4870-af25-5d8bb4a4fb31', 'tr', 'Kuruyemiş', now()),
  ('39530bd0-eb8f-4f62-82cd-31864a675582', 'en', 'Raisins', now()),
  ('39530bd0-eb8f-4f62-82cd-31864a675582', 'tr', 'Kuru Üzüm', now())
on conflict (option_template_option_id, locale) do update
set name = excluded.name,
    updated_at = now();

commit;
