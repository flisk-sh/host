-- host storage on D1. Never a provider key in plain text.
CREATE TABLE IF NOT EXISTS keys (
  hash TEXT PRIMARY KEY,        -- SHA-256 of the host key
  id TEXT NOT NULL,             -- first 12 characters of the hash, shown and used to revoke
  login TEXT NOT NULL,          -- GitHub login
  name TEXT NOT NULL,
  hint TEXT NOT NULL DEFAULT '',
  created TEXT,
  last_used TEXT
);
CREATE INDEX IF NOT EXISTS keys_login ON keys (login);

-- Hosting-provider keys connected in the cabinet, encrypted with PROVIDER_KEYS_SECRET (src/vault.js).
CREATE TABLE IF NOT EXISTS provider_keys (
  login TEXT NOT NULL,
  provider TEXT NOT NULL,
  sealed TEXT NOT NULL,          -- base64(iv || AES-GCM ciphertext)
  hint TEXT NOT NULL,            -- last 4 characters
  created TEXT NOT NULL,
  PRIMARY KEY (login, provider)
);

-- Pod hosts (fleetd) host started, one row each. The fleetd token is sealed like a provider key.
CREATE TABLE IF NOT EXISTS hosts (
  n INTEGER PRIMARY KEY AUTOINCREMENT,
  login TEXT NOT NULL,
  ref TEXT NOT NULL,             -- host_<provider>_<provider id>
  provider TEXT NOT NULL,
  url TEXT NOT NULL,
  sealed_token TEXT NOT NULL,
  created TEXT NOT NULL,
  removed TEXT
);
CREATE INDEX IF NOT EXISTS hosts_login ON hosts (login, created);
CREATE INDEX IF NOT EXISTS hosts_ref ON hosts (login, ref);
