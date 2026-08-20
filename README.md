# 📝 Rotaract Club Outreach Undertaking & Parent Consent Generator

[![Vercel Ready](https://img.shields.io/badge/Deployment-Vercel%20Ready-000000?style=flat&logo=vercel)](https://vercel.com)
[![Platform](https://img.shields.io/badge/Platform-Mobile%20%7C%20Web-d91b5c?style=flat)]()
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Zero Backend](https://img.shields.io/badge/Privacy-100%25%20Client--Side-16a34a?style=flat)]()

An automated web portal designed for members of the **Rotaract Club of VIT Chennai** to quickly fill in their student and parent information, sign digitally on their phones/laptops, and directly generate the official **Office of Students' Welfare Outreach Undertaking & Parent's Consent** PDF document with 100% vector accuracy.

---

## ✨ Features

- **Direct Original PDF Editing**: Directly edits over the official 2-page university PDF (`template.pdf`) using `pdf-lib` — preserving original fonts, vector emblems, and university formatting.
- **Sub-Pixel Coordinate Calibration**: Form values and digital signatures rest cleanly on the official underlines without slicing through text or labels.
- **Pre-filled 4 Constant Fields**: Pre-configures Club Name, Outreach Activity, Date & Venue, and Faculty Coordinator with an organizer toggle for future reuse.
- **Touch-Friendly Signature Pads**:
  - ✍️ **Draw Mode**: High-DPI canvas with smooth touch gestures (`touch-action: none` prevents screen drag on mobile).
  - 🖋️ **Type Mode**: Generates handwritten cursive calligraphy signatures automatically.
  - 🖼️ **Upload Mode**: Supports image uploads of handwritten signatures.
- **Live Vector Preview**: Real-time side-by-side (or mobile modal) PDF rendering powered by `PDF.js`.
- **100% Client-Side Privacy**: All processing runs locally in the member's browser — no personal data or signatures leave the device.

---

## 📁 Repository Structure

```text
rotract/
├── assets/
│   └── vit_logo.svg         # Official VIT Chennai vector emblem
├── index.html               # Main single-page web interface
├── style.css                # Responsive styles, glassmorphic UI, custom scrollbars
├── app.js                   # Direct PDF modification engine & live preview sync
├── template.pdf             # Official blank 2-page university template
├── template_base64.js       # Embedded offline asset for zero-lag rendering
├── vercel.json              # Vercel deployment configuration
├── package.json             # Project metadata & npm scripts
├── Dockerfile               # Container deployment (Google Cloud Run)
├── nginx.conf               # Nginx configuration for Docker
├── .gitignore               # Git ignore rules
├── LICENSE                  # MIT License
└── README.md                # Project documentation
```

---

## 🚀 Quick Start (Run Locally)

### Option 1: Using Python
```bash
python -m http.server 3000
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### Option 2: Using Node
```bash
npm start
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🌐 Deploy to Vercel (Share with all Club Members)

### Method 1: Deploy with 1 Command via Vercel CLI
1. Run inside this folder:
   ```bash
   npx vercel
   ```
2. Press `Enter` to accept defaults. You will instantly get a live public HTTPS link (e.g. `https://rotaract-undertaking.vercel.app`) to share on WhatsApp!

### Method 2: Deploy via GitHub
1. Push this repository to your GitHub account:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/<your-username>/rotaract-undertaking-portal.git
   git push -u origin main
   ```
2. Go to [vercel.com/new](https://vercel.com/new), select your repo, and click **Deploy**.

---

## 📜 License
This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
