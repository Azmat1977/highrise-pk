// components/property/SimilarProperties.tsx

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Home } from 'lucide-react';
import PropertyCard from './property-card';

interface SimilarPropertiesProps {
  currentProperty: {
    _id: string;
    city?: string;
    propertyType?: string;
    listingType?: string;
  };
}

interface ApiProperty {
  _id: string;
  [key: string]: any;
}

const SimilarProperties: React.FC<SimilarPropertiesProps> = ({
  currentProperty,
}) => {
  const [properties, setProperties] = useState<ApiProperty[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!currentProperty?._id) return;

    // Need at least city or propertyType to make a meaningful “similar” query
    if (!currentProperty.city && !currentProperty.propertyType) return;

    const fetchSimilar = async () => {
      try {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams();
        params.set('page', '1');
        params.set('limit', '6');
        params.set('excludeId', currentProperty._id);

        if (currentProperty.city) {
          params.set('city', currentProperty.city);
        }
        if (currentProperty.propertyType) {
          params.set('propertyType', currentProperty.propertyType);
        }
        if (currentProperty.listingType) {
          params.set('listingType', currentProperty.listingType);
        }

        const res = await axios.get(`/api/properties?${params.toString()}`);
        const data = res.data;

        if (Array.isArray(data.properties)) {
          setProperties(data.properties);
        } else {
          setProperties([]);
        }
      } catch (err: any) {
        console.error('Error loading similar properties:', err);
        setError('Could not load similar properties.');
        setProperties([]);
      } finally {
        setLoading(false);
      }
    };

    fetchSimilar();
  }, [
    currentProperty?._id,
    currentProperty?.city,
    currentProperty?.propertyType,
    currentProperty?.listingType,
  ]);

  // Loading skeleton
  if (loading) {
    return (
      <div className="mt-6">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <Home className="w-5 h-5 text-gray-400" />
            <h2 className="text-lg font-semibold text-gray-800">
              Similar properties
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-56 bg-gray-100 rounded-2xl animate-pulse"
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // If nothing to show, just hide the section
  if (error || properties.length === 0) {
    return null;
  }

  return (
    <div className="mt-6">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 sm:p-6">
        <div className="flex items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2">
            <Home className="w-5 h-5 text-[#029bba]" />
            <h2 className="text-lg font-semibold text-gray-800">
              Similar properties
              {currentProperty.city && (
                <span className="text-sm font-normal text-gray-500">
                  {' '}
                  in {currentProperty.city}
                </span>
              )}
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {properties.map((p) => (
            <PropertyCard key={p._id} property={p} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default SimilarProperties;
