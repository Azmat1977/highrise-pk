import React, { useState } from 'react';
import { Card } from '../ui/card'; // ✅ Added missing import
import { Select } from '../ui/select';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Search } from 'lucide-react';

interface SearchBarProps {
  developers: string[];
  cities: string[];
  onSearch: (searchParams: any) => void;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  developers,
  cities,
  onSearch,
}) => {
  const [searchParams, setSearchParams] = useState({
    developer: '',
    city: '',
    priceMin: '',
    priceMax: '',
  });

  const handleSearch = () => {
    onSearch(searchParams);
  };

  return (
    <Card className="p-6 mb-8">
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <Select
            value={searchParams.developer}
            onChange={(e) =>
              setSearchParams({ ...searchParams, developer: e.target.value })
            }
            placeholder="Select Developer"
            options={[
              { value: '', label: 'All Developers' },
              ...developers.map((d) => ({ value: d, label: d })),
            ] as any}
          />
        </div>

        <div className="flex-1">
          <Input
            type="text"
            placeholder="City or Project Name"
            value={searchParams.city}
            onChange={(e) =>
              setSearchParams({ ...searchParams, city: e.target.value })
            }
          />
        </div>

        <div className="flex gap-2">
          <Input
            type="number"
            placeholder="Min Price"
            value={searchParams.priceMin}
            onChange={(e) =>
              setSearchParams({ ...searchParams, priceMin: e.target.value })
            }
            className="w-full md:w-32"
          />
          <span className="flex items-center text-gray-500">to</span>
          <Input
            type="number"
            placeholder="Max Price"
            value={searchParams.priceMax}
            onChange={(e) =>
              setSearchParams({ ...searchParams, priceMax: e.target.value })
            }
            className="w-full md:w-32"
          />
        </div>

        <Button variant="primary" onClick={handleSearch}>
          <Search className="w-5 h-5 mr-2" />
          Search
        </Button>
      </div>
    </Card>
  );
};
