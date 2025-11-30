# Vercel Deployment Guide

## 🚀 Quick Deploy Steps

### 1. **Install Vercel CLI (Optional)**
```bash
npm install -g vercel
```

### 2. **Configure Environment Variables in Vercel**

**IMPORTANT:** You must set the `GROQ_API_KEY` in Vercel before deployment!

#### Via Vercel Dashboard:
1. Go to your project: https://vercel.com/dashboard
2. Select your project (or create new)
3. Go to **Settings** → **Environment Variables**
4. Add the following variable:
   - **Name:** `GROQ_API_KEY`
   - **Value:** Your Groq API key from https://console.groq.com
   - **Environment:** Production, Preview, Development (select all)
5. Click **Save**

#### Via Vercel CLI:
```bash
vercel env add GROQ_API_KEY
# Paste your Groq API key when prompted
# Select: Production, Preview, Development
```

### 3. **Deploy to Vercel**

#### Option A: Via GitHub (Recommended)
1. Push your code to GitHub:
   ```bash
   git add .
   git commit -m "feat: add Vercel deployment config"
   git push origin main
   ```

2. Import your repository in Vercel:
   - Go to https://vercel.com/new
   - Import your GitHub repository
   - Vercel will auto-detect the Node.js project
   - Click **Deploy**

#### Option B: Via Vercel CLI
```bash
vercel --prod
```

### 4. **Verify Deployment**

After deployment, test your API:

```bash
curl -X POST https://your-project.vercel.app/api/webhook \
  -H "Content-Type: application/json" \
  -d '{"userId":"test","message":"hello"}'
```

## 📝 Configuration Files

### `vercel.json`
This file configures how Vercel builds and routes your application:

```json
{
  "version": 2,
  "builds": [
    {
      "src": "server.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "server.js"
    }
  ],
  "env": {
    "NODE_ENV": "production"
  }
}
```

### Environment Variables Required

| Variable | Description | Required |
|----------|-------------|----------|
| `GROQ_API_KEY` | Your Groq API key from console.groq.com | ✅ Yes |
| `PORT` | Server port (auto-set by Vercel) | ❌ No |

## 🔧 Troubleshooting

### Error: "GROQ_API_KEY environment variable is missing"

**Solution:** 
1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add `GROQ_API_KEY` with your API key
3. Redeploy the project (Deployments → Click on latest → Redeploy)

### Error: "Module not found"

**Solution:**
Ensure all dependencies are in `package.json`:
```bash
npm install
git add package.json package-lock.json
git commit -m "update dependencies"
git push
```

### Build Fails

**Solution:**
1. Check build logs in Vercel dashboard
2. Ensure Node.js version compatibility (check `package.json` engines field)
3. Test locally first: `npm start`

## 🌐 API Endpoints

After deployment, your API will be available at:

```
https://your-project.vercel.app/api/webhook
```

### Test Requests

**Create Task:**
```bash
curl -X POST https://your-project.vercel.app/api/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user123",
    "message": "create a task to review code"
  }'
```

**List Tasks:**
```bash
curl -X POST https://your-project.vercel.app/api/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user123",
    "message": "show my tasks"
  }'
```

**Math Calculation:**
```bash
curl -X POST https://your-project.vercel.app/api/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user123",
    "message": "calculate 100 + 50"
  }'
```

## 📊 Monitoring

### View Logs
1. Go to Vercel Dashboard → Your Project → Deployments
2. Click on a deployment
3. Go to **Functions** tab to see runtime logs

### Check Function Status
```bash
vercel logs
```

## 🔐 Security

### Best Practices
1. ✅ **Never commit `.env` file** - Already in `.gitignore`
2. ✅ **Use environment variables** - Set in Vercel dashboard
3. ✅ **Rotate API keys regularly** - Update in Vercel when changed
4. ✅ **Use HTTPS only** - Vercel provides automatic SSL

## 🚀 Continuous Deployment

Once connected to GitHub, Vercel will automatically:
- Deploy on every push to `main` branch
- Create preview deployments for pull requests
- Run builds and checks before deployment

## 📦 Custom Domain (Optional)

To use a custom domain:
1. Go to Project Settings → Domains
2. Add your domain
3. Update DNS records as instructed
4. Wait for SSL certificate provisioning

## 📚 Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Node.js on Vercel](https://vercel.com/docs/frameworks/node-js)
- [Environment Variables](https://vercel.com/docs/environment-variables)
- [Groq API Documentation](https://console.groq.com/docs)

---

**Need Help?** Check the Vercel logs or contact support at support@vercel.com
