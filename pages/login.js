import { useState } from 'react';
import { useRouter } from 'next/router';

export default function Login() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (data.ok) {
        router.push('/');
      } else {
        setError(data.error || 'Yanlış şifre.');
      }
    } catch (e) {
      setError('Bağlantı hatası, tekrar dene.');
    }
    setLoading(false);
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#0F1113'
    }}>
      <form onSubmit={handleSubmit} style={{
        background: '#17191C', border: '1px solid #2A2D31', borderRadius: 12,
        padding: 32, width: '100%', maxWidth: 340
      }}>
        <h1 style={{ color: '#ECE9E2', fontFamily: 'Manrope, sans-serif', fontSize: 20, fontWeight: 800, marginTop: 0, marginBottom: 20 }}>
          Hesap Paneli
        </h1>
        <label style={{ color: '#8A8F96', fontFamily: 'Manrope, sans-serif', fontSize: 13, display: 'block', marginBottom: 6 }}>
          Şifre
        </label>
        <input
          type="password"
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{
            width: '100%', background: '#14161A', border: '1px solid #2A2D31', borderRadius: 6,
            color: '#ECE9E2', padding: '10px 12px', fontSize: 14, outline: 'none', boxSizing: 'border-box'
          }}
        />
        {error && <div style={{ color: '#C1614F', fontSize: 13, marginTop: 10 }}>{error}</div>}
        <button type="submit" disabled={loading} style={{
          marginTop: 18, width: '100%', background: '#C99A3E', color: '#14110A', border: 'none',
          borderRadius: 6, padding: '11px 0', fontFamily: 'Manrope, sans-serif', fontWeight: 700,
          fontSize: 14, cursor: 'pointer'
        }}>
          {loading ? 'Giriş yapılıyor…' : 'Giriş Yap'}
        </button>
      </form>
    </div>
  );
}
