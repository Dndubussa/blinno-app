-- Wishlist/Favorites System
-- Allow users to save products, portfolios, and creators

-- Wishlists table
CREATE TABLE IF NOT EXISTS wishlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  name TEXT DEFAULT 'My Wishlist',
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Wishlist items table
CREATE TABLE IF NOT EXISTS wishlist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wishlist_id UUID REFERENCES wishlists(id) ON DELETE CASCADE NOT NULL,
  item_type TEXT NOT NULL CHECK (item_type IN ('product', 'portfolio', 'creator', 'event', 'service')),
  item_id UUID NOT NULL, -- References products.id, portfolios.id, users.id, etc.
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(wishlist_id, item_type, item_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_wishlists_user_id ON wishlists(user_id);
CREATE INDEX IF NOT EXISTS idx_wishlist_items_wishlist_id ON wishlist_items(wishlist_id);
CREATE INDEX IF NOT EXISTS idx_wishlist_items_item ON wishlist_items(item_type, item_id);

