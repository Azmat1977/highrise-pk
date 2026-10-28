'use client';

import { useState } from 'react';
import { useRouter } from 'next/router';
import { ChevronDown } from 'lucide-react';

const cities = ['Islamabad', 'Lahore', 'Karachi', 'Faisalabad', 'Rawalpindi', 'Multan', 'Peshawar'];

const propertyTypes = {
  Plots: ['Residential Plot', 'Commercial Plot', 'Farmhouse Plot', 'Industrial Plot'],
  Apartments: ['Studio Apartment', '1 Bed Apartment', '2 Bed Apartment', '3 Bed Apartment', '4 Bed Apartment', 'Penthouse'],
  'Houses & Villas': ['3 Marla House', '5 Marla House', '7 Marla House', '10 Marla House', '1 Kanal House', 'Farmhouse', 'Villa'],
  'Commercial Units': ['Shop', 'Office', 'Showroom', 'Food Court Unit'],
  'Builder/Developer Projects': ['Residential Project', 'Commercial Project', 'Mixed-use Project', 'Ongoing / Upcoming Projects'],
};

export default function AdvancedSearch() {
  const router = useRouter();

  const [location, setLocation] = useState('');
  const [isCityDropdown, setIsCityDropdown] = useState(false);

  const [mainCategory, setMainCategory] = useState('');
  const [subCategory, setSubCategory] = useState('');
  const [isTypeDropdown, setIsTypeDropdown] = useState(false);

  const [priceRange, setPriceRange] = useState<[number, number]>([4000000, 76500000]);

  const handleSearch = (e: any) => {
    e.preventDefault();
    router.push(
      `/properties?city=${location}&type=${subCategory}&price_min=${priceRange[0]}&price_max=${priceRange[1]}`
    );
  };

  return (
    <form
      onSubmit={handleSearch}
      className="w-full max-w-6xl backdrop-blur-sm bg-white/70 shadow-xl rounded-3xl px-6 py-4 flex flex-wrap md:flex-nowrap justify-between items-center gap-4"
    >
      {/* City Dropdown */}
      <div className="relative w-full md:w-[22%]">
        <div
          onClick={() => setIsCityDropdown(!isCityDropdown)}
          className="bg-white rounded-xl border px-4 py-3 cursor-pointer flex justify-between items-center"
        >
          <span>{location || 'Select City'}</span>
          <ChevronDown size={18} />
        </div>
        {isCityDropdown && (
          <ul className="absolute z-50 bg-white shadow-md rounded-xl mt-2 w-full max-h-60 overflow-y-auto text-left">
            {cities.map((city) => (
              <li
                key={city}
                onClick={() => {
                  setLocation(city);
                  setIsCityDropdown(false);
                }}
                className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-left"
              >
                {city}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Property Type Multi-level */}
      <div className="relative w-full md:w-[28%]">
        <div
          onClick={() => setIsTypeDropdown(!isTypeDropdown)}
          className="bg-white rounded-xl border px-4 py-3 cursor-pointer flex justify-between items-center"
        >
          <span>{subCategory || 'Property Type'}</span>
          <ChevronDown size={18} />
        </div>

        {isTypeDropdown && (
          <div className="absolute z-50 flex bg-white border mt-2 shadow-lg rounded-xl w-full max-h-[300px] overflow-hidden text-left">
            <div className="w-1/2 border-r overflow-y-auto">
              {Object.keys(propertyTypes).map((mainCategoryItem) => (
                <div
                  key={mainCategoryItem}
                  onMouseEnter={() => setMainCategory(mainCategoryItem)}
                  className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-left"
                >
                  {mainCategoryItem}
                </div>
              ))}
            </div>
            <div className="w-1/2 overflow-y-auto">
              {mainCategory &&
                propertyTypes[mainCategory as keyof typeof propertyTypes].map((sub) => (
                  <div
                    key={sub}
                    onClick={() => {
                      setSubCategory(sub);
                      setIsTypeDropdown(false);
                    }}
                    className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-left"
                  >
                    {sub}
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>

      {/* Price Range */}
      <div className="w-full md:w-[28%] flex flex-col gap-1">
        <input
          type="range"
          min={500000}
          max={100000000}
          step={500000}
          value={priceRange[0]}
          onChange={(e) => setPriceRange([+e.target.value, priceRange[1]])}
          className="range accent-[#029bba]"
        />
        <input
          type="range"
          min={500000}
          max={100000000}
          step={500000}
          value={priceRange[1]}
          onChange={(e) => setPriceRange([priceRange[0], +e.target.value])}
          className="range accent-[#029bba]"
        />
        <div className="text-sm text-gray-700 text-center font-medium">
          Rs. {Number(priceRange[0]).toLocaleString()} — Rs. {Number(priceRange[1]).toLocaleString()}
        </div>
      </div>

      {/* Search Button */}
      <button
        type="submit"
        className="w-full md:w-[16%] bg-gradient-to-r from-[#029bba] to-[#007196] hover:brightness-110 text-white font-semibold py-3 px-6 rounded-xl transition shadow-md text-center"
      >
        Find Properties
      </button>
    </form>
  );
}
