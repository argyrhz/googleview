// POST /api/lead — receives one order from the form on the homepage and
// writes it to Postgres. This is the only way a submission is ever recorded;
// before it existed the form just opened the visitor's mail client and we
// kept nothing.
import { neon } from '@neondatabase/serverless';

const CONN =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.POSTGRES_PRISMA_URL;

const sql = CONN ? neon(CONN) : null;

// CREATE TABLE runs once per warm instance, not once per request.
let tableReady = null;
function ensureTable() {
  if (!tableReady) {
    tableReady = sql`
      CREATE TABLE IF NOT EXISTS leads (
        id         bigserial PRIMARY KEY,
        created_at timestamptz NOT NULL DEFAULT now(),
        name       text NOT NULL,
        business   text NOT NULL,
        phone      text NOT NULL,
        email      text NOT NULL,
        city       text,
        package    text,
        message    text,
        ip         text,
        user_agent text
      )`.catch((err) => {
      tableReady = null; // let the next request try again
      throw err;
    });
  }
  return tableReady;
}

const clean = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method_not_allowed' });
  }
  if (!sql) {
    console.error('No database connection string in the environment');
    return res.status(500).json({ error: 'no_database' });
  }

  try {
    const body =
      typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};

    // Honeypot: a field no human sees. Bots fill it, so we accept and drop.
    if (clean(body.website, 200)) return res.status(200).json({ ok: true });

    const lead = {
      name: clean(body.name, 120),
      business: clean(body.business, 160),
      phone: clean(body.phone, 40),
      email: clean(body.email, 160),
      city: clean(body.city, 120),
      pkg: clean(body.package, 120),
      message: clean(body.message, 4000),
    };

    if (!lead.name || !lead.business || !lead.phone || !lead.email) {
      return res.status(400).json({ error: 'missing_fields' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(lead.email)) {
      return res.status(400).json({ error: 'bad_email' });
    }

    await ensureTable();
    await sql`
      INSERT INTO leads (name, business, phone, email, city, package, message, ip, user_agent)
      VALUES (${lead.name}, ${lead.business}, ${lead.phone}, ${lead.email},
              ${lead.city}, ${lead.pkg}, ${lead.message},
              ${clean(req.headers['x-forwarded-for'], 120)},
              ${clean(req.headers['user-agent'], 300)})`;

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('lead insert failed:', err);
    return res.status(500).json({ error: 'server_error' });
  }
}
