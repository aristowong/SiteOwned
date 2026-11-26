CREATE TABLE IF NOT EXISTS clients (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  plan TEXT,
  active INTEGER NOT NULL DEFAULT 0,
  clinic INTEGER NOT NULL DEFAULT 0,
  repo TEXT,
  site_url TEXT,
  emails TEXT,
  phones TEXT,
  test_mode INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS students (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  tier TEXT NOT NULL,
  test_mode INTEGER NOT NULL DEFAULT 1,
  created_at TEXT,
  last_active TEXT
);

CREATE TABLE IF NOT EXISTS progress (
  student_id TEXT NOT NULL,
  lesson_id TEXT NOT NULL,
  completed INTEGER NOT NULL DEFAULT 0,
  quiz_score INTEGER,
  updated_at TEXT,
  PRIMARY KEY (student_id, lesson_id)
);

CREATE TABLE IF NOT EXISTS magic_links (
  token TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  expires_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  expires_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS intake (
  id TEXT PRIMARY KEY,
  created_at TEXT,
  name TEXT,
  business_name TEXT,
  email TEXT,
  phone TEXT,
  business_type TEXT,
  website_url TEXT,
  platform TEXT,
  package_interest TEXT,
  domain_owned TEXT,
  timeline TEXT,
  notes TEXT,
  test_mode INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS event_log (
  id TEXT PRIMARY KEY,
  created_at TEXT,
  kind TEXT,
  client_id TEXT,
  detail TEXT
);
