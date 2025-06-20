import express from 'express';
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

  // Upload image
  // Remove any code that fetches from 'https://api.imgur.com/oauth2/token' or 'https://api.imgur.com/3/image'
  res.json({});
});

app.listen(3001, () => console.log('Backend running on http://localhost:3001')); 