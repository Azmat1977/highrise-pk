import test from 'node:test';
import assert from 'node:assert/strict';
import { filterProperties, sortProperties, filterProjects } from './filterLogic.ts';
import type { Property, Project } from '../types/index.ts';

const sampleProperties: Property[] = [
  {
    id: 'prop-1',
    slug: '5-marla-modern-villa-dha-islamabad',
    title: '5 Marla Brand New Luxury Villa',
    purpose: 'buy',
    price: 28500000,
    priceFormatted: 'PKR 2.85 Crore',
    city: 'Islamabad',
    area: 'DHA Phase 2',
    address: 'Sector B, DHA Phase 2, Islamabad',
    category: 'house',
    categoryLabel: 'House',
    size: 5,
    sizeUnit: 'Marla',
    bedrooms: 3,
    bathrooms: 4,
    images: ['https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80'],
    description: 'Sample description',
    features: ['Solar Ready', 'Double Glazed Windows'],
    verificationStatus: 'verified-sample',
    verificationLabel: 'Sample Document Verified',
    verificationDetails: 'Verification scope: Sample registry check.',
    agent: {
      name: 'Farhan Tariq',
      phone: '+92 300 1234567',
      email: 'farhan@example.com',
      agency: 'Apex Real Estate',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'
    },
    publishedDate: '2026-03-01',
    sampleDisclaimer: 'Sample listing'
  },
  {
    id: 'prop-2',
    slug: '2-bed-apartment-gulberg-lahore',
    title: '2 Bed Modern Apartment in Gulberg III',
    purpose: 'rent',
    price: 95000,
    priceFormatted: 'PKR 95,000 / mo',
    city: 'Lahore',
    area: 'Gulberg III',
    address: 'Main Boulevard, Gulberg III, Lahore',
    category: 'apartment',
    categoryLabel: 'Apartment',
    size: 1250,
    sizeUnit: 'Sq. Ft.',
    bedrooms: 2,
    bathrooms: 2,
    images: ['https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80'],
    description: 'Sample description',
    features: ['Elevator', 'Covered Parking'],
    verificationStatus: 'basic-listing',
    verificationLabel: 'Standard Listing (Sample)',
    verificationDetails: 'Unverified sample data.',
    agent: {
      name: 'Zainab Malik',
      phone: '+92 321 7654321',
      email: 'zainab@example.com',
      agency: 'Crescent Realty',
      avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=200&q=80'
    },
    publishedDate: '2026-03-05',
    sampleDisclaimer: 'Sample listing'
  }
];

const sampleProjects: Project[] = [
  {
    id: 'proj-1',
    slug: 'the-centaurus-residences-ii',
    title: 'The Centaurus II Towers',
    developerId: 'dev-1',
    developerName: 'Apex Horizon Developers',
    city: 'Islamabad',
    location: 'F-8/G-8 Jinnah Avenue',
    category: 'mixed-use',
    categoryLabel: 'Mixed Use Development',
    status: 'under-construction',
    statusLabel: 'Under Construction',
    priceRange: {
      min: 18000000,
      max: 65000000,
      formatted: 'PKR 1.8 Cr - 6.5 Cr'
    },
    overview: 'Sample overview',
    description: 'Sample description',
    images: ['https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80'],
    milestones: [],
    amenities: [],
    unitTypes: [],
    nocStatus: 'CDA Approved (Sample)',
    featured: true,
    trending: true,
    highlighted: true,
    sampleDisclaimer: 'Sample data',
    nearbyFacilities: []
  },
  {
    id: 'proj-2',
    slug: 'gulberg-commercial-square',
    title: 'Gulberg Commercial Square',
    developerId: 'dev-2',
    developerName: 'Crescent Landmark Group',
    city: 'Lahore',
    location: 'Gulberg III, Lahore',
    category: 'commercial',
    categoryLabel: 'Commercial Mall & Offices',
    status: 'ready-to-move',
    statusLabel: 'Ready to Move',
    priceRange: {
      min: 9000000,
      max: 35000000,
      formatted: 'PKR 90 Lac - 3.5 Cr'
    },
    overview: 'Sample overview',
    description: 'Sample description',
    images: ['https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=80'],
    milestones: [],
    amenities: [],
    unitTypes: [],
    nocStatus: 'LDA Approved (Sample)',
    featured: false,
    trending: false,
    highlighted: false,
    sampleDisclaimer: 'Sample data',
    nearbyFacilities: []
  }
];

test('filterProperties respects Buy vs Rent separation', () => {
  const buyResults = filterProperties(sampleProperties, { purpose: 'buy' });
  assert.equal(buyResults.length, 1);
  assert.equal(buyResults[0].id, 'prop-1');

  const rentResults = filterProperties(sampleProperties, { purpose: 'rent' });
  assert.equal(rentResults.length, 1);
  assert.equal(rentResults[0].id, 'prop-2');
});

test('filterProperties filters by city and bedrooms correctly', () => {
  const lahoreResults = filterProperties(sampleProperties, { city: 'Lahore' });
  assert.equal(lahoreResults.length, 1);
  assert.equal(lahoreResults[0].city, 'Lahore');

  const threeBedResults = filterProperties(sampleProperties, { bedrooms: '3' });
  assert.equal(threeBedResults.length, 1);
  assert.equal(threeBedResults[0].bedrooms, 3);
});

test('sortProperties orders properties by price ascending and descending', () => {
  const asc = sortProperties(sampleProperties, 'price-asc');
  assert.equal(asc[0].price, 95000);

  const desc = sortProperties(sampleProperties, 'price-desc');
  assert.equal(desc[0].price, 28500000);
});

test('filterProjects filters by development status and NOC', () => {
  const underConstruction = filterProjects(sampleProjects, { status: 'under-construction' });
  assert.equal(underConstruction.length, 1);
  assert.equal(underConstruction[0].id, 'proj-1');

  const cdaApproved = filterProjects(sampleProjects, { noc: 'CDA' });
  assert.equal(cdaApproved.length, 1);
  assert.equal(cdaApproved[0].id, 'proj-1');
});
