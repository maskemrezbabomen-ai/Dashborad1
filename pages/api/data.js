import { kv } from '@vercel/kv';

const DEFAULTS = {
  settings: {
    accountLabel: 'Prop Hesabım',
    firmName: '',
    startBalance: 10000,
    profitTarget: 8,
    dailyLossLimit: 5,
    totalLossLimit: 10,
  },
  entries: [],
  certificates: [],
  journal: [],
};

const VALID_KEYS = ['settings', 'entries', 'certificates', 'journal'];

export default async function handler(req, res) {
  const cookieAuth = req.cookies.auth;

  if (!cookieAuth || cookieAuth !== process.env.SITE_PASSWORD) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  if (req.method === 'GET') {
    try {
      const data = (await kv.get('app-data')) || DEFAULTS;

      return res.status(200).json({
        ...DEFAULTS,
        ...data,
      });
    } catch (e) {
      console.error('KV GET error:', e);
      return res.status(500).json({
        error: 'Veritabanı bağlantısı kurulamadı.',
      });
    }
  }

  if (req.method === 'POST') {
    const { key, value } = req.body || {};

    if (!VALID_KEYS.includes(key)) {
      return res.status(400).json({
        error: 'invalid key',
      });
    }

    try {
      const current = (await kv.get('app-data')) || DEFAULTS;

      current[key] = value;

      await kv.get('app-data'))

      return res.status(200).json({
        ok: true,
      });
    } catch (e) {
      console.error('KV POST error:', e);
      return res.status(500).json({
        error: 'Kaydetme başarısız.',
      });
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).end('Method Not Allowed');
}
