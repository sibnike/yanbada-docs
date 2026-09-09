-- Заглушка окружения mega-vitrina, чтобы прогнать hub.* DDL на пустом Postgres.
-- Только для локальной проверки миграций: роли, схемы, RLS-хелперы и кэш.
-- В реальной базе всё это уже есть — не копировать в migrations.

DO $$ BEGIN CREATE ROLE anon NOLOGIN; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE ROLE authenticated NOLOGIN; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE ROLE service_role NOLOGIN; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE SCHEMA auth;
CREATE SCHEMA hub;

CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT NULL::uuid $$;

CREATE TABLE public.tenants (
  id    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name  text NOT NULL,
  slug  text NOT NULL UNIQUE
);

CREATE FUNCTION public.is_platform_admin() RETURNS boolean
  LANGUAGE sql STABLE SECURITY DEFINER AS $$ SELECT false $$;

CREATE FUNCTION public.is_tenant_admin(tid uuid) RETURNS boolean
  LANGUAGE sql STABLE SECURITY DEFINER AS $$ SELECT false $$;

CREATE FUNCTION public.current_user_tenants() RETURNS SETOF uuid
  LANGUAGE sql STABLE SECURITY DEFINER AS $$ SELECT NULL::uuid WHERE false $$;

-- Кэш из Vitrina: только колонки, которые читает витрина market
CREATE TABLE hub.company_cache (
  tenant_id          uuid PRIMARY KEY,
  name               text,
  city               text,
  country            text,
  logo_url           text,
  cover_photo_url    text,
  short_description  text,
  about              jsonb,
  gallery            jsonb DEFAULT '[]',
  marketplace_themes text[] DEFAULT '{}'
);

CREATE TABLE hub.listing_cache (
  id                   uuid PRIMARY KEY,
  tenant_id            uuid NOT NULL,
  page_slug            text NOT NULL,
  title                jsonb,
  short_text           jsonb,
  marketplace_themes   text[] DEFAULT '{}',
  marketplace_slugs    text[] DEFAULT '{}',
  price_from           numeric,
  price_currency       text,
  cover_image_url      text,
  images               text[] DEFAULT '{}',
  next_departure_date  date,
  seats_left           int,
  service_country_code text,
  service_city_codes   text[] DEFAULT '{}'
);
