-- Additive constructor/knowledge tables for hub.sites.
-- Does not alter vitrina app tables. Copy into mega-hub/supabase/migrations/.

CREATE TABLE hub.site_pages (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id       uuid NOT NULL REFERENCES hub.sites(id) ON DELETE CASCADE,
  slug          text NOT NULL DEFAULT 'home',
  kind          text NOT NULL DEFAULT 'page'
                CHECK (kind IN ('home', 'page', 'blog')),
  title         jsonb NOT NULL DEFAULT '{}',
  sort_order    int NOT NULL DEFAULT 0,
  is_published  boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (site_id, slug)
);

CREATE TABLE hub.site_blocks (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id       uuid NOT NULL REFERENCES hub.site_pages(id) ON DELETE CASCADE,
  type          text NOT NULL
                CHECK (type IN (
                  'hero', 'info', 'tenant_cards', 'listing_cards',
                  'posts', 'gallery', 'faq', 'cta'
                )),
  payload       jsonb NOT NULL DEFAULT '{}',
  sort_order    int NOT NULL DEFAULT 0,
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX site_blocks_page_sort_idx
  ON hub.site_blocks (page_id, sort_order)
  WHERE is_active;

CREATE TABLE hub.site_posts (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id       uuid NOT NULL REFERENCES hub.sites(id) ON DELETE CASCADE,
  slug          text NOT NULL,
  title         jsonb NOT NULL,
  excerpt       jsonb NOT NULL DEFAULT '{}',
  body          jsonb NOT NULL DEFAULT '{}',
  cover_url     text,
  is_published  boolean NOT NULL DEFAULT false,
  published_at  timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (site_id, slug)
);

CREATE TABLE hub.site_knowledge (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id       uuid NOT NULL REFERENCES hub.sites(id) ON DELETE CASCADE,
  title         jsonb NOT NULL,
  body          text NOT NULL,
  kind          text NOT NULL DEFAULT 'article'
                CHECK (kind IN ('article', 'faq', 'rule')),
  is_active     boolean NOT NULL DEFAULT true,
  sort_order    int NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE hub.assistant_base_knowledge (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          text NOT NULL UNIQUE,
  title         jsonb NOT NULL,
  body          text NOT NULL,
  is_active     boolean NOT NULL DEFAULT true,
  sort_order    int NOT NULL DEFAULT 0
);

COMMENT ON TABLE hub.site_pages IS
  'Constructor pages of a themed site. Home + extra materials (about, blog index, custom).';
COMMENT ON TABLE hub.site_blocks IS
  'Constructor blocks. tenant_cards/listing_cards resolve live from hub.*_cache; info/posts/faq are site-owned.';
COMMENT ON TABLE hub.site_knowledge IS
  'Site-specific knowledge for the AI manager. Not public JSON — assistant uses service_role.';
COMMENT ON TABLE hub.assistant_base_knowledge IS
  'Platform-wide assistant knowledge shared by all themed sites.';

ALTER TABLE hub.site_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE hub.site_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE hub.site_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE hub.site_knowledge ENABLE ROW LEVEL SECURITY;
ALTER TABLE hub.assistant_base_knowledge ENABLE ROW LEVEL SECURITY;

CREATE POLICY site_pages_public_select ON hub.site_pages
  FOR SELECT TO anon, authenticated
  USING (
    is_published AND EXISTS (
      SELECT 1 FROM hub.sites s WHERE s.id = site_id AND s.is_active
    )
  );

CREATE POLICY site_blocks_public_select ON hub.site_blocks
  FOR SELECT TO anon, authenticated
  USING (
    is_active AND EXISTS (
      SELECT 1 FROM hub.site_pages p
      JOIN hub.sites s ON s.id = p.site_id
      WHERE p.id = page_id AND p.is_published AND s.is_active
    )
  );

CREATE POLICY site_posts_public_select ON hub.site_posts
  FOR SELECT TO anon, authenticated
  USING (
    is_published AND EXISTS (
      SELECT 1 FROM hub.sites s WHERE s.id = site_id AND s.is_active
    )
  );

CREATE POLICY site_knowledge_admin ON hub.site_knowledge
  FOR ALL TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

CREATE POLICY site_pages_admin ON hub.site_pages
  FOR ALL TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

CREATE POLICY site_blocks_admin ON hub.site_blocks
  FOR ALL TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

CREATE POLICY site_posts_admin ON hub.site_posts
  FOR ALL TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

CREATE POLICY assistant_base_admin ON hub.assistant_base_knowledge
  FOR ALL TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

CREATE POLICY assistant_base_select ON hub.assistant_base_knowledge
  FOR SELECT TO authenticated
  USING (is_active);

GRANT SELECT ON hub.site_pages, hub.site_blocks, hub.site_posts TO anon, authenticated;
GRANT SELECT ON hub.assistant_base_knowledge TO authenticated;
GRANT ALL ON hub.site_pages, hub.site_blocks, hub.site_posts,
  hub.site_knowledge, hub.assistant_base_knowledge TO service_role;
GRANT ALL ON hub.site_knowledge TO authenticated;

INSERT INTO hub.assistant_base_knowledge (slug, title, body, sort_order) VALUES
(
  'manager-role',
  '{"ru": "Роль менеджера сайта"}'::jsonb,
  'Ты менеджер публичного тематического сайта платформы Yanbada/OTA. Помогаешь гостю ориентироваться: найти оператора, услугу, статью блога, понять как забронировать. Не выдумывай цены, даты и наличие мест — опирайся только на карточки и тексты, которые даны в контексте. Бронирование всегда на странице услуги тенанта (Vitrina /p/...), не на этом сайте. Если данных нет — скажи честно и предложи ближайшую карточку или статью.',
  10
),
(
  'how-cards-work',
  '{"ru": "Карточки тенантов"}'::jsonb,
  'Карточки компаний и услуг на сайте берутся из живых тенантов Vitrina (кэш mega-hub). Это не статичный каталог: состав задаёт конструктор блока tenant_cards / listing_cards и scope проекта (список тенантов, темы, страна, город). Контент блога, описания и FAQ — материалы самого проекта, их пишет редактор в конструкторе mega-hub.',
  20
),
(
  'how-to-book',
  '{"ru": "Как бронировать"}'::jsonb,
  'Чтобы забронировать услугу, открой карточку и перейди по ссылке «Подробнее и бронь». Форма бронирования живёт у тенанта. На тематическом сайте можно только выбрать и понять предложение. Ассистент может подсказать, какая карточка ближе к запросу, и дать ссылку.',
  30
);

-- Home page + starter blocks for the seeded destination site
INSERT INTO hub.site_pages (site_id, slug, kind, title, sort_order)
SELECT id, 'home', 'home', '{"ru": "Главная"}'::jsonb, 0
FROM hub.sites WHERE slug = 'visit-kazakhstan';

INSERT INTO hub.site_pages (site_id, slug, kind, title, sort_order)
SELECT id, 'journal', 'blog', '{"ru": "Журнал"}'::jsonb, 10
FROM hub.sites WHERE slug = 'visit-kazakhstan';

INSERT INTO hub.site_blocks (page_id, type, payload, sort_order)
SELECT p.id, 'hero', '{"source": "site_settings"}'::jsonb, 0
FROM hub.site_pages p
JOIN hub.sites s ON s.id = p.site_id
WHERE s.slug = 'visit-kazakhstan' AND p.slug = 'home';

INSERT INTO hub.site_blocks (page_id, type, payload, sort_order)
SELECT p.id, 'info', '{"title": {"ru": "Зачем этот проект"}, "body": {"ru": "Витрина направления: живые карточки операторов плюс материалы, которые мы пишем сами — маршруты, сезоны, как ехать."}}'::jsonb, 10
FROM hub.site_pages p
JOIN hub.sites s ON s.id = p.site_id
WHERE s.slug = 'visit-kazakhstan' AND p.slug = 'home';

INSERT INTO hub.site_blocks (page_id, type, payload, sort_order)
SELECT p.id, 'tenant_cards', '{"mode": "scope", "limit": 12}'::jsonb, 20
FROM hub.site_pages p
JOIN hub.sites s ON s.id = p.site_id
WHERE s.slug = 'visit-kazakhstan' AND p.slug = 'home';

INSERT INTO hub.site_blocks (page_id, type, payload, sort_order)
SELECT p.id, 'listing_cards', '{"mode": "scope", "limit": 12}'::jsonb, 30
FROM hub.site_pages p
JOIN hub.sites s ON s.id = p.site_id
WHERE s.slug = 'visit-kazakhstan' AND p.slug = 'home';

INSERT INTO hub.site_blocks (page_id, type, payload, sort_order)
SELECT p.id, 'posts', '{"limit": 6}'::jsonb, 40
FROM hub.site_pages p
JOIN hub.sites s ON s.id = p.site_id
WHERE s.slug = 'visit-kazakhstan' AND p.slug = 'home';

INSERT INTO hub.site_posts (site_id, slug, title, excerpt, body, is_published, published_at)
SELECT id, 'when-to-go',
  '{"ru": "Когда ехать"}'::jsonb,
  '{"ru": "Короткий гид по сезонам степи, гор и озёр."}'::jsonb,
  '{"ru": "Весна и сентябрь — самый спокойный темп. Лето жаркое в степи, в горах прохладнее. Зима — для коротких городских программ."}'::jsonb,
  true, now()
FROM hub.sites WHERE slug = 'visit-kazakhstan';

INSERT INTO hub.site_knowledge (site_id, title, body, kind, sort_order)
SELECT id,
  '{"ru": "Тон сайта"}'::jsonb,
  'Visit Kazakhstan — витрина направления, не витрина одного продавца. Говори спокойно, без давления. Если гость ищет конкретный город — сначала карточки с этим city_code, потом статьи журнала.',
  'rule',
  10
FROM hub.sites WHERE slug = 'visit-kazakhstan';

NOTIFY pgrst, 'reload schema';
