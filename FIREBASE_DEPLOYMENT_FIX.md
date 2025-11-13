# Firebase Deployment Fix

## Problem Identified
Your deployment is failing because some video files exceed Firebase Hosting's 32MB file size limit:
- `experience.mp4`: 36.09 MB ❌
- `philippines2.mp4`: 39.46 MB ❌
- `services.mp4`: 39.49 MB ❌

## Solutions

### Option 1: Exclude Large Videos (Quick Fix) ✅
The large videos have been excluded from deployment in `firebase.json`. These files won't be deployed, but your site will still work.

**To deploy:**
```bash
npm run build
firebase deploy --only hosting
```

### Option 2: Compress Videos (Recommended)
Compress the large videos to under 32MB using a tool like:
- **HandBrake** (free): https://handbrake.fr/
- **FFmpeg** (command line):
  ```bash
  ffmpeg -i experience.mp4 -vcodec libx264 -crf 28 experience_compressed.mp4
  ffmpeg -i philippines2.mp4 -vcodec libx264 -crf 28 philippines2_compressed.mp4
  ffmpeg -i services.mp4 -vcodec libx264 -crf 28 services_compressed.mp4
  ```

### Option 3: Host Videos on Cloudinary (Best Practice)
Since you're already using Cloudinary, upload these videos there and reference them via URL instead of local files.

1. Upload videos to Cloudinary
2. Update your code to use Cloudinary URLs instead of local paths
3. Remove videos from `public/videos/` folder

## Current Configuration
- ✅ `firebase.json` updated with proper headers and rewrites
- ✅ Large videos excluded from deployment
- ✅ Build output directory: `dist`
- ✅ SPA routing configured

## Deployment Steps
1. **Build your project:**
   ```bash
   npm run build
   ```

2. **Deploy to Firebase:**
   ```bash
   firebase deploy --only hosting
   ```

3. **If you get authentication errors:**
   ```bash
   firebase login
   ```

4. **If deployment still fails, check:**
   - Make sure you're logged in: `firebase login:list`
   - Verify project: `firebase projects:list`
   - Check build output exists: `ls dist` (or `dir dist` on Windows)

## Notes
- All other files are within limits ✅
- Firebase Hosting limit: 32MB per file
- Total deployment size limit: 1GB (you're well under this)

