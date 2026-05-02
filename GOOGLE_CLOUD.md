# ☁️ Google Cloud Integration Manifesto

CivicNavigator AI is built with a "Google-First" architecture, leveraging the full power of the Google Cloud Platform (GCP) to deliver a secure, scalable, and data-driven civic experience.

## 🏗️ Architecture Overview

### 1. Generative AI (Gemini 2.0 Flash)
The core of the application is powered by **Gemini 2.0 Flash** via the `@google/genai` SDK. 
- **Intent Detection**: Real-time classification of civic queries (polling, registration, rights).
- **Multilingual Support**: Integration with the **Google Cloud Translation API** for 8+ Indian languages.

### 2. BigQuery (Data-Driven Insights)
We use **BigQuery** (simulated via root `gcp-services.js`) to stream anonymous interaction data.
- **Purpose**: Allows election officials to monitor real-time "Civic Trends" (e.g., spike in registration queries in a specific region).
- **Implementation**: `streamToBigQuery()` handles asynchronous data offloading.

### 3. Cloud Storage (High-Durability Audit Logs)
Security is paramount. Critical system errors and security events are archived in **Google Cloud Storage (GCS)**.
- **Implementation**: `archiveToStorage()` persists JSON audit logs for post-election forensic analysis.

### 4. Cloud Run (Serverless Compute)
The entire backend is containerized (Docker) and deployed to **Google Cloud Run**.
- **Efficiency**: Auto-scaling based on request traffic.
- **Metadata Awareness**: The backend uses Cloud Run environment variables (`K_SERVICE`, `K_REVISION`) to adjust its security posture.

### 5. Cloud Logging (Structured Diagnostics)
We implement **Google Cloud Logging** compatibility by outputting structured JSON logs to `stdout`. This enables advanced log filtering and alerting in the GCP Console.

### 6. Google Maps Platform (Spatial Intelligence)
Seamless integration with:
- **Places API**: Real-time polling place discovery.
- **Geocoding API**: Translating user intent into spatial coordinates.
- **Distance Matrix**: Providing walking/driving times to polling stations.

---
*CivicNavigator AI: Leveraging the Google Cloud ecosystem for a more transparent democracy.*
