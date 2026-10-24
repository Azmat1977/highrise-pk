export type PropertyPurpose = 'buy' | 'rent';

export type PropertyCategory = 
  | 'house' 
  | 'apartment' 
  | 'residential-plot' 
  | 'commercial-plot' 
  | 'shop-office' 
  | 'farmhouse'
  | 'food-court'
  | 'hall';

export type PropertyVerificationStatus = 'verified-sample' | 'under-review' | 'basic-listing';

export interface Property {
  id: string;
  slug: string;
  title: string;
  purpose: PropertyPurpose;
  price: number;
  priceFormatted: string;
  city: string;
  area: string;
  address: string;
  category: PropertyCategory;
  categoryLabel: string;
  size: number;
  sizeUnit: 'Marla' | 'Kanal' | 'Sq. Ft.' | 'Sq. Yds.';
  coveredAreaSqFt?: number;
  bedrooms?: number;
  bathrooms?: number;
  floor?: string;
  furnishing?: 'Furnished' | 'Semi-Furnished' | 'Unfurnished';
  images: string[];
  description: string;
  features: string[];
  verificationStatus: PropertyVerificationStatus;
  verificationLabel: string;
  verificationDetails: string;
  developerId?: string;
  projectId?: string;
  projectName?: string;
  agent: {
    name: string;
    phone: string;
    email: string;
    agency: string;
    avatar: string;
  };
  isFeatured?: boolean;
  isDirectOwner?: boolean;
  ownerContactName?: string;
  publishedDate: string;
  sampleDisclaimer: string;
}

export type ProjectCategory = 'residential' | 'commercial' | 'mixed-use';

export type ProjectStatus = 'under-construction' | 'ready-to-move' | 'launching-soon' | 'completed';

export interface ProjectMilestone {
  title: string;
  date: string;
  completed: boolean;
  current?: boolean;
}

export interface ProjectAmenity {
  icon: string;
  name: string;
}

export interface ProjectUnit {
  id: string;
  category: 'Apartments' | 'Shops' | 'Offices' | 'Penthouses' | 'Food Court' | 'Halls' | 'Plots';
  title: string;
  size: string;
  price: string;
  bedrooms?: number;
  bathrooms?: number;
  available: boolean;
}

export interface PaymentPlan {
  bookingPercent: number;
  downPayment: string;
  durationMonths: number;
  installmentFrequency: string;
  installmentAmount: string;
  possessionPercent: number;
  sampleNotes: string;
}

export interface Project {
  id: string;
  slug: string;
  title: string;
  developerId: string;
  developerName: string;
  city: string;
  location: string;
  category: ProjectCategory;
  categoryLabel: string;
  status: ProjectStatus;
  statusLabel: string;
  priceRange: {
    min: number;
    max: number;
    formatted: string;
  };
  overview: string;
  description: string;
  images: string[];
  milestones: ProjectMilestone[];
  amenities: ProjectAmenity[];
  unitTypes: ProjectUnit[];
  paymentPlan?: PaymentPlan;
  nocStatus: string;
  featured: boolean;
  trending: boolean;
  highlighted: boolean;
  sampleDisclaimer: string;
  nearbyFacilities: Array<{ name: string; distance: string; type: string }>;
}

export interface Developer {
  id: string;
  slug: string;
  name: string;
  logoInitials: string;
  logoImage?: string;
  rating?: number;
  reviewCount?: number;
  establishedYear: number;
  totalProjects: number;
  activeProjects: number;
  description: string;
  isVerified: boolean;
  editorialFeatured: boolean;
  headquarters: string;
  associatedProjectIds: string[];
}

export type PropertyResearchTool = 
  | 'emi' 
  | 'eligibility' 
  | 'affordability' 
  | 'converter' 
  | 'construction' 
  | 'installment' 
  | 'roi'
  | 'valuation';

export interface PropertyFilterState {
  purpose: PropertyPurpose;
  city: string;
  area: string;
  category: string;
  minPrice: string;
  maxPrice: string;
  minSize: string;
  maxSize: string;
  bedrooms: string;
  sortBy: 'relevance' | 'newest' | 'price-asc' | 'price-desc';
  ownerOnly?: boolean;
}

export interface ProjectFilterState {
  city: string;
  category: string;
  status: string;
  budget: string;
  noc: string;
}

export interface RealEstateAgency {
  id: string;
  name: string;
  tagline: string;
  logoInitials: string;
  logoImage?: string;
  rating: number;
  reviewCount: number;
  listingsCount: number;
  verifiedDeals: number;
  activeProjects: number;
  operatingCities: string[];
  specialty: string;
  phone: string;
  badge: 'Trending' | 'Top Performer' | 'Elite Partner' | 'Super Agent';
}
