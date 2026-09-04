// GET /api/leads — the private list behind /admin.html.
// Guarded by ADMIN_PASSWORD, which lives only in the Vercel environment. The
// password is never in the page source and never in the repo.
import { neon } from '@neondatabase/serverless';

const CONN =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.POSTGRES_PRISMA_URL;

const sql = CONN ? neon(CONN) : null;

// Compare without leaking length or position through timing.
function sameSecret(given, expected) {
  if (typeof given !== 'string' || typeof expected !== 'string') return false;
  if (given.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < given.length; i++) {
    diff |= given.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) {
    return res.status(500).json({ error: 'no_password_configured' });
  }

  const given = req.headers['x-admin-key'];
  await sleep(400); // a wrong guess always costs ~0.4s, so guessing is slow
  if (!sameSecret(Array.isArray(given) ? given[0] : given || '', expected)) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  if (!sql) return res.status(500).json({ error: 'no_database' });

  try {
    const rows = await sql`
      SELECT id, created_at, name, business, phone, email, city, package, message
      FROM leads
      ORDER BY created_at DESC
      LIMIT 1000`;
    return res.status(200).json({ rows });
  } catch (err) {
    // Nobody has submitted yet, so /api/lead never created the table.
    if (/relation .* does not exist/i.test(String(err && err.message))) {
      return res.status(200).json({ rows: [] });
    }
    console.error('lead read failed:', err);
    return res.status(500).json({ error: 'server_error' });
  }
}
