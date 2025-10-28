# How to Deploy Your VibeRaters App to Vercel

## Simple Steps (No Coding Required!)

### Step 1: Commit Your Changes to GitHub

1. Open **GitHub Desktop** (or use the terminal if you prefer)
2. You should see all the changed files
3. Write a commit message like: "Add backend share route for social media"
4. Click **"Commit to master"**
5. Click **"Push origin"** to push to GitHub

### Step 2: Deploy to Vercel

1. Go to [https://vercel.com](https://vercel.com)
2. Log in with your GitHub account
3. Find your **viberater** project in the dashboard
4. Vercel will **automatically detect** the new `vercel.json` file
5. It will **automatically redeploy** your app with the backend

That's it! Wait 2-3 minutes for deployment to complete.

### Step 3: Test Your Social Sharing

1. Go to your live app: **https://viberaters.vercel.app**
2. Upload a selfie and choose a roast level
3. Click the **Facebook** button
4. You should now see:
   - ✅ Your app's URL (`viberaters.vercel.app/api/share/...`)
   - ✅ The composed image (with watermark and roast text)
   - ✅ The description "Get your own vibe rated at viberaters.vercel.app"

### What Works Now:

- **Facebook**: Shows your app's URL with the image and description
- **X (Twitter)**: Shows your app's URL with the image
- **WhatsApp**: Shares your app's URL with a message
- **Instagram**: Downloads the image for manual upload
- **TikTok**: Downloads the image for manual upload

### If Something Goes Wrong:

1. Check the Vercel deployment logs for any errors
2. Make sure all files are pushed to GitHub
3. Try redeploying from the Vercel dashboard

---

## That's All! 🎉

Your backend is now integrated with your frontend, and all social sharing will show your app's URL instead of Cloudinary!

