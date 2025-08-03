# 🧬 OncoRadar – Clinical Trial Matching Platform

OncoRadar is a web-based platform that helps patients discover personalized clinical trials based on their medical history and genomic data. The platform enables patients, practitioners, and physicians to collaborate in advancing cancer treatment through better trial enrollment.

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
cd oncoradar-backend
npm install
npm run dev
```

### Frontend

```bash
cd oncoradar-frontend
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
* [ ] Fetch Relevant Trials from ClinicalTrials.gov
* [ ] NGS PDF Upload & Parsing
* [ ] Patient-Trial Matching Engine
* [ ] Email Notifications For Relevant Trials
* [ ] Admin Dashboard for Researchers
* [ ] Introduce New Endpoints and more!
