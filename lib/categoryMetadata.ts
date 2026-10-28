import { CategoryMetadata, CategoryGroupMetadata, CategoryGroup } from './types/category';

// Category Group Definitions
export const CATEGORY_GROUPS: Record<CategoryGroup, CategoryGroupMetadata> = {
  'property-guides': {
    name: 'Property Guides',
    description: 'Essential guides for buying, selling, and renting properties',
    emoji: '📚',
    color: 'blue-600'
  },
  'investment-finance': {
    name: 'Investment & Finance',
    description: 'Financial insights and investment strategies',
    emoji: '💰',
    color: 'green-600'
  },
  'market-analysis': {
    name: 'Market Analysis',
    description: 'Data-driven market trends and analysis',
    emoji: '📊',
    color: 'purple-600'
  },
  'legal-documentation': {
    name: 'Legal & Documentation',
    description: 'Legal requirements and documentation processes',
    emoji: '⚖️',
    color: 'red-600'
  },
  'location-guides': {
    name: 'Location Guides',
    description: 'City and area-specific property insights',
    emoji: '📍',
    color: 'orange-600'
  },
  'projects-developers': {
    name: 'Projects & Developers',
    description: 'New projects and developer updates',
    emoji: '🏗️',
    color: 'yellow-600'
  },
  'property-types': {
    name: 'Property Types',
    description: 'Guides for different property categories',
    emoji: '🏘️',
    color: 'indigo-600'
  },
  'lifestyle-living': {
    name: 'Lifestyle & Living',
    description: 'Home design, decor, and lifestyle tips',
    emoji: '🎨',
    color: 'pink-600'
  },
  'news-updates': {
    name: 'News & Updates',
    description: 'Latest real estate news and policy updates',
    emoji: '📰',
    color: 'cyan-600'
  },
  'tips-advice': {
    name: 'Tips & Advice',
    description: 'Expert tips and practical advice',
    emoji: '💡',
    color: 'amber-600'
  },
  'technology': {
    name: 'Technology',
    description: 'PropTech and digital innovation',
    emoji: '🚀',
    color: 'teal-600'
  },
  'general': {
    name: 'General',
    description: 'Opinion pieces and general content',
    emoji: '📝',
    color: 'gray-600'
  }
};

// Comprehensive Category Metadata (50+ categories)
export const CATEGORY_METADATA: Record<string, CategoryMetadata> = {
  // ============================================
  // PROPERTY GUIDES
  // ============================================
  'buying-guide': {
    slug: 'buying-guide',
    name: 'Buying Guide',
    description: 'Step-by-step guidance for purchasing your dream property in Pakistan with confidence and security.',
    longDescription: 'Navigate the property buying process with expert insights on property selection, price negotiation, legal verification, and ownership transfer. Learn from real buyer experiences and avoid common pitfalls.',
    icon: 'ShoppingCart',
    emoji: '🛒',
    color: {
      primary: 'blue-600',
      gradient: 'from-blue-600 to-indigo-600'
    },
    group: 'property-guides',
    featured: true,
    seoKeywords: ['property buying', 'how to buy property', 'property purchase guide'],
    relatedCategories: ['legal-guide', 'documentation', 'first-time-buyers']
  },
  
  'selling-guide': {
    slug: 'selling-guide',
    name: 'Selling Guide',
    description: 'Maximize your property value with proven strategies for effective marketing and successful sales.',
    longDescription: 'Master the art of property selling with professional tips on pricing, staging, marketing, and negotiation. Discover how to attract serious buyers and close deals faster.',
    icon: 'TrendingUp',
    emoji: '📈',
    color: {
      primary: 'blue-600',
      gradient: 'from-blue-600 to-cyan-600'
    },
    group: 'property-guides',
    featured: true,
    seoKeywords: ['sell property fast', 'property selling tips', 'real estate marketing'],
    relatedCategories: ['market-trends', 'price-trends', 'legal-guide']
  },

  'renting-guide': {
    slug: 'renting-guide',
    name: 'Renting Guide',
    description: 'Complete rental insights for tenants and landlords, from agreements to tenant rights.',
    longDescription: 'Whether you\'re renting your first apartment or managing rental properties, find comprehensive advice on lease agreements, tenant screening, rental pricing, and property maintenance.',
    icon: 'Key',
    emoji: '🔑',
    color: {
      primary: 'blue-600',
      gradient: 'from-blue-500 to-teal-600'
    },
    group: 'property-guides',
    featured: true,
    seoKeywords: ['rental guide', 'tenant rights', 'lease agreement'],
    relatedCategories: ['legal-guide', 'documentation', 'apartments']
  },

  'first-time-buyers': {
    slug: 'first-time-buyers',
    name: 'First-Time Buyers',
    description: 'Essential advice for first-time property buyers navigating Pakistan\'s real estate market.',
    longDescription: 'Start your property ownership journey with confidence. Learn about budget planning, mortgage options, location selection, and legal requirements specifically tailored for first-time buyers.',
    icon: 'Home',
    emoji: '🏡',
    color: {
      primary: 'blue-600',
      gradient: 'from-indigo-600 to-blue-600'
    },
    group: 'property-guides',
    featured: true,
    seoKeywords: ['first home buyer', 'property for beginners', 'buying first property'],
    relatedCategories: ['buying-guide', 'mortgage-loans', 'investment-tips']
  },

  // ============================================
  // INVESTMENT & FINANCE
  // ============================================
  'investment': {
    slug: 'investment',
    name: 'Investment',
    description: 'Strategic insights for real estate investors seeking profitable opportunities in Pakistan.',
    longDescription: 'Explore investment opportunities across residential, commercial, and land sectors. Understand market cycles, risk assessment, portfolio diversification, and long-term wealth building through real estate.',
    icon: 'PiggyBank',
    emoji: '💰',
    color: {
      primary: 'green-600',
      gradient: 'from-green-600 to-emerald-600'
    },
    group: 'investment-finance',
    featured: true,
    seoKeywords: ['real estate investment', 'property investment Pakistan', 'investment opportunities'],
    relatedCategories: ['investment-tips', 'roi-analysis', 'market-analysis']
  },

  'investment-tips': {
    slug: 'investment-tips',
    name: 'Investment Tips',
    description: 'Actionable tips from seasoned investors to maximize returns and minimize risks.',
    longDescription: 'Get practical investment advice on timing, location selection, property types, financing strategies, and exit planning. Learn from successful investors\' experiences and case studies.',
    icon: 'Lightbulb',
    emoji: '💡',
    color: {
      primary: 'green-600',
      gradient: 'from-emerald-600 to-teal-600'
    },
    group: 'investment-finance',
    featured: true,
    seoKeywords: ['investment strategies', 'property tips', 'real estate advice'],
    relatedCategories: ['investment', 'roi-analysis', 'market-trends']
  },

  'roi-analysis': {
    slug: 'roi-analysis',
    name: 'ROI Analysis',
    description: 'Data-driven ROI calculations and investment performance analysis for informed decisions.',
    longDescription: 'Master the numbers behind successful property investments. Understand rental yields, capital appreciation, cash flow analysis, and comparative ROI across different property types and locations.',
    icon: 'Calculator',
    emoji: '🧮',
    color: {
      primary: 'green-600',
      gradient: 'from-green-600 to-lime-600'
    },
    group: 'investment-finance',
    seoKeywords: ['ROI calculator', 'investment returns', 'property yield'],
    relatedCategories: ['investment', 'market-analysis', 'price-trends']
  },

  'real-estate-finance': {
    slug: 'real-estate-finance',
    name: 'Real Estate Finance',
    description: 'Comprehensive financial planning and funding strategies for property transactions.',
    longDescription: 'Navigate financing options including bank loans, developer installments, and alternative funding. Understand interest rates, down payments, EMIs, and financial documentation requirements.',
    icon: 'DollarSign',
    emoji: '💵',
    color: {
      primary: 'green-600',
      gradient: 'from-green-700 to-green-600'
    },
    group: 'investment-finance',
    seoKeywords: ['property financing', 'real estate loans', 'property funding'],
    relatedCategories: ['mortgage-loans', 'investment', 'buying-guide']
  },

  'mortgage-loans': {
    slug: 'mortgage-loans',
    name: 'Mortgage & Loans',
    description: 'Complete guide to mortgage products, eligibility criteria, and application processes.',
    longDescription: 'Compare mortgage options from leading Pakistani banks. Learn about eligibility requirements, documentation, interest rate structures, loan-to-value ratios, and repayment strategies.',
    icon: 'CreditCard',
    emoji: '💳',
    color: {
      primary: 'green-600',
      gradient: 'from-emerald-700 to-green-600'
    },
    group: 'investment-finance',
    seoKeywords: ['home loan Pakistan', 'mortgage rates', 'bank financing'],
    relatedCategories: ['real-estate-finance', 'buying-guide', 'first-time-buyers']
  },

  // ============================================
  // MARKET ANALYSIS
  // ============================================
  'market-analysis': {
    slug: 'market-analysis',
    name: 'Market Analysis',
    description: 'In-depth market research and analytics to understand property market dynamics.',
    longDescription: 'Access comprehensive market reports covering supply-demand dynamics, price movements, inventory levels, and future forecasts across major Pakistani cities and property segments.',
    icon: 'BarChart3',
    emoji: '📊',
    color: {
      primary: 'purple-600',
      gradient: 'from-purple-600 to-indigo-600'
    },
    group: 'market-analysis',
    featured: true,
    seoKeywords: ['market report', 'property market analysis', 'real estate trends'],
    relatedCategories: ['market-trends', 'price-trends', 'industry-reports']
  },

  'market-trends': {
    slug: 'market-trends',
    name: 'Market Trends',
    description: 'Latest trends shaping Pakistan\'s real estate landscape and buyer preferences.',
    longDescription: 'Stay ahead with insights on emerging neighborhoods, changing buyer demographics, architectural trends, amenity preferences, and shifts in demand patterns across property types.',
    icon: 'TrendingUp',
    emoji: '📈',
    color: {
      primary: 'purple-600',
      gradient: 'from-purple-600 to-pink-600'
    },
    group: 'market-analysis',
    featured: true,
    seoKeywords: ['real estate trends', 'property trends Pakistan', 'market outlook'],
    relatedCategories: ['market-analysis', 'news', 'price-trends']
  },

  'price-trends': {
    slug: 'price-trends',
    name: 'Price Trends',
    description: 'Historical price data and forecasts to identify appreciation patterns and opportunities.',
    longDescription: 'Analyze price movements across different property types, sizes, and locations. Understand seasonal variations, growth corridors, and value appreciation trajectories.',
    icon: 'LineChart',
    emoji: '📉',
    color: {
      primary: 'purple-600',
      gradient: 'from-indigo-600 to-purple-600'
    },
    group: 'market-analysis',
    seoKeywords: ['property prices Pakistan', 'price trends', 'real estate rates'],
    relatedCategories: ['market-analysis', 'roi-analysis', 'investment']
  },

  'market-news': {
    slug: 'market-news',
    name: 'Market News',
    description: 'Breaking news and updates affecting property markets across Pakistan.',
    icon: 'Newspaper',
    emoji: '🗞️',
    color: {
      primary: 'purple-600',
      gradient: 'from-purple-600 to-blue-600'
    },
    group: 'market-analysis',
    seoKeywords: ['real estate news', 'property news Pakistan'],
    relatedCategories: ['news', 'market-trends', 'government-policies']
  },

  'industry-reports': {
    slug: 'industry-reports',
    name: 'Industry Reports',
    description: 'Professional research reports and whitepapers on Pakistan\'s real estate sector.',
    icon: 'FileText',
    emoji: '📄',
    color: {
      primary: 'purple-600',
      gradient: 'from-violet-600 to-purple-600'
    },
    group: 'market-analysis',
    seoKeywords: ['real estate report', 'market research', 'industry analysis'],
    relatedCategories: ['market-analysis', 'market-trends', 'investment']
  },

  // ============================================
  // LEGAL & DOCUMENTATION
  // ============================================
  'legal': {
    slug: 'legal',
    name: 'Legal',
    description: 'Legal frameworks, regulations, and compliance requirements for property transactions.',
    longDescription: 'Understand property laws, ownership rights, inheritance rules, dispute resolution mechanisms, and regulatory compliance to ensure legally sound transactions.',
    icon: 'Scale',
    emoji: '⚖️',
    color: {
      primary: 'red-600',
      gradient: 'from-red-600 to-rose-600'
    },
    group: 'legal-documentation',
    featured: true,
    seoKeywords: ['property law Pakistan', 'real estate legal', 'property rights'],
    relatedCategories: ['legal-guide', 'property-laws', 'documentation']
  },

  'legal-guide': {
    slug: 'legal-guide',
    name: 'Legal Guide',
    description: 'Step-by-step legal procedures for buyers, sellers, and investors.',
    longDescription: 'Navigate the legal maze with clear guidance on NOCs, clearances, title verification, power of attorney, succession certificates, and court procedures related to property.',
    icon: 'BookOpen',
    emoji: '📖',
    color: {
      primary: 'red-600',
      gradient: 'from-rose-600 to-red-600'
    },
    group: 'legal-documentation',
    featured: true,
    seoKeywords: ['legal procedure', 'property legal guide', 'legal requirements'],
    relatedCategories: ['legal', 'documentation', 'verification']
  },

  'property-laws': {
    slug: 'property-laws',
    name: 'Property Laws',
    description: 'Overview of federal and provincial laws governing real estate in Pakistan.',
    icon: 'Gavel',
    emoji: '🔨',
    color: {
      primary: 'red-600',
      gradient: 'from-red-700 to-rose-600'
    },
    group: 'legal-documentation',
    seoKeywords: ['property law', 'real estate regulations', 'Pakistan property act'],
    relatedCategories: ['legal', 'legal-guide', 'government-policies']
  },

  'documentation': {
    slug: 'documentation',
    name: 'Documentation',
    description: 'Essential documents required for property registration, transfer, and ownership.',
    longDescription: 'Complete checklist of documents including sale deeds, transfer letters, tax receipts, NOCs, and possession letters. Understand document verification and authentication processes.',
    icon: 'FileCheck',
    emoji: '📋',
    color: {
      primary: 'red-600',
      gradient: 'from-orange-600 to-red-600'
    },
    group: 'legal-documentation',
    seoKeywords: ['property documents', 'required documents', 'documentation checklist'],
    relatedCategories: ['legal-guide', 'verification', 'buying-guide']
  },

  'taxation': {
    slug: 'taxation',
    name: 'Taxation',
    description: 'Tax implications, capital gains, withholding taxes, and tax planning for property.',
    longDescription: 'Understand FBR regulations, tax slabs, exemptions, payment procedures, and strategies to optimize your tax liability on property transactions and rental income.',
    icon: 'Receipt',
    emoji: '🧾',
    color: {
      primary: 'red-600',
      gradient: 'from-red-600 to-orange-600'
    },
    group: 'legal-documentation',
    seoKeywords: ['property tax Pakistan', 'capital gains tax', 'tax on property'],
    relatedCategories: ['legal', 'documentation', 'real-estate-finance']
  },

  'verification': {
    slug: 'verification',
    name: 'Verification',
    description: 'Methods to verify property ownership, developer credentials, and legal status.',
    icon: 'ShieldCheck',
    emoji: '✅',
    color: {
      primary: 'red-600',
      gradient: 'from-green-600 to-emerald-600'
    },
    group: 'legal-documentation',
    seoKeywords: ['property verification', 'title verification', 'authenticity check'],
    relatedCategories: ['legal-guide', 'documentation', 'buying-guide']
  },

  // ============================================
  // LOCATION GUIDES (Major Cities)
  // ============================================
  'karachi': {
    slug: 'karachi',
    name: 'Karachi',
    description: 'Property insights, area reviews, and market updates from Pakistan\'s largest city.',
    longDescription: 'Explore Karachi\'s diverse neighborhoods from DHA and Clifton to Bahria Town and Malir. Discover property trends, infrastructure projects, and investment hotspots in the city of lights.',
    icon: 'MapPin',
    emoji: '🏙️',
    color: {
      primary: 'orange-600',
      gradient: 'from-orange-600 to-amber-600'
    },
    group: 'location-guides',
    featured: true,
    seoKeywords: ['Karachi property', 'real estate Karachi', 'Karachi housing'],
    relatedCategories: ['city-guide', 'area-guide', 'society-reviews']
  },

  'lahore': {
    slug: 'lahore',
    name: 'Lahore',
    description: 'Complete property guide to Lahore\'s established and emerging residential societies.',
    longDescription: 'Navigate Lahore\'s property landscape including DHA Lahore, Bahria Town, Gulberg, Model Town, and new developments. Cultural capital meets modern real estate opportunities.',
    icon: 'MapPin',
    emoji: '🕌',
    color: {
      primary: 'orange-600',
      gradient: 'from-amber-600 to-yellow-600'
    },
    group: 'location-guides',
    featured: true,
    seoKeywords: ['Lahore property', 'real estate Lahore', 'Lahore housing societies'],
    relatedCategories: ['city-guide', 'area-guide', 'society-reviews']
  },

  'islamabad': {
    slug: 'islamabad',
    name: 'Islamabad',
    description: 'Premium property markets in Pakistan\'s planned capital city and its zones.',
    longDescription: 'Discover Islamabad\'s sectors, DHA Islamabad, Bahria Town, and surrounding areas. Understand the master plan, sector development, and property appreciation in the federal capital.',
    icon: 'MapPin',
    emoji: '🏛️',
    color: {
      primary: 'orange-600',
      gradient: 'from-green-600 to-emerald-600'
    },
    group: 'location-guides',
    featured: true,
    seoKeywords: ['Islamabad property', 'real estate Islamabad', 'Islamabad sectors'],
    relatedCategories: ['rawalpindi', 'city-guide', 'area-guide']
  },

  'rawalpindi': {
    slug: 'rawalpindi',
    name: 'Rawalpindi',
    description: 'Property opportunities in the twin city with established and new housing schemes.',
    icon: 'MapPin',
    emoji: '🏘️',
    color: {
      primary: 'orange-600',
      gradient: 'from-teal-600 to-green-600'
    },
    group: 'location-guides',
    seoKeywords: ['Rawalpindi property', 'real estate Rawalpindi'],
    relatedCategories: ['islamabad', 'city-guide', 'area-guide']
  },

  'faisalabad': {
    slug: 'faisalabad',
    name: 'Faisalabad',
    description: 'Industrial hub property markets with growing residential and commercial sectors.',
    icon: 'MapPin',
    emoji: '🏭',
    color: {
      primary: 'orange-600',
      gradient: 'from-orange-600 to-red-600'
    },
    group: 'location-guides',
    seoKeywords: ['Faisalabad property', 'real estate Faisalabad'],
    relatedCategories: ['city-guide', 'commercial', 'area-guide']
  },

  'multan': {
    slug: 'multan',
    name: 'Multan',
    description: 'Heritage city property markets with modern developments and investment potential.',
    icon: 'MapPin',
    emoji: '🌆',
    color: {
      primary: 'orange-600',
      gradient: 'from-amber-600 to-orange-600'
    },
    group: 'location-guides',
    seoKeywords: ['Multan property', 'real estate Multan'],
    relatedCategories: ['city-guide', 'area-guide', 'new-projects']
  },

  'peshawar': {
    slug: 'peshawar',
    name: 'Peshawar',
    description: 'Property insights from Khyber Pakhtunkhwa\'s capital with emerging opportunities.',
    icon: 'MapPin',
    emoji: '⛰️',
    color: {
      primary: 'orange-600',
      gradient: 'from-yellow-600 to-amber-600'
    },
    group: 'location-guides',
    seoKeywords: ['Peshawar property', 'real estate Peshawar'],
    relatedCategories: ['city-guide', 'area-guide']
  },

  'quetta': {
    slug: 'quetta',
    name: 'Quetta',
    description: 'Property market overview of Balochistan\'s capital and development projects.',
    icon: 'MapPin',
    emoji: '🏔️',
    color: {
      primary: 'orange-600',
      gradient: 'from-stone-600 to-amber-600'
    },
    group: 'location-guides',
    seoKeywords: ['Quetta property', 'real estate Quetta'],
    relatedCategories: ['city-guide', 'area-guide']
  },

  'city-guide': {
    slug: 'city-guide',
    name: 'City Guide',
    description: 'Comprehensive city profiles with infrastructure, amenities, and property insights.',
    icon: 'Building2',
    emoji: '🌃',
    color: {
      primary: 'orange-600',
      gradient: 'from-blue-600 to-cyan-600'
    },
    group: 'location-guides',
    seoKeywords: ['city guide Pakistan', 'city property guide'],
    relatedCategories: ['area-guide', 'market-analysis']
  },

  'area-guide': {
    slug: 'area-guide',
    name: 'Area Guide',
    description: 'Detailed neighborhood and locality reviews with resident feedback and ratings.',
    icon: 'Map',
    emoji: '🗺️',
    color: {
      primary: 'orange-600',
      gradient: 'from-cyan-600 to-teal-600'
    },
    group: 'location-guides',
    seoKeywords: ['area guide', 'neighborhood review'],
    relatedCategories: ['city-guide', 'society-reviews']
  },

  'society-reviews': {
    slug: 'society-reviews',
    name: 'Society Reviews',
    description: 'In-depth reviews of housing societies covering facilities, development, and livability.',
    icon: 'Star',
    emoji: '⭐',
    color: {
      primary: 'orange-600',
      gradient: 'from-amber-600 to-orange-600'
    },
    group: 'location-guides',
    seoKeywords: ['society review', 'housing society Pakistan'],
    relatedCategories: ['area-guide', 'project-reviews']
  },

  // ============================================
  // PROJECTS & DEVELOPERS
  // ============================================
  'new-projects': {
    slug: 'new-projects',
    name: 'New Projects',
    description: 'Latest residential and commercial projects launching across Pakistan.',
    longDescription: 'Stay updated on newly launched housing societies, apartment complexes, and commercial developments. Get early access information, payment plans, and location advantages.',
    icon: 'Rocket',
    emoji: '🚀',
    color: {
      primary: 'yellow-600',
      gradient: 'from-yellow-600 to-orange-600'
    },
    group: 'projects-developers',
    featured: true,
    seoKeywords: ['new property projects', 'latest projects Pakistan'],
    relatedCategories: ['project-reviews', 'upcoming-projects', 'developer-news']
  },

  'project-reviews': {
    slug: 'project-reviews',
    name: 'Project Reviews',
    description: 'Unbiased reviews and analysis of ongoing and completed real estate projects.',
    icon: 'ClipboardCheck',
    emoji: '📝',
    color: {
      primary: 'yellow-600',
      gradient: 'from-amber-600 to-yellow-600'
    },
    group: 'projects-developers',
    seoKeywords: ['project review', 'society review', 'development review'],
    relatedCategories: ['society-reviews', 'new-projects', 'developer-news']
  },

  'developer-news': {
    slug: 'developer-news',
    name: 'Developer News',
    description: 'Updates on major developers, their projects, and corporate developments.',
    icon: 'Building',
    emoji: '🏢',
    color: {
      primary: 'yellow-600',
      gradient: 'from-orange-600 to-amber-600'
    },
    group: 'projects-developers',
    seoKeywords: ['developer news', 'real estate companies'],
    relatedCategories: ['new-projects', 'project-reviews']
  },

  'under-construction': {
    slug: 'under-construction',
    name: 'Under Construction',
    description: 'Progress updates and analysis of properties currently under development.',
    icon: 'HardHat',
    emoji: '👷',
    color: {
      primary: 'yellow-600',
      gradient: 'from-yellow-600 to-lime-600'
    },
    group: 'projects-developers',
    seoKeywords: ['under construction projects', 'development progress'],
    relatedCategories: ['new-projects', 'project-reviews']
  },

  'upcoming-projects': {
    slug: 'upcoming-projects',
    name: 'Upcoming Projects',
    description: 'Exclusive previews of projects planned for launch in the near future.',
    icon: 'CalendarClock',
    emoji: '📅',
    color: {
      primary: 'yellow-600',
      gradient: 'from-lime-600 to-green-600'
    },
    group: 'projects-developers',
    seoKeywords: ['upcoming projects', 'future developments'],
    relatedCategories: ['new-projects', 'developer-news']
  },

  // ============================================
  // PROPERTY TYPES
  // ============================================
  'apartments': {
    slug: 'apartments',
    name: 'Apartments',
    description: 'Apartment buying, renting, and investment guides for urban living.',
    longDescription: 'Everything about apartment living from studio flats to luxury penthouses. Maintenance, amenities, community living, and investment potential in vertical developments.',
    icon: 'Building2',
    emoji: '🏢',
    color: {
      primary: 'indigo-600',
      gradient: 'from-indigo-600 to-blue-600'
    },
    group: 'property-types',
    seoKeywords: ['apartments Pakistan', 'flat buying guide'],
    relatedCategories: ['penthouses', 'commercial', 'buying-guide']
  },

  'houses': {
    slug: 'houses',
    name: 'Houses',
    description: 'Complete guide to buying, building, and maintaining independent houses.',
    longDescription: 'From single-story bungalows to multi-story villas, explore house options across all budgets. Construction quality, design trends, and maintenance considerations.',
    icon: 'Home',
    emoji: '🏠',
    color: {
      primary: 'indigo-600',
      gradient: 'from-blue-600 to-indigo-600'
    },
    group: 'property-types',
    seoKeywords: ['houses for sale', 'buy house Pakistan'],
    relatedCategories: ['plots', 'buying-guide', 'architecture']
  },

  'plots': {
    slug: 'plots',
    name: 'Plots',
    description: 'Land investment strategies, plot selection, and development opportunities.',
    longDescription: 'Master the art of plot investment. Understand plot categories, sizes, locations, possession timelines, and appreciation potential in various housing schemes.',
    icon: 'SquareDashedBottom',
    emoji: '📐',
    color: {
      primary: 'indigo-600',
      gradient: 'from-green-600 to-teal-600'
    },
    group: 'property-types',
    seoKeywords: ['plots for sale', 'land investment', 'plot buying guide'],
    relatedCategories: ['houses', 'investment', 'new-projects']
  },

  'commercial': {
    slug: 'commercial',
    name: 'Commercial',
    description: 'Commercial property investment including offices, shops, and plazas.',
    longDescription: 'Navigate commercial real estate from retail spaces to corporate offices. Rental yields, location factors, tenant management, and commercial property financing.',
    icon: 'Store',
    emoji: '🏬',
    color: {
      primary: 'indigo-600',
      gradient: 'from-purple-600 to-indigo-600'
    },
    group: 'property-types',
    seoKeywords: ['commercial property', 'commercial real estate'],
    relatedCategories: ['offices', 'shops', 'investment']
  },

  'offices': {
    slug: 'offices',
    name: 'Offices',
    description: 'Office space selection, leasing, and investment for businesses.',
    icon: 'Briefcase',
    emoji: '💼',
    color: {
      primary: 'indigo-600',
      gradient: 'from-blue-600 to-cyan-600'
    },
    group: 'property-types',
    seoKeywords: ['office space', 'office for rent'],
    relatedCategories: ['commercial', 'shops']
  },

  'shops': {
    slug: 'shops',
    name: 'Shops',
    description: 'Retail space buying and leasing for business ventures.',
    icon: 'ShoppingBag',
    emoji: '🛍️',
    color: {
      primary: 'indigo-600',
      gradient: 'from-pink-600 to-purple-600'
    },
    group: 'property-types',
    seoKeywords: ['shop for sale', 'retail space'],
    relatedCategories: ['commercial', 'offices']
  },

  'farmhouses': {
    slug: 'farmhouses',
    name: 'Farmhouses',
    description: 'Luxury farmhouses and agricultural land investment opportunities.',
    icon: 'TreePine',
    emoji: '🌳',
    color: {
      primary: 'indigo-600',
      gradient: 'from-green-700 to-emerald-600'
    },
    group: 'property-types',
    seoKeywords: ['farmhouse for sale', 'agricultural land'],
    relatedCategories: ['plots', 'investment', 'lifestyle']
  },

  'penthouses': {
    slug: 'penthouses',
    name: 'Penthouses',
    description: 'Luxury penthouses with premium amenities and stunning views.',
    icon: 'Crown',
    emoji: '👑',
    color: {
      primary: 'indigo-600',
      gradient: 'from-amber-600 to-orange-600'
    },
    group: 'property-types',
    seoKeywords: ['penthouse for sale', 'luxury apartments'],
    relatedCategories: ['apartments', 'lifestyle', 'investment']
  },

  // ============================================
  // LIFESTYLE & LIVING
  // ============================================
  'lifestyle': {
    slug: 'lifestyle',
    name: 'Lifestyle',
    description: 'Enhance your living experience with lifestyle tips and home improvement ideas.',
    icon: 'Sparkles',
    emoji: '✨',
    color: {
      primary: 'pink-600',
      gradient: 'from-pink-600 to-rose-600'
    },
    group: 'lifestyle-living',
    seoKeywords: ['home lifestyle', 'property lifestyle'],
    relatedCategories: ['home-decor', 'interior-design', 'smart-homes']
  },

  'home-decor': {
    slug: 'home-decor',
    name: 'Home Decor',
    description: 'Creative decor ideas, trends, and budget-friendly styling tips.',
    icon: 'Palette',
    emoji: '🎨',
    color: {
      primary: 'pink-600',
      gradient: 'from-rose-600 to-pink-600'
    },
    group: 'lifestyle-living',
    seoKeywords: ['home decor ideas', 'interior decoration'],
    relatedCategories: ['interior-design', 'lifestyle', 'renovation']
  },

  'interior-design': {
    slug: 'interior-design',
    name: 'Interior Design',
    description: 'Professional interior design concepts and space planning solutions.',
    icon: 'PaintBucket',
    emoji: '🖌️',
    color: {
      primary: 'pink-600',
      gradient: 'from-purple-600 to-pink-600'
    },
    group: 'lifestyle-living',
    seoKeywords: ['interior design Pakistan', 'home design'],
    relatedCategories: ['home-decor', 'architecture', 'renovation']
  },

  'architecture': {
    slug: 'architecture',
    name: 'Architecture',
    description: 'Architectural styles, design principles, and modern construction techniques.',
    icon: 'Ruler',
    emoji: '📐',
    color: {
      primary: 'pink-600',
      gradient: 'from-indigo-600 to-purple-600'
    },
    group: 'lifestyle-living',
    seoKeywords: ['architecture Pakistan', 'house design'],
    relatedCategories: ['interior-design', 'houses', 'smart-homes']
  },

  'smart-homes': {
    slug: 'smart-homes',
    name: 'Smart Homes',
    description: 'Home automation, IoT devices, and smart technology integration.',
    icon: 'Smartphone',
    emoji: '📱',
    color: {
      primary: 'pink-600',
      gradient: 'from-blue-600 to-purple-600'
    },
    group: 'lifestyle-living',
    seoKeywords: ['smart home Pakistan', 'home automation'],
    relatedCategories: ['technology', 'architecture', 'lifestyle']
  },

  'renovation': {
    slug: 'renovation',
    name: 'Renovation',
    description: 'Home renovation projects, cost estimation, and contractor selection.',
    icon: 'Hammer',
    emoji: '🔨',
    color: {
      primary: 'pink-600',
      gradient: 'from-orange-600 to-amber-600'
    },
    group: 'lifestyle-living',
    seoKeywords: ['home renovation', 'house remodeling'],
    relatedCategories: ['maintenance', 'interior-design', 'architecture']
  },

  'maintenance': {
    slug: 'maintenance',
    name: 'Maintenance',
    description: 'Property maintenance tips, repair guides, and preventive care.',
    icon: 'Wrench',
    emoji: '🔧',
    color: {
      primary: 'pink-600',
      gradient: 'from-gray-600 to-slate-600'
    },
    group: 'lifestyle-living',
    seoKeywords: ['home maintenance', 'property care'],
    relatedCategories: ['renovation', 'how-to-guides', 'tips']
  },

  // ============================================
  // NEWS & UPDATES
  // ============================================
  'news': {
    slug: 'news',
    name: 'News',
    description: 'Breaking news and latest updates from Pakistan\'s real estate sector.',
    longDescription: 'Stay informed with real-time news on policy changes, market movements, major deals, regulatory updates, and industry developments affecting property markets.',
    icon: 'Newspaper',
    emoji: '📰',
    color: {
      primary: 'cyan-600',
      gradient: 'from-cyan-600 to-blue-600'
    },
    group: 'news-updates',
    featured: true,
    seoKeywords: ['real estate news Pakistan', 'property news'],
    relatedCategories: ['market-news', 'government-policies', 'market-trends']
  },

  'government-policies': {
    slug: 'government-policies',
    name: 'Government Policies',
    description: 'Analysis of government policies, regulations, and their impact on real estate.',
    icon: 'Landmark',
    emoji: '🏛️',
    color: {
      primary: 'cyan-600',
      gradient: 'from-blue-700 to-indigo-600'
    },
    group: 'news-updates',
    seoKeywords: ['government policy real estate', 'property regulations'],
    relatedCategories: ['news', 'legal', 'taxation']
  },

  'cpec-updates': {
    slug: 'cpec-updates',
    name: 'CPEC Updates',
    description: 'China-Pakistan Economic Corridor projects and their real estate implications.',
    icon: 'Route',
    emoji: '🛣️',
    color: {
      primary: 'cyan-600',
      gradient: 'from-red-600 to-yellow-600'
    },
    group: 'news-updates',
    seoKeywords: ['CPEC real estate', 'CPEC property impact'],
    relatedCategories: ['infrastructure', 'news', 'investment']
  },

  'infrastructure': {
    slug: 'infrastructure',
    name: 'Infrastructure',
    description: 'Infrastructure development projects and their impact on property values.',
    icon: 'Construction',
    emoji: '🏗️',
    color: {
      primary: 'cyan-600',
      gradient: 'from-orange-600 to-red-600'
    },
    group: 'news-updates',
    seoKeywords: ['infrastructure development', 'infrastructure projects Pakistan'],
    relatedCategories: ['cpec-updates', 'news', 'market-trends']
  },

  'economy': {
    slug: 'economy',
    name: 'Economy',
    description: 'Economic indicators and their correlation with real estate markets.',
    icon: 'TrendingUp',
    emoji: '📊',
    color: {
      primary: 'cyan-600',
      gradient: 'from-green-600 to-emerald-600'
    },
    group: 'news-updates',
    seoKeywords: ['economy and real estate', 'economic impact property'],
    relatedCategories: ['news', 'market-analysis', 'investment']
  },

  // ============================================
  // TIPS & ADVICE
  // ============================================
  'tips': {
    slug: 'tips',
    name: 'Tips',
    description: 'Practical tips and actionable advice for property buyers, sellers, and investors.',
    icon: 'Lightbulb',
    emoji: '💡',
    color: {
      primary: 'amber-600',
      gradient: 'from-amber-600 to-yellow-600'
    },
    group: 'tips-advice',
    featured: true,
    seoKeywords: ['property tips', 'real estate advice'],
    relatedCategories: ['expert-advice', 'how-to-guides', 'checklist']
  },

  'expert-advice': {
    slug: 'expert-advice',
    name: 'Expert Advice',
    description: 'Professional insights from real estate experts, lawyers, and consultants.',
    icon: 'UserCheck',
    emoji: '👨‍💼',
    color: {
      primary: 'amber-600',
      gradient: 'from-yellow-600 to-amber-600'
    },
    group: 'tips-advice',
    seoKeywords: ['expert advice property', 'professional guidance'],
    relatedCategories: ['tips', 'interview', 'opinion']
  },

  'how-to-guides': {
    slug: 'how-to-guides',
    name: 'How-To Guides',
    description: 'Step-by-step guides for common property-related tasks and procedures.',
    icon: 'BookOpenCheck',
    emoji: '📚',
    color: {
      primary: 'amber-600',
      gradient: 'from-orange-600 to-amber-600'
    },
    group: 'tips-advice',
    seoKeywords: ['how to buy property', 'property guide'],
    relatedCategories: ['tips', 'buying-guide', 'selling-guide']
  },

  'checklist': {
    slug: 'checklist',
    name: 'Checklist',
    description: 'Comprehensive checklists for property transactions and due diligence.',
    icon: 'ListChecks',
    emoji: '✅',
    color: {
      primary: 'amber-600',
      gradient: 'from-green-600 to-teal-600'
    },
    group: 'tips-advice',
    seoKeywords: ['property checklist', 'buying checklist'],
    relatedCategories: ['how-to-guides', 'documentation', 'verification']
  },

  'faqs': {
    slug: 'faqs',
    name: 'FAQs',
    description: 'Frequently asked questions about buying, selling, and investing in property.',
    icon: 'HelpCircle',
    emoji: '❓',
    color: {
      primary: 'amber-600',
      gradient: 'from-blue-600 to-cyan-600'
    },
    group: 'tips-advice',
    seoKeywords: ['property FAQs', 'real estate questions'],
    relatedCategories: ['tips', 'expert-advice', 'how-to-guides']
  },

  // ============================================
  // TECHNOLOGY
  // ============================================
  'technology': {
    slug: 'technology',
    name: 'Technology',
    description: 'How technology is transforming Pakistan\'s real estate industry.',
    icon: 'Cpu',
    emoji: '🚀',
    color: {
      primary: 'teal-600',
      gradient: 'from-teal-600 to-cyan-600'
    },
    group: 'technology',
    seoKeywords: ['real estate technology', 'PropTech Pakistan'],
    relatedCategories: ['proptech', 'smart-homes', 'virtual-tours']
  },

  'proptech': {
    slug: 'proptech',
    name: 'PropTech',
    description: 'Property technology innovations, startups, and digital solutions.',
    icon: 'Zap',
    emoji: '⚡',
    color: {
      primary: 'teal-600',
      gradient: 'from-cyan-600 to-blue-600'
    },
    group: 'technology',
    seoKeywords: ['PropTech', 'property technology'],
    relatedCategories: ['technology', 'online-transactions', 'virtual-tours']
  },

  'virtual-tours': {
    slug: 'virtual-tours',
    name: 'Virtual Tours',
    description: '3D tours, virtual reality, and digital property viewing technologies.',
    icon: 'Video',
    emoji: '📹',
    color: {
      primary: 'teal-600',
      gradient: 'from-purple-600 to-pink-600'
    },
    group: 'technology',
    seoKeywords: ['virtual property tour', '3D tour'],
    relatedCategories: ['proptech', 'technology']
  },

  'online-transactions': {
    slug: 'online-transactions',
    name: 'Online Transactions',
    description: 'Digital payment solutions and online property transaction platforms.',
    icon: 'CreditCard',
    emoji: '💳',
    color: {
      primary: 'teal-600',
      gradient: 'from-green-600 to-emerald-600'
    },
    group: 'technology',
    seoKeywords: ['online property transaction', 'digital payment property'],
    relatedCategories: ['proptech', 'technology', 'real-estate-finance']
  },

  // ============================================
  // GENERAL
  // ============================================
  'opinion': {
    slug: 'opinion',
    name: 'Opinion',
    description: 'Editorial opinions and thought leadership on real estate trends.',
    icon: 'MessageSquare',
    emoji: '💬',
    color: {
      primary: 'gray-600',
      gradient: 'from-gray-600 to-slate-600'
    },
    group: 'general',
    seoKeywords: ['real estate opinion', 'property editorial'],
    relatedCategories: ['expert-advice', 'news']
  },

  'interview': {
    slug: 'interview',
    name: 'Interview',
    description: 'Exclusive interviews with industry leaders, developers, and experts.',
    icon: 'Mic',
    emoji: '🎤',
    color: {
      primary: 'gray-600',
      gradient: 'from-blue-600 to-indigo-600'
    },
    group: 'general',
    seoKeywords: ['real estate interview', 'expert interview'],
    relatedCategories: ['expert-advice', 'opinion', 'developer-news']
  },

  'success-stories': {
    slug: 'success-stories',
    name: 'Success Stories',
    description: 'Inspiring real estate success stories from investors and homeowners.',
    icon: 'Trophy',
    emoji: '🏆',
    color: {
      primary: 'gray-600',
      gradient: 'from-yellow-600 to-amber-600'
    },
    group: 'general',
    seoKeywords: ['success story real estate', 'investment success'],
    relatedCategories: ['investment', 'interview', 'expert-advice']
  },

  'general': {
    slug: 'general',
    name: 'General',
    description: 'General real estate content and miscellaneous articles.',
    icon: 'FileText',
    emoji: '📝',
    color: {
      primary: 'gray-600',
      gradient: 'from-gray-600 to-gray-700'
    },
    group: 'general',
    seoKeywords: ['real estate articles', 'property content'],
    relatedCategories: ['opinion', 'news']
  }
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get metadata for a specific category by slug
 */
export function getCategoryMetadata(slug: string): CategoryMetadata | null {
  return CATEGORY_METADATA[slug] || null;
}

/**
 * Get group metadata by group slug
 */
export function getCategoryGroup(groupSlug: CategoryGroup): CategoryGroupMetadata {
  return CATEGORY_GROUPS[groupSlug];
}

/**
 * Get all featured categories
 */
export function getFeaturedCategories(): CategoryMetadata[] {
  return Object.values(CATEGORY_METADATA).filter(cat => cat.featured);
}

/**
 * Get all categories belonging to a specific group
 */
export function getCategoriesByGroup(groupSlug: CategoryGroup): CategoryMetadata[] {
  return Object.values(CATEGORY_METADATA).filter(cat => cat.group === groupSlug);
}

/**
 * Get all category groups with their metadata
 */
export function getAllCategoryGroups(): { slug: CategoryGroup; metadata: CategoryGroupMetadata }[] {
  return Object.entries(CATEGORY_GROUPS).map(([slug, metadata]) => ({
    slug: slug as CategoryGroup,
    metadata
  }));
}

/**
 * Get related categories for a given category
 */
export function getRelatedCategories(categorySlug: string, limit: number = 4): CategoryMetadata[] {
  const category = getCategoryMetadata(categorySlug);
  if (!category) return [];
  
  // Get explicitly related categories
  const related = category.relatedCategories
    ?.map(slug => getCategoryMetadata(slug))
    .filter((cat): cat is CategoryMetadata => cat !== null)
    .slice(0, limit) || [];
  
  // If not enough related categories, fill with same-group categories
  if (related.length < limit) {
    const sameGroup = getCategoriesByGroup(category.group)
      .filter(cat => cat.slug !== categorySlug && !related.find(r => r.slug === cat.slug))
      .slice(0, limit - related.length);
    
    related.push(...sameGroup);
  }
  
  return related;
}

/**
 * Search categories by query string
 */
export function searchCategories(query: string): CategoryMetadata[] {
  const lowerQuery = query.toLowerCase();
  return Object.values(CATEGORY_METADATA).filter(cat =>
    cat.name.toLowerCase().includes(lowerQuery) ||
    cat.description.toLowerCase().includes(lowerQuery) ||
    cat.seoKeywords?.some(keyword => keyword.toLowerCase().includes(lowerQuery))
  );
}

/**
 * Get all category slugs (useful for generating static paths)
 */
export function getAllCategorySlugs(): string[] {
  return Object.keys(CATEGORY_METADATA);
}

/**
 * Get all categories as an array
 */
export function getAllCategories(): CategoryMetadata[] {
  return Object.values(CATEGORY_METADATA);
}

// Export default for convenience
export default CATEGORY_METADATA;
