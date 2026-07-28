// hooks/usePropertyForm.ts

import { useState, useCallback, ChangeEvent } from 'react';
import {
  PropertyFormData,
  PropertyFormErrors,
  initialPropertyFormData,
} from '@/types/property';
import {
  validatePropertyForm,
  validateTitle,
  validatePrice,
  validateArea,
  validateDeveloper,
  validateCity,
  validateBedrooms,
  validateBathrooms,
  validateDescription,
  validateVideo,
  validateImages,
  hasErrors,
} from '@/lib/validators/propertyValidators';

interface UsePropertyFormReturn {
  formData: PropertyFormData;
  errors: PropertyFormErrors;
  touched: Record<string, boolean>;
  isSubmitting: boolean;
  handleChange: (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => void;
  handleCheckboxChange: (e: ChangeEvent<HTMLInputElement>) => void;
  handleImageChange: (files: File[]) => void;
  removeImage: (index: number) => void;
  handleBlur: (field: string) => void;
  validateField: (field: string) => void;
  validateAll: () => boolean;
  resetForm: () => void;
  setIsSubmitting: (value: boolean) => void;
}

export const usePropertyForm = (): UsePropertyFormReturn => {
  const [formData, setFormData] = useState<PropertyFormData>(initialPropertyFormData);
  const [errors, setErrors] = useState<PropertyFormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Handle text/select inputs
  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      const { name, value } = e.target;
      
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));

      // Clear error when user starts typing
      if (errors[name as keyof PropertyFormErrors]) {
        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors[name as keyof PropertyFormErrors];
          return newErrors;
        });
      }
    },
    [errors]
  );

  // Handle checkbox inputs
  const handleCheckboxChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const { name, checked } = e.target;
      setFormData((prev) => ({
        ...prev,
        [name]: checked,
      }));
    },
    []
  );

  // Handle image files
  const handleImageChange = useCallback(
    (files: File[]) => {
      setFormData((prev) => {
        const newImages = [...prev.images, ...files].slice(0, 10); // Max 10
        return {
          ...prev,
          images: newImages,
        };
      });

      // Clear image error
      if (errors.images) {
        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors.images;
          return newErrors;
        });
      }
    },
    [errors]
  );

  // Remove image by index
  const removeImage = useCallback((index: number) => {
    setFormData((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
  }, []);

  // Handle field blur (for real-time validation)
  const handleBlur = useCallback((field: string) => {
    setTouched((prev) => ({
      ...prev,
      [field]: true,
    }));
    validateField(field);
  }, []);

    // Validate single field
  const validateField = useCallback(
    (field: string) => {
      let error: string | undefined;

      switch (field) {
        case 'title':
          error = validateTitle(formData.title);
          break;
        case 'price':
          error = validatePrice(formData.price);
          break;
        case 'area':
          error = validateArea(formData.area);
          break;
        case 'developer':
          error = validateDeveloper(formData.developer);
          break;
        case 'city':
          error = validateCity(formData.city);
          break;
        case 'bedrooms':
          // Legacy validator propertyType expect karta hai
          error = validateBedrooms(formData.bedrooms, formData.propertyType);
          break;
        case 'bathrooms':
          error = validateBathrooms(formData.bathrooms, formData.propertyType);
          break;
        case 'description':
          error = validateDescription(formData.description);
          break;
        case 'video':
          // Legacy form field ka naam "video" hai (types/property.ts me)
          error = validateVideo(formData.video);
          break;
        case 'images':
          error = validateImages(formData.images);
          break;
      }

      setErrors((prev) => {
        if (error) {
          return { ...prev, [field]: error };
        } else {
          const newErrors = { ...prev };
          delete newErrors[field as keyof PropertyFormErrors];
          return newErrors;
        }
      });
    },
    [formData]
  );

  // Validate entire form
  const validateAll = useCallback((): boolean => {
    const newErrors = validatePropertyForm(formData);
    setErrors(newErrors);

    // Mark all fields as touched
    const allTouched: Record<string, boolean> = {};
    Object.keys(formData).forEach((key) => {
      allTouched[key] = true;
    });
    setTouched(allTouched);

    return !hasErrors(newErrors);
  }, [formData]);

  // Reset form
  const resetForm = useCallback(() => {
    setFormData(initialPropertyFormData);
    setErrors({});
    setTouched({});
    setIsSubmitting(false);
  }, []);

  return {
    formData,
    errors,
    touched,
    isSubmitting,
    handleChange,
    handleCheckboxChange,
    handleImageChange,
    removeImage,
    handleBlur,
    validateField,
    validateAll,
    resetForm,
    setIsSubmitting,
  };
};
