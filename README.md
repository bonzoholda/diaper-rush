# 👶 Diaper Rush: Code Brown! 3D - Standalone Game

Hyper-casual 3D Web Game built with React, Three.js, Tailwind CSS, and Web Audio API.

## 🚀 Instant Netlify Deployment Instructions

### Method 1: Netlify Drop (Instant Drag & Drop - No Code Required)
1. Extract this ZIP archive on your computer.
2. Open terminal in the extracted folder and run:
   ```bash
   npm install
   npm run build
   ```
3. Go to [Netlify Drop](https://app.netlify.com/drop) in your browser.
4. Drag and drop the generated `dist` folder directly onto the Netlify Drop area.
5. Your game will be live instantly with a shareable URL!

### Method 2: Git Repository Deployment (Automatic CI/CD)
1. Push this extracted directory to a new GitHub / GitLab repository.
2. Log in to [Netlify](https://netlify.com) and click **"Add new site" -> "Import an existing project"**.
3. Choose your GitHub repository.
4. Netlify will auto-detect settings from `netlify.toml`:
   - Build command: `npm run build`
   - Publish directory: `dist`
5. Click **Deploy Site**!

## 🎮 How to Play
- **Touch / Mouse**: Tap or click anywhere on the nursery floor to throw clean diapers towards leaking/crying babies.
- **Goal**: Change diapers before the overhead Leak Meter reaches 100% to avoid a Code Brown explosion!
