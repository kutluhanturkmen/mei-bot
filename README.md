# 🌸 Mei Bot — Aesthetic Discord Community Bot

A feature-rich Discord bot with economy, games, cat café, giveaways, canvas profile cards, and a full web dashboard.

---

## 📁 Project Structure

```
Yeni klasör/
├── MeiBot/          # Discord.js v14 bot
└── MeiWeb/
    ├── api/         # Express.js REST API
    └── client/      # Next.js 14 web dashboard
```

---

## 🤖 MeiBot — Discord Bot

### Prerequisites
- Node.js 18+
- MongoDB instance
- Discord application with bot token

### Setup

```bash
cd MeiBot
npm install
```

Create a `.env` file (or set environment variables):

```env
DISCORD_TOKEN=your_bot_token
DISCORD_CLIENT_ID=your_client_id
MONGO_URI=mongodb+srv://...
```

### Commands

```bash
# Deploy slash commands to Discord
node index.js --deploy

# Start the bot
node index.js
```

### Bot Modules
| Module | Commands |
|--------|----------|
| Economy | `/daily` `/work` `/trivia` `/profile` `/register` |
| Cat Café | `/cafe status` `/cafe open` `/cafe clean` `/cafe collect` `/cafe upgrade` `/cafe buy` |
| Games | `/catfight` `/ship` `/guessnumber` `/makeasentence` `/truthordare` `/leaderboard` |
| Utility | `/giveaway start` `/giveaway end` `/giveaway reroll` `/buttonrole` `/settings` |
| Premium | `/meiclub` |

---

## 🌐 MeiWeb — Web Ecosystem

### API (Express.js)

```bash
cd MeiWeb/api
npm install
cp .env.example .env
# Fill in .env values
node src/server.js
```

#### Environment Variables
| Variable | Description |
|----------|-------------|
| `MONGO_URI` | MongoDB connection string |
| `JWT_SECRET` | Secret for signing JWTs (min 32 chars) |
| `DISCORD_CLIENT_ID` | Discord OAuth2 client ID |
| `DISCORD_CLIENT_SECRET` | Discord OAuth2 client secret |
| `DISCORD_REDIRECT_URI` | Must match Discord dev portal (e.g. `http://localhost:4000/api/auth/discord/callback`) |
| `FRONTEND_URL` | Next.js app URL (e.g. `http://localhost:3000`) |
| `ALLOWED_ORIGINS` | Comma-separated CORS origins |
| `PORT` | API port (default: 4000) |

#### API Endpoints
```
GET  /api/auth/discord           → Redirect to Discord OAuth2
GET  /api/auth/discord/callback  → Exchange code, set JWT cookie
POST /api/auth/logout            → Clear cookie
GET  /api/auth/me                → Current Discord user
GET  /api/stats                  → Live bot statistics
GET  /api/leaderboard            → ?type=coins|cafe&limit=10
GET  /api/guilds                 → User's admin guilds
GET  /api/guild/:id              → Guild settings
PATCH /api/guild/:id             → Update guild settings
GET  /api/user/me                → Bot profile + café data
```

### Client (Next.js 14)

```bash
cd MeiWeb/client
npm install
cp .env.local.example .env.local
# Fill in .env.local values
npm run dev
```

#### Environment Variables
| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_API_URL` | API base URL (e.g. `http://localhost:4000`) |
| `NEXT_PUBLIC_DISCORD_CLIENT_ID` | Discord client ID (for invite links) |
| `NEXT_PUBLIC_SITE_URL` | Site URL for OG tags |

#### Pages
| Route | Description |
|-------|-------------|
| `/` | Landing page — hero, live stats, features, leaderboard |
| `/auth/callback` | OAuth2 callback handler |
| `/dashboard` | Server selection |
| `/dashboard/[guildId]` | Guild settings panel |

---

## 🚀 Deploy

### API → Railway

1. Create a new Railway project
2. Connect your GitHub repository
3. Set root directory to `MeiWeb/api`
4. Add environment variables from `.env.example`
5. Railway will auto-detect `railway.toml` and deploy

```bash
# Or use Railway CLI
railway up --service mei-api
```

### Client → Vercel

1. Import project on [vercel.com](https://vercel.com)
2. Set root directory to `MeiWeb/client`
3. Add environment variables
4. Update `vercel.json` → replace `https://mei-api.railway.app` with your Railway URL
5. Deploy

```bash
# Or use Vercel CLI
vercel --prod
```

### Discord OAuth2 Setup

In the [Discord Developer Portal](https://discord.com/developers/applications):

1. Go to **OAuth2 → Redirects**
2. Add: `https://your-api-domain.railway.app/api/auth/discord/callback`
3. For local dev add: `http://localhost:4000/api/auth/discord/callback`

---

## 🛠 Development

Run all services locally:

```bash
# Terminal 1 — Bot
cd MeiBot && node index.js

# Terminal 2 — API
cd MeiWeb/api && node src/server.js

# Terminal 3 — Client
cd MeiWeb/client && npm run dev
```

Visit `http://localhost:3000` for the dashboard.

---

## 📦 Tech Stack

| Layer | Technology |
|-------|-----------|
| Bot | Discord.js v14, @napi-rs/canvas, MongoDB/Mongoose |
| API | Express.js 4, JWT (httpOnly cookies), Helmet, CORS |
| Frontend | Next.js 14 App Router, TypeScript, Tailwind CSS |
| Database | MongoDB Atlas (shared between bot and API) |
| Deploy | Railway (API) + Vercel (Frontend) |

---

## 📝 License

MIT — see [LICENSE](LICENSE)
