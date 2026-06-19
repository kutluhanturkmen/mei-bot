# 🌸 Mei — Production Deploy Rehberi

> **Ubuntu Masaüstü (GUI) ile kurulum yapıyorsan** → Bölüm 10'u atla, doğrudan **[Bölüm 12](#12-ubuntu-masaüstü-gui--vncrdesktop-ile-kurulum)** kısmına git.

Proje üç ayrı servis olarak deploy edilir:

| Servis | Platform | Dizin |
|---|---|---|
| Discord Bot | Railway (Docker) | `MeiBot/` |
| REST API | Railway (Nixpacks) | `MeiWeb/api/` |
| Web Client | Vercel | `MeiWeb/client/` |

---

## 1. Ön Koşullar

- [Railway](https://railway.app) hesabı
- [Vercel](https://vercel.com) hesabı
- [MongoDB Atlas](https://cloud.mongodb.com) cluster (ya da Railway MongoDB eklentisi)
- Discord Developer Portal'da bir uygulama

---

## 2. Ortam Değişkenleri

### 2a. `MeiBot` — Discord Bot

Railway servisine aşağıdaki environment variable'ları ekle:

```
DISCORD_TOKEN=your_bot_token
MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/meibot
```

`MeiBot/config.json` içindeki placeholder'ları da doldur:

```json
"earlySupporter": {
  "supportServerId": "GERÇEK_SUNUCU_ID",
  "userRoleId":      "ERKEN_DESTEKÇI_USER_ROL_ID",
  "serverRoleId":    "ERKEN_DESTEKÇI_SERVER_ROL_ID"
}
```

### 2b. `MeiWeb/api` — REST API

Railway servisine eklenecek environment variable'lar (`.env.example` şablonuna bakın):

```
MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/meibot
JWT_SECRET=en_az_32_karakter_rastgele_string
DISCORD_CLIENT_ID=discord_uygulama_client_id
DISCORD_CLIENT_SECRET=discord_uygulama_client_secret
DISCORD_REDIRECT_URI=https://mei-api.railway.app/api/auth/discord/callback
FRONTEND_URL=https://mei.vercel.app
ALLOWED_ORIGINS=https://mei.vercel.app
NODE_ENV=production
PORT=4000
```

> **Not:** `DISCORD_REDIRECT_URI` Discord Developer Portal > OAuth2 > Redirects listesinde de tanımlı olmalı.

### 2c. `MeiWeb/client` — Next.js Client

Vercel Dashboard → Settings → Environment Variables:

```
NEXT_PUBLIC_API_URL=https://mei-api.railway.app
NEXT_PUBLIC_DISCORD_CLIENT_ID=discord_uygulama_client_id
```

`MeiWeb/client/vercel.json` içindeki rewrite URL'i production API adresinle eşleştir:

```json
"destination": "https://mei-api.railway.app/api/:path*"
```

---

## 3. Railway — MeiBot Deploy

1. [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub repo**
2. Root directory: `MeiBot`
3. Railway, `MeiBot/Dockerfile` dosyasını otomatik algılar
4. `MeiBot/railway.toml` ayarları otomatik uygulanır
5. Environment variables'ı **Variables** sekmesinden ekle
6. **Deploy** — bot çevrimiçi olunca Discord'da görünür

> **PM2 alternatifi (VPS):**
> ```bash
> cd MeiBot
> npm install
> npm install -g pm2
> pm2 start ecosystem.config.cjs --env production
> pm2 save
> pm2 startup
> ```

---

## 4. Railway — API Deploy

1. **New Service** → **Deploy from GitHub repo**
2. Root directory: `MeiWeb/api`
3. Railway, `MeiWeb/api/railway.toml` dosyasını algılar (Nixpacks builder)
4. Environment variables'ı ekle
5. **Deploy** — `https://mei-api.railway.app/health` yanıt verince hazır

---

## 5. Vercel — Client Deploy

```bash
cd MeiWeb/client
npx vercel --prod
```

Ya da Vercel Dashboard → **Import Git Repository** → Root Directory: `MeiWeb/client`

Vercel otomatik olarak:
- `npm run build` çalıştırır
- `.next` output'u serve eder
- `vercel.json` headers ve rewrites'ı uygular

---

## 6. Discord Developer Portal Ayarları

Discord Developer Portal → Uygulamanız → **OAuth2**:

- **Redirects** listesine ekle:
  ```
  https://mei-api.railway.app/api/auth/discord/callback
  ```
- **Bot** sekmesi → Privileged Intents:
  - ✅ Server Members Intent
  - ✅ Message Content Intent

---

## 7. Deploy Sonrası Kontroller

```bash
# API health check
curl https://mei-api.railway.app/health

# API stats
curl https://mei-api.railway.app/api/stats

# Client anasayfa
curl -I https://mei.vercel.app
```

Bot komutları Discord'a deploy etmek için (ilk deployta gerekli):

```bash
cd MeiBot
node src/gateway/commands.js   # slash komutlarını Discord'a kaydet
```

---

## 8. Early Supporter Konfigürasyonu

`MeiBot/config.json` → `earlySupporter` bloğunu doldurduktan sonra:

1. Discord destek sunucunda "Early Supporter" rolünü oluştur
2. Rol ID'sini `userRoleId` / `serverRoleId` alanlarına yaz
3. Bot bu sunucuda `guildMemberUpdate` event'ini dinler
4. Rol alan kullanıcının DB kaydı otomatik güncellenir (`isEarlySupporter: true`)

---

## 9. Güncelleme (Redeploy)

```bash
git push origin main
```

Railway ve Vercel GitHub entegrasyonu ile `main` branch'e push otomatik redeploy tetikler.

---

## 10. VDS Kurulum — Ubuntu 22.04 / 24.04

Tüm servisleri (Bot + API + Client) tek bir VDS üzerinde çalıştırmak için aşağıdaki adımları izle.

### 10a. Temel Sistem Hazırlığı

```bash
# Sistemi güncelle
sudo apt update && sudo apt upgrade -y

# Gerekli araçlar
sudo apt install -y git curl wget build-essential python3 make g++ \
    libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev

# Node.js 20 — NodeSource üzerinden
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Node sürümünü doğrula
node -v   # v20.x.x
npm -v

# PM2 — process manager
sudo npm install -g pm2

# (Opsiyonel) Nginx — reverse proxy
sudo apt install -y nginx

# (Opsiyonel) Certbot — ücretsiz SSL
sudo apt install -y certbot python3-certbot-nginx
```

### 10b. MongoDB Kurulumu (Atlas yerine local tercih edilirse)

```bash
# MongoDB 7.0 GPG key + repo
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | \
    sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor

echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] \
    https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | \
    sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list

sudo apt update && sudo apt install -y mongodb-org
sudo systemctl enable --now mongod

# Bağlantıyı doğrula
mongosh --eval "db.adminCommand('ping')"
```

> Atlas kullanıyorsan bu adımı atla ve `.env` içinde Atlas URI'sini kullan.

### 10c. Projeyi Klonla

```bash
cd /opt
sudo git clone https://github.com/KULLANICI/mei-bot.git mei
sudo chown -R $USER:$USER /opt/mei
cd /opt/mei
```

### 10d. MeiBot Kurulumu

```bash
cd /opt/mei/MeiBot
npm install

# .env dosyası oluştur
cat > .env << 'EOF'
DISCORD_TOKEN=your_bot_token
MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/meibot
EOF

# config.json'daki placeholder'ları düzenle
nano config.json
# earlySupporter.supportServerId, userRoleId, serverRoleId değerlerini gir

# Slash komutlarını Discord'a kaydet (tek seferlik)
node src/gateway/commands.js

# PM2 ile başlat
pm2 start ecosystem.config.cjs --env production
pm2 save
```

### 10e. API Kurulumu

```bash
cd /opt/mei/MeiWeb/api
npm install

# .env dosyası oluştur
cat > .env << 'EOF'
MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/meibot
JWT_SECRET=en_az_32_karakter_rastgele_string
DISCORD_CLIENT_ID=discord_uygulama_client_id
DISCORD_CLIENT_SECRET=discord_uygulama_client_secret
DISCORD_REDIRECT_URI=https://api.siteadin.com/api/auth/discord/callback
FRONTEND_URL=https://siteadin.com
ALLOWED_ORIGINS=https://siteadin.com
NODE_ENV=production
PORT=4000
EOF

# PM2 ile başlat
pm2 start src/server.js --name mei-api
pm2 save
```

### 10f. Client (Next.js) Kurulumu

```bash
cd /opt/mei/MeiWeb/client

# .env.local oluştur
cat > .env.local << 'EOF'
NEXT_PUBLIC_API_URL=https://api.siteadin.com
NEXT_PUBLIC_DISCORD_CLIENT_ID=discord_uygulama_client_id
EOF

npm install
npm run build   # production build

# PM2 ile başlat (port 3000)
pm2 start npm --name mei-client -- start
pm2 save
```

### 10g. PM2 Startup (sunucu yeniden başlayınca otomatik başlat)

```bash
pm2 startup
# Çıktıdaki komutu kopyalayıp çalıştır (sudo ile başlar)
pm2 save
```

Tüm servisleri görmek için:
```bash
pm2 list
pm2 logs          # tüm loglar
pm2 logs mei-api  # sadece API logu
```

### 10h. Nginx Reverse Proxy Yapılandırması

```nginx
# /etc/nginx/sites-available/mei
server {
    listen 80;
    server_name siteadin.com www.siteadin.com;

    # Next.js client
    location / {
        proxy_pass         http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade $http_upgrade;
        proxy_set_header   Connection 'upgrade';
        proxy_set_header   Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

server {
    listen 80;
    server_name api.siteadin.com;

    # Express API
    location / {
        proxy_pass         http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header   Host $host;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/mei /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 10i. SSL Sertifikası (Let's Encrypt)

```bash
sudo certbot --nginx -d siteadin.com -d www.siteadin.com
sudo certbot --nginx -d api.siteadin.com
# Sertifikalar 90 günde bir otomatik yenilenir
```

### 10j. Güncelleme (Ubuntu)

```bash
cd /opt/mei
git pull origin main

# Bot
cd MeiBot && npm install
pm2 restart mei-bot

# API
cd /opt/mei/MeiWeb/api && npm install
pm2 restart mei-api

# Client
cd /opt/mei/MeiWeb/client && npm install && npm run build
pm2 restart mei-client
```

---

## 11. VDS Kurulum — Windows Server 2022

> **Özet akış:** Araçlar → Proje → Bot → API → Client → PM2 Startup → Firewall → Caddy (reverse proxy + SSL)

---

### 11a. Gerekli Araçları Kur

**PowerShell'i Yönetici olarak aç:**
Başlat menüsünde "PowerShell" ara → sağ tık → **Yönetici olarak çalıştır**

```powershell
# Node.js 20 LTS
winget install OpenJS.NodeJS.LTS

# Git
winget install Git.Git

# PATH'i bu oturumda güncelle (yeniden başlatmaya gerek kalmadan)
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" +
            [System.Environment]::GetEnvironmentVariable("Path","User")

# Sürümleri doğrula — hepsi versiyon numarası dönmeli
node -v    # v20.x.x
npm -v     # 10.x.x
git --version
```

> Winget yoksa Node'u https://nodejs.org/en/download adresinden `.msi` ile kur.

```powershell
# PM2 — process manager (servisleri arka planda çalıştırır)
npm install -g pm2

# Windows başlangıcında PM2'nin otomatik başlaması için
npm install -g pm2-windows-startup
```

---

### 11b. canvas için Build Araçları (Hata Alırsan)

`@napi-rs/canvas` prebuilt binary gelir, çoğunlukla ek araç gerekmez.
`npm install` sırasında build hatası alırsan:

```powershell
npm install -g windows-build-tools
```

---

### 11c. Projeyi İndir

```powershell
# C:\ altına indir
cd C:\
git clone https://github.com/KULLANICI/mei-bot.git mei
```

Git yoksa ya da GitHub'a bağlantı sorunundaysan: projeyi bilgisayarından `C:\mei\` klasörüne ZIP olarak kopyalayabilirsin.

---

### 11d. MeiBot — .env ve config Ayarları

```powershell
cd C:\mei\MeiBot
```

**`.env` dosyası oluştur:**
```powershell
New-Item -Path . -Name ".env" -ItemType "file"
notepad .env
```

Not Defteri açılır. Aşağıdakini yapıştır, kendi değerlerinle doldur, kaydet:
```
DISCORD_TOKEN=your_bot_token
MONGO_URI=mongodb+srv://kullanici:sifre@cluster.mongodb.net/meibot
```

**`config.json` düzenle** (Early Supporter ID'lerini gir):
```powershell
notepad config.json
```
`earlySupporter` bloğundaki `supportServerId`, `userRoleId`, `serverRoleId` değerlerini gerçek Discord ID'leriyle değiştir, kaydet.

---

### 11e. MeiBot — Bağımlılıkları Kur ve Başlat

```powershell
cd C:\mei\MeiBot

# Bağımlılıkları kur
npm install

# Discord'a slash komutlarını kaydet (SADECE İLK KURULUMDA bir kez çalıştır)
node src/gateway/commands.js
# "Successfully registered X application commands." mesajı görünmeli
```

> Slash komutları kaydedilmezse Discord'da `/daily`, `/profile` gibi komutlar çalışmaz.

```powershell
# PM2 ile botu başlat
pm2 start ecosystem.config.cjs --env production --name mei-bot

# Durumunu kontrol et
pm2 list
# "mei-bot" satırında status "online" görünmeli
```

Bot başarıyla başladıysa Discord'da botun çevrimiçi göründüğünü görürsün.

---

### 11f. API — .env Ayarları ve Başlatma

```powershell
cd C:\mei\MeiWeb\api

New-Item -Path . -Name ".env" -ItemType "file"
notepad .env
```

Aşağıdakini yapıştır, değerleri doldur, kaydet:
```
MONGO_URI=mongodb+srv://kullanici:sifre@cluster.mongodb.net/meibot
JWT_SECRET=en_az_32_karakter_rastgele_string_buraya
DISCORD_CLIENT_ID=discord_uygulama_client_id
DISCORD_CLIENT_SECRET=discord_uygulama_client_secret
DISCORD_REDIRECT_URI=https://api.siteadin.com/api/auth/discord/callback
FRONTEND_URL=https://siteadin.com
ALLOWED_ORIGINS=https://siteadin.com
NODE_ENV=production
PORT=4000
```

> `DISCORD_REDIRECT_URI` — Discord Developer Portal > OAuth2 > Redirects listesinde de aynı URL tanımlı olmalı.

```powershell
# Bağımlılıkları kur
npm install

# PM2 ile başlat
pm2 start src/server.js --name mei-api

# Durum kontrolü
pm2 list
# "mei-api" satırında status "online" görünmeli

# API'yi test et (tarayıcıda da açabilirsin)
# http://localhost:4000/health → {"status":"ok"} dönmeli
```

---

### 11g. Client (Next.js) — .env Ayarları ve Başlatma

```powershell
cd C:\mei\MeiWeb\client

New-Item -Path . -Name ".env.local" -ItemType "file"
notepad .env.local
```

Yapıştır, kaydet:
```
NEXT_PUBLIC_API_URL=https://api.siteadin.com
NEXT_PUBLIC_DISCORD_CLIENT_ID=discord_uygulama_client_id
```

```powershell
# Bağımlılıkları kur
npm install

# Production build al (birkaç dakika sürer)
npm run build
# "Route (app)" tablosu çıkmalı, hata olmadan bitmeli

# PM2 ile başlat — server.js wrapper kullan (Windows uyumlu)
pm2 start server.js --name mei-client

# Durum kontrolü
pm2 list
```

`pm2 list` çıktısında 3 servisin hepsi `online` görünmeli:

```
┌─────┬──────────────┬─────────┬──────┬──────────┐
│ id  │ name         │ status  │ cpu  │ mem      │
├─────┼──────────────┼─────────┼──────┼──────────┤
│ 0   │ mei-bot      │ online  │ 0%   │ 80mb     │
│ 1   │ mei-api      │ online  │ 0%   │ 65mb     │
│ 2   │ mei-client   │ online  │ 0%   │ 120mb    │
└─────┴──────────────┴─────────┴──────┴──────────┘
```

**Log izlemek için:**
```powershell
pm2 logs           # tüm servisler
pm2 logs mei-bot   # sadece bot
pm2 logs mei-api   # sadece API
pm2 logs mei-client
```

---

### 11h. PM2 Startup — Sunucu Yeniden Başlayınca Otomatik Başlat

```powershell
pm2 save           # mevcut listeyi kaydet
pm2-startup install
```

Bu komut bir Windows Scheduled Task oluşturur. Artık sunucu reboot'ta tüm servisler otomatik başlar.

---

### 11i. Windows Firewall — Port Aç

```powershell
# HTTP ve HTTPS portlarını dışarıya aç
New-NetFirewallRule -DisplayName "Caddy HTTP"  -Direction Inbound -Protocol TCP -LocalPort 80  -Action Allow
New-NetFirewallRule -DisplayName "Caddy HTTPS" -Direction Inbound -Protocol TCP -LocalPort 443 -Action Allow

# 3000 ve 4000 portları dışarıya açık olmamalı — Caddy reverse proxy arkasında kalır
# (Bu portları ayrıca açma)
```

---

### 11j. Caddy — Reverse Proxy + Otomatik SSL

Caddy tek binary, yapılandırması kolay ve Let's Encrypt SSL'i otomatik alır/yeniler.

```powershell
winget install Caddyserver.Caddy

# Caddy klasörü oluştur
New-Item -Path "C:\caddy" -ItemType Directory -Force
notepad C:\caddy\Caddyfile
```

`Caddyfile` içeriği (`siteadin.com` → kendi domain adresinle değiştir):
```
siteadin.com {
    reverse_proxy localhost:3000
}

api.siteadin.com {
    reverse_proxy localhost:4000
}
```

Kaydet, ardından:
```powershell
# Önce syntax kontrolü
caddy validate --config C:\caddy\Caddyfile

# Windows servisi olarak kaydet ve başlat
caddy service install --config C:\caddy\Caddyfile
caddy service start
```

Caddy başladıktan sonra:
- `https://siteadin.com` → Next.js client (port 3000)
- `https://api.siteadin.com` → Express API (port 4000)
- HTTP → HTTPS yönlendirmesi otomatik
- SSL sertifikası otomatik alınır ve yenilenir

---

### 11k. Son Kontroller

```powershell
# Tüm servislerin çalıştığını doğrula
pm2 list

# API health check (tarayıcıda da açabilirsin)
curl http://localhost:4000/health
# {"status":"ok","timestamp":"..."} dönmeli

# Tarayıcıda test et:
# http://localhost:3000  → web sitesi görünmeli (Caddy olmadan direkt port)
# https://siteadin.com   → Caddy üzerinden SSL ile
```

Discord'da botun `/profile`, `/daily` gibi komutlarını test et — çalışıyorsa kurulum tamamdır.

---

### 11l. Güncelleme (Windows Server)

```powershell
cd C:\mei
git pull origin main

# Bot
cd C:\mei\MeiBot; npm install
pm2 restart mei-bot

# API
cd C:\mei\MeiWeb\api; npm install
pm2 restart mei-api

# Client (build almak gerekiyor)
cd C:\mei\MeiWeb\client; npm install; npm run build
pm2 restart mei-client
```

---

## 12. Ubuntu Masaüstü (GUI / VNC/RDesktop) ile Kurulum

VDS'e grafik arayüz (masaüstü) üzerinden bağlanıyorsan — konsol yerine fare + klavyeyle çalışmak istiyorsan bu bölümü takip et.

> Tüm komutlar **Terminal** uygulamasından çalıştırılır.
> Ubuntu masaüstünde Terminal'i açmak: `Ctrl + Alt + T` ya da uygulama menüsünden "Terminal" ara.

---

### 12a. Node.js 20 Kurulumu (Masaüstünden)

**Adım 1 — Terminal aç:** `Ctrl + Alt + T`

**Adım 2 — Sistemi güncelle:**
```bash
sudo apt update && sudo apt upgrade -y
```
Şifre sorduğunda VDS kullanıcı şifreni gir.

**Adım 3 — Gerekli kütüphaneleri kur** (`@napi-rs/canvas` için):
```bash
sudo apt install -y git curl build-essential python3 make g++ \
    libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev
```

**Adım 4 — Node.js 20 kur:**
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v    # v20.x.x çıkmalı
```

**Adım 5 — PM2 kur:**
```bash
sudo npm install -g pm2
```

---

### 12b. Projeyi Dosya Yöneticisi veya Terminal ile Al

**Terminal üzerinden (önerilen):**
```bash
cd ~
git clone https://github.com/KULLANICI/mei-bot.git mei
```

**Alternatif — dosyaları bilgisayardan kopyalamak istiyorsan:**
- Masaüstünde **Dosyalar** (Files/Nautilus) uygulamasını aç
- Adres çubuğuna `sftp://VDS_IP_ADRESI` yaz
- Giriş yap → projeyi `/home/KULLANICI/mei/` klasörüne sürükle-bırak

---

### 12c. .env Dosyalarını Metin Editörüyle Oluştur

**MeiBot `.env`:**

1. **Dosyalar** uygulamasından `~/mei/MeiBot/` klasörüne git
2. Sağ tık → **Yeni Belge Oluştur** → `.env` olarak adlandır
3. Üzerine çift tıkla → **Metin Editörü** ile aç
4. Aşağıdaki içeriği yapıştır, kaydet (`Ctrl + S`):

```
DISCORD_TOKEN=your_bot_token
MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/meibot
```

**`config.json` düzenle:**
```bash
# Terminal'de:
gedit ~/mei/MeiBot/config.json
```
`earlySupporter` bloğundaki `supportServerId`, `userRoleId`, `serverRoleId` değerlerini gir, kaydet.

**API `.env`:**
```bash
gedit ~/mei/MeiWeb/api/.env
```
Açılan editöre yapıştır:
```
MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/meibot
JWT_SECRET=en_az_32_karakter_rastgele_string
DISCORD_CLIENT_ID=discord_uygulama_client_id
DISCORD_CLIENT_SECRET=discord_uygulama_client_secret
DISCORD_REDIRECT_URI=https://api.siteadin.com/api/auth/discord/callback
FRONTEND_URL=https://siteadin.com
ALLOWED_ORIGINS=https://siteadin.com
NODE_ENV=production
PORT=4000
```
Kaydet (`Ctrl + S`), kapat.

**Client `.env.local`:**
```bash
gedit ~/mei/MeiWeb/client/.env.local
```
```
NEXT_PUBLIC_API_URL=https://api.siteadin.com
NEXT_PUBLIC_DISCORD_CLIENT_ID=discord_uygulama_client_id
```
Kaydet, kapat.

> **Not:** `gedit` yoksa `nano` veya `mousepad` ya da `kate` kullanabilirsin.
> `nano` ile açmak: `nano ~/mei/MeiBot/.env` → düzenle → `Ctrl+O` kaydet → `Ctrl+X` çık.

---

### 12d. Bağımlılıkları Kur ve Servisleri Başlat

Terminal'de sırasıyla:

```bash
# ── MeiBot ────────────────────────────────────
cd ~/mei/MeiBot
npm install

# Slash komutlarını Discord'a kaydet (tek seferlik)
node src/gateway/commands.js

# PM2 ile başlat
pm2 start ecosystem.config.cjs --env production

# ── API ───────────────────────────────────────
cd ~/mei/MeiWeb/api
npm install
pm2 start src/server.js --name mei-api

# ── Client ────────────────────────────────────
cd ~/mei/MeiWeb/client
npm install
npm run build
pm2 start npm --name mei-client -- start

# Tümünü kaydet (reboot'ta otomatik başlat)
pm2 save
pm2 startup
# Çıktıdaki "sudo env PATH=..." satırını kopyalayıp terminale yapıştır ve çalıştır
```

---

### 12e. Servislerin Durumunu Kontrol Et

```bash
pm2 list
```

Çıktıda üç servisin de `online` olduğunu görmelisin:

```
┌─────┬──────────────┬─────────┬────────┬──────────┐
│ id  │ name         │ status  │ cpu    │ mem      │
├─────┼──────────────┼─────────┼────────┼──────────┤
│ 0   │ mei-bot      │ online  │ 0%     │ 80mb     │
│ 1   │ mei-api      │ online  │ 0%     │ 65mb     │
│ 2   │ mei-client   │ online  │ 0%     │ 120mb    │
└─────┴──────────────┴─────────┴────────┴──────────┘
```

Log izlemek için:
```bash
pm2 logs           # tüm servisler
pm2 logs mei-bot   # sadece bot
pm2 logs mei-api   # sadece API
```

---

### 12f. Nginx Kurulumu (Masaüstünden)

```bash
sudo apt install -y nginx
```

**Nginx config dosyasını metin editörüyle aç:**
```bash
sudo gedit /etc/nginx/sites-available/mei
```

Aşağıdaki içeriği yapıştır (`siteadin.com` → kendi domain adresinle değiştir):

```nginx
server {
    listen 80;
    server_name siteadin.com www.siteadin.com;

    location / {
        proxy_pass         http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade $http_upgrade;
        proxy_set_header   Connection 'upgrade';
        proxy_set_header   Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

server {
    listen 80;
    server_name api.siteadin.com;

    location / {
        proxy_pass         http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header   Host $host;
    }
}
```

Kaydet (`Ctrl + S`), kapat. Ardından:

```bash
# Config'i etkinleştir
sudo ln -s /etc/nginx/sites-available/mei /etc/nginx/sites-enabled/

# Syntax kontrolü
sudo nginx -t

# Nginx'i yenile
sudo systemctl reload nginx
```

---

### 12g. SSL Sertifikası (Let's Encrypt — Masaüstünden)

```bash
sudo apt install -y certbot python3-certbot-nginx

# Domain adreslerini sertifikalandır
sudo certbot --nginx -d siteadin.com -d www.siteadin.com
sudo certbot --nginx -d api.siteadin.com
```

Certbot kurulum sırasında e-posta adresi ister → gir. Sertifikalar 90 günde bir otomatik yenilenir.

Sonuç: `https://siteadin.com` ve `https://api.siteadin.com` aktif.

---

### 12h. Güncelleme (Ubuntu Masaüstü)

```bash
cd ~/mei
git pull origin main

# Bot
cd ~/mei/MeiBot && npm install && pm2 restart mei-bot

# API
cd ~/mei/MeiWeb/api && npm install && pm2 restart mei-api

# Client
cd ~/mei/MeiWeb/client && npm install && npm run build && pm2 restart mei-client
```
