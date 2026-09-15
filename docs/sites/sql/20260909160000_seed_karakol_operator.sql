-- Second site on the same data: a single-tenant microsite on the `operator` skin.
--
-- The market (visit-karakol) is many tenants curated by an outsider and paid for
-- per card. This one is the other half of the model: one company, its own page,
-- nothing to pay. Same tables, same renderer — only `template`,
-- `placement_mode` and the blocks differ, which is the point worth showing.
--
-- Mode is `mixed`, not `scope`: the company keeps its winter tour in Vitrina but
-- off this page out of season, and `scope` would ignore placement rows and show
-- everything the tenant has.
--
-- site     5a17e001-0000-4000-8000-000000000002
-- tour co  7e4a0002-0000-4000-8000-000000000002 (also a tenant of visit-karakol)

INSERT INTO hub.sites (
  id, slug, name, description, template,
  tenant_ids, theme_slugs, country_codes, city_codes,
  subdomain, settings,
  placement_mode, pricing_model, default_currency,
  accepts_requests, locales, seo
) VALUES (
  '5a17e001-0000-4000-8000-000000000002',
  'karakol-trails',
  '{"ru": "Karakol Trails", "en": "Karakol Trails"}'::jsonb,
  '{"ru": "Треки, джип-туры и скитур в Караколе. Гиды из города, группы до восьми человек.", "en": "Treks, jeep tours and ski touring in Karakol. Local guides, groups up to eight."}'::jsonb,
  'operator',
  ARRAY['7e4a0002-0000-4000-8000-000000000002'::uuid],
  ARRAY['tourism', 'guides'],
  ARRAY['KG'],
  ARRAY['karakol'],
  'karakol-trails',
  '{
    "accent_color": "#C45C26",
    "brand_color": "#1A1613",
    "display_name": {"ru": "Karakol Trails", "en": "Karakol Trails"},
    "hero_image_url": "https://images.unsplash.com/photo-1551524559-8af4e6624178?auto=format&fit=crop&w=1800&q=80",
    "hero_title": {"ru": "Горы Каракола с местными гидами", "en": "The Karakol mountains with local guides"},
    "hero_subtitle": {"ru": "Треки к Ала-Кёлю, джип-туры по ущельям, зимний скитур. С 2014 года.", "en": "Ala-Köl treks, gorge jeep tours, winter ski touring. Since 2014."},
    "intro": {"ru": "Это сайт одной компании, а не витрина города. Карточки те же, что в маркете Каракола, — они приходят из профиля компании в Vitrina."},
    "footer_text": {"ru": "Бронирование на странице компании в Vitrina.", "en": "Booking happens on the company page."},
    "map_center": {"lat": 42.4907, "lng": 78.3936, "zoom": 10},
    "assistant": {
      "enabled": true,
      "name": {"ru": "Karakol Trails"},
      "greeting": {"ru": "Спросите про маршрут, сезон или снаряжение — отвечу по нашим турам."}
    }
  }'::jsonb,
  'mixed',
  'free',
  'KGS',
  false,
  ARRAY['ru', 'en'],
  '{
    "title": {"ru": "Karakol Trails — треки, джип-туры и скитур"},
    "description": {"ru": "Местная туркомпания в Караколе: Ала-Кёль, Джети-Огуз, зимний скитур."}
  }'::jsonb
);

-- The company runs its own microsite, so the owner is its admin, not an outsider.
INSERT INTO hub.site_members (site_id, user_id, role, tenant_id) VALUES
  ('5a17e001-0000-4000-8000-000000000002', '00000000-0000-4000-8000-0000000000c1', 'owner',
   '7e4a0002-0000-4000-8000-000000000002');

-- Free site, so price stays 0 and paid_until NULL — the rows exist to pick and
-- order cards, not to bill for them. The expired winter tour stays off the page.
INSERT INTO hub.site_placements (site_id, tenant_id, listing_id, slot, sort_weight, status, paid_until) VALUES
  ('5a17e001-0000-4000-8000-000000000002', '7e4a0002-0000-4000-8000-000000000002',
   '11570002-0000-4000-8000-000000000001', 'featured', 100, 'active', NULL),
  ('5a17e001-0000-4000-8000-000000000002', '7e4a0002-0000-4000-8000-000000000002',
   '11570002-0000-4000-8000-000000000002', 'standard', 50, 'active', NULL),
  ('5a17e001-0000-4000-8000-000000000002', '7e4a0002-0000-4000-8000-000000000002',
   '11570002-0000-4000-8000-000000000003', 'standard', 10, 'expired', now() - interval '90 days');

-- ─────────────────────────────────────────────────────────────
-- Pages
-- ─────────────────────────────────────────────────────────────

INSERT INTO hub.site_pages (id, site_id, slug, kind, title, sort_order) VALUES
('9a6e0002-0000-4000-8000-000000000001', '5a17e001-0000-4000-8000-000000000002', 'home',    'home', '{"ru": "Главная", "en": "Home"}'::jsonb, 0),
('9a6e0002-0000-4000-8000-000000000002', '5a17e001-0000-4000-8000-000000000002', 'about',   'page', '{"ru": "О компании", "en": "About"}'::jsonb, 10),
('9a6e0002-0000-4000-8000-000000000003', '5a17e001-0000-4000-8000-000000000002', 'journal', 'blog', '{"ru": "Заметки", "en": "Notes"}'::jsonb, 20);

INSERT INTO hub.site_blocks (page_id, type, payload, sort_order) VALUES
('9a6e0002-0000-4000-8000-000000000001', 'hero', '{"source": "site_settings", "actions": [{"label": {"ru": "Маршруты"}, "href": "#listings"}, {"label": {"ru": "Написать нам"}, "href": "/s/karakol-trails/about#contacts"}]}'::jsonb, 0),
('9a6e0002-0000-4000-8000-000000000001', 'stats', '{"items": [{"value": "2014", "label": {"ru": "водим с этого года"}}, {"value": "8", "label": {"ru": "человек в группе, не больше"}}, {"value": "3560", "label": {"ru": "метров на Ала-Кёле"}}, {"value": "KG", "label": {"ru": "гиды из Каракола"}}]}'::jsonb, 10),
('9a6e0002-0000-4000-8000-000000000001', 'listing_cards', '{"mode": "mixed", "title": {"ru": "Маршруты"}, "limit": 12}'::jsonb, 20),
('9a6e0002-0000-4000-8000-000000000001', 'steps', '{"title": {"ru": "Как проходит выход"}, "items": [{"title": {"ru": "Списываемся"}, "body": {"ru": "Уточняем даты, уровень группы и что из снаряжения нужно взять в аренду."}}, {"title": {"ru": "Собираемся в Караколе"}, "body": {"ru": "Встреча вечером накануне, разбор рюкзаков, ранний выезд к тропе."}}, {"title": {"ru": "Идём"}, "body": {"ru": "Гид ведёт группу, готовит на маршруте и решает по погоде. Возврат в город к вечеру второго дня."}}]}'::jsonb, 30),
('9a6e0002-0000-4000-8000-000000000001', 'gallery', '{"title": {"ru": "С маршрутов"}, "images": ["https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=1200&q=80", "https://images.unsplash.com/photo-1551524559-8af4e6624178?auto=format&fit=crop&w=1200&q=80", "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=1200&q=80"]}'::jsonb, 40),
('9a6e0002-0000-4000-8000-000000000001', 'reviews', '{"title": {"ru": "Отзывы"}, "items": [{"author": "Дмитрий, Новосибирск", "rating": 5, "body": {"ru": "Гид развернул группу за час до перевала из-за погоды. Правильно сделал, вернулись на следующий день."}}, {"author": "Anna, Berlin", "rating": 5, "body": {"ru": "Снаряжение в аренду нормальное, не убитое. Еда на маршруте лучше, чем ожидала."}}]}'::jsonb, 50),
('9a6e0002-0000-4000-8000-000000000001', 'map', '{"title": {"ru": "Где мы работаем"}, "source": "site_settings", "pins": "cards"}'::jsonb, 60),
('9a6e0002-0000-4000-8000-000000000001', 'posts', '{"title": {"ru": "Заметки гидов"}, "limit": 2}'::jsonb, 70),
('9a6e0002-0000-4000-8000-000000000001', 'faq', '{"title": {"ru": "Частые вопросы"}, "items": [{"q": {"ru": "Нужен опыт горных походов?"}, "a": {"ru": "Для Ала-Кёля — нет, но нужна форма: два дня по 6–8 часов с рюкзаком."}}, {"q": {"ru": "Что со снаряжением?"}, "a": {"ru": "Палатки, спальники и коврики наши. Ботинки и куртку берите свои или в аренду в городе."}}, {"q": {"ru": "Если погода испортится?"}, "a": {"ru": "Переносим или возвращаем деньги. Гид решает на месте, спорить с перевалом не будем."}}]}'::jsonb, 80),
('9a6e0002-0000-4000-8000-000000000001', 'cta', '{"title": {"ru": "Собираетесь этим летом?"}, "body": {"ru": "Напишите за пару недель — в июле и августе места разбирают заранее."}, "action": {"label": {"ru": "Связаться"}, "href": "/s/karakol-trails/about#contacts"}}'::jsonb, 90);

INSERT INTO hub.site_blocks (page_id, type, payload, sort_order) VALUES
('9a6e0002-0000-4000-8000-000000000002', 'info', '{"title": {"ru": "О нас"}, "body": {"ru": "Водим по Тянь-Шаню с 2014 года. Все гиды живут в Караколе и ходят эти маршруты круглый год, поэтому про снег на перевале мы знаем не из прогноза. Группы до восьми человек: больше — и на узкой тропе теряется темп."}}'::jsonb, 0),
('9a6e0002-0000-4000-8000-000000000002', 'team', '{"title": {"ru": "Гиды"}, "items": [{"name": "Бакыт Орозов", "role": {"ru": "Старший гид"}, "bio": {"ru": "Ала-Кёль и перевалы Каракольского ущелья. Сертификация KMGA."}, "photo_url": "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=600&q=80", "links": {}}, {"name": "Айпери Кадырова", "role": {"ru": "Гид, скитур"}, "bio": {"ru": "Зимние выходы и лавинная безопасность."}, "photo_url": "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=600&q=80", "links": {}}]}'::jsonb, 10),
('9a6e0002-0000-4000-8000-000000000002', 'video', '{"title": {"ru": "Два дня на Ала-Кёле"}, "provider": "youtube", "url": "https://www.youtube.com/watch?v=aqz-KE-bpKQ", "poster_url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=1400&q=80"}'::jsonb, 20),
('9a6e0002-0000-4000-8000-000000000002', 'partners', '{"title": {"ru": "С кем работаем"}, "items": [{"name": "Гостевой дом Ала-Кёль", "logo_url": null}, {"name": "Visit Karakol", "logo_url": null}]}'::jsonb, 30),
('9a6e0002-0000-4000-8000-000000000002', 'contacts', '{"anchor": "contacts", "title": {"ru": "Связаться"}, "items": [{"kind": "telegram", "value": "@karakoltrails"}, {"kind": "phone", "value": "+996 700 12-34-56"}, {"kind": "email", "value": "hi@karakol-trails.kg"}, {"kind": "address", "value": {"ru": "Каракол, ул. Токтогула 45"}}]}'::jsonb, 40);

INSERT INTO hub.site_blocks (page_id, type, payload, sort_order) VALUES
('9a6e0002-0000-4000-8000-000000000003', 'posts', '{"title": {"ru": "Заметки гидов"}, "limit": 20}'::jsonb, 0);

INSERT INTO hub.site_posts (site_id, slug, title, excerpt, body, cover_url, is_published, published_at) VALUES
(
  '5a17e001-0000-4000-8000-000000000002', 'what-to-pack',
  '{"ru": "Что брать на два дня", "en": "Packing for two days"}'::jsonb,
  '{"ru": "Список короткий, но каждый пункт кто-то однажды забыл."}'::jsonb,
  '{"ru": "Ботинки разношенные, не новые. Куртка от ветра, шапка и перчатки — на 3500 холодно даже в августе. Два литра воды, солнцезащитный крем и очки: на снежнике сгорает лицо. Палатку, спальник и еду несём мы."}'::jsonb,
  'https://images.unsplash.com/photo-1551524559-8af4e6624178?auto=format&fit=crop&w=1400&q=80',
  true, now() - interval '6 days'
),
(
  '5a17e001-0000-4000-8000-000000000002', 'weather-calls',
  '{"ru": "Почему гид разворачивает группу", "en": "Why a guide turns the group around"}'::jsonb,
  '{"ru": "Перевал никуда не денется, а погода в Тянь-Шане меняется за час."}'::jsonb,
  '{"ru": "Решение по погоде принимает гид, и оно не обсуждается на тропе. Чаще всего это стоит группе полдня и ночёвки ниже, а не отменённого маршрута. Если выход сорвался целиком — переносим или возвращаем деньги."}'::jsonb,
  'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=1400&q=80',
  true, now() - interval '1 day'
);

INSERT INTO hub.site_knowledge (site_id, title, body, kind, sort_order) VALUES
(
  '5a17e001-0000-4000-8000-000000000002',
  '{"ru": "Тон компании"}'::jsonb,
  'Это сайт одной туркомпании, не витрины города. Отвечай от лица Karakol Trails, коротко и по делу. Про снаряжение и погоду опирайся на заметки гидов. Если спрашивают про ночёвку в городе — честно скажи, что размещением мы не занимаемся, и отправь на витрину Каракола /s/visit-karakol.',
  'rule', 10
),
(
  '5a17e001-0000-4000-8000-000000000002',
  '{"ru": "Сезон"}'::jsonb,
  'Треки — с середины июля до середины сентября. Джип-туры — с мая по октябрь. Скитур — с декабря по март, летом эта карточка снята с сайта. В июне на перевале Ала-Кёль ещё лежит снег.',
  'faq', 20
);

NOTIFY pgrst, 'reload schema';
