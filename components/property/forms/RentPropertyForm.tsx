// components/property/forms/RentPropertyForm.tsx

'use client';

import { useState, useEffect, useMemo } from 'react';
import type * as React from 'react';
import { useRouter } from 'next/router';
import {
  Upload,
  X,
  AlertCircle,
  CheckCircle,
  Home,
  MapPin,
  Settings,
  Sparkles,
  FileText,
  Phone,
  ChevronDown,
  ChevronUp,
  Info,
  Store,
  Zap,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  FullPaymentFormData,
  FullPaymentFormErrors,
  initialFullPaymentFormData,
  PROPERTY_TYPES,
  PROPERTY_SUBTYPES,
  AREA_UNITS,
  CITIES,
  SOCIETIES,
  DEFAULT_SOCIETIES,
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
  ELECTRICITY_LOAD_OPTIONS,
  CEILING_HEIGHT_OPTIONS,
  SUITABLE_FOR_OPTIONS,
} from '@/types/property';
import {
  validateFullPaymentForm,
  hasFullPaymentErrors,
  validateFullPaymentTitle,
  validateFullPaymentPrice,
  validateFullPaymentArea,
  validateFullPaymentCity,
  validateFullPaymentSociety,
  validateFullPaymentBedrooms,
  validateFullPaymentBathrooms,
  validateFullPaymentFloorNumber,
  validateFullPaymentDescription,
  validateFullPaymentVideo,
  validateFullPaymentImages,
  validateFullPaymentWhatsApp,
} from '@/lib/validators/propertyValidators';

// ✅ NEW: Image & Rich Text Components
import FileUploader from '@/components/admin/FileUploader';
import GalleryUploader, { GalleryImage } from '@/components/admin/GalleryUploader';
import RichTextEditor from '@/components/admin/RichTextEditor';
import SuccessModal from '@/components/ui/SuccessModal';

// ✅ NEW: Additional Icons for Rental
import { Calendar, Users, Banknote, Clock } from 'lucide-react';

// Reuse the same data shape/types as full-payment
type RentFormData = FullPaymentFormData;
type RentFormErrors = FullPaymentFormErrors;
const initialRentFormData: RentFormData = initialFullPaymentFormData;

// ============================================
// SECTION COMPONENT
// ============================================

interface FormSectionProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
  badge?: string;
}

const FormSection = ({
  title,
  icon,
  children,
  defaultOpen = true,
  badge,
}: FormSectionProps) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 sm:px-6 sm:py-4 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-[#007C8B]">{icon}</span>
          <span className="font-semibold text-gray-800">{title}</span>
          {badge && (
            <span className="text-xs bg-[#007C8B] text-white px-2 py-0.5 rounded-full">
              {badge}
            </span>
          )}
        </div>
        {isOpen ? (
          <ChevronUp className="w-5 h-5 text-gray-500" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-500" />
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="px-4 py-4 sm:px-6 sm:py-5">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ============================================
// MAIN FORM COMPONENT
// ============================================

interface RentPropertyFormProps {
  mode?: 'create' | 'edit';
  propertyId?: string;
  initialData?: Partial<RentFormData>;
  projectId?: string;
  projectCategory?: 'highrise' | 'society';
}

export default function RentPropertyForm({
  mode = 'create',
  propertyId,
  initialData,
  projectId,
  projectCategory,
}: RentPropertyFormProps) {
  const router = useRouter();

  const [formData, setFormData] = useState<RentFormData>(initialRentFormData);
  const [errors, setErrors] = useState<RentFormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // ✅ NEW: Feature Image & Gallery States
  const [featureImage, setFeatureImage] = useState<{
    url: string;
    publicId: string;
  } | null>(null);
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([]);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [submittedProperty, setSubmittedProperty] = useState<{
    id: string;
    title: string;
  } | null>(null);

  // ✅ NEW: Rental-Specific Fields
  const [rentalDetails, setRentalDetails] = useState({
    securityDeposit: '',
    advanceMonths: '1',
    minimumStay: '12',
    availableFrom: '',
    leaseDuration: '12',
    rentNegotiable: false,
    billsIncluded: false,
    electricityIncluded: false,
    gasIncluded: false,
    waterIncluded: false,
    internetIncluded: false,
    maintenanceCharges: '',
    // Tenant Preferences
    familyOnly: false,
    bachelorsAllowed: true,
    petsAllowed: false,
    smokingAllowed: false,
    commercialUseAllowed: false,
  });

  // preload initial data in edit mode
  useEffect(() => {
    if (mode === 'edit' && initialData) {
      setFormData((prev) => ({
        ...prev,
        ...initialData,
      }));

      // ✅ Prefill Feature Image & Gallery from initialData (edit mode)
      const anyInitial: any = initialData;

      if (anyInitial.existingFeatureImage) {
        setFeatureImage({
          url: anyInitial.existingFeatureImage.url,
          publicId: anyInitial.existingFeatureImage.publicId,
        });
      }

      if (Array.isArray(anyInitial.existingGallery)) {
        setGalleryImages(anyInitial.existingGallery);
      }

      // ✅ Prefill Rental Details from initialData (edit mode)
      setRentalDetails((prev) => ({
        ...prev,
        securityDeposit: anyInitial.securityDeposit || '',
        advanceMonths: anyInitial.advanceMonths || '1',
        minimumStay: anyInitial.minimumStay || '12',
        leaseDuration: anyInitial.leaseDuration || '12',
        availableFrom: anyInitial.availableFrom || '',
        rentNegotiable: !!anyInitial.rentNegotiable,
        billsIncluded: !!anyInitial.billsIncluded,
        electricityIncluded: !!anyInitial.electricityIncluded,
        gasIncluded: !!anyInitial.gasIncluded,
        waterIncluded: !!anyInitial.waterIncluded,
        internetIncluded: !!anyInitial.internetIncluded,
        maintenanceCharges: anyInitial.maintenanceCharges || '',
        familyOnly: !!anyInitial.familyOnly,
        bachelorsAllowed: anyInitial.bachelorsAllowed !== false, // default true
        petsAllowed: !!anyInitial.petsAllowed,
        smokingAllowed: !!anyInitial.smokingAllowed,
        commercialUseAllowed: !!anyInitial.commercialUseAllowed,
      }));
    }
  }, [mode, initialData]);

  // ensure user is logged in
  useEffect(() => {
    const user = localStorage.getItem('user');
    if (!user) {
      alert('Please login to add a property');
      router.push('/');
    }
  }, [router]);

  // Filter property types based on projectCategory (if provided)
  const filteredPropertyTypes = useMemo<string[]>(() => {
    const base: string[] = [...PROPERTY_TYPES];
    if (!projectCategory) return base;

    const lower = (s: string) => s.toLowerCase();

    if (projectCategory === 'highrise') {
      const keywords = [
        'apartment',
        'flat',
        'studio',
        'shop',
        'office',
        'commercial',
        'penthouse',
        'food court',
        'kiosk',
      ];
      const filtered = base.filter((type) =>
        keywords.some((kw) => lower(type).includes(kw))
      );
      return filtered.length > 0 ? filtered : base;
    }

    if (projectCategory === 'society') {
      const keywords = [
        'plot',
        'residential',
        'commercial plot',
        'house',
        'villa',
        'farmhouse',
      ];
      const filtered = base.filter((type) =>
        keywords.some((kw) => lower(type).includes(kw))
      );
      return filtered.length > 0 ? filtered : base;
    }

    return base;
  }, [projectCategory]);

  // Ensure propertyType is valid for the current projectCategory
  useEffect(() => {
    if (!projectCategory) return;
    setFormData((prev) => {
      if (filteredPropertyTypes.includes(prev.propertyType)) return prev;
      const next = filteredPropertyTypes[0] || prev.propertyType;
      return { ...prev, propertyType: next, propertySubtype: '' };
    });
  }, [projectCategory, filteredPropertyTypes]);

  // Available societies based on city
  const availableSocieties = useMemo(() => {
    if (!formData.city) return [];
    return SOCIETIES[formData.city] || DEFAULT_SOCIETIES;
  }, [formData.city]);

  // Subtypes based on selected property type
  const availableSubtypes = useMemo(() => {
    return PROPERTY_SUBTYPES[formData.propertyType] || [];
  }, [formData.propertyType]);

  // Determine which fields to show based on property type
  const showFields = useMemo(() => {
    const type = formData.propertyType;
    return {
      bedrooms: ['House', 'Apartment', 'Farmhouse'].includes(type),
      bathrooms: ['House', 'Apartment', 'Farmhouse'].includes(type),
      floors: ['House'].includes(type),
      floorNumber: ['Apartment'].includes(type),
      totalFloors: ['Apartment'].includes(type),
      servantQuarter: ['House', 'Farmhouse'].includes(type),
      basement: ['House', 'Commercial'].includes(type),
      hasAttachedBath: false,
      hasMezzanine: false,
      furnished: !['Plot'].includes(type),
      condition: !['Plot'].includes(type),
      isShopOrCommercial: ['Shop', 'Commercial'].includes(type),
    };
  }, [formData.propertyType]);

  const handleInputChange = (
    e:
      | React.ChangeEvent<HTMLInputElement>
      | React.ChangeEvent<HTMLSelectElement>
      | React.ChangeEvent<HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    const newValue =
      type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;

    setFormData((prev) => {
      const updated: any = { ...prev };

      if (name.includes('.')) {
        const [parent, child] = name.split('.');
        updated[parent] = {
          ...(prev as any)[parent],
          [child]: newValue,
        };
      } else {
        updated[name] = newValue;
      }

      if (name === 'city') {
        updated.society = '';
        updated.customSociety = '';
        updated.phase = '';
        updated.block = '';
      }

      if (name === 'propertyType') {
        updated.propertySubtype = '';
        updated.bedrooms = '';
        updated.bathrooms = '';
        updated.floors = '';
        updated.floorNumber = '';
        updated.totalFloors = '';
        updated.servantQuarter = false;
        updated.basement = false;
        updated.hasAttachedBath = false;
        updated.hasMezzanine = false;

        // Reset shop fields
        updated.floorLocation = 'ground';
        updated.shopPosition = '';
        updated.shopFrontWidth = '';
        updated.shopDepth = '';
        updated.mezzanineArea = '';
        updated.electricityLoad = 'single_phase';
        updated.ceilingHeight = 'standard';
        updated.suitableFor = [];
        updated.hasWashroom = false;
        updated.hasSignage = true;
      }

      return updated;
    });

    if (errors[name as keyof RentFormErrors]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name as keyof RentFormErrors];
        return newErrors;
      });
    }

    if (submitError) {
      setSubmitError('');
    }
  };

  const handleAmenityToggle = (amenityId: string) => {
    setFormData((prev) => {
      const currentAmenities = prev.amenities;
      const isSelected = currentAmenities.includes(amenityId);

      return {
        ...prev,
        amenities: isSelected
          ? currentAmenities.filter((a) => a !== amenityId)
          : [...currentAmenities, amenityId],
      };
    });
  };

  const handleSuitableForToggle = (optionId: string) => {
    setFormData((prev) => {
      const current = prev.suitableFor;
      const isSelected = current.includes(optionId);

      return {
        ...prev,
        suitableFor: isSelected
          ? current.filter((id) => id !== optionId)
          : [...current, optionId],
      };
    });
  };

  const handleBlur = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    validateField(field);
  };

  const validateField = (field: string) => {
    let error: string | undefined;

    switch (field) {
      case 'title':
        error = validateFullPaymentTitle(formData.title);
        break;
      case 'price':
        error = validateFullPaymentPrice(formData.price);
        break;
      case 'area':
        error = validateFullPaymentArea(formData.area);
        break;
      case 'city':
        error = validateFullPaymentCity(formData.city);
        break;
      case 'society':
      case 'customSociety':
        error = validateFullPaymentSociety(
          formData.society,
          formData.customSociety
        );
        break;
      case 'bedrooms':
        error = validateFullPaymentBedrooms(
          formData.bedrooms,
          formData.propertyType
        );
        break;
      case 'bathrooms':
        error = validateFullPaymentBathrooms(
          formData.bathrooms,
          formData.propertyType
        );
        break;
      case 'floorNumber':
        error = validateFullPaymentFloorNumber(
          formData.floorNumber,
          formData.propertyType
        );
        break;
      case 'description':
        error = validateFullPaymentDescription(formData.description);
        break;
      case 'videoUrl':
        error = validateFullPaymentVideo(formData.videoUrl);
        break;
      case 'images':
        error = validateFullPaymentImages(formData.images);
        break;
      case 'whatsappNumber':
        error = validateFullPaymentWhatsApp(formData.whatsappNumber);
        break;
    }

    setErrors((prev) => {
      if (error) {
        return { ...prev, [field]: error };
      } else {
        const newErrors = { ...prev };
        delete newErrors[field as keyof RentFormErrors];
        return newErrors;
      }
    });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);

    if (formData.images.length + files.length > 10) {
      setErrors((prev) => ({
        ...prev,
        images: 'You can upload a maximum of 10 images.',
      }));
      return;
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    const maxSize = 5 * 1024 * 1024;

    for (const file of files) {
      if (!allowedTypes.includes(file.type)) {
        setErrors((prev) => ({
          ...prev,
          images: 'Only JPG, PNG, and WebP images are allowed',
        }));
        return;
      }
      if (file.size > maxSize) {
        setErrors((prev) => ({
          ...prev,
          images: 'Each image must be less than 5MB',
        }));
        return;
      }
    }

    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors.images;
      return newErrors;
    });

    const previews = files.map((file) => URL.createObjectURL(file));
    setImagePreviews((prev) => [...prev, ...previews]);
    setFormData((prev) => ({
      ...prev,
      images: [...prev.images, ...files],
    }));
  };

  const removeImage = (index: number) => {
    URL.revokeObjectURL(imagePreviews[index]);
    const updatedImages = formData.images.filter((_, i) => i !== index);
    const updatedPreviews = imagePreviews.filter((_, i) => i !== index);
    setFormData((prev) => ({ ...prev, images: updatedImages }));
    setImagePreviews(updatedPreviews);
  };

  const formatPrice = (value: string) => {
    const numbers = value.replace(/[^\d]/g, '');
    return numbers.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPrice(e.target.value);
    setFormData((prev) => ({ ...prev, price: formatted }));

    if (errors.price) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors.price;
        return newErrors;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setSubmitError('');
    setSubmitSuccess(false);

    // ✅ Custom validation for feature image (new flow)
    if (mode === 'create' && !featureImage) {
      setErrors((prev) => ({
        ...prev,
        images: 'Cover photo is required',
      }));
      return;
    }

    const validationErrors = validateFullPaymentForm(formData);

    // Images ko hamare FileUploader/GalleryUploader handle kar rahe hain
    delete validationErrors.images;

    setErrors(validationErrors);

    const allTouched: Record<string, boolean> = {};
    Object.keys(formData).forEach((key) => {
      allTouched[key] = true;
    });
    setTouched(allTouched);

    if (hasFullPaymentErrors(validationErrors)) {
      const firstError = document.querySelector('.error-message');
      firstError?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    const userStr = localStorage.getItem('user');
    if (!userStr) {
      setSubmitError('Please login to add a property');
      router.push('/');
      return;
    }

    const user = JSON.parse(userStr);
    const userId = user._id || user.id;
    if (!userId) {
      setSubmitError('User ID not found. Please login again.');
      return;
    }

    setIsSubmitting(true);

    try {
      // ✅ Build preUploadedImages array from Feature + Gallery
      const preUploadedImages: {
        url: string;
        public_id: string;
        isPrimary?: boolean;
        caption?: string;
        category?: string;
        order?: number;
      }[] = [];

      if (featureImage) {
        preUploadedImages.push({
          url: featureImage.url,
          public_id: featureImage.publicId,
          isPrimary: true,
          category: 'exterior',
          order: 0,
        });
      }

      galleryImages.forEach((img, index) => {
        preUploadedImages.push({
          url: img.url,
          public_id: img.publicId,
          caption: img.caption || '',
          category: img.category || 'exterior',
          order: index + 1,
        });
      });

      // ✅ Build flat payload (text fields only)
      const payload: Record<string, any> = {
        userId,
        listingType: 'rent',

        ...(projectId && { projectId }),
        ...(projectCategory && { projectCategory }),

        // Basic Information
        title: formData.title,
        propertyType: formData.propertyType,
        propertySubtype: formData.propertySubtype,
        price: formData.price.replace(/,/g, ''), // Monthly Rent
        area: formData.area,
        unit: formData.unit,

        // Rental-Specific Fields
        securityDeposit: rentalDetails.securityDeposit.replace(/,/g, ''),
        advanceMonths: rentalDetails.advanceMonths,
        minimumStay: rentalDetails.minimumStay,
        leaseDuration: rentalDetails.leaseDuration,
        availableFrom: rentalDetails.availableFrom,
        rentNegotiable: rentalDetails.rentNegotiable,
        billsIncluded: rentalDetails.billsIncluded,
        electricityIncluded: rentalDetails.electricityIncluded,
        gasIncluded: rentalDetails.gasIncluded,
        waterIncluded: rentalDetails.waterIncluded,
        internetIncluded: rentalDetails.internetIncluded,
        maintenanceCharges: rentalDetails.maintenanceCharges.replace(/,/g, ''),
        familyOnly: rentalDetails.familyOnly,
        bachelorsAllowed: rentalDetails.bachelorsAllowed,
        petsAllowed: rentalDetails.petsAllowed,
        smokingAllowed: rentalDetails.smokingAllowed,
        commercialUseAllowed: rentalDetails.commercialUseAllowed,

        // Location
        city: formData.city,
        society:
          formData.society === 'Other'
            ? formData.customSociety
            : formData.society,
        phase: formData.phase,
        block: formData.block,
        streetNumber: formData.streetNumber,

        // Property Details
        bedrooms: formData.bedrooms,
        bathrooms: formData.bathrooms,
        floors: formData.floors,
        floorNumber: formData.floorNumber,
        totalFloors: formData.totalFloors,
        servantQuarter: formData.servantQuarter,
        basement: formData.basement,

        // Shop / Commercial
        floorLocation: formData.floorLocation,
        shopPosition: formData.shopPosition,
        shopFrontWidth: formData.shopFrontWidth,
        shopDepth: formData.shopDepth,
        mezzanineArea: formData.mezzanineArea,
        electricityLoad: formData.electricityLoad,
        ceilingHeight: formData.ceilingHeight,
        suitableFor: formData.suitableFor,
        hasWashroom: formData.hasWashroom,
        hasSignage: formData.hasSignage,

        // Features
        furnished: formData.furnished,
        condition: formData.condition,
        facing: formData.facing,
        parking: formData.parking,
        amenities: formData.amenities,

        // Legal
        possessionStatus: formData.possessionStatus,
        ownershipType: formData.ownershipType,

        // Description & Media
        description: formData.description,
        videoUrl: formData.videoUrl,

        // Contact
        whatsappNumber: formData.whatsappNumber,
        contactTime: formData.contactTime,
      };

      // ✅ Convert payload into FormData for formidable backend
      const formDataToSend = new FormData();

      Object.entries(payload).forEach(([key, value]) => {
        if (value === undefined || value === null || value === '') {
          return;
        }

        if (Array.isArray(value)) {
          // Amenities / SuitableFor → comma-separated (backend parseArray use karega)
          if (key === 'amenities' || key === 'suitableFor') {
            if (value.length > 0) {
              formDataToSend.append(key, value.join(','));
            }
          } else {
            formDataToSend.append(key, JSON.stringify(value));
          }
        } else if (typeof value === 'boolean') {
          formDataToSend.append(key, value ? 'true' : 'false');
        } else {
          formDataToSend.append(key, String(value));
        }
      });

      // ✅ Send all images (feature + gallery) as preUploadedImages JSON
      if (preUploadedImages.length > 0) {
        formDataToSend.append(
          'preUploadedImages',
          JSON.stringify(preUploadedImages)
        );
      }

      const url =
        mode === 'edit' && propertyId
          ? `/api/properties/${propertyId}`
          : '/api/properties/add';
      const method = mode === 'edit' && propertyId ? 'put' : 'post';

      const response = await axios.request({
        url,
        method,
        data: formDataToSend,
        // ❌ Content-Type manually set nahi karna; browser multipart/form-data set karega
      });

      if (response.data.success) {
        setSubmitSuccess(true);

        setSubmittedProperty({
          id:
            response.data.property?._id ||
            response.data.property?.id ||
            '',
          title: formData.title,
        });

        if (mode === 'create') {
          setFormData(initialRentFormData);
          setFeatureImage(null);
          setGalleryImages([]);
          setImagePreviews([]);
          setTouched({});
          setErrors({});
          setRentalDetails({
            securityDeposit: '',
            advanceMonths: '1',
            minimumStay: '12',
            availableFrom: '',
            leaseDuration: '12',
            rentNegotiable: false,
            billsIncluded: false,
            electricityIncluded: false,
            gasIncluded: false,
            waterIncluded: false,
            internetIncluded: false,
            maintenanceCharges: '',
            familyOnly: false,
            bachelorsAllowed: true,
            petsAllowed: false,
            smokingAllowed: false,
            commercialUseAllowed: false,
          });
        }

        setShowSuccessModal(true);
      }
    } catch (error: any) {
      console.error('=== API ERROR ===', error);
      console.error('Error response:', error.response?.data);
      setSubmitError(
        error.response?.data?.error ||
          'Error submitting property. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const showError = (field: keyof RentFormErrors) =>
    touched[field] && errors[field];

  // group amenities
  const groupedAmenities = useMemo(() => {
    type Amenity = (typeof AMENITIES_LIST)[number];

    const groups: Record<
      'utilities' | 'security' | 'facilities' | 'interior',
      Amenity[]
    > = {
      utilities: [],
      security: [],
      facilities: [],
      interior: [],
    };

    AMENITIES_LIST.forEach((amenity) => {
      const category = amenity.category as keyof typeof groups;
      if (groups[category]) groups[category].push(amenity);
    });

    return groups;
  }, []);

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center mb-6 px-4"
      >
        <div className="inline-flex items-center gap-2 bg-purple-100 text-purple-700 px-4 py-2 rounded-full text-sm font-medium mb-4">
          Rental Property
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
          {mode === 'edit' ? 'Edit Rental Property' : 'Add Rental Property'}
        </h1>

        <p className="text-gray-500 text-sm sm:text-base">
          {mode === 'edit'
            ? 'Update your rental listing details. Existing images will remain unless you upload additional photos.'
            : 'List your property for rent with complete details.'}
        </p>
      </motion.div>

      {/* Success Message */}
      {submitSuccess && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3"
        >
          <CheckCircle className="text-green-500 w-6 h-6 flex-shrink-0" />
          <div>
            <p className="text-green-800 font-medium">
              Property {mode === 'edit' ? 'updated' : 'submitted'} successfully!
            </p>
            <p className="text-green-600 text-sm">
              Redirecting to your properties...
            </p>
          </div>
        </motion.div>
      )}

      {/* Error Message */}
      {submitError && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3"
        >
          <AlertCircle className="text-red-500 w-6 h-6 flex-shrink-0" />
          <p className="text-red-800">{submitError}</p>
        </motion.div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* SECTION 1: BASIC INFO */}
        <FormSection
          title="Basic Information"
          icon={<Home className="w-5 h-5" />}
          defaultOpen
        >
          <div className="space-y-4">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Property Title <span className="text-red-500">*</span>
              </label>
              <Input
                name="title"
                type="text"
                placeholder="e.g., 2 Bed Apartment for Rent in DHA Phase 6"
                value={formData.title}
                onChange={handleInputChange}
                onBlur={() => handleBlur('title')}
                className={showError('title') ? 'border-red-500' : ''}
              />
              {showError('title') && (
                <p className="error-message text-red-500 text-sm mt-1">
                  {errors.title}
                </p>
              )}
              <p className="text-xs text-gray-400 mt-1">
                {formData.title.length}/100 characters
              </p>
            </div>

            {/* Property Type / Subtype */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Property Type <span className="text-red-500">*</span>
                </label>
                <select
                  name="propertyType"
                  value={formData.propertyType}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-[#007C8B] focus:border-transparent"
                >
                  {filteredPropertyTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Property Subtype
                </label>
                <select
                  name="propertySubtype"
                  value={formData.propertySubtype}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-[#007C8B] focus:border-transparent"
                >
                  <option value="">Select Subtype</option>
                  {availableSubtypes.map((subtype) => (
                    <option key={subtype} value={subtype}>
                      {subtype}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Price & Area */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Monthly Rent */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Monthly Rent (PKR) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                    Rs.
                  </span>
                  <Input
                    name="price"
                    type="text"
                    placeholder="45,000"
                    value={formData.price}
                    onChange={handlePriceChange}
                    onBlur={() => handleBlur('price')}
                    className={`pl-10 ${
                      showError('price') ? 'border-red-500' : ''
                    }`}
                  />
                </div>
                {showError('price') && (
                  <p className="error-message text-red-500 text-sm mt-1">
                    {errors.price}
                  </p>
                )}
              </div>

              {/* Area */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Area <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  <Input
                    name="area"
                    type="number"
                    placeholder="5"
                    value={formData.area}
                    onChange={handleInputChange}
                    onBlur={() => handleBlur('area')}
                    min="1"
                    className={`flex-1 ${
                      showError('area') ? 'border-red-500' : ''
                    }`}
                  />
                  <select
                    name="unit"
                    value={formData.unit}
                    onChange={handleInputChange}
                    className="w-28 border border-gray-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-[#007C8B] focus:border-transparent"
                  >
                    {AREA_UNITS.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </div>
                {showError('area') && (
                  <p className="error-message text-red-500 text-sm mt-1">
                    {errors.area}
                  </p>
                )}
              </div>
            </div>
          </div>
        </FormSection>

                {/* ✅ NEW SECTION: RENTAL DETAILS */}
        <FormSection
          title="Rental Details"
          icon={<Banknote className="w-5 h-5" />}
          defaultOpen={true}
          badge="Important"
        >
          <div className="space-y-4">
            {/* Security Deposit & Advance */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Security Deposit (PKR)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                    Rs.
                  </span>
                  <Input
                    type="text"
                    placeholder="e.g., 50,000"
                    value={rentalDetails.securityDeposit}
                    onChange={(e) => {
                      const formatted = formatPrice(e.target.value);
                      setRentalDetails(prev => ({ ...prev, securityDeposit: formatted }));
                    }}
                    className="pl-10"
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">Refundable deposit</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Advance Months
                </label>
                <select
                  value={rentalDetails.advanceMonths}
                  onChange={(e) => setRentalDetails(prev => ({ ...prev, advanceMonths: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-[#007C8B] focus:border-transparent"
                >
                  {[1, 2, 3, 4, 5, 6, 12].map(m => (
                    <option key={m} value={m}>{m} Month{m > 1 ? 's' : ''}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Minimum Stay
                </label>
                <select
                  value={rentalDetails.minimumStay}
                  onChange={(e) => setRentalDetails(prev => ({ ...prev, minimumStay: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-[#007C8B] focus:border-transparent"
                >
                  <option value="1">1 Month</option>
                  <option value="3">3 Months</option>
                  <option value="6">6 Months</option>
                  <option value="12">12 Months (1 Year)</option>
                  <option value="24">24 Months (2 Years)</option>
                  <option value="36">36 Months (3 Years)</option>
                </select>
              </div>
            </div>

            {/* Lease Duration & Available From */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Lease Duration (Months)
                </label>
                <select
                  value={rentalDetails.leaseDuration}
                  onChange={(e) => setRentalDetails(prev => ({ ...prev, leaseDuration: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-[#007C8B] focus:border-transparent"
                >
                  <option value="6">6 Months</option>
                  <option value="12">12 Months (1 Year)</option>
                  <option value="24">24 Months (2 Years)</option>
                  <option value="36">36 Months (3 Years)</option>
                  <option value="60">60 Months (5 Years)</option>
                  <option value="flexible">Flexible</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Available From
                </label>
                <Input
                  type="date"
                  value={rentalDetails.availableFrom}
                  onChange={(e) => setRentalDetails(prev => ({ ...prev, availableFrom: e.target.value }))}
                  min={new Date().toISOString().split('T')[0]}
                />
                <p className="text-xs text-gray-400 mt-1">Leave empty for immediate availability</p>
              </div>
            </div>

            {/* Rent Negotiable */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="rentNegotiable"
                checked={rentalDetails.rentNegotiable}
                onChange={(e) => setRentalDetails(prev => ({ ...prev, rentNegotiable: e.target.checked }))}
                className="w-4 h-4 rounded border-gray-300 text-[#007C8B] focus:ring-[#007C8B]"
              />
              <label htmlFor="rentNegotiable" className="text-sm text-gray-700 cursor-pointer">
                Rent is negotiable
              </label>
            </div>

            {/* Bills & Utilities */}
            <div className="bg-blue-50 rounded-xl p-4">
              <h4 className="text-sm font-medium text-gray-800 mb-3 flex items-center gap-2">
                <Zap className="w-4 h-4 text-blue-600" />
                Bills & Utilities
              </h4>
              
              <div className="flex items-center gap-2 mb-3">
                <input
                  type="checkbox"
                  id="billsIncluded"
                  checked={rentalDetails.billsIncluded}
                  onChange={(e) => setRentalDetails(prev => ({ ...prev, billsIncluded: e.target.checked }))}
                  className="w-4 h-4 rounded border-gray-300 text-[#007C8B] focus:ring-[#007C8B]"
                />
                <label htmlFor="billsIncluded" className="text-sm font-medium text-gray-700 cursor-pointer">
                  All Bills Included in Rent
                </label>
              </div>

              {!rentalDetails.billsIncluded && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 ml-6">
                  {[
                    { key: 'electricityIncluded', label: 'Electricity' },
                    { key: 'gasIncluded', label: 'Gas' },
                    { key: 'waterIncluded', label: 'Water' },
                    { key: 'internetIncluded', label: 'Internet' },
                  ].map(item => (
                    <label key={item.key} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={rentalDetails[item.key as keyof typeof rentalDetails] as boolean}
                        onChange={(e) => setRentalDetails(prev => ({ ...prev, [item.key]: e.target.checked }))}
                        className="w-4 h-4 rounded border-gray-300 text-[#007C8B] focus:ring-[#007C8B]"
                      />
                      <span className="text-sm text-gray-600">{item.label}</span>
                    </label>
                  ))}
                </div>
              )}

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Monthly Maintenance Charges (if any)
                </label>
                <div className="relative w-48">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                    Rs.
                  </span>
                  <Input
                    type="text"
                    placeholder="0"
                    value={rentalDetails.maintenanceCharges}
                    onChange={(e) => {
                      const formatted = formatPrice(e.target.value);
                      setRentalDetails(prev => ({ ...prev, maintenanceCharges: formatted }));
                    }}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>

            {/* Tenant Preferences */}
            <div className="bg-purple-50 rounded-xl p-4">
              <h4 className="text-sm font-medium text-gray-800 mb-3 flex items-center gap-2">
                <Users className="w-4 h-4 text-purple-600" />
                Tenant Preferences
              </h4>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  { key: 'familyOnly', label: 'Family Only' },
                  { key: 'bachelorsAllowed', label: 'Bachelors Allowed' },
                  { key: 'petsAllowed', label: 'Pets Allowed' },
                  { key: 'smokingAllowed', label: 'Smoking Allowed' },
                  { key: 'commercialUseAllowed', label: 'Commercial Use Allowed' },
                ].map(item => (
                  <label key={item.key} className="flex items-center gap-2 cursor-pointer p-2 rounded-lg border border-gray-200 hover:bg-white bg-white">
                    <input
                      type="checkbox"
                      checked={rentalDetails[item.key as keyof typeof rentalDetails] as boolean}
                      onChange={(e) => setRentalDetails(prev => ({ ...prev, [item.key]: e.target.checked }))}
                      className="w-4 h-4 rounded border-gray-300 text-[#007C8B] focus:ring-[#007C8B]"
                    />
                    <span className="text-sm text-gray-600">{item.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Info Box */}
            <div className="flex items-start gap-2 p-3 bg-yellow-50 rounded-lg">
              <Info className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-yellow-700">
                Clear rental terms help attract serious tenants. Be specific about deposits, 
                lease duration, and any preferences to avoid misunderstandings later.
              </p>
            </div>
          </div>
        </FormSection>

      {/* SECTION 2: LOCATION DETAILS */}
        <FormSection
          title="Location Details"
          icon={<MapPin className="w-5 h-5" />}
          defaultOpen={true}
        >
          <div className="space-y-4">
            {/* City and Society */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  City <span className="text-red-500">*</span>
                </label>
                <select
                  name="city"
                  value={formData.city}
                  onChange={handleInputChange}
                  onBlur={() => handleBlur('city')}
                  className={`w-full border rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-[#007C8B] focus:border-transparent ${
                    showError('city') ? 'border-red-500' : 'border-gray-300'
                  }`}
                >
                  <option value="">Select City</option>
                  {CITIES.map((city) => (
                    <option key={city} value={city}>
                      {city}
                    </option>
                  ))}
                </select>
                {showError('city') && (
                  <p className="error-message text-red-500 text-sm mt-1">
                    {errors.city}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Society/Scheme <span className="text-red-500">*</span>
                </label>
                <select
                  name="society"
                  value={formData.society}
                  onChange={handleInputChange}
                  onBlur={() => handleBlur('society')}
                  disabled={!formData.city}
                  className={`w-full border rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-[#007C8B] focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed ${
                    showError('society') ? 'border-red-500' : 'border-gray-300'
                  }`}
                >
                  <option value="">
                    {formData.city ? 'Select Society' : 'Select City First'}
                  </option>
                  {availableSocieties.map((society) => (
                    <option key={society} value={society}>
                      {society}
                    </option>
                  ))}
                </select>
                {showError('society') && (
                  <p className="error-message text-red-500 text-sm mt-1">
                    {errors.society}
                  </p>
                )}
              </div>
            </div>

            {/* Custom Society Name (if "Other" selected) */}
            {formData.society === 'Other' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Society Name <span className="text-red-500">*</span>
                </label>
                <Input
                  name="customSociety"
                  type="text"
                  placeholder="Enter society/scheme name"
                  value={formData.customSociety}
                  onChange={handleInputChange}
                  onBlur={() => handleBlur('customSociety')}
                  className={showError('customSociety') ? 'border-red-500' : ''}
                />
                {showError('customSociety') && (
                  <p className="error-message text-red-500 text-sm mt-1">
                    {errors.customSociety}
                  </p>
                )}
              </motion.div>
            )}

            {/* Phase, Block, Street */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phase
                </label>
                <Input
                  name="phase"
                  type="text"
                  placeholder="e.g., Phase 6"
                  value={formData.phase}
                  onChange={handleInputChange}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Block/Sector
                </label>
                <Input
                  name="block"
                  type="text"
                  placeholder="e.g., Block D"
                  value={formData.block}
                  onChange={handleInputChange}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Street/Plot No.
                </label>
                <Input
                  name="streetNumber"
                  type="text"
                  placeholder="e.g., Street 5"
                  value={formData.streetNumber}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            {/* Info box */}
            <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg">
              <Info className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-blue-700">
                Providing accurate location details helps tenants find your
                property easily. Phase, Block, and Street are optional but
                recommended.
              </p>
            </div>
          </div>
        </FormSection>

        {/* SECTION 3: PROPERTY DETAILS */}
        <FormSection
          title="Property Details"
          icon={
            showFields.isShopOrCommercial ? (
              <Store className="w-5 h-5" />
            ) : (
              <Settings className="w-5 h-5" />
            )
          }
          defaultOpen={true}
          badge={formData.propertyType}
        >
          <div className="space-y-4">
            {/* House/Apartment/Farmhouse Fields */}
            {(showFields.bedrooms || showFields.bathrooms || showFields.floors) && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {showFields.bedrooms && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Bedrooms <span className="text-red-500">*</span>
                    </label>
                    <Input
                      name="bedrooms"
                      type="number"
                      placeholder="0"
                      value={formData.bedrooms}
                      onChange={handleInputChange}
                      onBlur={() => handleBlur('bedrooms')}
                      min="0"
                      max="20"
                      className={showError('bedrooms') ? 'border-red-500' : ''}
                    />
                    {showError('bedrooms') && (
                      <p className="error-message text-red-500 text-xs mt-1">
                        {errors.bedrooms}
                      </p>
                    )}
                  </div>
                )}

                {showFields.bathrooms && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Bathrooms <span className="text-red-500">*</span>
                    </label>
                    <Input
                      name="bathrooms"
                      type="number"
                      placeholder="0"
                      value={formData.bathrooms}
                      onChange={handleInputChange}
                      onBlur={() => handleBlur('bathrooms')}
                      min="0"
                      max="15"
                      className={showError('bathrooms') ? 'border-red-500' : ''}
                    />
                    {showError('bathrooms') && (
                      <p className="error-message text-red-500 text-xs mt-1">
                        {errors.bathrooms}
                      </p>
                    )}
                  </div>
                )}

                {showFields.floors && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Floors
                    </label>
                    <Input
                      name="floors"
                      type="number"
                      placeholder="1"
                      value={formData.floors}
                      onChange={handleInputChange}
                      min="1"
                      max="10"
                    />
                  </div>
                )}

                {showFields.floorNumber && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Floor No. <span className="text-red-500">*</span>
                    </label>
                    <Input
                      name="floorNumber"
                      type="number"
                      placeholder="0"
                      value={formData.floorNumber}
                      onChange={handleInputChange}
                      onBlur={() => handleBlur('floorNumber')}
                      min="0"
                      max="100"
                      className={showError('floorNumber') ? 'border-red-500' : ''}
                    />
                    {showError('floorNumber') && (
                      <p className="error-message text-red-500 text-xs mt-1">
                        {errors.floorNumber}
                      </p>
                    )}
                  </div>
                )}

                {showFields.totalFloors && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Total Floors
                    </label>
                    <Input
                      name="totalFloors"
                      type="number"
                      placeholder="1"
                      value={formData.totalFloors}
                      onChange={handleInputChange}
                      min="1"
                      max="100"
                    />
                  </div>
                )}
              </div>
            )}

            {/* House/Farmhouse Checkboxes */}
            {(showFields.servantQuarter || showFields.basement) && (
              <div className="flex flex-wrap gap-4 pt-2">
                {showFields.servantQuarter && (
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      name="servantQuarter"
                      checked={formData.servantQuarter}
                      onChange={handleInputChange}
                      className="w-4 h-4 rounded border-gray-300 text-[#007C8B] focus:ring-[#007C8B]"
                    />
                    <span className="text-sm text-gray-700">Servant Quarter</span>
                  </label>
                )}

                {showFields.basement && (
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      name="basement"
                      checked={formData.basement}
                      onChange={handleInputChange}
                      className="w-4 h-4 rounded border-gray-300 text-[#007C8B] focus:ring-[#007C8B]"
                    />
                    <span className="text-sm text-gray-700">Basement</span>
                  </label>
                )}
              </div>
            )}

            {/* SHOP & COMMERCIAL SPECIFIC FIELDS */}
            {showFields.isShopOrCommercial && (
              <>
                {/* Floor Location & Position */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Floor Location <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="floorLocation"
                      value={formData.floorLocation}
                      onChange={handleInputChange}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-[#007C8B] focus:border-transparent"
                    >
                      {FLOOR_LOCATION_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Shop Position
                    </label>
                    <select
                      name="shopPosition"
                      value={formData.shopPosition}
                      onChange={handleInputChange}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-[#007C8B] focus:border-transparent"
                    >
                      {SHOP_POSITION_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Shop Dimensions */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Front Width (ft)
                    </label>
                    <Input
                      name="shopFrontWidth"
                      type="number"
                      placeholder="e.g., 15"
                      value={formData.shopFrontWidth}
                      onChange={handleInputChange}
                      min="1"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Depth (ft)
                    </label>
                    <Input
                      name="shopDepth"
                      type="number"
                      placeholder="e.g., 30"
                      value={formData.shopDepth}
                      onChange={handleInputChange}
                      min="1"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Bathrooms
                    </label>
                    <Input
                      name="bathrooms"
                      type="number"
                      placeholder="0"
                      value={formData.bathrooms}
                      onChange={handleInputChange}
                      min="0"
                      max="5"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Total Floors
                    </label>
                    <Input
                      name="totalFloors"
                      type="number"
                      placeholder="e.g., 5"
                      value={formData.totalFloors}
                      onChange={handleInputChange}
                      min="1"
                      max="100"
                    />
                  </div>
                </div>

                {/* Mezzanine & Electricity */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Mezzanine Area (Sq. Ft.)
                    </label>
                    <Input
                      name="mezzanineArea"
                      type="number"
                      placeholder="0 if none"
                      value={formData.mezzanineArea}
                      onChange={handleInputChange}
                      min="0"
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      Leave 0 if no mezzanine
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Electricity Load
                    </label>
                    <select
                      name="electricityLoad"
                      value={formData.electricityLoad}
                      onChange={handleInputChange}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-[#007C8B] focus:border-transparent"
                    >
                      {ELECTRICITY_LOAD_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Ceiling Height
                    </label>
                    <select
                      name="ceilingHeight"
                      value={formData.ceilingHeight}
                      onChange={handleInputChange}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-[#007C8B] focus:border-transparent"
                    >
                      {CEILING_HEIGHT_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Checkboxes for Shop */}
                <div className="flex flex-wrap gap-4 pt-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      name="hasMezzanine"
                      checked={formData.hasMezzanine}
                      onChange={handleInputChange}
                      className="w-4 h-4 rounded border-gray-300 text-[#007C8B] focus:ring-[#007C8B]"
                    />
                    <span className="text-sm text-gray-700">Has Mezzanine</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      name="hasWashroom"
                      checked={formData.hasWashroom}
                      onChange={handleInputChange}
                      className="w-4 h-4 rounded border-gray-300 text-[#007C8B] focus:ring-[#007C8B]"
                    />
                    <span className="text-sm text-gray-700">Has Washroom</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      name="hasSignage"
                      checked={formData.hasSignage}
                      onChange={handleInputChange}
                      className="w-4 h-4 rounded border-gray-300 text-[#007C8B] focus:ring-[#007C8B]"
                    />
                    <span className="text-sm text-gray-700">Signage Allowed</span>
                  </label>
                </div>

                {/* Suitable For */}
                <div className="pt-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Suitable For (Select all that apply)
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {SUITABLE_FOR_OPTIONS.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => handleSuitableForToggle(option.id)}
                        className={`px-3 py-1.5 rounded-full text-sm border transition-all ${
                          formData.suitableFor.includes(option.id)
                            ? 'bg-[#007C8B] text-white border-[#007C8B]'
                            : 'bg-white text-gray-600 border-gray-300 hover:border-[#007C8B]'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                  {formData.suitableFor.length > 0 && (
                    <p className="text-xs text-gray-500 mt-2">
                      {formData.suitableFor.length} selected
                    </p>
                  )}
                </div>
              </>
            )}

            {/* Plot-specific message */}
            {formData.propertyType === 'Plot' && (
              <div className="flex items-start gap-2 p-3 bg-yellow-50 rounded-lg">
                <Info className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-yellow-700">
                  For plots, bedrooms and bathrooms are not applicable. You can
                  specify features like Corner Plot, Park Facing, etc. in the
                  Features section below.
                </p>
              </div>
            )}
          </div>
        </FormSection>

        {/* SECTION 4: FEATURES & AMENITIES */}
        <FormSection
          title="Features & Amenities"
          icon={<Sparkles className="w-5 h-5" />}
          defaultOpen={false}
        >
          <div className="space-y-6">
            {/* Features Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {showFields.furnished && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Furnished Status
                  </label>
                  <select
                    name="furnished"
                    value={formData.furnished}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-[#007C8B] focus:border-transparent text-sm"
                  >
                    {FURNISHED_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {showFields.condition && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Condition
                  </label>
                  <select
                    name="condition"
                    value={formData.condition}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-[#007C8B] focus:border-transparent text-sm"
                  >
                    {CONDITION_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Facing
                </label>
                <select
                  name="facing"
                  value={formData.facing}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-[#007C8B] focus:border-transparent text-sm"
                >
                  {FACING_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Parking
                </label>
                <select
                  name="parking"
                  value={formData.parking}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-[#007C8B] focus:border-transparent text-sm"
                >
                  {PARKING_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Amenities */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Amenities
              </label>

              {/* Utilities */}
              <div className="mb-4">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                  Utilities
                </p>
                <div className="flex flex-wrap gap-2">
                  {groupedAmenities.utilities.map((amenity) => (
                    <button
                      key={amenity.id}
                      type="button"
                      onClick={() => handleAmenityToggle(amenity.id)}
                      className={`px-3 py-1.5 rounded-full text-sm border transition-all ${
                        formData.amenities.includes(amenity.id)
                          ? 'bg-[#007C8B] text-white border-[#007C8B]'
                          : 'bg-white text-gray-600 border-gray-300 hover:border-[#007C8B]'
                      }`}
                    >
                      {amenity.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Security */}
              <div className="mb-4">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                  Security
                </p>
                <div className="flex flex-wrap gap-2">
                  {groupedAmenities.security.map((amenity) => (
                    <button
                      key={amenity.id}
                      type="button"
                      onClick={() => handleAmenityToggle(amenity.id)}
                      className={`px-3 py-1.5 rounded-full text-sm border transition-all ${
                        formData.amenities.includes(amenity.id)
                          ? 'bg-[#007C8B] text-white border-[#007C8B]'
                          : 'bg-white text-gray-600 border-gray-300 hover:border-[#007C8B]'
                      }`}
                    >
                      {amenity.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Facilities */}
              <div className="mb-4">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                  Nearby Facilities
                </p>
                <div className="flex flex-wrap gap-2">
                  {groupedAmenities.facilities.map((amenity) => (
                    <button
                      key={amenity.id}
                      type="button"
                      onClick={() => handleAmenityToggle(amenity.id)}
                      className={`px-3 py-1.5 rounded-full text-sm border transition-all ${
                        formData.amenities.includes(amenity.id)
                          ? 'bg-[#007C8B] text-white border-[#007C8B]'
                          : 'bg-white text-gray-600 border-gray-300 hover:border-[#007C8B]'
                      }`}
                    >
                      {amenity.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Interior */}
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                  Interior Features
                </p>
                <div className="flex flex-wrap gap-2">
                  {groupedAmenities.interior.map((amenity) => (
                    <button
                      key={amenity.id}
                      type="button"
                      onClick={() => handleAmenityToggle(amenity.id)}
                      className={`px-3 py-1.5 rounded-full text-sm border transition-all ${
                        formData.amenities.includes(amenity.id)
                          ? 'bg-[#007C8B] text-white border-[#007C8B]'
                          : 'bg-white text-gray-600 border-gray-300 hover:border-[#007C8B]'
                      }`}
                    >
                      {amenity.label}
                    </button>
                  ))}
                </div>
              </div>

              {formData.amenities.length > 0 && (
                <p className="text-xs text-gray-500 mt-3">
                  {formData.amenities.length} amenities selected
                </p>
              )}
            </div>
          </div>
        </FormSection>

        {/* SECTION 5: POSSESSION & LEGAL */}
        <FormSection
          title="Possession & Legal"
          icon={<FileText className="w-5 h-5" />}
          defaultOpen={false}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Possession Status
              </label>
              <select
                name="possessionStatus"
                value={formData.possessionStatus}
                onChange={handleInputChange}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-[#007C8B] focus:border-transparent"
              >
                {POSSESSION_STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ownership Type
              </label>
              <select
                name="ownershipType"
                value={formData.ownershipType}
                onChange={handleInputChange}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-[#007C8B] focus:border-transparent"
              >
                {OWNERSHIP_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </FormSection>

        {/* SECTION 6: DESCRIPTION & MEDIA */}
        <FormSection
          title="Description & Media"
          icon={<FileText className="w-5 h-5" />}
          defaultOpen={true}
        >
          <div className="space-y-4">
            {/* ✅ Rich Text Description */}
            <div>
              <RichTextEditor
                label="Description"
                value={formData.description}
                onChange={(value: string) =>
                  setFormData((prev) => ({ ...prev, description: value }))
                }
                placeholder="Describe your rental property in detail. Include key features, nearby landmarks, rent terms, etc."
                error={touched.description ? errors.description : undefined}
                required
              />
              <p className="text-xs text-gray-400 mt-1">
                Use formatting tools to make your description stand out
              </p>
            </div>

            {/* Video URL */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Video URL (Optional)
              </label>
              <Input
                type="url"
                name="videoUrl"
                value={formData.videoUrl}
                onChange={handleInputChange}
                onBlur={() => handleBlur('videoUrl')}
                placeholder="https://youtube.com/watch?v=... or https://vimeo.com/..."
                className={showError('videoUrl') ? 'border-red-500' : ''}
              />
              {showError('videoUrl') ? (
                <p className="error-message text-red-500 text-sm mt-1">
                  {errors.videoUrl}
                </p>
              ) : (
                <p className="text-xs text-gray-500 mt-1">
                  Add a YouTube or Vimeo video tour of your property
                </p>
              )}
            </div>

            {/* ✅ Feature Image (Cover Photo) */}
            <div>
              <FileUploader
                label="Cover Photo (Feature Image)"
                value={featureImage}
                onChange={(val) => setFeatureImage(val)}
                folder="properties/covers"
                accept="image"
                required={mode === 'create'}
              />
              <p className="text-xs text-gray-400 mt-1">
                This will be the main image shown in search results
              </p>
            </div>

            {/* ✅ Gallery Images with Categories */}
            <div>
              <GalleryUploader
                label="Property Gallery"
                value={galleryImages}
                onChange={setGalleryImages}
                folder="properties/gallery"
                maxImages={15}
                showCategories={true}
              />
              <p className="text-xs text-gray-400 mt-1">
                Add multiple images (Exterior, Interior, Bedroom, Kitchen, etc.)
              </p>
            </div>
          </div>
        </FormSection>

        {/* SECTION 7: CONTACT PREFERENCES */}
        <FormSection
          title="Contact Preferences"
          icon={<Phone className="w-5 h-5" />}
          defaultOpen={false}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                WhatsApp Number (Optional)
              </label>
              <Input
                name="whatsappNumber"
                type="tel"
                placeholder="03XX-XXXXXXX"
                value={formData.whatsappNumber}
                onChange={handleInputChange}
                onBlur={() => handleBlur('whatsappNumber')}
                className={showError('whatsappNumber') ? 'border-red-500' : ''}
              />
              {showError('whatsappNumber') ? (
                <p className="error-message text-red-500 text-sm mt-1">
                  {errors.whatsappNumber}
                </p>
              ) : (
                <p className="text-xs text-gray-500 mt-1">
                  Tenants can contact you directly on WhatsApp
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Best Time to Contact
              </label>
              <select
                name="contactTime"
                value={formData.contactTime}
                onChange={handleInputChange}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-[#007C8B] focus:border-transparent"
              >
                {CONTACT_TIME_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </FormSection>

        {/* SUBMIT BUTTON */}
        <div className="pt-4">
          <Button
            type="submit"
            disabled={isSubmitting}
            className={`w-full py-3 text-base sm:text-lg rounded-xl bg-primary hover:bg-primary/90 text-white font-medium shadow-lg ${
              isSubmitting ? 'opacity-70 cursor-not-allowed' : ''
            }`}
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                {mode === 'edit' ? 'Saving Changes...' : 'Submitting Property...'}
              </span>
            ) : mode === 'edit' ? (
              'Save Changes'
            ) : (
              'Submit Property for Review'
            )}
          </Button>

          <p className="text-center text-xs text-gray-500 mt-3">
            By submitting, you agree to our Terms of Service and confirm that all
            information is accurate.
          </p>
        </div>
      </form>

      {/* ✅ Success Modal */}
      <SuccessModal
        isOpen={showSuccessModal}
        onClose={() => {
          setShowSuccessModal(false);
          router.push('/my-properties');
        }}
        propertyId={submittedProperty?.id}
        propertyTitle={submittedProperty?.title}
      />
    </div>
  );
}
