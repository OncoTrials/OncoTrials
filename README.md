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
| Deployment | Firebase + GCP                   |
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
| POST   | `/trials`     | Create a new trial         | Physician / CRC (org-scoped) |

**Org scoping on POST /trials:** the caller must hold the `practitioner` or `crc` role (from `public.users`), and the backend derives their organization from their email domain against `organizations.valid_domains`. The new trial is stamped with that `org_id` and `created_by` — callers cannot create trials under another organization. Direct Supabase inserts into `trials` are blocked by RLS; all writes go through this endpoint.

### Match

| Method | Endpoint        | Description                                   | Auth |
| ------ | --------------- | --------------------------------------------- | ---- |
| POST   | `/api/v1/match` | Rank trials for a patient (rules + AI vetting) | Supabase JWT or SMART session JWT |

Org membership for `/api/v1/match` is also resolved server-side (SMART JWT claim or email domain). Per-org AI consent (`organizations.ai_provider_consent`) is opt-in: org-bound callers only get the AI explainer once their org has consented.

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
    "conditions": ["HER2+ Breast Cancer"],
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

Requires `Authorization: Bearer <supabase JWT>`. `org_id` and `created_by` are set server-side and cannot be supplied.

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

Optional backend env vars:

```
# Import scoping
ONCOLOGY_ONLY=true                 # false = import the full CT.gov corpus
ONCOLOGY_CONDITION_QUERY=...       # override the CT.gov query.cond expression

# CDN cache purge on import (Cloudflare) — no-op unless all are set
CLOUDFLARE_API_TOKEN=...           # token with the zone's Cache Purge permission
CLOUDFLARE_ZONE_ID=...
PUBLIC_API_ORIGIN=https://api.trialsonco.com   # builds default purge URLs
# CDN_PURGE_URLS=https://.../trials?limit=all,https://.../trials/stream  # explicit override
```

---

## 🛠️ Scripts & Automation

The project includes several utility scripts for managing the clinical trials database. These are located in `OncoTrials-Backend/src/scripts/`.

### 🔄 Trial Import
Fetches and syncs trials from ClinicalTrials.gov. **Oncology-only by default** —
the import is scoped to cancer trials both server-side (CT.gov `query.cond`) and
client-side (`isOncologyTrial` guard), so unrelated conditions are never
ingested. Set `ONCOLOGY_ONLY=false` for a full-corpus import.
```bash
# Run the import (Incremental + oncology-only by default)
node OncoTrials-Backend/src/scripts/run_import.js
```

### ♻️ Refresh the read cache
Rebuilds the Redis trial cache the API serves from — run after a direct DB
change (e.g. a SQL migration) so `/trials` stops returning stale values.
```bash
cd OncoTrials-Backend && npm run refresh-cache
```

### 🧹 Database Cleanup
Removes expired trials, non-allowed-country trials, or non-oncology trials.
All default to a dry run; pass `--live` to delete. After a live deletion, run
`npm run refresh-cache`.
```bash
# Remove expired trials
node OncoTrials-Backend/src/scripts/remove_expired_trials.js [--live]

# Remove trials from non-allowed countries
node OncoTrials-Backend/src/scripts/remove_non_allowed_country_trials.js [--live]

# Remove non-oncology trials (prunes the pre-oncology-filter corpus)
node OncoTrials-Backend/src/scripts/remove_non_oncology_trials.js [--live]
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

* Backend unit tests (eligibility matcher, patient normalizer, biomarker extraction):

  ```bash
  cd OncoTrials-Backend
  npm test
  ```
* Use **Postman** or **Insomnia** to test `/trials` endpoints
* Ensure valid JWT token is included in Authorization header
* Example header:

  ```
  Authorization: Bearer <JWT>
  ```

## 🗄️ Database Migrations

SQL migrations live in `OncoTrials-Backend/migrations/`, numbered in apply
order. They are applied to the hosted Supabase project via the SQL editor (or
the Supabase MCP in write mode) — see each file's header comment for what it
does and why.

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
