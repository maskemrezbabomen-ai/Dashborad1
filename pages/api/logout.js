export default function handler(req, res) {
  res.setHeader('Set-Cookie', 'auth=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax; Secure');
  res.status(200).json({ ok: true });
}
