import type { SiteBlockType, SiteTemplate } from '@/types/site'

export const SITE_TEMPLATE_OPTIONS: { id: SiteTemplate; label: string; hint: string }[] = [
  {
    id: 'visit_center',
    label: 'Визит-центр / город',
    hint: 'Несколько компаний, подбор туров, карта всех маршрутов',
  },
  {
    id: 'tour_operator',
    label: 'Турфирма',
    hint: 'Свои туры, маршрут выбранного тура, бронь в Vitrina',
  },
  {
    id: 'guide',
    label: 'Гид / малый оператор',
    hint: 'Короче: обложка, туры, маршрут, контакты',
  },
]

type StarterBlock = {
  type: SiteBlockType
  payload: Record<string, unknown>
  sort_order: number
}

export function templateBlocks(template: SiteTemplate): StarterBlock[] {
  if (template === 'guide') {
    return [
      {
        type: 'hero',
        payload: {
          source: 'site_settings',
          actions: [{ label: { ru: 'Туры' }, href: '#tours' }],
        },
        sort_order: 0,
      },
      {
        type: 'tour_picker',
        payload: { title: { ru: 'Туры' }, layout: 'dense', limit: 6, anchor: 'tours' },
        sort_order: 10,
      },
      {
        type: 'route_map',
        payload: { title: { ru: 'Маршрут' }, mode: 'selected' },
        sort_order: 20,
      },
      {
        type: 'info',
        payload: { title: { ru: 'О гиде' }, body: { ru: 'Расскажите, с кем едут гости.' } },
        sort_order: 30,
      },
      {
        type: 'contacts',
        payload: { title: { ru: 'Связаться' }, items: [{ kind: 'telegram', value: '@' }] },
        sort_order: 40,
      },
    ]
  }

  if (template === 'tour_operator') {
    return [
      {
        type: 'hero',
        payload: {
          source: 'site_settings',
          actions: [
            { label: { ru: 'Выбрать тур' }, href: '#tours' },
            { label: { ru: 'Маршрут' }, href: '#route' },
          ],
        },
        sort_order: 0,
      },
      {
        type: 'tour_picker',
        payload: { title: { ru: 'Наши туры' }, layout: 'dense', limit: 12, anchor: 'tours' },
        sort_order: 10,
      },
      {
        type: 'route_map',
        payload: { title: { ru: 'Маршрут тура' }, mode: 'selected', anchor: 'route' },
        sort_order: 20,
      },
      {
        type: 'info',
        payload: {
          title: { ru: 'Как проходит поездка' },
          body: { ru: 'Даты, цена и места правятся в Vitrina. Здесь — витрина и карта.' },
        },
        sort_order: 30,
      },
      {
        type: 'contacts',
        payload: { title: { ru: 'Контакты' }, items: [{ kind: 'telegram', value: '@' }] },
        sort_order: 40,
      },
    ]
  }

  return [
    {
      type: 'hero',
      payload: {
        source: 'site_settings',
        actions: [
          { label: { ru: 'Подобрать тур' }, href: '#tours' },
          { label: { ru: 'Карта' }, href: '#route' },
        ],
      },
      sort_order: 0,
    },
    {
      type: 'tour_picker',
      payload: {
        title: { ru: 'Туры города' },
        layout: 'split',
        limit: 24,
        anchor: 'tours',
      },
      sort_order: 10,
    },
    {
      type: 'tenant_cards',
      payload: { title: { ru: 'Кто работает в городе' }, limit: 12 },
      sort_order: 20,
    },
    {
      type: 'route_map',
      payload: { title: { ru: 'Маршруты на карте' }, mode: 'all', anchor: 'route' },
      sort_order: 30,
    },
    {
      type: 'info',
      payload: {
        title: { ru: 'О витрине' },
        body: { ru: 'Подбор живых туров из Vitrina. Бронь — на странице услуги.' },
      },
      sort_order: 40,
    },
    {
      type: 'contacts',
      payload: { title: { ru: 'Визит-центр' }, items: [{ kind: 'telegram', value: '@' }] },
      sort_order: 50,
    },
  ]
}
