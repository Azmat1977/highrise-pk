export type CategoryGroup = 
  | 'property-guides'
  | 'investment-finance'
  | 'market-analysis'
  | 'legal-documentation'
  | 'location-guides'
  | 'projects-developers'
  | 'property-types'
  | 'lifestyle-living'
  | 'news-updates'
  | 'tips-advice'
  | 'technology'
  | 'general';

export interface CategoryMetadata {
  slug: string;
  name: string;
  description: string;
  longDescription?: string;
  icon: string; // Lucide React icon name
  emoji: string;
  color: {
    primary: string; // Tailwind color class (e.g., 'cyan-600')
    gradient: string; // Gradient classes
  };
  group: CategoryGroup;
  featured?: boolean;
  seoKeywords?: string[];
  relatedCategories?: string[];
}

export interface CategoryGroupMetadata {
  name: string;
  description: string;
  emoji: string;
  color: string;
}
