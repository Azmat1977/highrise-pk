// components/property/DynamicPropertyForm.tsx

'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home,
  MapPin,
  Ruler,
  Building2,
  DollarSign,
  Image as ImageIcon,
  FileText,
  CheckCircle,
  ChevronRight,
  ChevronLeft,
  User,
  Building,
  Briefcase,
  Users,
  Upload,
  X,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import FileUploader from '@/components/admin/FileUploader';
import GalleryUploader, { GalleryImage } from '@/components/admin/GalleryUploader';
import RichTextEditor from '@/components/admin/RichTextEditor';
import SuccessModal from '@/components/ui/SuccessModal';
import {
  DynamicPropertyFormData,
  initialDynamicPropertyFormData,
  UserRole,
  ListingType,
  PropertyCategory,
  USER_ROLE_OPTIONS,
  LISTING_TYPE_OPTIONS,
  PROPERTY_CATEGORY_OPTIONS,
  PROPERTY_TYPES,
  PROPERTY_TYPES_BY_CATEGORY,
  PROPERTY_SUBTYPES,
  CITIES,
  SOCIETIES,
  DEFAULT_SOCIETIES,
  AREA_UNITS,
  FURNISHED_OPTIONS,
  CONDITION_OPTIONS,
  FACING_OPTIONS,
  PARKING_OPTIONS,
  POSSESSION_STATUS_OPTIONS,
  OWNERSHIP_TYPE_OPTIONS,
  CONTACT_TIME_OPTIONS,
  AMENITIES_LIST,
  FLOOR_LOCATION_OPTIONS,
  SHOP_POSITION_OPTIONS,
  SUITABLE_FOR_OPTIONS,
  PREFERRED_TENANT_OPTIONS,
  AGREEMENT_TYPE_OPTIONS,
} from '@/types/property';

// ============================================
// FORM STEPS CONFIGURATION
// ============================================

interface FormStep {
  id: number;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
}

const FORM_STEPS: FormStep[] = [
  {
    id: 1,
    title: 'Role & Purpose',
    subtitle: 'Who are you and what do you want to do?',
    icon: <User className="w-6 h-6" />,
  },
  {
    id: 2,
    title: 'Location & Category',
    subtitle: 'Where is your property located?',
    icon: <MapPin className="w-6 h-6" />,
  },
  {
    id: 3,
    title: 'Property Details',
    subtitle: 'Tell us about your property',
    icon: <Building2 className="w-6 h-6" />,
  },
  {
    id: 4,
    title: 'Pricing & Payment',
    subtitle: 'Set your price and payment terms',
    icon: <DollarSign className="w-6 h-6" />,
  },
  {
    id: 5,
    title: 'Media & Description',
    subtitle: 'Add photos and describe your property',
    icon: <ImageIcon className="w-6 h-6" />,
  },
  {
    id: 6,
    title: 'Review & Submit',
    subtitle: 'Review your listing before submitting',
    icon: <CheckCircle className="w-6 h-6" />,
  },
];

// ============================================
// VALIDATION ERRORS TYPE
// ============================================

interface ValidationErrors {
  [key: string]: string;
}

// ============================================
// MAIN COMPONENT
// ============================================

export const DynamicPropertyForm: React.FC = () => {
  // ============================================
  // STATE MANAGEMENT
  // ============================================

  const [currentStep, setCurrentStep] = useState<number>(1);
  const [formData, setFormData] = useState<DynamicPropertyFormData>(
    initialDynamicPropertyFormData
  );
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([]);

  // 🚀 NEW: Feature Image & Gallery State
  const [featureImage, setFeatureImage] = useState<{ url: string; publicId: string } | null>(null);
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([]);

  // ============================================
  // DYNAMIC SOCIETIES (DB-driven) + fallback
  // ============================================

  const [societyOptions, setSocietyOptions] = useState<string[]>(DEFAULT_SOCIETIES);
  const [societyLoading, setSocietyLoading] = useState(false);

  useEffect(() => {
    const city = formData.city;

    if (!city) {
      setSocietyOptions(DEFAULT_SOCIETIES);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        setSocietyLoading(true);

        const res = await fetch(`/api/locations/societies?city=${encodeURIComponent(city)}`);
        const data = await res.json();

        const listFromDb = Array.isArray(data?.societies) ? data.societies : [];
        const fallback = SOCIETIES[city] || DEFAULT_SOCIETIES;

        if (!cancelled) setSocietyOptions(listFromDb.length ? listFromDb : fallback);
      } catch (e) {
        const fallback = SOCIETIES[city] || DEFAULT_SOCIETIES;
        if (!cancelled) setSocietyOptions(fallback);
      } finally {
        if (!cancelled) setSocietyLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [formData.city]);

  const availableSocieties = societyOptions;

  // ============================================
  // FORM HANDLERS
  // ============================================

  const handleInputChange = (
    field: keyof DynamicPropertyFormData,
    value: any
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    // Clear error for this field
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newImages = Array.from(files);
    const newPreviews: string[] = [];

    newImages.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        newPreviews.push(reader.result as string);
        if (newPreviews.length === newImages.length) {
          setImagePreviewUrls((prev) => [...prev, ...newPreviews]);
        }
      };
      reader.readAsDataURL(file);
    });

    setFormData((prev) => ({
      ...prev,
      images: [...prev.images, ...newImages],
    }));
  };

  const handleRemoveImage = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
    setImagePreviewUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAmenityToggle = (amenityId: string) => {
    setFormData((prev) => ({
      ...prev,
      amenities: prev.amenities.includes(amenityId)
        ? prev.amenities.filter((id) => id !== amenityId)
        : [...prev.amenities, amenityId],
    }));
  };

  const handleSuitableForToggle = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      suitableFor: prev.suitableFor.includes(id)
        ? prev.suitableFor.filter((item) => item !== id)
        : [...prev.suitableFor, id],
    }));
  };

  // ============================================
  // VALIDATION
  // ============================================

  const validateStep = (step: number): boolean => {
    const newErrors: ValidationErrors = {};

    switch (step) {
      case 1: // Role & Purpose
        if (!formData.userRole) {
          newErrors.userRole = 'Please select your role';
        }
        if (!formData.listingType) {
          newErrors.listingType = 'Please select listing type';
        }
        break;

      case 2: // Location & Category
        if (!formData.category) {
          newErrors.category = 'Please select property category';
        }
        if (!formData.propertyType) {
          newErrors.propertyType = 'Please select property type';
        }
        if (!formData.city) {
          newErrors.city = 'Please select city';
        }
        if (!formData.society && !formData.customSociety) {
          newErrors.society = 'Please select or enter society name';
        }
        break;

      case 3: // Property Details
        if (!formData.title || formData.title.length < 10) {
          newErrors.title = 'Title must be at least 10 characters';
        }
        if (!formData.area) {
          newErrors.area = 'Please enter property area';
        }

        // Category-specific validations
        if (formData.category === 'residential' && formData.propertyType !== 'Plot') {
          if (!formData.bedrooms) {
            newErrors.bedrooms = 'Please enter number of bedrooms';
          }
          if (!formData.bathrooms) {
            newErrors.bathrooms = 'Please enter number of bathrooms';
          }
        }

        if (formData.category === 'commercial') {
          if (!formData.floorLocation) {
            newErrors.floorLocation = 'Please select floor location';
          }
        }
        break;

      case 4: // Pricing & Payment
        if (formData.listingType === 'sell') {
          if (!formData.price || parseFloat(formData.price) <= 0) {
            newErrors.price = 'Please enter a valid price';
          }
        } else if (formData.listingType === 'rent') {
          if (!formData.monthlyRent || parseFloat(formData.monthlyRent) <= 0) {
            newErrors.monthlyRent = 'Please enter monthly rent';
          }

          // ✅ UPDATED: Security Deposit is PKR amount (must be > 0)
          const depositNum = Number((formData.securityDeposit || '').replace(/,/g, ''));
          if (!depositNum || depositNum <= 0) {
            newErrors.securityDeposit = 'Please enter security deposit amount (PKR)';
          }
        } else if (formData.listingType === 'installment') {
          if (!formData.installmentData.totalPrice) {
            newErrors.totalPrice = 'Please enter total price';
          }
          if (!formData.installmentData.bookingAmount) {
            newErrors.bookingAmount = 'Please enter booking amount';
          }
        }
        break;

      case 5: // Media & Description
        if (!formData.description || formData.description.length < 50) {
          newErrors.description = 'Description must be at least 50 characters';
        }
        // 🚀 NEW: Validate Feature Image
        if (!featureImage) {
          newErrors.featureImage = 'Please upload a cover photo';
        }
        // Gallery is optional but good to have
        if (galleryImages.length === 0 && formData.images.length === 0) {
          newErrors.gallery = 'Please upload at least one gallery image';
        }
        if (!formData.whatsappNumber) {
          newErrors.whatsappNumber = 'Please enter WhatsApp number';
        }
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ============================================
  // NAVIGATION
  // ============================================

  const handleNext = () => {
    if (validateStep(currentStep)) {
      if (currentStep < FORM_STEPS.length) {
        setCurrentStep(currentStep + 1);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleStepClick = (step: number) => {
    if (step < currentStep) {
      setCurrentStep(step);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // ============================================
  // FORM SUBMISSION
  // ============================================

  // 🚀 Success Modal State (add this BEFORE handleSubmit)
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [submittedProperty, setSubmittedProperty] = useState<{ id: string; title: string } | null>(null);

  const handleSubmit = async () => {
    if (!validateStep(5)) return;

    setIsSubmitting(true);

    try {
      // Prepare FormData
      const submitData = new FormData();

      // User & Listing Info
      submitData.append('listingType', formData.listingType === 'sell' ? 'full_payment' : formData.listingType);

      // Basic Info
      submitData.append('title', formData.title);
      submitData.append('propertyType', formData.propertyType);
      submitData.append('propertySubtype', formData.propertySubtype || '');
      submitData.append('propertyCategory', formData.category || 'residential');

      // Location
      submitData.append('city', formData.city);
      submitData.append('society', formData.society === 'Other' ? formData.customSociety : formData.society);
      submitData.append('phase', formData.phase || '');
      submitData.append('block', formData.block || '');
      submitData.append('streetNumber', formData.streetNumber || '');
      submitData.append('completeAddress', formData.completeAddress || '');

      // Size
      submitData.append('area', formData.area);
      submitData.append('unit', formData.unit);

      // ✅ Decide what this listing actually is (for clean payload + security)
      const isPlotLike =
        formData.propertyType === 'Plot' || formData.category === 'plot';

      const isResidential = formData.category === 'residential';
      const isCommercial = formData.category === 'commercial';

      // ✅ Common fields (safe for all)
      submitData.append('furnished', formData.furnished);
      submitData.append('condition', formData.condition);
      submitData.append('facing', formData.facing || '');
      submitData.append('parking', formData.parking);
      submitData.append('possessionStatus', formData.possessionStatus);
      submitData.append('ownershipType', formData.ownershipType);
      submitData.append('amenities', formData.amenities.join(','));

      // ✅ Residential (House/Apartment/Farmhouse etc) — but NOT Plot
      if (isResidential && !isPlotLike) {
        submitData.append('bedrooms', formData.bedrooms || '0');
        submitData.append('bathrooms', formData.bathrooms || '0');
        submitData.append('floors', formData.floors || '1');
        submitData.append('servantQuarter', String(formData.servantQuarter));
        submitData.append('basement', String(formData.basement));
      } else {
        // Not applicable → don't send these keys
      }

      // ✅ Commercial-only fields
      if (isCommercial) {
        submitData.append('floorLocation', formData.floorLocation || '');
        submitData.append('shopPosition', formData.shopPosition || '');
        submitData.append('shopFrontWidth', formData.shopFrontWidth || '');
        submitData.append('shopDepth', formData.shopDepth || '');
        submitData.append('hasMezzanine', String(formData.hasMezzanine));
        submitData.append('mezzanineArea', formData.mezzanineArea || '');
        submitData.append('suitableFor', formData.suitableFor.join(','));
      } else {
        // Not applicable → don't send commercial keys
      }

      // Pricing based on listing type
      if (formData.listingType === 'sell') {
        submitData.append('price', formData.price.replace(/,/g, ''));
        submitData.append('isNegotiable', String(formData.rentNegotiable));
      } else if (formData.listingType === 'rent') {
        // Monthly rent goes into main price field
        submitData.append('price', formData.monthlyRent.replace(/,/g, ''));
        submitData.append('isNegotiable', String(formData.rentNegotiable));

        // ✅ IMPORTANT: securityDeposit is PKR amount
        submitData.append('securityDeposit', (formData.securityDeposit || '').replace(/,/g, ''));

        // Advance rent (months) -> advanceMonths
        if (formData.advanceRent) {
          submitData.append('advanceMonths', formData.advanceRent);
        }

        // Minimum contract period (months) -> minimumStay + leaseDuration
        if (formData.minContractPeriod) {
          submitData.append('minimumStay', formData.minContractPeriod);
          submitData.append('leaseDuration', formData.minContractPeriod);
        }

        // Available from date
        if (formData.availableFrom) {
          submitData.append('availableFrom', formData.availableFrom);
        }

        // Negotiable flag
        submitData.append('rentNegotiable', String(formData.rentNegotiable));

        // Bills / utilities included
        submitData.append('billsIncluded', String(formData.utilitiesIncluded));

        // separate flags not in UI → keep same as utilitiesIncluded
        submitData.append('electricityIncluded', String(formData.utilitiesIncluded));
        submitData.append('gasIncluded', String(formData.utilitiesIncluded));
        submitData.append('waterIncluded', String(formData.utilitiesIncluded));
        submitData.append('internetIncluded', 'false');

        // Monthly maintenance charges (PKR)
        if (formData.maintenanceCharges) {
          submitData.append('maintenanceCharges', formData.maintenanceCharges.replace(/,/g, ''));
        }

        // Tenant preferences
        if (formData.petsAllowed !== undefined) {
          submitData.append('petsAllowed', String(formData.petsAllowed));
        }
        if (formData.smokingAllowed !== undefined) {
          submitData.append('smokingAllowed', String(formData.smokingAllowed));
        }

        // Preferred tenant map → familyOnly / bachelorsAllowed
        if (formData.preferredTenant) {
          const pt = formData.preferredTenant.toLowerCase();
          submitData.append('familyOnly', String(pt === 'family'));
          submitData.append(
            'bachelorsAllowed',
            String(pt === 'bachelors' || pt === 'any' || pt === 'both')
          );
        }
      } else if (formData.listingType === 'installment') {
        submitData.append('totalPrice', formData.installmentData.totalPrice?.replace(/,/g, '') || '');
        submitData.append('bookingAmount', formData.installmentData.bookingAmount?.replace(/,/g, '') || '');
        submitData.append('downPaymentAmount', formData.installmentData.downPaymentAmount?.replace(/,/g, '') || '');
        submitData.append('monthlyAmount', formData.installmentData.monthlyAmount?.replace(/,/g, '') || '');
        submitData.append('monthlyCount', formData.installmentData.monthlyCount || '');
        submitData.append('possessionAmount', formData.installmentData.possessionAmount?.replace(/,/g, '') || '');
        submitData.append('hasMonthlyInstallments', 'true');
      }

      // 🚀 Pre-uploaded Images (Feature Image + Gallery)
      const allImages: { url: string; public_id: string; isPrimary?: boolean; caption?: string; category?: string }[] = [];

      if (featureImage) {
        allImages.push({
          url: featureImage.url,
          public_id: featureImage.publicId,
          isPrimary: true,
        });
      }

      galleryImages.forEach((img) => {
        allImages.push({
          url: img.url,
          public_id: img.publicId,
          caption: img.caption || '',
          category: img.category || 'other',
          isPrimary: false,
        });
      });

      submitData.append('preUploadedImages', JSON.stringify(allImages));

      // Video & Description
      submitData.append('videoUrl', formData.videoUrl || '');
      submitData.append('description', formData.description);
      submitData.append('whatsappNumber', formData.whatsappNumber);
      submitData.append('contactTime', formData.contactTime);

      // API Call
      const response = await fetch('/api/properties/add', {
        method: 'POST',
        body: submitData,
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to submit property');
      }

      // Success!
      setSubmittedProperty({
        id: result.property?._id || result.property?.slug || '',
        title: formData.title,
      });
      setShowSuccessModal(true);

    } catch (error: any) {
      console.error('Submission error:', error);
      alert(error.message || 'Failed to submit property. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-5xl mx-auto px-4">
        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {FORM_STEPS.map((step, index) => (
              <React.Fragment key={step.id}>
                <div
                  className={`flex flex-col items-center cursor-pointer ${step.id <= currentStep ? 'opacity-100' : 'opacity-40'
                    }`}
                  onClick={() => handleStepClick(step.id)}
                >
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${step.id === currentStep
                        ? 'bg-[#029bba] text-white'
                        : step.id < currentStep
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-200 text-gray-500'
                      }`}
                  >
                    {step.id < currentStep ? (
                      <CheckCircle className="w-6 h-6" />
                    ) : (
                      step.icon
                    )}
                  </div>
                  <p className="mt-2 text-xs font-medium text-center hidden md:block">
                    {step.title}
                  </p>
                </div>
                {index < FORM_STEPS.length - 1 && (
                  <div
                    className={`flex-1 h-1 mx-2 ${step.id < currentStep ? 'bg-green-500' : 'bg-gray-200'
                      }`}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Form Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="bg-white rounded-lg shadow-lg p-8"
          >
            {/* Step Title */}
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                {FORM_STEPS[currentStep - 1].title}
              </h2>
              <p className="text-gray-600 mt-1">
                {FORM_STEPS[currentStep - 1].subtitle}
              </p>
            </div>

            {/* Step Content */}
            {currentStep === 1 && (
              <StepRoleAndPurpose
                formData={formData}
                errors={errors}
                onChange={handleInputChange}
              />
            )}

            {currentStep === 2 && (
              <StepLocationAndCategory
                formData={formData}
                errors={errors}
                onChange={handleInputChange}
                availableSocieties={availableSocieties}
                societyLoading={societyLoading}
              />
            )}

            {currentStep === 3 && (
              <StepPropertyDetails
                formData={formData}
                errors={errors}
                onChange={handleInputChange}
                onAmenityToggle={handleAmenityToggle}
                onSuitableForToggle={handleSuitableForToggle}
              />
            )}

            {currentStep === 4 && (
              <StepPricingAndPayment
                formData={formData}
                errors={errors}
                onChange={handleInputChange}
              />
            )}

            {currentStep === 5 && (
              <StepMediaAndDescription
                formData={formData}
                errors={errors}
                onChange={handleInputChange}
                onImageUpload={handleImageUpload}
                onRemoveImage={handleRemoveImage}
                imagePreviewUrls={imagePreviewUrls}
                featureImage={featureImage}
                onFeatureImageChange={setFeatureImage}
                galleryImages={galleryImages}
                onGalleryChange={setGalleryImages}
              />
            )}

            {currentStep === 6 && (
              <StepReviewAndSubmit
                formData={formData}
              />
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between mt-8 pt-6 border-t">
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={currentStep === 1}
                className="flex items-center"
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Previous
              </Button>

              {currentStep < FORM_STEPS.length ? (
                <Button
                  variant="primary"
                  onClick={handleNext}
                  className="flex items-center"
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button
                  variant="primary"
                  onClick={handleSubmit}
                  loading={isSubmitting}
                  disabled={isSubmitting}
                >
                  Submit Property
                </Button>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Success Modal */}
      <SuccessModal
        isOpen={showSuccessModal}
        onClose={() => {
          setShowSuccessModal(false);
          setFormData(initialDynamicPropertyFormData);
          setFeatureImage(null);
          setGalleryImages([]);
          setCurrentStep(1);
        }}
        propertyId={submittedProperty?.id}
        propertyTitle={submittedProperty?.title}
      />
    </div>
  );
};

// ============================================
// STEP 1: ROLE & PURPOSE
// ============================================

interface StepProps {
  formData: DynamicPropertyFormData;
  errors: ValidationErrors;
  onChange: (field: keyof DynamicPropertyFormData, value: any) => void;
}

const StepRoleAndPurpose: React.FC<StepProps> = ({
  formData,
  errors,
  onChange,
}) => {
  return (
    <div className="space-y-8">
      {/* User Role Selection */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Who are you?
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {USER_ROLE_OPTIONS.map((role) => (
            <div
              key={role.value}
              onClick={() => onChange('userRole', role.value)}
              className={`
                relative p-6 border-2 rounded-lg cursor-pointer transition-all
                ${formData.userRole === role.value
                  ? 'border-[#029bba] bg-[#029bba]/5'
                  : 'border-gray-200 hover:border-[#029bba]/50'
                }
              `}
            >
              <div className="flex items-start space-x-4">
                <div className="text-3xl">{role.icon}</div>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900">{role.label}</h4>
                  <p className="text-sm text-gray-600 mt-1">
                    {role.description}
                  </p>
                </div>
                {formData.userRole === role.value && (
                  <CheckCircle className="w-6 h-6 text-[#029bba]" />
                )}
              </div>
            </div>
          ))}
        </div>
        {errors.userRole && (
          <p className="mt-2 text-sm text-red-600">{errors.userRole}</p>
        )}
      </div>

      {/* Listing Type Selection */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          What do you want to do?
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {LISTING_TYPE_OPTIONS.map((type) => (
            <div
              key={type.value}
              onClick={() => onChange('listingType', type.value)}
              className={`
                relative p-6 border-2 rounded-lg cursor-pointer transition-all
                ${formData.listingType === type.value
                  ? 'border-[#029bba] bg-[#029bba]/5'
                  : 'border-gray-200 hover:border-[#029bba]/50'
                }
              `}
            >
              <div className="text-center">
                <div className="text-4xl mb-3">{type.icon}</div>
                <h4 className="font-semibold text-gray-900">{type.label}</h4>
                <p className="text-sm text-gray-600 mt-1">
                  {type.description}
                </p>
                {formData.listingType === type.value && (
                  <CheckCircle className="w-6 h-6 text-[#029bba] mx-auto mt-3" />
                )}
              </div>
            </div>
          ))}
        </div>
        {errors.listingType && (
          <p className="mt-2 text-sm text-red-600">{errors.listingType}</p>
        )}
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <div className="text-blue-600 mt-0.5">ℹ️</div>
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">Why do we ask this?</p>
            <p>
              Your role and listing type help us show you the most relevant fields
              and provide accurate information to potential buyers/renters.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================
// STEP 2: LOCATION & CATEGORY
// ============================================

interface StepLocationProps extends StepProps {
  availableSocieties: readonly string[];
  societyLoading: boolean;
}

const StepLocationAndCategory: React.FC<StepLocationProps> = ({
  formData,
  errors,
  onChange,
  availableSocieties,
  societyLoading,
}) => {
  const [showCustomSociety, setShowCustomSociety] = useState(false);

  useEffect(() => {
    setShowCustomSociety(formData.society === 'Other');
  }, [formData.society]);

  return (
    <div className="space-y-8">
      {/* Property Category */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Property Category
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {PROPERTY_CATEGORY_OPTIONS.map((category) => (
            <div
              key={category.value}
              onClick={() => {
                onChange('category', category.value);
                // Reset property type when category changes
                onChange('propertyType', '');
              }}
              className={`
                relative p-4 border-2 rounded-lg cursor-pointer transition-all
                ${formData.category === category.value
                  ? 'border-[#029bba] bg-[#029bba]/5'
                  : 'border-gray-200 hover:border-[#029bba]/50'
                }
              `}
            >
              <div className="text-center">
                <div className="text-3xl mb-2">{category.icon}</div>
                <h4 className="font-semibold text-sm text-gray-900">
                  {category.label}
                </h4>
                <p className="text-xs text-gray-600 mt-1">
                  {category.description}
                </p>
              </div>
            </div>
          ))}
        </div>
        {errors.category && (
          <p className="mt-2 text-sm text-red-600">{errors.category}</p>
        )}
      </div>

      {/* Property Type (Dynamic based on category) */}
      {formData.category && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Select
            label="Property Type"
            value={formData.propertyType}
            onChange={(e) => {
              onChange('propertyType', e.target.value);
              onChange('propertySubtype', ''); // Reset subtype
            }}
            options={(PROPERTY_TYPES_BY_CATEGORY[formData.category] || PROPERTY_TYPES).map((type) => ({
              value: type,
              label: type,
            }))}
            placeholder="Select property type"
            error={errors.propertyType}
          />

          {formData.propertyType && PROPERTY_SUBTYPES[formData.propertyType] && (
            <Select
              label="Property Subtype"
              value={formData.propertySubtype}
              onChange={(e) => onChange('propertySubtype', e.target.value)}
              options={PROPERTY_SUBTYPES[formData.propertyType].map((subtype) => ({
                value: subtype,
                label: subtype,
              }))}
              placeholder="Select subtype (optional)"
            />
          )}
        </div>
      )}

      {/* Location Details */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Location Details
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Select
            label="City *"
            value={formData.city}
            onChange={(e) => {
              onChange('city', e.target.value);
              onChange('society', ''); // Reset society when city changes
            }}
            options={CITIES.map((city) => ({
              value: city,
              label: city,
            }))}
            placeholder="Select city"
            error={errors.city}
          />

          <Select
            label="Society / Area *"
            value={formData.society}
            onChange={(e) => {
              onChange('society', e.target.value);
              if (e.target.value !== 'Other') {
                onChange('customSociety', '');
              }
            }}
            options={availableSocieties.map((society) => ({
              value: society,
              label: society,
            }))}
            placeholder="Select society"
            error={errors.society}
            disabled={!formData.city}
          />

          {societyLoading && (
            <p className="text-sm text-gray-500 -mt-4">Loading societies…</p>
          )}

          <button
            type="button"
            className="text-sm text-[#029bba] underline text-left -mt-2"
            onClick={() => onChange("society", "Other")}
            disabled={!formData.city}
          >
            Society not in list? Click here to add manually
          </button>

          {showCustomSociety && (
            <Input
              label="Enter Society Name"
              value={formData.customSociety}
              onChange={(e) => onChange('customSociety', e.target.value)}
              placeholder="Enter society name"
              error={errors.customSociety}
            />
          )}

          <Input
            label="Phase (Optional)"
            value={formData.phase}
            onChange={(e) => onChange('phase', e.target.value)}
            placeholder="e.g., Phase 8"
          />

          <Input
            label="Block (Optional)"
            value={formData.block}
            onChange={(e) => onChange('block', e.target.value)}
            placeholder="e.g., Block A"
          />

          <Input
            label="Street Number (Optional)"
            value={formData.streetNumber}
            onChange={(e) => onChange('streetNumber', e.target.value)}
            placeholder="e.g., Street 12"
          />
        </div>

        <div className="mt-4">
          <Input
            label="Complete Address (Optional)"
            value={formData.completeAddress}
            onChange={(e) => onChange('completeAddress', e.target.value)}
            placeholder="Enter full address for better visibility"
          />
        </div>
      </div>
    </div>
  );
};

// ============================================
// STEP 3: PROPERTY DETAILS
// ============================================

interface StepPropertyDetailsProps extends StepProps {
  onAmenityToggle: (amenityId: string) => void;
  onSuitableForToggle: (id: string) => void;
}

const StepPropertyDetails: React.FC<StepPropertyDetailsProps> = ({
  formData,
  errors,
  onChange,
  onAmenityToggle,
  onSuitableForToggle,
}) => {
  return (
    <div className="space-y-8">
      {/* Property Title */}
      <div>
        <Input
          label="Property Title *"
          value={formData.title}
          onChange={(e) => onChange('title', e.target.value)}
          placeholder="e.g., 10 Marla House for Sale in DHA Phase 5"
          error={errors.title}
        />
        <p className="text-sm text-gray-500 mt-1">
          {formData.title.length}/100 characters (minimum 10)
        </p>
      </div>

      {/* Size & Area */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Size & Measurements
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input
            label="Total Area *"
            type="number"
            value={formData.area}
            onChange={(e) => onChange('area', e.target.value)}
            placeholder="e.g., 10"
            error={errors.area}
          />

          <Select
            label="Unit *"
            value={formData.unit}
            onChange={(e) => onChange('unit', e.target.value)}
            options={AREA_UNITS.map((unit) => ({
              value: unit,
              label: unit,
            }))}
          />
        </div>
      </div>

      {/* Residential Property Fields */}
      {formData.category === 'residential' && formData.propertyType !== 'Plot' && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Property Features
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Input
              label="Bedrooms *"
              type="number"
              value={formData.bedrooms}
              onChange={(e) => onChange('bedrooms', e.target.value)}
              placeholder="e.g., 3"
              error={errors.bedrooms}
            />

            <Input
              label="Bathrooms *"
              type="number"
              value={formData.bathrooms}
              onChange={(e) => onChange('bathrooms', e.target.value)}
              placeholder="e.g., 4"
              error={errors.bathrooms}
            />

            <Input
              label="Floors"
              type="number"
              value={formData.floors}
              onChange={(e) => onChange('floors', e.target.value)}
              placeholder="e.g., 2"
            />
          </div>

          {/* Additional Features */}
          <div className="mt-6 grid grid-cols-2 md:grid-cols-3 gap-4">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.servantQuarter}
                onChange={(e) => onChange('servantQuarter', e.target.checked)}
                className="w-4 h-4 text-[#029bba] border-gray-300 rounded focus:ring-[#029bba]"
              />
              <span className="text-sm text-gray-700">Servant Quarter</span>
            </label>

            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.basement}
                onChange={(e) => onChange('basement', e.target.checked)}
                className="w-4 h-4 text-[#029bba] border-gray-300 rounded focus:ring-[#029bba]"
              />
              <span className="text-sm text-gray-700">Basement</span>
            </label>
          </div>
        </div>
      )}

      {/* Commercial Property Fields */}
      {formData.category === 'commercial' && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Commercial Details
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Select
              label="Floor Location *"
              value={formData.floorLocation}
              onChange={(e) => onChange('floorLocation', e.target.value)}
              options={FLOOR_LOCATION_OPTIONS as any}
              error={errors.floorLocation}
            />

            <Select
              label="Shop Position"
              value={formData.shopPosition}
              onChange={(e) => onChange('shopPosition', e.target.value)}
              options={SHOP_POSITION_OPTIONS as any}
            />

            <Input
              label="Front Width (ft)"
              type="number"
              value={formData.shopFrontWidth}
              onChange={(e) => onChange('shopFrontWidth', e.target.value)}
              placeholder="e.g., 20"
            />

            <Input
              label="Depth (ft)"
              type="number"
              value={formData.shopDepth}
              onChange={(e) => onChange('shopDepth', e.target.value)}
              placeholder="e.g., 30"
            />
          </div>

          {/* Suitable For */}
          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Suitable For
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {SUITABLE_FOR_OPTIONS.map((option) => (
                <label
                  key={option.id}
                  className="flex items-center space-x-2 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={formData.suitableFor.includes(option.id)}
                    onChange={() => onSuitableForToggle(option.id)}
                    className="w-4 h-4 text-[#029bba] border-gray-300 rounded focus:ring-[#029bba]"
                  />
                  <span className="text-sm text-gray-700">{option.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Mezzanine */}
          <div className="mt-6">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.hasMezzanine}
                onChange={(e) => onChange('hasMezzanine', e.target.checked)}
                className="w-4 h-4 text-[#029bba] border-gray-300 rounded focus:ring-[#029bba]"
              />
              <span className="text-sm font-medium text-gray-700">Has Mezzanine Floor</span>
            </label>

            {formData.hasMezzanine && (
              <div className="mt-3">
                <Input
                  label="Mezzanine Area (sq ft)"
                  type="number"
                  value={formData.mezzanineArea}
                  onChange={(e) => onChange('mezzanineArea', e.target.value)}
                  placeholder="e.g., 200"
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* General Features */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Property Condition & Features
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Select
            label="Furnished Status"
            value={formData.furnished}
            onChange={(e) => onChange('furnished', e.target.value)}
            options={FURNISHED_OPTIONS as any}
          />

          <Select
            label="Property Condition"
            value={formData.condition}
            onChange={(e) => onChange('condition', e.target.value)}
            options={CONDITION_OPTIONS as any}
          />

          <Select
            label="Facing Direction"
            value={formData.facing}
            onChange={(e) => onChange('facing', e.target.value)}
            options={FACING_OPTIONS as any}
          />

          <Select
            label="Parking Spaces"
            value={formData.parking}
            onChange={(e) => onChange('parking', e.target.value)}
            options={PARKING_OPTIONS as any}
          />

          <Select
            label="Possession Status"
            value={formData.possessionStatus}
            onChange={(e) => onChange('possessionStatus', e.target.value)}
            options={POSSESSION_STATUS_OPTIONS as any}
          />

          <Select
            label="Ownership Type"
            value={formData.ownershipType}
            onChange={(e) => onChange('ownershipType', e.target.value)}
            options={OWNERSHIP_TYPE_OPTIONS as any}
          />
        </div>
      </div>

      {/* Amenities */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Amenities & Facilities
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {AMENITIES_LIST.map((amenity) => (
            <label
              key={amenity.id}
              className="flex items-center space-x-2 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={formData.amenities.includes(amenity.id)}
                onChange={() => onAmenityToggle(amenity.id)}
                className="w-4 h-4 text-[#029bba] border-gray-300 rounded focus:ring-[#029bba]"
              />
              <span className="text-sm text-gray-700">{amenity.label}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
};

// ============================================
// STEP 4: PRICING & PAYMENT
// ============================================

const StepPricingAndPayment: React.FC<StepProps> = ({
  formData,
  errors,
  onChange,
}) => {
  // Format number with commas
  const formatPrice = (value: string): string => {
    const num = (value || '').replace(/\D/g, '');
    return num.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  const handlePriceChange = (field: string, value: string) => {
    const numericValue = value.replace(/,/g, '');
    onChange(field as keyof DynamicPropertyFormData, numericValue);
  };

  return (
    <div className="space-y-8">
      {/* SELL - Full Payment */}
      {formData.listingType === 'sell' && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Sale Price
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Input
                label="Total Price (PKR) *"
                type="text"
                value={formatPrice(formData.price)}
                onChange={(e) => handlePriceChange('price', e.target.value)}
                placeholder="e.g., 25,000,000"
                error={errors.price}
              />
              {formData.price && (
                <p className="text-sm text-gray-600 mt-1">
                  Price: {formatPrice(formData.price)} PKR
                  {formData.area && (
                    <>
                      {' '}
                      (
                      {Math.round(
                        parseFloat(formData.price.replace(/,/g, '')) /
                        parseFloat(formData.area)
                      ).toLocaleString()}{' '}
                      PKR per {formData.unit})
                    </>
                  )}
                </p>
              )}
            </div>

            <div className="flex items-center">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.rentNegotiable}
                  onChange={(e) => onChange('rentNegotiable', e.target.checked)}
                  className="w-4 h-4 text-[#029bba] border-gray-300 rounded focus:ring-[#029bba]"
                />
                <span className="text-sm text-gray-700">Price is Negotiable</span>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* RENT - Monthly Rental */}
      {formData.listingType === 'rent' && (
        <div className="space-y-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Rental Details
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              label="Monthly Rent (PKR) *"
              type="text"
              value={formatPrice(formData.monthlyRent)}
              onChange={(e) => handlePriceChange('monthlyRent', e.target.value)}
              placeholder="e.g., 50,000"
              error={errors.monthlyRent}
            />

            {/* ✅ UPDATED: Security Deposit = PKR amount */}
            <Input
              label="Security Deposit (PKR) *"
              type="text"
              value={formatPrice(formData.securityDeposit)}
              onChange={(e) => handlePriceChange('securityDeposit', e.target.value)}
              placeholder="e.g., 150,000"
              error={errors.securityDeposit}
            />

            <Input
              label="Advance Rent (months)"
              type="number"
              value={formData.advanceRent}
              onChange={(e) => onChange('advanceRent', e.target.value)}
              placeholder="e.g., 1"
            />

            <Input
              label="Minimum Contract Period (months)"
              type="number"
              value={formData.minContractPeriod}
              onChange={(e) => onChange('minContractPeriod', e.target.value)}
              placeholder="e.g., 12"
            />

            <Input
              label="Annual Increment (%)"
              type="number"
              value={formData.incrementPerYear}
              onChange={(e) => onChange('incrementPerYear', e.target.value)}
              placeholder="e.g., 10"
            />

            <Input
              label="Maintenance Charges (PKR/month)"
              type="text"
              value={formatPrice(formData.maintenanceCharges)}
              onChange={(e) => handlePriceChange('maintenanceCharges', e.target.value)}
              placeholder="e.g., 2,000"
            />
          </div>

          {/* Additional Options */}
          <div className="space-y-4">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.maintenanceIncluded}
                onChange={(e) => onChange('maintenanceIncluded', e.target.checked)}
                className="w-4 h-4 text-[#029bba] border-gray-300 rounded focus:ring-[#029bba]"
              />
              <span className="text-sm text-gray-700">
                Maintenance charges included in rent
              </span>
            </label>

            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.utilitiesIncluded}
                onChange={(e) => onChange('utilitiesIncluded', e.target.checked)}
                className="w-4 h-4 text-[#029bba] border-gray-300 rounded focus:ring-[#029bba]"
              />
              <span className="text-sm text-gray-700">
                Utilities (gas, electricity, water) included
              </span>
            </label>

            {formData.utilitiesIncluded && (
              <Input
                label="Utilities Details"
                value={formData.utilitiesDetails}
                onChange={(e) => onChange('utilitiesDetails', e.target.value)}
                placeholder="Specify which utilities are included"
              />
            )}

            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.rentNegotiable}
                onChange={(e) => onChange('rentNegotiable', e.target.checked)}
                className="w-4 h-4 text-[#029bba] border-gray-300 rounded focus:ring-[#029bba]"
              />
              <span className="text-sm text-gray-700">Rent is Negotiable</span>
            </label>
          </div>

          {/* Availability */}
          <div>
            <h4 className="text-md font-semibold text-gray-900 mb-3">
              Availability
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="Available From"
                type="date"
                value={formData.availableFrom}
                onChange={(e) => onChange('availableFrom', e.target.value)}
              />

              <div className="flex items-center">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.immediateAvailable}
                    onChange={(e) => onChange('immediateAvailable', e.target.checked)}
                    className="w-4 h-4 text-[#029bba] border-gray-300 rounded focus:ring-[#029bba]"
                  />
                  <span className="text-sm text-gray-700">
                    Available Immediately
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* Tenant Preferences */}
          <div>
            <h4 className="text-md font-semibold text-gray-900 mb-3">
              Tenant Preferences
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Select
                label="Preferred Tenant Type"
                value={formData.preferredTenant}
                onChange={(e) => onChange('preferredTenant', e.target.value)}
                options={PREFERRED_TENANT_OPTIONS as any}
              />

              <Input
                label="Maximum Occupants"
                type="number"
                value={formData.maxOccupants}
                onChange={(e) => onChange('maxOccupants', e.target.value)}
                placeholder="e.g., 4"
              />
            </div>

            <div className="mt-4 space-y-3">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.petsAllowed}
                  onChange={(e) => onChange('petsAllowed', e.target.checked)}
                  className="w-4 h-4 text-[#029bba] border-gray-300 rounded focus:ring-[#029bba]"
                />
                <span className="text-sm text-gray-700">Pets Allowed</span>
              </label>

              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.smokingAllowed}
                  onChange={(e) => onChange('smokingAllowed', e.target.checked)}
                  className="w-4 h-4 text-[#029bba] border-gray-300 rounded focus:ring-[#029bba]"
                />
                <span className="text-sm text-gray-700">Smoking Allowed</span>
              </label>

              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.shortTermAllowed}
                  onChange={(e) => onChange('shortTermAllowed', e.target.checked)}
                  className="w-4 h-4 text-[#029bba] border-gray-300 rounded focus:ring-[#029bba]"
                />
                <span className="text-sm text-gray-700">
                  Short-term Rental Allowed (less than 6 months)
                </span>
              </label>
            </div>
          </div>

          {/* Legal */}
          <div>
            <Select
              label="Agreement Type"
              value={formData.agreementType}
              onChange={(e) => onChange('agreementType', e.target.value)}
              options={AGREEMENT_TYPE_OPTIONS as any}
            />
          </div>
        </div>
      )}

      {/* INSTALLMENT - Payment Plan */}
      {formData.listingType === 'installment' && (
        <div className="space-y-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Installment Plan
          </h3>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex items-start space-x-3">
              <div className="text-yellow-600 mt-0.5">⚠️</div>
              <div className="text-sm text-yellow-800">
                <p className="font-medium mb-1">Installment Form is Complex</p>
                <p>
                  The complete installment form with payment plan, taxes, and charges
                  requires extensive fields. For now, we'll collect basic information.
                  You can complete detailed installment information in the next step.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              label="Total Price (PKR) *"
              type="text"
              value={formatPrice(formData.installmentData.totalPrice)}
              onChange={(e) => {
                const numericValue = e.target.value.replace(/,/g, '');
                onChange('installmentData', {
                  ...formData.installmentData,
                  totalPrice: numericValue,
                });
              }}
              placeholder="e.g., 50,00,000"
              error={errors.totalPrice}
            />

            <Input
              label="Booking Amount (PKR) *"
              type="text"
              value={formatPrice(formData.installmentData.bookingAmount)}
              onChange={(e) => {
                const numericValue = e.target.value.replace(/,/g, '');
                onChange('installmentData', {
                  ...formData.installmentData,
                  bookingAmount: numericValue,
                });
              }}
              placeholder="e.g., 5,00,000"
              error={errors.bookingAmount}
            />

            <Input
              label="Down Payment (PKR)"
              type="text"
              value={formatPrice(formData.installmentData.downPaymentAmount)}
              onChange={(e) => {
                const numericValue = e.target.value.replace(/,/g, '');
                onChange('installmentData', {
                  ...formData.installmentData,
                  downPaymentAmount: numericValue,
                });
              }}
              placeholder="e.g., 10,00,000"
            />

            <Input
              label="Monthly Installment (PKR)"
              type="text"
              value={formatPrice(formData.installmentData.monthlyAmount)}
              onChange={(e) => {
                const numericValue = e.target.value.replace(/,/g, '');
                onChange('installmentData', {
                  ...formData.installmentData,
                  monthlyAmount: numericValue,
                });
              }}
              placeholder="e.g., 50,000"
            />

            <Input
              label="Number of Monthly Installments"
              type="number"
              value={formData.installmentData.monthlyCount}
              onChange={(e) => {
                onChange('installmentData', {
                  ...formData.installmentData,
                  monthlyCount: e.target.value,
                });
              }}
              placeholder="e.g., 36"
            />

            <Input
              label="Possession Amount (PKR)"
              type="text"
              value={formatPrice(formData.installmentData.possessionAmount)}
              onChange={(e) => {
                const numericValue = e.target.value.replace(/,/g, '');
                onChange('installmentData', {
                  ...formData.installmentData,
                  possessionAmount: numericValue,
                });
              }}
              placeholder="e.g., 5,00,000"
            />
          </div>

          {/* Payment Plan Summary */}
          {formData.installmentData.totalPrice && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
              <h4 className="font-semibold text-blue-900 mb-3">
                Payment Plan Summary
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-blue-700">Total Price:</span>
                  <span className="font-medium text-blue-900">
                    PKR {formatPrice(formData.installmentData.totalPrice)}
                  </span>
                </div>
                {formData.installmentData.bookingAmount && (
                  <div className="flex justify-between">
                    <span className="text-blue-700">Booking:</span>
                    <span className="font-medium text-blue-900">
                      PKR {formatPrice(formData.installmentData.bookingAmount)}
                    </span>
                  </div>
                )}
                {formData.installmentData.downPaymentAmount && (
                  <div className="flex justify-between">
                    <span className="text-blue-700">Down Payment:</span>
                    <span className="font-medium text-blue-900">
                      PKR {formatPrice(formData.installmentData.downPaymentAmount)}
                    </span>
                  </div>
                )}
                {formData.installmentData.monthlyAmount &&
                  formData.installmentData.monthlyCount && (
                    <div className="flex justify-between">
                      <span className="text-blue-700">Monthly Plan:</span>
                      <span className="font-medium text-blue-900">
                        PKR {formatPrice(formData.installmentData.monthlyAmount)} ×{' '}
                        {formData.installmentData.monthlyCount} months
                      </span>
                    </div>
                  )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ============================================
// STEP 5: MEDIA & DESCRIPTION
// ============================================

interface StepMediaProps extends StepProps {
  onImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveImage: (index: number) => void;
  imagePreviewUrls: string[];
  // 🚀 NEW: Feature Image & Gallery Props
  featureImage: { url: string; publicId: string } | null;
  onFeatureImageChange: (img: { url: string; publicId: string } | null) => void;
  galleryImages: GalleryImage[];
  onGalleryChange: (images: GalleryImage[]) => void;
}

const StepMediaAndDescription: React.FC<StepMediaProps> = ({
  formData,
  errors,
  onChange,
  onImageUpload,
  onRemoveImage,
  imagePreviewUrls,
  featureImage,
  onFeatureImageChange,
  galleryImages,
  onGalleryChange,
}) => {
  return (
    <div className="space-y-8">

      {/* 🚀 NEW: Feature Image (Cover Photo) */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Cover Photo *
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          This will be the main image shown on listings and search results.
          Use a high-quality, landscape-oriented photo.
        </p>

        <div className="max-w-xl">
          <FileUploader
            label="Upload Cover Photo"
            value={featureImage}
            onChange={(val) => {
              if (val) {
                onFeatureImageChange({
                  url: val.url,
                  publicId: val.publicId,
                });
              } else {
                onFeatureImageChange(null);
              }
            }}
            folder="properties/covers"
            accept="image"
            required
          />
        </div>

        {errors.featureImage && (
          <p className="mt-2 text-sm text-red-600">{errors.featureImage}</p>
        )}

        <div className="mt-3 bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-xs text-blue-700">
            💡 <strong>Tip:</strong> Use a 16:9 landscape image (1920×1080 recommended).
            This image appears as the hero on your property detail page.
          </p>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-gray-200" />

      {/* 🚀 NEW: Gallery Images */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Gallery Images
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          Add more photos to showcase your property. Categorize them for better organization.
        </p>

        <GalleryUploader
          label="Property Gallery"
          value={galleryImages}
          onChange={onGalleryChange}
          folder="properties/gallery"
          maxImages={20}
          showCategories={true}
          helpText="Upload multiple images showing different areas of your property"
        />

        {errors.gallery && (
          <p className="mt-2 text-sm text-red-600">{errors.gallery}</p>
        )}
      </div>

      {/* Divider */}
      <div className="border-t border-gray-200" />

      {/* Video URL */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Video Tour (Optional)
        </h3>
        <Input
          label="YouTube or Video URL"
          type="url"
          value={formData.videoUrl}
          onChange={(e) => onChange('videoUrl', e.target.value)}
          placeholder="https://youtube.com/watch?v=..."
          error={errors.videoUrl}
        />
        <p className="text-sm text-gray-500 mt-2">
          Add a YouTube video tour or walkthrough of your property
        </p>
      </div>

      {/* Divider */}
      <div className="border-t border-gray-200" />

      {/* Description */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Property Description *
        </h3>

        <RichTextEditor
          label="Detailed Description"
          value={formData.description}
          onChange={(value: string) => onChange('description', value)}
          placeholder="Describe your property in detail. Mention key features, nearby locations, condition, and any special highlights..."
          error={errors.description}
        />

        {errors.description && (
          <p className="mt-1 text-sm text-red-600">{errors.description}</p>
        )}

        <p className="text-sm text-gray-500 mt-2">
          Minimum 50 characters required. Use formatting tools to make your description professional.
        </p>

        {/* Description Tips */}
        <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm font-medium text-green-900 mb-2">
            💡 Tips for a Great Description:
          </p>
          <ul className="text-sm text-green-800 space-y-1 list-disc list-inside">
            <li>Mention unique features and recent renovations</li>
            <li>Describe the neighborhood and nearby facilities</li>
            <li>Highlight security features and utilities</li>
            <li>Be honest about the property condition</li>
            <li>Mention any restrictions or special terms</li>
          </ul>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-gray-200" />

      {/* Contact Information */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Contact Information *
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input
            label="WhatsApp Number *"
            type="tel"
            value={formData.whatsappNumber}
            onChange={(e) => onChange('whatsappNumber', e.target.value)}
            placeholder="03001234567"
            error={errors.whatsappNumber}
          />

          <Select
            label="Best Time to Call"
            value={formData.contactTime}
            onChange={(e) => onChange('contactTime', e.target.value)}
            options={CONTACT_TIME_OPTIONS as any}
          />
        </div>

        <div className="mt-4 space-y-3">
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.showPhoneOnListing !== false}
              onChange={(e) => onChange('showPhoneOnListing', e.target.checked)}
              className="w-4 h-4 text-[#029bba] border-gray-300 rounded focus:ring-[#029bba]"
            />
            <span className="text-sm text-gray-700">
              Show my phone number on listing
            </span>
          </label>

          <p className="text-xs text-gray-500 ml-6">
            We recommend keeping your number visible for faster responses
          </p>
        </div>
      </div>

      {/* Image Count Summary */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-gray-900">Media Summary</p>
            <p className="text-sm text-gray-500 mt-1">
              {featureImage ? '✅ Cover photo uploaded' : '❌ Cover photo required'}
              {' • '}
              {galleryImages.length} gallery image{galleryImages.length !== 1 ? 's' : ''}
              {formData.videoUrl ? ' • ✅ Video added' : ''}
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-[#029bba]">
              {(featureImage ? 1 : 0) + galleryImages.length}
            </p>
            <p className="text-xs text-gray-500">Total Images</p>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================
// STEP 6: REVIEW & SUBMIT
// ============================================

const StepReviewAndSubmit: React.FC<{ formData: DynamicPropertyFormData }> = ({
  formData,
}) => {
  const formatPrice = (value: string): string => {
    if (!value) return 'N/A';
    const num = value.replace(/\D/g, '');
    return num.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  return (
    <div className="space-y-6">
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
        <div className="flex items-start space-x-3">
          <CheckCircle className="w-6 h-6 text-green-600 mt-0.5" />
          <div>
            <p className="font-medium text-green-900">Almost Done!</p>
            <p className="text-sm text-green-700 mt-1">
              Please review your listing details before submitting. You can go back
              to any step to make changes.
            </p>
          </div>
        </div>
      </div>

      {/* Basic Info */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <User className="w-5 h-5 mr-2 text-[#029bba]" />
          Basic Information
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Listing Type:</span>
            <span className="ml-2 font-medium capitalize">{formData.listingType}</span>
          </div>
          <div>
            <span className="text-gray-600">User Role:</span>
            <span className="ml-2 font-medium capitalize">{formData.userRole}</span>
          </div>
          <div>
            <span className="text-gray-600">Category:</span>
            <span className="ml-2 font-medium capitalize">{formData.category}</span>
          </div>
          <div>
            <span className="text-gray-600">Property Type:</span>
            <span className="ml-2 font-medium">{formData.propertyType}</span>
          </div>
        </div>
      </div>

      {/* Location */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <MapPin className="w-5 h-5 mr-2 text-[#029bba]" />
          Location
        </h3>
        <div className="text-sm space-y-2">
          <p>
            <span className="text-gray-600">City:</span>
            <span className="ml-2 font-medium">{formData.city || 'N/A'}</span>
          </p>
          <p>
            <span className="text-gray-600">Society:</span>
            <span className="ml-2 font-medium">
              {formData.society === 'Other'
                ? formData.customSociety
                : formData.society || 'N/A'}
            </span>
          </p>
          {formData.phase && (
            <p>
              <span className="text-gray-600">Phase:</span>
              <span className="ml-2 font-medium">{formData.phase}</span>
            </p>
          )}
          {formData.block && (
            <p>
              <span className="text-gray-600">Block:</span>
              <span className="ml-2 font-medium">{formData.block}</span>
            </p>
          )}
        </div>
      </div>

      {/* Property Details */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Building2 className="w-5 h-5 mr-2 text-[#029bba]" />
          Property Details
        </h3>
        <div className="space-y-3 text-sm">
          <p className="font-medium text-gray-900 text-base">{formData.title}</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <span className="text-gray-600">Area:</span>
              <span className="ml-2 font-medium">
                {formData.area} {formData.unit}
              </span>
            </div>
            {formData.bedrooms && (
              <div>
                <span className="text-gray-600">Bedrooms:</span>
                <span className="ml-2 font-medium">{formData.bedrooms}</span>
              </div>
            )}
            {formData.bathrooms && (
              <div>
                <span className="text-gray-600">Bathrooms:</span>
                <span className="ml-2 font-medium">{formData.bathrooms}</span>
              </div>
            )}
            <div>
              <span className="text-gray-600">Parking:</span>
              <span className="ml-2 font-medium">{formData.parking} spaces</span>
            </div>
            <div>
              <span className="text-gray-600">Furnished:</span>
              <span className="ml-2 font-medium capitalize">
                {formData.furnished.replace('_', ' ')}
              </span>
            </div>
          </div>
          {formData.amenities.length > 0 && (
            <div>
              <span className="text-gray-600">Amenities:</span>
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.amenities.slice(0, 10).map((amenity) => (
                  <span
                    key={amenity}
                    className="px-3 py-1 bg-[#029bba]/10 text-[#029bba] text-xs rounded-full"
                  >
                    {AMENITIES_LIST.find((a) => a.id === amenity)?.label || amenity}
                  </span>
                ))}
                {formData.amenities.length > 10 && (
                  <span className="px-3 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                    +{formData.amenities.length - 10} more
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Pricing */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <DollarSign className="w-5 h-5 mr-2 text-[#029bba]" />
          Pricing
        </h3>
        <div className="text-sm space-y-2">
          {formData.listingType === 'sell' && (
            <p>
              <span className="text-gray-600">Price:</span>
              <span className="ml-2 font-bold text-lg text-[#029bba]">
                PKR {formatPrice(formData.price)}
              </span>
            </p>
          )}

          {formData.listingType === 'rent' && (
            <>
              <p>
                <span className="text-gray-600">Monthly Rent:</span>
                <span className="ml-2 font-bold text-lg text-[#029bba]">
                  PKR {formatPrice(formData.monthlyRent)}
                </span>
              </p>

              {/* ✅ UPDATED: Security Deposit is PKR */}
              <p>
                <span className="text-gray-600">Security Deposit:</span>
                <span className="ml-2 font-medium">
                  PKR {formatPrice(formData.securityDeposit)}
                </span>
              </p>
            </>
          )}

          {formData.listingType === 'installment' && (
            <>
              <p>
                <span className="text-gray-600">Total Price:</span>
                <span className="ml-2 font-bold text-lg text-[#029bba]">
                  PKR {formatPrice(formData.installmentData.totalPrice)}
                </span>
              </p>
              <p>
                <span className="text-gray-600">Booking Amount:</span>
                <span className="ml-2 font-medium">
                  PKR {formatPrice(formData.installmentData.bookingAmount)}
                </span>
              </p>
              {formData.installmentData.monthlyAmount && (
                <p>
                  <span className="text-gray-600">Monthly Installment:</span>
                  <span className="ml-2 font-medium">
                    PKR {formatPrice(formData.installmentData.monthlyAmount)} ×{' '}
                    {formData.installmentData.monthlyCount} months
                  </span>
                </p>
              )}
            </>
          )}
        </div>
      </div>

      {/* Media */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <ImageIcon className="w-5 h-5 mr-2 text-[#029bba]" />
          Media & Description
        </h3>
        <div className="space-y-4">
          <div>
            <span className="text-sm text-gray-600">Images Uploaded:</span>
            <span className="ml-2 font-medium">{formData.images.length} photos</span>
          </div>
          {formData.videoUrl && (
            <div>
              <span className="text-sm text-gray-600">Video Tour:</span>
              <span className="ml-2 text-[#029bba] text-sm">Included</span>
            </div>
          )}
          <div>
            <p className="text-sm text-gray-600 mb-2">Description:</p>
            <p className="text-sm text-gray-800 line-clamp-3">
              {formData.description}
            </p>
          </div>
        </div>
      </div>

      {/* Contact */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <FileText className="w-5 h-5 mr-2 text-[#029bba]" />
          Contact Information
        </h3>
        <div className="text-sm space-y-2">
          <p>
            <span className="text-gray-600">WhatsApp:</span>
            <span className="ml-2 font-medium">{formData.whatsappNumber}</span>
          </p>
          <p>
            <span className="text-gray-600">Best Time to Call:</span>
            <span className="ml-2 font-medium capitalize">
              {formData.contactTime.replace('_', ' ')}
            </span>
          </p>
        </div>
      </div>

      {/* Terms & Conditions */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
        <div className="space-y-4">
          <label className="flex items-start space-x-3 cursor-pointer">
            <input
              type="checkbox"
              required
              className="w-5 h-5 text-[#029bba] border-gray-300 rounded focus:ring-[#029bba] mt-0.5"
            />
            <span className="text-sm text-gray-700">
              I confirm that all information provided is accurate and I have the
              authority to list this property.
            </span>
          </label>

          <label className="flex items-start space-x-3 cursor-pointer">
            <input
              type="checkbox"
              required
              className="w-5 h-5 text-[#029bba] border-gray-300 rounded focus:ring-[#029bba] mt-0.5"
            />
            <span className="text-sm text-gray-700">
              I agree to the{' '}
              <a href="/terms" className="text-[#029bba] hover:underline">
                Terms & Conditions
              </a>{' '}
              and{' '}
              <a href="/privacy" className="text-[#029bba] hover:underline">
                Privacy Policy
              </a>
              .
            </span>
          </label>
        </div>
      </div>
    </div>
  );
};
