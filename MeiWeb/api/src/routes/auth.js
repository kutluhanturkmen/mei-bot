'use strict';

const router = require('express').Router();
const axios  = require('axios');
const { signToken } = require('../middleware/auth');

// =============================================
// AUTH ROUTES — Discord OAuth2
// GET  /api/auth/discord          → redirect to Discord
// GET  /api/auth/discord/callback → exchange code → JWT cookie
// GET  /api/auth/logout           → clear cookie
// GET  /api/auth/me               → return decoded token info
// =============================================

const DISCORD_API   = 'https://discord.com/api/v10';
const CLIENT_ID     = process.env.DISCORD_CLIENT_ID;
const CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
const REDIRECT_URI  = process.env.DISCORD_REDIRECT_URI; // e.g. https://api.meibot.xyz/api/auth/discord/callback
const FRONTEND_URL  = process.env.FRONTEND_URL || 'http://localhost:3000';

// ─────────────────────────────────────────────
// Step 1 — Redirect user to Discord OAuth2
// ─────────────────────────────────────────────
router.get('/discord', (req, res) => {
  const params = new URLSearchParams({
    client_id:     CLIENT_ID,
    redirect_uri:  REDIRECT_URI,
    response_type: 'code',
    scope:         'identify guilds',
  });
  res.redirect(`${DISCORD_API}/oauth2/authorize?${params}`);
});

// ─────────────────────────────────────────────
// Step 2 — Discord redirects back with ?code=
// Exchange code for access_token, fetch user,
// sign JWT, set cookie, redirect to dashboard.
// ─────────────────────────────────────────────
router.get('/discord/callback', async (req, res) => {
  const { code } = req.query;
  if (!code) return res.redirect(`${FRONTEND_URL}?error=missing_code`);

  try {
    // Exchange code → tokens
    const tokenRes = await axios.post(
      `${DISCORD_API}/oauth2/token`,
      new URLSearchParams({
        client_id:     CLIENT_ID,
        client_secret: CLIENT_SECRET,
        grant_type:    'authorization_code',
        code,
        redirect_uri:  REDIRECT_URI,
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    const { access_token, token_type } = tokenRes.data;

    // Fetch Discord user info
    const userRes = await axios.get(`${DISCORD_API}/users/@me`, {
      headers: { Authorization: `${token_type} ${access_token}` },
    });

    const discordUser = userRes.data;

    // Sign JWT
    const jwt = signToken({
      id:          discordUser.id,
      username:    discordUser.username,
      avatar:      discordUser.avatar,
      accessToken: access_token, // kullanıcı guilds'lerini çekmek için
    });

    // Secure cookie (7 gün)
    res.cookie('mei_token', jwt, {
      httpOnly: true,
      secure:   process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge:   7 * 24 * 60 * 60 * 1000,
    });

    res.redirect(`${FRONTEND_URL}/dashboard`);
  } catch (err) {
    console.error('[Auth] OAuth2 error:', err.response?.data || err.message);
    res.redirect(`${FRONTEND_URL}?error=oauth_failed`);
  }
});

// ─────────────────────────────────────────────
// Logout — clear cookie
// ─────────────────────────────────────────────
router.get('/logout', (req, res) => {
  res.clearCookie('mei_token');
  res.json({ ok: true, message: 'Logged out.' });
});

// ─────────────────────────────────────────────
// /me — return current user from JWT
// ─────────────────────────────────────────────
router.get('/me', (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated.' });
  const { id, username, avatar } = req.user;
  res.json({
    id,
    username,
    avatar,
    avatarURL: avatar
      ? `https://cdn.discordapp.com/avatars/${id}/${avatar}.png`
      : `https://cdn.discordapp.com/embed/avatars/0.png`,
  });
});

module.exports = router;
