# Vercel deployment checklist

- **APP_ROOT**: `.`
- Confirm the following settings in Vercel after merge:
  - **Root Directory**: `.`
  - **Node version**: `20.x`
  - **Install Command**: `npm ci --legacy-peer-deps`
  - **Build Command**: `npm run build`
- Pull requests will continue to produce Preview Deployments.
