# Step-by-Step Vercel & Neon PostgreSQL Deployment Guide

This guide walks you through deploying **VAANI™** to **Vercel** with **Neon Serverless PostgreSQL** so you can submit a live, working URL for the MetaDamen internship assignment.

---

## Step 1: Create Your Free Neon PostgreSQL Database (2 Minutes)

1. Go to [https://neon.tech](https://neon.tech) and click **Sign Up** (or log in with GitHub/Google).
2. Click **Create Project**:
   * **Project Name**: `vaani-interview` (or any name)
   * **Region**: Select the closest region to you (e.g., `AWS US East (Ohio)` or `Asia Pacific`)
   * **PostgreSQL Version**: `16` or `17` (Default)
3. Once created, you will see your **Connection Details** on the Neon Dashboard.
4. Copy the **Postgres connection string** (make sure **"Pooled connection"** or default connection string is selected).
   * It will look like this:
     ```
     postgresql://vaani_owner:AbC123xyz@ep-sparkling-leaf-123456.us-east-2.aws.neon.tech/vaani?sslmode=require
     ```
5. *(Optional for local testing)*: Paste this connection string into your local [`backend/.env`](file:///c:/Users/Welcome/Desktop/metadmen/backend/.env) file under `DATABASE_URL=`.

> **Note**: You do not need to create tables manually. VAANI™ will automatically create the `interview_sessions` table with the JSONB schema on first boot!

---

## Step 2: Push Your Project to GitHub

1. Initialize Git in the project root (if not already done):
   ```bash
   git init
   git add .
   git commit -m "feat: complete VAANI interview intelligence with Neon PostgreSQL and Vercel support"
   ```

2. Create a new repository on your GitHub account (e.g., `vaani-interview-intelligence`).

3. Link and push your repository:
   ```bash
   git branch -M main
   git remote add origin https://github.com/<your-github-username>/vaani-interview-intelligence.git
   git push -u origin main
   ```

---

## Step 3: Deploy to Vercel (1 Single Click)

1. Go to [https://vercel.com](https://vercel.com) and log in with your GitHub account.
2. Click **"Add New..."** $\rightarrow$ **"Project"**.
3. Under **Import Git Repository**, find your `vaani-interview-intelligence` repository and click **Import**.
4. In the **Configure Project** screen:
   * **Framework Preset**: Select `Vite` (or leave default detected).
   * **Root Directory**: Leave as `./` (Root).
   * **Build Command**: `npm run build` (Default).
   * **Output Directory**: `frontend/dist` (Vercel will auto-read this from `vercel.json`).
5. Open the **Environment Variables** section and add the following:

| Key | Value | Description |
| :--- | :--- | :--- |
| `DATABASE_URL` | `postgresql://vaani_owner:...@ep-...neon.tech/vaani?sslmode=require` | Your Neon connection string from Step 1 |
| `GEMINI_API_KEY` | `your_gemini_api_key` | Your free Gemini key from Google AI Studio |
| `AI_PROVIDER` | `gemini` | AI Provider selection |
| `NODE_ENV` | `production` | Production environment |

6. Click **Deploy**!

---

## Step 4: Verify Your Live Deployment

1. Vercel will install dependencies, build both the backend and frontend, and provide your live URL:
   * **Live Application URL**: `https://vaani-interview-intelligence.vercel.app`
2. Test the health check endpoint:
   * Visit `https://vaani-interview-intelligence.vercel.app/api/health`
   * You should see:
     ```json
     {
       "status": "healthy",
       "system": "VAANI™ Adaptive AI Interview & Assessment Intelligence",
       "aiProvider": "gemini",
       "database": "neon",
       "timestamp": "..."
     }
     ```
3. Test creating an interview:
   * Open `https://vaani-interview-intelligence.vercel.app`
   * Click **"⚡ Load MetaDamen Scenario"**
   * Click **"Begin Adaptive Interview"**
   * Experience the real-time AI Recruiter voice, continuous voice answering, dynamic difficulty adjustment, and final assessment report.
   * Check your Neon dashboard: you will see the session row automatically created in your PostgreSQL database!

---

## Step 5: Submission Checklist for MetaDamen

Now you have all 4 required deliverables ready to submit:
1. **Deployed Application URL**: `https://<your-project>.vercel.app`
2. **GitHub Repository**: `https://github.com/<your-username>/vaani-interview-intelligence`
3. **README**: Fully documented with architecture, tech stack justification, and prompt engineering.
4. **5–7 Minute Demo Video**: Record using the step-by-step script in `docs/DEMO_VIDEO_GUIDE.md`.
