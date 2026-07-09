CREATE TABLE payout_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount_zmw NUMERIC(12,2) NOT NULL CHECK (amount_zmw > 0),
  method TEXT NOT NULL CHECK (method IN ('momo','bank')),
  phone TEXT,
  bank_name TEXT,
  receiver_id TEXT,
  reference_no TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'requested' CHECK (status IN ('requested','approved','processing','paid','failed','rejected')),
  transaction_id TEXT,
  operator_reference TEXT,
  admin_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_payout_requests_artist ON payout_requests(artist_id);
