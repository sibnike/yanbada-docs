-- Demo tenants for the Karakol market: guest house + tour company.
-- Cache rows only (hub.company_cache / hub.listing_cache) + minimal tenants.
--
-- These two tables are owned by the sync flow (vitrina webhook -> hub), so their
-- full DDL lives in the code repos. Before running, check column names against
-- hub.company_cache / hub.listing_cache and drop what your revision does not have.
-- Alternative, closer to existing practice: extend vitrina/scripts/seed-tourhub-demo.mjs
-- and let syncToHub() fill the cache instead of inserting by hand.
--
-- Guest house 7e4a0001-0000-4000-8000-000000000001
-- Tour co     7e4a0002-0000-4000-8000-000000000002

INSERT INTO public.tenants (id, name, slug) VALUES
  ('7e4a0001-0000-4000-8000-000000000001', 'Гостевой дом Ала-Кёль', 'ala-kol-guesthouse'),
  ('7e4a0002-0000-4000-8000-000000000002', 'Karakol Trails', 'karakol-trails')
ON CONFLICT (id) DO NOTHING;

INSERT INTO hub.company_cache (
  tenant_id, name, city, country, logo_url, cover_photo_url,
  short_description, about, marketplace_themes
) VALUES
(
  '7e4a0001-0000-4000-8000-000000000001',
  'Гостевой дом Ала-Кёль',
  'Каракол', 'KG',
  NULL,
  'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1400&q=80',
  'Семейный гостевой дом у выхода в Каракольское ущелье. 8 номеров, завтрак, баня, трансфер к тропе.',
  '{"ru": "Дом держит семья Асановых с 2016 года. Живём здесь же, поэтому в 5 утра кто-то встаёт вместе с группой и кормит завтраком. Есть сушилка для ботинок, камера хранения на время трека и баня после спуска.", "en": "A family guest house at the mouth of the Karakol gorge: eight rooms, breakfast, sauna, trailhead transfer."}'::jsonb,
  ARRAY['accommodation']
),
(
  '7e4a0002-0000-4000-8000-000000000002',
  'Karakol Trails',
  'Каракол', 'KG',
  NULL,
  'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1400&q=80',
  'Местная туркомпания: треки к Ала-Кёлю, джип-туры по ущельям, зимний скитур. Гиды с сертификацией.',
  '{"ru": "Водим по Тянь-Шаню с 2014 года. Небольшие группы до 8 человек, гиды из Каракола, снаряжение в аренду. Летом — треки и джип-туры, зимой — скитур и лыжная база.", "en": "Local operator since 2014: Ala-Köl treks, gorge jeep tours, winter ski touring. Groups up to eight."}'::jsonb,
  ARRAY['tourism', 'guides']
)
ON CONFLICT (tenant_id) DO UPDATE SET
  name = EXCLUDED.name,
  city = EXCLUDED.city,
  country = EXCLUDED.country,
  cover_photo_url = EXCLUDED.cover_photo_url,
  short_description = EXCLUDED.short_description,
  about = EXCLUDED.about,
  marketplace_themes = EXCLUDED.marketplace_themes;

INSERT INTO hub.listing_cache (
  id, tenant_id, page_slug, title, short_text,
  marketplace_themes, price_from, price_currency,
  cover_image_url, images, next_departure_date, seats_left,
  service_country_code, service_city_codes
) VALUES
-- Guest house
(
  '11570001-0000-4000-8000-000000000001',
  '7e4a0001-0000-4000-8000-000000000001',
  'dvuhmestny-nomer',
  '{"ru": "Двухместный номер с видом на Тянь-Шань", "en": "Double room facing the Tian Shan"}'::jsonb,
  '{"ru": "Тёплый номер с отдельным душем, завтрак включён. Сушилка для ботинок в общем холле.", "en": "Warm room with private shower, breakfast included."}'::jsonb,
  ARRAY['accommodation'], 2400, 'KGS',
  'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1400&q=80',
  ARRAY[]::text[], NULL, 4, 'KG', ARRAY['karakol']
),
(
  '11570001-0000-4000-8000-000000000002',
  '7e4a0001-0000-4000-8000-000000000001',
  'hostel-bed',
  '{"ru": "Койко-место в общем номере", "en": "Bed in a shared room"}'::jsonb,
  '{"ru": "Шесть мест, шкафчики, кухня. Вариант для тех, кто идёт на трек утром.", "en": "Six beds, lockers, kitchen. For early trail starts."}'::jsonb,
  ARRAY['accommodation'], 900, 'KGS',
  'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=1400&q=80',
  ARRAY[]::text[], NULL, 6, 'KG', ARRAY['karakol']
),
(
  '11570001-0000-4000-8000-000000000003',
  '7e4a0001-0000-4000-8000-000000000001',
  'banya',
  '{"ru": "Баня после трека", "en": "Sauna after the trek"}'::jsonb,
  '{"ru": "Два часа на группу до шести человек, веник и чай. Топим к возвращению с маршрута.", "en": "Two hours for up to six, heated for your return."}'::jsonb,
  ARRAY['accommodation'], 1200, 'KGS',
  'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1400&q=80',
  ARRAY[]::text[], NULL, NULL, 'KG', ARRAY['karakol']
),
-- Tour company
(
  '11570002-0000-4000-8000-000000000001',
  '7e4a0002-0000-4000-8000-000000000002',
  'ala-kol-trek',
  '{"ru": "Трек к озеру Ала-Кёль, 2 дня", "en": "Ala-Köl trek, 2 days"}'::jsonb,
  '{"ru": "Подъём через Каракольское ущелье, ночёвка в палатке у озера, спуск через перевал. Группа до восьми.", "en": "Up the Karakol gorge, camp by the lake, down over the pass."}'::jsonb,
  ARRAY['tourism', 'guides'], 7500, 'KGS',
  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=1400&q=80',
  ARRAY[]::text[], (now() + interval '11 days')::date, 5, 'KG', ARRAY['karakol']
),
(
  '11570002-0000-4000-8000-000000000002',
  '7e4a0002-0000-4000-8000-000000000002',
  'jeti-oguz-jeep',
  '{"ru": "Джип-тур: Джети-Огуз и Сказка", "en": "Jeep tour: Jeti-Ögüz and Skazka"}'::jsonb,
  '{"ru": "Один день: красные скалы, водопад, каньон у Иссык-Куля. Подходит как акклиматизация.", "en": "A day of red rocks, a waterfall and the canyon by Issyk-Kul."}'::jsonb,
  ARRAY['tourism'], 4200, 'KGS',
  'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=1400&q=80',
  ARRAY[]::text[], (now() + interval '4 days')::date, 3, 'KG', ARRAY['karakol']
),
(
  '11570002-0000-4000-8000-000000000003',
  '7e4a0002-0000-4000-8000-000000000002',
  'skitur',
  '{"ru": "Скитур в Каракольском ущелье", "en": "Ski touring in the Karakol gorge"}'::jsonb,
  '{"ru": "Зимний выход с гидом, снаряжение в аренду. Сезон с декабря по март.", "en": "Winter guided tour, gear rental. December to March."}'::jsonb,
  ARRAY['tourism', 'guides'], 9800, 'KGS',
  'https://images.unsplash.com/photo-1551524559-8af4e6624178?auto=format&fit=crop&w=1400&q=80',
  ARRAY[]::text[], NULL, NULL, 'KG', ARRAY['karakol']
)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  short_text = EXCLUDED.short_text,
  price_from = EXCLUDED.price_from,
  price_currency = EXCLUDED.price_currency,
  cover_image_url = EXCLUDED.cover_image_url,
  next_departure_date = EXCLUDED.next_departure_date,
  seats_left = EXCLUDED.seats_left,
  service_city_codes = EXCLUDED.service_city_codes;

NOTIFY pgrst, 'reload schema';
