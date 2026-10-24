import type { Property, Project, PropertyFilterState, ProjectFilterState } from '../types/index.ts';

export function filterProperties(
  properties: Property[],
  filters: Partial<PropertyFilterState>
): Property[] {
  return properties.filter((prop) => {
    // Purpose filter (Buy / Rent)
    if (filters.purpose && prop.purpose !== filters.purpose) {
      return false;
    }

    // City filter
    if (filters.city && filters.city !== 'All Cities' && filters.city !== '') {
      if (prop.city.toLowerCase() !== filters.city.toLowerCase()) {
        return false;
      }
    }

    // Area / Society filter
    if (filters.area && filters.area.trim() !== '') {
      const q = filters.area.toLowerCase().trim();
      const match =
        prop.area.toLowerCase().includes(q) ||
        prop.address.toLowerCase().includes(q) ||
        prop.title.toLowerCase().includes(q);
      if (!match) return false;
    }

    // Category filter
    if (filters.category && filters.category !== 'all' && filters.category !== '') {
      if (prop.category !== filters.category) {
        return false;
      }
    }

    // Min price
    if (filters.minPrice && filters.minPrice !== '') {
      const min = parseFloat(filters.minPrice);
      if (!isNaN(min) && prop.price < min) {
        return false;
      }
    }

    // Max price
    if (filters.maxPrice && filters.maxPrice !== '') {
      const max = parseFloat(filters.maxPrice);
      if (!isNaN(max) && prop.price > max) {
        return false;
      }
    }

    // Min size
    if (filters.minSize && filters.minSize !== '') {
      const minS = parseFloat(filters.minSize);
      if (!isNaN(minS) && prop.size < minS) {
        return false;
      }
    }

    // Max size
    if (filters.maxSize && filters.maxSize !== '') {
      const maxS = parseFloat(filters.maxSize);
      if (!isNaN(maxS) && prop.size > maxS) {
        return false;
      }
    }

    // Bedrooms
    if (filters.bedrooms && filters.bedrooms !== 'all' && filters.bedrooms !== '') {
      const reqBeds = parseInt(filters.bedrooms, 10);
      if (!isNaN(reqBeds)) {
        if (!prop.bedrooms || prop.bedrooms < reqBeds) {
          return false;
        }
      }
    }

    // Direct Owner Only
    if (filters.ownerOnly && !prop.isDirectOwner) {
      return false;
    }

    return true;
  });
}

export function sortProperties(
  properties: Property[],
  sortBy: PropertyFilterState['sortBy'] = 'relevance'
): Property[] {
  const cloned = [...properties];
  switch (sortBy) {
    case 'price-asc':
      return cloned.sort((a, b) => a.price - b.price);
    case 'price-desc':
      return cloned.sort((a, b) => b.price - a.price);
    case 'newest':
      return cloned.sort(
        (a, b) => new Date(b.publishedDate).getTime() - new Date(a.publishedDate).getTime()
      );
    case 'relevance':
    default:
      // Featured first, then verified, then date
      return cloned.sort((a, b) => {
        if (a.isFeatured && !b.isFeatured) return -1;
        if (!a.isFeatured && b.isFeatured) return 1;
        if (a.verificationStatus === 'verified-sample' && b.verificationStatus !== 'verified-sample') return -1;
        if (a.verificationStatus !== 'verified-sample' && b.verificationStatus === 'verified-sample') return 1;
        return 0;
      });
  }
}

export function filterProjects(
  projects: Project[],
  filters: Partial<ProjectFilterState>
): Project[] {
  return projects.filter((proj) => {
    // City filter
    if (filters.city && filters.city !== 'All Cities' && filters.city !== '') {
      if (proj.city.toLowerCase() !== filters.city.toLowerCase()) {
        return false;
      }
    }

    // Category filter
    if (filters.category && filters.category !== 'all' && filters.category !== '') {
      if (proj.category !== filters.category) {
        return false;
      }
    }

    // Status filter
    if (filters.status && filters.status !== 'all' && filters.status !== '') {
      if (proj.status !== filters.status) {
        return false;
      }
    }

    // NOC status filter
    if (filters.noc && filters.noc !== 'all' && filters.noc !== '') {
      if (!proj.nocStatus.toLowerCase().includes(filters.noc.toLowerCase())) {
        return false;
      }
    }

    // Budget range filter
    if (filters.budget && filters.budget !== 'all' && filters.budget !== '') {
      const budgetVal = parseFloat(filters.budget);
      if (!isNaN(budgetVal)) {
        if (proj.priceRange.min > budgetVal) {
          return false;
        }
      }
    }

    return true;
  });
}
