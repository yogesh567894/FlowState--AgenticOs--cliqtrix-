# Vercel Deployment Guide

## Prerequisites
- Vercel account
- GROQ API key (get one from https://console.groq.com)

## Environment Variables Required

You **must** set the following environment variable in Vercel:

### `GROQ_API_KEY`
Your Groq API key for NLP processing.

## Steps to Deploy

### 1. Connect Repository to Vercel
1. Go to https://vercel.com/dashboard
2. Click "Add New" → "Project"
3. Import your GitHub repository: `FlowState--AgenticOs--cliqtrix-`
4. Click "Import"

### 2. Configure Environment Variables
1. In your Vercel project settings, go to "Settings" → "Environment Variables"
2. Add the following:
   - **Name:** `GROQ_API_KEY`
   - **Value:** Your Groq API key (e.g., `gsk_...`)
   - **Environments:** Check all (Production, Preview, Development)
3. Click "Save"

### 3. Deploy Settings
Vercel should auto-detect the Node.js settings. Verify:
- **Framework Preset:** Other (or None)
- **Build Command:** (leave empty or use `npm install`)
- **Output Directory:** (leave empty)
- **Install Command:** `npm install`
- **Development Command:** `npm run dev`

### 4. Deploy
1. Click "Deploy"
2. Wait for the build to complete
3. Once deployed, your app will be available at: `https://your-project.vercel.app`

## Troubleshooting

### Error: "GROQ_API_KEY environment variable is missing"
**Solution:** 
1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add `GROQ_API_KEY` with your API key
3. Redeploy the project (Settings → Deployments → Latest Deployment → "..." → Redeploy)

### Error: "Module not found"
**Solution:**
1. Make sure `package.json` is in the root directory
2. Verify all dependencies are listed in `package.json`
3. Redeploy

### API Not Working
**Solution:**
1. Check Vercel function logs: Dashboard → Your Project → Deployments → View Function Logs
2. Verify environment variables are set correctly
3. Test the endpoint: `https://your-project.vercel.app/api/webhook`

## Verification

After deployment, test your webhook:

```bash
curl -X POST https://your-project.vercel.app/api/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test@example.com",
    "message": "hello"
  }'
```

You should get a JSON response with `success: true`.

## Important Notes

1. **Never commit `.env` file** - It's gitignored for security
2. **Always set environment variables in Vercel dashboard** - Don't hardcode API keys
3. **Serverless limits** - Vercel functions have execution time limits (10s for Hobby, 60s for Pro)
4. **Cold starts** - First request may be slower due to serverless cold start

## Getting Your Groq API Key

1. Go to https://console.groq.com
2. Sign up or log in
3. Navigate to "API Keys"
4. Create a new API key
5. Copy the key (starts with `gsk_`)
6. Add it to Vercel environment variables

## Support

If you encounter issues:
1. Check Vercel deployment logs
2. Check Vercel function logs
3. Verify all environment variables are set
4. Review the error messages in the logs

## Production Checklist

- [ ] GROQ_API_KEY set in Vercel
- [ ] Repository connected to Vercel
- [ ] Environment variables added for all environments
- [ ] Test deployment successful
- [ ] Webhook endpoint responding correctly
- [ ] Error handling working (graceful degradation if API key missing)
