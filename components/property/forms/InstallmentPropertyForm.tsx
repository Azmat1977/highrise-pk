// components/property/forms/InstallmentPropertyForm.tsx

'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/router';
import {
  Upload,
  X,
  AlertCircle,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Info,
  Home,
  MapPin,
  Ruler,
  Building2,
  Wallet,
  Car,
  HardHat,
  Zap,
  Sparkles,
  Scale,
  Receipt,
  FileText,
  Image,
  MessageSquare,
  Phone,
  Save,
  Eye,
  Send,
  Calculator,
  TrendingUp,
  AlertTriangle,
  Clock,
  BadgeCheck,
  Landmark,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';

// Types & Constants
import {
  InstallmentFormData,
  InstallmentFormErrors,
  initialInstallmentFormData,
  PROVINCES,
  PROPERTY_TYPES_INSTALLMENT,
  LISTING_PURPOSE_OPTIONS,
  PROPERTY_CONDITION_OPTIONS,
  PLOT_CATEGORY_OPTIONS,
  PLOT_STATUS_OPTIONS,
  DEVELOPMENT_STATUS_OPTIONS,
  FACING_DIRECTION_OPTIONS,
  SPECIAL_FACING_OPTIONS,
  BOOKING_STATUS_OPTIONS,
  DOWN_PAYMENT_DUE_OPTIONS,
  POSSESSION_DUE_OPTIONS,
  POSSESSION_STATUS_OPTIONS_INST,
  BALLOT_STATUS_OPTIONS,
  PARKING_TYPE_OPTIONS,
  PARKING_INCLUDED_OPTIONS,
  PROJECT_TYPE_OPTIONS,
  PROJECT_STATUS_OPTIONS,
  APPROVAL_AUTHORITY_OPTIONS,
  APPROVAL_STATUS_OPTIONS,
  UTILITY_STATUS_OPTIONS,
  ROAD_CONDITION_OPTIONS,
  SECURITY_LEVEL_OPTIONS,
  FILE_TYPE_OPTIONS,
  TRANSFER_TYPE_OPTIONS,
  DOCUMENTS_AVAILABLE_OPTIONS,
  MAINTENANCE_CALCULATION_OPTIONS,
  MAINTENANCE_COVERS_OPTIONS,
  MAINTENANCE_INCLUDED_OPTIONS,
  CONTACT_METHOD_OPTIONS,
  CONTACT_TIME_OPTIONS_INST,
  INSTALLMENT_FORM_SECTIONS,
  formatPakistaniPrice,
  parsePakistaniPrice,
  priceToWords,
} from '@/types/installmentProperty';

import {
  CITIES,
  SOCIETIES,
  DEFAULT_SOCIETIES,
  AREA_UNITS,
  FLOOR_LOCATION_OPTIONS,
  SHOP_POSITION_OPTIONS,
  ELECTRICITY_LOAD_OPTIONS,
  CEILING_HEIGHT_OPTIONS,
  SUITABLE_FOR_OPTIONS,
  AMENITIES_LIST,
} from '@/types/property';

// Validators
import {
  validateInstallmentForm,
  hasInstallmentFormErrors,
  getErrorCountBySection,
  calculatePaymentBreakdown,
  calculateTotalCharges,
  getEarlyPaymentDiscountInfo,
  validateTitle,
  validateCity,
  validateSociety,
  validateArea,
  validateTotalPrice,
  validateBookingAmount,
  validateDescription,
  validatePhone,
  validateImages,
} from '@/lib/validators/installmentValidators';

// ✅ NEW: Image & Rich Text Components
import FileUploader from '@/components/admin/FileUploader';
import GalleryUploader, { GalleryImage } from '@/components/admin/GalleryUploader';
import RichTextEditor from '@/components/admin/RichTextEditor';
import SuccessModal from '@/components/ui/SuccessModal';

// ============================================
// SECTION ICONS MAP
// ============================================

const SECTION_ICONS: Record<string, React.ReactNode> = {
  basic: <Home className="w-5 h-5" />,
  location: <MapPin className="w-5 h-5" />,
  size: <Ruler className="w-5 h-5" />,
  property_details: <Building2 className="w-5 h-5" />,
  payment_plan: <Wallet className="w-5 h-5" />,
  parking: <Car className="w-5 h-5" />,
  project: <HardHat className="w-5 h-5" />,
  infrastructure: <Zap className="w-5 h-5" />,
  features: <Sparkles className="w-5 h-5" />,
  legal: <Scale className="w-5 h-5" />,
  taxes: <Receipt className="w-5 h-5" />,
  documents: <FileText className="w-5 h-5" />,
  media: <Image className="w-5 h-5" />,
  description: <MessageSquare className="w-5 h-5" />,
  contact: <Phone className="w-5 h-5" />,
};

// ============================================
// COLLAPSIBLE SECTION COMPONENT
// ============================================

interface FormSectionProps {
  id: string;
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
  isRequired?: boolean;
  isComplete?: boolean;
  errorCount?: number;
  badge?: string;
}

const FormSection = ({
  id,
  title,
  icon,
  children,
  isOpen,
  onToggle,
  isRequired = false,
  isComplete = false,
  errorCount = 0,
  badge,
}: FormSectionProps) => {
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
      <button
        type="button"
        onClick={onToggle}
        className="w-full px-4 py-3 sm:px-6 sm:py-4 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-[#029bba]">{icon}</span>
          <span className="font-semibold text-gray-800">{title}</span>
          
          {isRequired && (
            <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">
              Required
            </span>
          )}
          
          {badge && (
            <span className="text-xs bg-[#029bba] text-white px-2 py-0.5 rounded-full">
              {badge}
            </span>
          )}
          
          {isComplete && errorCount === 0 && (
            <CheckCircle className="w-4 h-4 text-green-500" />
          )}
          
          {errorCount > 0 && (
            <span className="flex items-center gap-1 text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">
              <AlertCircle className="w-3 h-3" />
              {errorCount} {errorCount === 1 ? 'error' : 'errors'}
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
            <div className="px-4 py-4 sm:px-6 sm:py-5 border-t border-gray-100">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ============================================
// PROGRESS BAR COMPONENT
// ============================================

interface ProgressBarProps {
  completedSections: number;
  totalSections: number;
  errors: InstallmentFormErrors;
}

const ProgressBar = ({ completedSections, totalSections, errors }: ProgressBarProps) => {
  const percentage = Math.round((completedSections / totalSections) * 100);
  const hasErrors = Object.keys(errors).length > 0;
  
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200 mb-6">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-700">
          Form Progress
        </span>
        <span className="text-sm text-gray-500">
          {completedSections}/{totalSections} sections
        </span>
      </div>
      
      <div className="w-full bg-gray-200 rounded-full h-2.5">
        <div
          className={`h-2.5 rounded-full transition-all duration-300 ${
            hasErrors ? 'bg-yellow-500' : 'bg-green-500'
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      
      {hasErrors && (
        <p className="text-xs text-yellow-600 mt-2 flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" />
          Please fix errors before submitting
        </p>
      )}
    </div>
  );
};

// ============================================
// INFO BOX COMPONENT
// ============================================

interface InfoBoxProps {
  children: React.ReactNode;
  type?: 'info' | 'warning' | 'success' | 'error';
}

const InfoBox = ({ children, type = 'info' }: InfoBoxProps) => {
  const styles = {
    info: 'bg-blue-50 text-blue-700 border-blue-200',
    warning: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    success: 'bg-green-50 text-green-700 border-green-200',
    error: 'bg-red-50 text-red-700 border-red-200',
  };
  
  const icons = {
    info: <Info className="w-4 h-4 text-blue-500 flex-shrink-0" />,
    warning: <AlertTriangle className="w-4 h-4 text-yellow-500 flex-shrink-0" />,
    success: <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />,
    error: <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />,
  };
  
  return (
    <div className={`flex items-start gap-2 p-3 rounded-lg border ${styles[type]}`}>
      {icons[type]}
      <div className="text-xs">{children}</div>
    </div>
  );
};

// ============================================
// PAYMENT SUMMARY CARD COMPONENT
// ============================================

interface PaymentSummaryProps {
  formData: InstallmentFormData;
}

const PaymentSummaryCard = ({ formData }: PaymentSummaryProps) => {
  const breakdown = calculatePaymentBreakdown(formData);
  const charges = calculateTotalCharges(formData);

  if (breakdown.totalPrice === 0) {
    return null;
  }

  return (
    <Card className="p-4 bg-gradient-to-br from-[#029bba]/5 to-[#029bba]/10 border-[#029bba]/20">
      <div className="flex items-center gap-2 mb-4">
        <Calculator className="w-5 h-5 text-[#029bba]" />
        <h3 className="font-semibold text-gray-800">Payment Summary</h3>
      </div>

      {/* Price Breakdown */}
      <div className="space-y-2 mb-4">
        {/* Original price + discount info */}
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">
              Total Price
              {breakdown.discountAmount > 0 ? ' (before discount)' : ''}:
            </span>
            <span className="font-semibold">
              Rs.{` `}
              {formatPakistaniPrice(
                breakdown.originalTotalPrice ?? breakdown.totalPrice
              )}
            </span>
          </div>

          {breakdown.discountAmount > 0 && (
            <>
              <div className="flex justify-between text-xs">
                <span className="text-gray-600">
                  Early Payment Discount ({breakdown.discountPercent}%):
                </span>
                <span className="text-green-600">
                  − Rs. {formatPakistaniPrice(breakdown.discountAmount)}
                </span>
              </div>
              <div className="flex justify-between text-sm font-medium">
                <span>Net Price after discount:</span>
                <span className="font-semibold text-[#029bba]">
                  Rs.{' '}
                  {formatPakistaniPrice(
                    breakdown.netPrice ?? breakdown.totalPrice
                  )}
                </span>
              </div>
            </>
          )}
        </div>

        {/* Booking / DP / Installments / Possession */}
        <div className="border-t border-gray-200 pt-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">
              Booking ({breakdown.bookingPercent}%):
            </span>
            <span>Rs. {formatPakistaniPrice(breakdown.booking)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">
              Down Payment ({breakdown.downPaymentPercent}%):
            </span>
            <span>Rs. {formatPakistaniPrice(breakdown.downPayment)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">
              Installments ({breakdown.installmentsPercent}%):
            </span>
            <span>Rs. {formatPakistaniPrice(breakdown.installments)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">
              Possession ({breakdown.possessionPercent}%):
            </span>
            <span>Rs. {formatPakistaniPrice(breakdown.possession)}</span>
          </div>
        </div>

        {/* Plan Total */}
        <div className="border-t border-gray-200 pt-2">
          <div className="flex justify-between text-sm font-medium">
            <span>Plan Total ({breakdown.grandTotalPercent}%):</span>
            <span
              className={
                breakdown.isBalanced ? 'text-green-600' : 'text-red-600'
              }
            >
              Rs. {formatPakistaniPrice(breakdown.grandTotal)}
            </span>
          </div>

          {!breakdown.isBalanced && (
            <p className="text-xs text-red-500 mt-1">
              Difference: Rs.{` `}
              {formatPakistaniPrice(Math.abs(breakdown.difference))}
            </p>
          )}
        </div>
      </div>

      {/* Additional Charges & Taxes */}
      {(charges.totalCharges > 0 ||
        charges.govtTaxesFiler > 0 ||
        charges.govtTaxesNonFiler > 0) && (
        <div className="border-t border-gray-200 pt-3 mt-3">
          <p className="text-xs font-medium text-gray-700 mb-2">
            Additional One-Time Charges:
          </p>

          {/* Developer Extra Charges */}
          {charges.extraCharges > 0 && (
            <div className="flex justify-between text-xs text-gray-600">
              <span>Developer Extra Charges:</span>
              <span>Rs. {formatPakistaniPrice(charges.extraCharges)}</span>
            </div>
          )}

          {/* Possession Charges */}
          {charges.possessionCharges > 0 && (
            <div className="flex justify-between text-xs text-gray-600">
              <span>Possession Charges:</span>
              <span>
                Rs. {formatPakistaniPrice(charges.possessionCharges)}
              </span>
            </div>
          )}

          {/* Society / Transfer Charges */}
          {charges.transferCharges > 0 && (
            <div className="flex justify-between text-xs text-gray-600">
              <span>Society / Transfer Charges:</span>
              <span>
                Rs. {formatPakistaniPrice(charges.transferCharges)}
              </span>
            </div>
          )}

          {/* Government Taxes */}
          {(charges.govtTaxesFiler > 0 ||
            charges.govtTaxesNonFiler > 0) && (
            <>
              <p className="text-xs font-medium text-gray-700 mt-3 mb-1">
                Government Taxes (Estimated at Transfer):
              </p>

              {charges.govtTaxesFiler > 0 && (
                <div className="flex justify-between text-xs text-gray-600">
                  <span>Govt Taxes (Filer):</span>
                  <span>
                    Rs. {formatPakistaniPrice(charges.govtTaxesFiler)}
                  </span>
                </div>
              )}

              {charges.govtTaxesNonFiler > 0 && (
                <div className="flex justify-between text-xs text-gray-600">
                  <span>Govt Taxes (Non-Filer):</span>
                  <span>
                    Rs. {formatPakistaniPrice(charges.govtTaxesNonFiler)}
                  </span>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Grand Total */}
      <div className="border-t border-[#029bba]/30 pt-3 mt-3">
        <div className="flex justify-between text-sm">
          <span className="font-medium text-gray-700">
            Grand Total (Filer):
          </span>
          <span className="font-bold text-[#029bba]">
            Rs. {formatPakistaniPrice(charges.grandTotalFiler)}
          </span>
        </div>
        <div className="flex justify-between text-sm mt-1">
          <span className="font-medium text-gray-700">
            Grand Total (Non-Filer):
          </span>
          <span className="font-bold text-orange-600">
            Rs. {formatPakistaniPrice(charges.grandTotalNonFiler)}
          </span>
        </div>

        <p className="text-xs text-gray-500 mt-2">
          ≈ {priceToWords(charges.grandTotalFiler)} (Filer)
        </p>
      </div>
    </Card>
  );
};

// ============================================
// MAIN FORM COMPONENT
// ============================================

interface InstallmentFormProps {
  mode?: 'create' | 'edit';
  propertyId?: string;
  initialData?: Partial<InstallmentFormData>;
  // ✅ Optional: when this property is being added under a project
  projectId?: string;
  projectCategory?: 'highrise' | 'society';
}

/** 🔹 1–30% options for Booking / Down Payment (baad mein Possession ke liye bhi use ho sakta) */
const PERCENT_OPTIONS: number[] = Array.from({ length: 30 }, (_, i) => i + 1);

/** 🔹 TotalPrice + Percent se Amount nikalne ka helper */
const calculateAmountFromPercent = (
  totalPriceStr: string,
  percentStr: string
): string => {
  const total = parsePakistaniPrice(totalPriceStr || '0');
  const percent = Number(percentStr);

  if (!total || !percent) return '';

  const amount = Math.round((total * percent) / 100);
  return formatPakistaniPrice(amount.toString());
};

/** 🔹 NET price ke basis par remaining principal jo installments se cover hoga */
const calculateRemainingPrincipal = (data: InstallmentFormData): number => {
  // Net price after early payment discount
  const { netPrice } = getEarlyPaymentDiscountInfo(data);
  const total =
    netPrice || parsePakistaniPrice(data.totalPrice || '0') || 0;

  const booking = parsePakistaniPrice(data.bookingAmount || '0');
  const downPayment = parsePakistaniPrice(data.downPaymentAmount || '0');
  const possession = parsePakistaniPrice(data.possessionAmount || '0');

  const remaining = total - booking - downPayment - possession;

  if (!Number.isFinite(remaining) || remaining <= 0) return 0;

  return remaining;
};

/** 🔹 Active installment frequency ke amounts ko dobara calculate karein */
const recalculateInstallmentAmountsForActivePlan = (
  data: InstallmentFormData
): InstallmentFormData => {
  const updated: InstallmentFormData = { ...data };
  const plan: any = { ...(updated.installmentPlan || {}) };

  const remaining = calculateRemainingPrincipal(updated);

  if (!Number.isFinite(remaining) || remaining <= 0) {
    // Active frequencies ke amounts clear kar do
    if (plan.hasMonthly) plan.monthlyAmount = '';
    if (plan.hasQuarterly) plan.quarterlyAmount = '';
    if (plan.hasHalfYearly) plan.halfYearlyAmount = '';
    if (plan.hasYearly) plan.yearlyAmount = '';
    updated.installmentPlan = plan;
    return updated;
  }

  // Monthly
  if (plan.hasMonthly && plan.monthlyCount) {
    const count = Number(plan.monthlyCount) || 0;
    if (count > 0) {
      const per = Math.round(remaining / count);
      plan.monthlyAmount = formatPakistaniPrice(per.toString());
    }
  }

  // Quarterly
  if (plan.hasQuarterly && plan.quarterlyCount) {
    const count = Number(plan.quarterlyCount) || 0;
    if (count > 0) {
      const per = Math.round(remaining / count);
      plan.quarterlyAmount = formatPakistaniPrice(per.toString());
    }
  }

  // Half‑Yearly
  if (plan.hasHalfYearly && plan.halfYearlyCount) {
    const count = Number(plan.halfYearlyCount) || 0;
    if (count > 0) {
      const per = Math.round(remaining / count);
      plan.halfYearlyAmount = formatPakistaniPrice(per.toString());
    }
  }

  // Yearly
  if (plan.hasYearly && plan.yearlyCount) {
    const count = Number(plan.yearlyCount) || 0;
    if (count > 0) {
      const per = Math.round(remaining / count);
      plan.yearlyAmount = formatPakistaniPrice(per.toString());
    }
  }

  updated.installmentPlan = plan;
  return updated;
};

/** 🔹 Booking / Down Payment / Possession amounts ko NET price pe dobara calculate karne ka helper */
const recalculatePercentBasedAmounts = (
  data: InstallmentFormData
): InstallmentFormData => {
  let updated: InstallmentFormData = { ...data };

  // NET price (Total − Early Discount)
  const { netPrice } = getEarlyPaymentDiscountInfo(updated);
  const effectiveTotal =
    netPrice || parsePakistaniPrice(updated.totalPrice || '0') || 0;
  const effectiveTotalStr = effectiveTotal.toString();

  // Booking
  if (updated.bookingPercent) {
    updated.bookingAmount = calculateAmountFromPercent(
      effectiveTotalStr,
      updated.bookingPercent
    );
  }

  // Down Payment
  if (updated.downPaymentPercent) {
    updated.downPaymentAmount = calculateAmountFromPercent(
      effectiveTotalStr,
      updated.downPaymentPercent
    );
  }

  // Possession
  if (updated.possessionPercent) {
    updated.possessionAmount = calculateAmountFromPercent(
      effectiveTotalStr,
      updated.possessionPercent
    );
  }

  // Installment plan amounts ko bhi new remaining principal se recalc karo
  updated = recalculateInstallmentAmountsForActivePlan(updated);

  return updated;
};

export default function InstallmentPropertyForm({
  mode = 'create',
  propertyId,
  initialData,
  projectId,
  projectCategory,
}: InstallmentFormProps) {
  console.log(
    'FORM props.initialData.parkingDetails:',
    (initialData as any)?.parkingDetails
  );

  const router = useRouter();

  // ============================================
  // STATE MANAGEMENT
  // ============================================

const [formData, setFormData] = useState<InstallmentFormData>(initialInstallmentFormData);
  const [errors, setErrors] = useState<InstallmentFormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  
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

  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    basic: true,
    location: true,
    size: false,
    property_details: false,
    payment_plan: false,
    parking: false,
    project: false,
    infrastructure: false,
    features: false,
    legal: false,
    taxes: false,
    documents: false,
    media: false,
    description: false,
    contact: false,
  });

  // WHT / Advance Tax input mode + percents (UI only)
  const [whtMode, setWhtMode] = useState<'amount' | 'percent'>('amount');
  const [whtPercents, setWhtPercents] = useState<{
    whtFilerPercent: string;
    whtNonFilerPercent: string;
    advanceTaxFilerPercent: string;
    advanceTaxNonFilerPercent: string;
  }>({
    whtFilerPercent: '',
    whtNonFilerPercent: '',
    advanceTaxFilerPercent: '',
    advanceTaxNonFilerPercent: '',
  });

  // Image handling
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);

  // Document handling
  const [documentPreviews, setDocumentPreviews] = useState<Record<string, string>>({});

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [isSavingDraft, setIsSavingDraft] = useState(false);

 // ============================================
// PREFILL IN EDIT MODE
// ============================================

useEffect(() => {
  if (mode === 'edit' && initialData) {
    setFormData((prev) => {
      const merged = { ...prev, ...initialData } as any;

      const recalced = recalculatePercentBasedAmounts(merged as any);

      // ✅ IMPORTANT: merged ko preserve rakho, taa ke parkingDetails/legal/etc drop na hon
      return { ...merged, ...(recalced as any) };
    });

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
  }
}, [mode, initialData]);

  // ============================================
  // AUTH CHECK
  // ============================================

  useEffect(() => {
    const user = localStorage.getItem('user');
    if (!user) {
      alert('Please login to add a property');
      router.push('/');
    }
  }, [router]);

    // ============================================
  // COMPUTED VALUES
  // ============================================

  // Get societies based on selected city
  const availableSocieties = useMemo(() => {
    if (!formData.city) return [];
    return SOCIETIES[formData.city] || DEFAULT_SOCIETIES;
  }, [formData.city]);

  // Get property types based on category
  const availablePropertyTypes = useMemo(() => {
    return PROPERTY_TYPES_INSTALLMENT[formData.propertyCategory] || [];
  }, [formData.propertyCategory]);

  // Determine which fields to show based on property type
  const showFields = useMemo(() => {
    const type = formData.propertyType;

    const houseTypes = ['House', 'Villa', 'Farmhouse'];
    const flatTypes = ['Apartment', 'Penthouse'];
    const residentialTypes = [...houseTypes, ...flatTypes];
    const plotTypes = ['Plot'];

    const shopLikeTypes = ['Shop', 'Food Court', 'Hall']; // Hall = Hall/Showroom
    const officeTypes = ['Office'];
    const warehouseTypes = ['Warehouse', 'Industrial']; // Industrial ko warehouse jaisa treat kar rahe hain
    const commercialVertical = [...shopLikeTypes, ...officeTypes];

    const isHouse = houseTypes.includes(type);
    const isFlat = flatTypes.includes(type);
    const isResidential = residentialTypes.includes(type);
    const isPlot = plotTypes.includes(type);
    const isShopLike = shopLikeTypes.includes(type);
    const isOffice = officeTypes.includes(type);
    const isWarehouseLike = warehouseTypes.includes(type);
    const isCommercialVertical = commercialVertical.includes(type);

    return {
      // ========= Residential (House / Apartment etc.) =========
      bedrooms: isResidential,
      bathrooms: isResidential,

      floors: isHouse,
      servantQuarter: isHouse,
      garage: isHouse,
      lawn: isHouse,
      // ✅ Porch sirf House/Villa/Farmhouse ke liye
      porch: isHouse,

      // Basement: houses + kuch commercial jahan basement common hota hai
      basement: isHouse || isShopLike || isOffice,

      // ========= Apartments & vertical units =========
      floorNumber: isFlat || isCommercialVertical,
      totalFloors: isFlat || isCommercialVertical,
      apartmentType: isFlat,
      view: isFlat,

      // ========= Plot specific =========
      plotCategory: isPlot,
      plotStatus: isPlot,
      developmentStatus: isPlot,
      facing: isPlot || ['House', 'Villa'].includes(type),
      cornerPlot: isPlot,

      // Front Width / Depth sirf un types par jahan frontage meaningful hai
      plotDimensions: isPlot || isShopLike || isWarehouseLike || isHouse,

      // ========= Shop / Commercial =========
      shopDetails: isShopLike || isOffice || isWarehouseLike,
      floorLocation: isShopLike || isOffice,
      shopPosition: isShopLike || isOffice,
      mezzanine: isShopLike || isOffice || isWarehouseLike,
      suitableFor: isShopLike || isOffice || isWarehouseLike,

      // ========= General =========
      coveredArea: !isPlot, // plot ke ilawa sab ke liye
      parking: true,
    };
  }, [formData.propertyType]);

  // Calculate section completion
  const sectionErrorCounts = useMemo(() => {
    return getErrorCountBySection(errors);
  }, [errors]);

  const completedSectionsCount = useMemo(() => {
    let count = 0;
    INSTALLMENT_FORM_SECTIONS.forEach((section) => {
      if (sectionErrorCounts[section.id] === 0) {
        count++;
      }
    });
    return count;
  }, [sectionErrorCounts]);

  // Base for WHT/Advance Tax percentage mode (Net Price after discount)
  const whtBase = useMemo(() => {
    const { netPrice } = getEarlyPaymentDiscountInfo(formData);
    const parsedTotal = parsePakistaniPrice(formData.totalPrice || '0') || 0;
    return netPrice || parsedTotal || 0;
  }, [formData]);

  // ============================================
// EVENT HANDLERS
// ============================================

// Toggle section
const toggleSection = useCallback((sectionId: string) => {
  setOpenSections((prev) => ({
    ...prev,
    [sectionId]: !prev[sectionId],
  }));
}, []);

// Generic input handler
const handleInputChange = useCallback(
  (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value, type } = e.target;
    const newValue =
      type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;

    setFormData((prev) => {
      let updated: any = { ...prev };

      // Nested fields (e.g. "installmentPlan.hasMonthly")
      if (name.includes('.')) {
        const parts = name.split('.');
        let current: any = updated;

        for (let i = 0; i < parts.length - 1; i++) {
          const part = parts[i];
          if (!current[part]) {
            current[part] = {};
          } else {
            current[part] = { ...current[part] };
          }
          current = current[part];
        }

        current[parts[parts.length - 1]] = newValue as any;
      } else {
        updated = { ...prev, [name]: newValue };
      }

      // Installment Plan – sirf ek frequency ko allow karo (Monthly / Quarterly / Half-Yearly / Yearly)
      if (
        type === 'checkbox' &&
        (name === 'installmentPlan.hasMonthly' ||
          name === 'installmentPlan.hasQuarterly' ||
          name === 'installmentPlan.hasHalfYearly' ||
          name === 'installmentPlan.hasYearly')
      ) {
        const plan: any = { ...(updated.installmentPlan || {}) };

        if (newValue) {
          // Pehle sab ko OFF + amounts clear
          plan.hasMonthly = false;
          plan.hasQuarterly = false;
          plan.hasHalfYearly = false;
          plan.hasYearly = false;

          plan.monthlyAmount = '';
          plan.monthlyCount = '';
          plan.quarterlyAmount = '';
          plan.quarterlyCount = '';
          plan.halfYearlyAmount = '';
          plan.halfYearlyCount = '';
          plan.yearlyAmount = '';
          plan.yearlyCount = '';

          // Ab jis ko user ne check kia hai usko ON karo
          if (name === 'installmentPlan.hasMonthly') plan.hasMonthly = true;
          if (name === 'installmentPlan.hasQuarterly') plan.hasQuarterly = true;
          if (name === 'installmentPlan.hasHalfYearly')
            plan.hasHalfYearly = true;
          if (name === 'installmentPlan.hasYearly') plan.hasYearly = true;
        } else {
          // Agar user ne koi frequency uncheck ki, sirf uska flag off karo
          if (name === 'installmentPlan.hasMonthly') plan.hasMonthly = false;
          if (name === 'installmentPlan.hasQuarterly')
            plan.hasQuarterly = false;
          if (name === 'installmentPlan.hasHalfYearly')
            plan.hasHalfYearly = false;
          if (name === 'installmentPlan.hasYearly') plan.hasYearly = false;
        }

        updated.installmentPlan = plan;
      }

      // Property-wise special resets
      if (name === 'propertyCategory') {
        updated.propertyType =
          PROPERTY_TYPES_INSTALLMENT[
            value as 'residential' | 'commercial'
          ]?.[0]?.value || 'Plot';
        updated.propertySubtype = '';
      }

      if (name === 'city') {
        updated.society = '';
        updated.customSociety = '';
      }

      if (name === 'propertyType') {
        updated.bedrooms = '';
        updated.bathrooms = '';
        updated.floors = '1';
        updated.floorNumber = '';
        updated.totalFloors = '';
        updated.apartmentType = '';
        updated.plotCategory = 'residential';
        updated.floorLocation = 'ground';
        updated.shopPosition = '';
        updated.suitableFor = [];
      }

      if (name === 'listingPurpose') {
        updated.isResale = value === 'resale';
      }

      // 🔹 Early Payment Discount change → booking / DP / possession + installments ko NET price se recalc karo
      if (name === 'earlyPaymentDiscount') {
        updated = recalculatePercentBasedAmounts(updated);
      }

      return updated;
    });

    // Field error clear karo (agar koi ho)
    if (errors[name as keyof InstallmentFormErrors]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name as keyof InstallmentFormErrors];
        return newErrors;
      });
    }

    // Global payment plan error bhi clear karo
    if (errors.paymentPlanTotal) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors.paymentPlanTotal;
        return newErrors;
      });
    }

    if (submitError) {
      setSubmitError('');
    }
  },
  [errors, submitError]
);

// Handle price fields with Pakistani formatting (supports nested fields)
const handlePriceChange = useCallback(
  (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const formatted = formatPakistaniPrice(value);

    setFormData((prev) => {
      const updated: any = { ...prev };

      if (name.includes('.')) {
        const parts = name.split('.');
        let current: any = updated;

        for (let i = 0; i < parts.length - 1; i++) {
          const part = parts[i];
          current[part] = { ...(current[part] || {}) };
          current = current[part];
        }

        current[parts[parts.length - 1]] = formatted as any;
        return updated;
      }

      updated[name] = formatted;
      return updated;
    });

    if (errors[name as keyof InstallmentFormErrors]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name as keyof InstallmentFormErrors];
        return newErrors;
      });
    }

    if (submitError) setSubmitError('');
  },
  [errors, submitError]
);

/** 🔹 Percent dropdown ka handler (BookingPercent / DownPaymentPercent / PossessionPercent) */
const handlePercentChange = useCallback(
  (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;

    setFormData((prev) => {
      const updated: InstallmentFormData = {
        ...prev,
        [name]: value,
      };

      // BookingAmount / DownPaymentAmount / PossessionAmount ko NET price se recalc karo
      return recalculatePercentBasedAmounts(updated);
    });
  },
  []
);

/** 🔹 Total Price change wrapper – formatting + percent-based amounts recalc */
const handleTotalPriceChange = useCallback(
  (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name } = e.target;

    // Formatting
    handlePriceChange(e);

    // Agar totalPrice change hua, to Booking / Down Payment / Possession + installments recalc karo
    if (name === 'totalPrice') {
      setFormData((prev) => recalculatePercentBasedAmounts(prev));
    }
  },
  [handlePriceChange]
);

/** 🔹 Monthly "Number of Months" change handler – auto-calculates monthlyAmount */
const handleMonthlyCountChange = useCallback(
  (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    const count = Number(value) || 0;

    setFormData((prev) => {
      const updated: any = { ...prev };
      const plan: any = { ...(updated.installmentPlan || {}) };

      plan.hasMonthly = plan.hasMonthly ?? true;
      plan.monthlyCount = value;

      const remaining = calculateRemainingPrincipal(updated);

      if (remaining > 0 && count > 0) {
        const perMonth = Math.round(remaining / count);
        plan.monthlyAmount = formatPakistaniPrice(perMonth.toString());
      } else {
        plan.monthlyAmount = '';
      }

      updated.installmentPlan = plan;
      return updated;
    });
  },
  []
);

/** 🔹 Quarterly "Number of Quarters" change handler – auto-calculates quarterlyAmount */
const handleQuarterlyCountChange = useCallback(
  (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    const count = Number(value) || 0;

    setFormData((prev) => {
      const updated: any = { ...prev };
      const plan: any = { ...(updated.installmentPlan || {}) };

      plan.hasQuarterly = plan.hasQuarterly ?? true;
      plan.quarterlyCount = value;

      const remaining = calculateRemainingPrincipal(updated);

      if (remaining > 0 && count > 0) {
        const perQuarter = Math.round(remaining / count);
        plan.quarterlyAmount = formatPakistaniPrice(perQuarter.toString());
      } else {
        plan.quarterlyAmount = '';
      }

      updated.installmentPlan = plan;
      return updated;
    });
  },
  []
);

/** 🔹 Half-Yearly "Number of Half-Years" change handler – auto-calculates halfYearlyAmount */
const handleHalfYearlyCountChange = useCallback(
  (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    const count = Number(value) || 0;

    setFormData((prev) => {
      const updated: any = { ...prev };
      const plan: any = { ...(updated.installmentPlan || {}) };

      plan.hasHalfYearly = plan.hasHalfYearly ?? true;
      plan.halfYearlyCount = value;

      const remaining = calculateRemainingPrincipal(updated);

      if (remaining > 0 && count > 0) {
        const perHalfYear = Math.round(remaining / count);
        plan.halfYearlyAmount = formatPakistaniPrice(perHalfYear.toString());
      } else {
        plan.halfYearlyAmount = '';
      }

      updated.installmentPlan = plan;
      return updated;
    });
  },
  []
);

/** 🔹 Yearly "Number of Years" change handler – auto-calculates yearlyAmount */
const handleYearlyCountChange = useCallback(
  (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    const count = Number(value) || 0;

    setFormData((prev) => {
      const updated: any = { ...prev };
      const plan: any = { ...(updated.installmentPlan || {}) };

      plan.hasYearly = plan.hasYearly ?? true;
      plan.yearlyCount = value;

      const remaining = calculateRemainingPrincipal(updated);

      if (remaining > 0 && count > 0) {
        const perYear = Math.round(remaining / count);
        plan.yearlyAmount = formatPakistaniPrice(perYear.toString());
      } else {
        plan.yearlyAmount = '';
      }

      updated.installmentPlan = plan;
      return updated;
    });
  },
  []
);

// Helper: optional text formatting
const formatToLacCrore = (amount: number): string => {
  if (isNaN(amount) || amount === 0) return '0';

  if (amount >= 10000000) {
    const crore = amount / 10000000;
    return crore % 1 === 0 ? `${crore} Crore` : `${crore.toFixed(2)} Crore`;
  } else if (amount >= 100000) {
    const lac = amount / 100000;
    return lac % 1 === 0 ? `${lac} Lac` : `${lac.toFixed(2)} Lac`;
  } else if (amount >= 1000) {
    const thousand = amount / 1000;
    return thousand % 1 === 0
      ? `${thousand} Thousand`
      : `${thousand.toFixed(2)} Thousand`;
  }

  return amount.toLocaleString('en-PK');
};

// Handle checkbox-array toggle
const handleArrayToggle = useCallback((fieldName: string, value: string) => {
  setFormData((prev) => {
    const currentArray =
      (prev[fieldName as keyof InstallmentFormData] as string[]) || [];
    const isSelected = currentArray.includes(value);

    return {
      ...prev,
      [fieldName]: isSelected
        ? currentArray.filter((item) => item !== value)
        : [...currentArray, value],
    };
  });
}, []);

// Blur handling
const handleBlur = useCallback((field: string) => {
  setTouched((prev) => ({ ...prev, [field]: true }));
}, []);

// Image upload
const handleImageUpload = useCallback(
  (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);

    if (formData.images.length + files.length > 30) {
      setErrors((prev) => ({
        ...prev,
        images: 'Maximum 30 images allowed',
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
  },
  [formData.images.length]
);

// Remove image
const removeImage = useCallback(
  (index: number) => {
    URL.revokeObjectURL(imagePreviews[index]);

    setFormData((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
  },
  [imagePreviews]
);

// Document upload
const handleDocumentUpload = useCallback(
  (
    e: React.ChangeEvent<HTMLInputElement>,
    fieldName: string,
    multiple: boolean = false
  ) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const maxSize = 10 * 1024 * 1024;
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];

    for (const file of files) {
      if (!allowedTypes.includes(file.type)) {
        alert('Only PDF, JPG, PNG, and WebP files are allowed');
        return;
      }
      if (file.size > maxSize) {
        alert('Each document must be less than 10MB');
        return;
      }
    }

    if (multiple) {
      setFormData((prev) => ({
        ...prev,
        [fieldName]: [
          ...(((prev[fieldName as keyof InstallmentFormData] as File[]) ||
            []) as File[]),
          ...files,
        ],
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [fieldName]: files[0],
      }));
    }
  },
  []
);

// Error helper
const showError = useCallback(
  (field: keyof InstallmentFormErrors) => {
    return touched[field] && errors[field];
  },
  [touched, errors]
);

  // ============================================
  // FORM SUBMIT (CREATE + EDIT)
  // ============================================

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

    // 1) Validate against current UI fields
    const validationErrors = validateInstallmentForm(formData);

    // Images ab FileUploader/GalleryUploader handle kar rahe hain
    delete validationErrors.images;

    setErrors(validationErrors);

    const touchedWithErrors: Record<string, boolean> = {};
    Object.keys(validationErrors).forEach((key) => {
      touchedWithErrors[key] = true;
    });
    setTouched((prev) => ({ ...prev, ...touchedWithErrors }));

    if (hasInstallmentFormErrors(validationErrors)) {
      setSubmitError(
        'Some required fields are missing or invalid. Please fix the highlighted sections.'
      );
      const firstErrorEl = document.querySelector('.error-message');
      if (firstErrorEl) {
        firstErrorEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    // 2) Get logged-in user
    const userStr = localStorage.getItem('user');
    if (!userStr) {
      setSubmitError('Please login to submit a property.');
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
      // 🔹 Nested installmentPlan se flat fields derive karo
      const plan = formData.installmentPlan || {};

      // ✅ Build amenities[] from Features & Amenities checkboxes (so backend receives fields.amenities)
      const FEATURE_AMENITY_KEYS = [
        // Interior features checkboxes
        'centralHeating',
        'intercom',
        'smartHome',
        'doubleGlazedWindows',

        // Exterior features
        'boundaryWall',
        'garden',
        'swimmingPool',
        'terrace',

        // Building amenities
        'elevator',
        'generator',
        'fireSafety',
        'reception',
        'gym',
        'buildingPool',
        'communityHall',
        'kidsPlayArea',
        'prayerRoom',

        // Society amenities
        'mosque',
        'school',
        'hospital',
        'shoppingMall',
        'parks',
        'sportsFacilities',
        'joggingTrack',
        'communityCenter',
        'banks',
        'restaurants',
        'cinema',
        'lake',
        'golfCourse',

        // Security features
        'gatedEntry',
        'securityGuards24x7',
        'cctvCameras',
        'intercomSystem',
        'smartLock',
        'panicButton',
      ] as const;

      // Keep any non-feature amenities (if you have another amenities selector somewhere)
      const existingAmenities: string[] = Array.isArray(
        (formData as any).amenities
      )
        ? (formData as any).amenities
        : [];

      const baseAmenities = existingAmenities.filter(
        (a) => !FEATURE_AMENITY_KEYS.includes(a as any)
      );

      const selectedFeatureAmenities = FEATURE_AMENITY_KEYS.filter(
        (key) => !!(formData as any)[key]
      );

      const amenitiesForSubmit = [
        ...baseAmenities,
        ...selectedFeatureAmenities,
      ];

      const formDataForSubmit: InstallmentFormData = {
        ...formData,
        amenities: amenitiesForSubmit,

        // Monthly
        hasMonthlyInstallments: !!plan.hasMonthly,
        monthlyAmount: plan.monthlyAmount || '',
        monthlyCount: plan.monthlyCount ? String(plan.monthlyCount) : '',

        // Quarterly
        hasQuarterlyInstallments: !!plan.hasQuarterly,
        quarterlyAmount: plan.quarterlyAmount || '',
        quarterlyCount: plan.quarterlyCount
          ? String(plan.quarterlyCount)
          : '',

        // Half‑Yearly
        hasHalfYearlyInstallments: !!plan.hasHalfYearly,
        halfYearlyAmount: plan.halfYearlyAmount || '',
        halfYearlyCount: plan.halfYearlyCount
          ? String(plan.halfYearlyCount)
          : '',

        // Yearly
        hasYearlyInstallments: !!plan.hasYearly,
        yearlyAmount: plan.yearlyAmount || '',
        yearlyCount: plan.yearlyCount ? String(plan.yearlyCount) : '',
      };

      // ✅ Build flat payload (text fields only)
      const payload: Record<string, any> = {
        userId,
        listingType: 'installment',
        ...(projectId && { projectId }),
        ...(projectCategory && { projectCategory }),
      };

      const docFields = new Set([
        'paymentPlanDoc',
        'floorPlanDocs',
        'siteMapDoc',
        'allocationLetterDoc',
        'paymentReceiptsDocs',
        'nocDoc',
        'agreementDoc',
        'brochureDoc',
        'rendersDocs',
        'otherDocs',
      ]);

      Object.entries(formDataForSubmit).forEach(([key, value]) => {
        if (key === 'images') return;
        if (key === 'installmentPlan' || key === 'installmentPlan2') return;
        if (docFields.has(key)) return;
        if (value === undefined || value === null || value === '') return;

        payload[key] = value;
      });

      // ✅ Convert payload to FormData for formidable backend
      const formToSend = new FormData();

      const arrayAsCsvKeys = new Set([
        'amenities',
        'nearbyPlaces',
        'suitableFor',
        'highlights',
        'specialFacing',
        'interiorFeatures',
        'exteriorFeatures',
        'buildingAmenities',
        'societyAmenities',
        'securityFeatures',
        'maintenanceCovers',
        'documentsAvailable',
      ]);

      Object.entries(payload).forEach(([key, value]) => {
        if (value === undefined || value === null || value === '') return;

        if (Array.isArray(value)) {
          if (arrayAsCsvKeys.has(key)) {
            if (value.length > 0) {
              formToSend.append(key, (value as any[]).join(','));
            }
          } else {
            formToSend.append(key, JSON.stringify(value));
          }
        } else if (typeof value === 'boolean') {
          formToSend.append(key, value ? 'true' : 'false');
        } else if (typeof value === 'object') {
          // Nested objects (parkingDetails, etc.) – send as JSON (backend currently ignores these on create)
          formToSend.append(key, JSON.stringify(value));
        } else {
          formToSend.append(key, String(value));
        }
      });

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

      if (preUploadedImages.length > 0) {
        formToSend.append(
          'preUploadedImages',
          JSON.stringify(preUploadedImages)
        );
      }

      const url =
        mode === 'edit' && propertyId
          ? `/api/properties/${propertyId}`
          : '/api/properties/add';

      const method = mode === 'edit' && propertyId ? 'put' : 'post';

      const res = await axios.request({
        url,
        method,
        data: formToSend,
        // ❌ Content-Type manually set nahi karna; browser multipart/form-data set karega
      });

      if (!res.data?.success) {
        throw new Error(res.data?.error || 'Failed to submit property');
      }

      setSubmitSuccess(true);

      // ✅ NEW: Store submitted property for SuccessModal
      setSubmittedProperty({
        id: res.data.property?._id || res.data.property?.id || '',
        title: formData.title,
      });

      if (mode === 'create') {
        setFormData(initialInstallmentFormData);
        setFeatureImage(null);
        setGalleryImages([]);
        setImagePreviews([]);
        setTouched({});
        setErrors({});
        localStorage.removeItem('installmentFormDraft');
      }

      // ✅ Show success modal instead of auto-redirect
      setShowSuccessModal(true);
    } catch (err: any) {
      console.error('Installment submit error:', err);
      const msg =
        err.response?.data?.error ||
        err.message ||
        'Error submitting property. Please try again.';
      setSubmitError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };
  // ============================================
  // RENDER SECTIONS
  // ============================================

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header – only show in CREATE mode */}
      {mode === 'create' && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-6 px-4"
        >
          <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 px-4 py-2 rounded-full text-sm font-medium mb-4">
            <Wallet className="w-4 h-4" />
            Installment Property
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
            Add Installment Property
          </h1>
          <p className="text-gray-500 text-sm sm:text-base">
            List your property with complete payment plan details
          </p>
        </motion.div>
      )}

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
              Property submitted successfully!
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

      {/* Progress Bar */}
      <ProgressBar
        completedSections={completedSectionsCount}
        totalSections={INSTALLMENT_FORM_SECTIONS.length}
        errors={errors}
      />

      {/* Main Form */}
<form onSubmit={handleSubmit} className="space-y-4">
        
        {/* ============================================ */}
        {/* SECTION 1: BASIC INFORMATION */}
        {/* ============================================ */}
        <FormSection
          id="basic"
          title="Basic Information"
          icon={SECTION_ICONS.basic}
          isOpen={openSections.basic}
          onToggle={() => toggleSection('basic')}
          isRequired={true}
          errorCount={sectionErrorCounts.basic}
        >
          <div className="space-y-4">
            {/* Property Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Property Category <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-4">
                {(['residential', 'commercial'] as const).map((category) => (
                  <label
                    key={category}
                    className={`flex-1 flex items-center justify-center gap-2 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      formData.propertyCategory === category
                        ? 'border-[#029bba] bg-[#029bba]/5'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="propertyCategory"
                      value={category}
                      checked={formData.propertyCategory === category}
                      onChange={handleInputChange}
                      className="sr-only"
                    />
                    <span className="text-xl">{category === 'residential' ? '🏠' : '🏢'}</span>
                    <span className="font-medium capitalize">{category}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Property Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Property Type <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {availablePropertyTypes.map((type) => (
                  <label
                    key={type.value}
                    className={`flex items-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                      formData.propertyType === type.value
                        ? 'border-[#029bba] bg-[#029bba]/5'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="propertyType"
                      value={type.value}
                      checked={formData.propertyType === type.value}
                      onChange={handleInputChange}
                      className="sr-only"
                    />
                    <span>{type.icon}</span>
                    <span className="text-sm font-medium">{type.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Listing Purpose */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Listing Purpose <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {LISTING_PURPOSE_OPTIONS.map((option) => (
                  <label
                    key={option.value}
                    className={`flex flex-col p-3 rounded-lg border-2 cursor-pointer transition-all ${
                      formData.listingPurpose === option.value
                        ? 'border-[#029bba] bg-[#029bba]/5'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="listingPurpose"
                      value={option.value}
                      checked={formData.listingPurpose === option.value}
                      onChange={handleInputChange}
                      className="sr-only"
                    />
                    <span className="font-medium text-sm">{option.label}</span>
                    <span className="text-xs text-gray-500">{option.description}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Property Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Property Title <span className="text-red-500">*</span>
              </label>
              <Input
                name="title"
                type="text"
                placeholder="e.g., 5 Marla Plot in DHA Phase 9 Prism - Excellent Investment"
                value={formData.title}
                onChange={handleInputChange}
                onBlur={() => handleBlur('title')}
                className={showError('title') ? 'border-red-500' : ''}
              />
              {showError('title') && (
                <p className="text-red-500 text-sm mt-1">{errors.title}</p>
              )}
              <p className="text-xs text-gray-400 mt-1">
                {formData.title.length}/150 characters
              </p>
            </div>

            {/* Property Condition */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Property Condition <span className="text-red-500">*</span>
              </label>
              <select
                name="propertyCondition"
                value={formData.propertyCondition}
                onChange={handleInputChange}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-[#029bba] focus:border-transparent"
              >
                {PROPERTY_CONDITION_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </FormSection>

        {/* ============================================ */}
        {/* SECTION 2: LOCATION DETAILS */}
        {/* ============================================ */}
        <FormSection
          id="location"
          title="Location Details"
          icon={SECTION_ICONS.location}
          isOpen={openSections.location}
          onToggle={() => toggleSection('location')}
          isRequired={true}
          errorCount={sectionErrorCounts.location}
        >
          <div className="space-y-4">
            {/* Province & City */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Province <span className="text-red-500">*</span>
                </label>
                <select
                  name="province"
                  value={formData.province}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-[#029bba] focus:border-transparent"
                >
                  {PROVINCES.map((province) => (
                    <option key={province} value={province}>
                      {province}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  City <span className="text-red-500">*</span>
                </label>
                <select
                  name="city"
                  value={formData.city}
                  onChange={handleInputChange}
                  onBlur={() => handleBlur('city')}
                  className={`w-full border rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-[#029bba] focus:border-transparent ${
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
                  <p className="text-red-500 text-sm mt-1">{errors.city}</p>
                )}
              </div>
            </div>

            {/* Society */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                  className={`w-full border rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-[#029bba] focus:border-transparent disabled:bg-gray-100 ${
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
                  <p className="text-red-500 text-sm mt-1">{errors.society}</p>
                )}
              </div>

              {formData.society === 'Other' && (
                <div>
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
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Locality/Area
                </label>
                <Input
                  name="locality"
                  type="text"
                  placeholder="e.g., Near Main Boulevard"
                  value={formData.locality}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            {/* Phase, Block, Street, Plot */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phase/Sector
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
                  Block
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
                  Street No.
                </label>
                <Input
                  name="streetNumber"
                  type="text"
                  placeholder="e.g., Street 5"
                  value={formData.streetNumber}
                  onChange={handleInputChange}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Plot/Unit No.
                </label>
                <Input
                  name="plotNumber"
                  type="text"
                  placeholder="e.g., 123"
                  value={formData.plotNumber}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            {/* Complete Address & Landmark */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Complete Address
                </label>
                <Input
                  name="completeAddress"
                  type="text"
                  placeholder="Full address for map location"
                  value={formData.completeAddress}
                  onChange={handleInputChange}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nearby Landmark
                </label>
                <Input
                  name="nearbyLandmark"
                  type="text"
                  placeholder="e.g., Near McDonald's"
                  value={formData.nearbyLandmark}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            <InfoBox type="info">
              Providing accurate location helps buyers find your property easily.
              The more details you provide, the better your listing will perform.
            </InfoBox>
          </div>
        </FormSection>

        {/* ============================================ */}
        {/* SECTION 3: UNIT / PLOT SIZE & MEASUREMENTS */}
        {/* ============================================ */}
        <FormSection
          id="size"
          title="Unit / Plot Size & Measurements"
          icon={SECTION_ICONS.size}
          isOpen={openSections.size}
          onToggle={() => toggleSection('size')}
          isRequired={true}
          errorCount={sectionErrorCounts.size}
        >
          <div className="space-y-4">
            {/* Info: clarify this is UNIT size, not project size */}
            <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg">
              <Info className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
              <p className="text-xs sm:text-sm text-blue-800">
                Yeh section <span className="font-semibold">sirf iss specific unit / plot</span> ka
                size aur measurements ke liye hai — poore project ya society ke size ke liye nahi.
                Agar aap multiple units bech rahe hain to har listing mein sirf us aik unit ka size
                likhen.
              </p>
            </div>

            {/* Main Area */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Unit / Plot Size <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  <Input
                    name="area"
                    type="number"
                    placeholder="e.g., 5"
                    value={formData.area}
                    onChange={handleInputChange}
                    onBlur={() => handleBlur('area')}
                    className={`flex-1 ${showError('area') ? 'border-red-500' : ''}`}
                    min="1"
                    step="0.01"
                  />
                  <select
                    name="areaUnit"
                    value={formData.areaUnit}
                    onChange={handleInputChange}
                    className="w-28 border border-gray-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-[#029bba] focus:border-transparent"
                  >
                    {AREA_UNITS.map((unit) => (
                      <option key={unit} value={unit}>
                        {unit}
                      </option>
                    ))}
                  </select>
                </div>
                {showError('area') && (
                  <p className="text-red-500 text-sm mt-1">{errors.area}</p>
                )}
              </div>

              {showFields.coveredArea && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Covered Area (Unit)
                  </label>
                  <div className="flex gap-2">
                    <Input
                      name="coveredArea"
                      type="number"
                      placeholder="e.g., 2500"
                      value={formData.coveredArea}
                      onChange={handleInputChange}
                      className="flex-1"
                      min="0"
                    />
                    <select
                      name="coveredAreaUnit"
                      value={formData.coveredAreaUnit}
                      onChange={handleInputChange}
                      className="w-28 border border-gray-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-[#029bba] focus:border-transparent"
                    >
                      <option value="Sq. Ft.">Sq. Ft.</option>
                      <option value="Sq. Yards">Sq. Yards</option>
                      <option value="Sq. M.">Sq. M.</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

                       {/* Plot / Front Dimensions – only where relevant (Plot, Shop, Warehouse etc.) */}
            {showFields.plotDimensions && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Front Width (ft)
                  </label>
                  <Input
                    name="plotWidth"
                    type="number"
                    placeholder="e.g., 25"
                    value={formData.plotWidth}
                    onChange={handleInputChange}
                    min="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Depth (ft)
                  </label>
                  <Input
                    name="plotDepth"
                    type="number"
                    placeholder="e.g., 50"
                    value={formData.plotDepth}
                    onChange={handleInputChange}
                    min="0"
                  />
                </div>
              </div>
            )}

            {/* Floor info for apartments / vertical units */}
            {showFields.floorNumber && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Floor Number (unit)
                  </label>
                  <Input
                    name="floorNumber"
                    type="number"
                    placeholder="e.g., 3"
                    value={formData.floorNumber}
                    onChange={handleInputChange}
                    min="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Total Floors (Building)
                  </label>
                  <Input
                    name="totalFloors"
                    type="number"
                    placeholder="e.g., 10"
                    value={formData.totalFloors}
                    onChange={handleInputChange}
                    min="1"
                  />
                </div>
              </div>
            )} 

            {/* Gross/Net Area for Apartments */}
            {showFields.floorNumber && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Gross Area (Sq. Ft.)
                  </label>
                  <Input
                    name="grossArea"
                    type="number"
                    placeholder="Including common areas"
                    value={formData.grossArea}
                    onChange={handleInputChange}
                    min="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Net Area (Sq. Ft.)
                  </label>
                  <Input
                    name="netArea"
                    type="number"
                    placeholder="Usable area only"
                    value={formData.netArea}
                    onChange={handleInputChange}
                    min="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Balcony Area (Sq. Ft.)
                  </label>
                  <Input
                    name="balconyArea"
                    type="number"
                    placeholder="e.g., 100"
                    value={formData.balconyArea}
                    onChange={handleInputChange}
                    min="0"
                  />
                </div>
              </div>
            )}
          </div>
        </FormSection>

        {/* ============================================ */}
        {/* SECTION 4: UNIT / PROPERTY DETAILS (Dynamic) */}
        {/* ============================================ */}
        <FormSection
          id="property_details"
          title="Unit / Property Details"
          icon={SECTION_ICONS.property_details}
          isOpen={openSections.property_details}
          onToggle={() => toggleSection('property_details')}
          isRequired={true}
          errorCount={sectionErrorCounts.property_details}
          badge={formData.propertyType}
        >
          <div className="space-y-4">
            {/* Info: clarify this is for this unit, not the overall project */}
            <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg">
              <Info className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
              <p className="text-xs sm:text-sm text-blue-800">
                Yeh section sirf{' '}
                <span className="font-semibold">iss specific unit / plot</span> ki rooms
                aur layout details ke liye hai — poore project ya society ki facilities
                (security, parks, masjid, etc.) alag sections mein aaengi.
              </p>
            </div>

            {/* ===== HOUSE/VILLA/FARMHOUSE FIELDS ===== */}
            {showFields.bedrooms && (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
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
                      max="50"
                      className={showError('bedrooms') ? 'border-red-500' : ''}
                    />
                    {showError('bedrooms') && (
                      <p className="text-red-500 text-xs mt-1">{errors.bedrooms}</p>
                    )}
                  </div>

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
                      max="30"
                      className={showError('bathrooms') ? 'border-red-500' : ''}
                    />
                    {showError('bathrooms') && (
                      <p className="text-red-500 text-xs mt-1">{errors.bathrooms}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Kitchens
                    </label>
                    <Input
                      name="kitchens"
                      type="number"
                      placeholder="1"
                      value={formData.kitchens}
                      onChange={handleInputChange}
                      min="0"
                      max="10"
                    />
                  </div>

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
                </div>

                {/* Rooms */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <label className="flex items-center gap-2 cursor-pointer p-3 rounded-lg border border-gray-200 hover:bg-gray-50">
                    <input
                      type="checkbox"
                      name="drawingRoom"
                      checked={formData.drawingRoom}
                      onChange={handleInputChange}
                      className="w-4 h-4 rounded border-gray-300 text-[#029bba] focus:ring-[#029bba]"
                    />
                    <span className="text-sm text-gray-700">Drawing Room</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer p-3 rounded-lg border border-gray-200 hover:bg-gray-50">
                    <input
                      type="checkbox"
                      name="diningRoom"
                      checked={formData.diningRoom}
                      onChange={handleInputChange}
                      className="w-4 h-4 rounded border-gray-300 text-[#029bba] focus:ring-[#029bba]"
                    />
                    <span className="text-sm text-gray-700">Dining Room</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer p-3 rounded-lg border border-gray-200 hover:bg-gray-50">
                    <input
                      type="checkbox"
                      name="livingRoom"
                      checked={formData.livingRoom}
                      onChange={handleInputChange}
                      className="w-4 h-4 rounded border-gray-300 text-[#029bba] focus:ring-[#029bba]"
                    />
                    <span className="text-sm text-gray-700">Living Room</span>
                  </label>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Store Rooms
                    </label>
                    <Input
                      name="storeRooms"
                      type="number"
                      placeholder="0"
                      value={formData.storeRooms}
                      onChange={handleInputChange}
                      min="0"
                      max="10"
                    />
                  </div>
                </div>

                {/* Extra Features */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {showFields.servantQuarter && (
                    <label className="flex items-center gap-2 cursor-pointer p-3 rounded-lg border border-gray-200 hover:bg-gray-50">
                      <input
                        type="checkbox"
                        name="servantQuarter"
                        checked={formData.servantQuarter}
                        onChange={handleInputChange}
                        className="w-4 h-4 rounded border-gray-300 text-[#029bba] focus:ring-[#029bba]"
                      />
                      <span className="text-sm text-gray-700">Servant Quarter</span>
                    </label>
                  )}

                  {showFields.basement && (
                    <label className="flex items-center gap-2 cursor-pointer p-3 rounded-lg border border-gray-200 hover:bg-gray-50">
                      <input
                        type="checkbox"
                        name="basement"
                        checked={formData.basement}
                        onChange={handleInputChange}
                        className="w-4 h-4 rounded border-gray-300 text-[#029bba] focus:ring-[#029bba]"
                      />
                      <span className="text-sm text-gray-700">Basement</span>
                    </label>
                  )}

                  <label className="flex items-center gap-2 cursor-pointer p-3 rounded-lg border border-gray-200 hover:bg-gray-50">
                    <input
                      type="checkbox"
                      name="rooftopAccess"
                      checked={formData.rooftopAccess}
                      onChange={handleInputChange}
                      className="w-4 h-4 rounded border-gray-300 text-[#029bba] focus:ring-[#029bba]"
                    />
                    <span className="text-sm text-gray-700">Rooftop Access</span>
                  </label>

                  {showFields.porch && (
                    <label className="flex items-center gap-2 cursor-pointer p-3 rounded-lg border border-gray-200 hover:bg-gray-50">
                      <input
                        type="checkbox"
                        name="porch"
                        checked={formData.porch}
                        onChange={handleInputChange}
                        className="w-4 h-4 rounded border-gray-300 text-[#029bba] focus:ring-[#029bba]"
                      />
                      <span className="text-sm text-gray-700">Porch</span>
                    </label>
                  )}
                </div>

                {/* Lawn & Garage */}
                {showFields.lawn && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Lawn/Garden
                      </label>
                      <select
                        name="lawnGarden"
                        value={formData.lawnGarden}
                        onChange={handleInputChange}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-[#029bba] focus:border-transparent"
                      >
                        <option value="none">None</option>
                        <option value="front">Front Only</option>
                        <option value="back">Back Only</option>
                        <option value="both">Front & Back</option>
                        <option value="rooftop">Rooftop Garden</option>
                      </select>
                    </div>

                    {showFields.garage && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Garage (Cars)
                        </label>
                        <select
                          name="garage"
                          value={formData.garage}
                          onChange={handleInputChange}
                          className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-[#029bba] focus:border-transparent"
                        >
                          <option value="0">No Garage</option>
                          <option value="1">1 Car</option>
                          <option value="2">2 Cars</option>
                          <option value="3">3 Cars</option>
                          <option value="4+">4+ Cars</option>
                        </select>
                      </div>
                    )}
                  </div>
                )}

                {/* Basement Area */}
                {formData.basement && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Basement Area (Sq. Ft.)
                      </label>
                      <Input
                        name="basementArea"
                        type="number"
                        placeholder="e.g., 1000"
                        value={formData.basementArea}
                        onChange={handleInputChange}
                        min="0"
                      />
                    </div>

                    {formData.servantQuarter && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Servant Quarter Rooms
                        </label>
                        <Input
                          name="servantQuarterRooms"
                          type="number"
                          placeholder="1"
                          value={formData.servantQuarterRooms}
                          onChange={handleInputChange}
                          min="0"
                          max="5"
                        />
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {/* ===== APARTMENT/PENTHOUSE FIELDS ===== */}
            {showFields.apartmentType && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Apartment Type
                    </label>
                    <select
                      name="apartmentType"
                      value={formData.apartmentType}
                      onChange={handleInputChange}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-[#029bba] focus:border-transparent"
                    >
                      <option value="">Select Type</option>
                      <option value="studio">Studio</option>
                      <option value="1_bed">1 Bedroom</option>
                      <option value="2_bed">2 Bedroom</option>
                      <option value="3_bed">3 Bedroom</option>
                      <option value="4_bed">4+ Bedroom</option>
                      <option value="duplex">Duplex</option>
                      <option value="triplex">Triplex</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      View
                    </label>
                    <select
                      name="view"
                      value={formData.view}
                      onChange={handleInputChange}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-[#029bba] focus:border-transparent"
                    >
                      <option value="">Select View</option>
                      <option value="city">City View</option>
                      <option value="park">Park View</option>
                      <option value="pool">Pool View</option>
                      <option value="sea">Sea View</option>
                      <option value="mountain">Mountain View</option>
                      <option value="garden">Garden View</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Balconies
                    </label>
                    <Input
                      name="balconies"
                      type="number"
                      placeholder="0"
                      value={formData.balconies}
                      onChange={handleInputChange}
                      min="0"
                      max="10"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center gap-2 cursor-pointer p-3 rounded-lg border border-gray-200 hover:bg-gray-50">
                    <input
                      type="checkbox"
                      name="isCornerUnit"
                      checked={formData.isCornerUnit}
                      onChange={handleInputChange}
                      className="w-4 h-4 rounded border-gray-300 text-[#029bba] focus:ring-[#029bba]"
                    />
                    <span className="text-sm text-gray-700">Corner Unit</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer p-3 rounded-lg border border-gray-200 hover:bg-gray-50">
                    <input
                      type="checkbox"
                      name="servantQuarter"
                      checked={formData.servantQuarter}
                      onChange={handleInputChange}
                      className="w-4 h-4 rounded border-gray-300 text-[#029bba] focus:ring-[#029bba]"
                    />
                    <span className="text-sm text-gray-700">Servant Quarter</span>
                  </label>
                </div>
              </>
            )}

            {/* ===== PLOT FIELDS ===== */}
            {showFields.plotCategory && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Plot Category <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="plotCategory"
                      value={formData.plotCategory}
                      onChange={handleInputChange}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-[#029bba] focus:border-transparent"
                    >
                      {PLOT_CATEGORY_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Plot Status <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="plotStatus"
                      value={formData.plotStatus}
                      onChange={handleInputChange}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-[#029bba] focus:border-transparent"
                    >
                      {PLOT_STATUS_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Development Status
                    </label>
                    <select
                      name="developmentStatus"
                      value={formData.developmentStatus}
                      onChange={handleInputChange}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-[#029bba] focus:border-transparent"
                    >
                      {DEVELOPMENT_STATUS_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Facing Direction
                    </label>
                    <select
                      name="facingDirection"
                      value={formData.facingDirection}
                      onChange={handleInputChange}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-[#029bba] focus:border-transparent"
                    >
                      <option value="">Select Direction</option>
                      {FACING_DIRECTION_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Open Sides
                    </label>
                    <select
                      name="openSides"
                      value={formData.openSides}
                      onChange={handleInputChange}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-[#029bba] focus:border-transparent"
                    >
                      <option value="1">1 Side Open</option>
                      <option value="2">2 Sides Open</option>
                      <option value="3">3 Sides Open</option>
                      <option value="4">4 Sides Open</option>
                    </select>
                  </div>

                  <div className="flex items-end gap-4">
                    <label className="flex items-center gap-2 cursor-pointer p-3 rounded-lg border border-gray-200 hover:bg-gray-50">
                      <input
                        type="checkbox"
                        name="isCornerPlot"
                        checked={formData.isCornerPlot}
                        onChange={handleInputChange}
                        className="w-4 h-4 rounded border-gray-300 text-[#029bba] focus:ring-[#029bba]"
                      />
                      <span className="text-sm text-gray-700">Corner Plot</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer p-3 rounded-lg border border-gray-200 hover:bg-gray-50">
                      <input
                        type="checkbox"
                        name="hasBoundaryWall"
                        checked={formData.hasBoundaryWall}
                        onChange={handleInputChange}
                        className="w-4 h-4 rounded border-gray-300 text-[#029bba] focus:ring-[#029bba]"
                      />
                      <span className="text-sm text-gray-700">Boundary Wall</span>
                    </label>
                  </div>
                </div>

                {/* Special Facing */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Special Facing (Select all that apply)
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {SPECIAL_FACING_OPTIONS.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => handleArrayToggle('specialFacing', option.id)}
                        className={`px-3 py-1.5 rounded-full text-sm border transition-all ${
                          formData.specialFacing.includes(option.id)
                            ? 'bg-[#029bba] text-white border-[#029bba]'
                            : 'bg-white text-gray-600 border-gray-300 hover:border-[#029bba]'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* ===== SHOP/COMMERCIAL FIELDS ===== */}
            {showFields.shopDetails && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Floor Location <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="floorLocation"
                      value={formData.floorLocation}
                      onChange={handleInputChange}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-[#029bba] focus:border-transparent"
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
                      className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-[#029bba] focus:border-transparent"
                    >
                      <option value="">Select Position</option>
                      {SHOP_POSITION_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Washroom
                    </label>
                    <select
                      name="washroom"
                      value={formData.washroom}
                      onChange={handleInputChange}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-[#029bba] focus:border-transparent"
                    >
                      <option value="none">None</option>
                      <option value="private">Private</option>
                      <option value="shared">Shared</option>
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
                      Height (ft)
                    </label>
                    <Input
                      name="shopHeight"
                      type="number"
                      placeholder="e.g., 12"
                      value={formData.shopHeight}
                      onChange={handleInputChange}
                      min="1"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Ceiling Height
                    </label>
                    <select
                      name="ceilingHeight"
                      value={formData.ceilingHeight}
                      onChange={handleInputChange}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-[#029bba] focus:border-transparent"
                    >
                      {CEILING_HEIGHT_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Mezzanine & Electricity */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Electricity Load
                    </label>
                    <select
                      name="electricityLoad"
                      value={formData.electricityLoad}
                      onChange={handleInputChange}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-[#029bba] focus:border-transparent"
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
                      Shutter Type
                    </label>
                    <select
                      name="shutterType"
                      value={formData.shutterType}
                      onChange={handleInputChange}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-[#029bba] focus:border-transparent"
                    >
                      <option value="">Select Type</option>
                      <option value="manual">Manual</option>
                      <option value="automatic">Automatic</option>
                      <option value="glass">Glass Door</option>
                    </select>
                  </div>

                  {formData.hasMezzanine && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Mezzanine Area (Sq. Ft.)
                      </label>
                      <Input
                        name="mezzanineArea"
                        type="number"
                        placeholder="e.g., 200"
                        value={formData.mezzanineArea}
                        onChange={handleInputChange}
                        min="0"
                      />
                    </div>
                  )}
                </div>

                {/* Checkboxes */}
                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center gap-2 cursor-pointer p-3 rounded-lg border border-gray-200 hover:bg-gray-50">
                    <input
                      type="checkbox"
                      name="hasMezzanine"
                      checked={formData.hasMezzanine}
                      onChange={handleInputChange}
                      className="w-4 h-4 rounded border-gray-300 text-[#029bba] focus:ring-[#029bba]"
                    />
                    <span className="text-sm text-gray-700">Has Mezzanine</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer p-3 rounded-lg border border-gray-200 hover:bg-gray-50">
                    <input
                      type="checkbox"
                      name="hasBasement"
                      checked={formData.hasBasement}
                      onChange={handleInputChange}
                      className="w-4 h-4 rounded border-gray-300 text-[#029bba] focus:ring-[#029bba]"
                    />
                    <span className="text-sm text-gray-700">Has Basement</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer p-3 rounded-lg border border-gray-200 hover:bg-gray-50">
                    <input
                      type="checkbox"
                      name="hasSignage"
                      checked={formData.hasSignage}
                      onChange={handleInputChange}
                      className="w-4 h-4 rounded border-gray-300 text-[#029bba] focus:ring-[#029bba]"
                    />
                    <span className="text-sm text-gray-700">Signage Allowed</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer p-3 rounded-lg border border-gray-200 hover:bg-gray-50">
                    <input
                      type="checkbox"
                      name="hasDisplayWindow"
                      checked={formData.hasDisplayWindow}
                      onChange={handleInputChange}
                      className="w-4 h-4 rounded border-gray-300 text-[#029bba] focus:ring-[#029bba]"
                    />
                    <span className="text-sm text-gray-700">Display Window</span>
                  </label>
                </div>

                {/* Suitable For */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Suitable For (Select all that apply)
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {SUITABLE_FOR_OPTIONS.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => handleArrayToggle('suitableFor', option.id)}
                        className={`px-3 py-1.5 rounded-full text-sm border transition-all ${
                          formData.suitableFor.includes(option.id)
                            ? 'bg-[#029bba] text-white border-[#029bba]'
                            : 'bg-white text-gray-600 border-gray-300 hover:border-[#029bba]'
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
          </div>
        </FormSection>

{/* ============================================ */}
{/* SECTION 5: PRICING & PAYMENT PLAN */}
{/* ============================================ */}
<FormSection
  id="payment_plan"
  title="Pricing & Payment Plan"
  icon={SECTION_ICONS.payment_plan}
  isOpen={openSections.payment_plan}
  onToggle={() => toggleSection('payment_plan')}
  isRequired={true}
  errorCount={sectionErrorCounts.payment_plan}
>
  <div className="space-y-6">
    {/* Total Price */}
    <div className="bg-gray-50 rounded-xl p-4">
      <h4 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
        <TrendingUp className="w-4 h-4 text-[#029bba]" />
        Total Price
      </h4>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Total Price (PKR) <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
              Rs.
            </span>
            <Input
                name="totalPrice"
                type="text"
                placeholder="1,50,00,000"
                value={formData.totalPrice}
                onChange={handleTotalPriceChange}
                onBlur={() => handleBlur('totalPrice')}
                className={`pl-10 ${showError('totalPrice') ? 'border-red-500' : ''}`}
              />
          </div>
          {showError('totalPrice') && (
            <p className="text-red-500 text-sm mt-1">
              {errors.totalPrice}
            </p>
          )}
          {formData.totalPrice && (
            <p className="text-xs text-gray-500 mt-1">
              ≈{' '}
              {priceToWords(
                parsePakistaniPrice(formData.totalPrice)
              )}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Price Per {formData.areaUnit}
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
              Rs.
            </span>
            <Input
              name="pricePerUnit"
              type="text"
              placeholder="Auto-calculated"
              value={
                formData.totalPrice && formData.area
                  ? formatPakistaniPrice(
                      Math.round(
                        parsePakistaniPrice(
                          formData.totalPrice
                        ) / parseFloat(formData.area)
                      ).toString()
                    )
                  : ''
              }
              readOnly
              className="pl-10 bg-gray-100"
            />
          </div>
        </div>
      </div>

      <label className="flex items-center gap-2 cursor-pointer mt-3">
        <input
          type="checkbox"
          name="isNegotiable"
          checked={formData.isNegotiable}
          onChange={handleInputChange}
          className="w-4 h-4 rounded border-gray-300 text-[#029bba] focus:ring-[#029bba]"
        />
        <span className="text-sm text-gray-700">
          Price is Negotiable
        </span>
      </label>
    </div>

    {/* Booking - Percentage + Auto Amount */}
    <div className="bg-green-50 rounded-xl p-4">
      <h4 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
        <BadgeCheck className="w-4 h-4 text-green-600" />
        Booking
      </h4>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Booking Percentage (user input) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Booking Percentage <span className="text-red-500">*</span>
          </label>
          <select
            name="bookingPercent"
            value={formData.bookingPercent || ''}
            onChange={handlePercentChange}
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-[#029bba] focus:border-transparent bg-white"
          >
            <option value="">Select %</option>
            {PERCENT_OPTIONS.map((p) => (
              <option key={p} value={p.toString()}>
                {p}%
              </option>
            ))}
          </select>
          {/* Abhi ke liye purani validation key hi use kar rahe hain */}
          {showError('bookingAmount') && (
            <p className="text-red-500 text-sm mt-1">
              {errors.bookingAmount}
            </p>
          )}
        </div>

        {/* Booking Amount (auto from totalPrice + percent) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Booking Amount
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
              Rs.
            </span>
            <Input
              name="bookingAmount"
              type="text"
              placeholder="Auto-calculated"
              value={formData.bookingAmount}
              readOnly
              className="pl-10 bg-gray-100"
            />
          </div>
        </div>

        {/* Booking Status (same as before) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Booking Status
          </label>
          <select
            name="bookingStatus"
            value={formData.bookingStatus}
            onChange={handleInputChange}
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-[#029bba] focus:border-transparent"
          >
            {BOOKING_STATUS_OPTIONS.map((option) => (
              <option
                key={option.value}
                value={option.value}
              >
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>

    {/* Down Payment - Percentage + Auto Amount */}
    <div className="bg-blue-50 rounded-xl p-4">
      <h4 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
        <Wallet className="w-4 h-4 text-blue-600" />
        Down Payment
      </h4>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Down Payment Percentage */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Down Payment Percentage
          </label>
          <select
            name="downPaymentPercent"
            value={formData.downPaymentPercent || ''}
            onChange={handlePercentChange}
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-[#029bba] focus:border-transparent bg-white"
          >
            <option value="">Select %</option>
            {PERCENT_OPTIONS.map((p) => (
              <option key={p} value={p.toString()}>
                {p}%
              </option>
            ))}
          </select>
        </div>

        {/* Down Payment Amount (auto) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Down Payment Amount
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
              Rs.
            </span>
            <Input
              name="downPaymentAmount"
              type="text"
              placeholder="Auto-calculated"
              value={formData.downPaymentAmount}
              readOnly
              className="pl-10 bg-gray-100"
            />
          </div>
        </div>

        {/* Due Within (same as before) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Due Within
          </label>
          <select
            name="downPaymentDueWithin"
            value={formData.downPaymentDueWithin}
            onChange={handleInputChange}
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-[#029bba] focus:border-transparent"
          >
            {DOWN_PAYMENT_DUE_OPTIONS.map((option) => (
              <option
                key={option.value}
                value={option.value}
              >
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Down payment in installments (same as your original code) */}
      <div className="mt-3">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            name="downPaymentInInstallments"
            checked={formData.downPaymentInInstallments}
            onChange={handleInputChange}
            className="w-4 h-4 rounded border-gray-300 text-[#029bba] focus:ring-[#029bba]"
          />
          <span className="text-sm text-gray-700">
            Down payment can be paid in installments
          </span>
        </label>

        {formData.downPaymentInInstallments && (
          <div className="mt-2 w-48">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Number of Installments
            </label>
            <Input
              name="numberOfDPInstallments"
              type="number"
              placeholder="e.g., 4"
              value={formData.numberOfDPInstallments}
              onChange={handleInputChange}
              min="2"
              max="24"
            />
          </div>
        )}
      </div>
    </div>

    {/* Installments (aap ka purana code – bilkul same rakha hai) */}
    <div className="bg-purple-50 rounded-xl p-4">
      <h4 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
        <Clock className="w-4 h-4 text-purple-600" />
        Installment Plan
      </h4>

      {/* Monthly */}
<div className="mb-4">
  <label className="flex items-center gap-2 cursor-pointer mb-2">
    <input
      type="checkbox"
      name="installmentPlan.hasMonthly"
      checked={formData.installmentPlan?.hasMonthly || false}
      onChange={handleInputChange}
      className="w-4 h-4 rounded border-gray-300 text-[#029bba] focus:ring-[#029bba]"
    />
    <span className="text-sm font-medium text-gray-700">
      Monthly Installments
    </span>
  </label>

  {formData.installmentPlan?.hasMonthly && (
    <div className="space-y-3 ml-6">
      {/* Remaining amount info */}
      <div className="text-xs text-gray-600">
        Remaining amount to cover via installments:{' '}
        <span className="font-semibold text-purple-700">
          {formatPakistaniPrice(
            calculateRemainingPrincipal(formData).toString()
          )}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Amount per Month (auto) */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Amount per Month
          </label>
          <div className="relative">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
              Rs.
            </span>
            <Input
              name="installmentPlan.monthlyAmount"
              type="text"
              placeholder="Auto-calculated"
              value={formData.installmentPlan?.monthlyAmount || ''}
              readOnly
              className="pl-8 text-sm bg-gray-100"
            />
          </div>
        </div>

        {/* Number of Months (user input) */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Number of Months
          </label>
          <Input
            name="installmentPlan.monthlyCount"
            type="number"
            placeholder="36"
            value={formData.installmentPlan?.monthlyCount || ''}
            onChange={handleMonthlyCountChange}
            min="1"
            max="120"
            className="text-sm"
          />
        </div>
      </div>

      {formData.installmentPlan?.monthlyAmount &&
        formData.installmentPlan?.monthlyCount && (
          <div className="bg-white p-3 rounded-lg border border-purple-200 shadow-sm">
            <p className="text-sm font-semibold text-gray-800">
              Monthly{' '}
              <span className="text-purple-600">
                {formatToLacCrore(
                  parsePakistaniPrice(
                    formData.installmentPlan.monthlyAmount
                  )
                )}
              </span>{' '}
              ×{' '}
              <span className="text-purple-600">
                {formData.installmentPlan.monthlyCount}
              </span>{' '}
              ={' '}
              <span className="text-green-600 font-bold">
                {formatToLacCrore(
                  parsePakistaniPrice(
                    formData.installmentPlan.monthlyAmount
                  ) *
                    parseInt(
                      formData.installmentPlan.monthlyCount
                    )
                )}
              </span>
            </p>
          </div>
        )}
    </div>
  )}
</div>

  {/* Quarterly */}
<div className="mb-4">
  <label className="flex items-center gap-2 cursor-pointer mb-2">
    <input
      type="checkbox"
      name="installmentPlan.hasQuarterly"
      checked={formData.installmentPlan?.hasQuarterly || false}
      onChange={handleInputChange}
      className="w-4 h-4 rounded border-gray-300 text-[#029bba] focus:ring-[#029bba]"
    />
    <span className="text-sm font-medium text-gray-700">
      Quarterly Installments
    </span>
  </label>

  {formData.installmentPlan?.hasQuarterly && (
    <div className="space-y-3 ml-6">
      <div className="grid grid-cols-2 gap-4">
        {/* Amount per Quarter (auto) */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Amount per Quarter
          </label>
          <div className="relative">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
              Rs.
            </span>
            <Input
              name="installmentPlan.quarterlyAmount"
              type="text"
              placeholder="Auto-calculated"
              value={formData.installmentPlan?.quarterlyAmount || ''}
              readOnly
              className="pl-8 text-sm bg-gray-100"
            />
          </div>
        </div>

        {/* Number of Quarters (user input) */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Number of Quarters
          </label>
          <Input
            name="installmentPlan.quarterlyCount"
            type="number"
            placeholder="12"
            value={formData.installmentPlan?.quarterlyCount || ''}
            onChange={handleQuarterlyCountChange}
            min="1"
            max="40"
            className="text-sm"
          />
        </div>
      </div>

      {formData.installmentPlan?.quarterlyAmount &&
        formData.installmentPlan?.quarterlyCount && (
          <div className="bg-white p-3 rounded-lg border border-purple-200 shadow-sm">
            <p className="text-sm font-semibold text-gray-800">
              Quarterly{' '}
              <span className="text-purple-600">
                {formatToLacCrore(
                  parsePakistaniPrice(
                    formData.installmentPlan.quarterlyAmount
                  )
                )}
              </span>{' '}
              ×{' '}
              <span className="text-purple-600">
                {formData.installmentPlan.quarterlyCount}
              </span>{' '}
              ={' '}
              <span className="text-green-600 font-bold">
                {formatToLacCrore(
                  parsePakistaniPrice(
                    formData.installmentPlan.quarterlyAmount
                  ) *
                    parseInt(
                      formData.installmentPlan.quarterlyCount
                    )
                )}
              </span>
            </p>
          </div>
        )}
    </div>
  )}
</div>   

 {/* Half-Yearly */}
<div className="mb-4">
  <label className="flex items-center gap-2 cursor-pointer mb-2">
    <input
      type="checkbox"
      name="installmentPlan.hasHalfYearly"
      checked={formData.installmentPlan?.hasHalfYearly || false}
      onChange={handleInputChange}
      className="w-4 h-4 rounded border-gray-300 text-[#029bba] focus:ring-[#029bba]"
    />
    <span className="text-sm font-medium text-gray-700">
      Half-Yearly Installments
    </span>
  </label>

  {formData.installmentPlan?.hasHalfYearly && (
    <div className="space-y-3 ml-6">
      <div className="grid grid-cols-2 gap-4">
        {/* Amount per Half-Year (auto) */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Amount per Half-Year
          </label>
          <div className="relative">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
              Rs.
            </span>
            <Input
              name="installmentPlan.halfYearlyAmount"
              type="text"
              placeholder="Auto-calculated"
              value={formData.installmentPlan?.halfYearlyAmount || ''}
              readOnly
              className="pl-8 text-sm bg-gray-100"
            />
          </div>
        </div>

        {/* Number of Half-Years */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Number of Half-Years
          </label>
          <Input
            name="installmentPlan.halfYearlyCount"
            type="number"
            placeholder="6"
            value={formData.installmentPlan?.halfYearlyCount || ''}
            onChange={handleHalfYearlyCountChange}
            min="1"
            max="20"
            className="text-sm"
          />
        </div>
      </div>

      {formData.installmentPlan?.halfYearlyAmount &&
        formData.installmentPlan?.halfYearlyCount && (
          <div className="bg-white p-3 rounded-lg border border-purple-200 shadow-sm">
            <p className="text-sm font-semibold text-gray-800">
              Half-Yearly{' '}
              <span className="text-purple-600">
                {formatToLacCrore(
                  parsePakistaniPrice(
                    formData.installmentPlan.halfYearlyAmount
                  )
                )}
              </span>{' '}
              ×{' '}
              <span className="text-purple-600">
                {formData.installmentPlan.halfYearlyCount}
              </span>{' '}
              ={' '}
              <span className="text-green-600 font-bold">
                {formatToLacCrore(
                  parsePakistaniPrice(
                    formData.installmentPlan.halfYearlyAmount
                  ) *
                    parseInt(
                      formData.installmentPlan.halfYearlyCount
                    )
                )}
              </span>
            </p>
          </div>
        )}
    </div>
  )}
</div> 
  {/* Yearly */}
<div className="mb-4">
  <label className="flex items-center gap-2 cursor-pointer mb-2">
    <input
      type="checkbox"
      name="installmentPlan.hasYearly"
      checked={formData.installmentPlan?.hasYearly || false}
      onChange={handleInputChange}
      className="w-4 h-4 rounded border-gray-300 text-[#029bba] focus:ring-[#029bba]"
    />
    <span className="text-sm font-medium text-gray-700">
      Yearly Installments
    </span>
  </label>

  {formData.installmentPlan?.hasYearly && (
    <div className="space-y-3 ml-6">
      <div className="grid grid-cols-2 gap-4">
        {/* Amount per Year (auto) */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Amount per Year
          </label>
          <div className="relative">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
              Rs.
            </span>
            <Input
              name="installmentPlan.yearlyAmount"
              type="text"
              placeholder="Auto-calculated"
              value={formData.installmentPlan?.yearlyAmount || ''}
              readOnly
              className="pl-8 text-sm bg-gray-100"
            />
          </div>
        </div>

        {/* Number of Years */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Number of Years
          </label>
          <Input
            name="installmentPlan.yearlyCount"
            type="number"
            placeholder="3"
            value={formData.installmentPlan?.yearlyCount || ''}
            onChange={handleYearlyCountChange}
            min="1"
            max="10"
            className="text-sm"
          />
        </div>
      </div>

      {formData.installmentPlan?.yearlyAmount &&
        formData.installmentPlan?.yearlyCount && (
          <div className="bg-white p-3 rounded-lg border border-purple-200 shadow-sm">
            <p className="text-sm font-semibold text-gray-800">
              Yearly{' '}
              <span className="text-purple-600">
                {formatToLacCrore(
                  parsePakistaniPrice(
                    formData.installmentPlan.yearlyAmount
                  )
                )}
              </span>{' '}
              ×{' '}
              <span className="text-purple-600">
                {formData.installmentPlan.yearlyCount}
              </span>{' '}
              ={' '}
              <span className="text-green-600 font-bold">
                {formatToLacCrore(
                  parsePakistaniPrice(
                    formData.installmentPlan.yearlyAmount
                  ) *
                    parseInt(
                      formData.installmentPlan.yearlyCount
                    )
                )}
              </span>
            </p>
          </div>
        )}
    </div>
  )}
</div>
</div>
    {/* Plan Duration & Start Date (unchanged) */}
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 pt-4 border-t border-purple-200">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Installment Start Date
        </label>
        <Input
          name="installmentStartDate"
          type="date"
          value={formData.installmentStartDate}
          onChange={handleInputChange}
        />
      </div>

      <div className="flex gap-2">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Plan Duration
          </label>
          <Input
            name="planDuration"
            type="number"
            placeholder="3"
            value={formData.planDuration}
            onChange={handleInputChange}
            min="1"
          />
        </div>
        <div className="w-28">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Unit
          </label>
          <select
            name="planDurationUnit"
            value={formData.planDurationUnit}
            onChange={handleInputChange}
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-[#029bba] focus:border-transparent"
          >
            <option value="years">Years</option>
            <option value="months">Months</option>
          </select>
        </div>
      </div>
    </div>

      {/* Resale Info (Conditional) */}
    {formData.listingPurpose === 'resale' && (
      <div className="bg-orange-50 rounded-xl p-4">
        <h4 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-orange-600" />
          Resale Information
        </h4>
        <InfoBox type="info">
          Since this is a resale, please provide details of installments already paid.
        </InfoBox>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Installments Paid <span className="text-red-500">*</span>
            </label>
            <Input
              name="installmentsPaid"
              type="number"
              placeholder="e.g., 12"
              value={formData.installmentsPaid}
              onChange={handleInputChange}
              min="0"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Installments Remaining
            </label>
            <Input
              name="installmentsRemaining"
              type="number"
              placeholder="Auto-calculated"
              value={formData.installmentsRemaining}
              onChange={handleInputChange}
              min="0"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Amount Paid (Total) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                Rs.
              </span>
              <Input
                name="amountPaid"
                type="text"
                placeholder="25,00,000"
                value={formData.amountPaid}
                onChange={handlePriceChange}
                className="pl-10"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Amount Remaining
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                Rs.
              </span>
              <Input
                name="amountRemaining"
                type="text"
                placeholder="Auto-calculated"
                value={
                  formData.totalPrice && formData.amountPaid
                    ? formatPakistaniPrice(
                        (
                          parsePakistaniPrice(formData.totalPrice) -
                          parsePakistaniPrice(formData.amountPaid)
                        ).toString()
                      )
                    : ''
                }
                readOnly
                className="pl-10 bg-gray-100"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Your Asking Price <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                Rs.
              </span>
              <Input
                name="ownPrice"
                type="text"
                placeholder="30,00,000"
                value={formData.ownPrice}
                onChange={handlePriceChange}
                className="pl-10"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Your Profit/Loss
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                Rs.
              </span>
              <Input
                name="profit"
                type="text"
                placeholder="Auto-calculated"
                value={
                  formData.ownPrice && formData.amountPaid
                    ? formatPakistaniPrice(
                        (
                          parsePakistaniPrice(formData.ownPrice) -
                          parsePakistaniPrice(formData.amountPaid)
                        ).toString()
                      )
                    : ''
                }
                readOnly
                className={`pl-10 ${
                  parsePakistaniPrice(formData.ownPrice) >=
                  parsePakistaniPrice(formData.amountPaid)
                    ? 'bg-green-50 text-green-700'
                    : 'bg-red-50 text-red-700'
                }`}
              />
            </div>
          </div>
        </div>
      </div>
    )}

    {/* Possession */}
    <div className="bg-teal-50 rounded-xl p-4">
      <h4 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
        <Landmark className="w-4 h-4 text-teal-600" />
        Possession
      </h4>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Possession Percentage */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Possession Percentage
          </label>
          <select
            name="possessionPercent"
            value={formData.possessionPercent || ''}
            onChange={handlePercentChange}
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-[#029bba] focus:border-transparent bg-white"
          >
            <option value="">Select %</option>
            {PERCENT_OPTIONS.map((p) => (
              <option key={p} value={p.toString()}>
                {p}%
              </option>
            ))}
          </select>
        </div>

        {/* Possession Amount (auto) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Possession Amount
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
              Rs.
            </span>
            <Input
              name="possessionAmount"
              type="text"
              placeholder="Auto-calculated"
              value={formData.possessionAmount}
              readOnly
              className="pl-10 bg-gray-100"
            />
          </div>
        </div>

        {/* Possession Due On */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Possession Due On
          </label>
          <select
            name="possessionDueOn"
            value={formData.possessionDueOn}
            onChange={handleInputChange}
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-[#029bba] focus:border-transparent"
          >
            {POSSESSION_DUE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Expected Possession Date
          </label>
          <Input
            name="expectedPossessionDate"
            type="date"
            value={formData.expectedPossessionDate}
            onChange={handleInputChange}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Possession Status
          </label>
          <select
            name="possessionStatus"
            value={formData.possessionStatus}
            onChange={handleInputChange}
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-[#029bba] focus:border-transparent"
          >
            {POSSESSION_STATUS_OPTIONS_INST.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>

    {/* Ballot/Allotment */}
    <div className="bg-indigo-50 rounded-xl p-4">
      <h4 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
        <FileText className="w-4 h-4 text-indigo-600" />
        Ballot & Allotment
      </h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Ballot Status
          </label>
          <select
            name="ballotStatus"
            value={formData.ballotStatus}
            onChange={handleInputChange}
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-[#029bba] focus:border-transparent"
          >
            {BALLOT_STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {formData.ballotStatus === 'pending' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Expected Ballot Date
            </label>
            <Input
              name="expectedBallotDate"
              type="date"
              value={formData.expectedBallotDate}
              onChange={handleInputChange}
            />
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-4 mt-3">
        <label className="flex items-center gap-2 cursor-pointer p-3 rounded-lg border border-gray-200 hover:bg-gray-50 bg-white">
          <input
            type="checkbox"
            name="isPlotAllocated"
            checked={formData.isPlotAllocated}
            onChange={handleInputChange}
            className="w-4 h-4 rounded border-gray-300 text-[#029bba] focus:ring-[#029bba]"
          />
          <span className="text-sm text-gray-700">Plot/Unit Allocated</span>
        </label>

        <label className="flex items-center gap-2 cursor-pointer p-3 rounded-lg border border-gray-200 hover:bg-gray-50 bg-white">
          <input
            type="checkbox"
            name="hasAllocationLetter"
            checked={formData.hasAllocationLetter}
            onChange={handleInputChange}
            className="w-4 h-4 rounded border-gray-300 text-[#029bba] focus:ring-[#029bba]"
          />
          <span className="text-sm text-gray-700">
            Allocation Letter Available
          </span>
        </label>
      </div>
    </div>

    {/* Other Charges */}
    <div className="bg-gray-50 rounded-xl p-4">
      <h4 className="font-medium text-gray-800 mb-3">
        Other Payment Charges
      </h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Confirmation Charges
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
              Rs.
            </span>
            <Input
              name="confirmationCharges"
              type="text"
              placeholder="0"
              value={formData.confirmationCharges}
              onChange={handlePriceChange}
              className="pl-10"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Development Charges
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
              Rs.
            </span>
            <Input
              name="developmentChargesPayment"
              type="text"
              placeholder="0"
              value={formData.developmentChargesPayment}
              onChange={handlePriceChange}
              className="pl-10"
            />
          </div>
        </div>

      {/* Late Payment Surcharge (amount in Rs) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Late Payment Surcharge
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
              Rs.
            </span>
            <Input
              name="latePaymentSurcharge"
              type="text"
              placeholder="e.g., 5,000"
              value={formData.latePaymentSurcharge}
              onChange={handlePriceChange}
              className="pl-10"
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Typically per month late fee (stored as amount in Rupees).
          </p>
        </div>

              {/* Early Payment Discount (% on total unit price) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Early Payment Discount
          </label>
          <select
            name="earlyPaymentDiscount"
            value={formData.earlyPaymentDiscount || ''}
            onChange={handleInputChange}
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-[#029bba] focus:border-transparent bg-white"
          >
            <option value="">No discount</option>
            {Array.from({ length: 20 }, (_, i) => i + 1).map((p) => (
              <option key={p} value={p.toString()}>
                {p}%
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-500 mt-1">
            Discount percentage on total unit price for full upfront payment.
          </p>
        </div>  
      </div>
    </div>

    {/* Payment Summary */}
    <div>
      <PaymentSummaryCard formData={formData} />
      {errors.paymentPlanTotal && (
        <InfoBox type="error">{errors.paymentPlanTotal}</InfoBox>
      )}
    </div> 
  </div>
</FormSection>

        {/* ============================================ */}
        {/* SECTION 6: PARKING DETAILS */}
        {/* ============================================ */}
        <FormSection
          id="parking"
          title="Parking Details"
          icon={SECTION_ICONS.parking}
          isOpen={openSections.parking}
          onToggle={() => toggleSection('parking')}
          isRequired={false}
          errorCount={sectionErrorCounts.parking}
        >
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  name="parkingAvailable"
                  checked={formData.parkingAvailable}
                  onChange={handleInputChange}
                  className="w-4 h-4 rounded border-gray-300 text-[#029bba] focus:ring-[#029bba]"
                />
                <span className="text-sm font-medium text-gray-700">Parking Available</span>
              </label>
            </div>

            {formData.parkingAvailable && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Parking Type
                    </label>
                    <select
                      name="parkingType"
                      value={formData.parkingType}
                      onChange={handleInputChange}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-[#029bba] focus:border-transparent"
                    >
                      <option value="">Select Type</option>
                      {PARKING_TYPE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Number of Spaces
                    </label>
                    <Input
                      name="parkingSpaces"
                      type="number"
                      placeholder="1"
                      value={formData.parkingSpaces}
                      onChange={handleInputChange}
                      min="0"
                      max="20"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Parking Included?
                    </label>
                    <select
                      name="parkingIncluded"
                      value={formData.parkingIncluded}
                      onChange={handleInputChange}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-[#029bba] focus:border-transparent"
                    >
                      {PARKING_INCLUDED_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {formData.parkingIncluded === 'separate' && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Parking Size (Sq. Ft.)
                      </label>
                      <Input
                        name="parkingSize"
                        type="number"
                        placeholder="e.g., 150"
                        value={formData.parkingSize}
                        onChange={handleInputChange}
                        min="0"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Price per Sq. Ft.
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                          Rs.
                        </span>
                        <Input
                          name="parkingPricePerSqft"
                          type="text"
                          placeholder="e.g., 5,000"
                          value={formData.parkingPricePerSqft}
                          onChange={handlePriceChange}
                          className="pl-10"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Total Parking Price
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                          Rs.
                        </span>
                        <Input
                          name="parkingTotalPrice"
                          type="text"
                          placeholder="Auto-calculated"
                          value={
                            formData.parkingSize && formData.parkingPricePerSqft
                              ? formatPakistaniPrice(
                                  (
                                    parseFloat(formData.parkingSize) *
                                    parsePakistaniPrice(formData.parkingPricePerSqft)
                                  ).toString()
                                )
                              : ''
                          }
                          readOnly
                          className="pl-10 bg-gray-100"
                        />
                      </div>
                    </div>
                  </div>
                )}

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    name="hasEVCharging"
                    checked={formData.hasEVCharging}
                    onChange={handleInputChange}
                    className="w-4 h-4 rounded border-gray-300 text-[#029bba] focus:ring-[#029bba]"
                  />
                  <span className="text-sm text-gray-700">EV Charging Available</span>
                </label>
              </>
            )}
          </div>
        </FormSection>

        {/* ============================================ */}
        {/* SECTION 8: UTILITIES & INFRASTRUCTURE */}
        {/* ============================================ */}
        <FormSection
          id="infrastructure"
          title="Utilities & Infrastructure"
          icon={SECTION_ICONS.infrastructure}
          isOpen={openSections.infrastructure}
          onToggle={() => toggleSection('infrastructure')}
          isRequired={false}
          errorCount={sectionErrorCounts.infrastructure}
        >
          <div className="space-y-4">
            {/* Utility Status */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Electricity
                </label>
                <select
                  name="electricityStatus"
                  value={formData.electricityStatus}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-[#029bba] focus:border-transparent"
                >
                  {UTILITY_STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Electricity Load
                </label>
                <select
                  name="electricityLoadInfra"
                  value={formData.electricityLoadInfra}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-[#029bba] focus:border-transparent"
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
                  Gas
                </label>
                <select
                  name="gasStatus"
                  value={formData.gasStatus}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-[#029bba] focus:border-transparent"
                >
                  <option value="available">Available</option>
                  <option value="applied">Applied For</option>
                  <option value="not_available">Not Available</option>
                  <option value="lpg_only">LPG Only</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Water Supply
                </label>
                <select
                  name="waterStatus"
                  value={formData.waterStatus}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-[#029bba] focus:border-transparent"
                >
                  <option value="available">Municipal/WASA</option>
                  <option value="boring">Boring/Well</option>
                  <option value="tanker">Tanker Supply</option>
                  <option value="mixed">Municipal + Boring</option>
                  <option value="not_available">Not Available</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sewerage
                </label>
                <select
                  name="sewerageStatus"
                  value={formData.sewerageStatus}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-[#029bba] focus:border-transparent"
                >
                  {UTILITY_STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Road Condition
                </label>
                <select
                  name="roadCondition"
                  value={formData.roadCondition}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-[#029bba] focus:border-transparent"
                >
                  {ROAD_CONDITION_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Security */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Security Level
                </label>
                <select
                  name="securityLevel"
                  value={formData.securityLevel}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-[#029bba] focus:border-transparent"
                >
                  {SECURITY_LEVEL_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Infrastructure Checkboxes */}
            <div className="flex flex-wrap gap-3 pt-2">
              <label className="flex items-center gap-2 cursor-pointer p-3 rounded-lg border border-gray-200 hover:bg-gray-50">
                <input
                  type="checkbox"
                  name="internetReady"
                  checked={formData.internetReady}
                  onChange={handleInputChange}
                  className="w-4 h-4 rounded border-gray-300 text-[#029bba] focus:ring-[#029bba]"
                />
                <span className="text-sm text-gray-700">Internet Ready</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer p-3 rounded-lg border border-gray-200 hover:bg-gray-50">
                <input
                  type="checkbox"
                  name="cctvCoverage"
                  checked={formData.cctvCoverage}
                  onChange={handleInputChange}
                  className="w-4 h-4 rounded border-gray-300 text-[#029bba] focus:ring-[#029bba]"
                />
                <span className="text-sm text-gray-700">CCTV Coverage</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer p-3 rounded-lg border border-gray-200 hover:bg-gray-50">
                <input
                  type="checkbox"
                  name="streetLights"
                  checked={formData.streetLights}
                  onChange={handleInputChange}
                  className="w-4 h-4 rounded border-gray-300 text-[#029bba] focus:ring-[#029bba]"
                />
                <span className="text-sm text-gray-700">Street Lights</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer p-3 rounded-lg border border-gray-200 hover:bg-gray-50">
                <input
                  type="checkbox"
                  name="gatedCommunity"
                  checked={formData.gatedCommunity}
                  onChange={handleInputChange}
                  className="w-4 h-4 rounded border-gray-300 text-[#029bba] focus:ring-[#029bba]"
                />
                <span className="text-sm text-gray-700">Gated Community</span>
              </label>
            </div>
          </div>
        </FormSection>

        {/* ============================================ */}
        {/* SECTION 9: FEATURES & AMENITIES */}
        {/* ============================================ */}
        <FormSection
          id="features"
          title="Features & Amenities"
          icon={SECTION_ICONS.features}
          isOpen={openSections.features}
          onToggle={() => toggleSection('features')}
          isRequired={false}
          errorCount={sectionErrorCounts.features}
        >
          <div className="space-y-6">
            {/* Interior Features (for built properties) */}
            {showFields.bedrooms && (
              <div className="bg-gray-50 rounded-xl p-4">
                <h4 className="font-medium text-gray-800 mb-3">Interior Features</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Flooring
                    </label>
                    <select
                      name="flooring"
                      value={formData.flooring}
                      onChange={handleInputChange}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#029bba] focus:border-transparent"
                    >
                      <option value="">Select</option>
                      <option value="marble">Marble</option>
                      <option value="tiles">Tiles</option>
                      <option value="wooden">Wooden</option>
                      <option value="granite">Granite</option>
                      <option value="cement">Cement</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Ceiling
                    </label>
                    <select
                      name="ceiling"
                      value={formData.ceiling}
                      onChange={handleInputChange}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#029bba] focus:border-transparent"
                    >
                      <option value="">Select</option>
                      <option value="false_ceiling">False Ceiling</option>
                      <option value="pop">POP</option>
                      <option value="simple">Simple</option>
                      <option value="wooden">Wooden</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Kitchen Type
                    </label>
                    <select
                      name="kitchenType"
                      value={formData.kitchenType}
                      onChange={handleInputChange}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#029bba] focus:border-transparent"
                    >
                      <option value="">Select</option>
                      <option value="open">Open Kitchen</option>
                      <option value="closed">Closed Kitchen</option>
                      <option value="modular">Modular Kitchen</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Wardrobes
                    </label>
                    <select
                      name="wardrobes"
                      value={formData.wardrobes}
                      onChange={handleInputChange}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#029bba] focus:border-transparent"
                    >
                      <option value="">Select</option>
                      <option value="builtin">Built-in</option>
                      <option value="walkin">Walk-in Closet</option>
                      <option value="none">None</option>
                    </select>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg border border-gray-200 hover:bg-white">
                    <input
                      type="checkbox"
                      name="centralHeating"
                      checked={formData.centralHeating}
                      onChange={handleInputChange}
                      className="w-4 h-4 rounded border-gray-300 text-[#029bba] focus:ring-[#029bba]"
                    />
                    <span className="text-sm text-gray-700">Central Heating</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg border border-gray-200 hover:bg-white">
                    <input
                      type="checkbox"
                      name="intercom"
                      checked={formData.intercom}
                      onChange={handleInputChange}
                      className="w-4 h-4 rounded border-gray-300 text-[#029bba] focus:ring-[#029bba]"
                    />
                    <span className="text-sm text-gray-700">Intercom</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg border border-gray-200 hover:bg-white">
                    <input
                      type="checkbox"
                      name="smartHome"
                      checked={formData.smartHome}
                      onChange={handleInputChange}
                      className="w-4 h-4 rounded border-gray-300 text-[#029bba] focus:ring-[#029bba]"
                    />
                    <span className="text-sm text-gray-700">Smart Home</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg border border-gray-200 hover:bg-white">
                    <input
                      type="checkbox"
                      name="doubleGlazedWindows"
                      checked={formData.doubleGlazedWindows}
                      onChange={handleInputChange}
                      className="w-4 h-4 rounded border-gray-300 text-[#029bba] focus:ring-[#029bba]"
                    />
                    <span className="text-sm text-gray-700">Double Glazed Windows</span>
                  </label>
                </div>
              </div>
            )}

            {/* Exterior Features */}
            <div className="bg-blue-50 rounded-xl p-4">
              <h4 className="font-medium text-gray-800 mb-3">Exterior Features</h4>
              <div className="flex flex-wrap gap-3">
                <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg border border-gray-200 hover:bg-white bg-white">
                  <input
                    type="checkbox"
                    name="boundaryWall"
                    checked={formData.boundaryWall}
                    onChange={handleInputChange}
                    className="w-4 h-4 rounded border-gray-300 text-[#029bba] focus:ring-[#029bba]"
                  />
                  <span className="text-sm text-gray-700">Boundary Wall</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg border border-gray-200 hover:bg-white bg-white">
                  <input
                    type="checkbox"
                    name="garden"
                    checked={formData.garden}
                    onChange={handleInputChange}
                    className="w-4 h-4 rounded border-gray-300 text-[#029bba] focus:ring-[#029bba]"
                  />
                  <span className="text-sm text-gray-700">Garden</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg border border-gray-200 hover:bg-white bg-white">
                  <input
                    type="checkbox"
                    name="swimmingPool"
                    checked={formData.swimmingPool}
                    onChange={handleInputChange}
                    className="w-4 h-4 rounded border-gray-300 text-[#029bba] focus:ring-[#029bba]"
                  />
                  <span className="text-sm text-gray-700">Swimming Pool</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg border border-gray-200 hover:bg-white bg-white">
                  <input
                    type="checkbox"
                    name="terrace"
                    checked={formData.terrace}
                    onChange={handleInputChange}
                    className="w-4 h-4 rounded border-gray-300 text-[#029bba] focus:ring-[#029bba]"
                  />
                  <span className="text-sm text-gray-700">Terrace</span>
                </label>
              </div>
            </div>

            {/* Building Amenities (for apartments/commercial) */}
            {(showFields.floorNumber || showFields.shopDetails) && (
              <div className="bg-purple-50 rounded-xl p-4">
                <h4 className="font-medium text-gray-800 mb-3">Building Amenities</h4>
                <div className="flex flex-wrap gap-3">
                  <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg border border-gray-200 hover:bg-white bg-white">
                    <input
                      type="checkbox"
                      name="elevator"
                      checked={formData.elevator}
                      onChange={handleInputChange}
                      className="w-4 h-4 rounded border-gray-300 text-[#029bba] focus:ring-[#029bba]"
                    />
                    <span className="text-sm text-gray-700">Elevator/Lift</span>
                  </label>

                  {formData.elevator && (
                    <div className="w-24">
                      <Input
                        name="numberOfLifts"
                        type="number"
                        placeholder="Lifts"
                        value={formData.numberOfLifts}
                        onChange={handleInputChange}
                        min="1"
                        max="20"
                        className="text-sm"
                      />
                    </div>
                  )}

                  <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg border border-gray-200 hover:bg-white bg-white">
                    <input
                      type="checkbox"
                      name="generator"
                      checked={formData.generator}
                      onChange={handleInputChange}
                      className="w-4 h-4 rounded border-gray-300 text-[#029bba] focus:ring-[#029bba]"
                    />
                    <span className="text-sm text-gray-700">Generator</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg border border-gray-200 hover:bg-white bg-white">
                    <input
                      type="checkbox"
                      name="fireSafety"
                      checked={formData.fireSafety}
                      onChange={handleInputChange}
                      className="w-4 h-4 rounded border-gray-300 text-[#029bba] focus:ring-[#029bba]"
                    />
                    <span className="text-sm text-gray-700">Fire Safety</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg border border-gray-200 hover:bg-white bg-white">
                    <input
                      type="checkbox"
                      name="reception"
                      checked={formData.reception}
                      onChange={handleInputChange}
                      className="w-4 h-4 rounded border-gray-300 text-[#029bba] focus:ring-[#029bba]"
                    />
                    <span className="text-sm text-gray-700">Reception</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg border border-gray-200 hover:bg-white bg-white">
                    <input
                      type="checkbox"
                      name="gym"
                      checked={formData.gym}
                      onChange={handleInputChange}
                      className="w-4 h-4 rounded border-gray-300 text-[#029bba] focus:ring-[#029bba]"
                    />
                    <span className="text-sm text-gray-700">Gym</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg border border-gray-200 hover:bg-white bg-white">
                    <input
                      type="checkbox"
                      name="buildingPool"
                      checked={formData.buildingPool}
                      onChange={handleInputChange}
                      className="w-4 h-4 rounded border-gray-300 text-[#029bba] focus:ring-[#029bba]"
                    />
                    <span className="text-sm text-gray-700">Pool</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg border border-gray-200 hover:bg-white bg-white">
                    <input
                      type="checkbox"
                      name="communityHall"
                      checked={formData.communityHall}
                      onChange={handleInputChange}
                      className="w-4 h-4 rounded border-gray-300 text-[#029bba] focus:ring-[#029bba]"
                    />
                    <span className="text-sm text-gray-700">Community Hall</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg border border-gray-200 hover:bg-white bg-white">
                    <input
                      type="checkbox"
                      name="kidsPlayArea"
                      checked={formData.kidsPlayArea}
                      onChange={handleInputChange}
                      className="w-4 h-4 rounded border-gray-300 text-[#029bba] focus:ring-[#029bba]"
                    />
                    <span className="text-sm text-gray-700">Kids Play Area</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg border border-gray-200 hover:bg-white bg-white">
                    <input
                      type="checkbox"
                      name="prayerRoom"
                      checked={formData.prayerRoom}
                      onChange={handleInputChange}
                      className="w-4 h-4 rounded border-gray-300 text-[#029bba] focus:ring-[#029bba]"
                    />
                    <span className="text-sm text-gray-700">Prayer Room</span>
                  </label>
                </div>
              </div>
            )}

            {/* Society Amenities */}
            <div className="bg-green-50 rounded-xl p-4">
              <h4 className="font-medium text-gray-800 mb-3">Society Amenities</h4>
              <div className="flex flex-wrap gap-3">
                <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg border border-gray-200 hover:bg-white bg-white">
                  <input
                    type="checkbox"
                    name="mosque"
                    checked={formData.mosque}
                    onChange={handleInputChange}
                    className="w-4 h-4 rounded border-gray-300 text-[#029bba] focus:ring-[#029bba]"
                  />
                  <span className="text-sm text-gray-700">Mosque</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg border border-gray-200 hover:bg-white bg-white">
                  <input
                    type="checkbox"
                    name="school"
                    checked={formData.school}
                    onChange={handleInputChange}
                    className="w-4 h-4 rounded border-gray-300 text-[#029bba] focus:ring-[#029bba]"
                  />
                  <span className="text-sm text-gray-700">School</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg border border-gray-200 hover:bg-white bg-white">
                  <input
                    type="checkbox"
                    name="hospital"
                    checked={formData.hospital}
                    onChange={handleInputChange}
                    className="w-4 h-4 rounded border-gray-300 text-[#029bba] focus:ring-[#029bba]"
                  />
                  <span className="text-sm text-gray-700">Hospital</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg border border-gray-200 hover:bg-white bg-white">
                  <input
                    type="checkbox"
                    name="shoppingMall"
                    checked={formData.shoppingMall}
                    onChange={handleInputChange}
                    className="w-4 h-4 rounded border-gray-300 text-[#029bba] focus:ring-[#029bba]"
                  />
                  <span className="text-sm text-gray-700">Shopping Mall</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg border border-gray-200 hover:bg-white bg-white">
                  <input
                    type="checkbox"
                    name="parks"
                    checked={formData.parks}
                    onChange={handleInputChange}
                    className="w-4 h-4 rounded border-gray-300 text-[#029bba] focus:ring-[#029bba]"
                  />
                  <span className="text-sm text-gray-700">Parks</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg border border-gray-200 hover:bg-white bg-white">
                  <input
                    type="checkbox"
                    name="sportsFacilities"
                    checked={formData.sportsFacilities}
                    onChange={handleInputChange}
                    className="w-4 h-4 rounded border-gray-300 text-[#029bba] focus:ring-[#029bba]"
                  />
                  <span className="text-sm text-gray-700">Sports Facilities</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg border border-gray-200 hover:bg-white bg-white">
                  <input
                    type="checkbox"
                    name="joggingTrack"
                    checked={formData.joggingTrack}
                    onChange={handleInputChange}
                    className="w-4 h-4 rounded border-gray-300 text-[#029bba] focus:ring-[#029bba]"
                  />
                  <span className="text-sm text-gray-700">Jogging Track</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg border border-gray-200 hover:bg-white bg-white">
                  <input
                    type="checkbox"
                    name="communityCenter"
                    checked={formData.communityCenter}
                    onChange={handleInputChange}
                    className="w-4 h-4 rounded border-gray-300 text-[#029bba] focus:ring-[#029bba]"
                  />
                  <span className="text-sm text-gray-700">Community Center</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg border border-gray-200 hover:bg-white bg-white">
                  <input
                    type="checkbox"
                    name="banks"
                    checked={formData.banks}
                    onChange={handleInputChange}
                    className="w-4 h-4 rounded border-gray-300 text-[#029bba] focus:ring-[#029bba]"
                  />
                  <span className="text-sm text-gray-700">Banks</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg border border-gray-200 hover:bg-white bg-white">
                  <input
                    type="checkbox"
                    name="restaurants"
                    checked={formData.restaurants}
                    onChange={handleInputChange}
                    className="w-4 h-4 rounded border-gray-300 text-[#029bba] focus:ring-[#029bba]"
                  />
                  <span className="text-sm text-gray-700">Restaurants</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg border border-gray-200 hover:bg-white bg-white">
                  <input
                    type="checkbox"
                    name="cinema"
                    checked={formData.cinema}
                    onChange={handleInputChange}
                    className="w-4 h-4 rounded border-gray-300 text-[#029bba] focus:ring-[#029bba]"
                  />
                  <span className="text-sm text-gray-700">Cinema</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg border border-gray-200 hover:bg-white bg-white">
                  <input
                    type="checkbox"
                    name="lake"
                    checked={formData.lake}
                    onChange={handleInputChange}
                    className="w-4 h-4 rounded border-gray-300 text-[#029bba] focus:ring-[#029bba]"
                  />
                  <span className="text-sm text-gray-700">Lake/Water Body</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg border border-gray-200 hover:bg-white bg-white">
                  <input
                    type="checkbox"
                    name="golfCourse"
                    checked={formData.golfCourse}
                    onChange={handleInputChange}
                    className="w-4 h-4 rounded border-gray-300 text-[#029bba] focus:ring-[#029bba]"
                  />
                  <span className="text-sm text-gray-700">Golf Course</span>
                </label>
              </div>
            </div>

            {/* Security Features */}
            <div className="bg-red-50 rounded-xl p-4">
              <h4 className="font-medium text-gray-800 mb-3">Security Features</h4>
              <div className="flex flex-wrap gap-3">
                <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg border border-gray-200 hover:bg-white bg-white">
                  <input
                    type="checkbox"
                    name="gatedEntry"
                    checked={formData.gatedEntry}
                    onChange={handleInputChange}
                    className="w-4 h-4 rounded border-gray-300 text-[#029bba] focus:ring-[#029bba]"
                  />
                  <span className="text-sm text-gray-700">Gated Entry</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg border border-gray-200 hover:bg-white bg-white">
                  <input
                    type="checkbox"
                    name="securityGuards24x7"
                    checked={formData.securityGuards24x7}
                    onChange={handleInputChange}
                    className="w-4 h-4 rounded border-gray-300 text-[#029bba] focus:ring-[#029bba]"
                  />
                  <span className="text-sm text-gray-700">24/7 Security Guards</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg border border-gray-200 hover:bg-white bg-white">
                  <input
                    type="checkbox"
                    name="cctvCameras"
                    checked={formData.cctvCameras}
                    onChange={handleInputChange}
                    className="w-4 h-4 rounded border-gray-300 text-[#029bba] focus:ring-[#029bba]"
                  />
                  <span className="text-sm text-gray-700">CCTV Cameras</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg border border-gray-200 hover:bg-white bg-white">
                  <input
                    type="checkbox"
                    name="intercomSystem"
                    checked={formData.intercomSystem}
                    onChange={handleInputChange}
                    className="w-4 h-4 rounded border-gray-300 text-[#029bba] focus:ring-[#029bba]"
                  />
                  <span className="text-sm text-gray-700">Intercom System</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg border border-gray-200 hover:bg-white bg-white">
                  <input
                    type="checkbox"
                    name="smartLock"
                    checked={formData.smartLock}
                    onChange={handleInputChange}
                    className="w-4 h-4 rounded border-gray-300 text-[#029bba] focus:ring-[#029bba]"
                  />
                  <span className="text-sm text-gray-700">Smart Lock</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg border border-gray-200 hover:bg-white bg-white">
                  <input
                    type="checkbox"
                    name="panicButton"
                    checked={formData.panicButton}
                    onChange={handleInputChange}
                    className="w-4 h-4 rounded border-gray-300 text-[#029bba] focus:ring-[#029bba]"
                  />
                  <span className="text-sm text-gray-700">Panic Button</span>
                </label>
              </div>
            </div>
          </div>
        </FormSection>

        {/* ============================================ */}
        {/* SECTION 10: LEGAL & OWNERSHIP */}
        {/* ============================================ */}
        <FormSection
          id="legal"
          title="Legal & Ownership"
          icon={SECTION_ICONS.legal}
          isOpen={openSections.legal}
          onToggle={() => toggleSection('legal')}
          isRequired={true}
          errorCount={sectionErrorCounts.legal}
        >
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ownership Type <span className="text-red-500">*</span>
                </label>
                <select
                  name="ownershipType"
                  value={formData.ownershipType}
                  onChange={handleInputChange}
                  onBlur={() => handleBlur('ownershipType')}
                  className={`w-full border rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-[#029bba] focus:border-transparent ${
                    showError('ownershipType') ? 'border-red-500' : 'border-gray-300'
                  }`}
                >
                  <option value="freehold">Freehold</option>
                  <option value="leasehold">Leasehold</option>
                  <option value="power_of_attorney">Power of Attorney</option>
                </select>
                {showError('ownershipType') && (
                  <p className="text-red-500 text-sm mt-1">{errors.ownershipType}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  File Type <span className="text-red-500">*</span>
                </label>
                <select
                  name="fileType"
                  value={formData.fileType}
                  onChange={handleInputChange}
                  onBlur={() => handleBlur('fileType')}
                  className={`w-full border rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-[#029bba] focus:border-transparent ${
                    showError('fileType') ? 'border-red-500' : 'border-gray-300'
                  }`}
                >
                  {FILE_TYPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {showError('fileType') && (
                  <p className="text-red-500 text-sm mt-1">{errors.fileType}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Transfer Type
                </label>
                <select
                  name="transferType"
                  value={formData.transferType}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-[#029bba] focus:border-transparent"
                >
                  <option value="">Select Type</option>
                  {TRANSFER_TYPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Documents Available */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Documents Available
              </label>
              <div className="flex flex-wrap gap-2">
                {DOCUMENTS_AVAILABLE_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => handleArrayToggle('documentsAvailable', option.id)}
                    className={`px-3 py-1.5 rounded-full text-sm border transition-all ${
                      formData.documentsAvailable.includes(option.id)
                        ? 'bg-[#029bba] text-white border-[#029bba]'
                        : 'bg-white text-gray-600 border-gray-300 hover:border-[#029bba]'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Resale - Previous Owner */}
            {formData.listingPurpose === 'resale' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Previous Owner Name
                </label>
                <Input
                  name="previousOwner"
                  type="text"
                  placeholder="Name of previous/current owner"
                  value={formData.previousOwner}
                  onChange={handleInputChange}
                />
              </div>
            )}

            {/* Dispute */}
            <div className="bg-yellow-50 rounded-xl p-4">
              <label className="flex items-center gap-2 cursor-pointer mb-3">
                <input
                  type="checkbox"
                  name="hasDispute"
                  checked={formData.hasDispute}
                  onChange={handleInputChange}
                  className="w-4 h-4 rounded border-gray-300 text-[#029bba] focus:ring-[#029bba]"
                />
                <span className="text-sm font-medium text-gray-700">Property has legal dispute</span>
              </label>

              {formData.hasDispute && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Dispute Details
                  </label>
                  <textarea
                    name="disputeDetails"
                    rows={3}
                    placeholder="Describe the dispute..."
                    value={formData.disputeDetails}
                    onChange={handleInputChange}
                    className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-[#029bba] focus:border-transparent"
                  />
                </div>
              )}
            </div>

            {/* Society Membership */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="flex items-center gap-2 cursor-pointer p-3 rounded-lg border border-gray-200 hover:bg-gray-50">
                <input
                  type="checkbox"
                  name="societyMembershipRequired"
                  checked={formData.societyMembershipRequired}
                  onChange={handleInputChange}
                  className="w-4 h-4 rounded border-gray-300 text-[#029bba] focus:ring-[#029bba]"
                />
                <span className="text-sm text-gray-700">Society Membership Required</span>
              </label>

              {formData.societyMembershipRequired && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Membership Transfer Fee
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                      Rs.
                    </span>
                    <Input
                      name="membershipTransferFee"
                      type="text"
                      placeholder="e.g., 50,000"
                      value={formData.membershipTransferFee}
                      onChange={handlePriceChange}
                      className="pl-10"
                    />
                  </div>
                </div>
              )}
            </div>

            <label className="flex items-center gap-2 cursor-pointer p-3 rounded-lg border border-gray-200 hover:bg-gray-50">
              <input
                type="checkbox"
                name="taxPaidUpToDate"
                checked={formData.taxPaidUpToDate}
                onChange={handleInputChange}
                className="w-4 h-4 rounded border-gray-300 text-[#029bba] focus:ring-[#029bba]"
              />
              <span className="text-sm text-gray-700">All taxes paid up to date</span>
            </label>
          </div>
        </FormSection>

{/* ============================================ */}
{/* SECTION 11: TAXES & EXTRA CHARGES */}
{/* ============================================ */}
<FormSection
  id="taxes"
  title="Taxes & Extra Charges"
  icon={SECTION_ICONS.taxes}
  isOpen={openSections.taxes}
  onToggle={() => toggleSection('taxes')}
  isRequired={false}
  errorCount={sectionErrorCounts.taxes}
>
  <div className="space-y-6">
    {/* Purpose-specific guidance */}
    <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-xs text-blue-800">
      {formData.listingPurpose === 'new_booking' && (
        <>
          <p className="font-semibold mb-1">For New Booking (Fresh from Developer)</p>
          <p>
            In most projects, government transfer taxes (stamp duty, CVT, WHT/advance tax)
            and society transfer fees are usually paid later at the time of registry /
            name transfer, not at initial booking. Use this section to record the expected
            taxes and charges the buyer should plan for at registry/transfer, based on
            current Govt &amp; Society rules.
          </p>
        </>
      )}

      {formData.listingPurpose === 'resale' && (
        <>
          <p className="font-semibold mb-1">For Resale (Existing Booking / Property)</p>
          <p>
            In a resale, the new buyer typically pays the transfer taxes and society
            charges at registry/transfer, and also takes over any pending developer
            charges (if any). The seller is responsible for their own income / capital
            gains taxes. Use this section to list all one-time charges and taxes the
            buyer should expect when the property is transferred into their name.
          </p>
        </>
      )}

      {formData.listingPurpose === 'transfer' && (
        <>
          <p className="font-semibold mb-1">For Transfer of Ownership</p>
          <p>
            For a pure transfer (name change / registry), focus on the one-time charges
            payable now: society / authority fees and government transfer taxes. Any
            remaining developer or society charges that must be paid for transfer should
            also be clearly mentioned here so the new owner is not surprised later.
          </p>
        </>
      )}

      {!formData.listingPurpose && (
        <>
          <p className="font-semibold mb-1">Taxes &amp; Charges Overview</p>
          <p>
            This section summarizes all government taxes, society/authority charges,
            developer extra charges and possession / utility fees expected at the time of
            transfer / registry. Please fill amounts as per latest Govt &amp; Society
            policies for this project.
          </p>
        </>
      )}
    </div>

    {/* Government Taxes */}
    <div className="bg-gray-50 rounded-xl p-4">
      <h4 className="font-medium text-gray-800 mb-1 flex items-center gap-2">
        <Landmark className="w-4 h-4 text-gray-600" />
        Government Taxes
      </h4>
      <p className="text-xs text-gray-500 mb-3">
        These values are used by government (province &amp; FBR) to calculate stamp duty,
        CVT and WHT/advance tax at the time of registry/transfer. Please use the latest
        rates from your tax consultant or relevant authority.
      </p>

      {/* Valuation for Taxes */}
      <p className="text-xs font-semibold text-gray-600 mb-2">
        Valuation for taxes (DC &amp; FBR)
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            DC Rate (Collector Rate)
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
              Rs.
            </span>
            <Input
              name="dcRate"
              type="text"
              placeholder="e.g., 50,00,000"
              value={formData.dcRate}
              onChange={handlePriceChange}
              className="pl-10"
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Total DC (District Collector) value for this unit (rate × area). Used for
            provincial taxes like stamp duty &amp; CVT.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            FBR Value
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
              Rs.
            </span>
            <Input
              name="fbrValue"
              type="text"
              placeholder="e.g., 60,00,000"
              value={formData.fbrValue}
              onChange={handlePriceChange}
              className="pl-10"
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Total FBR valuation for this unit (valuation rate × area). Used for federal
            taxes like WHT and capital gains.
          </p>
        </div>
      </div>

      {/* Stamp Duty */}
      <p className="text-xs font-semibold text-gray-600 mb-2">
        Provincial transfer taxes (Stamp Duty &amp; CVT)
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Stamp Duty (%)
          </label>
          <Input
            name="stampDutyPercent"
            type="number"
            placeholder="e.g., 1"
            value={formData.stampDutyPercent}
            onChange={handleInputChange}
            min="0"
            max="10"
            step="0.1"
          />
          <p className="text-xs text-gray-500 mt-1">
            Rate applied on DC/FBR value (for reference). Actual payable amount is entered below.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Stamp Duty Amount
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
              Rs.
            </span>
            <Input
              name="stampDutyAmount"
              type="text"
              placeholder="Auto or manual"
              value={formData.stampDutyAmount}
              onChange={handlePriceChange}
              className="pl-10"
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Total stamp duty payable on registry for this unit (in Rupees).
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Paid By
          </label>
          <select
            name="stampDutyPaidBy"
            value={formData.stampDutyPaidBy}
            onChange={handleInputChange}
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-[#029bba] focus:border-transparent"
          >
            <option value="buyer">Buyer</option>
            <option value="seller">Seller</option>
            <option value="shared">Shared 50-50</option>
            <option value="negotiable">Negotiable</option>
          </select>
          <p className="text-xs text-gray-500 mt-1">
            Who is expected to pay this tax at transfer – buyer, seller or shared.
          </p>
        </div>
      </div>

      {/* CVT */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            CVT (%)
          </label>
          <Input
            name="cvtPercent"
            type="number"
            placeholder="e.g., 2"
            value={formData.cvtPercent}
            onChange={handleInputChange}
            min="0"
            max="10"
            step="0.1"
          />
          <p className="text-xs text-gray-500 mt-1">
            Capital Value Tax rate on DC/FBR value (for reference).
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            CVT Amount
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
              Rs.
            </span>
            <Input
              name="cvtAmount"
              type="text"
              placeholder="Auto or manual"
              value={formData.cvtAmount}
              onChange={handlePriceChange}
              className="pl-10"
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Total CVT payable on transfer (in Rupees).
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Paid By
          </label>
          <select
            name="cvtPaidBy"
            value={formData.cvtPaidBy}
            onChange={handleInputChange}
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-[#029bba] focus:border-transparent"
          >
            <option value="buyer">Buyer</option>
            <option value="seller">Seller</option>
            <option value="shared">Shared 50-50</option>
            <option value="negotiable">Negotiable</option>
          </select>
          <p className="text-xs text-gray-500 mt-1">
            Who is expected to pay this CVT at transfer.
          </p>
        </div>
      </div>

      {/* WHT & Advance Tax */}
      <p className="text-xs font-semibold text-gray-600 mb-2">
        Federal taxes (WHT / Advance Tax)
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            WHT (Filer)
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
              Rs.
            </span>
            <Input
              name="whtFiler"
              type="text"
              placeholder="e.g., 3,00,000"
              value={formData.whtFiler}
              onChange={handlePriceChange}
              className="pl-10"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            WHT (Non-Filer)
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
              Rs.
            </span>
            <Input
              name="whtNonFiler"
              type="text"
              placeholder="e.g., 10,50,000"
              value={formData.whtNonFiler}
              onChange={handlePriceChange}
              className="pl-10"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Advance Tax (Filer)
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
              Rs.
            </span>
            <Input
              name="advanceTaxFiler"
              type="text"
              placeholder="e.g., 3,00,000"
              value={formData.advanceTaxFiler}
              onChange={handlePriceChange}
              className="pl-10"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Advance Tax (Non-Filer)
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
              Rs.
            </span>
            <Input
              name="advanceTaxNonFiler"
              type="text"
              placeholder="e.g., 10,50,000"
              value={formData.advanceTaxNonFiler}
              onChange={handlePriceChange}
              className="pl-10"
            />
          </div>
        </div>
      </div>
      <p className="text-xs text-gray-500 mt-2">
        Enter total WHT / advance tax amounts in Rupees for filer and non-filer scenarios,
        based on FBR rules and current budget. These are usually collected at the time of
        transfer/registry.
      </p>
    </div>

    {/* Society/Transfer Charges */}
    <div className="bg-blue-50 rounded-xl p-4">
      <h4 className="font-medium text-gray-800 mb-1">Society / Transfer Charges</h4>
      <p className="text-xs text-gray-500 mb-3">
        Charges paid to the housing society or authority for transfer, NOC and updating
        records in buyer&apos;s name.
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Society Transfer Fee
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
              Rs.
            </span>
            <Input
              name="societyTransferFee"
              type="text"
              placeholder="e.g., 1,00,000"
              value={formData.societyTransferFee}
              onChange={handlePriceChange}
              className="pl-10"
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Society&apos;s own fee for transferring ownership.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            NOC Charges
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
              Rs.
            </span>
            <Input
              name="nocCharges"
              type="text"
              placeholder="e.g., 10,000"
              value={formData.nocCharges}
              onChange={handlePriceChange}
              className="pl-10"
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">
            NOC / clearance charges from society or authority.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Registration Fee
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
              Rs.
            </span>
            <Input
              name="registrationFee"
              type="text"
              placeholder="e.g., 5,000"
              value={formData.registrationFee}
              onChange={handlePriceChange}
              className="pl-10"
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Registry / documentation fee charged by registrar or authority.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Mutation Fee
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
              Rs.
            </span>
            <Input
              name="mutationFee"
              type="text"
              placeholder="e.g., 5,000"
              value={formData.mutationFee}
              onChange={handlePriceChange}
              className="pl-10"
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Mutation / transfer entry fee in land records.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Membership Transfer Fee
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
              Rs.
            </span>
            <Input
              name="membershipTransferFeeCharges"
              type="text"
              placeholder="e.g., 25,000"
              value={formData.membershipTransferFeeCharges}
              onChange={handlePriceChange}
              className="pl-10"
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Fee for transferring society membership / allotment to the new owner.
          </p>
        </div>
      </div>
    </div>

    {/* Extra Charges */}
    <div className="bg-orange-50 rounded-xl p-4">
      <h4 className="font-medium text-gray-800 mb-1">Extra Charges (Developer)</h4>
      <p className="text-xs text-gray-500 mb-3">
        Charges set by the developer on top of basic unit price, usually based on location,
        view, or construction features.
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Corner Charges
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
              Rs.
            </span>
            <Input
              name="cornerCharges"
              type="text"
              placeholder="0"
              value={formData.cornerCharges}
              onChange={handlePriceChange}
              className="pl-10"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Facing Charges
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
              Rs.
            </span>
            <Input
              name="facingCharges"
              type="text"
              placeholder="0"
              value={formData.facingCharges}
              onChange={handlePriceChange}
              className="pl-10"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Floor Preference
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
              Rs.
            </span>
            <Input
              name="floorPreferenceCharges"
              type="text"
              placeholder="0"
              value={formData.floorPreferenceCharges}
              onChange={handlePriceChange}
              className="pl-10"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Development Charges
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
              Rs.
            </span>
            <Input
              name="developmentCharges"
              type="text"
              placeholder="0"
              value={formData.developmentCharges}
              onChange={handlePriceChange}
              className="pl-10"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Documentation Charges
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
              Rs.
            </span>
            <Input
              name="documentationCharges"
              type="text"
              placeholder="0"
              value={formData.documentationCharges}
              onChange={handlePriceChange}
              className="pl-10"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Processing Fee
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
              Rs.
            </span>
            <Input
              name="processingFee"
              type="text"
              placeholder="0"
              value={formData.processingFee}
              onChange={handlePriceChange}
              className="pl-10"
            />
          </div>
        </div>
      </div>
    </div>

    {/* Possession Charges */}
    <div className="bg-green-50 rounded-xl p-4">
      <h4 className="font-medium text-gray-800 mb-1">Possession Charges (One-Time)</h4>
      <p className="text-xs text-gray-500 mb-3">
        One-time charges usually collected at the time of possession / handover for
        utilities, security deposit and initial maintenance.
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Possession Fee
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
              Rs.
            </span>
            <Input
              name="possessionFee"
              type="text"
              placeholder="0"
              value={formData.possessionFee}
              onChange={handlePriceChange}
              className="pl-10"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Electricity Meter
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
              Rs.
            </span>
            <Input
              name="electricityMeterCharges"
              type="text"
              placeholder="0"
              value={formData.electricityMeterCharges}
              onChange={handlePriceChange}
              className="pl-10"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Gas Meter
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
              Rs.
            </span>
            <Input
              name="gasMeterCharges"
              type="text"
              placeholder="0"
              value={formData.gasMeterCharges}
              onChange={handlePriceChange}
              className="pl-10"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Water Connection
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
              Rs.
            </span>
            <Input
              name="waterConnectionCharges"
              type="text"
              placeholder="0"
              value={formData.waterConnectionCharges}
              onChange={handlePriceChange}
              className="pl-10"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Generator Share
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
              Rs.
            </span>
            <Input
              name="generatorShare"
              type="text"
              placeholder="0"
              value={formData.generatorShare}
              onChange={handlePriceChange}
              className="pl-10"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Security Deposit
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
              Rs.
            </span>
            <Input
              name="securityDeposit"
              type="text"
              placeholder="0"
              value={formData.securityDeposit}
              onChange={handlePriceChange}
              className="pl-10"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Advance Maintenance
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
              Rs.
            </span>
            <Input
              name="advanceMaintenance"
              type="text"
              placeholder="0"
              value={formData.advanceMaintenance}
              onChange={handlePriceChange}
              className="pl-10"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Sinking Fund
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
              Rs.
            </span>
            <Input
              name="sinkingFund"
              type="text"
              placeholder="0"
              value={formData.sinkingFund}
              onChange={handlePriceChange}
              className="pl-10"
            />
          </div>
        </div>
      </div>
    </div>

    {/* Maintenance */}
    <div className="bg-purple-50 rounded-xl p-4">
      <h4 className="font-medium text-gray-800 mb-1">Monthly Maintenance</h4>
      <p className="text-xs text-gray-500 mb-3">
        Recurring monthly maintenance charges after possession (can be included in rent
        or paid separately to society/management company).
      </p>

      <label className="flex items-center gap-2 cursor-pointer mb-3">
        <input
          type="checkbox"
          name="maintenanceApplicable"
          checked={formData.maintenanceApplicable}
          onChange={handleInputChange}
          className="w-4 h-4 rounded border-gray-300 text-[#029bba] focus:ring-[#029bba]"
        />
        <span className="text-sm font-medium text-gray-700">
          Maintenance Applicable
        </span>
      </label>

      {formData.maintenanceApplicable && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Maintenance Status
              </label>
              <select
                name="maintenanceIncluded"
                value={formData.maintenanceIncluded}
                onChange={handleInputChange}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-[#029bba] focus:border-transparent"
              >
                {MAINTENANCE_INCLUDED_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Calculation Type
              </label>
              <select
                name="maintenanceCalculation"
                value={formData.maintenanceCalculation}
                onChange={handleInputChange}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-[#029bba] focus:border-transparent"
              >
                {MAINTENANCE_CALCULATION_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {formData.maintenanceCalculation === 'per_sqft' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rate per Sq. Ft.
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                    Rs.
                  </span>
                  <Input
                    name="maintenancePerSqft"
                    type="text"
                    placeholder="e.g., 5"
                    value={formData.maintenancePerSqft}
                    onChange={handlePriceChange}
                    className="pl-10"
                  />
                </div>
              </div>
            )}

            {formData.maintenanceCalculation === 'fixed' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fixed Monthly Amount
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                    Rs.
                  </span>
                  <Input
                    name="fixedMaintenanceAmount"
                    type="text"
                    placeholder="e.g., 5,000"
                    value={formData.fixedMaintenanceAmount}
                    onChange={handlePriceChange}
                    className="pl-10"
                  />
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Maintenance Covers
            </label>
            <div className="flex flex-wrap gap-2">
              {MAINTENANCE_COVERS_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => handleArrayToggle('maintenanceCovers', option.id)}
                  className={`px-3 py-1.5 rounded-full text-xs border transition-all ${
                    formData.maintenanceCovers.includes(option.id)
                      ? 'bg-[#029bba] text-white border-[#029bba]'
                      : 'bg-white text-gray-600 border-gray-300 hover:border-[#029bba]'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Managed By
            </label>
            <Input
              name="maintenanceManagedBy"
              type="text"
              placeholder="e.g., DHA Management Company"
              value={formData.maintenanceManagedBy}
              onChange={handleInputChange}
            />
          </div>
        </>
      )}
    </div>

    {/* Hidden Charges Disclosure */}
    <div className="bg-red-50 rounded-xl p-4">
      <h4 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-red-500" />
        Hidden Charges Disclosure
      </h4>
      <p className="text-xs text-gray-500 mb-3">
        Clearly disclose any clauses that can change price or impose extra penalties,
        so buyers are not surprised later. This builds trust and transparency.
      </p>

      <div className="space-y-3">
        <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-white">
          <input
            type="checkbox"
            name="escalationClause"
            checked={formData.escalationClause}
            onChange={handleInputChange}
            className="w-4 h-4 rounded border-gray-300 text-[#029bba] focus:ring-[#029bba]"
          />
          <span className="text-sm text-gray-700">
            Price Escalation Clause (price may increase)
          </span>
        </label>

        {formData.escalationClause && (
          <Input
            name="escalationDetails"
            type="text"
            placeholder="Describe escalation terms (e.g., price increase if material cost rises)..."
            value={formData.escalationDetails}
            onChange={handleInputChange}
            className="ml-6"
          />
        )}

        <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-white">
          <input
            type="checkbox"
            name="delayPenalty"
            checked={formData.delayPenalty}
            onChange={handleInputChange}
            className="w-4 h-4 rounded border-gray-300 text-[#029bba] focus:ring-[#029bba]"
          />
          <span className="text-sm text-gray-700">
            Delay Penalty (for late payments)
          </span>
        </label>

        {formData.delayPenalty && (
          <Input
            name="delayPenaltyDetails"
            type="text"
            placeholder="e.g., Rs. 5,000 per month delay"
            value={formData.delayPenaltyDetails}
            onChange={handleInputChange}
            className="ml-6"
          />
        )}

        <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-white">
          <input
            type="checkbox"
            name="allChargesDisclosed"
            checked={formData.allChargesDisclosed}
            onChange={handleInputChange}
            className="w-4 h-4 rounded border-gray-300 text-[#029bba] focus:ring-[#029bba]"
          />
          <span className="text-sm text-gray-700 font-medium">
            I confirm all charges have been disclosed
          </span>
        </label>
      </div>
    </div>
  </div>
</FormSection> 

        {/* ============================================ */}
        {/* SECTION 12: DOCUMENTS UPLOAD */}
        {/* ============================================ */}
        <FormSection
          id="documents"
          title="Documents Upload"
          icon={SECTION_ICONS.documents}
          isOpen={openSections.documents}
          onToggle={() => toggleSection('documents')}
          isRequired={false}
          errorCount={sectionErrorCounts.documents}
        >
          <div className="space-y-4">
            <InfoBox type="info">
              Upload relevant documents to build buyer trust. Accepted formats: PDF, JPG, PNG (Max 10MB each)
            </InfoBox>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Payment Plan */}
              <div className="border border-dashed border-gray-300 rounded-lg p-4 hover:border-[#029bba] transition-colors">
                <label className="block cursor-pointer">
                  <div className="flex items-center gap-3 mb-2">
                    <FileText className="w-5 h-5 text-gray-400" />
                    <span className="text-sm font-medium text-gray-700">Payment Plan</span>
                  </div>
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.webp"
                    onChange={(e) => handleDocumentUpload(e, 'paymentPlanDoc', false)}
                    className="hidden"
                  />
                  <div className="text-xs text-gray-500">
                    {formData.paymentPlanDoc ? (
                      <span className="text-green-600 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        {formData.paymentPlanDoc.name}
                      </span>
                    ) : (
                      'Click to upload'
                    )}
                  </div>
                </label>
              </div>

              {/* Floor Plan */}
              <div className="border border-dashed border-gray-300 rounded-lg p-4 hover:border-[#029bba] transition-colors">
                <label className="block cursor-pointer">
                  <div className="flex items-center gap-3 mb-2">
                    <FileText className="w-5 h-5 text-gray-400" />
                    <span className="text-sm font-medium text-gray-700">Floor Plans</span>
                  </div>
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.webp"
                    multiple
                    onChange={(e) => handleDocumentUpload(e, 'floorPlanDocs', true)}
                    className="hidden"
                  />
                  <div className="text-xs text-gray-500">
                    {formData.floorPlanDocs.length > 0 ? (
                      <span className="text-green-600 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        {formData.floorPlanDocs.length} file(s) uploaded
                      </span>
                    ) : (
                      'Click to upload (multiple)'
                    )}
                  </div>
                </label>
              </div>

              {/* Site Map */}
              <div className="border border-dashed border-gray-300 rounded-lg p-4 hover:border-[#029bba] transition-colors">
                <label className="block cursor-pointer">
                  <div className="flex items-center gap-3 mb-2">
                    <MapPin className="w-5 h-5 text-gray-400" />
                    <span className="text-sm font-medium text-gray-700">Site Map</span>
                  </div>
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.webp"
                    onChange={(e) => handleDocumentUpload(e, 'siteMapDoc', false)}
                    className="hidden"
                  />
                  <div className="text-xs text-gray-500">
                    {formData.siteMapDoc ? (
                      <span className="text-green-600 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        {formData.siteMapDoc.name}
                      </span>
                    ) : (
                      'Click to upload'
                    )}
                  </div>
                </label>
              </div>

              {/* Allocation Letter */}
              <div className="border border-dashed border-gray-300 rounded-lg p-4 hover:border-[#029bba] transition-colors">
                <label className="block cursor-pointer">
                  <div className="flex items-center gap-3 mb-2">
                    <FileText className="w-5 h-5 text-gray-400" />
                    <span className="text-sm font-medium text-gray-700">Allocation Letter</span>
                  </div>
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.webp"
                    onChange={(e) => handleDocumentUpload(e, 'allocationLetterDoc', false)}
                    className="hidden"
                  />
                  <div className="text-xs text-gray-500">
                    {formData.allocationLetterDoc ? (
                      <span className="text-green-600 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        {formData.allocationLetterDoc.name}
                      </span>
                    ) : (
                      'Click to upload'
                    )}
                  </div>
                </label>
              </div>

              {/* NOC */}
              <div className="border border-dashed border-gray-300 rounded-lg p-4 hover:border-[#029bba] transition-colors">
                <label className="block cursor-pointer">
                  <div className="flex items-center gap-3 mb-2">
                    <BadgeCheck className="w-5 h-5 text-gray-400" />
                    <span className="text-sm font-medium text-gray-700">NOC Document</span>
                  </div>
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.webp"
                    onChange={(e) => handleDocumentUpload(e, 'nocDoc', false)}
                    className="hidden"
                  />
                  <div className="text-xs text-gray-500">
                    {formData.nocDoc ? (
                      <span className="text-green-600 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        {formData.nocDoc.name}
                      </span>
                    ) : (
                      'Click to upload'
                    )}
                  </div>
                </label>
              </div>

              {/* Brochure */}
              <div className="border border-dashed border-gray-300 rounded-lg p-4 hover:border-[#029bba] transition-colors">
                <label className="block cursor-pointer">
                  <div className="flex items-center gap-3 mb-2">
                    <FileText className="w-5 h-5 text-gray-400" />
                    <span className="text-sm font-medium text-gray-700">Brochure</span>
                  </div>
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.webp"
                    onChange={(e) => handleDocumentUpload(e, 'brochureDoc', false)}
                    className="hidden"
                  />
                  <div className="text-xs text-gray-500">
                    {formData.brochureDoc ? (
                      <span className="text-green-600 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        {formData.brochureDoc.name}
                      </span>
                    ) : (
                      'Click to upload'
                    )}
                  </div>
                </label>
              </div>
            </div>
          </div>
        </FormSection>

        {/* ============================================ */}
        {/* SECTION 13: MEDIA (Images/Videos) */}
        {/* ============================================ */}
        <FormSection
          id="media"
          title="Images & Videos"
          icon={SECTION_ICONS.media}
          isOpen={openSections.media}
          onToggle={() => toggleSection('media')}
          isRequired={true}
          errorCount={sectionErrorCounts.media}
        >
          <div className="space-y-4">
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
                This will be the main image shown in search results and property cards
              </p>
            </div>

            {/* ✅ Gallery Images with Categories */}
            <div>
              <GalleryUploader
                label="Property Gallery"
                value={galleryImages}
                onChange={setGalleryImages}
                folder="properties/gallery"
                maxImages={30}
                showCategories={true}
              />
              <p className="text-xs text-gray-400 mt-1">
                Add multiple images and categorize them (Exterior, Interior, Floor Plan, etc.)
              </p>
            </div>

            {/* Videos */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Property Video (YouTube/Vimeo)
                </label>
                <Input
                  name="videoUrl"
                  type="url"
                  placeholder="https://youtube.com/watch?v=..."
                  value={formData.videoUrl}
                  onChange={handleInputChange}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Drone Video
                </label>
                <Input
                  name="droneVideoUrl"
                  type="url"
                  placeholder="https://youtube.com/watch?v=..."
                  value={formData.droneVideoUrl}
                  onChange={handleInputChange}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Virtual Tour (360°)
                </label>
                <Input
                  name="virtualTourUrl"
                  type="url"
                  placeholder="https://..."
                  value={formData.virtualTourUrl}
                  onChange={handleInputChange}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Construction Progress Video
                </label>
                <Input
                  name="constructionVideoUrl"
                  type="url"
                  placeholder="https://youtube.com/watch?v=..."
                  value={formData.constructionVideoUrl}
                  onChange={handleInputChange}
                />
              </div>
            </div>
          </div>
        </FormSection>

        {/* ============================================ */}
        {/* SECTION 14: DESCRIPTION */}
        {/* ============================================ */}
        <FormSection
          id="description"
          title="Description"
          icon={SECTION_ICONS.description}
          isOpen={openSections.description}
          onToggle={() => toggleSection('description')}
          isRequired={true}
          errorCount={sectionErrorCounts.description}
        >
          <div className="space-y-4">
            {/* ✅ Rich Text Description */}
            <div>
              <RichTextEditor
                label="Full Description"
                value={formData.description}
                onChange={(value: string) =>
                  setFormData((prev) => ({ ...prev, description: value }))
                }
                placeholder="Describe your property in detail. Include key features, nearby landmarks, investment potential, reason for selling, etc."
                error={touched.description ? errors.description : undefined}
                required
              />
              <p className="text-xs text-gray-400 mt-1">
                Use formatting tools to make your description stand out
              </p>
            </div>

            {/* Short Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Short Description (for listings)
              </label>
              <textarea
                name="shortDescription"
                rows={2}
                placeholder="Brief summary for search results..."
                value={formData.shortDescription}
                onChange={handleInputChange}
                className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-[#029bba] focus:border-transparent"
                maxLength={500}
              />
              <p className="text-xs text-gray-400 mt-1">
                {formData.shortDescription.length}/500 characters
              </p>
            </div>

            {/* Investment Highlights */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Investment Highlights
              </label>
              <textarea
                name="investmentHighlights"
                rows={3}
                placeholder="Why is this a good investment? Expected ROI, development potential, etc."
                value={formData.investmentHighlights}
                onChange={handleInputChange}
                className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-[#029bba] focus:border-transparent"
              />
            </div>

            {/* Why Buy This */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Why Buy This Property?
              </label>
              <textarea
                name="whyBuyThis"
                rows={3}
                placeholder="Key selling points, unique features, advantages..."
                value={formData.whyBuyThis}
                onChange={handleInputChange}
                className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-[#029bba] focus:border-transparent"
              />
            </div>
          </div>
        </FormSection>

        {/* ============================================ */}
        {/* SECTION 15: CONTACT PREFERENCES */}
        {/* ============================================ */}
        <FormSection
          id="contact"
          title="Contact Details"
          icon={SECTION_ICONS.contact}
          isOpen={openSections.contact}
          onToggle={() => toggleSection('contact')}
          isRequired={true}
          errorCount={sectionErrorCounts.contact}
        >
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contact Person
                </label>
                <Input
                  name="contactPerson"
                  type="text"
                  placeholder="Your name"
                  value={formData.contactPerson}
                  onChange={handleInputChange}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Primary Phone <span className="text-red-500">*</span>
                </label>
                <Input
                  name="primaryPhone"
                  type="tel"
                  placeholder="03XX-XXXXXXX"
                  value={formData.primaryPhone}
                  onChange={handleInputChange}
                  onBlur={() => handleBlur('primaryPhone')}
                  className={showError('primaryPhone') ? 'border-red-500' : ''}
                />
                {showError('primaryPhone') && (
                  <p className="text-red-500 text-sm mt-1">{errors.primaryPhone}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Secondary Phone
                </label>
                <Input
                  name="secondaryPhone"
                  type="tel"
                  placeholder="03XX-XXXXXXX"
                  value={formData.secondaryPhone}
                  onChange={handleInputChange}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  WhatsApp Number
                </label>
                <Input
                  name="whatsappNumber"
                  type="tel"
                  placeholder="03XX-XXXXXXX"
                  value={formData.whatsappNumber}
                  onChange={handleInputChange}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <Input
                  name="contactEmail"
                  type="email"
                  placeholder="your@email.com"
                  value={formData.contactEmail}
                  onChange={handleInputChange}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Preferred Contact Method
                </label>
                <select
                  name="preferredContactMethod"
                  value={formData.preferredContactMethod}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-[#029bba] focus:border-transparent"
                >
                  {CONTACT_METHOD_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Best Time to Call
                </label>
                <select
                  name="bestTimeToCall"
                  value={formData.bestTimeToCall}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-[#029bba] focus:border-transparent"
                >
                  {CONTACT_TIME_OPTIONS_INST.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 cursor-pointer p-3 rounded-lg border border-gray-200 hover:bg-gray-50">
                <input
                  type="checkbox"
                  name="showPhoneOnListing"
                  checked={formData.showPhoneOnListing}
                  onChange={handleInputChange}
                  className="w-4 h-4 rounded border-gray-300 text-[#029bba] focus:ring-[#029bba]"
                />
                <span className="text-sm text-gray-700">Show phone on listing</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer p-3 rounded-lg border border-gray-200 hover:bg-gray-50">
                <input
                  type="checkbox"
                  name="allowWhatsAppMessages"
                  checked={formData.allowWhatsAppMessages}
                  onChange={handleInputChange}
                  className="w-4 h-4 rounded border-gray-300 text-[#029bba] focus:ring-[#029bba]"
                />
                <span className="text-sm text-gray-700">Allow WhatsApp messages</span>
              </label>
            </div>
          </div>
        </FormSection>

        {/* ============================================ */}
        {/* TERMS & CONDITIONS */}
        {/* ============================================ */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
          <h3 className="font-semibold text-gray-800">Terms & Conditions</h3>

          <div className="space-y-3">
            <label className={`flex items-start gap-3 cursor-pointer p-3 rounded-lg border ${
              errors.termsAccepted ? 'border-red-300 bg-red-50' : 'border-gray-200 hover:bg-gray-50'
            }`}>
              <input
                type="checkbox"
                name="termsAccepted"
                checked={formData.termsAccepted}
                onChange={handleInputChange}
                className="w-4 h-4 mt-0.5 rounded border-gray-300 text-[#029bba] focus:ring-[#029bba]"
              />
              <span className="text-sm text-gray-700">
                I confirm that all information provided is accurate and complete.
              </span>
            </label>

            <label className={`flex items-start gap-3 cursor-pointer p-3 rounded-lg border ${
              errors.privacyAccepted ? 'border-red-300 bg-red-50' : 'border-gray-200 hover:bg-gray-50'
            }`}>
              <input
                type="checkbox"
                name="privacyAccepted"
                checked={formData.privacyAccepted}
                onChange={handleInputChange}
                className="w-4 h-4 mt-0.5 rounded border-gray-300 text-[#029bba] focus:ring-[#029bba]"
              />
              <span className="text-sm text-gray-700">
                I agree to the <a href="/terms" className="text-[#029bba] underline">Terms of Service</a> and <a href="/privacy" className="text-[#029bba] underline">Privacy Policy</a>.
              </span>
            </label>

            <label className={`flex items-start gap-3 cursor-pointer p-3 rounded-lg border ${
              errors.accuracyConfirmed ? 'border-red-300 bg-red-50' : 'border-gray-200 hover:bg-gray-50'
            }`}>
              <input
                type="checkbox"
                name="accuracyConfirmed"
                checked={formData.accuracyConfirmed}
                onChange={handleInputChange}
                className="w-4 h-4 mt-0.5 rounded border-gray-300 text-[#029bba] focus:ring-[#029bba]"
              />
              <span className="text-sm text-gray-700">
                I understand that false or misleading information may result in listing removal.
              </span>
            </label>

            <label className={`flex items-start gap-3 cursor-pointer p-3 rounded-lg border ${
              errors.authorizationConfirmed ? 'border-red-300 bg-red-50' : 'border-gray-200 hover:bg-gray-50'
            }`}>
              <input
                type="checkbox"
                name="authorizationConfirmed"
                checked={formData.authorizationConfirmed}
                onChange={handleInputChange}
                className="w-4 h-4 mt-0.5 rounded border-gray-300 text-[#029bba] focus:ring-[#029bba]"
              />
              <span className="text-sm text-gray-700">
                I am authorized to list this property (owner, agent, or authorized representative).
              </span>
            </label>
          </div>

          {(errors.termsAccepted || errors.privacyAccepted || errors.accuracyConfirmed || errors.authorizationConfirmed) && (
            <p className="text-red-500 text-sm">Please accept all required terms to continue.</p>
          )}
        </div>

        {/* ============================================ */}
        {/* SUBMIT BUTTONS */}
        {/* ============================================ */}
        <div className="flex flex-col sm:flex-row gap-4 pt-4">
          {/* Save Draft – only in CREATE mode */}
          {mode === 'create' && (
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting}
              onClick={() => {
                // You already have auto-save; this is just a placeholder
                alert('Draft is being auto-saved. Manual Save Draft coming soon.');
              }}
              className="flex-1 sm:flex-none"
            >
              <Save className="w-4 h-4 mr-2" />
              Save Draft
            </Button>
          )}

          {/* Preview */}
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              alert('Preview functionality coming soon!');
            }}
            className="flex-1 sm:flex-none"
          >
            <Eye className="w-4 h-4 mr-2" />
            Preview
          </Button>

          {/* Submit / Save */}
          <Button
            type="submit"
            disabled={isSubmitting}
           className="flex-1 bg-[#007C8B] hover:bg-[#006C79] disabled:opacity-70 disabled:cursor-not-allowed"
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
                {mode === 'edit' ? 'Saving...' : 'Submitting...'}
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <Send className="w-4 h-4" />
                {mode === 'edit' ? 'Save Property' : 'Submit Property'}
              </span>
            )}
          </Button>
        </div>      
        <p className="text-center text-xs text-gray-500 mt-4">
          By submitting, you agree to our Terms of Service and confirm that all information is accurate.
        </p>
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
