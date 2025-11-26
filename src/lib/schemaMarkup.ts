// Schema markup types and utilities
export interface ProductSchema {
  "@context": "https://schema.org/";
  "@type": "Product";
  name: string;
  description: string;
  image: string;
  offers: {
    "@type": "Offer";
    price: number;
    priceCurrency: string;
    availability: string;
    url?: string;
  };
  brand?: {
    "@type": "Brand";
    name: string;
  };
  review?: {
    "@type": "Review";
    reviewRating: {
      "@type": "Rating";
      ratingValue: number;
      bestRating: number;
    };
    author: {
      "@type": "Person";
      name: string;
    };
  }[];
  aggregateRating?: {
    "@type": "AggregateRating";
    ratingValue: number;
    reviewCount: number;
  };
}

export interface EventSchema {
  "@context": "https://schema.org/";
  "@type": "Event";
  name: string;
  startDate: string;
  endDate?: string;
  location: {
    "@type": "Place";
    name: string;
    address: {
      "@type": "PostalAddress";
      streetAddress?: string;
      addressLocality?: string;
      addressRegion?: string;
      postalCode?: string;
      addressCountry?: string;
    };
  };
  image: string;
  description: string;
  offers?: {
    "@type": "Offer";
    price: number;
    priceCurrency: string;
    availability: string;
    url?: string;
  };
  performer?: {
    "@type": "Person" | "Organization";
    name: string;
  };
}

export interface PersonSchema {
  "@context": "https://schema.org/";
  "@type": "Person";
  name: string;
  jobTitle?: string;
  description?: string;
  image?: string;
  url?: string;
  sameAs?: string[];
  worksFor?: {
    "@type": "Organization";
    name: string;
  };
}

export interface OrganizationSchema {
  "@context": "https://schema.org/";
  "@type": "Organization";
  name: string;
  url: string;
  logo: string;
  description?: string;
  address?: {
    "@type": "PostalAddress";
    streetAddress?: string;
    addressLocality?: string;
    addressRegion?: string;
    postalCode?: string;
    addressCountry?: string;
  };
  contactPoint?: {
    "@type": "ContactPoint";
    telephone?: string;
    contactType?: string;
  }[];
}

export interface ArticleSchema {
  "@context": "https://schema.org/";
  "@type": "Article";
  headline: string;
  description: string;
  author: {
    "@type": "Person";
    name: string;
  };
  publisher: {
    "@type": "Organization";
    name: string;
    logo: {
      "@type": "ImageObject";
      url: string;
    };
  };
  datePublished: string;
  dateModified?: string;
  image?: string;
  articleBody?: string;
}

export interface BreadcrumbSchema {
  "@context": "https://schema.org/";
  "@type": "BreadcrumbList";
  itemListElement: {
    "@type": "ListItem";
    position: number;
    name: string;
    item?: string;
  }[];
}

// Utility functions for generating schema markup
export const generateProductSchema = (product: any): ProductSchema => {
  return {
    "@context": "https://schema.org/",
    "@type": "Product",
    name: product.name,
    description: product.description,
    image: product.image_url || product.image || "",
    offers: {
      "@type": "Offer",
      price: product.price || 0,
      priceCurrency: product.currency || "TZS",
      availability: product.in_stock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      url: product.url || undefined
    },
    brand: product.brand ? {
      "@type": "Brand",
      name: product.brand
    } : undefined,
    ...(product.reviews && product.reviews.length > 0 ? {
      review: product.reviews.map((review: any) => ({
        "@type": "Review",
        reviewRating: {
          "@type": "Rating",
          ratingValue: review.rating,
          bestRating: 5
        },
        author: {
          "@type": "Person",
          name: review.author_name
        }
      }))
    } : {}),
    ...(product.average_rating && product.review_count ? {
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: product.average_rating,
        reviewCount: product.review_count
      }
    } : {})
  };
};

export const generateEventSchema = (event: any): EventSchema => {
  return {
    "@context": "https://schema.org/",
    "@type": "Event",
    name: event.title || event.name,
    startDate: event.start_date || event.date,
    endDate: event.end_date || undefined,
    location: {
      "@type": "Place",
      name: event.venue_name || event.location_name,
      address: {
        "@type": "PostalAddress",
        streetAddress: event.address || undefined,
        addressLocality: event.city || undefined,
        addressRegion: event.region || undefined,
        postalCode: event.postal_code || undefined,
        addressCountry: event.country || "TZ"
      }
    },
    image: event.image_url || event.image || "",
    description: event.description,
    ...(event.price ? {
      offers: {
        "@type": "Offer",
        price: event.price,
        priceCurrency: event.currency || "TZS",
        availability: "https://schema.org/InStock",
        url: event.url || undefined
      }
    } : undefined),
    ...(event.performer_name ? {
      performer: {
        "@type": "Person",
        name: event.performer_name
      }
    } : undefined)
  };
};

export const generatePersonSchema = (person: any): PersonSchema => {
  return {
    "@context": "https://schema.org/",
    "@type": "Person",
    name: person.display_name || person.name,
    jobTitle: person.job_title || person.title || undefined,
    description: person.bio || person.description || undefined,
    image: person.avatar_url || person.image || undefined,
    url: person.profile_url || person.url || undefined,
    ...(person.social_media ? {
      sameAs: Object.values(person.social_media).filter(Boolean) as string[]
    } : undefined),
    ...(person.company_name ? {
      worksFor: {
        "@type": "Organization",
        name: person.company_name
      }
    } : undefined)
  };
};

export const generateOrganizationSchema = (org: any): OrganizationSchema => {
  return {
    "@context": "https://schema.org/",
    "@type": "Organization",
    name: org.name,
    url: org.website || org.url,
    logo: org.logo_url || org.logo || "",
    description: org.description || undefined,
    ...(org.address ? {
      address: {
        "@type": "PostalAddress",
        streetAddress: org.address.street || undefined,
        addressLocality: org.address.city || undefined,
        addressRegion: org.address.region || undefined,
        postalCode: org.address.postal_code || undefined,
        addressCountry: org.address.country || "TZ"
      }
    } : undefined),
    ...(org.phone ? {
      contactPoint: [{
        "@type": "ContactPoint",
        telephone: org.phone,
        contactType: "customer service"
      }]
    } : undefined)
  };
};

export const generateArticleSchema = (article: any): ArticleSchema => {
  return {
    "@context": "https://schema.org/",
    "@type": "Article",
    headline: article.title,
    description: article.excerpt || article.description,
    author: {
      "@type": "Person",
      name: article.author_name || article.author?.display_name || "BLINNO Contributor"
    },
    publisher: {
      "@type": "Organization",
      name: "BLINNO",
      logo: {
        "@type": "ImageObject",
        url: "https://blinno.app/logo.png"
      }
    },
    datePublished: article.published_at || article.created_at,
    dateModified: article.updated_at || undefined,
    image: article.image_url || article.image || undefined,
    articleBody: article.content || undefined
  };
};

export const generateBreadcrumbSchema = (breadcrumbs: { name: string; url?: string }[]): BreadcrumbSchema => {
  return {
    "@context": "https://schema.org/",
    "@type": "BreadcrumbList",
    itemListElement: breadcrumbs.map((breadcrumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: breadcrumb.name,
      ...(breadcrumb.url ? { item: breadcrumb.url } : {})
    }))
  };
};

// Function to render schema markup as JSON-LD
export const renderSchemaMarkup = (schema: any): string => {
  return `<script type="application/ld+json">${JSON.stringify(schema)}</script>`;
};