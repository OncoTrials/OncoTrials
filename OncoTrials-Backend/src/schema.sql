-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.known_mutations (
  gene_symbol character varying,
  variant character varying,
  cancer_type character varying,
  associated_drugs text,
  source character varying,
  id integer NOT NULL DEFAULT nextval('known_mutations_id_seq'::regclass),
  CONSTRAINT known_mutations_pkey PRIMARY KEY (id)
);
CREATE TABLE public.mutations (
  patient_id uuid,
  gene_symbol character varying NOT NULL,
  variant character varying,
  source character varying,
  source_document_id uuid,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT mutations_pkey PRIMARY KEY (id),
  CONSTRAINT mutations_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id)
);
CREATE TABLE public.patients (
  user_id uuid,
  full_name character varying,
  dob date,
  gender character varying,
  location character varying,
  diagnosis text,
  ecog_score integer,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT patients_pkey PRIMARY KEY (id),
  CONSTRAINT patients_user_id_fkey1 FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT patients_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.pdf_uploads (
  uploaded_by uuid,
  patient_id uuid,
  file_url text NOT NULL,
  parse_summary text,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  parsed boolean DEFAULT false,
  uploaded_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT pdf_uploads_pkey PRIMARY KEY (id),
  CONSTRAINT pdf_uploads_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.users(id),
  CONSTRAINT pdf_uploads_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id)
);
CREATE TABLE public.trial_import_jobs (
  pages_fetched integer,
  total_inserted integer,
  total_updated integer,
  duration_seconds numeric,
  error_text text,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  run_at timestamp with time zone DEFAULT now(),
  CONSTRAINT trial_import_jobs_pkey PRIMARY KEY (id)
);
CREATE TABLE public.trial_matches (
  patient_id uuid,
  trial_id uuid,
  match_score integer,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  matched_on timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  referred boolean DEFAULT false,
  CONSTRAINT trial_matches_pkey PRIMARY KEY (id),
  CONSTRAINT trial_matches_trial_id_fkey FOREIGN KEY (trial_id) REFERENCES public.trials(id),
  CONSTRAINT trial_matches_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id)
);
CREATE TABLE public.trial_referrals (
  trial_match_id uuid,
  referred_by uuid,
  notes text,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  status character varying DEFAULT 'pending'::character varying CHECK (status::text = ANY (ARRAY['pending'::character varying::text, 'contacted'::character varying::text, 'declined'::character varying::text, 'enrolled'::character varying::text])),
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT trial_referrals_pkey PRIMARY KEY (id),
  CONSTRAINT trial_referrals_referred_by_fkey FOREIGN KEY (referred_by) REFERENCES public.users(id),
  CONSTRAINT trial_referrals_trial_match_id_fkey FOREIGN KEY (trial_match_id) REFERENCES public.trial_matches(id)
);
CREATE TABLE public.trials (
  created_by uuid DEFAULT auth.uid(),
  title text NOT NULL,
  summary text,
  status character varying,
  sponsor text,
  eligibility_criteria text,
  location_city character varying,
  location_state character varying,
  location_country character varying,
  latitude numeric,
  longitude numeric,
  biomarker_criteria text,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  source character varying DEFAULT 'clinicaltrials.gov'::character varying,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  nct_id character varying UNIQUE,
  organization text,
  study_description text,
  sex character varying,
  minimum_age character varying,
  locations jsonb,
  start_date date,
  primary_completion_date date,
  completion_date date,
  last_fetched_at timestamp with time zone,
  closed_at date,
  conditions ARRAY,
  source_version character varying,
  CONSTRAINT trials_pkey PRIMARY KEY (id),
  CONSTRAINT trials_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id)
);
CREATE TABLE public.users (
  role character varying NOT NULL CHECK (role::text = ANY (ARRAY['patient'::character varying, 'practitioner'::character varying, 'crc'::character varying]::text[])) NOT VALI),
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  email character varying NOT NULL UNIQUE,
  password_hash text,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT users_pkey PRIMARY KEY (id),
  CONSTRAINT users_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);