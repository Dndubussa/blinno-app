// src/lib/seo.ts
export interface SEOData {
  title: string;
  description: string;
  image?: string;
  url?: string;
  type?: string;
  keywords?: string[];
}

export const defaultSEO: SEOData = {
  title: "BLISSFUL INNOVATIONS Discover, Create & Connect with All Things Tanzanian",
  description: "BLINNO connects Tanzanian creators, events, marketplace, music, and more. Discover 15,000+ creators, 500+ events, 2,000+ products across Tanzania.",
  image: "https://lovable.dev/opengraph-image-p98pqg.png",
  type: "website"
};

export function generateSEOData(pageData: Partial<SEOData>): SEOData {
  return {
    ...defaultSEO,
    ...pageData
  };
}