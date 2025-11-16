// server.js - simple backend to fetch public Instagram data
// WARNING: This scraping approach uses Instagram public endpoints that may change.
// Use for demo and small-scale purposes. For production, use a proper PSP and legal checks.

const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Helper to fetch Instagram public JSON (may be rate-limited)
app.get('/api/instagram/:username', async (req, res) => {
  const username = req.params.username.replace('@','').trim();
  try {
    const url = `https://www.instagram.com/${username}/?__a=1&__d=dis`;
    const resp = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible)'
      }
    });
    if(!resp.ok) return res.status(404).json({ error: 'Perfil não encontrado' });
    const json = await resp.json();
    const user = json.graphql.user;
    const medias = (user.edge_owner_to_timeline_media.edges || []).map(e => ({
      tipo: e.node.__typename,
      likes: e.node.edge_liked_by ? e.node.edge_liked_by.count : 0,
      comments: e.node.edge_media_to_comment ? e.node.edge_media_to_comment.count : 0,
      thumb: e.node.thumbnail_src || null
    }));
    res.json({
      username: user.username,
      full_name: user.full_name,
      biografia: user.biography,
      foto: user.profile_pic_url_hd || user.profile_pic_url,
      seguidores: user.edge_followed_by ? user.edge_followed_by.count : 0,
      seguindo: user.edge_follow ? user.edge_follow.count : 0,
      posts: user.edge_owner_to_timeline_media ? user.edge_owner_to_timeline_media.count : 0,
      midias: medias
    });
  } catch(err) {
    console.error('Erro fetching IG:', err);
    res.status(500).json({ error: 'Erro ao buscar dados do Instagram', details: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Instagram proxy running on http://localhost:${PORT}`));
