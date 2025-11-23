-- Create job_postings table
CREATE TABLE IF NOT EXISTS public.job_postings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  company_name TEXT NOT NULL,
  location TEXT NOT NULL,
  job_type TEXT NOT NULL CHECK (job_type IN ('full_time', 'part_time', 'contract', 'internship', 'freelance')),
  category TEXT NOT NULL,
  skills_required TEXT[] DEFAULT ARRAY[]::TEXT[],
  salary_min DECIMAL(10, 2),
  salary_max DECIMAL(10, 2),
  salary_currency TEXT DEFAULT 'TSh',
  is_remote BOOLEAN DEFAULT false,
  application_deadline TIMESTAMPTZ,
  application_url TEXT,
  is_active BOOLEAN DEFAULT true,
  views_count INTEGER DEFAULT 0,
  applications_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create job_applications table
CREATE TABLE IF NOT EXISTS public.job_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_posting_id UUID REFERENCES public.job_postings(id) ON DELETE CASCADE NOT NULL,
  applicant_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  cover_letter TEXT,
  resume_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewing', 'shortlisted', 'interviewed', 'accepted', 'rejected')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(job_posting_id, applicant_id)
);

-- Enable RLS
ALTER TABLE public.job_postings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_applications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for job_postings
CREATE POLICY "Anyone can view active job postings"
  ON public.job_postings FOR SELECT
  USING (
    is_active = true 
    OR auth.uid() = employer_id
    OR EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'moderator')
    )
  );

CREATE POLICY "Employers can insert their own job postings"
  ON public.job_postings FOR INSERT
  WITH CHECK (
    auth.uid() = employer_id
    AND EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'employer'
    )
  );

CREATE POLICY "Employers can update their own job postings"
  ON public.job_postings FOR UPDATE
  USING (auth.uid() = employer_id);

CREATE POLICY "Employers can delete their own job postings"
  ON public.job_postings FOR DELETE
  USING (auth.uid() = employer_id);

-- RLS Policies for job_applications
CREATE POLICY "Applicants and employers can view applications"
  ON public.job_applications FOR SELECT
  USING (
    auth.uid() = applicant_id
    OR EXISTS (
      SELECT 1 FROM public.job_postings 
      WHERE id = job_posting_id 
      AND employer_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );

CREATE POLICY "Users can create applications"
  ON public.job_applications FOR INSERT
  WITH CHECK (auth.uid() = applicant_id);

CREATE POLICY "Employers can update applications"
  ON public.job_applications FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.job_postings 
      WHERE id = job_posting_id 
      AND employer_id = auth.uid()
    )
    OR auth.uid() = applicant_id
  );

-- Create updated_at triggers
CREATE TRIGGER update_job_postings_updated_at
  BEFORE UPDATE ON public.job_postings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_job_applications_updated_at
  BEFORE UPDATE ON public.job_applications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_job_postings_employer_id ON public.job_postings(employer_id);
CREATE INDEX IF NOT EXISTS idx_job_postings_category ON public.job_postings(category);
CREATE INDEX IF NOT EXISTS idx_job_postings_job_type ON public.job_postings(job_type);
CREATE INDEX IF NOT EXISTS idx_job_postings_is_active ON public.job_postings(is_active);
CREATE INDEX IF NOT EXISTS idx_job_applications_job_posting_id ON public.job_applications(job_posting_id);
CREATE INDEX IF NOT EXISTS idx_job_applications_applicant_id ON public.job_applications(applicant_id);
CREATE INDEX IF NOT EXISTS idx_job_applications_status ON public.job_applications(status);

