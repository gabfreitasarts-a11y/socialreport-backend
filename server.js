// server.js - Instagram proxy + Mercado Pago demo endpoints
// NOTE: This is a demo server. For production, secure endpoints and validate webhooks properly.

const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');
const bodyParser = require('body-parser');
const mercadopago = require('mercadopago');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Configure mercadopago if token available via ENV
if(process.env.MERCADOPAGO_ACCESS_TOKEN){
  mercadopago.configure({ access_token: process.env.MERCADOPAGO_ACCESS_TOKEN });
}

// Simple Instagram public proxy using ?__a=1 (may be rate-limited)
app.get('/api/instagram/:username', async (req, res) => {
  const username = req.params.username.replace('@','').trim();
  if(!username) return res.status(400).json({ error: 'missing username' });

  try {
    const url = `https://www.instagram.com/${username}/?__a=1&__d=dis`;
    const resp = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if(!resp.ok){
      return res.status(resp.status).json({ error: 'Perfil não encontrado ou bloqueado', status: resp.status });
    }
    const data = await resp.json();
    const user = data.graphql && data.graphql.user;
    if(!user) return res.status(404).json({ error: 'Perfil não encontrado (estrutura inesperada)' });

    const medias = (user.edge_owner_to_timeline_media && user.edge_owner_to_timeline_media.edges || []).map(e => ({
      tipo: e.node.__typename,
      likes: e.node.edge_liked_by ? e.node.edge_liked_by.count : 0,
      comments: e.node.edge_media_to_comment ? e.node.edge_media_to_comment.count : 0,
      thumb: e.node.thumbnail_src || null
    }));

    return res.json({
      username: user.username,
      full_name: user.full_name,
      biografia: user.biography,
      foto: user.profile_pic_url_hd || user.profile_pic_url,
      seguidores: (user.edge_followed_by && user.edge_followed_by.count) || 0,
      seguindo: (user.edge_follow && user.edge_follow.count) || 0,
      posts: (user.edge_owner_to_timeline_media && user.edge_owner_to_timeline_media.count) || 0,
      midias: medias
    });
  } catch(err){
    console.error('fetch instagram error', err);
    return res.status(500).json({ error: 'Erro ao buscar dados do Instagram', details: err.message });
  }
});

// Mercado Pago create preference (checkout) - demo
app.post('/create_preference', async (req, res) => {
  if(!process.env.MERCADOPAGO_ACCESS_TOKEN){
    return res.status(500).json({ error: 'MERCADOPAGO_ACCESS_TOKEN not configured on server' });
  }
  try {
    const { email, description } = req.body;
    const preference = {
      items: [
        { title: description || "1 análise Social Report", quantity: 1, unit_price: 9.9 }
      ],
      payer: { email: email || 'buyer@example.com' },
      back_urls: {
        success: req.body.success_url || 'https://your-frontend/success',
        failure: req.body.failure_url || 'https://your-frontend/failure',
        pending: req.body.pending_url || 'https://your-frontend/pending'
      },
      notification_url: (process.env.WEBHOOK_URL || '') + '/webhook/mercadopago'
    };
    const mpRes = await mercadopago.preferences.create(preference);
    return res.json({ init_point: mpRes.body.init_point, preference_id: mpRes.body.id });
  } catch(err){
    console.error('mercado pago error', err);
    return res.status(500).json({ error: 'mercadopago error', details: err.message });
  }
});

// Mercado Pago webhook handler (demo)
app.post('/webhook/mercadopago', async (req, res) => {
  // Mercado Pago may send different payloads; production must validate signature or consult API.
  console.log('webhook received', req.body, req.query);
  // For demo, accept and respond OK.
  res.status(200).send('OK');
});

// health
app.get('/health', (req,res)=> res.json({ status: 'ok' }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, ()=> console.log(`Server running on port ${PORT}`));
