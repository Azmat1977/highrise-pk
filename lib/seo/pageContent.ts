export interface SeoContentData {
  title: string;
  description: string;
  heading: string;
  content: string[];
}

const PAGE_SEO_CONTENT: Record<string, SeoContentData> = {
  properties: {
    title: "Verified Properties in Pakistan | Buy, Rent & Installments",
    description: "Browse verified residential and commercial properties for sale, rent, and installments across Lahore, Karachi, Islamabad, and all major cities in Pakistan.",
    heading: "Pakistan's Trusted Real Estate Marketplace",
    content: [
      "Highrise.pk brings you verified property listings directly from trusted real estate agents, developers, and homeowners across Pakistan. Whether you are searching for luxury apartments in Islamabad, residential plots in Lahore's top housing societies, or commercial offices in Karachi, our platform offers transparent, secure, and up-to-date real estate options.",
      "Explore detailed payment plans, market price trends, high-resolution imagery, and verified documents to make informed investment and housing decisions."
    ],
  },
  projects: {
    title: "New Real Estate Projects & Housing Societies in Pakistan",
    description: "Discover upcoming and ongoing residential and commercial projects, housing societies, and apartment towers in Pakistan.",
    heading: "Major Real Estate Projects & Housing Schemes",
    content: [
      "Explore Pakistan's most anticipated housing societies, master-planned communities, and vertical developments. View official NOC status, development timelines, payment schedules, and available plot or apartment inventories."
    ],
  },
  agents: {
    title: "Verified Real Estate Agents & Brokers in Pakistan",
    description: "Connect with certified and verified real estate agents, property consultants, and brokerage firms across Pakistan.",
    heading: "Find Certified Real Estate Professionals",
    content: [
      "Work with verified real estate agents who have completed identity and license verification checks. Browse professional profiles, active listings, client reviews, and direct contact details."
    ],
  },
  developers: {
    title: "Top Property Developers & Builders in Pakistan",
    description: "Explore leading real estate developers and construction companies shaping Pakistan's skyline.",
    heading: "Verified Property Developers in Pakistan",
    content: [
      "Discover reliable real estate developers with proven track records of delivering high-quality residential communities, commercial plazas, and vertical tower projects."
    ],
  },
  societies: {
    title: "Approved Housing Societies & Communities in Pakistan",
    description: "Check NOC status, amenities, maps, and plots in approved housing societies across Pakistan.",
    heading: "Approved Housing Schemes & Societies",
    content: [
      "Browse RDA, LDA, CDA, and TMA approved housing societies. Review developer backgrounds, infrastructure readiness, security features, and community amenities."
    ],
  },
};

export function getPageSeoContent(pageKey: string): SeoContentData | null {
  return PAGE_SEO_CONTENT[pageKey] || null;
}
