# 🧬 OncoTrials – Clinical Trial Matching Platform

OncoTrials is a web-based platform that helps patients discover personalized clinical trials based on their medical history and genomic data. The platform enables patients, practitioners, and physicians to collaborate in advancing cancer treatment through better trial enrollment.

## 🚀 Features

### ✅ Patient Portal

* View matched clinical trials based on eligibility criteria
* Upload NGS reports or clinical documents
* Accept or decline trial invitations

### 🧑‍⚕️ Clinical Research Coordinator (CRC) Portal

* Create and manage clinical trials manually
* Access fetched trials from ClinicalTrials.gov
* Define detailed trial metadata and eligibility criteria
* Upload NGS Reports (Parses file, extracts relevant genes, returns possible matches)

### 🔬 Physician Portal

* Analyze patient-trial matches
* View engagement metrics

---

## 🧱 Tech Stack

| Area       | Technology                       |
| ---------- | -------------------------------- |
| Frontend   | React.js, Tailwind CSS           |
| Backend    | Node.js, Express                 |
| Auth & DB  | Supabase (Postgres + Auth)       |
| Deployment | (You can add Vercel/Render/etc.) |
| Testing    | Jest, Playwright                 |

---

## 🔐 Authentication & Authorization

* **Supabase Auth** handles user signup and JWT validation.
* **Row-Level Security (RLS)** policies restrict data access to authorized roles (`patient`, `CRC`, `physician`).

---

## 🧪 API Endpoints

### Trials

| Method | Endpoint      | Description                | Auth Role |
| ------ | ------------- | -------------------------- | --------- |
| GET    | `/trials`     | List all trials            | Public    |
| GET    | `/trials/:id` | Fetch specific trial by ID | Public    |
| POST   | `/trials`     | Create a new trial         | CRC       |

### Auth

| Method | Endpoint            | Description                        |
| ------ | ------------------- | ---------------------------------- |
| POST   | Supabase client SDK | Used for login/signup via frontend |

---

## 📄 Sample Request Payload (POST /trials)

```json
{
  "metadata": {
    "title": "Phase II Breast Cancer Immunotherapy Trial",
    "summary": "Investigating the effects of drug ABC on HER2+ breast cancer.",
    "phase": "II",
    "condition": "HER2+ Breast Cancer",
    "status": "Recruiting",
    "sponsor": "Cancer Research Org",
    "location_city": "Toronto",
    "location_state": "ON",
    "location_country": "Canada",
    "latitude": 43.65107,
    "longitude": -79.347015,
    "biomarker_criteria": "HER2 amplification"
  },
  "eligibilityCriteria": "Patients must be HER2+ and over 18 years old."
}
```

---

## 🧪 Local Development Setup

### Backend

```bash
cd OncoTrials-Backend
npm install
npm run dev
```

### Frontend

```bash
cd OncoTrials-Frontend
npm install
npm run dev
```

### Environment

Create a `.env` in both backend and frontend projects with:

```
SUPABASE_URL=...
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

---

## 🛠️ Scripts & Automation

The project includes several utility scripts for managing the clinical trials database. These are located in `OncoTrials-Backend/src/scripts/`.

### 🔄 Trial Import
Fetches and syncs trials from ClinicalTrials.gov.
```bash
# Run the import (Incremental by default)
node OncoTrials-Backend/src/scripts/run_import.js
```

### 🧹 Database Cleanup
Removes expired trials (closed status or past dates) or trials from non-allowed countries.
```bash
# Remove expired trials (Dry Run)
node OncoTrials-Backend/src/scripts/remove_expired_trials.js

# Remove expired trials (Live Deletion)
node OncoTrials-Backend/src/scripts/remove_expired_trials.js --live

# Remove trials from non-allowed countries (Dry Run)
node OncoTrials-Backend/src/scripts/remove_non_allowed_country_trials.js

# Remove trials from non-allowed countries (Live Deletion)
node OncoTrials-Backend/src/scripts/remove_non_allowed_country_trials.js --live
```

---

## ☁️ GCP Deployment (Cloud Run + Cloud Scheduler)

For a reliable, low-cost automation solution with mobile-friendly monitoring, we use **Google Cloud Run Jobs** and **Cloud Scheduler**.

### 1. Prerequisites
*   [Google Cloud SDK](https://cloud.google.com/sdk/docs/install) installed and initialized (`gcloud init`).
*   An active GCP Project with billing enabled (the Free Tier covers most of this).

### 2. Deployment Steps
1.  **Enable APIs:**
    ```bash
    gcloud services enable run.googleapis.com cloudscheduler.googleapis.com
    ```
2.  **Build and Push Container:**
    Create a `Dockerfile` in the backend and push to Artifact Registry.
3.  **Create Cloud Run Job:**
    Deploy the script as a Job (not a Service) so it only runs when needed.
4.  **Schedule the Job:**
    Use Cloud Scheduler to trigger the Job (e.g., every 2 hours).

### 3. Mobile Monitoring
Download the **Google Cloud Console** app on Android to:
*   View real-time logs.
*   Check the status of scheduled runs.
*   Manually trigger jobs from your phone.

---

## 🛡️ Security Practices

* JWT validation with Supabase public key
* Supabase RLS for DB-level access control

---

## 🧪 Testing

* Use **Postman** or **Insomnia** to test `/trials` endpoints
* Ensure valid JWT token is included in Authorization header
* Example header:

  ```
  Authorization: Bearer <JWT>
  ```

---

## 📌 Roadmap

* [x] Supabase Auth + RLS
* [x] Manual Trial Creation
* [x] Fetch Relevant Trials from ClinicalTrials.gov
* [ ] NGS PDF Upload & Parsing
* [ ] Patient-Trial Matching Engine
* [ ] Email Notifications For Relevant Trials
* [ ] Admin Dashboard for Researchers
* [ ] Introduce New Endpoints and more!
