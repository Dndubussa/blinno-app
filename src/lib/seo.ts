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
  title: "BLISSFUL INNOVATIONS Discover, Create & Connect with Local Creators",
  description: "BLINNO connects local creators, events, marketplace, music, and more. Discover thousands of creators, events, and products worldwide.",
  image: "https://lovable.dev/opengraph-image-p98pqg.png",
  type: "website"
};

export function generateSEOData(pageData: Partial<SEOData>): SEOData {
  return {
    ...defaultSEO,
    ...pageData
  };
}