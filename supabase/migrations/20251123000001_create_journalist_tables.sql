-- Create news_articles table for journalists
CREATE TABLE IF NOT EXISTS public.news_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journalist_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  excerpt TEXT,
  category TEXT NOT NULL,
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  cover_image_url TEXT,
  is_published BOOLEAN DEFAULT false,
  is_featured BOOLEAN DEFAULT false,
  views_count INTEGER DEFAULT 0,
  likes_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create news_categories table
CREATE TABLE IF NOT EXISTS public.news_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.news_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.news_categories ENABLE ROW LEVEL SECURITY;

-- RLS Policies for news_articles
CREATE POLICY "Journalists can view all published articles"
  ON public.news_articles FOR SELECT
  USING (
    is_published = true 
    OR auth.uid() = journalist_id
    OR EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'moderator')
    )
  );

CREATE POLICY "Journalists can insert their own articles"
  ON public.news_articles FOR INSERT
  WITH CHECK (
    auth.uid() = journalist_id
    AND EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'journalist'
    )
  );

CREATE POLICY "Journalists can update their own articles"
  ON public.news_articles FOR UPDATE
  USING (
    auth.uid() = journalist_id
    OR EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'moderator')
    )
  );

CREATE POLICY "Journalists can delete their own articles"
  ON public.news_articles FOR DELETE
  USING (
    auth.uid() = journalist_id
    OR EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'moderator')
    )
  );

-- RLS Policies for news_categories (public read, admin write)
CREATE POLICY "Anyone can view categories"
  ON public.news_categories FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage categories"
  ON public.news_categories FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Create updated_at trigger
CREATE TRIGGER update_news_articles_updated_at
  BEFORE UPDATE ON public.news_articles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_news_articles_journalist_id ON public.news_articles(journalist_id);
CREATE INDEX IF NOT EXISTS idx_news_articles_category ON public.news_articles(category);
CREATE INDEX IF NOT EXISTS idx_news_articles_is_published ON public.news_articles(is_published);
CREATE INDEX IF NOT EXISTS idx_news_articles_created_at ON public.news_articles(created_at DESC);

