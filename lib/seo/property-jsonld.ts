// lib/seo/property-jsonld.ts

interface PropertyData {
  _id: string;
  title: string;
  description?: string;
  price: number;
  currency?: string;
  listingType?: 'full_payment' | 'rent' | 'installment';
  propertyType?: string;
  bedrooms?: number;
  bathrooms?: number;
  area?: number;
  areaUnit?: string;
  city?: string;
  location?: string;
  society?: string;
  images?: string[];
  createdAt?: string;
  isVerified?: boolean;
  agent?: {
    name: string;
    phone?: string;
    email?: string;
  };
}

export function generatePropertyJsonLd(property: PropertyData): string {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://highrise.pk';
  const propertyUrl = `${baseUrl}/property/${property._id}`;
  
  const imageUrls = property.images?.filter(Boolean).slice(0, 8) || [];
  
  const listingType = property.listingType === 'rent' ? 'https://schema.org/Rent' : 'https://schema.org/Sale';
  
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: property.title,
    description: property.description || `Property for ${property.listingType === 'rent' ? 'rent' : 'sale'} in ${property.city}`,
    image: imageUrls,
    url: propertyUrl,
    brand: {
      '@type': 'Brand',
      name: 'Highrise.pk',
    },
    offers: {
      '@type': 'Offer',
      price: property.price,
      priceCurrency: property.currency || 'PKR',
      availability: 'https://schema.org/InStock',
      url: propertyUrl,
      validFrom: property.createdAt || new Date().toISOString(),
    },
    ...(property.bedrooms && {
      numberOfRooms: property.bedrooms,
    }),
    ...(property.bathrooms && {
      numberOfBathroomsTotal: property.bathrooms,
    }),
    ...(property.area && {
      floorSize: {
        '@type': 'QuantitativeValue',
        value: property.area,
        unitCode: property.areaUnit === 'Sq.Ft.' ? 'FTK' : 'MTK',
        unitText: property.areaUnit || 'Square Feet',
      },
    }),
    ...(property.city && {
      address: {
        '@type': 'PostalAddress',
        addressLocality: property.city,
        addressRegion: property.location || property.city,
        addressCountry: 'PK',
      },
    }),
    ...(property.agent && {
      seller: {
        '@type': 'Person',
        name: property.agent.name,
        telephone: property.agent.phone,
        email: property.agent.email,
      },
    }),
    additionalProperty: [
      {
        '@type': 'PropertyValue',
        name: 'Property Type',
        value: property.propertyType || 'Residential',
      },
      {
        '@type': 'PropertyValue',
        name: 'Listing Type',
        value: property.listingType === 'rent' ? 'Rent' : 'Sale',
      },
      ...(property.isVerified
        ? [
            {
              '@type': 'PropertyValue',
              name: 'Verified',
              value: 'Yes',
            },
          ]
        : []),
    ],
  };

  return JSON.stringify(jsonLd);
}

export function generateRealEstateAgentJsonLd(agentData: {
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  logo?: string;
}): string {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'RealEstateAgent',
    name: agentData.name,
    ...(agentData.phone && { telephone: agentData.phone }),
    ...(agentData.email && { email: agentData.email }),
    ...(agentData.address && { address: agentData.address }),
    ...(agentData.logo && { logo: agentData.logo }),
    areaServed: {
      '@type': 'Country',
      name: 'Pakistan',
    },
  };

  return JSON.stringify(jsonLd);
}
