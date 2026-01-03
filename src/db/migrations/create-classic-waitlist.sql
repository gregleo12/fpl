-- K-203: Classic League Waitlist
-- Stores email addresses of users interested in Classic League support

CREATE TABLE IF NOT EXISTS classic_waitlist (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_classic_waitlist_email ON classic_waitlist(email);
