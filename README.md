# CivicNavigator AI 🗳️
### A Location-Aware Election Assistant Powered by Google Cloud

[![Cloud Run](https://img.shields.io/badge/Cloud%20Run-Deployed-4285F4?logo=google-cloud)](https://your-cloudrun-url)
[![Gemini](https://img.shields.io/badge/Powered%20by-Gemini%202.0-8B5CF6)](https://ai.google.dev)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

CivicNavigator AI helps citizens navigate their civic duties through an intelligent, nonpartisan election assistant built on **Google Cloud Run**, **Gemini 2.0 Flash**, and **Google Maps Platform**.

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🤖 **AI Chat** | Gemini 2.0 Flash answers civic questions with intent detection |
| 🗺️ **Polling Place Finder** | Google Maps + Places API to locate nearby polling stations |
| 📅 **Election Dates** | Google Civic Information API for upcoming elections |
| 📍 **Location Awareness** | Auto-detects or accepts user address for personalised answers |
| 🚦 **Live Traffic** | Real-time traffic layer on the map |
| ⚖️ **Nonpartisan** | Strictly objective — no candidate endorsements |
| 🔒 **Secure** | Rate limiting, Helmet.js, input validation, CORS |
| ♿ **Accessible** | ARIA labels, semantic HTML, keyboard navigation |

---

## ☁️ Google Cloud Ecosystem Adoption

This project adopts the full Google Cloud ecosystem to deliver a secure, scalable, and data-driven civic experience:

*   **Generative AI (Gemini 2.0 Flash)**: Powered by the `@google/genai` SDK for nonpartisan civic guidance.
*   **BigQuery (Civic Insights)**: Real-time streaming of anonymous interaction data to BigQuery for trend analysis.
*   **Cloud Storage (Audit Logging)**: High-durability archival of critical security and system audit logs.
*   **Cloud Run (Serverless Compute)**: Containerized deployment with environment-aware security posture.
*   **Cloud Logging**: Structured JSON logging for advanced diagnostics in the GCP Console.
*   **Google Maps Platform**: Spatial intelligence via Places, Geocoding, and Distance Matrix APIs.

See [GOOGLE_CLOUD.md](./GOOGLE_CLOUD.md) for the full architecture manifesto.

## 🚀 Quick Start (Local)

### Prerequisites
- Node.js ≥ 18
- A **Gemini API key** from [Google AI Studio](https://aistudio.google.com)
- A **Google Maps API key** with these APIs enabled:
  - Maps JavaScript API
  - Places API
  - Geocoding API
  - Distance Matrix API
  - Directions API
  - Civic Information API *(optional)*

### 1. Clone & Install
```bash
git clone https://github.com/YOUR_USERNAME/civicnavigator-ai
cd civicnavigator-ai
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env
# Edit .env and add your API keys
```

### 3. Run
```bash
npm start
# Open http://localhost:8080
```

### 4. Test
```bash
# Start server first, then:
npm test
```

---

## ☁️ Deploy to Cloud Run

### Option A — Cloud Console (No CLI needed)

1. Go to [Cloud Run Console](https://console.cloud.google.com/run)
2. Click **"Create Service"** → **"Continuously deploy from a repository"**
3. Connect your GitHub repo
4. Set environment variables under **"Variables & Secrets"**:
   - `GEMINI_API_KEY`
   - `GOOGLE_MAPS_API_KEY`
   - `GOOGLE_CLOUD_PROJECT`
5. Click **Deploy** ✅

### Option B — gcloud CLI

```bash
# Authenticate
gcloud auth login
gcloud config set project YOUR_PROJECT_ID

# Deploy directly from source (Cloud Build handles the Docker build)
gcloud run deploy civicnavigator-ai \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --port 8080 \
  --set-env-vars "GEMINI_API_KEY=YOUR_KEY,GOOGLE_MAPS_API_KEY=YOUR_KEY" \
  --memory 512Mi \
  --min-instances 0 \
  --max-instances 10
```

### Option C — Docker + Cloud Run

```bash
# Build & push to Artifact Registry
gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/civicnavigator-ai

# Deploy
gcloud run deploy civicnavigator-ai \
  --image gcr.io/YOUR_PROJECT_ID/civicnavigator-ai \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars "GEMINI_API_KEY=...,GOOGLE_MAPS_API_KEY=..."
```

---

## 📁 Project Structure

```
civicnavigator-ai/
├── server.js              # Express server (entry point)
├── src/
│   ├── civicAgent.js      # Gemini AI agent with intent detection
│   ├── mapsService.js     # Google Maps: geocode, places, directions
│   └── electionService.js # Civic Info API: elections, candidates
├── public/
│   ├── index.html         # SPA shell (semantic, accessible)
│   ├── style.css          # Premium dark-mode UI
│   └── app.js             # Frontend logic: chat, map, location
├── tests/
│   └── api.test.js        # Integration test suite
├── Dockerfile             # Cloud Run optimised container
├── .dockerignore
├── .env.example
└── README.md
```

---

## 🔐 Security

- **Helmet.js** — sets secure HTTP headers
- **Rate limiting** — 60 requests/minute per IP on `/api/`
- **Input validation** — type checks, length limits, sanitization
- **Non-root Docker user** — runs as `civicnav` user (UID 1001)
- **CORS** — configurable allowed origins
- **No secrets in source** — all keys via environment variables

---

## 🧠 Prompt Engineering

The Gemini agent uses a carefully crafted system prompt that:
- Enforces **nonpartisan** responses
- Focuses on **civic education** and **accessibility**
- Provides **intent detection** (polling, registration, rights, etc.)
- Generates **contextual quick-reply suggestions**
- Cites authoritative sources (vote.gov, ballotpedia, etc.)

See `src/civicAgent.js` for full prompt documentation.

---

## 🌐 Google Services Used

| Service | Purpose |
|---------|---------|
| **Cloud Run** | Serverless hosting with auto-scaling |
| **Gemini 2.0 Flash** | Core AI reasoning and conversation |
| **Maps JavaScript API** | Interactive dark-mode map |
| **Places API** | Polling location discovery |
| **Geocoding API** | Address → coordinates |
| **Distance Matrix API** | Travel time to polling places |
| **Directions API** | Turn-by-turn route rendering |
| **Civic Information API** | Upcoming election data |

---

## 📄 License

MIT © CivicNavigator Team
