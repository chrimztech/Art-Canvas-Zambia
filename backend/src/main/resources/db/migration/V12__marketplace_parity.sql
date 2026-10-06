-- =====================================================================
-- Marketplace parity: offers, follows, saved searches, curated collections,
-- coupons, gift cards, shipping fees, vacation mode, waitlists, in-app
-- notifications, reports/blocks, contact & advisory inbox, newsletter.
-- =====================================================================

-- OFFERS: buyers propose a price on an artwork; artists accept, decline or counter.
CREATE TABLE offers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    artwork_id UUID NOT NULL REFERENCES artworks(id) ON DELETE CASCADE,
    buyer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    artist_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount_zmw NUMERIC(12,2) NOT NULL CHECK (amount_zmw > 0),
    counter_amount_zmw NUMERIC(12,2) CHECK (counter_amount_zmw > 0),
    message TEXT CHECK (length(message) <= 1000),
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending','countered','accepted','declined','withdrawn','expired','purchased')),
    expires_at TIMESTAMPTZ NOT NULL,
    responded_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_offers_buyer ON offers(buyer_id, created_at DESC);
CREATE INDEX idx_offers_artist ON offers(artist_id, created_at DESC);
CREATE UNIQUE INDEX uq_offers_open ON offers(artwork_id, buyer_id) WHERE status IN ('pending','countered','accepted');

-- FOLLOWS: collectors follow artists and hear about new work.
CREATE TABLE follows (
    follower_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    artist_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (follower_id, artist_id),
    CHECK (follower_id <> artist_id)
);
CREATE INDEX idx_follows_artist ON follows(artist_id);

-- SAVED SEARCHES: alerts when newly published work matches.
CREATE TABLE saved_searches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    query TEXT,
    category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
    min_price_zmw NUMERIC(12,2),
    max_price_zmw NUMERIC(12,2),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_saved_searches_user ON saved_searches(user_id);

-- CURATED COLLECTIONS: editorial groupings shown on the home page and /collections.
CREATE TABLE collections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    description TEXT,
    cover_image_url TEXT,
    featured BOOLEAN NOT NULL DEFAULT false,
    published BOOLEAN NOT NULL DEFAULT true,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE collection_artworks (
    collection_id UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
    artwork_id UUID NOT NULL REFERENCES artworks(id) ON DELETE CASCADE,
    position INT NOT NULL DEFAULT 0,
    PRIMARY KEY (collection_id, artwork_id)
);

-- COUPONS: seller codes discount that seller's items; platform codes (seller_id NULL) discount everything.
CREATE TABLE coupons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL,
    seller_id UUID REFERENCES users(id) ON DELETE CASCADE,
    percent_off NUMERIC(5,2) CHECK (percent_off > 0 AND percent_off <= 90),
    amount_off_zmw NUMERIC(12,2) CHECK (amount_off_zmw > 0),
    min_order_zmw NUMERIC(12,2),
    starts_at TIMESTAMPTZ,
    ends_at TIMESTAMPTZ,
    max_redemptions INT CHECK (max_redemptions > 0),
    redemptions INT NOT NULL DEFAULT 0,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK ((percent_off IS NULL) <> (amount_off_zmw IS NULL))
);
CREATE UNIQUE INDEX uq_coupons_code ON coupons(upper(code));

-- GIFT CARDS: bought at checkout, redeemed as balance on later orders.
CREATE TABLE gift_cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    initial_amount_zmw NUMERIC(12,2) NOT NULL CHECK (initial_amount_zmw > 0),
    balance_zmw NUMERIC(12,2) NOT NULL CHECK (balance_zmw >= 0),
    purchaser_id UUID REFERENCES users(id) ON DELETE SET NULL,
    recipient_email TEXT,
    recipient_name TEXT,
    message TEXT CHECK (length(message) <= 500),
    order_item_id UUID REFERENCES order_items(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','disabled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ORDERS: discounts, shipping and gift-card amounts.
ALTER TABLE orders
    ADD COLUMN discount_zmw NUMERIC(12,2) NOT NULL DEFAULT 0,
    ADD COLUMN shipping_zmw NUMERIC(12,2) NOT NULL DEFAULT 0,
    ADD COLUMN gift_card_zmw NUMERIC(12,2) NOT NULL DEFAULT 0,
    ADD COLUMN coupon_code TEXT,
    ADD COLUMN gift_card_id UUID REFERENCES gift_cards(id) ON DELETE SET NULL;

ALTER TABLE order_items
    ADD COLUMN discount_zmw NUMERIC(12,2) NOT NULL DEFAULT 0,
    ADD COLUMN shipping_zmw NUMERIC(12,2) NOT NULL DEFAULT 0,
    ADD COLUMN offer_id UUID REFERENCES offers(id) ON DELETE SET NULL;

ALTER TABLE order_items DROP CONSTRAINT order_items_item_type_check;
ALTER TABLE order_items ADD CONSTRAINT order_items_item_type_check
    CHECK (item_type IN ('ARTWORK','SUPPLY','CLASS','EXHIBITION','COMMISSION','GIFT_CARD'));

-- SHIPPING FEES on physical listings (charged once per order line when delivered).
ALTER TABLE artworks ADD COLUMN shipping_fee_zmw NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (shipping_fee_zmw >= 0);
ALTER TABLE artworks ADD COLUMN accepts_offers BOOLEAN NOT NULL DEFAULT true;
-- Followers/saved-search alerts go out once per artwork, even if it's re-published later.
ALTER TABLE artworks ADD COLUMN announced_at TIMESTAMPTZ;
UPDATE artworks SET announced_at = created_at WHERE status IN ('published','sold');
ALTER TABLE supplies ADD COLUMN shipping_fee_zmw NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (shipping_fee_zmw >= 0);

-- SHOP SETTINGS on the seller's profile.
ALTER TABLE profiles
    ADD COLUMN shop_announcement TEXT CHECK (length(shop_announcement) <= 1000),
    ADD COLUMN vacation_mode BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN vacation_message TEXT CHECK (length(vacation_message) <= 500),
    ADD COLUMN return_policy TEXT CHECK (length(return_policy) <= 2000),
    ADD COLUMN verification_requested_at TIMESTAMPTZ;

-- WAITLISTS for full classes and exhibitions.
CREATE TABLE waitlist_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    item_type TEXT NOT NULL CHECK (item_type IN ('CLASS','EXHIBITION')),
    item_id UUID NOT NULL,
    notified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, item_type, item_id)
);
CREATE INDEX idx_waitlist_item ON waitlist_entries(item_type, item_id, created_at);

-- IN-APP NOTIFICATIONS (the bell), mirroring transactional emails.
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    body TEXT,
    link TEXT,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_notifications_user ON notifications(user_id, created_at DESC);

-- REPORTS (moderation queue) and BLOCKS (messaging).
CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_type TEXT NOT NULL CHECK (target_type IN ('ARTWORK','SUPPLY','CLASS','EXHIBITION','USER','REVIEW','MESSAGE')),
    target_id UUID NOT NULL,
    reason TEXT NOT NULL CHECK (reason IN ('counterfeit','inappropriate','spam','scam','copyright','harassment','other')),
    details TEXT CHECK (length(details) <= 2000),
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','resolved','dismissed')),
    admin_note TEXT,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_reports_status ON reports(status, created_at DESC);

CREATE TABLE user_blocks (
    blocker_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    blocked_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (blocker_id, blocked_id),
    CHECK (blocker_id <> blocked_id)
);

-- CONTACT & ART-ADVISORY INBOX, NEWSLETTER.
CREATE TABLE contact_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    name TEXT NOT NULL CHECK (length(name) <= 120),
    email TEXT NOT NULL CHECK (length(email) <= 254),
    topic TEXT NOT NULL CHECK (topic IN ('general','advisory','order','selling','press')),
    message TEXT NOT NULL CHECK (length(message) BETWEEN 1 AND 4000),
    budget_zmw NUMERIC(12,2),
    status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','handled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_contact_messages_status ON contact_messages(status, created_at DESC);

CREATE TABLE newsletter_subscribers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    unsubscribe_token TEXT NOT NULL UNIQUE,
    unsubscribed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX uq_newsletter_email ON newsletter_subscribers(lower(email));
