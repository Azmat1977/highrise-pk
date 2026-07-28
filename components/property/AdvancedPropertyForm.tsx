// components/property/AdvancedPropertyForm.tsx

'use client';

import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import FullPaymentForm from './forms/FullPaymentForm';
import InstallmentPropertyForm from './forms/InstallmentPropertyForm';
import RentPropertyForm from './forms/RentPropertyForm';

type ListingType = 'full' | 'installment' | 'rent';

type ListingTypeOption = {
  key: ListingType;
  label: string;
  icon: string;
  description: string;
};

const BASE_OPTIONS: ListingTypeOption[] = [
  {
    key: 'full',
    label: 'Full Payment Sale Property',
    icon: '💰',
    description: 'One-time full payment sale',
  },
  {
    key: 'installment',
    label: 'Installment Property',
    icon: '📅',
    description: 'Payment plan with installments',
  },
  {
    key: 'rent',
    label: 'Rental Property',
    icon: '🏠',
    description: 'Property for rent',
  },
];

interface AdvancedPropertyFormProps {
  projectId?: string;
  projectCategory?: 'highrise' | 'society';
}

export default function AdvancedPropertyForm({
  projectId,
  projectCategory,
}: AdvancedPropertyFormProps) {
  const isProjectMode = Boolean(projectId);

  // Allowed listing types:
  // - Standalone: full, installment, rent (rent UI is "Coming Soon" for now)
  // - Project mode: full, installment only (no rent/project/unit to avoid confusion)
  const allowedOptions = useMemo(() => {
    if (isProjectMode) {
      return BASE_OPTIONS.filter((o) => o.key !== 'rent');
    }
    return BASE_OPTIONS;
  }, [isProjectMode]);

  const allowedKeys = useMemo(
    () => allowedOptions.map((o) => o.key),
    [allowedOptions]
  );

  const [selectedType, setSelectedType] = useState<ListingType>('full');

  // If mode changes (or query changes) and selectedType becomes invalid, force a safe default.
  useEffect(() => {
    if (!allowedKeys.includes(selectedType)) {
      setSelectedType('full');
    }
  }, [allowedKeys, selectedType]);

  const selectedDescription =
    allowedOptions.find((t) => t.key === selectedType)?.description || '';

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 bg-white rounded-xl shadow-lg mt-6 sm:mt-10">
      {/* Header */}
      <div className="text-center mb-8 px-2">
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-3">
          Add New Property
        </h2>

        {isProjectMode && (
          <p className="text-sm text-gray-600 mb-4">
            This property will be added under your selected project.
          </p>
        )}

        <div className="inline-block w-full sm:w-auto">
          <label className="block text-sm font-semibold text-gray-700 mb-2 text-center">
            Select Listing Type:
          </label>

          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value as ListingType)}
            className="w-full sm:w-80 max-w-full border border-gray-300 rounded-lg px-4 py-2.5 block mx-auto focus:outline-none focus:ring-4 focus:ring-[#007C8B]/20 focus:border-transparent transition text-gray-700"
          >
            {allowedOptions.map((type) => (
              <option key={type.key} value={type.key}>
                {type.icon} {type.label}
              </option>
            ))}
          </select>

          <p className="text-xs text-gray-500 mt-2 text-center">
            {selectedDescription}
          </p>
        </div>
      </div>

      {/* Animated Form Display */}
      <AnimatePresence mode="wait">
        <motion.div
          key={selectedType}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.4, ease: 'easeInOut' }}
        >
          {selectedType === 'full' && (
            <FullPaymentForm
              projectId={projectId}
              projectCategory={projectCategory}
            />
          )}

          {selectedType === 'installment' && (
            <InstallmentPropertyForm
              projectId={projectId}
              projectCategory={projectCategory}
            />
          )}
          {/* Rent is only selectable in standalone mode. */}
          {selectedType === 'rent' && !isProjectMode && (
            <RentPropertyForm
              projectId={projectId}
              projectCategory={projectCategory}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
