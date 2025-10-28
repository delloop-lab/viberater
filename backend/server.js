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

app.get('/api/share/:publicId', (req, res) => {
  const { publicId } = req.params;
  const imageUrl = `https://res.cloudinary.com/dovuirnzm/image/upload/${publicId}.jpg`;
  const appUrl = 'https://viberaters.vercel.app';

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>VibeRaters - Check out my result!</title>
      <meta property="og:title" content="Check out my VibeRaters result!">
      <meta property="og:description" content="Get your own vibe rated at viberaters.vercel.app">
      <meta property="og:image" content="${imageUrl}">
      <meta property="og:url" content="${appUrl}/api/share/${publicId}">
      <meta property="og:type" content="website">
      <meta property="og:image:width" content="1200">
      <meta property="og:image:height" content="630">
      <meta name="twitter:card" content="summary_large_image">
      <meta name="twitter:title" content="Check out my VibeRaters result!">
      <meta name="twitter:description" content="Get your own vibe rated at viberaters.vercel.app">
      <meta name="twitter:image" content="${imageUrl}">
      <meta http-equiv="refresh" content="0; url=${appUrl}">
    </head>
    <body>
      <h1>VibeRaters</h1>
      <p>Redirecting you to the VibeRaters app...</p>
      <p>Get your own vibe rated at <a href="${appUrl}">${appUrl}</a></p>
    </body>
    </html>
  `;
  res.send(html);
});

app.listen(3001, () => console.log('Backend running on http://localhost:3001')); 