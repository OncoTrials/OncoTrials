-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.known_mutations (
  id integer NOT NULL DEFAULT nextval('known_mutations_id_seq'::regclass),
  gene_symbol character varying,
  variant character varying,
  cancer_type character varying,
  associated_drugs text,
  source character varying,
  CONSTRAINT known_mutations_pkey PRIMARY KEY (id)
);
CREATE TABLE public.mutations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  patient_id uuid,
  gene_symbol character varying NOT NULL,
  variant character varying,
  source character varying,
  source_document_id uuid,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT mutations_pkey PRIMARY KEY (id),
  CONSTRAINT mutations_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id)
);
CREATE TABLE public.patients (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  full_name character varying,
  dob date,
  gender character varying,
  location character varying,
  diagnosis text,
  ecog_score integer,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT patients_pkey PRIMARY KEY (id),
  CONSTRAINT patients_user_id_fkey1 FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT patients_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.pdf_uploads (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  uploaded_by uuid,
  patient_id uuid,
  file_url text NOT NULL,
  parsed boolean DEFAULT false,
  parse_summary text,
  uploaded_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT pdf_uploads_pkey PRIMARY KEY (id),
  CONSTRAINT pdf_uploads_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id),
  CONSTRAINT pdf_uploads_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.users(id)
);
CREATE TABLE public.trial_matches (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  patient_id uuid,
  trial_id uuid,
  match_score integer,
  matched_on timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  referred boolean DEFAULT false,
  CONSTRAINT trial_matches_pkey PRIMARY KEY (id),
  CONSTRAINT trial_matches_trial_id_fkey FOREIGN KEY (trial_id) REFERENCES public.trials(id),
  CONSTRAINT trial_matches_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id)
);
CREATE TABLE public.trial_referrals (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  trial_match_id uuid,
  referred_by uuid,
  status character varying DEFAULT 'pending'::character varying CHECK (status::text = ANY (ARRAY['pending'::character varying::text, 'contacted'::character varying::text, 'declined'::character varying::text, 'enrolled'::character varying::text])),
  notes text,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT trial_referrals_pkey PRIMARY KEY (id),
  CONSTRAINT trial_referrals_trial_match_id_fkey FOREIGN KEY (trial_match_id) REFERENCES public.trial_matches(id),
  CONSTRAINT trial_referrals_referred_by_fkey FOREIGN KEY (referred_by) REFERENCES public.users(id)
);
CREATE TABLE public.trials (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  nct_id character varying NOT NULL UNIQUE,
  title text NOT NULL,
  summary text,
  phase character varying,
  condition text,
  status character varying,
  sponsor text,
  eligibility_criteria text,
  location_city character varying,
  location_state character varying,
  location_country character varying,
  latitude numeric,
  longitude numeric,
  biomarker_criteria text,
  source character varying DEFAULT 'clinicaltrials.gov'::character varying,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT trials_pkey PRIMARY KEY (id)
);
CREATE TABLE public.users (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  role character varying NOT NULL CHECK (role::text = ANY (ARRAY['patient'::character varying::text, 'practitioner'::character varying::text, 'crc'::character varying::text])),
  CONSTRAINT users_pkey PRIMARY KEY (id),
  CONSTRAINT users_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);