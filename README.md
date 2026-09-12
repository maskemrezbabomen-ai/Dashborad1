# Prop Firma Hesap Paneli

Şifre korumalı, kişisel forex prop firma hesap takip paneli. Next.js ile yazıldı, Vercel üzerinde ücretsiz olarak barındırılabilir.

## Kurulum adımları (kod yazmana gerek yok)

### 1. GitHub'a yükle
1. github.com adresinde ücretsiz bir hesap aç (yoksa)
2. Sağ üstten **New repository** ile yeni, **private (özel)** bir repo oluştur (örn. `prop-dashboard`)
3. Repo sayfasında **"uploading an existing file"** linkine tıkla
4. Bu klasördeki tüm dosya ve klasörleri (node_modules ve .next hariç, zaten yok) sürükleyip bırak
5. **Commit changes** ile kaydet

### 2. Vercel'e bağla
1. vercel.com adresine git, **"Continue with GitHub"** ile giriş yap
2. **Add New... > Project** de
3. Az önce yüklediğin repoyu seç, **Import** de
4. **Environment Variables** kısmına şunu ekle:
   - Name: `SITE_PASSWORD`
   - Value: kendi seçtiğin şifre (örn. `guvenlisifre123`)
5. Henüz **Deploy**'a basma, önce bir adım kaldı ⬇️

### 3. Veritabanını ekle (Vercel KV)
1. Vercel projende **Storage** sekmesine git
2. **Create Database > KV (Upstash)** seç, ücretsiz plan yeterli
3. Oluşturduktan sonra projenle bağla ("Connect Project") — bu, gerekli ortam değişkenlerini (`KV_REST_API_URL` vb.) otomatik ekler

### 4. Deploy et
1. Projenin **Deployments** sekmesine dön, **Deploy**'a bas (veya otomatik başlamadıysa "Redeploy")
2. Birkaç dakika içinde sana `https://senin-projen.vercel.app` gibi sabit bir link verilecek
3. O linke gidip kendi belirlediğin şifreyle giriş yapabilirsin

## Link hep aynı kalır mı?
Evet. Bundan sonra kodda değişiklik yapıldığında (örn. ben yeni bir güncelleme gönderirsem ve sen GitHub'daki dosyaları güncellersen), Vercel otomatik olarak yeniden yayınlar ama **link değişmez**.

## Güvenlik notu
Bu basit bir şifre-kapısı sistemidir — tek kullanıcı için günlük kullanımda yeterlidir, ama banka hesabı gibi kritik bir şey saklamıyorsan uygundur. Şifreni kimseyle paylaşma ve repo'yu **private** yaptığından emin ol.
