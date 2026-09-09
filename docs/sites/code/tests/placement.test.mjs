// node --experimental-strip-types docs/sites/code/tests/placement.test.mjs
import assert from 'node:assert/strict'
import { applyPlacements, placedTenantIds, placementIsLive } from '../../types.ts'

const now = new Date('2026-09-09T12:00:00.000Z')
const day = 86_400_000

const placement = (over = {}) => ({
  id: 'p',
  site_id: 's',
  tenant_id: 't1',
  listing_id: 'l1',
  plan_id: null,
  slot: 'standard',
  sort_weight: 0,
  status: 'active',
  price_per_period: 900,
  currency: 'KGS',
  paid_until: new Date(now.getTime() + 10 * day).toISOString(),
  grace_days: 7,
  ...over,
})

const listing = (id, tenant, over = {}) => ({
  id,
  tenant_id: tenant,
  tenant_slug: tenant,
  tenant_name: tenant,
  page_slug: id,
  title: {},
  short_text: {},
  cover_image_url: null,
  images: [],
  price_from: null,
  price_currency: null,
  marketplace_themes: [],
  service_country_code: 'KG',
  service_city_codes: ['karakol'],
  next_departure_date: null,
  seats_left: null,
  featured: false,
  ...over,
})

// paid window
assert.equal(placementIsLive(placement(), now), true, 'paid placement is live')

// free / trial placement never expires
assert.equal(placementIsLive(placement({ paid_until: null }), now), true, 'free placement is live')

// grace keeps a late payer visible, but not forever
const latePaid = new Date(now.getTime() - 2 * day).toISOString()
assert.equal(placementIsLive(placement({ paid_until: latePaid }), now), true, 'inside grace stays live')
const longOverdue = new Date(now.getTime() - 30 * day).toISOString()
assert.equal(placementIsLive(placement({ paid_until: longOverdue }), now), false, 'past grace drops off')

// non-active statuses never render
for (const status of ['paused', 'expired', 'hidden', 'pending_payment']) {
  assert.equal(placementIsLive(placement({ status }), now), false, `${status} is not live`)
}

const listings = [
  listing('l1', 't1'),
  listing('l2', 't1'),
  listing('l3', 't2'),
]

// approved: only placed cards, ordered by slot then weight
const placements = [
  placement({ id: 'p1', listing_id: 'l2', tenant_id: 't1', slot: 'featured' }),
  placement({ id: 'p2', listing_id: 'l1', tenant_id: 't1', slot: 'standard', sort_weight: 5 }),
]

const approved = applyPlacements(listings, placements, 'approved', now)
assert.deepEqual(
  approved.map((l) => l.id),
  ['l2', 'l1'],
  'approved keeps only placed cards, featured first'
)
assert.equal(approved[0].featured, true, 'featured slot marks the card')

// expired placement must not leak onto the page
const expired = applyPlacements(
  listings,
  [placement({ listing_id: 'l1', paid_until: longOverdue })],
  'approved',
  now
)
assert.deepEqual(expired.map((l) => l.id), [], 'expired placement renders nothing')

// scope ignores placements entirely
assert.deepEqual(
  applyPlacements(listings, placements, 'scope', now).map((l) => l.id),
  ['l1', 'l2', 'l3'],
  'scope mode is untouched'
)

// mixed: placed cards first, unplaced tenants still allowed,
// but an unplaced card of a placed tenant is not a free ride
const mixed = applyPlacements(listings, placements, 'mixed', now)
assert.deepEqual(mixed.map((l) => l.id), ['l2', 'l1', 'l3'], 'mixed puts paid cards on top')

assert.deepEqual(
  [...placedTenantIds(placements, now)].sort(),
  ['t1'],
  'placed tenants are derived from live placements'
)

console.log('placement rules ok')
