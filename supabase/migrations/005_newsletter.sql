-- Newsletter subscribers table
-- Allows anonymous inserts (public can subscribe), only superadmins can read

CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email      text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT newsletter_email_unique UNIQUE (email)
);

ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY;

-- Anyone can subscribe (insert)
CREATE POLICY "newsletter_public_insert"
  ON newsletter_subscribers
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Only superadmins can read the list
CREATE POLICY "newsletter_superadmin_select"
  ON newsletter_subscribers
  FOR SELECT
  TO authenticated
  USING (is_superadmin());
