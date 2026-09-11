-- Demo market overlay for Karakol. Tenants and listings come from Vitrina
-- (scripts/seed-karakol-tenants.mjs → hub.company_cache / listing_cache).
-- This file only writes hub.sites and placement rows.

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.tenants WHERE id = '7e4a0001-0000-4000-8000-000000000001'
  ) OR NOT EXISTS (
    SELECT 1 FROM hub.listing_cache
     WHERE tenant_id = '7e4a0002-0000-4000-8000-000000000002'
       AND page_slug = 'ala-kol-trek'
  ) THEN
    RAISE EXCEPTION 'Karakol tenants are missing. Run vitrina/scripts/seed-karakol-tenants.mjs first.';
  END IF;
END $$;

-- site        5a17e001-0000-4000-8000-000000000001
-- guest house 7e4a0001-0000-4000-8000-000000000001
-- tour co     7e4a0002-0000-4000-8000-000000000002

INSERT INTO hub.sites (
  id, slug, name, description, template,
  tenant_ids, theme_slugs, country_codes, city_codes,
  marketplace_slug, subdomain, settings,
  placement_mode, pricing_model, default_currency,
  platform_fee_percent, accepts_requests, max_cards_per_tenant, locales, seo
) VALUES (
  '5a17e001-0000-4000-8000-000000000001',
  'visit-karakol',
  '{"ru": "Каракол: горы и ночёвки", "en": "Karakol: peaks and beds", "ky": "Каракол: тоолор жана конуш"}'::jsonb,
  '{"ru": "Туры, треки и жильё в Караколе от местных. Одна витрина на весь город.", "en": "Tours, treks and stays in Karakol, run by locals."}'::jsonb,
  'destination',
  ARRAY[
    '7e4a0001-0000-4000-8000-000000000001'::uuid,
    '7e4a0002-0000-4000-8000-000000000002'::uuid
  ],
  ARRAY['tourism', 'guides', 'accommodation'],
  ARRAY['KG'],
  ARRAY['karakol'],
  NULL,
  'karakol',
  '{
    "accent_color": "#1C7C6B",
    "brand_color": "#12211F",
    "display_name": {"ru": "Visit Karakol", "en": "Visit Karakol"},
    "hero_image_url": "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1800&q=80",
    "hero_title": {"ru": "Каракол: подняться и остаться на ночь", "en": "Karakol: climb it, then sleep well"},
    "hero_subtitle": {"ru": "Треки и джип-туры от местной команды, ночёвки в гостевом доме у подножия.", "en": "Local treks and jeep tours, plus a guest house at the trailhead."},
    "intro": {"ru": "Витрину ведёт местный автор. Туры продаёт туркомпания, гостей размещает гостевой дом — карточки живые, бронь у самих компаний."},
    "footer_text": {"ru": "Карточки — живые услуги компаний. Бронирование на странице компании.", "en": "Cards are live company services. Booking happens on the company page."},
    "map_center": {"lat": 42.4907, "lng": 78.3936, "zoom": 11},
    "assistant": {
      "enabled": true,
      "name": {"ru": "Гид Каракола", "en": "Karakol guide"},
      "greeting": {"ru": "Спросите про треки, сезон или где заночевать — подскажу по карточкам витрины.", "en": "Ask about treks, season or where to sleep."}
    }
  }'::jsonb,
  'approved',
  'monthly',
  'KGS',
  20,
  true,
  6,
  ARRAY['ru', 'en', 'ky'],
  '{
    "title": {"ru": "Visit Karakol — треки, джип-туры и ночёвки"},
    "description": {"ru": "Местная витрина Каракола: туры от Karakol Trails и гостевой дом Ала-Кёль."},
    "og_image_url": "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=80"
  }'::jsonb
);

-- ─────────────────────────────────────────────────────────────
-- Owner: a local blogger, not a platform admin.
-- Replace user_id with a real auth.users id before demoing the cabinet.
-- ─────────────────────────────────────────────────────────────

INSERT INTO hub.site_members (site_id, user_id, role) VALUES
  ('5a17e001-0000-4000-8000-000000000001', '00000000-0000-4000-8000-0000000000b1', 'owner');

-- ─────────────────────────────────────────────────────────────
-- What the owner sells: one card per month
-- ─────────────────────────────────────────────────────────────

INSERT INTO hub.site_plans (
  id, site_id, slug, name, description,
  price_per_card, currency, period_months, card_quota, slot, trial_days, perks, is_public, sort_order
) VALUES
(
  '91a40001-0000-4000-8000-000000000001',
  '5a17e001-0000-4000-8000-000000000001',
  'start',
  '{"ru": "Старт", "en": "Start"}'::jsonb,
  '{"ru": "Одна карточка, первый месяц бесплатно. Чтобы попробовать витрину."}'::jsonb,
  0, 'KGS', 1, 1, 'standard', 30,
  '["1 карточка", "30 дней бесплатно", "статистика показов"]'::jsonb,
  true, 10
),
(
  '91a40001-0000-4000-8000-000000000002',
  '5a17e001-0000-4000-8000-000000000001',
  'base',
  '{"ru": "Базовый", "en": "Base"}'::jsonb,
  '{"ru": "До трёх карточек. Обычная позиция в списке."}'::jsonb,
  900, 'KGS', 1, 3, 'standard', 0,
  '["до 3 карточек", "900 сом за карточку в месяц", "статистика и клики"]'::jsonb,
  true, 20
),
(
  '91a40001-0000-4000-8000-000000000003',
  '5a17e001-0000-4000-8000-000000000001',
  'featured',
  '{"ru": "Витринный", "en": "Featured"}'::jsonb,
  '{"ru": "Карточка в верхнем блоке и в подборке автора."}'::jsonb,
  2500, 'KGS', 1, 1, 'featured', 0,
  '["верхний блок", "упоминание в журнале", "приоритет у ассистента"]'::jsonb,
  true, 30
),
(
  '91a40001-0000-4000-8000-000000000004',
  '5a17e001-0000-4000-8000-000000000001',
  'season-partner',
  '{"ru": "Партнёр сезона"}'::jsonb,
  '{"ru": "Закрытая договорённость: закреплённая карточка на весь сезон."}'::jsonb,
  18000, 'KGS', 6, 4, 'pinned', 0,
  '["закреплённая позиция", "логотип в партнёрах", "6 месяцев"]'::jsonb,
  false, 40
);

-- ─────────────────────────────────────────────────────────────
-- Approved placements. listing_id NULL = company card.
-- Demo covers the real states: paid, trial, late payment, expired.
-- ─────────────────────────────────────────────────────────────

INSERT INTO hub.site_placements (
  site_id, tenant_id, listing_id, plan_id, slot, sort_weight,
  status, price_per_period, currency, starts_at, paid_until
)
SELECT '5a17e001-0000-4000-8000-000000000001'::uuid,
       '7e4a0002-0000-4000-8000-000000000002'::uuid,
       NULL, '91a40001-0000-4000-8000-000000000002'::uuid, 'standard', 0,
       'active', 900, 'KGS', now() - interval '2 months', now() + interval '24 days'
UNION ALL
SELECT '5a17e001-0000-4000-8000-000000000001'::uuid,
       lc.tenant_id, lc.id, '91a40001-0000-4000-8000-000000000003'::uuid, 'featured', 100,
       'active', 2500, 'KGS', now() - interval '2 months', now() + interval '24 days'
  FROM hub.listing_cache lc
 WHERE lc.tenant_id = '7e4a0002-0000-4000-8000-000000000002' AND lc.page_slug = 'ala-kol-trek'
UNION ALL
SELECT '5a17e001-0000-4000-8000-000000000001'::uuid,
       lc.tenant_id, lc.id, '91a40001-0000-4000-8000-000000000002'::uuid, 'standard', 10,
       'active', 900, 'KGS', now() - interval '2 months', now() + interval '24 days'
  FROM hub.listing_cache lc
 WHERE lc.tenant_id = '7e4a0002-0000-4000-8000-000000000002' AND lc.page_slug = 'jeti-oguz-jeep'
UNION ALL
SELECT '5a17e001-0000-4000-8000-000000000001'::uuid,
       lc.tenant_id, lc.id, '91a40001-0000-4000-8000-000000000002'::uuid, 'standard', 0,
       'expired', 900, 'KGS', now() - interval '7 months', now() - interval '3 months'
  FROM hub.listing_cache lc
 WHERE lc.tenant_id = '7e4a0002-0000-4000-8000-000000000002' AND lc.page_slug = 'skitur'
UNION ALL
SELECT '5a17e001-0000-4000-8000-000000000001'::uuid,
       '7e4a0001-0000-4000-8000-000000000001'::uuid,
       NULL, '91a40001-0000-4000-8000-000000000001'::uuid, 'standard', 0,
       'active', 0, 'KGS', now() - interval '12 days', NULL
UNION ALL
SELECT '5a17e001-0000-4000-8000-000000000001'::uuid,
       lc.tenant_id, lc.id, '91a40001-0000-4000-8000-000000000002'::uuid, 'standard', 20,
       'active', 900, 'KGS', now() - interval '1 month', now() + interval '9 days'
  FROM hub.listing_cache lc
 WHERE lc.tenant_id = '7e4a0001-0000-4000-8000-000000000001' AND lc.page_slug = 'dvuhmestny-nomer'
UNION ALL
SELECT '5a17e001-0000-4000-8000-000000000001'::uuid,
       lc.tenant_id, lc.id, '91a40001-0000-4000-8000-000000000002'::uuid, 'standard', 0,
       'active', 900, 'KGS', now() - interval '2 months', now() - interval '2 days'
  FROM hub.listing_cache lc
 WHERE lc.tenant_id = '7e4a0001-0000-4000-8000-000000000001' AND lc.page_slug = 'hostel-bed';

-- ─────────────────────────────────────────────────────────────
-- Intake funnel: both directions plus a rejection with a reason
-- ─────────────────────────────────────────────────────────────

INSERT INTO hub.site_placement_requests (
  site_id, tenant_id, plan_id, direction, listing_ids, include_company,
  message, contact, status, reject_reason, accepted_terms_at, created_at, decided_at
) VALUES
(
  '5a17e001-0000-4000-8000-000000000001',
  '7e4a0002-0000-4000-8000-000000000002',
  '91a40001-0000-4000-8000-000000000003',
  'tenant_request',
  ARRAY[(SELECT id FROM hub.listing_cache WHERE tenant_id = '7e4a0002-0000-4000-8000-000000000002' AND page_slug = 'skitur')],
  false,
  'Хотим вернуть зимний скитур в витрину к декабрю, готовы на витринный тариф.',
  '{"name": "Азамат", "telegram": "@karakoltrails"}'::jsonb,
  'pending', NULL, now() - interval '2 days', now() - interval '2 days', NULL
),
(
  '5a17e001-0000-4000-8000-000000000001',
  '7e4a0001-0000-4000-8000-000000000001',
  '91a40001-0000-4000-8000-000000000002',
  'owner_invite',
  ARRAY[(SELECT id FROM hub.listing_cache WHERE tenant_id = '7e4a0001-0000-4000-8000-000000000001' AND page_slug = 'banya')],
  false,
  'Добавьте баню как отдельную карточку — её ищут после трека.',
  '{}'::jsonb,
  'pending', NULL, NULL, now() - interval '1 day', NULL
),
(
  '5a17e001-0000-4000-8000-000000000001',
  '7e4a0001-0000-4000-8000-000000000001',
  '91a40001-0000-4000-8000-000000000002',
  'tenant_request',
  ARRAY[]::uuid[],
  true,
  'Разместите нас, пожалуйста.',
  '{"name": "Гулнара"}'::jsonb,
  'rejected',
  'Нужны фото номеров минимум 1200px и цена за ночь в карточке. После правок одобрим сразу.',
  now() - interval '20 days', now() - interval '20 days', now() - interval '19 days'
);

-- ─────────────────────────────────────────────────────────────
-- Invoices: platform bills the tenant, owner gets the rest
-- ─────────────────────────────────────────────────────────────

INSERT INTO hub.site_invoices (
  site_id, tenant_id, period_start, period_end,
  amount, currency, platform_fee, owner_payout, status, paid_at
) VALUES
(
  '5a17e001-0000-4000-8000-000000000001',
  '7e4a0002-0000-4000-8000-000000000002',
  date_trunc('month', now() - interval '1 month')::date,
  date_trunc('month', now())::date,
  4300, 'KGS', 860, 3440, 'paid', now() - interval '26 days'
),
(
  '5a17e001-0000-4000-8000-000000000001',
  '7e4a0001-0000-4000-8000-000000000001',
  date_trunc('month', now())::date,
  (date_trunc('month', now()) + interval '1 month')::date,
  1800, 'KGS', 360, 1440, 'issued', NULL
);

-- ─────────────────────────────────────────────────────────────
-- Owner cards for objects that are not tenants yet.
-- The cafe already asked to claim its card -> future tenant.
-- ─────────────────────────────────────────────────────────────

INSERT INTO hub.site_manual_cards (
  site_id, kind, title, body, images, price_from, currency, city_code, geo, claim_status, sort_order
) VALUES
(
  '5a17e001-0000-4000-8000-000000000001', 'place',
  '{"ru": "Озеро Ала-Кёль", "en": "Ala-Köl lake"}'::jsonb,
  '{"ru": "Бирюзовое озеро на 3560 м. Классический выход из Каракольского ущелья, два дня с ночёвкой."}'::jsonb,
  ARRAY['https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=1400&q=80'],
  NULL, NULL, 'karakol',
  '{"lat": 42.2378, "lng": 78.5233}'::jsonb,
  'unclaimed', 10
),
(
  '5a17e001-0000-4000-8000-000000000001', 'place',
  '{"ru": "Ущелье Джети-Огуз", "en": "Jeti-Ögüz"}'::jsonb,
  '{"ru": "Красные скалы «Семь быков» в часе от города. Подходит как акклиматизация перед треком."}'::jsonb,
  ARRAY['https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=1400&q=80'],
  NULL, NULL, 'karakol',
  '{"lat": 42.3253, "lng": 78.2183}'::jsonb,
  'unclaimed', 20
),
(
  '5a17e001-0000-4000-8000-000000000001', 'company',
  '{"ru": "Кафе «Дасторкон»", "en": "Dastorkon cafe"}'::jsonb,
  '{"ru": "Ашлян-фу и лагман в центре. Карточку добавил автор витрины, владелец просит забрать её себе."}'::jsonb,
  ARRAY['https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&w=1400&q=80'],
  350, 'KGS', 'karakol', NULL,
  'requested', 30
);

-- ─────────────────────────────────────────────────────────────
-- Constructor: home / about / join / journal
-- ─────────────────────────────────────────────────────────────

INSERT INTO hub.site_pages (id, site_id, slug, kind, title, sort_order) VALUES
('9a6e0001-0000-4000-8000-000000000001', '5a17e001-0000-4000-8000-000000000001', 'home',    'home', '{"ru": "Главная", "en": "Home"}'::jsonb, 0),
('9a6e0001-0000-4000-8000-000000000002', '5a17e001-0000-4000-8000-000000000001', 'about',   'page', '{"ru": "О витрине", "en": "About"}'::jsonb, 10),
('9a6e0001-0000-4000-8000-000000000003', '5a17e001-0000-4000-8000-000000000001', 'join',    'page', '{"ru": "Разместиться", "en": "Get listed"}'::jsonb, 20),
('9a6e0001-0000-4000-8000-000000000004', '5a17e001-0000-4000-8000-000000000001', 'journal', 'blog', '{"ru": "Журнал", "en": "Journal"}'::jsonb, 30);

-- Home
INSERT INTO hub.site_blocks (page_id, type, payload, sort_order) VALUES
('9a6e0001-0000-4000-8000-000000000001', 'hero', '{"source": "site_settings", "actions": [{"label": {"ru": "Смотреть треки"}, "href": "#listings"}, {"label": {"ru": "Где ночевать"}, "href": "#stays"}]}'::jsonb, 0),
('9a6e0001-0000-4000-8000-000000000001', 'stats', '{"items": [{"value": "2", "label": {"ru": "местные компании"}}, {"value": "5", "label": {"ru": "живых карточек"}}, {"value": "3560", "label": {"ru": "метров до Ала-Кёля"}}, {"value": "20%", "label": {"ru": "идёт платформе"}}]}'::jsonb, 10),
('9a6e0001-0000-4000-8000-000000000001', 'info', '{"title": {"ru": "Что это за витрина"}, "body": {"ru": "Каракол маленький, а найти нормальный трек и койку в одном месте всё равно сложно. Здесь две местные компании: туркомпания водит в горы, гостевой дом принимает после спуска. Карточки подтягиваются из их же профилей, поэтому цены и даты не устаревают."}}'::jsonb, 20),
('9a6e0001-0000-4000-8000-000000000001', 'listing_cards', '{"mode": "approved", "title": {"ru": "Туры и треки"}, "themes": ["tourism", "guides"], "limit": 12}'::jsonb, 30),
('9a6e0001-0000-4000-8000-000000000001', 'listing_cards', '{"mode": "approved", "anchor": "stays", "title": {"ru": "Где ночевать"}, "themes": ["accommodation"], "limit": 12}'::jsonb, 40),
('9a6e0001-0000-4000-8000-000000000001', 'tenant_cards', '{"mode": "approved", "title": {"ru": "Кто здесь работает"}, "limit": 12}'::jsonb, 50),
('9a6e0001-0000-4000-8000-000000000001', 'manual_cards', '{"title": {"ru": "Места рядом"}, "note": {"ru": "Добавлено автором витрины"}, "limit": 6}'::jsonb, 60),
('9a6e0001-0000-4000-8000-000000000001', 'steps', '{"title": {"ru": "Как это работает"}, "items": [{"title": {"ru": "Выбираете карточку"}, "body": {"ru": "Тур или ночёвку — всё от местных компаний."}}, {"title": {"ru": "Бронируете у компании"}, "body": {"ru": "Кнопка ведёт на страницу компании, деньги идут ей."}}, {"title": {"ru": "Витрина живёт с размещения"}, "body": {"ru": "Компании платят за карточку в месяц, а не процент с вас."}}]}'::jsonb, 70),
('9a6e0001-0000-4000-8000-000000000001', 'reviews', '{"title": {"ru": "Отзывы гостей"}, "items": [{"author": "Мария, Алматы", "rating": 5, "body": {"ru": "Взяли трек и ночёвку в одном месте, не пришлось искать по чатам."}}, {"author": "Tom, Bristol", "rating": 5, "body": {"ru": "Гид говорил по-английски, дом тёплый после спуска."}}]}'::jsonb, 80),
('9a6e0001-0000-4000-8000-000000000001', 'map', '{"title": {"ru": "На карте"}, "source": "site_settings", "pins": "cards"}'::jsonb, 90),
('9a6e0001-0000-4000-8000-000000000001', 'posts', '{"title": {"ru": "Журнал"}, "limit": 3}'::jsonb, 100),
('9a6e0001-0000-4000-8000-000000000001', 'faq', '{"title": {"ru": "Частые вопросы"}, "items": [{"q": {"ru": "Витрина берёт комиссию с брони?"}, "a": {"ru": "Нет. Компании платят за размещение карточки, бронь идёт напрямую к ним."}}, {"q": {"ru": "Кто отвечает за качество?"}, "a": {"ru": "Сама компания. Автор витрины проверяет фото, цены и актуальность карточки."}}]}'::jsonb, 110),
('9a6e0001-0000-4000-8000-000000000001', 'cta', '{"title": {"ru": "Вы местная компания?"}, "body": {"ru": "Разместите карточку в витрине — первый месяц бесплатно."}, "action": {"label": {"ru": "Условия размещения"}, "href": "/s/visit-karakol/join"}}'::jsonb, 120);

-- About: team, partners, video, contacts
INSERT INTO hub.site_blocks (page_id, type, payload, sort_order) VALUES
('9a6e0001-0000-4000-8000-000000000002', 'info', '{"title": {"ru": "Кто ведёт витрину"}, "body": {"ru": "Витрину собирает местный автор: пишет журнал, проверяет карточки и решает, кого пускать. Это не агрегатор — состав здесь маленький и отобранный."}}'::jsonb, 0),
('9a6e0001-0000-4000-8000-000000000002', 'team', '{"title": {"ru": "Команда"}, "items": [{"name": "Азамат Сыдыков", "role": {"ru": "Автор витрины"}, "bio": {"ru": "Ведёт блог о Тянь-Шане, отбирает компании и пишет журнал."}, "photo_url": "https://images.unsplash.com/photo-1531891437562-4301cf35b7e4?auto=format&fit=crop&w=600&q=80", "links": {"telegram": "@karakol"}}, {"name": "Гулнара Асанова", "role": {"ru": "Редактор"}, "bio": {"ru": "Проверяет описания и фото карточек, отвечает на заявки."}, "photo_url": "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=600&q=80", "links": {}}, {"name": "Бакыт Орозов", "role": {"ru": "Горный консультант"}, "bio": {"ru": "Смотрит, чтобы маршруты в карточках были описаны честно."}, "photo_url": "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=600&q=80", "links": {}}]}'::jsonb, 10),
('9a6e0001-0000-4000-8000-000000000002', 'partners', '{"title": {"ru": "С кем сотрудничаем"}, "items": [{"name": "Karakol Trails", "logo_url": null}, {"name": "Гостевой дом Ала-Кёль", "logo_url": null}, {"name": "Кафе Дасторкон", "logo_url": null}]}'::jsonb, 20),
('9a6e0001-0000-4000-8000-000000000002', 'video', '{"title": {"ru": "Каракол за две минуты"}, "provider": "youtube", "url": "https://www.youtube.com/watch?v=aqz-KE-bpKQ", "poster_url": "https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1400&q=80"}'::jsonb, 30),
('9a6e0001-0000-4000-8000-000000000002', 'gallery', '{"title": {"ru": "Фото сезона"}, "images": ["https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=1200&q=80", "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=1200&q=80", "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=80"]}'::jsonb, 40),
('9a6e0001-0000-4000-8000-000000000002', 'contacts', '{"title": {"ru": "Связаться"}, "items": [{"kind": "telegram", "value": "@karakol"}, {"kind": "email", "value": "hello@visit-karakol.kg"}, {"kind": "address", "value": {"ru": "Каракол, ул. Гебзе 12"}}]}'::jsonb, 50);

-- Join: tariffs + intake form
INSERT INTO hub.site_blocks (page_id, type, payload, sort_order) VALUES
('9a6e0001-0000-4000-8000-000000000003', 'info', '{"title": {"ru": "Разместить карточку"}, "body": {"ru": "Витрина живёт с размещения, не с процента. Вы платите за карточку в месяц и видите статистику показов и клика на бронь."}}'::jsonb, 0),
('9a6e0001-0000-4000-8000-000000000003', 'pricing', '{"title": {"ru": "Тарифы"}, "note": {"ru": "Цена за одну карточку. Компания может взять несколько."}, "source": "site_plans"}'::jsonb, 10),
('9a6e0001-0000-4000-8000-000000000003', 'join', '{"title": {"ru": "Заявка на размещение"}, "body": {"ru": "Оставьте контакт и выберите тариф. Автор витрины проверит карточки и ответит."}, "require_terms": true, "terms": {"ru": "Карточка должна быть от действующей компании: реальные фото, актуальная цена, работающий контакт."}}'::jsonb, 20),
('9a6e0001-0000-4000-8000-000000000003', 'faq', '{"title": {"ru": "Вопросы по размещению"}, "items": [{"q": {"ru": "Что если оплата задержалась?"}, "a": {"ru": "Есть неделя запаса — карточка не исчезает сразу."}}, {"q": {"ru": "Можно только компанию, без услуг?"}, "a": {"ru": "Да, карточка компании — это тоже одно размещение."}}, {"q": {"ru": "Кто выставляет счёт?"}, "a": {"ru": "Платформа. Автор витрины получает выплату за минусом 20%."}}]}'::jsonb, 30);

-- Journal
INSERT INTO hub.site_blocks (page_id, type, payload, sort_order) VALUES
('9a6e0001-0000-4000-8000-000000000004', 'posts', '{"title": {"ru": "Журнал витрины"}, "limit": 20}'::jsonb, 0);

INSERT INTO hub.site_posts (site_id, slug, title, excerpt, body, cover_url, is_published, published_at) VALUES
(
  '5a17e001-0000-4000-8000-000000000001', 'ala-kol-season',
  '{"ru": "Когда идти на Ала-Кёль", "en": "When to hike Ala-Köl"}'::jsonb,
  '{"ru": "Снег на перевале лежит дольше, чем кажется по фото из инстаграма."}'::jsonb,
  '{"ru": "Окно — с середины июля до середины сентября. В июне на перевале ещё снег, и без кошек группа идёт медленно. В сентябре днём тепло, ночью около нуля. Идти лучше с ночёвкой: за один день подъём на 3560 выматывает даже подготовленных."}'::jsonb,
  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=1400&q=80',
  true, now() - interval '9 days'
),
(
  '5a17e001-0000-4000-8000-000000000001', 'where-to-sleep',
  '{"ru": "Где ночевать в Караколе", "en": "Where to sleep in Karakol"}'::jsonb,
  '{"ru": "Коротко: гостевой дом у подножия удобнее центра, если утром на трек."}'::jsonb,
  '{"ru": "Если выход на маршрут утром, берите ночёвку ближе к ущелью: экономите час на трансфере. Если приехали поздно и уезжаете днём — центр удобнее. Душ после спуска важнее вида из окна."}'::jsonb,
  'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1400&q=80',
  true, now() - interval '4 days'
),
(
  '5a17e001-0000-4000-8000-000000000001', 'acclimatisation',
  '{"ru": "Акклиматизация за один день", "en": "One-day acclimatisation"}'::jsonb,
  '{"ru": "Джети-Огуз перед треком — не туризм, а подготовка."}'::jsonb,
  '{"ru": "День на 2200–2500 перед выходом на 3500 снимает половину проблем с головой. Джип-тур в Джети-Огуз как раз даёт этот профиль: подъём, прогулка, спуск на ночёвку."}'::jsonb,
  'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=1400&q=80',
  true, now() - interval '2 days'
);

INSERT INTO hub.site_knowledge (site_id, title, body, kind, sort_order) VALUES
(
  '5a17e001-0000-4000-8000-000000000001',
  '{"ru": "Тон витрины"}'::jsonb,
  'Visit Karakol — местная витрина, не агрегатор. Отвечай спокойно и коротко, как местный. Сначала предлагай карточки витрины, потом статьи журнала. Если гость спрашивает про снег на перевале или сезон — опирайся на статью «Когда идти на Ала-Кёль».',
  'rule', 10
),
(
  '5a17e001-0000-4000-8000-000000000001',
  '{"ru": "Две компании витрины"}'::jsonb,
  'В витрине две компании. Karakol Trails водит треки и джип-туры. Гостевой дом Ала-Кёль размещает гостей и делает трансфер. Логичная связка для гостя: тур у туркомпании плюс ночёвка в гостевом доме до и после маршрута.',
  'article', 20
),
(
  '5a17e001-0000-4000-8000-000000000001',
  '{"ru": "Как попасть в витрину"}'::jsonb,
  'Компании размещаются платно: карточка в месяц по тарифу. Первый месяц по тарифу «Старт» бесплатный. Заявку оставляют на странице «Разместиться», автор витрины проверяет фото, цену и контакт. Комиссии с брони нет. Если спрашивает владелец компании — отправь на /s/visit-karakol/join.',
  'faq', 30
);

NOTIFY pgrst, 'reload schema';
