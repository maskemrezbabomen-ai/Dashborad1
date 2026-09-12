export default function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end('Method Not Allowed');
  }

  const { password } = req.body || {};

  if (!process.env.SITE_PASSWORD) {
    return res.status(500).json({ ok: false, error: 'SITE_PASSWORD ortam değişkeni ayarlanmamış.' });
  }

  if (password && password === process.env.SITE_PASSWORD) {
    res.setHeader(
      'Set-Cookie',
      `auth=${process.env.SITE_PASSWORD}; HttpOnly; Path=/; Max-Age=2592000; SameSite=Lax; Secure`
    );
    return res.status(200).json({ ok: true });
  }

  return res.status(401).json({ ok: false, error: 'Yanlış şifre.' });
}
