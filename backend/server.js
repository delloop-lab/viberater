import express from 'express';
import fetch from 'node-fetch';
import FormData from 'form-data';
import cors from 'cors';

const CLIENT_ID = '4d79652a3ed590f';
const CLIENT_SECRET = 'f5666e845f6c26ca6e64cf118d6dc4aa26d2b3de';

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.post('/api/upload', async (req, res) => {
  const { imageBase64 } = req.body;
  if (!imageBase64) {
    return res.status(400).json({ error: 'No image provided' });
  }
  const form = new FormData();
  form.append('image', imageBase64);

  // Get access token
  const tokenRes = await fetch('https://api.imgur.com/oauth2/token', {
    method: 'POST',
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      grant_type: 'client_credentials'
    })
  });
  const tokenData = await tokenRes.json();
  const accessToken = tokenData.access_token;

  // Upload image
  const uploadRes = await fetch('https://api.imgur.com/3/image', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`
    },
    body: form
  });
  const uploadData = await uploadRes.json();
  res.json(uploadData);
});

app.listen(3001, () => console.log('Backend running on http://localhost:3001')); 