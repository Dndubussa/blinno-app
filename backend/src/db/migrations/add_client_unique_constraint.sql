-- Add unique constraint to prevent duplicate clients
-- A freelancer can only have one client record per user_id

-- First, remove any duplicate entries (keep the oldest one)
DELETE FROM clients c1
WHERE EXISTS (
  SELECT 1 FROM clients c2
  WHERE c2.freelancer_id = c1.freelancer_id
    AND c2.user_id = c1.user_id
    AND c2.user_id IS NOT NULL
    AND c2.id < c1.id
);

-- Add unique constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'clients_freelancer_user_unique'
  ) THEN
    ALTER TABLE clients 
    ADD CONSTRAINT clients_freelancer_user_unique 
    UNIQUE (freelancer_id, user_id);
  END IF;
END $$;


