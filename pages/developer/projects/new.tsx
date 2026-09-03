// FILE: pages/developer/projects/new.tsx

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { Loader2, Plus, X } from 'lucide-react';
import DeveloperLayout from '@/components/developer/DeveloperLayout';
import { useDeveloperContext } from '@/components/developer/DeveloperContext';
import RichTextEditor from '@/components/admin/RichTextEditor';
import DocumentsSection, { ProjectDocuments } from '@/components/admin/DocumentsSection';
import FileUploader from '@/components/admin/FileUploader';
import BuildingFloorPlansSection, { BuildingFloorPlan } from '@/components/admin/BuildingFloorPlansSection';
import UnitPlansSection, { UnitPlan } from '@/components/admin/UnitPlansSection';
import {
  AmenitiesEditor,
  NearbyFacilitiesEditor,
  LocationAdvantagesEditor,
  type AmenityInput,
  type NearbyFacilityInput,
  type LocationAdvantageInput,
} from '@/components/admin/ProjectContentSections';

// â”€â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

// Form state shape â€” year is always string (from input)
interface CompletedProject {
  name: string;
  type: string;
  location: string;
  year: string;
  images: string[]; // Cloudinary URLs â€” uploaded via /api/upload first
}

// API payload shape â€” year converted to number | null before sending
interface CompletedProjectPayload {
  name: string;
  type: string;
  location: string;
  year: number | null;
  images: string[];
}

interface CloudinaryRef {
  url: string;
  publicId: string;
}

interface FileUploaderValue {
  url: string;
  publicId?: string;
  public_id?: string;
}

interface ProjectCreateBody {
  projectCategory: string;
  projectNature: string;
  projectType: string;
  developmentProgress: number;
  featureImageUrl: string;
  featureImagePublicId: string;
  description: string;
  tagline: string;
  shortDescription: string;
  projectName: string;
  city: string;
  area?: string;
  areaName: string;
  projectStatus: string;
  launchDate: string;
  expectedCompletionDate: string;
  possessionStartDate: string;
  coordinatesRaw: string;
  droneVideoUrl: string;
  virtualTourUrl: string;
  googleMapLink: string;
  approvalAuthority: string;
  isApproved: string;
  nocStatus: string;
  nocNumber: string;
  societyRegistrationNumber: string;
  environmentClearance: boolean;
  buildingPlanApproved: boolean;
  saleMode: string;
  completedProjects: CompletedProjectPayload[];
  amenitiesDetailed?: { name: string; category: string; description: string | null }[];
  nearbyFacilities?: { name: string; category: string; distance: string | null }[];
  locationAdvantages?: { title: string; points: string[] }[];
  projectDocuments: ProjectDocuments;
  buildingFloorPlans: BuildingFloorPlan[];
  unitTypeBreakdown: UnitPlan[];
  fullPaymentInfo?: {
    fullPrice: number;
    areaSize: number;
    areaUnit: string;
    pricePerUnit: number;
  };
  installmentInfo?: {
    totalUnitPrice: number;
    bookingPayment: number;
    downPayment: number;
    monthlyInstallmentAmount: number;
    totalMonthlyInstallments: number;
    possessionCharges: number;
  };
  // Society fields
  totalLandArea?: string;
  landAreaUnit?: string;
  totalBlocks?: string;
  totalResidentialPlots?: string;
  totalCommercialPlots?: string;
  plotSizesOffered?: string;
  developmentStatus?: string;
  societyFacilities?: string[];
  // Highrise fields
  totalArea?: string;
  totalUnits?: string;
  unitsSold?: string;
  unitsAvailable?: string;
  totalFloors?: string;
  parkingFloors?: string;
  commercialFloors?: string;
  residentialFloors?: string;
}

interface ProjectCreateResponse {
  success: boolean;
  message?: string;
  projectId?: string;
}

// â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function clampText(v: string, max: number): string {
  const s = String(v ?? '').trim();
  return s.length > max ? s.slice(0, max) : s;
}

function isValidLatLng(raw: string): boolean {
  const match = String(raw ?? '').match(
    /^\s*(-?\d+(\.\d+)?)\s*,\s*(-?\d+(\.\d+)?)\s*$/
  );
  if (!match) return false;
  const lat = Number(match[1]);
  const lng = Number(match[3]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

function getFormString(form: HTMLFormElement, name: string): string {
  return String(form.elements.namedItem(name) instanceof HTMLInputElement
    ? (form.elements.namedItem(name) as HTMLInputElement).value
    : (form.elements.namedItem(name) as HTMLSelectElement)?.value ?? '');
}

function getFormChecked(form: HTMLFormElement, name: string): boolean {
  const el = form.elements.namedItem(name);
  return el instanceof HTMLInputElement ? el.checked : false;
}

function getFormCheckboxValues(form: HTMLFormElement, name: string): string[] {
  const inputs = form.querySelectorAll<HTMLInputElement>(`input[name="${name}"]:checked`);
  return Array.from(inputs).map((i) => i.value);
}

// â”€â”€â”€ Style constants â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const inputClass =
  'w-full rounded-xl border border-gray-200 bg-white px-4 py-3 ' +
  'text-sm text-[#333333] shadow-sm outline-none transition ' +
  'focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/20 ' +
  'placeholder:text-gray-400';

const selectClass = inputClass;

const labelClass = 'block text-sm font-medium text-[#333333] mb-1.5';

const primaryButtonClass =
  'inline-flex items-center justify-center rounded-xl ' +
  'bg-[#029bba] hover:bg-[#027a94] ' +
  'px-6 py-3 text-sm font-semibold text-white shadow-sm ' +
  'disabled:opacity-60 disabled:cursor-not-allowed ' +
  'focus:outline-none focus:ring-4 focus:ring-[#029bba]/20 ' +
  'transition-all duration-200';

const secondaryButtonClass =
  'inline-flex items-center justify-center rounded-xl ' +
  'border-2 border-[#029bba] text-[#029bba] ' +
  'px-5 py-2.5 text-sm font-semibold ' +
  'hover:bg-[#029bba]/5 ' +
  'focus:outline-none focus:ring-4 focus:ring-[#029bba]/20 ' +
  'transition-all duration-200';

// â”€â”€â”€ Section wrapper â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function Section({
  title,
  subtitle,
  icon,
  children,
}: {
  title: string;
  subtitle?: string;
  icon?: string;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="bg-gradient-to-r from-[#f8f9fa] to-white px-5 py-4 border-b border-gray-100">
        <h2 className="text-base font-semibold text-[#004063]">
          {icon && <span className="mr-2">{icon}</span>}
          {title}
        </h2>
        {subtitle && <p className="mt-1 text-sm text-[#666666]">{subtitle}</p>}
      </div>
      <div className="p-5 md:p-6">{children}</div>
    </div>
  );
}

// â”€â”€â”€ Post-submit action banner â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface PostSubmitBannerProps {
  projectId: string;
  onDismiss: () => void;
}

function PostSubmitBanner({ projectId, onDismiss }: PostSubmitBannerProps): React.ReactElement {
  const router = useRouter();

  return (
    <div className="bg-[#f0fdf4] border-l-4 border-[#10b981] rounded-xl p-5">
      <p className="text-sm font-semibold text-[#10b981] mb-1">
        Project submitted successfully!
      </p>
      <p className="text-sm text-[#333333] mb-4">
        Your project is under review. Would you like to add units/plots to this project now?
      </p>
      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => void router.push(`/developer/projects/${projectId}/units`)}
          className="px-4 py-2 bg-[#029bba] text-white text-sm font-semibold rounded-xl hover:bg-[#027a94] transition-colors"
        >
          Add Units Now
        </button>
        <button
          onClick={() => void router.push('/developer/projects')}
          className="px-4 py-2 border border-gray-200 text-[#333333] text-sm font-semibold rounded-xl hover:bg-[#f8f9fa] transition-colors"
        >
          Back to Projects
        </button>
        <button
          onClick={onDismiss}
          className="px-4 py-2 text-[#666666] text-sm font-medium hover:underline"
        >
          Stay on page
        </button>
      </div>
    </div>
  );
}

// â”€â”€â”€ Main form â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function ProjectForm(): React.ReactElement {
  const router = useRouter();
  const { profile, isLoading } = useDeveloperContext();

  const [loading,             setLoading]             = useState(false);
  const [submitError,         setSubmitError]         = useState<string | null>(null);
  const [submittedProjectId,  setSubmittedProjectId]  = useState<string | null>(null);

  // â”€â”€ Approved status guard â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Only approved developers can create projects
  useEffect(() => {
    if (isLoading) return;
    if (!profile) return;
    if (profile.status !== 'approved') {
      void router.replace('/developer/dashboard');
    }
  }, [profile, isLoading, router]);


  // Classification
  const [projectCategory,     setProjectCategory]     = useState('');
  const [projectNature,       setProjectNature]       = useState('');
  const [developmentProgress, setDevelopmentProgress] = useState(0);

  // Feature image (pre-uploaded via FileUploader â†’ /api/upload)
  const [featureImage, setFeatureImage] = useState<CloudinaryRef | null>(null);

  // Rich text
  const [description, setDescription] = useState('');

  // Location
  const [coordinatesRaw, setCoordinatesRaw] = useState('');
  const [staticMapUrl,   setStaticMapUrl]   = useState<string | null>(null);

  // Payment
  const [saleMode,  setSaleMode]  = useState('');
  const [fullPrice, setFullPrice] = useState('');
  const [areaSize,  setAreaSize]  = useState('');
  const [areaUnit,  setAreaUnit]  = useState('sqft');

  // Completed projects (metadata only â€” images uploaded separately)
  const [completedProjects, setCompletedProjects] = useState<CompletedProject[]>([
    { name: '', type: '', location: '', year: '', images: [] },
  ]);

  // Documents / plans
  const [projectDocuments,   setProjectDocuments]   = useState<ProjectDocuments>({});
  const [buildingFloorPlans, setBuildingFloorPlans] = useState<BuildingFloorPlan[]>([]);
  const [unitPlans,          setUnitPlans]           = useState<UnitPlan[]>([]);

  // Display-sync content (Phase 2A mirror)
  const [amenities,          setAmenities]          = useState<AmenityInput[]>([]);
  const [nearbyFacilities,   setNearbyFacilities]   = useState<NearbyFacilityInput[]>([]);
  const [locationAdvantages, setLocationAdvantages] = useState<LocationAdvantageInput[]>([]);

  // Society land area unit (number input + unit — display contract)
  const [landAreaUnit, setLandAreaUnit] = useState('Kanal');

  // â”€â”€ Static map preview â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  useEffect(() => {
    if (!coordinatesRaw || !isValidLatLng(coordinatesRaw)) {
      setStaticMapUrl(null);
      return;
    }
    const match = coordinatesRaw.match(/^\s*(-?\d+(\.\d+)?)\s*,\s*(-?\d+(\.\d+)?)\s*$/);
    if (!match) { setStaticMapUrl(null); return; }

    const lat    = match[1];
    const lng    = match[3];
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) { setStaticMapUrl(null); return; }

    setStaticMapUrl(
      `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}` +
      `&zoom=15&size=600x300&markers=color:red|${lat},${lng}&key=${apiKey}`
    );
  }, [coordinatesRaw]);

  // â”€â”€ Computed â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const pricePerUnit = useMemo(() => {
    const fp = Number(fullPrice);
    const as = Number(areaSize);
    if (!Number.isFinite(fp) || !Number.isFinite(as) || as <= 0) return 0;
    return fp / as;
  }, [fullPrice, areaSize]);

  // â”€â”€ Completed project handlers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const handleAddProject = useCallback((): void => {
    setCompletedProjects((prev) => [
      ...prev,
      { name: '', type: '', location: '', year: '', images: [] },
    ]);
  }, []);

  const handleRemoveProject = useCallback((index: number): void => {
    setCompletedProjects((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleProjectChange = useCallback(
    (index: number, field: keyof Omit<CompletedProject, 'images'>, value: string): void => {
      setCompletedProjects((prev) =>
        prev.map((proj, i) => (i === index ? { ...proj, [field]: value } : proj))
      );
    },
    []
  );

  const handleProjectImageChange = useCallback((index: number, val: FileUploaderValue | null): void => {
    setCompletedProjects((prev) => prev.map((p, i) =>
      i === index ? { ...p, images: val?.url ? [val.url] : [] } : p
    ));
  }, []);

  // â”€â”€ FileUploader change handler â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const handleFeatureImageChange = useCallback((val: FileUploaderValue | null): void => {
    if (!val) { setFeatureImage(null); return; }
    setFeatureImage({
      url:      val.url,
      publicId: val.publicId ?? val.public_id ?? '',
    });
  }, []);

  // â”€â”€ Submit â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
      e.preventDefault();
      if (loading) return;

      setSubmitError(null);

      // â€” Validation â€”
      if (!projectCategory || !projectNature) {
        setSubmitError('Please select Project Category and Nature.');
        return;
      }
      if (!featureImage?.url || !featureImage?.publicId) {
        setSubmitError('Please upload a Main Feature Image (cover photo).');
        return;
      }
      if (!featureImage.publicId.startsWith('highrise-pk/')) {
        setSubmitError('Feature image was not uploaded through the correct channel. Please re-upload.');
        return;
      }

      const form = e.currentTarget;

      const coordRaw = getFormString(form, 'coordinatesRaw').trim();
      if (coordRaw && !isValidLatLng(coordRaw)) {
        setSubmitError('Coordinates format is invalid. Use: "lat, lng" (e.g. 33.6996, 73.0362)');
        return;
      }

      setLoading(true);

      try {
        // â€” Collect numeric fields safely â€”
        const parsedFullPrice = Number(fullPrice) || 0;
        const parsedAreaSize  = Number(areaSize)  || 0;
        const calcPPU         = parsedAreaSize > 0 ? parsedFullPrice / parsedAreaSize : 0;

        const getNum = (name: string): number =>
          Number(getFormString(form, name)) || 0;

        // â€” Completed projects payload â€”
        const completedProjectsPayload: CompletedProjectPayload[] = completedProjects
          .map((proj) => ({
            name:     clampText(proj.name,     80),
            type:     clampText(proj.type,     30),
            location: clampText(proj.location, 80),
            year:     proj.year ? Number(proj.year) : null,
            images:   proj.images,
          }))
          .filter((p) => p.name);

        // — Display-sync content payloads —
        const amenitiesPayload = amenities
          .filter((a) => a.name.trim())
          .map((a) => ({
            name:        a.name.trim().slice(0, 100),
            category:    a.category || 'general',
            description: a.description.trim() || null,
          }));
        const nearbyPayload = nearbyFacilities
          .filter((n) => n.name.trim())
          .map((n) => ({
            name:     n.name.trim().slice(0, 100),
            category: n.category || 'other',
            distance: n.distance.trim() || null,
          }));
        const advantagesPayload = locationAdvantages
          .filter((a) => a.title.trim())
          .map((a) => ({
            title:  a.title.trim().slice(0, 150),
            points: a.points.split('\n').map((p) => p.trim()).filter(Boolean),
          }));

        // — Build JSON body — session-scoped, no userId/developerId —
        const body: ProjectCreateBody = {
          projectCategory,
          projectNature,
          projectType:     projectNature,
          developmentProgress,
          featureImageUrl:     featureImage.url,
          featureImagePublicId: featureImage.publicId,
          description,
          tagline:          clampText(getFormString(form, 'tagline'), 150),
          shortDescription: clampText(getFormString(form, 'shortDescription'), 300),
          projectName:   getFormString(form, 'projectName'),
          city:          getFormString(form, 'city'),
          areaName:      getFormString(form, 'area'),
          projectStatus: getFormString(form, 'projectStatus'),
          launchDate:    getFormString(form, 'launchDate'),
          expectedCompletionDate: getFormString(form, 'expectedCompletionDate'),
          possessionStartDate:    getFormString(form, 'possessionStartDate'),
          coordinatesRaw: coordRaw,
          droneVideoUrl:  getFormString(form, 'droneVideoUrl'),
          virtualTourUrl: getFormString(form, 'virtualTourUrl'),
          googleMapLink:  getFormString(form, 'googleMapLink'),
          approvalAuthority:         getFormString(form, 'approvalAuthority'),
          isApproved:                getFormString(form, 'isApproved'),
          nocStatus:                 getFormString(form, 'nocStatus'),
          nocNumber:                 getFormString(form, 'nocNumber'),
          societyRegistrationNumber: getFormString(form, 'societyRegistrationNumber'),
          environmentClearance: getFormChecked(form, 'environmentClearance'),
          buildingPlanApproved: getFormChecked(form, 'buildingPlanApproved'),
          saleMode,
          completedProjects: completedProjectsPayload,
          amenitiesDetailed:   amenitiesPayload,
          nearbyFacilities:    nearbyPayload,
          locationAdvantages:  advantagesPayload,
          projectDocuments,
          buildingFloorPlans,
          unitTypeBreakdown: unitPlans,
          ...(saleMode === 'full' && {
            fullPaymentInfo: {
              fullPrice:    parsedFullPrice,
              areaSize:     parsedAreaSize,
              areaUnit,
              pricePerUnit: calcPPU,
            },
          }),
          ...(saleMode === 'installment' && {
            installmentInfo: {
              totalUnitPrice:           getNum('installmentTotalUnitPrice'),
              bookingPayment:           getNum('bookingPayment'),
              downPayment:              getNum('downPayment'),
              monthlyInstallmentAmount: getNum('monthlyInstallmentAmount'),
              totalMonthlyInstallments: getNum('totalMonthlyInstallments'),
              possessionCharges:        getNum('possessionCharges'),
            },
          }),
          // Category-specific fields
          ...(projectCategory === 'highrise' && {
            totalArea:        getFormString(form, 'totalArea'),
            totalBlocks:      getFormString(form, 'totalBlocks'),
            totalUnits:       getFormString(form, 'totalUnits'),
            unitsSold:        getFormString(form, 'unitsSold'),
            unitsAvailable:   getFormString(form, 'unitsAvailable'),
            totalFloors:      getFormString(form, 'totalFloors'),
            parkingFloors:    getFormString(form, 'parkingFloors'),
            commercialFloors: getFormString(form, 'commercialFloors'),
            residentialFloors:getFormString(form, 'residentialFloors'),
          }),
          ...(projectCategory === 'society' && {
            totalLandArea:         getFormString(form, 'totalLandArea'),
            landAreaUnit,
            totalBlocks:           getFormString(form, 'totalBlocks'),
            totalResidentialPlots: getFormString(form, 'totalResidentialPlots'),
            totalCommercialPlots:  getFormString(form, 'totalCommercialPlots'),
            plotSizesOffered:      getFormString(form, 'plotSizesOffered'),
            developmentStatus:     getFormString(form, 'developmentStatus'),
            societyFacilities:     getFormCheckboxValues(form, 'societyFacilities'),
          }),
        };

         const res = await fetch('/api/projects', {
        method:      'POST',
        credentials: 'include',
        headers:     { 'Content-Type': 'application/json' },
        body:        JSON.stringify(body),
      });

        const data = (await res.json()) as ProjectCreateResponse;

        if (!res.ok || !data.success) {
          setSubmitError(data.message ?? 'Project submission failed. Please try again.');
          return;
        }

        // â€” Success: show inline post-submit banner â€”
        setSubmittedProjectId(data.projectId ?? null);
        // Scroll to top so user sees the banner
        window.scrollTo({ top: 0, behavior: 'smooth' });

      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Network error. Please try again.';
        setSubmitError(message);
      } finally {
        setLoading(false);
      }
    },
    [
      loading, projectCategory, projectNature, featureImage,
      description, developmentProgress, saleMode,
      fullPrice, areaSize, areaUnit, completedProjects,
      amenities, nearbyFacilities, locationAdvantages, landAreaUnit,
      projectDocuments, buildingFloorPlans, unitPlans,
    ]
  );

  // Show nothing while redirecting
  if (!isLoading && profile && profile.status !== 'approved') {
    return (
      <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#029bba] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  // â”€â”€ Render â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  // If submitted â€” show post-submit banner at top, hide form
  if (submittedProjectId) {
    return (
      <div className="min-h-screen bg-[#f8f9fa]">
        <div className="max-w-5xl mx-auto px-4 py-8 md:py-12">
          <PostSubmitBanner
            projectId={submittedProjectId}
            onDismiss={() => setSubmittedProjectId(null)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      <div className="max-w-5xl mx-auto px-4 py-8 md:py-12">

        {/* Page header */}
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-[#004063]">Create New Project</h1>
          <p className="mt-2 text-sm text-[#666666]">
            Provide complete details to ensure trust and transparency with buyers.
          </p>
        </div>

        {/* Submit error banner */}
        {submitError && (
          <div className="mb-6 bg-[#fef2f2] border-l-4 border-[#ef4444] rounded-xl p-4 flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-[#ef4444]">Submission error</p>
              <p className="text-sm text-[#333333] mt-1">{submitError}</p>
            </div>
            <button
              onClick={() => setSubmitError(null)}
              className="text-[#666666] hover:text-[#333333] text-lg leading-none"
              aria-label="Dismiss error"
            >
              ×
              </button>
          </div>
        )}

        {/* Form â€” JSON body, no encType multipart */}
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-6">

          {/* â”€â”€ Section 1: Classification â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          <Section
            title="Project Classification"
            subtitle="Choose the category and nature of your project"
          icon=""
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className={labelClass} htmlFor="projectCategory">
                  Project Category <span className="text-[#ef4444]">*</span>
                </label>
                <select
                  id="projectCategory"
                  name="projectCategory"
                  required
                  className={selectClass}
                  value={projectCategory}
                  onChange={(e) => setProjectCategory(e.target.value)}
                >
                  <option value="">Select Project Category</option>
                  <option value="highrise">High-Rise Building</option>
                  <option value="society">Housing Society / Master Development</option>
                  <option value="mixed_use">Mixed-Use Development</option>
                  <option value="commercial_plaza">Commercial Plaza</option>
                  <option value="townhouse">Townhouse Complex</option>
                  <option value="gated_community">Gated Community</option>
                </select>
              </div>
              <div>
                <label className={labelClass} htmlFor="projectNature">
                  {projectCategory === 'society' ? 'Society Nature' : 'Project Nature'}{' '}
                  <span className="text-[#ef4444]">*</span>
                </label>
                <select
                  id="projectNature"
                  name="projectNature"
                  required
                  className={selectClass}
                  value={projectNature}
                  onChange={(e) => setProjectNature(e.target.value)}
                >
                  <option value="">Select Nature</option>
                  <option value="residential">Residential</option>
                  <option value="commercial">Commercial</option>
                  <option value="mixed">Mixed-Use</option>
                </select>
              </div>
            </div>
          </Section>

          {/* â”€â”€ Section 2: Basic Info â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          <Section
            title="Basic Project Info"
            subtitle="Essential details about your project"
          icon=""
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

              <div className="md:col-span-2">
                <label className={labelClass} htmlFor="projectName">
                  Project Name <span className="text-[#ef4444]">*</span>
                </label>
                <input
                  id="projectName" type="text" name="projectName" required
                  className={inputClass}
                  placeholder="e.g. Blue World City, Goldcrest Mall"
                  maxLength={120}
                />
              </div>

              <div>
                <label className={labelClass} htmlFor="city">
                  City <span className="text-[#ef4444]">*</span>
                </label>
                <select id="city" name="city" required className={selectClass} defaultValue="">
                  <option value="">Select City</option>
                  {['Islamabad','Rawalpindi','Lahore','Karachi','Peshawar','Faisalabad','Multan'].map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelClass} htmlFor="area">
                  Area / Location <span className="text-[#ef4444]">*</span>
                </label>
                <input
                  id="area" type="text" name="area" required
                  className={inputClass}
                  placeholder="e.g. DHA Phase 5, Bahria Town"
                  maxLength={80}
                />
              </div>

              <div>
                <label className={labelClass} htmlFor="projectStatus">
                  Project Status <span className="text-[#ef4444]">*</span>
                </label>
                <select id="projectStatus" name="projectStatus" required className={selectClass} defaultValue="">
                  <option value="">Select Status</option>
                  {['Planning','Pre-Launch','Under Development','Launched','Completed'].map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelClass} htmlFor="launchDate">Launch / Booking Start Date</label>
                <input id="launchDate" type="date" name="launchDate" className={inputClass} />
              </div>

              {/* Development progress */}
              <div className="md:col-span-2">
                <label className={labelClass} htmlFor="developmentProgress">
                  Development Progress
                </label>
                <div className="flex items-center gap-4">
                  <input
                    id="developmentProgress" type="range" name="developmentProgress"
                    min={0} max={100}
                    value={developmentProgress}
                    onChange={(e) => setDevelopmentProgress(Number(e.target.value))}
                    className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#029bba]"
                  />
                  <div className="flex items-center justify-center w-16 h-10 rounded-lg bg-[#029bba]/10 text-[#029bba] font-semibold text-sm">
                    {developmentProgress}%
                  </div>
                </div>
              </div>

              <div>
                <label className={labelClass} htmlFor="expectedCompletionDate">Expected Completion Date</label>
                <input id="expectedCompletionDate" type="date" name="expectedCompletionDate" className={inputClass} />
              </div>

              <div>
                <label className={labelClass} htmlFor="possessionStartDate">Possession Start Date</label>
                <input id="possessionStartDate" type="date" name="possessionStartDate" className={inputClass} />
              </div>

              <div className="md:col-span-2">
                <label className={labelClass} htmlFor="tagline">Project Tagline</label>
                <input
                  id="tagline" type="text" name="tagline"
                  className={inputClass}
                  placeholder="e.g. Luxury Living Redefined in the Heart of Islamabad"
                  maxLength={150}
                />
              </div>

              <div className="md:col-span-2">
                <label className={labelClass} htmlFor="shortDescription">
                  Short Description
                  <span className="ml-1 text-xs text-[#666666] font-normal">(shown on listing cards)</span>
                </label>
                <textarea
                  id="shortDescription" name="shortDescription"
                  rows={2} className={inputClass}
                  placeholder="A brief summary (2-3 lines) shown on the project search card..."
                  maxLength={300}
                />
              </div>

              <div className="md:col-span-2">
                <RichTextEditor
                  label="Detailed Project Description"
                  value={description}
                  onChange={setDescription}
                  placeholder="Describe your project with formatting..."
                />
              </div>
            </div>
          </Section>

          {/* Section 3: Legal Documents */}
          <Section
            title="Legal Documents & Approvals"
            subtitle="Project-level approvals from development authorities (CDA, LDA, etc.)"
            icon=""          >
            {/* Info banner upload via /api/upload */}
            <div className="mb-5 bg-[#eff6ff] border-l-4 border-[#029bba] rounded-xl p-4">
              <p className="text-sm text-[#333333]">
                <span className="font-semibold">Upload documents separately</span> using the
                Documents section below. Legal files must be uploaded via the secure upload
                portal and linked here - never attached directly to this form.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
              <div>
                <label className={labelClass} htmlFor="approvalAuthority">Approval Authority</label>
                <input
                  id="approvalAuthority" type="text" name="approvalAuthority"
                  className={inputClass} placeholder="e.g. LDA, CDA, RDA" maxLength={50}
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="isApproved">Approval Status</label>
                <select id="isApproved" name="isApproved" className={selectClass} defaultValue="">
                  <option value="">Select</option>
                  <option value="approved">Approved</option>
                  <option value="pending">Pending</option>
                  <option value="rejected">Rejected</option>
                  <option value="not_applied">Not Applied</option>
                </select>
              </div>
              <div>
                <label className={labelClass} htmlFor="nocStatus">NOC Status</label>
                <select id="nocStatus" name="nocStatus" className={selectClass} defaultValue="">
                  <option value="">Select</option>
                  <option value="approved">Approved</option>
                  <option value="pending">Pending</option>
                  <option value="rejected">Rejected</option>
                  <option value="not_applied">Not Applied</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
              <div>
                <label className={labelClass} htmlFor="nocNumber">NOC Number</label>
                <input
                  id="nocNumber" type="text" name="nocNumber"
                  className={inputClass} placeholder="e.g. LDA/NOC/2024/1234" maxLength={60}
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="societyRegistrationNumber">
                  Society Registration No.
                </label>
                <input
                  id="societyRegistrationNumber" type="text" name="societyRegistrationNumber"
                  className={inputClass} placeholder="Registration number" maxLength={60}
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-6">
              {[
                { name: 'environmentClearance', label: 'Environment Clearance' },
                { name: 'buildingPlanApproved', label: 'Building Plan Approved' },
              ].map((cb) => (
                <label key={cb.name} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox" name={cb.name}
                    className="w-4 h-4 rounded border-gray-300 text-[#029bba] focus:ring-[#029bba]"
                  />
                  <span className="text-sm text-[#333333]">{cb.label}</span>
                </label>
              ))}
            </div>
          </Section>

          {/* Documents section (handles file upload via /api/upload internally) */}
          <DocumentsSection
            documents={projectDocuments}
            onChange={setProjectDocuments}
            projectSlug={projectCategory || 'project'}
          />

          {/* Section 4: Scale & Units */}
          <Section
            title="Project Scale & Units"
            subtitle="Define the size and unit breakdown of your project"
            icon=""
          >
            {!projectCategory && (
              <div className="text-center py-8 text-[#666666] text-sm">
                Please select a Project Category above to see relevant fields.
              </div>
            )}

            {projectCategory === 'highrise' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {[
                  { name: 'totalArea',          label: 'Total Area',          type: 'text',   ph: 'e.g. 2 Kanal'  },
                  { name: 'totalBlocks',         label: 'Total Blocks/Towers', type: 'number', ph: 'e.g. 2'        },
                  { name: 'totalUnits',          label: 'Total Units',         type: 'number', ph: 'e.g. 150'      },
                  { name: 'unitsSold',           label: 'Units Sold',          type: 'number', ph: 'e.g. 45'       },
                  { name: 'unitsAvailable',      label: 'Units Available',     type: 'number', ph: 'e.g. 105'      },
                  { name: 'totalFloors',         label: 'Total Floors',        type: 'number', ph: 'e.g. 15'       },
                  { name: 'parkingFloors',       label: 'Parking Floors',      type: 'number', ph: 'e.g. 2'        },
                  { name: 'commercialFloors',    label: 'Commercial Floors',   type: 'number', ph: 'e.g. 3'        },
                  { name: 'residentialFloors',   label: 'Residential Floors',  type: 'number', ph: 'e.g. 10'       },
                ].map((f) => (
                  <div key={f.name}>
                    <label className={labelClass}>{f.label}</label>
                    <input
                      type={f.type} name={f.name}
                      className={inputClass} placeholder={f.ph}
                      {...(f.type === 'number' ? { min: 0 } : { maxLength: 40 })}
                    />
                  </div>
                ))}
              </div>
            )}

            {projectCategory === 'society' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {[
                    { name: 'totalLandArea',         label: 'Total Land Area',      type: 'number', ph: 'e.g. 500'                          },
                    { name: 'totalBlocks',            label: 'Total Blocks/Sectors', type: 'number', ph: 'e.g. 10'                          },
                    { name: 'totalResidentialPlots',  label: 'Residential Plots',    type: 'number', ph: 'e.g. 2000'                        },
                    { name: 'totalCommercialPlots',   label: 'Commercial Plots',     type: 'number', ph: 'e.g. 200'                         },
                    { name: 'plotSizesOffered',       label: 'Plot Sizes Offered',   type: 'text',   ph: 'e.g. 3, 5, 10 Marla, 1 Kanal'    },
                  ].map((f) => (
                    <div key={f.name}>
                      <label className={labelClass}>{f.label}</label>
                      <input
                        type={f.type} name={f.name}
                        className={inputClass} placeholder={f.ph}
                        {...(f.type === 'number' ? { min: 0 } : { maxLength: 80 })}
                      />
                    </div>
                  ))}
                  <div>
                    <label className={labelClass}>Land Area Unit</label>
                    <select className={selectClass} value={landAreaUnit}
                      onChange={(e) => setLandAreaUnit(e.target.value)}>
                      <option value="Kanal">Kanal</option>
                      <option value="Marla">Marla</option>
                      <option value="Acre">Acre</option>
                      <option value="Sq Ft">Sq Ft</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Development Status</label>
                    <select name="developmentStatus" className={selectClass} defaultValue="">
                      <option value="">Select Status</option>
                      <option value="launched">Launched</option>
                      <option value="developing">Developing</option>
                      <option value="developed">Developed</option>
                    </select>
                  </div>
                </div>

                {/* Society Facilities */}
                <div className="rounded-xl bg-[#f8f9fa] p-5">
                <h4 className="font-semibold text-[#004063] mb-3">Society Facilities</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { value: 'parks',           label: 'Parks / Playgrounds' },
                      { value: 'mosques',          label: 'Mosques'             },
                      { value: 'graveyard',        label: 'Graveyard'           },
                      { value: 'schools',          label: 'Schools'             },
                      { value: 'commercialAreas',  label: 'Commercial Areas'    },
                      { value: 'hospitals',        label: 'Hospitals'           },
                      { value: 'communityCenter',  label: 'Community Center'    },
                    ].map((f) => (
                      <label key={f.value} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox" name="societyFacilities" value={f.value}
                          className="w-4 h-4 rounded border-gray-300 text-[#029bba] focus:ring-[#029bba]"
                        />
                        <span className="text-sm text-[#333333]">{f.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </Section>

          {/* Floor plans (highrise only) */}
          {projectCategory === 'highrise' && (
            <BuildingFloorPlansSection
              floorPlans={buildingFloorPlans}
              onChange={setBuildingFloorPlans}
              projectSlug={projectCategory}
            />
          )}

          {/* Unit types */}
          <UnitPlansSection
            unitPlans={unitPlans}
            onChange={setUnitPlans}
            projectSlug={projectCategory || 'project'}
          />

          {/* Amenities — display: Features section */}
          <AmenitiesEditor value={amenities} onChange={setAmenities} disabled={loading} />

          {/* Nearby places — display: Location section */}
          <NearbyFacilitiesEditor value={nearbyFacilities} onChange={setNearbyFacilities} disabled={loading} />

          {/* Location advantages — display: Location section */}
          <LocationAdvantagesEditor value={locationAdvantages} onChange={setLocationAdvantages} disabled={loading} />

          {/* â”€â”€ Section 5: Payment â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          <Section
            title="Payment Structure"
            subtitle="Define how buyers can pay for units"
            icon=""
          >
            <div className="mb-6">
              <label className={labelClass} htmlFor="saleMode">
                Sale Mode <span className="text-[#ef4444]">*</span>
              </label>
              <select
                id="saleMode" name="saleMode" required
                className={selectClass}
                value={saleMode}
                onChange={(e) => setSaleMode(e.target.value)}
              >
                <option value="">Select Payment Type</option>
                <option value="Installment">Installment Only</option>
                <option value="Full Payment">Full Payment Only</option>
                <option value="Both">Both (Installment + Full Payment)</option>
              </select>
            </div>

            {(saleMode === 'Installment' || saleMode === 'Both') && (
              <div className="rounded-xl bg-[#eff6ff] border border-[#029bba]/20 p-5">
                <h4 className="font-semibold text-[#004063] mb-4">Installment Plan Details</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {[
                    { name: 'installmentTotalUnitPrice',  label: 'Total Unit Price (PKR)', required: true,  ph: 'e.g. 5000000' },
                    { name: 'bookingPayment',              label: 'Booking Payment',        required: false, ph: 'e.g. 500000'  },
                    { name: 'downPayment',                 label: 'Down Payment',           required: false, ph: 'e.g. 1000000' },
                    { name: 'monthlyInstallmentAmount',    label: 'Monthly Installment',    required: false, ph: 'e.g. 50000'   },
                    { name: 'totalMonthlyInstallments',    label: 'Total Installments',     required: false, ph: 'e.g. 36'      },
                    { name: 'possessionCharges',           label: 'Possession Charges',     required: false, ph: 'e.g. 200000'  },
                  ].map((f) => (
                    <div key={f.name}>
                      <label className={labelClass}>
                        {f.label} {f.required && <span className="text-[#ef4444]">*</span>}
                      </label>
                      <input
                        type="number" name={f.name}
                        required={f.required}
                        className={inputClass} placeholder={f.ph} min={0}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(saleMode === 'Full Payment' || saleMode === 'Both') && (
              <div className="rounded-xl bg-[#f0fdf4] border border-[#10b981]/20 p-5">
                <h4 className="font-semibold text-[#004063] mb-4">Full Payment Pricing</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div>
                    <label className={labelClass}>Total Price (PKR) <span className="text-[#ef4444]">*</span></label>
                    <input
                      type="number" required className={inputClass}
                      value={fullPrice}
                      onChange={(e) => setFullPrice(e.target.value)}
                      placeholder="e.g. 7500000" min={0}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Area Size</label>
                    <div className="flex gap-2">
                      <input
                        type="number" className={`${inputClass} flex-1`}
                        value={areaSize}
                        onChange={(e) => setAreaSize(e.target.value)}
                        placeholder="e.g. 950" min={0}
                      />
                      <select
                        className="w-28 rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm text-[#333333] outline-none focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/20"
                        value={areaUnit}
                        onChange={(e) => setAreaUnit(e.target.value)}
                      >
                        <option value="sqft">Sq. Ft.</option>
                        <option value="marla">Marla</option>
                        <option value="sqyard">Sq. Yard</option>
                        <option value="kanal">Kanal</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>Price Per Unit (Auto)</label>
                    <input
                      readOnly
                      className={`${inputClass} bg-[#f8f9fa] cursor-not-allowed`}
                      value={
                        pricePerUnit
                          ? `Rs. ${Math.round(pricePerUnit).toLocaleString('en-PK')} / ${areaUnit}`
                          : 'Auto-calculated'
                      }
                    />
                  </div>
                </div>
              </div>
            )}
          </Section>

          {/* â”€â”€ Section 6: Completed Projects â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          <Section
            title="Completed Projects by Developer"
            subtitle="Showcase your past successful developments"
            icon=""
          >
            {completedProjects.map((project, index) => (
              <div
                key={index}
                className="p-5 bg-[#f8f9fa] rounded-xl border border-gray-200 mb-4 relative"
              >
                {index > 0 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveProject(index)}
                    className="absolute top-3 right-3 p-1.5 text-[#ef4444] hover:bg-[#fef2f2] rounded-lg transition-colors"
                    aria-label="Remove completed project"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}

                <h4 className="font-semibold text-[#004063] mb-4">Project {index + 1}</h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Project Name <span className="text-[#ef4444]">*</span></label>
                    <input
                      type="text" required className={inputClass}
                      value={project.name}
                      onChange={(e) => handleProjectChange(index, 'name', e.target.value)}
                      placeholder="e.g. Skyline Towers" maxLength={80}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Project Type <span className="text-[#ef4444]">*</span></label>
                    <select
                      required className={selectClass}
                      value={project.type}
                      onChange={(e) => handleProjectChange(index, 'type', e.target.value)}
                    >
                      <option value="">Select Type</option>
                      <option value="Residential">Residential</option>
                      <option value="Commercial">Commercial</option>
                      <option value="Mixed Use">Mixed Use</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Location</label>
                    <input
                      type="text" className={inputClass}
                      value={project.location}
                      onChange={(e) => handleProjectChange(index, 'location', e.target.value)}
                      placeholder="e.g. DHA Lahore" maxLength={80}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Completion Year</label>
                    <input
                      type="text" className={inputClass}
                      value={project.year}
                      onChange={(e) => handleProjectChange(index, 'year', e.target.value)}
                      placeholder="e.g. 2022" maxLength={4}
                    />
                  </div>
                </div>

               {/* Project image — inline upload (display: portfolio cards) */}
                <div className="mt-4">
                  <label className={labelClass}>Project Image</label>
                  <div className="max-w-xs">
                    <FileUploader
                      label="Upload Image"
                      value={project.images[0] ? { url: project.images[0], publicId: '' } : null}
                      onChange={(val) => handleProjectImageChange(index, val)}
                      folder="projects"
                      accept="image"
                    />
                  </div>
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={handleAddProject}
              className={secondaryButtonClass}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Another Project
            </button>
          </Section>

          {/* Section 7: Visuals & Location */}
          <Section
            title="Visuals & Location"
            subtitle="Add videos, images, and map location"
            icon=""
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

              {/* Feature image via FileUploader /api/upload URL stored */}
              <div className="md:col-span-2">
                <label className={labelClass}>
                  Main Feature Image (Cover Photo){' '}
                  <span className="text-[#ef4444]">*</span>
                </label>
                <div className="max-w-xl">
                  <FileUploader
                    label="Upload Feature Image"
                    value={featureImage}
                    onChange={handleFeatureImageChange}
                    folder="projects"
                    accept="image"
                  />
                </div>
                <p className="text-xs text-[#666666] mt-2">
                  High-quality landscape image recommended (1920x1080). This becomes your                  hero image on listing pages.
                </p>
              </div>

              <div>
                <label className={labelClass} htmlFor="droneVideoUrl">Drone Video URL</label>
                <input
                  id="droneVideoUrl" type="url" name="droneVideoUrl"
                  className={inputClass} placeholder="YouTube / Vimeo link"
                />
              </div>

              <div>
                <label className={labelClass} htmlFor="virtualTourUrl">Virtual Tour URL</label>
                <input
                  id="virtualTourUrl" type="url" name="virtualTourUrl"
                  className={inputClass} placeholder="Matterport / YouTube link"
                />
              </div>

              <div>
                <label className={labelClass} htmlFor="googleMapLink">Google Maps Link</label>
                <input
                  id="googleMapLink" type="url" name="googleMapLink"
                  className={inputClass} placeholder="Paste share link from Google Maps"
                />
              </div>

              <div className="md:col-span-2">
                <label className={labelClass} htmlFor="coordinatesRaw">
                  Coordinates (Optional)
                </label>
                <input
                  id="coordinatesRaw" type="text" name="coordinatesRaw"
                  className={inputClass}
                  placeholder="e.g. 33.6996, 73.0362"
                  value={coordinatesRaw}
                  onChange={(e) => setCoordinatesRaw(e.target.value)}
                />
                <p className="text-xs text-[#666666] mt-1.5">
                  Right-click on Google Maps: "What's here?" to get coordinates.
                </p>
                {staticMapUrl && (
                  <div className="mt-4">
                    <p className="text-sm text-[#333333] mb-2">Location Preview:</p>                    <img
                      src={staticMapUrl}
                      alt="Location preview"
                      className="rounded-xl border border-gray-200 w-full max-w-lg"
                    />
                  </div>
                )}
              </div>
            </div>
          </Section>

          {/* Developer profile link */}
          <div className="rounded-2xl border border-gray-200 bg-gradient-to-br from-[#eff6ff] to-white p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h3 className="text-base font-semibold text-[#004063]">Developer Profile</h3>                <p className="text-sm text-[#666666] mt-1">
                  Company details and documents are linked from your developer profile.
                </p>
              </div>
              <button
                type="button"
                onClick={() => void router.push('/developer/profile')}
                className={secondaryButtonClass}
              >
                Edit Developer Profile
              </button>
            </div>
          </div>

          {/* Submit bar */}
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-6">
            <div className="flex flex-col md:flex-row gap-4 md:items-center md:justify-between">
              <p className="text-sm text-[#666666]">
                Your project will be reviewed by our team before going live.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={() => void router.push('/developer/projects')}
                  className="px-6 py-3 rounded-xl border border-gray-200 text-[#333333] font-semibold hover:bg-[#f8f9fa] transition-colors"
                >
                  Cancel
                </button>
                <button type="submit" disabled={loading} className={primaryButtonClass}>
                  {loading ? (
                    <>
                      <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" />
                      Submitting...
                    </>
                  ) : (
                    'Submit Project for Review'
                  )}
                </button>
              </div>
            </div>
          </div>

        </form>

        {/* Tip */}
        <p className="mt-8 text-xs text-[#666666]">
          <span className="font-semibold text-[#029bba]">Tip:</span>{' '}
          If your submission fails, ensure your CNIC verification is completed and your
          Developer Profile is active.
        </p>

      </div>
    </div>
  );
}

// Page export

export default function NewProjectPage(): React.ReactElement {
  return (
    <DeveloperLayout>
      <Head>
        <title>Create New Project - Developer Portal | Highrise.pk</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>
      <ProjectForm />
    </DeveloperLayout>
  );
}
