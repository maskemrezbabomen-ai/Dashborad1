import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

const DEFAULT_SETTINGS = {
  accountLabel: 'Prop Hesabım',
  firmName: '',
  startBalance: 10000,
  profitTarget: 8,
  dailyLossLimit: 5,
  totalLossLimit: 10,
};

const fmt = (n) => '$' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtPct = (n) => (n >= 0 ? '%' : '−%') + Math.abs(n).toFixed(2);
const today = () => new Date().toISOString().slice(0, 10);

export default function Dashboard() {
  const router = useRouter();
  const [loaded, setLoaded] = useState(false);
  const [view, setView] = useState('dashboard');
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [entries, setEntries] = useState([]);
  const [certificates, setCertificates] = useState([]);
  const [journal, setJournal] = useState([]);
  const [status, setStatus] = useState({});
  const [lightbox, setLightbox] = useState(null);

  useEffect(() => {
    fetch('/api/data')
      .then((r) => {
        if (r.status === 401) { router.push('/login'); return null; }
        return r.json();
      })
      .then((data) => {
        if (!data) return;
        setSettings({ ...DEFAULT_SETTINGS, ...data.settings });
        setEntries((data.entries || []).slice().sort((a, b) => a.date.localeCompare(b.date)));
        setCertificates(data.certificates || []);
        setJournal((data.journal || []).slice().sort((a, b) => b.date.localeCompare(a.date)));
        setLoaded(true);
      });
  }, []);

  function flash(key, msg) {
    setStatus((s) => ({ ...s, [key]: msg }));
    setTimeout(() => setStatus((s) => (s[key] === msg ? { ...s, [key]: '' } : s)), 2500);
  }

  async function persist(key, value) {
    const res = await fetch('/api/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, value }),
    });
    return res.ok;
  }

  async function handleLogout() {
    await fetch('/api/logout', { method: 'POST' });
    router.push('/login');
  }

  if (!loaded) return null;

  const balance = entries.length ? entries[entries.length - 1].balance : settings.startBalance;
  const start = settings.startBalance;
  const totalReturn = start > 0 ? ((balance - start) / start) * 100 : 0;
  const peak = Math.max(start, ...entries.map((e) => e.balance));
  const drawdown = peak > 0 ? ((peak - balance) / peak) * 100 : 0;

  function todayLoss() {
    if (!entries.length) return 0;
    const last = entries[entries.length - 1];
    const sameDay = entries.filter((e) => e.date === last.date);
    if (sameDay.length > 1) return Math.max(sameDay[0].balance - last.balance, 0);
    const idx = entries.indexOf(last);
    const prevBalance = idx > 0 ? entries[idx - 1].balance : start;
    return Math.max(prevBalance - last.balance, 0);
  }

  const profitTargetAmt = start * (settings.profitTarget / 100);
  const gained = Math.max(balance - start, 0);
  const profitPct = profitTargetAmt > 0 ? Math.min(gained / profitTargetAmt, 1) * 100 : 0;

  const dailyLossLimitAmt = start * (settings.dailyLossLimit / 100);
  const dLoss = todayLoss();
  const dailyPct = dailyLossLimitAmt > 0 ? Math.min(dLoss / dailyLossLimitAmt, 1) * 100 : 0;

  const totalLossLimitAmt = start * (settings.totalLossLimit / 100);
  const tLoss = Math.max(start - balance, 0);
  const totalPct = totalLossLimitAmt > 0 ? Math.min(tLoss / totalLossLimitAmt, 1) * 100 : 0;

  const barClass = (pct) => (pct >= 100 ? 'breach' : pct >= 70 ? 'warn' : 'ok');

  // Chart geometry
  const chartPoints = [{ date: 'start', balance: start }, ...entries];
  const values = chartPoints.map((p) => p.balance);
  const min = Math.min(...values, start);
  const max = Math.max(...values, start);
  const range = max - min || 1;
  const W = 860, H = 180, pad = 10;
  const coords = chartPoints.map((p, i) => {
    const x = chartPoints.length === 1 ? W / 2 : (i / (chartPoints.length - 1)) * W;
    const y = H - pad - ((p.balance - min) / range) * (H - pad * 2);
    return [x, y];
  });
  const linePath = coords.map((c, i) => (i === 0 ? 'M' : 'L') + c[0].toFixed(1) + ',' + c[1].toFixed(1)).join(' ');
  const fillPath = linePath + ` L${W},${H} L0,${H} Z`;

  async function addEntry(date, balanceVal, note) {
    if (!date) return flash('dash', 'Lütfen bir tarih seç.');
    if (isNaN(balanceVal)) return flash('dash', 'Lütfen geçerli bir bakiye gir.');
    const next = entries.filter((e) => e.date !== date);
    next.push({ id: Date.now().toString(), date, balance: balanceVal, note });
    next.sort((a, b) => a.date.localeCompare(b.date));
    setEntries(next);
    const ok = await persist('entries', next);
    flash('dash', ok ? 'Kayıt eklendi.' : 'Kaydedilemedi, tekrar dene.');
  }

  async function deleteEntry(id) {
    const next = entries.filter((e) => e.id !== id);
    setEntries(next);
    await persist('entries', next);
    flash('dash', 'Kayıt silindi.');
  }

  async function saveSettings(next) {
    setSettings(next);
    const ok = await persist('settings', next);
    flash('settings', ok ? 'Ayarlar kaydedildi.' : 'Kaydedilemedi, tekrar dene.');
  }

  function resizeImageToDataUrl(file, maxDim, quality) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          let { width, height } = img;
          if (width > maxDim || height > maxDim) {
            if (width > height) { height = Math.round(height * (maxDim / width)); width = maxDim; }
            else { width = Math.round(width * (maxDim / height)); height = maxDim; }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width; canvas.height = height;
          canvas.getContext('2d').drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = reject;
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function addCertificate(file, title, note) {
    if (!file) return flash('cert', 'Lütfen bir görsel seç.');
    if (!title) return flash('cert', 'Lütfen bir başlık gir.');
    flash('cert', 'Yükleniyor…');
    try {
      const dataUrl = await resizeImageToDataUrl(file, 900, 0.75);
      const next = [{ id: Date.now().toString(), title, note, dataUrl, addedAt: today() }, ...certificates];
      setCertificates(next);
      const ok = await persist('certificates', next);
      flash('cert', ok ? 'Sertifika eklendi.' : 'Görsel çok büyük olabilir, kaydedilemedi.');
    } catch (e) {
      flash('cert', 'Görsel işlenemedi, tekrar dene.');
    }
  }

  async function deleteCertificate(id) {
    const next = certificates.filter((c) => c.id !== id);
    setCertificates(next);
    await persist('certificates', next);
    flash('cert', 'Sertifika silindi.');
  }

  async function addJournalEntry(date, text) {
    if (!date) return flash('journal', 'Lütfen bir tarih seç.');
    if (!text) return flash('journal', 'Lütfen bir not yaz.');
    const next = [{ id: Date.now().toString(), date, text }, ...journal].sort((a, b) => b.date.localeCompare(a.date));
    setJournal(next);
    const ok = await persist('journal', next);
    flash('journal', ok ? 'Not kaydedildi.' : 'Kaydedilemedi, tekrar dene.');
  }

  async function deleteJournalEntry(id) {
    const next = journal.filter((e) => e.id !== id);
    setJournal(next);
    await persist('journal', next);
    flash('journal', 'Not silindi.');
  }

return (
  <div className="app">
    <div className="sidebar">

      <div className="sidebar-brand">
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transform: 'translateY(30px)',
          }}
        >
          <img
            src="https://i.hizliresim.com/uzrix90x.png"
            alt="EmreTrades Logo"
            style={{
              width: '32px',
              height: '32px',
              objectFit: 'contain',
            }}
          />

<div
  className="name"
  style={{
    fontSize: '18px',
    fontWeight: 700,
  }}
>
  <span style={{ color: '#ffffff' }}>EMRE</span>
  <span style={{ color: '#4BE0C2' }}>TRADES</span>
</div>
        </div>
      </div>
<div
  style={{
    margin: '18px 22px 18px',
    color: 'rgba(255,255,255,0.45)',
    fontSize: '10px',
    fontWeight: 600,
    letterSpacing: '1.5px',
  }}
>
  WORKSPACE
</div>

<div className="nav" style={{ transform: 'translateY(-5px)' }}>
<div
  className={`nav-item ${view === 'dashboard' ? 'active' : ''}`}
  onClick={() => setView('dashboard')}
  style={{
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  }}
>
<img
  src="https://img.icons8.com/material-outlined/24/dashboard-layout.png"
  alt=""
  style={{
    width: '16px',
    height: '16px',
    objectFit: 'contain',
    flexShrink: 0,
    filter: view === 'dashboard'
      ? 'brightness(0) saturate(100%) invert(78%) sepia(45%) saturate(700%) hue-rotate(120deg) brightness(95%) contrast(90%)'
      : 'brightness(0) invert(1)',
  }}
/>
  <span>Dashboard</span>
</div>
  <NavItem label="Sertifikalar" active={view === 'certificates'} onClick={() => setView('certificates')} />
  <NavItem label="Notlar" active={view === 'journal'} onClick={() => setView('journal')} />
</div>

<div style={{ flex: 1 }}></div>

<div
  className="nav"
  style={{
    transform: 'translateY(-100px)',
  }}
>
<div
  className={`nav-item ${view === 'settings' ? 'active' : ''}`}
  onClick={() => setView('settings')}
>
  <img
    src="https://img.icons8.com/ios/50/settings.png"
    alt=""
    style={{
      width: '18px',
      height: '18px',
      filter: 'brightness(0) invert(1)',
}}
  />
  <span>Ayarlar</span>
</div>

<div
  style={{
    width: '90%',
    height: '1px',
    background: 'rgba(255,255,255,0.15)',
    margin: '-25px auto 0',
    position: 'relative',
    top: '28px',
  }}
></div>

<div className="profile-footer">
  <div className="profile-line"></div>

  <div
    style={{
      width: '100%',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      textAlign: 'center',
    }}
  >
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '9px',
        position: 'relative',
        top: '150px',
      }}
    >
      <img
        src="https://i.hizliresim.com/xjm282gg.jpg"
        alt="Emre"
        style={{
          marginLeft: '-90px',
          width: '40px',
          height: '40px',
          objectFit: 'cover',
          borderRadius: '6px',
          display: 'block',
        }}
      />

      <span
        style={{
          color: 'var(--text)',
          fontSize: '14px',
          fontWeight: 600,
        }}
      >
        Emre
      </span>
    </div>
  </div>
</div>

</div>

</div>

<div className="main">
        <div className="wrap">
          {view === 'dashboard' && (
            <>
              <div className="page-title">Dashboard</div>
              <div className="hero">
                <div className="label">GÜNCEL BAKİYE</div>
                <div className="hero-row">
                  <div className="balance">{fmt(balance)}</div>
                  {entries.length === 0 ? (
                    <div className="delta zero">Henüz kayıt yok</div>
                  ) : (
                    <div className={`delta ${balance - start > 0 ? 'pos' : balance - start < 0 ? 'neg' : 'zero'}`}>
                      {balance - start >= 0 ? '+' : ''}{fmt(balance - start)} ({fmtPct(totalReturn)})
                    </div>
                  )}
                </div>
              </div>

              <div className="chart-box">
                {entries.length === 0 ? (
                  <div className="chart-empty">Bir bakiye girişi ekledikçe grafik burada oluşacak.</div>
                ) : (
                  <svg className="chart" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#C99A3E" stopOpacity="0.28" />
                        <stop offset="100%" stopColor="#C99A3E" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    {[0, 1, 2, 3].map((i) => (
                      <line key={i} x1="0" x2={W} y1={(H / 3) * i} y2={(H / 3) * i} className="chart-grid" />
                    ))}
                    <path d={fillPath} className="chart-fill" />
                    <path d={linePath} className="chart-line" />
                    {coords.map(([x, y], i) => (
                      <circle key={i} cx={x} cy={y} r="3.5" className="chart-dot" />
                    ))}
                  </svg>
                )}
              </div>

              <div className="stat-strip">
                <div className="stat">
                  <div className="stat-label">Toplam Getiri</div>
                  <div className={`stat-value ${totalReturn > 0 ? 'pos' : totalReturn < 0 ? 'neg' : ''}`}>{fmtPct(totalReturn)}</div>
                </div>
                <div className="stat">
                  <div className="stat-label">Zirveden Düşüş</div>
                  <div className={`stat-value ${drawdown > 0 ? 'neg' : ''}`}>%{drawdown.toFixed(2)}</div>
                </div>
                <div className="stat">
                  <div className="stat-label">İşlem Günü</div>
                  <div className="stat-value">{entries.length}</div>
                </div>
              </div>

              <div className="rules">
                <h2>Kural Takibi</h2>
                <RuleRow name="Kâr Hedefi" val={`${fmt(gained)} / ${fmt(profitTargetAmt)}`} pct={profitPct} cls="ok" />
                <RuleRow name="Günlük Kayıp Limiti" val={`${fmt(dLoss)} / ${fmt(dailyLossLimitAmt)}`} pct={dailyPct} cls={barClass(dailyPct)} />
                <RuleRow name="Toplam Kayıp Limiti" val={`${fmt(tLoss)} / ${fmt(totalLossLimitAmt)}`} pct={totalPct} cls={barClass(totalPct)} />
              </div>

              <EntryForm onAdd={addEntry} />
              {status.dash && <div className="status-line">{status.dash}</div>}

              <div className="panel">
                <h2>Geçmiş</h2>
                {entries.length === 0 ? (
                  <div className="empty-hist">Henüz kayıt yok. Yukarıdan ilk bakiyeni ekle.</div>
                ) : (
                  <table>
                    <thead><tr><th>Tarih</th><th>Bakiye</th><th>Değişim</th><th>Not</th><th></th></tr></thead>
                    <tbody>
                      {[...entries].reverse().map((entry) => {
                        const idx = entries.indexOf(entry);
                        const prevBalance = idx > 0 ? entries[idx - 1].balance : start;
                        const change = entry.balance - prevBalance;
                        return (
                          <tr key={entry.id}>
                            <td>{entry.date}</td>
                            <td className="num">{fmt(entry.balance)}</td>
                            <td className={`num change ${change > 0 ? 'pos' : change < 0 ? 'neg' : ''}`}>{change >= 0 ? '+' : ''}{fmt(change)}</td>
                            <td className="note-cell">{entry.note || '—'}</td>
                            <td style={{ textAlign: 'right' }}><button className="del-btn" onClick={() => deleteEntry(entry.id)}>Sil</button></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          )}

          {view === 'certificates' && (
            <>
              <div className="page-title">Sertifikalar</div>
              <CertificateForm onAdd={addCertificate} status={status.cert} />
              {certificates.length === 0 ? (
                <div className="empty-state">Henüz sertifika eklenmedi.</div>
              ) : (
                <div className="cert-grid">
                  {certificates.map((cert) => (
                    <div className="cert-card" key={cert.id}>
                      <img className="cert-thumb" src={cert.dataUrl} alt={cert.title} onClick={() => setLightbox(cert.dataUrl)} />
                      <div className="cert-info">
                        <div className="cert-title">{cert.title}</div>
                        <div className="cert-meta">{cert.note ? cert.note + ' · ' : ''}{cert.addedAt}</div>
                      </div>
                      <div className="cert-card-actions"><button className="del-btn" onClick={() => deleteCertificate(cert.id)}>Sil</button></div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {view === 'journal' && (
            <>
              <div className="page-title">Notlar</div>
              <JournalForm onAdd={addJournalEntry} status={status.journal} />
              <div className="panel">
                <h2>Geçmiş Notlar</h2>
                {journal.length === 0 ? (
                  <div className="empty-state">Henüz not eklenmedi.</div>
                ) : (
                  journal.map((entry) => (
                    <div className="journal-entry" key={entry.id}>
                      <div className="journal-date">{entry.date} <button className="del-btn" onClick={() => deleteJournalEntry(entry.id)}>Sil</button></div>
                      <div className="journal-text">{entry.text}</div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}

          {view === 'settings' && (
            <SettingsForm settings={settings} onSave={saveSettings} status={status.settings} />
          )}
        </div>
      </div>

      {lightbox && (
        <div className="overlay" onClick={() => setLightbox(null)}>
          <button className="overlay-close" onClick={() => setLightbox(null)}>Kapat</button>
          <img src={lightbox} alt="Sertifika" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
}

function NavItem({ label, active, onClick }) {
  return (
    <div className={`nav-item ${active ? 'active' : ''}`} onClick={onClick}>
      <span className="nav-dot" />{label}
    </div>
  );
}

function RuleRow({ name, val, pct, cls }) {
  return (
    <div className="rule-row">
      <div className="rule-top"><span className="name">{name}</span><span className="val">{val}</span></div>
      <div className="rule-bar"><div className={`rule-bar-fill ${cls}`} style={{ width: `${pct}%` }} /></div>
    </div>
  );
}

function EntryForm({ onAdd }) {
  const [date, setDate] = useState(today());
  const [balance, setBalance] = useState('');
  const [note, setNote] = useState('');
  return (
    <div className="panel">
      <h2>Yeni Kayıt Ekle</h2>
      <div className="form-row">
        <div className="field">
          <label>Tarih</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="field">
          <label>Bakiye ($)</label>
          <input type="number" step="0.01" placeholder="10250.00" value={balance} onChange={(e) => setBalance(e.target.value)} />
        </div>
        <div className="field grow text-field">
          <label>Not (opsiyonel)</label>
          <input type="text" placeholder="ör. haber sonrası pozisyon" value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
        <button className="btn" onClick={() => { onAdd(date, parseFloat(balance), note); setBalance(''); setNote(''); }}>Ekle</button>
      </div>
    </div>
  );
}

function CertificateForm({ onAdd, status }) {
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState('Dosya seç…');
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  return (
    <div className="panel">
      <h2>Sertifika Ekle</h2>
      <div className="cert-upload-row">
        <div className="field">
          <label>Görsel</label>
          <label className="file-btn">
            {fileName}
            <input type="file" accept="image/*" style={{ display: 'none' }}
              onChange={(e) => { const f = e.target.files[0]; setFile(f); setFileName(f ? f.name : 'Dosya seç…'); }} />
          </label>
        </div>
        <div className="field grow text-field">
          <label>Başlık</label>
          <input type="text" placeholder="ör. Phase 1 Geçiş Sertifikası" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="field grow text-field">
          <label>Not (opsiyonel)</label>
          <input type="text" placeholder="ör. FTMO — 100k hesap" value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
        <button className="btn" onClick={() => { onAdd(file, title, note); setFile(null); setFileName('Dosya seç…'); setTitle(''); setNote(''); }}>Ekle</button>
      </div>
      {status && <div className="status-line">{status}</div>}
    </div>
  );
}

function JournalForm({ onAdd, status }) {
  const [date, setDate] = useState(today());
  const [text, setText] = useState('');
  return (
    <div className="panel">
      <h2>Yeni Not</h2>
      <div className="form-row" style={{ alignItems: 'flex-start' }}>
        <div className="field">
          <label>Tarih</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="field grow text-field">
          <label>Not</label>
          <textarea placeholder="Bugünkü işlemler, gözlemler, dersler…" value={text} onChange={(e) => setText(e.target.value)} />
        </div>
      </div>
      <div style={{ marginTop: 12 }}>
        <button className="btn" onClick={() => { onAdd(date, text.trim()); setText(''); }}>Kaydet</button>
      </div>
      {status && <div className="status-line">{status}</div>}
    </div>
  );
}

function SettingsForm({ settings, onSave, status }) {
  const [form, setForm] = useState(settings);
  useEffect(() => setForm(settings), [settings]);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <>
      <div className="page-title">Ayarlar</div>
      <div className="panel">
        <h2>Hesap Bilgisi</h2>
        <div className="settings-grid">
          <div className="field full text-field">
            <label>Hesap adı</label>
            <input type="text" value={form.accountLabel} onChange={(e) => set('accountLabel', e.target.value)} />
          </div>
          <div className="field full text-field">
            <label>Prop firma adı</label>
            <input type="text" value={form.firmName} onChange={(e) => set('firmName', e.target.value)} />
          </div>
        </div>
      </div>
      <div className="panel">
        <h2>Kural Ayarları</h2>
        <div className="settings-grid">
          <div className="field">
            <label>Başlangıç Bakiyesi ($)</label>
            <input type="number" step="0.01" value={form.startBalance} onChange={(e) => set('startBalance', parseFloat(e.target.value) || 0)} />
          </div>
          <div className="field">
            <label>Kâr Hedefi (%)</label>
            <input type="number" step="0.1" value={form.profitTarget} onChange={(e) => set('profitTarget', parseFloat(e.target.value) || 0)} />
          </div>
          <div className="field">
            <label>Günlük Maks. Kayıp Limiti (%)</label>
            <input type="number" step="0.1" value={form.dailyLossLimit} onChange={(e) => set('dailyLossLimit', parseFloat(e.target.value) || 0)} />
          </div>
          <div className="field">
            <label>Toplam Maks. Kayıp Limiti (%)</label>
            <input type="number" step="0.1" value={form.totalLossLimit} onChange={(e) => set('totalLossLimit', parseFloat(e.target.value) || 0)} />
          </div>
        </div>
        <div style={{ marginTop: 18 }}>
          <button className="btn" onClick={() => onSave(form)}>Kaydet</button>
        </div>
        {status && <div className="status-line">{status}</div>}
      </div>
    </>
  );
}
