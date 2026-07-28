// pages/projects/[slug]/index.tsx

import React, { useEffect, useState, useRef } from 'react';
import { GetStaticPaths, GetStaticProps } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import dbConnect from '@/lib/dbConnect';
import Project from '@/models/Projects';
import Unit from '@/models/Unit';
import UniversalInquiryModal from '@/components/UniversalInquiryModal';
import {
  Building2, MapPin, CheckCircle, Shield, BarChart3,
  Phone, MessageCircle, Download, ChevronRight, Home,
  Layers, CreditCard, ExternalLink, Clock, Award,
  Play, X, ChevronLeft, ChevronDown, ChevronUp,
  Camera, Video, Map, Calendar, Users, Star,
  Briefcase, Car, Heart, Coffee, Wifi, Lock,
  Zap, Droplets, Wind, TreePine, Dumbbell, School,
  Hospital, ShoppingBag, UtensilsCrossed, Building,
  FileText, Eye, Share2, Bookmark, Printer,
  TrendingUp, BadgeCheck, Sparkles, ArrowRight,
  PhoneCall, MousePointerClick, Timer,
  CircleDollarSign, Banknote, CalendarCheck, MapPinned,
  Flame, Target, Gift, CheckCircle2,
} from 'lucide-react';

// ============================================
// TYPES
// ============================================

interface ProjectImage {
  url: string;
  caption?: string;
  type?: 'exterior' | 'interior' | 'amenity' | 'construction';
  isPrimary?: boolean;
}

interface ProjectVideo {
  url: string;
  title?: string;
  platform?: 'youtube' | 'vimeo' | 'other';
  thumbnail?: string;
}

interface UnitTypeOffering {
  type?: string;
  name?: string;
  category?: string;
  totalUnits?: number;
  availableUnits?: number;
  soldUnits?: number;
  priceRange?: { min: number; max: number };
  minPrice?: number;
  maxPrice?: number;
  areaRange?: { min: number; max: number; unit: string };
  minArea?: number;
  maxArea?: number;
  areaUnit?: string;
  bedrooms?: number;
  bathrooms?: number;
  description?: string;
  features?: string[];
  interiorImages?: { url: string; caption?: string }[];
  image?: string;
  imageUrl?: string;
  floorPlanPdfUrl?: string;
}

interface FloorPlan {
  floorName: string;
  floorNumber: number;
  floorType: string;
  pdfUrl: string;
  imageUrl?: string;
  description?: string;
}

interface DevelopmentUpdate {
  date: string;
  title: string;
  description?: string;
  images?: string[];
  progress?: number;
  videoUrl?: string;
}

interface NearbyPlace {
  name: string;
  // Model uses 'category' not 'type', and has more options
  category: 'hospital' | 'school' | 'restaurant' | 'park' | 'mall' | 'mosque' | 'bank' | 'transport' | 'other';
  distance?: string;
  icon?: string;
}

interface FeatureCategory {
  name: string;
  description?: string;
  icon?: string;
  category: string;
}

interface CompletedProject {
  name: string;
  type: string;
  location: string;
  year: number;
  image?: string;
}

interface InstallmentPlan {
  totalPrice?: number;
  bookingAmount?: number;
  bookingPercentage?: number;
  downPayment?: number;
  downPaymentPercentage?: number;
  monthlyAmount?: number;
  monthlyDuration?: number;
  quarterlyAmount?: number;
  quarterlyDuration?: number;
  halfYearlyAmount?: number;
  halfYearlyDuration?: number;
  possessionAmount?: number;
  possessionPercentage?: number;
}

interface DeveloperProfile {
  companyName?: string;
  ceoName?: string;
  contactNumber?: string;
  whatsappNumber?: string;
  officialEmail?: string;
  website?: string;
  logoUrl?: string;
  description?: string;
  establishedYear?: number;
  totalProjects?: number;
  highriseScore?: number;
  riskLevel?: 'low' | 'medium' | 'high';
  verificationLevel?: string;
  isVerified?: boolean;
}

interface UnitRow {
  _id: string;
  unitNumber: string;
  floorNumber: number;
  floorName?: string;
  unitType: string;
  price: number;
  areaSqft?: number;
  areaMarla?: number;
  areaUnit?: string;
  status: 'available' | 'reserved' | 'sold' | 'on_hold' | 'cancelled';
  bedrooms?: number;
  bathrooms?: number;
  facing?: string;
  listingType?: string;
}

interface ProjectData {
  _id: string;
  slug: string;
  projectName: string;
  tagline?: string;
  shortDescription?: string;
  description?: string;
  city: string;
  areaName: string;
  area?: string;                    // Database field alias
  specificLocation?: string;
  projectCategory: 'highrise' | 'society' | 'mixed_use' | 'commercial_plaza' | 'townhouse' | 'gated_community';
  projectNature: 'residential' | 'commercial' | 'mixed';
  status: 'draft' | 'pending' | 'verified' | 'rejected';
  isVerified: boolean;
  isFeatured?: boolean;
  highriseScore?: number;
  riskLevel?: 'low' | 'medium' | 'high';
  deliveryStatus?: 'on_track' | 'slightly_delayed' | 'critical_delay' | 'completed';
  verificationLevel?: string;
  launchDate?: string;
  expectedCompletionDate?: string;
  possessionStartDate?: string;
  developmentProgress?: number;
  saleMode?: string;
  totalUnits?: number;
  unitsSold?: number;
  unitsAvailable?: number;
  minPrice?: number;
  maxPrice?: number;
  featureImageUrl?: string;
  images?: ProjectImage[];
  videos?: ProjectVideo[];
  droneVideoUrl?: string;
  virtualTourUrl?: string;
  floorDetails?: {
    totalFloors?: number;
    floorsForParking?: number;
    floorsForCommercial?: number;
    floorsForResidential?: number;
  };
  projectHighlights?: { icon: string; title: string; description: string }[];
  locationAdvantages?: { title: string; points: string[] }[];
  amenitiesDetailed?: FeatureCategory[];
  unitTypeBreakdown?: UnitTypeOffering[];
  buildingFloorPlans?: FloorPlan[];
  installmentPlan?: InstallmentPlan;
  googleMapLink?: string;
  coordinates?: { lat?: number; lng?: number };
  nearbyFacilities?: NearbyPlace[];
  legalDocs?: {
    nocUrl?: string;
    secpCertUrl?: string;
    layoutMapUrl?: string;
    environmentCertUrl?: string;
    authorityLicenseUrl?: string;
  };
  projectDocuments?: {
    brochureUrl?: string;
    priceListUrl?: string;
    masterPlanUrl?: string;
    paymentPlanUrl?: string;
  };
  nocStatus?: string;
  approvalAuthority?: string;
  developer: string;
  developerProfile?: DeveloperProfile;
  developmentUpdates?: DevelopmentUpdate[];
  completedProjects?: CompletedProject[];
  badge?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface PageProps {
  project: ProjectData;
  initialUnits: UnitRow[];
}

// ============================================
// CONSTANTS
// ============================================

const SECTION_CONFIG = [
  { id: 'overview',     label: 'Overview' },
  { id: 'offerings',    label: "What's On Offer" },
  { id: 'description',  label: 'About' },
  { id: 'location',     label: 'Location' },
  { id: 'units',        label: 'Units' },
  { id: 'developer',    label: 'Developer' },
] as const;

const STATUS_COLORS: Record<string, string> = {
  available: 'bg-green-100 text-green-700 border-green-200',
  reserved:  'bg-yellow-100 text-yellow-700 border-yellow-200',
  sold:      'bg-red-100 text-red-700 border-red-200',
  on_hold:   'bg-gray-100 text-gray-700 border-gray-200',
  cancelled: 'bg-gray-100 text-gray-400 border-gray-200',
};

const NEARBY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  hospital:   Hospital,
  school:     School,
  restaurant: UtensilsCrossed,
  park:       TreePine,
  mall:       ShoppingBag,
  mosque:     Star,
  bank:       Briefcase,
  transport:  Car,
  other:      MapPin,
};

// ============================================
// HELPER FUNCTIONS
// ============================================

function formatPrice(price: number): string {
  if (!price || price === 0) return 'Contact for Price';
  if (price >= 10_000_000) {
    const crore = price / 10_000_000;
    return `${crore % 1 === 0 ? crore.toFixed(0) : crore.toFixed(2)} Crore`;
  }
  if (price >= 100_000) {
    const lac = price / 100_000;
    return `${lac % 1 === 0 ? lac.toFixed(0) : lac.toFixed(2)} Lac`;
  }
  return `Rs. ${price.toLocaleString()}`;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-PK', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
}

function sanitizeHtml(input: string): string {
  if (!input) return '';
  return input
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, '')
    .replace(/<iframe[\s\S]*?>[\s\S]*?<\/iframe>/gi, '')
    .replace(/<object[\s\S]*?>[\s\S]*?<\/object>/gi, '')
    .replace(/<embed[\s\S]*?>/gi, '')
    .replace(/\son\w+\s*=\s*(".*?"|'.*?'|[^\s>]+)/gi, '')
    .replace(/\s(href|src)\s*=\s*(['"])\s*javascript:[\s\S]*?\2/gi, ' $1="#"');
}

function stripTags(input: string): string {
  if (!input) return '';
  return input.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function getYouTubeEmbed(url: string): string {
  if (!url) return '';
  const m = url.match(/^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/);
  return m && m[2].length === 11
    ? `https://www.youtube.com/embed/${m[2]}`
    : url;
}

async function downloadFile(url: string, filename: string): Promise<void> {
  if (typeof window === 'undefined' || !url) return;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('download_failed');
    const blob = await res.blob();
    const objUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = objUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(objUrl);
  } catch {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}

function convertArea(value: number, fromUnit: string) {
  const toSqFt: Record<string, number> = {
    sqft: 1, 'sq.ft': 1, 'sq ft': 1,
    sqm: 10.764, 'sq.m': 10.764,
    marla: 272.25, kanal: 5445,
  };
  const factor = toSqFt[(fromUnit || '').trim().toLowerCase()] ?? 1;
  const sqft = value * factor;
  return {
    sqft: Math.round(sqft),
    sqm:  Math.round(sqft / 10.764),
    marla: (sqft / 272.25).toFixed(2),
  };
}

function formatAreaWithUnits(min: number, max: number, unit: string) {
  if (!min || !max || min <= 0 || max <= 0) return null;
  const minC = convertArea(min, unit);
  const maxC = convertArea(max, unit);
  return {
    sqft:  `${minC.sqft.toLocaleString()} – ${maxC.sqft.toLocaleString()}`,
    sqm:   `${minC.sqm.toLocaleString()} – ${maxC.sqm.toLocaleString()}`,
    marla: `${minC.marla} – ${maxC.marla}`,
  };
}

function getMapEmbedUrl(project: ProjectData): string {
  if (project.coordinates?.lat && project.coordinates?.lng) {
    return `https://maps.google.com/maps?q=${project.coordinates.lat},${project.coordinates.lng}&z=15&output=embed`;
  }
  if (project.googleMapLink) {
    const m = project.googleMapLink.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
    if (m) return `https://maps.google.com/maps?q=${m[1]},${m[2]}&z=15&output=embed`;
  }
  const q = encodeURIComponent(
    `${project.specificLocation ? project.specificLocation + ', ' : ''}${project.areaName || project.area || ''}, ${project.city}, Pakistan`
  );
  return `https://maps.google.com/maps?q=${q}&z=14&output=embed`;
}

function getMapsLink(project: ProjectData): string {
  if (project.coordinates?.lat && project.coordinates?.lng) {
    return `https://www.google.com/maps?q=${project.coordinates.lat},${project.coordinates.lng}`;
  }
  if (project.googleMapLink) return project.googleMapLink;
  return `https://www.google.com/maps/search/${encodeURIComponent((project.areaName || project.area || '') + ', ' + project.city + ', Pakistan')}`;
}

// ============================================
// SUB-COMPONENTS
// ============================================

interface SectionProps {
  id?: string;
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  headerExtra?: React.ReactNode;
}

function Section({ id, title, icon, children, className = '', headerExtra }: SectionProps): React.ReactElement {
  return (
    <section
      id={id}
      className={`bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden ${className}`}
    >
      <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          {icon}
          {title}
        </h2>
        {headerExtra}
      </div>
      <div className="p-6">{children}</div>
    </section>
  );
}

// Image Gallery Modal — no framer-motion
function ImageGalleryModal({
  isOpen, onClose, images, initialIndex = 0, projectName,
}: {
  isOpen: boolean;
  onClose: () => void;
  images: ProjectImage[];
  initialIndex?: number;
  projectName: string;
}): React.ReactElement | null {
  const [current, setCurrent] = useState(initialIndex);

  useEffect(() => { setCurrent(initialIndex); }, [initialIndex]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') setCurrent(p => (p > 0 ? p - 1 : images.length - 1));
      if (e.key === 'ArrowRight') setCurrent(p => (p < images.length - 1 ? p + 1 : 0));
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, images.length, onClose]);

  if (!isOpen || images.length === 0) return null;

  return (
    <div className="fixed inset-0 bg-black z-[100] flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 bg-black/50">
        <div className="text-white">
          <p className="font-semibold">{projectName}</p>
          <p className="text-sm text-gray-400">{current + 1} of {images.length}</p>
        </div>
        <button onClick={onClose} aria-label="Close gallery"
          className="p-2 hover:bg-white/10 rounded-full transition-colors">
          <X className="w-6 h-6 text-white" />
        </button>
      </div>
      <div className="flex-1 flex items-center justify-center relative px-16">
        <button onClick={() => setCurrent(p => p > 0 ? p - 1 : images.length - 1)}
          className="absolute left-4 p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors">
          <ChevronLeft className="w-6 h-6 text-white" />
        </button>
        <div className="relative w-full h-full max-w-5xl max-h-[70vh]">
          <Image src={images[current].url}
            alt={images[current].caption || `Image ${current + 1}`}
            fill className="object-contain" />
        </div>
        <button onClick={() => setCurrent(p => p < images.length - 1 ? p + 1 : 0)}
          className="absolute right-4 p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors">
          <ChevronRight className="w-6 h-6 text-white" />
        </button>
      </div>
      <div className="py-4 px-4 bg-black/50">
        <div className="flex gap-2 justify-center overflow-x-auto pb-2">
          {images.map((img, idx) => (
            <button key={idx} onClick={() => setCurrent(idx)}
              className={`relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 border-2 transition-all ${
                idx === current ? 'border-white scale-110' : 'border-transparent opacity-60 hover:opacity-100'
              }`}>
              <Image src={img.url} alt="" fill className="object-cover" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// Video Modal — no framer-motion
function VideoModal({
  isOpen, onClose, videoUrl, title,
}: {
  isOpen: boolean;
  onClose: () => void;
  videoUrl: string;
  title?: string;
}): React.ReactElement | null {
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-4">
      <div className="relative w-full max-w-4xl">
        <button onClick={onClose} aria-label="Close video"
          className="absolute -top-12 right-0 p-2 text-white hover:text-gray-300">
          <X className="w-8 h-8" />
        </button>
        <div className="aspect-video bg-black rounded-xl overflow-hidden">
          <iframe src={getYouTubeEmbed(videoUrl)} className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen title={title || 'Video'} />
        </div>
        {title && <p className="text-white text-center mt-4">{title}</p>}
      </div>
    </div>
  );
}

// Lead Form Modal (for unit booking)
function LeadFormModal({
  isOpen, onClose, unitNumber, projectId, projectName,
}: {
  isOpen: boolean;
  onClose: () => void;
  unitNumber: string | null;
  projectId: string;
  projectName: string;
}): React.ReactElement | null {
  const [formData, setFormData] = useState({ name: '', phone: '', email: '', message: '' });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setFormData({ name: '', phone: '', email: '', message: '' });
      setSuccess(false);
      setError('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) { setError('Please enter your name.'); return; }
    if (!formData.phone.trim()) { setError('Please enter your phone number.'); return; }
    if (!formData.email.trim()) { setError('Please enter your email.'); return; }
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name.trim(),
          phone: formData.phone.trim(),
          email: formData.email.trim(),
          message: formData.message.trim(),
          projectId,
          source: 'project_page',
          leadType: 'project_interest',
        }),
      });
      const data: { success: boolean; message?: string } = await res.json();
      if (res.ok && data.success) {
        setSuccess(true);
      } else {
        setError(data.message || 'Failed to submit. Please try again.');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl relative"
        onClick={(e) => e.stopPropagation()}>
        <button type="button" onClick={onClose}
          className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full transition-colors">
          <X className="w-5 h-5 text-gray-500" />
        </button>
        <div className="p-6">
          {success ? (
            <div className="text-center py-8">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Request Submitted!</h3>
              <p className="text-gray-500 mb-6">Our team will contact you shortly.</p>
              <button type="button" onClick={onClose}
                className="px-6 py-2.5 bg-[#029bba] hover:bg-[#027a94] text-white rounded-xl font-medium transition-colors">
                Close
              </button>
            </div>
          ) : (
            <>
              <h3 className="text-xl font-bold text-gray-900 mb-1">
                {unitNumber ? `Book Unit ${unitNumber}` : 'Inquire About This Project'}
              </h3>
              <p className="text-sm text-gray-500 mb-6">{projectName}</p>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="lf-name" className="block text-sm font-medium text-gray-700 mb-1">
                    Your Name <span className="text-red-500">*</span>
                  </label>
                  <input id="lf-name" type="text" value={formData.name}
                    onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                    placeholder="How should we address you?"
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/20 outline-none text-sm transition-all" />
                </div>
                <div>
                  <label htmlFor="lf-phone" className="block text-sm font-medium text-gray-700 mb-1">
                    Phone <span className="text-red-500">*</span>
                  </label>
                  <div className="flex">
                    <span className="inline-flex items-center px-3 rounded-l-xl border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                      🇵🇰 +92
                    </span>
                    <input id="lf-phone" type="tel" value={formData.phone}
                      onChange={e => setFormData(p => ({ ...p, phone: e.target.value }))}
                      placeholder="3XX XXXXXXX"
                      className="flex-1 px-4 py-3 rounded-r-xl border border-gray-300 focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/20 outline-none text-sm transition-all" />
                  </div>
                </div>
                <div>
                  <label htmlFor="lf-email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input id="lf-email" type="email" value={formData.email}
                    onChange={e => setFormData(p => ({ ...p, email: e.target.value }))}
                    placeholder="Your email address"
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/20 outline-none text-sm transition-all" />
                </div>
                <div>
                  <label htmlFor="lf-msg" className="block text-sm font-medium text-gray-700 mb-1">
                    Message <span className="text-gray-400">(Optional)</span>
                  </label>
                  <textarea id="lf-msg" value={formData.message} rows={3}
                    onChange={e => setFormData(p => ({ ...p, message: e.target.value }))}
                    placeholder="Any specific requirements?"
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/20 outline-none text-sm transition-all resize-none" />
                </div>
                {error && (
                  <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded-lg text-sm">
                    {error}
                  </div>
                )}
                <button type="submit" disabled={submitting}
                  className="w-full bg-[#029bba] hover:bg-[#027a94] disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl transition-colors">
                  {submitting ? 'Submitting...' : 'Submit Inquiry'}
                </button>
                <p className="text-xs text-center text-gray-400">
                  By submitting, you agree to our{' '}
                  <Link href="/terms" className="text-[#029bba] hover:underline">Terms of Use</Link>
                </p>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// Share Menu
function ShareMenu({
  isOpen, onClose, onShare,
}: {
  isOpen: boolean;
  onClose: () => void;
  onShare: (platform: string) => void;
}): React.ReactElement | null {
  if (!isOpen) return null;
  const items = [
    { id: 'copy',      label: 'Copy Link',    bg: 'bg-gray-100',   text: 'text-gray-600',  icon: <ExternalLink className="w-3.5 h-3.5" /> },
    { id: 'whatsapp',  label: 'WhatsApp',     bg: 'bg-green-100',  text: 'text-green-600', icon: <MessageCircle className="w-3.5 h-3.5" /> },
    { id: 'facebook',  label: 'Facebook',     bg: 'bg-blue-100',   text: 'text-blue-600',  icon: <span className="text-xs font-bold">f</span> },
    { id: 'twitter',   label: 'X (Twitter)',  bg: 'bg-gray-900',   text: 'text-white',     icon: <span className="text-xs font-bold">𝕏</span> },
  ];
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="absolute right-0 top-12 bg-white rounded-2xl shadow-2xl border border-gray-100 py-2 z-50 min-w-[200px]">
        {items.map(item => (
          <button key={item.id}
            onClick={() => { onShare(item.id); onClose(); }}
            className="w-full px-4 py-2.5 text-left hover:bg-gray-50 flex items-center gap-3 text-sm font-medium transition-colors">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center ${item.bg} ${item.text}`}>
              {item.icon}
            </div>
            {item.label}
          </button>
        ))}
      </div>
    </>
  );
}

// Inline banner component
function Banner({ type, message }: { type: 'success' | 'error' | 'info'; message: string }): React.ReactElement {
  const styles = {
    success: 'bg-[#f0fdf4] border-l-4 border-[#10b981] text-[#10b981]',
    error:   'bg-[#fef2f2] border-l-4 border-[#ef4444] text-red-700',
    info:    'bg-[#eff6ff] border-l-4 border-[#029bba] text-[#004063]',
  };
  return (
    <div className={`px-4 py-3 rounded-lg text-sm font-medium ${styles[type]}`}>
      {message}
    </div>
  );
}

// ============================================
// MAIN PAGE COMPONENT
// ============================================

export default function ProjectDetailPage({ project, initialUnits }: PageProps): React.ReactElement {
  const router = useRouter();
  const { data: session } = useSession();
  const isLoggedIn = !!session?.user;

  // Units (client-refreshed for live status)
  const [units, setUnits] = useState<UnitRow[]>(initialUnits);
  const [unitsLoading, setUnitsLoading] = useState(false);

  // UI state
  const [activeSection, setActiveSection]         = useState('overview');
  const [showFullDesc, setShowFullDesc]            = useState(false);
  const [activeOfferingIdx, setActiveOfferingIdx]  = useState(0);
  const [activeFloorPlanIdx, setActiveFloorPlanIdx]= useState(0);
  const [activeNearbyTab, setActiveNearbyTab]      = useState('all');

  // Gallery / video
  const [galleryOpen, setGalleryOpen]         = useState(false);
  const [galleryIndex, setGalleryIndex]       = useState(0);
  const [videoOpen, setVideoOpen]             = useState(false);
  const [activeVideoUrl, setActiveVideoUrl]   = useState('');

  // Modals
  const [showInquiry, setShowInquiry]         = useState(false);
  const [inquiryType, setInquiryType]         = useState<
    'project_interest' | 'call_back' | 'site_visit' | 'general_inquiry'
  >('project_interest');
  const [leadModalOpen, setLeadModalOpen]     = useState(false);
  const [selectedUnitNum, setSelectedUnitNum] = useState<string | null>(null);

  // Hero map / share / bookmark
  const [showHeroMap, setShowHeroMap]         = useState(false);
  const [showShareMenu, setShowShareMenu]     = useState(false);
  const [isBookmarked, setIsBookmarked]       = useState(false);
  const [bookmarkBanner, setBookmarkBanner]   = useState<string>('');
  const [copyBanner, setCopyBanner]           = useState<string>('');

  // Contact reveal
  const [revealedContact, setRevealedContact] = useState<'call' | 'whatsapp' | null>(null);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [loginPromptType, setLoginPromptType]= useState<'call' | 'whatsapp'>('call');

  const sidebarRef = useRef<HTMLDivElement>(null);

  // ── Derived data ──
  // Field alias: database uses 'area', code expects 'areaName' — normalize here
  const areaDisplay = project.areaName || project.area || '';

  const allImages = Array.isArray(project.images) ? project.images : [];
  const primaryImage =
    project.featureImageUrl ||
    allImages.find(i => i.isPrimary)?.url ||
    allImages[0]?.url || '';
  const totalPhotos = allImages.length;
  const primaryVideoUrl = project.droneVideoUrl || project.videos?.[0]?.url || '';
  const safeDesc  = sanitizeHtml(project.description || '');
  const plainDesc = stripTags(safeDesc);
  const shouldTruncate = plainDesc.length > 800;
  const availableUnits = units.filter(u => u.status === 'available');
  const nearbyTabs = ['all', 'hospital', 'school', 'restaurant', 'park', 'mall', 'mosque', 'bank', 'transport', 'other'];
  // Model field is nearbyFacilities (not nearbyPlaces), category (not type)
  const filteredNearby = (project.nearbyFacilities || []).filter(
    p => activeNearbyTab === 'all' || p.category === activeNearbyTab
  );
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://highrise.pk';
  const canonicalUrl = `${siteUrl}/projects/${project.slug}`;

  // ── Check bookmark on mount ──
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('bookmarkedProjects') || '[]') as string[];
      setIsBookmarked(saved.includes(project._id));
    } catch {
      setIsBookmarked(false);
    }
  }, [project._id]);

  // ── Refresh units client-side for live status ──
  useEffect(() => {
    let cancelled = false;
    const refresh = async () => {
      setUnitsLoading(true);
      try {
        const res = await fetch(`/api/projects/${project._id}/units?limit=100`);
        const data: { success: boolean; units?: UnitRow[] } = await res.json();
        if (!cancelled && data.success && data.units) {
          setUnits(data.units);
        }
      } catch {
        // keep initial units on error — no crash
      } finally {
        if (!cancelled) setUnitsLoading(false);
      }
    };
    refresh();
    return () => { cancelled = true; };
  }, [project._id]);

  // ── Scroll spy ──
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting && entry.target.id) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { rootMargin: '-130px 0px -50% 0px', threshold: 0.2 }
    );
    SECTION_CONFIG.forEach(s => {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  // ── Handlers ──
  function openGallery(idx: number) { setGalleryIndex(idx); setGalleryOpen(true); }
  function openVideo(url: string)   { setActiveVideoUrl(url); setVideoOpen(true); }

  function handleContactReveal(type: 'call' | 'whatsapp') {
    if (!isLoggedIn) {
      setLoginPromptType(type);
      setShowLoginPrompt(true);
      return;
    }
    // Managed marketplace — all contact goes through Highrise inquiry
    // Phone numbers are encrypted server-side and not returned to public pages
    setInquiryType(type === 'call' ? 'call_back' : 'project_interest');
    setShowInquiry(true);
  }

  function maskPhone(phone?: string): string {
    if (!phone) return '****-*******';
    const c = phone.replace(/\D/g, '');
    if (c.length >= 10) return `${c.slice(0, 4)}-***-**${c.slice(-2)}`;
    return '****-*******';
  }

  function handleBookmark() {
    try {
      const saved = JSON.parse(localStorage.getItem('bookmarkedProjects') || '[]') as string[];
      if (!isBookmarked) {
        const updated = [...saved.filter(id => id !== project._id), project._id];
        localStorage.setItem('bookmarkedProjects', JSON.stringify(updated));
        setIsBookmarked(true);
        setBookmarkBanner('Project saved to bookmarks.');
      } else {
        const updated = saved.filter(id => id !== project._id);
        localStorage.setItem('bookmarkedProjects', JSON.stringify(updated));
        setIsBookmarked(false);
        setBookmarkBanner('Project removed from bookmarks.');
      }
      setTimeout(() => setBookmarkBanner(''), 3000);
    } catch {
      setIsBookmarked(false);
    }
  }

  async function handleShare(platform?: string) {
    const url   = typeof window !== 'undefined' ? window.location.href : canonicalUrl;
    const title = `${project.projectName} – ${areaDisplay}, ${project.city}`;
    const text  = `Check out ${project.projectName} on Highrise.pk`;

    if (platform === 'whatsapp') {
      window.open(`https://wa.me/?text=${encodeURIComponent(title + '\n' + url)}`, '_blank');
    } else if (platform === 'facebook') {
      window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank');
    } else if (platform === 'twitter') {
      window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank');
    } else if (platform === 'copy') {
      try {
        await navigator.clipboard.writeText(url);
        setCopyBanner('Link copied to clipboard!');
        setTimeout(() => setCopyBanner(''), 3000);
      } catch {
        setCopyBanner('Could not copy link.');
        setTimeout(() => setCopyBanner(''), 3000);
      }
    } else {
      if (typeof navigator !== 'undefined' && 'share' in navigator) {
        try { await navigator.share({ title, text, url }); } catch { /* cancelled */ }
      } else {
        setShowShareMenu(s => !s);
      }
    }
  }

  // ── Fallback (ISR) ──
  if (router.isFallback) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#029bba] mx-auto" />
          <p className="mt-4 text-gray-500">Loading project...</p>
        </div>
      </div>
    );
  }

  // ── JSON-LD ──
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'RealEstateListing',
    name: project.projectName,
    description: project.shortDescription || plainDesc.slice(0, 200),
    url: canonicalUrl,
    image: primaryImage ? [primaryImage] : undefined,
    address: {
      '@type': 'PostalAddress',
      addressLocality: areaDisplay,
      addressRegion: project.city,
      addressCountry: 'PK',
    },
    geo: project.coordinates?.lat && project.coordinates?.lng ? {
      '@type': 'GeoCoordinates',
      latitude: project.coordinates.lat,
      longitude: project.coordinates.lng,
    } : undefined,
    offers: {
      '@type': 'Offer',
      priceCurrency: 'PKR',
      price: project.minPrice || undefined,
      availability: availableUnits.length > 0
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
    },
    seller: {
      '@type': 'Organization',
      name: project.developerProfile?.companyName || 'Developer',
      url: project.developerProfile?.website || undefined,
    },
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Head>
        <title>{`${project.projectName} | ${areaDisplay}, ${project.city} | Highrise.pk`}</title>
        <meta name="description" content={
          project.shortDescription ||
          `${project.projectName} in ${areaDisplay}, ${project.city}. View prices, photos, location and availability on Highrise.pk.`
        } />
        <link rel="canonical" href={canonicalUrl} />
        <meta property="og:type"        content="website" />
        <meta property="og:site_name"   content="Highrise.pk" />
        <meta property="og:title"       content={`${project.projectName} | Highrise.pk`} />
        <meta property="og:description" content={project.shortDescription || `${project.projectName} in ${areaDisplay}, ${project.city}.`} />
        <meta property="og:url"         content={canonicalUrl} />
        {primaryImage && <meta property="og:image" content={primaryImage} />}
        <meta name="twitter:card"        content="summary_large_image" />
        <meta name="twitter:title"       content={`${project.projectName} | Highrise.pk`} />
        <meta name="twitter:description" content={project.shortDescription || `${project.projectName} in ${areaDisplay}, ${project.city}.`} />
        {primaryImage && <meta name="twitter:image" content={primaryImage} />}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      </Head>

      {/* ── Inline Banners ── */}
      {(bookmarkBanner || copyBanner) && (
        <div className="fixed top-4 right-4 z-50 space-y-2 max-w-xs w-full">
          {bookmarkBanner && <Banner type="success" message={bookmarkBanner} />}
          {copyBanner     && <Banner type="info"    message={copyBanner} />}
        </div>
      )}

      {/* ═══════════ BREADCRUMB ═══════════ */}
      <div className="bg-gradient-to-r from-slate-50 via-white to-slate-50 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <nav className="flex items-center gap-2 text-sm flex-wrap">
            <Link href="/" className="flex items-center gap-1.5 text-gray-500 hover:text-[#029bba] transition-colors">
              <Home className="w-4 h-4" /><span>Home</span>
            </Link>
            <ChevronRight className="w-4 h-4 text-gray-300" />
            <Link href="/projects" className="text-gray-500 hover:text-[#029bba] transition-colors">Projects</Link>
            <ChevronRight className="w-4 h-4 text-gray-300" />
            <Link href={`/projects?city=${encodeURIComponent(project.city)}`}
              className="text-gray-500 hover:text-[#029bba] transition-colors flex items-center gap-1">
              <MapPin className="w-3 h-3" />{project.city}
            </Link>
            <ChevronRight className="w-4 h-4 text-gray-300" />
            <span className="text-gray-900 font-semibold truncate max-w-xs">
              {project.projectName}
            </span>
            {project.isVerified && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-700">
                <CheckCircle className="w-2.5 h-2.5" />
              </span>
            )}
          </nav>
        </div>
      </div>

      {/* ═══════════ HERO ═══════════ */}
      <div className="relative bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 overflow-hidden">
        {/* BG effects */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-[#029bba]/20 rounded-full blur-[100px]" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500/15 rounded-full blur-[100px]" />
        </div>
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,.1) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.1) 1px,transparent 1px)',
          backgroundSize: '50px 50px',
        }} />

        {/* ── TOP BAR: badges + actions ── */}
        <div className="relative z-10 border-b border-white/5">
          <div className="max-w-7xl mx-auto px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              {/* Badges */}
              <div className="flex flex-wrap items-center gap-2">
                {project.isVerified && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-lg">
                    <BadgeCheck className="w-3.5 h-3.5" />VERIFIED
                  </span>
                )}
                {project.isFeatured && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg">
                    <Flame className="w-3.5 h-3.5" />FEATURED
                  </span>
                )}
                <span className="px-3 py-1.5 rounded-full text-xs font-semibold bg-white/10 text-white/80 border border-white/10">
                  {project.projectCategory === 'highrise' ? '🏢 High-Rise'
                   : project.projectCategory === 'society' ? '🏘️ Society'
                   : project.projectCategory === 'mixed_use' ? '🏗️ Mixed Use'
                   : project.projectCategory === 'commercial_plaza' ? '🏪 Commercial Plaza'
                   : project.projectCategory === 'townhouse' ? '🏡 Townhouse'
                   : '🏘️ Gated Community'}
                </span>
                <span className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${
                  project.projectNature === 'residential'
                    ? 'bg-sky-500/15 text-sky-300 border-sky-400/20'
                    : project.projectNature === 'commercial'
                    ? 'bg-violet-500/15 text-violet-300 border-violet-400/20'
                    : 'bg-teal-500/15 text-teal-300 border-teal-400/20'
                }`}>
                  {project.projectNature === 'residential' && '🏠 Residential'}
                  {project.projectNature === 'commercial'  && '🏪 Commercial'}
                  {project.projectNature === 'mixed'       && '🏗️ Mixed Use'}
                </span>
              </div>

              {/* Quick actions */}
              <div className="flex items-center gap-2">
                {/* Share */}
                <div className="relative">
                  <button onClick={() => handleShare()}
                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10 transition-all"
                    title="Share">
                    <Share2 className="w-4 h-4" />
                  </button>
                  <ShareMenu
                    isOpen={showShareMenu}
                    onClose={() => setShowShareMenu(false)}
                    onShare={handleShare}
                  />
                </div>
                {/* Bookmark */}
                <button onClick={handleBookmark}
                  className={`p-2 rounded-xl transition-all border ${
                    isBookmarked
                      ? 'bg-[#029bba] text-white border-[#029bba]'
                      : 'bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border-white/10'
                  }`} title={isBookmarked ? 'Saved' : 'Save'}>
                  <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-current' : ''}`} />
                </button>
                {/* Print */}
                <button onClick={() => typeof window !== 'undefined' && window.print()}
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10 transition-all"
                  title="Print">
                  <Printer className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── GALLERY + PRICE CARD ── */}
        <div className="relative z-10">
          <div className="max-w-7xl mx-auto px-4 py-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:items-stretch">

              {/* Gallery */}
              <div className="lg:col-span-2">
                <div className="grid grid-cols-4 grid-rows-2 gap-3 h-[300px] md:h-[400px] lg:h-[480px]">
                  {/* Main image */}
                  <div className="col-span-3 row-span-2 relative rounded-2xl overflow-hidden cursor-pointer group shadow-2xl"
                    onClick={() => openGallery(0)}>
                    {primaryImage ? (
                      <>
                        <Image src={primaryImage} alt={project.projectName} fill
                          className="object-cover transition-transform duration-700 group-hover:scale-105" priority />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                        {primaryVideoUrl && (
                          <button
                            onClick={e => { e.stopPropagation(); openVideo(primaryVideoUrl); }}
                            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 md:w-20 md:h-20 rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center text-white hover:bg-white/30 transition-all">
                            <Play className="w-7 h-7 ml-1" fill="white" />
                          </button>
                        )}
                        <div className="absolute inset-0 flex items-end justify-start p-5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="flex items-center gap-2 bg-black/50 backdrop-blur-sm px-4 py-2 rounded-full text-white text-sm font-medium">
                            <Camera className="w-4 h-4" />View All {totalPhotos} Photos
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center">
                        <Building2 className="w-16 h-16 text-slate-600" />
                      </div>
                    )}
                  </div>

                  {/* Thumbnails */}
                  <div className="col-span-1 row-span-2 grid grid-rows-3 gap-3">
                    {[1, 2].map(idx => (
                      <div key={idx}
                        className="relative rounded-xl overflow-hidden cursor-pointer group shadow-lg bg-slate-800"
                        onClick={() => allImages[idx] && openGallery(idx)}>
                        {allImages[idx] ? (
                          <>
                            <Image src={allImages[idx].url} alt={allImages[idx].caption || `Gallery ${idx + 1}`}
                              fill className="object-cover transition-transform duration-500 group-hover:scale-110" />
                            <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors" />
                          </>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Camera className="w-6 h-6 text-slate-600" />
                          </div>
                        )}
                      </div>
                    ))}
                    {/* View all card */}
                    <div className="relative rounded-xl overflow-hidden cursor-pointer group shadow-lg"
                      onClick={() => openGallery(0)}>
                      {allImages[3] && (
                        <Image src={allImages[3].url} alt="More" fill className="object-cover" />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-br from-[#029bba] to-[#017a8a] opacity-90 group-hover:opacity-100 transition-opacity" />
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
                        <Camera className="w-5 h-5 mb-1" />
                        <span className="text-xl font-black">+{Math.max(0, totalPhotos - 3)}</span>
                        <span className="text-[10px] uppercase tracking-wider opacity-80">Photos</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Price & Contact Card */}
              <div className="lg:col-span-1">
                <div className="relative bg-white/[0.03] backdrop-blur-xl rounded-3xl border border-white/10 overflow-hidden h-full flex flex-col shadow-2xl">
                  <div className="absolute -top-20 -right-20 w-40 h-40 bg-[#029bba]/20 rounded-full blur-3xl" />
                  <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-purple-500/10 rounded-full blur-3xl" />
                  <div className="relative p-6 flex flex-col flex-1">
                    {/* Price */}
                    <div className="mb-6">
                      <p className="text-white/50 text-sm font-medium mb-1">Starting From</p>
                      <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-black text-white">
                          {formatPrice(project.minPrice || 0)}
                        </span>
                        <span className="text-white/40 text-sm">PKR</span>
                      </div>
                      {project.maxPrice && project.maxPrice > (project.minPrice || 0) && (
                        <p className="text-white/40 text-sm mt-1">
                          Up to <span className="text-white/60 font-semibold">{formatPrice(project.maxPrice)} PKR</span>
                        </p>
                      )}
                    </div>
                    <div className="h-px bg-gradient-to-r from-transparent via-white/20 to-transparent mb-6" />

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-3 mb-6">
                      {[
                        { label: 'Total',     value: project.totalUnits ?? units.length ?? '—', color: 'text-[#029bba]' },
                        { label: 'Available', value: project.unitsAvailable ?? availableUnits.length ?? '—', color: 'text-emerald-400' },
                        { label: 'Progress',  value: project.developmentProgress !== undefined ? `${project.developmentProgress}%` : '—', color: 'text-white' },
                      ].map(stat => (
                        <div key={stat.label} className="text-center p-3 bg-white/5 rounded-xl border border-white/5">
                          <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                          <p className="text-[10px] text-white/40 uppercase tracking-wide mt-1">{stat.label}</p>
                        </div>
                      ))}
                    </div>

                    {/* Possession */}
                    {project.possessionStartDate && (
                      <div className="flex items-center gap-3 p-3 bg-amber-500/10 rounded-xl border border-amber-500/20 mb-6">
                        <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                          <CalendarCheck className="w-5 h-5 text-amber-400" />
                        </div>
                        <div>
                          <p className="text-amber-400 text-sm font-semibold">Possession</p>
                          <p className="text-white/70 text-xs">{formatDate(project.possessionStartDate)}</p>
                        </div>
                      </div>
                    )}

                    <div className="flex-1" />

                    {/* CTA Buttons */}
                    <div className="space-y-3">
                      {/* Call */}
                      <button
                        onClick={() => handleContactReveal('call')}
                        className="w-full bg-gradient-to-r from-[#029bba] to-[#017a8a] hover:from-[#02a8c9] hover:to-[#018a9a] text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-[#029bba]/20">
                        {revealedContact === 'call' ? (
                          <div className="flex flex-col items-center gap-1">
                            <div className="flex items-center gap-2">
                              <Phone className="w-5 h-5" />
                              <span className="text-lg">{project.developerProfile?.contactNumber}</span>
                            </div>
                            <span className="text-[10px] opacity-70">Tap again to call</span>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-3">
                            <Phone className="w-5 h-5" />
                            <span>Call Now</span>
                            <span className="text-xs opacity-60 bg-white/20 px-2 py-0.5 rounded-full">
                              {maskPhone(project.developerProfile?.contactNumber)}
                            </span>
                          </div>
                        )}
                      </button>

                      {/* WhatsApp */}
                      <button
                        onClick={() => handleContactReveal('whatsapp')}
                        className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-green-500/20">
                        {revealedContact === 'whatsapp' ? (
                          <div className="flex flex-col items-center gap-1">
                            <div className="flex items-center gap-2">
                              <MessageCircle className="w-5 h-5" />
                              <span className="text-lg">
                                {project.developerProfile?.whatsappNumber || project.developerProfile?.contactNumber}
                              </span>
                            </div>
                            <span className="text-[10px] opacity-70">Tap again to open WhatsApp</span>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-3">
                            <MessageCircle className="w-5 h-5" />
                            <span>WhatsApp</span>
                            <span className="text-xs opacity-60 bg-white/20 px-2 py-0.5 rounded-full">
                              {maskPhone(project.developerProfile?.whatsappNumber || project.developerProfile?.contactNumber)}
                            </span>
                          </div>
                        )}
                      </button>

                      {/* Callback */}
                      <button
                        onClick={() => { setInquiryType('call_back'); setShowInquiry(true); }}
                        className="w-full bg-white/5 hover:bg-white/10 text-white font-semibold py-3 rounded-xl transition-all flex items-center justify-center gap-2 border border-white/10">
                        <PhoneCall className="w-4 h-4" />Request Callback
                      </button>
                    </div>

                    <p className="text-center text-white/30 text-[10px] mt-4">
                      🔒 {isLoggedIn ? 'Verified contact information' : 'Login to view contact details'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── TITLE BAR ── */}
        <div className="relative z-10 border-t border-white/5">
          <div className="max-w-7xl mx-auto px-4 py-5">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <h1 className="text-2xl md:text-3xl lg:text-4xl font-black text-white mb-2 leading-tight">
                  {project.projectName}
                </h1>
                {project.tagline && (
                  <p className="text-white/50 text-base md:text-lg italic">"{project.tagline}"</p>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2 bg-white/5 rounded-xl px-4 py-2.5 border border-white/10">
                  <div className="w-8 h-8 rounded-full bg-[#029bba]/20 flex items-center justify-center">
                    <MapPinned className="w-4 h-4 text-[#029bba]" />
                  </div>
                  <div>
                    <p className="text-white font-semibold text-sm">
                      {areaDisplay}, {project.city}
                    </p>
                    {project.specificLocation && (
                      <p className="text-white/50 text-xs">{project.specificLocation}</p>
                    )}
                  </div>
                </div>
                <Link href={`/developers/${project.developer}`}
                  className="flex items-center gap-2 bg-white/5 hover:bg-white/10 rounded-xl px-4 py-2.5 border border-white/10 transition-colors group">
                  <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center overflow-hidden">
                    {project.developerProfile?.logoUrl ? (
                      <Image src={project.developerProfile.logoUrl} alt="" width={24} height={24} className="object-contain" />
                    ) : (
                      <Building2 className="w-4 h-4 text-white/50" />
                    )}
                  </div>
                  <div>
                    <p className="text-white font-semibold text-sm group-hover:text-[#029bba] transition-colors">
                      {project.developerProfile?.companyName || 'Developer'}
                    </p>
                    <p className="text-white/50 text-xs">View Profile →</p>
                  </div>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* ── MEDIA ACTION BAR ── */}
        <div className="relative z-10 border-t border-white/5 bg-white/[0.02]">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex flex-wrap items-center gap-3">
              <button onClick={() => { setShowHeroMap(false); openGallery(0); }}
                className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold transition-all ${
                  !showHeroMap ? 'bg-white text-slate-900 shadow-lg' : 'bg-white/10 hover:bg-white/15 text-white border border-white/10'
                }`}>
                <Camera className="w-4 h-4" />{totalPhotos} Photos
              </button>
              {project.virtualTourUrl && (
                <a href={project.virtualTourUrl} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-400/20 font-semibold transition-all">
                  <Sparkles className="w-4 h-4" />360° Tour
                </a>
              )}
              <button onClick={() => setShowHeroMap(v => !v)}
                className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold transition-all ${
                  showHeroMap ? 'bg-white text-slate-900 shadow-lg' : 'bg-white/10 hover:bg-white/15 text-white border border-white/10'
                }`}>
                <Map className="w-4 h-4" />{showHeroMap ? 'Hide Map' : 'View Map'}
              </button>
              {primaryVideoUrl && (
                <button onClick={() => openVideo(primaryVideoUrl)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-200 border border-red-400/20 font-semibold transition-all">
                  <Play className="w-4 h-4" />Video
                </button>
              )}
              {typeof project.highriseScore === 'number' && (
                <div className="ml-auto hidden md:flex items-center gap-2 bg-[#029bba]/20 rounded-xl px-4 py-2 border border-[#029bba]/20">
                  <TrendingUp className="w-4 h-4 text-[#029bba]" />
                  <span className="text-sm font-bold text-white">
                    Highrise Score: <span className="text-[#029bba]">{project.highriseScore}/100</span>
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Map overlay */}
        {showHeroMap && (
          <div className="absolute inset-0 z-20 bg-slate-900/95 flex items-center justify-center p-4">
            <div className="relative w-full max-w-5xl h-[500px] rounded-2xl overflow-hidden shadow-2xl border border-white/10">
              <iframe src={getMapEmbedUrl(project)} width="100%" height="100%"
                style={{ border: 0 }} allowFullScreen loading="lazy"
                referrerPolicy="no-referrer-when-downgrade" title="Project Location Map" />
              <button onClick={() => setShowHeroMap(false)}
                className="absolute top-4 right-4 p-2 bg-white rounded-full shadow-lg hover:bg-gray-100 transition-colors">
                <X className="w-5 h-5 text-gray-700" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ═══════════ TRUST STRIP ═══════════ */}
      <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-cyan-50 border-b border-teal-100">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
            {project.isVerified && (
              <div className="flex items-center gap-2 text-sm">
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                  <BadgeCheck className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <p className="font-semibold text-green-800">Verified Listing</p>
                  <p className="text-[10px] text-green-600">By Highrise.pk Team</p>
                </div>
              </div>
            )}
            {project.approvalAuthority && (
              <>
                <div className="hidden md:block w-px h-10 bg-teal-200" />
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                    <Shield className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-blue-800">{project.approvalAuthority} Approved</p>
                    <p className="text-[10px] text-blue-600">Government Authority</p>
                  </div>
                </div>
              </>
            )}
            {project.nocStatus && (
              <>
                <div className="hidden md:block w-px h-10 bg-teal-200" />
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                    <FileText className="w-4 h-4 text-purple-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-purple-800">NOC: {project.nocStatus}</p>
                    <p className="text-[10px] text-purple-600">Legal Documentation</p>
                  </div>
                </div>
              </>
            )}
            {project.riskLevel && (
              <>
                <div className="hidden md:block w-px h-10 bg-teal-200" />
                <div className="flex items-center gap-2 text-sm">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    project.riskLevel === 'low' ? 'bg-green-100' : project.riskLevel === 'medium' ? 'bg-amber-100' : 'bg-red-100'
                  }`}>
                    <Target className={`w-4 h-4 ${
                      project.riskLevel === 'low' ? 'text-green-600' : project.riskLevel === 'medium' ? 'text-amber-600' : 'text-red-600'
                    }`} />
                  </div>
                  <div>
                    <p className={`font-semibold capitalize ${
                      project.riskLevel === 'low' ? 'text-green-800' : project.riskLevel === 'medium' ? 'text-amber-800' : 'text-red-800'
                    }`}>{project.riskLevel} Risk</p>
                    <p className={`text-[10px] ${
                      project.riskLevel === 'low' ? 'text-green-600' : project.riskLevel === 'medium' ? 'text-amber-600' : 'text-red-600'
                    }`}>Investment Safety</p>
                  </div>
                </div>
              </>
            )}
            <div className="hidden md:block w-px h-10 bg-teal-200" />
            <div className="flex items-center gap-2 text-sm">
              <div className="w-8 h-8 rounded-full bg-pink-100 flex items-center justify-center">
                <Gift className="w-4 h-4 text-pink-600" />
              </div>
              <div>
                <p className="font-semibold text-pink-800">Zero Buyer Commission</p>
                <p className="text-[10px] text-pink-600">Transparent Pricing</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════ STICKY NAV ═══════════ */}
      <div className="bg-white border-b border-gray-200 sticky top-[64px] z-30">
        <div className="max-w-7xl mx-auto px-4 overflow-x-auto">
          <div className="flex gap-4 py-3 text-sm">
            {SECTION_CONFIG.map(s => (
              <button key={s.id}
                onClick={() => {
                  const el = document.getElementById(s.id);
                  if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 130, behavior: 'smooth' });
                }}
                className={`whitespace-nowrap px-3 py-1.5 rounded-full border transition-all ${
                  activeSection === s.id
                    ? 'bg-[#029bba] text-white border-[#029bba]'
                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                }`}>
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ═══════════ MAIN CONTENT ═══════════ */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* ── LEFT COLUMN ── */}
          <div className="lg:col-span-2 space-y-8">

            {/* OVERVIEW CARDS */}
            <section id="overview">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {/* Offering */}
                <div className="bg-white rounded-2xl border border-gray-200 p-5 hover:shadow-lg hover:border-[#029bba]/30 transition-all">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#029bba] to-[#027a94] flex items-center justify-center mb-4">
                    <Layers className="w-6 h-6 text-white" />
                  </div>
                  <p className="text-xs text-gray-500 uppercase font-semibold tracking-wide mb-1">Offering</p>
                  <p className="font-bold text-gray-900">
                    {project.projectNature === 'residential' ? 'Apartments'
                     : project.projectNature === 'commercial' ? 'Shops & Offices'
                     : 'Commercial + Residential'}
                  </p>
                  <span className={`mt-2 inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                    project.projectNature === 'residential' ? 'bg-green-100 text-green-700'
                    : project.projectNature === 'commercial' ? 'bg-blue-100 text-blue-700'
                    : 'bg-purple-100 text-purple-700'
                  }`}>
                    {project.projectCategory === 'highrise' ? 'High-Rise' : 'Society'} • {project.projectNature}
                  </span>
                </div>

                {/* Developer */}
                <Link href={`/developers/${project.developer}`}
                  className="bg-white rounded-2xl border border-gray-200 p-5 hover:shadow-lg hover:border-[#029bba]/30 transition-all group">
                  <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center mb-4 overflow-hidden">
                {project.developerProfile?.logoUrl ? (
                  <Image src={project.developerProfile.logoUrl} alt={project.developerProfile?.companyName ?? ''} width={40} height={40} className="object-contain" />
                ) : (
                  <Building2 className="w-6 h-6 text-gray-400" />
                )}
                  </div>
                  <p className="text-xs text-gray-500 uppercase font-semibold tracking-wide mb-1">Developer</p>
                  <p className="font-bold text-[#029bba] group-hover:underline">
                    {project.developerProfile?.companyName || 'View Developer'}
                  </p>
                </Link>

                {/* Available units */}
                <div className="bg-white rounded-2xl border border-gray-200 p-5 hover:shadow-lg hover:border-green-300 transition-all">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center mb-4">
                    <CheckCircle className="w-6 h-6 text-white" />
                  </div>
                  <p className="text-xs text-gray-500 uppercase font-semibold tracking-wide mb-1">Available</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-black text-green-600">{availableUnits.length}</span>
                    <span className="text-gray-400">/ {units.length}</span>
                  </div>
                  <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-green-400 to-green-600 rounded-full"
                      style={{ width: `${units.length ? Math.round((availableUnits.length / units.length) * 100) : 0}%` }} />
                  </div>
                </div>

                {/* Status */}
                <div className="bg-white rounded-2xl border border-gray-200 p-5 hover:shadow-lg hover:border-purple-300 transition-all">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center mb-4">
                    <BarChart3 className="w-6 h-6 text-white" />
                  </div>
                  <p className="text-xs text-gray-500 uppercase font-semibold tracking-wide mb-1">Status</p>
                  <p className="font-bold text-gray-900 capitalize mb-1">{project.status}</p>
                  {project.developmentProgress !== undefined && (
                    <>
                      <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-purple-400 to-purple-600 rounded-full"
                          style={{ width: `${project.developmentProgress}%` }} />
                      </div>
                      <p className="text-xs text-purple-600 font-semibold mt-1">{project.developmentProgress}% Complete</p>
                    </>
                  )}
                </div>
              </div>
            </section>

            {/* OFFERINGS */}
            {(project.unitTypeBreakdown?.length ?? 0) > 0 && (
              <Section id="offerings" title="What's On Offer" icon={<Layers className="w-5 h-5 text-[#029bba]" />}
                headerExtra={<span className="text-sm text-gray-500">{project.unitTypeBreakdown!.length} Categories</span>}>

                {/* Tabs */}
                <div className="flex flex-wrap gap-2 mb-6 pb-4 border-b border-gray-100">
                  {project.unitTypeBreakdown!.map((ut, idx) => (
                    <button key={idx} onClick={() => setActiveOfferingIdx(idx)}
                      className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                        activeOfferingIdx === idx
                          ? 'bg-gradient-to-r from-[#029bba] to-[#027a94] text-white shadow-lg'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}>
                      {ut.name || ut.type || 'Unit'}
                      {(ut.totalUnits ?? 0) > 0 && (
                        <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-bold ${
                          activeOfferingIdx === idx ? 'bg-white/25 text-white' : 'bg-[#029bba]/15 text-[#029bba]'
                        }`}>{ut.totalUnits}</span>
                      )}
                    </button>
                  ))}
                </div>

                {/* Active offering detail */}
                {(() => {
                  const ut = project.unitTypeBreakdown![activeOfferingIdx];
                  if (!ut) return null;
                  const minP  = ut.priceRange?.min ?? ut.minPrice ?? 0;
                  const maxP  = ut.priceRange?.max ?? ut.maxPrice ?? 0;
                  const minA  = ut.areaRange?.min ?? ut.minArea ?? 0;
                  const maxA  = ut.areaRange?.max ?? ut.maxArea ?? 0;
                  const aUnit = ut.areaRange?.unit ?? ut.areaUnit ?? 'sqft';
                  const areaC = (minA > 0 && maxA > 0) ? formatAreaWithUnits(minA, maxA, aUnit) : null;
                  const imgUrl = ut.interiorImages?.[0]?.url ?? ut.image ?? ut.imageUrl ?? null;
                  return (
                    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                      <div className="flex flex-col lg:flex-row">
                        {/* Image */}
                        <div className="lg:w-2/5 relative bg-gray-100">
                          <div className="aspect-[4/3] lg:h-full relative">
                            {imgUrl ? (
                              <Image src={imgUrl} alt={ut.name || 'Unit'} fill
                                className="object-contain bg-gray-50" sizes="(max-width:1024px) 100vw,40vw" />
                            ) : (
                              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                                <Building2 className="w-16 h-16 text-gray-300" />
                              </div>
                            )}
                            <div className="absolute top-3 left-3 z-10">
                              <span className="px-3 py-1.5 bg-white/95 backdrop-blur-sm rounded-lg text-xs font-bold text-[#029bba] shadow-md">
                                {ut.category ?? ut.type ?? 'Unit'}
                              </span>
                            </div>
                            {ut.availableUnits !== undefined && (
                              <div className="absolute bottom-3 left-3 z-10">
                                <span className={`px-3 py-1.5 rounded-lg text-xs font-bold shadow-md ${
                                  ut.availableUnits > 0 ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                                }`}>
                                  {ut.availableUnits > 0 ? `${ut.availableUnits} Available` : 'Sold Out'}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Details */}
                        <div className="lg:w-3/5 p-5 lg:p-6">
                          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-5 pb-5 border-b border-gray-100">
                            <div>
                              <h3 className="text-xl font-bold text-gray-900">{ut.name ?? ut.type ?? 'Unit Type'}</h3>
                              {ut.description && <p className="text-gray-500 text-sm mt-1 line-clamp-2">{ut.description}</p>}
                            </div>
                            <div className="text-left sm:text-right flex-shrink-0">
                              <p className="text-xs text-gray-400 uppercase font-semibold tracking-wider">Price</p>
                              {(minP > 0 || maxP > 0) ? (
                                <>
                                  <p className="text-xl font-black text-[#029bba]">PKR {formatPrice(minP)}</p>
                                  {maxP > minP && <p className="text-sm text-gray-500">to {formatPrice(maxP)}</p>}
                                </>
                              ) : (
                                <p className="text-lg font-bold text-gray-400">Contact for Price</p>
                              )}
                            </div>
                          </div>

                          {/* Area */}
                          {areaC && (
                            <div className="mb-5">
                              <p className="text-xs text-gray-400 uppercase font-semibold tracking-wider mb-3">Area Size</p>
                              <div className="grid grid-cols-3 gap-2">
                                {[
                                  { label: 'Square Feet',   value: areaC.sqft,  bg: 'bg-blue-50   border-blue-200   text-blue-700' },
                                  { label: 'Square Meter',  value: areaC.sqm,   bg: 'bg-purple-50 border-purple-200 text-purple-700' },
                                  { label: 'Marla',         value: areaC.marla, bg: 'bg-green-50  border-green-200  text-green-700' },
                                ].map(c => (
                                  <div key={c.label} className={`rounded-xl p-3 text-center border ${c.bg}`}>
                                    <p className="text-sm font-bold">{c.value}</p>
                                    <p className="text-[10px] font-semibold uppercase mt-1 opacity-70">{c.label}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Beds/Baths */}
                          {((ut.bedrooms ?? 0) > 0 || (ut.bathrooms ?? 0) > 0) && (
                            <div className="flex flex-wrap gap-3 mb-5">
                              {(ut.bedrooms ?? 0) > 0 && (
                                <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-xl px-4 py-2">
                                  <Home className="w-4 h-4 text-blue-600" />
                                  <div>
                                    <p className="text-lg font-bold text-blue-700">{ut.bedrooms}</p>
                                    <p className="text-[10px] text-blue-500 uppercase">Bedrooms</p>
                                  </div>
                                </div>
                              )}
                              {(ut.bathrooms ?? 0) > 0 && (
                                <div className="flex items-center gap-2 bg-purple-50 border border-purple-100 rounded-xl px-4 py-2">
                                  <Droplets className="w-4 h-4 text-purple-600" />
                                  <div>
                                    <p className="text-lg font-bold text-purple-700">{ut.bathrooms}</p>
                                    <p className="text-[10px] text-purple-500 uppercase">Bathrooms</p>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Stats */}
                          <div className="grid grid-cols-3 gap-3 mb-5">
                            {[
                              { label: 'Total',     value: ut.totalUnits ?? '—',     bg: 'bg-gray-50   border-gray-100',  text: 'text-gray-900' },
                              { label: 'Available', value: ut.availableUnits ?? '—',  bg: 'bg-green-50  border-green-100', text: 'text-green-600' },
                              { label: 'Sold',      value: ut.soldUnits ?? '—',       bg: 'bg-orange-50 border-orange-100',text: 'text-orange-600' },
                            ].map(s => (
                              <div key={s.label} className={`text-center p-3 rounded-xl border ${s.bg}`}>
                                <p className={`text-lg font-bold ${s.text}`}>{s.value}</p>
                                <p className="text-[10px] text-gray-500 uppercase">{s.label}</p>
                              </div>
                            ))}
                          </div>

                          {/* Features */}
                          {(ut.features?.length ?? 0) > 0 && (
                            <div className="mb-5 flex flex-wrap gap-1.5">
                              {ut.features!.slice(0, 5).map((f, i) => (
                                <span key={i} className="px-2.5 py-1 bg-gray-100 text-gray-600 rounded-lg text-xs font-medium">{f}</span>
                              ))}
                              {ut.features!.length > 5 && (
                                <span className="px-2.5 py-1 bg-gray-100 text-gray-400 rounded-lg text-xs">+{ut.features!.length - 5} more</span>
                              )}
                            </div>
                          )}

                          {/* Actions */}
                          <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-100">
                            {ut.floorPlanPdfUrl && (
                              <button onClick={() => downloadFile(ut.floorPlanPdfUrl!, `${ut.name || 'floor-plan'}.pdf`)}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl text-sm font-medium text-gray-700 transition-colors">
                                <Download className="w-4 h-4" />Floor Plan
                              </button>
                            )}
                            <button onClick={() => { setInquiryType('project_interest'); setShowInquiry(true); }}
                              className="inline-flex items-center gap-2 px-4 py-2 bg-[#029bba] hover:bg-[#027a94] text-white rounded-xl text-sm font-medium transition-colors">
                              <MessageCircle className="w-4 h-4" />Inquire Now
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Other unit types quick cards */}
                {(project.unitTypeBreakdown!.length > 1) && (
                  <div className="mt-6 pt-6 border-t border-gray-100">
                    <p className="text-xs text-gray-400 uppercase font-semibold tracking-wider mb-4">Other Unit Types</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {project.unitTypeBreakdown!.map((ut, idx) => {
                        if (idx === activeOfferingIdx) return null;
                        const p = ut.priceRange?.min ?? ut.minPrice ?? 0;
                        return (
                          <div key={idx} onClick={() => setActiveOfferingIdx(idx)}
                            className="bg-gray-50 hover:bg-white border border-gray-200 hover:border-[#029bba] rounded-xl p-4 cursor-pointer transition-all group">
                            <div className="flex items-center justify-between">
                              <div>
                                <h4 className="font-bold text-gray-900 group-hover:text-[#029bba] transition-colors">
                                  {ut.name ?? ut.type ?? 'Unit'}
                                </h4>
                                <p className="text-sm font-semibold text-[#029bba] mt-1">
                                  {p > 0 ? `PKR ${formatPrice(p)}` : 'Contact for Price'}
                                </p>
                                <p className="text-xs text-gray-500 mt-0.5">
                                  {(ut.availableUnits ?? 0) > 0 ? `${ut.availableUnits} available` : 'Limited stock'}
                                </p>
                              </div>
                              <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-[#029bba] transition-colors" />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </Section>
            )}

            {/* DESCRIPTION */}
            <Section id="description" title={`${project.projectName}: Overview`}
              icon={<Building2 className="w-5 h-5 text-[#029bba]" />}>
              {project.tagline && (
                <p className="text-lg font-semibold text-[#029bba] mb-4 italic">"{project.tagline}"</p>
              )}
              <div className={`rich-text-content ${shouldTruncate && !showFullDesc ? 'max-h-[420px] overflow-hidden relative' : ''}`}>
                <div dangerouslySetInnerHTML={{ __html: safeDesc }} />
                {shouldTruncate && !showFullDesc && (
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-white to-transparent" />
                )}
              </div>
              {shouldTruncate && (
                <button onClick={() => setShowFullDesc(v => !v)}
                  className="mt-4 inline-flex items-center gap-1 text-[#029bba] font-semibold hover:underline">
                  {showFullDesc ? <><ChevronUp className="w-4 h-4" />Show less</> : <><ChevronDown className="w-4 h-4" />Show more</>}
                </button>
              )}
            </Section>

                        {/* FEATURES */}
            {(project.amenitiesDetailed?.length ?? 0) > 0 && (
              <Section
                title="Features & Amenities"
                icon={<Award className="w-5 h-5 text-[#029bba]" />}
                headerExtra={
                  <span className="text-sm text-gray-500">
                    {project.amenitiesDetailed!.length} amenities
                  </span>
                }
              >
                {(() => {
                  // Model shape: { name, description, icon, category }
                  // Group flat list by category for display
                  const grouped = project.amenitiesDetailed!.reduce<
                    Record<string, typeof project.amenitiesDetailed>
                  >((acc, item) => {
                    const key = item.category || 'general';
                    if (!acc[key]) acc[key] = [];
                    acc[key]!.push(item);
                    return acc;
                  }, {});

                  const categoryMeta: Record<string, { label: string; icon: React.ReactNode }> = {
                    security:    { label: 'Security',    icon: <Lock      className="w-4 h-4 text-[#029bba]" /> },
                    lifestyle:   { label: 'Lifestyle',   icon: <Heart     className="w-4 h-4 text-[#029bba]" /> },
                    convenience: { label: 'Convenience', icon: <Coffee    className="w-4 h-4 text-[#029bba]" /> },
                    recreation:  { label: 'Recreation',  icon: <TreePine  className="w-4 h-4 text-[#029bba]" /> },
                    business:    { label: 'Business',    icon: <Briefcase className="w-4 h-4 text-[#029bba]" /> },
                    spiritual:   { label: 'Spiritual',   icon: <Star      className="w-4 h-4 text-[#029bba]" /> },
                    general:     { label: 'General',     icon: <Star      className="w-4 h-4 text-[#029bba]" /> },
                  };

                  return (
                    <div className="space-y-8">
                      {Object.entries(grouped).map(([category, items], i) => {
                        const meta = categoryMeta[category] ?? {
                          label: category.charAt(0).toUpperCase() + category.slice(1),
                          icon: <Star className="w-4 h-4 text-[#029bba]" />,
                        };
                        return (
                          <div key={i}>
                            <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                              <span className="w-8 h-8 rounded-lg bg-[#029bba]/10 flex items-center justify-center">
                                {meta.icon}
                              </span>
                              {meta.label}
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {items!.map((amenity, j) => (
                                <div
                                  key={j}
                                  className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                                >
                                  <CheckCircle className="w-5 h-5 text-[#029bba] flex-shrink-0 mt-0.5" />
                                  <div>
                                    <span className="text-gray-700 font-medium">
                                      {amenity.name}
                                    </span>
                                    {amenity.description && (
                                      <p className="text-xs text-gray-500 mt-0.5">
                                        {amenity.description}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </Section>
            )}

            {/* CONSTRUCTION UPDATES */}
            {(project.developmentUpdates?.length ?? 0) > 0 && (
              <Section title="Construction Updates" icon={<Calendar className="w-5 h-5 text-[#029bba]" />}>
                <div className="space-y-8">
                  {[...(project.developmentUpdates || [])]
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .map((upd, idx, arr) => (
                      <div key={idx} className="flex gap-4 group">
                        <div className="flex flex-col items-center">
                          <div className="w-3 h-3 rounded-full bg-[#029bba] ring-4 ring-[#029bba]/10" />
                          {idx < arr.length - 1 && <div className="w-0.5 flex-1 bg-gray-100 my-2" />}
                        </div>
                        <div className="flex-1 pb-2">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold text-[#029bba] bg-[#029bba]/5 px-2 py-1 rounded-md uppercase">
                              {formatDate(upd.date)}
                            </span>
                            {(upd.progress ?? 0) > 0 && (
                              <span className="text-xs font-bold text-gray-400">{upd.progress}% Complete</span>
                            )}
                          </div>
                          <h4 className="font-bold text-gray-900 text-lg mb-2">{upd.title}</h4>
                          {upd.description && (
                            <p className="text-gray-600 text-sm mb-4 leading-relaxed">{upd.description}</p>
                          )}
                          {(upd.images?.length ?? 0) > 0 && (
                            <div className="flex flex-wrap gap-3">
                              {upd.images!.map((img, imgIdx) => (
                                <div key={imgIdx} className="relative w-32 h-24 rounded-lg overflow-hidden border border-gray-200">
                                  <Image src={img} alt="Update" fill className="object-cover" />
                                </div>
                              ))}
                            </div>
                          )}
                          {(upd.progress ?? 0) > 0 && (
                            <div className="mt-4 h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                              <div className="h-full bg-gradient-to-r from-[#029bba] to-[#017a8a] rounded-full"
                                style={{ width: `${upd.progress}%` }} />
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              </Section>
            )}

            {/* LOCATION */}
            <Section id="location" title="Location" icon={<MapPin className="w-5 h-5 text-[#029bba]" />}>
              <div className="flex items-start gap-3 mb-6 p-4 bg-gray-50 rounded-xl">
                <MapPin className="w-5 h-5 text-[#029bba] mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-gray-900">
                    {project.specificLocation ? `${project.specificLocation}, ` : ''}{areaDisplay}, {project.city}
                  </p>
                  {project.coordinates?.lat && project.coordinates?.lng && (
                    <p className="text-sm text-gray-500 mt-1">
                      {project.coordinates.lat}, {project.coordinates.lng}
                    </p>
                  )}
                </div>
              </div>

              {/* Nearby places — model field: nearbyFacilities */}
              {(project.nearbyFacilities?.length ?? 0) > 0 && (
                <>
                  <h4 className="font-semibold text-gray-900 mb-3">Nearby Places</h4>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {nearbyTabs.map(tab => (
                      <button
                        key={tab}
                        onClick={() => setActiveNearbyTab(tab)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-all ${
                          activeNearbyTab === tab
                            ? 'bg-[#029bba] text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {tab === 'all' ? 'All' : tab}
                      </button>
                    ))}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
                    {(project.nearbyFacilities ?? [])
                      .filter(p => activeNearbyTab === 'all' || p.category === activeNearbyTab)
                      .map((place, idx) => {
                        const PlaceIcon = NEARBY_ICONS[place.category] ?? MapPin;
                        return (
                          <div key={idx} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                            <div className="w-10 h-10 rounded-lg bg-white border border-gray-200 flex items-center justify-center">
                              <PlaceIcon className="w-5 h-5 text-[#029bba]" />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{place.name}</p>
                              {place.distance && (
                                <p className="text-xs text-gray-500">{place.distance}</p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </>
              )}

              {/* Map embed */}
              <div className="rounded-xl overflow-hidden border border-gray-200">
                <div className="aspect-video">
                  <iframe src={getMapEmbedUrl(project)} width="100%" height="100%"
                    style={{ border: 0 }} allowFullScreen loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade" title="Project Location" />
                </div>
                <a href={getMapsLink(project)} target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 p-3 bg-gray-50 hover:bg-gray-100 transition-colors text-[#029bba] font-medium">
                  <ExternalLink className="w-4 h-4" />Open in Google Maps
                </a>
              </div>

              {/* Location advantages */}
              {(project.locationAdvantages?.length ?? 0) > 0 && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <h4 className="font-semibold text-gray-900 mb-4">Location Advantages</h4>
                  <div className="space-y-4">
                    {project.locationAdvantages!.map((adv, i) => (
                      <div key={i}>
                        <h5 className="font-medium text-gray-800 mb-2">{adv.title}</h5>
                        <ul className="space-y-1">
                          {adv.points.map((pt, j) => (
                            <li key={j} className="flex items-start gap-2 text-sm text-gray-600">
                              <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />{pt}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Section>

            {/* FLOOR PLANS */}
            {(project.buildingFloorPlans?.length ?? 0) > 0 && (
              <Section title="Floor Plans" icon={<Layers className="w-5 h-5 text-[#029bba]" />}>
                <div className="flex flex-wrap gap-2 mb-6 pb-4 border-b border-gray-100">
                  {project.buildingFloorPlans!.map((fp, idx) => (
                    <button key={idx} onClick={() => setActiveFloorPlanIdx(idx)}
                      className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                        activeFloorPlanIdx === idx ? 'bg-[#029bba] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}>
                      {fp.floorName}
                    </button>
                  ))}
                </div>
                {project.buildingFloorPlans![activeFloorPlanIdx] && (() => {
                  const fp = project.buildingFloorPlans![activeFloorPlanIdx];
                  return (
                    <div className="bg-gray-50 rounded-xl p-6 text-center">
                      {fp.imageUrl ? (
                        <div className="relative w-full h-64 md:h-96 mb-4">
                          <Image src={fp.imageUrl} alt={fp.floorName} fill className="object-contain" />
                        </div>
                      ) : (
                        <div className="w-full h-48 bg-gray-200 rounded-xl flex items-center justify-center mb-4">
                          <FileText className="w-16 h-16 text-gray-300" />
                        </div>
                      )}
                      <h4 className="font-bold text-gray-900 mb-2">{fp.floorName}</h4>
                      {fp.description && <p className="text-sm text-gray-600 mb-4">{fp.description}</p>}
                      <a href={fp.pdfUrl} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-[#029bba] hover:bg-[#027a94] text-white rounded-xl font-medium transition-colors">
                        <Download className="w-5 h-5" />Download PDF
                      </a>
                    </div>
                  );
                })()}
              </Section>
            )}

            {/* PAYMENT PLAN */}
            {project.installmentPlan && project.saleMode === 'Installment' && (
              <Section title="Payment Plan" icon={<CreditCard className="w-5 h-5 text-[#029bba]" />}>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                  {project.installmentPlan.bookingAmount && (
                    <div className="bg-[#029bba] text-white rounded-xl p-4 text-center">
                      <p className="text-xs uppercase opacity-80 mb-1">Booking</p>
                      <p className="text-xl font-bold">{formatPrice(project.installmentPlan.bookingAmount)}</p>
                      {project.installmentPlan.bookingPercentage && (
                        <p className="text-xs opacity-80 mt-1">{project.installmentPlan.bookingPercentage}%</p>
                      )}
                    </div>
                  )}
                  {project.installmentPlan.downPayment && (
                    <div className="bg-gray-100 rounded-xl p-4 text-center">
                      <p className="text-xs uppercase text-gray-500 mb-1">Down Payment</p>
                      <p className="text-xl font-bold text-gray-900">{formatPrice(project.installmentPlan.downPayment)}</p>
                      {project.installmentPlan.downPaymentPercentage && (
                        <p className="text-xs text-gray-500 mt-1">{project.installmentPlan.downPaymentPercentage}%</p>
                      )}
                    </div>
                  )}
                  {project.installmentPlan.monthlyAmount && (
                    <div className="bg-gray-100 rounded-xl p-4 text-center">
                      <p className="text-xs uppercase text-gray-500 mb-1">Monthly</p>
                      <p className="text-xl font-bold text-gray-900">{formatPrice(project.installmentPlan.monthlyAmount)}</p>
                      {project.installmentPlan.monthlyDuration && (
                        <p className="text-xs text-gray-500 mt-1">× {project.installmentPlan.monthlyDuration} months</p>
                      )}
                    </div>
                  )}
                  {project.installmentPlan.quarterlyAmount && (
                    <div className="bg-gray-100 rounded-xl p-4 text-center">
                      <p className="text-xs uppercase text-gray-500 mb-1">Quarterly</p>
                      <p className="text-xl font-bold text-gray-900">{formatPrice(project.installmentPlan.quarterlyAmount)}</p>
                      {project.installmentPlan.quarterlyDuration && (
                        <p className="text-xs text-gray-500 mt-1">× {project.installmentPlan.quarterlyDuration} qtrs</p>
                      )}
                    </div>
                  )}
                  {project.installmentPlan.possessionAmount && (
                    <div className="bg-green-100 rounded-xl p-4 text-center">
                      <p className="text-xs uppercase text-green-600 mb-1">On Possession</p>
                      <p className="text-xl font-bold text-green-700">{formatPrice(project.installmentPlan.possessionAmount)}</p>
                      {project.installmentPlan.possessionPercentage && (
                        <p className="text-xs text-green-600 mt-1">{project.installmentPlan.possessionPercentage}%</p>
                      )}
                    </div>
                  )}
                </div>
                {project.installmentPlan.totalPrice && (
                  <div className="mt-6 pt-6 border-t border-gray-200 flex items-center justify-between">
                    <span className="text-gray-600 font-medium">Total Price</span>
                    <span className="text-2xl font-bold text-[#029bba]">
                      PKR {formatPrice(project.installmentPlan.totalPrice)}
                    </span>
                  </div>
                )}
                {project.projectDocuments?.paymentPlanUrl && (
                  <div className="mt-4 text-center">
                    <a href={project.projectDocuments.paymentPlanUrl} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-[#029bba] hover:underline font-medium">
                      <Download className="w-4 h-4" />Download Complete Payment Plan
                    </a>
                  </div>
                )}
              </Section>
            )}

            {/* DOCUMENTS */}
            {(project.legalDocs || project.projectDocuments) && (
              <Section title="Sale Kits & Documents" icon={<FileText className="w-5 h-5 text-[#029bba]" />}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { url: project.projectDocuments?.brochureUrl,   name: 'Project Brochure',  bg: 'bg-purple-50 border-purple-200', iconBg: 'bg-purple-100', iconColor: 'text-purple-600', label: 'PDF Download',     suffix: '-brochure.pdf' },
                    { url: project.projectDocuments?.priceListUrl,   name: 'Price List',        bg: 'bg-orange-50 border-orange-200', iconBg: 'bg-orange-100', iconColor: 'text-orange-600', label: 'PDF Download',     suffix: '-price-list.pdf' },
                    { url: project.projectDocuments?.masterPlanUrl,  name: 'Master Plan',       bg: 'bg-blue-50   border-blue-200',   iconBg: 'bg-blue-100',   iconColor: 'text-blue-600',   label: 'PDF Download',     suffix: '-master-plan.pdf' },
                    { url: project.projectDocuments?.paymentPlanUrl, name: 'Payment Plan',      bg: 'bg-slate-50  border-slate-200',  iconBg: 'bg-slate-100',  iconColor: 'text-slate-700',  label: 'PDF Download',     suffix: '-payment-plan.pdf' },
                    { url: project.legalDocs?.nocUrl,               name: 'NOC Certificate',   bg: 'bg-green-50  border-green-200',  iconBg: 'bg-green-100',  iconColor: 'text-green-600',  label: 'Verified Document', suffix: '-noc.pdf' },
                    { url: project.legalDocs?.layoutMapUrl,         name: 'Layout Map',        bg: 'bg-cyan-50   border-cyan-200',   iconBg: 'bg-cyan-100',   iconColor: 'text-cyan-600',   label: 'PDF Download',     suffix: '-layout-map.pdf' },
                  ].filter(d => d.url).map(doc => (
                    <button key={doc.name} type="button"
                      onClick={() => downloadFile(doc.url!, `${project.slug}${doc.suffix}`)}
                      className={`w-full text-left flex items-center gap-4 p-4 rounded-xl border transition-colors hover:opacity-90 ${doc.bg}`}>
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${doc.iconBg}`}>
                        <Download className={`w-6 h-6 ${doc.iconColor}`} />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{doc.name}</p>
                        <p className="text-sm text-gray-500">{doc.label}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </Section>
            )}

            {/* UNIT INVENTORY */}
            {units.length > 0 && (
              <Section id="units" title="Available Units" icon={<Building2 className="w-5 h-5 text-[#029bba]" />}
                headerExtra={
                  <div className="flex items-center gap-2">
                    {unitsLoading && <div className="w-3 h-3 border-2 border-[#029bba] border-t-transparent rounded-full animate-spin" />}
                    <span className="text-sm text-gray-500">
                      {availableUnits.length} available of {units.length}
                    </span>
                  </div>
                }>
                <div className="overflow-x-auto -mx-6">
                  <table className="w-full min-w-[700px]">
                    <thead>
                      <tr className="bg-gray-50 text-left">
                        {['Unit', 'Type', 'Floor', 'Size', 'Price', 'Status'].map(h => (
                          <th key={h} className={`px-6 py-3 text-xs font-semibold text-gray-500 uppercase ${h === 'Status' ? 'text-right' : ''}`}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {units.slice(0, 20).map(unit => (
                        <tr key={unit._id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-6 py-4 font-semibold text-gray-900">{unit.unitNumber}</td>
                          <td className="px-6 py-4 text-gray-600 capitalize">{unit.unitType?.replace(/_/g, ' ')}</td>
                          <td className="px-6 py-4 text-gray-600">{unit.floorName || `Floor ${unit.floorNumber}`}</td>
                          <td className="px-6 py-4 text-gray-600">
                            {unit.areaSqft ? `${unit.areaSqft} sqft` : unit.areaMarla ? `${unit.areaMarla} Marla` : '—'}
                          </td>
                          <td className="px-6 py-4 font-semibold text-[#029bba]">{formatPrice(unit.price)}</td>
                          <td className="px-6 py-4 text-right">
                            {unit.status === 'available' ? (
                              <button
                                onClick={() => { setSelectedUnitNum(unit.unitNumber); setLeadModalOpen(true); }}
                                className="px-4 py-1.5 bg-[#029bba] hover:bg-[#027a94] text-white text-sm font-medium rounded-lg transition-colors">
                                Book Now
                              </button>
                            ) : (
                              <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium border ${STATUS_COLORS[unit.status] || ''}`}>
                                {unit.status.charAt(0).toUpperCase() + unit.status.slice(1)}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {units.length > 20 && (
                  <div className="text-center pt-4 border-t border-gray-100 mt-4">
                    <Link href={`/projects/${project.slug}/units`}
                      className="text-[#029bba] font-medium hover:underline">
                      View all {units.length} units →
                    </Link>
                  </div>
                )}
              </Section>
            )}

            {/* DEVELOPER */}
            {project.developerProfile && (
              <Section id="developer" title="Developed By" icon={<Building className="w-5 h-5 text-[#029bba]" />}>
                <div className="flex flex-col md:flex-row gap-6">
                  <div className="flex-shrink-0">
                    {project.developerProfile.logoUrl ? (
                      <div className="w-24 h-24 rounded-xl overflow-hidden border border-gray-200 bg-white p-2 relative">
                        <Image src={project.developerProfile.logoUrl!} alt={project.developerProfile.companyName ?? ''} fill className="object-contain p-1" />
                      </div>
                    ) : (
                      <div className="w-24 h-24 rounded-xl bg-gray-100 flex items-center justify-center">
                        <Building2 className="w-10 h-10 text-gray-300" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <h4 className="text-xl font-bold text-gray-900 mb-2">
                      {project.developerProfile.companyName || 'Verified Developer'}
                    </h4>
                    {project.developerProfile.description && (
                      <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                        {project.developerProfile.description}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-4 text-sm">
                      {project.developerProfile.establishedYear && (
                        <div>
                          <span className="text-gray-500">Established: </span>
                          <span className="font-medium">{project.developerProfile.establishedYear}</span>
                        </div>
                      )}
                      {project.developerProfile.totalProjects && (
                        <div>
                          <span className="text-gray-500">Projects: </span>
                          <span className="font-medium">{project.developerProfile.totalProjects}+</span>
                        </div>
                      )}
                    </div>
                    <Link href={`/developers/${project.developer}`}
                      className="inline-flex items-center gap-2 mt-4 text-[#029bba] font-medium hover:underline">
                      View Full Profile <ChevronRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              </Section>
            )}

            {/* COMPLETED PROJECTS */}
            {(project.completedProjects?.length ?? 0) > 0 && (
              <Section title="Developer's Track Record" icon={<Award className="w-5 h-5 text-[#029bba]" />}>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {project.completedProjects!.map((cp, idx) => (
                    <div key={idx} className="bg-gray-50 rounded-xl p-4 border border-gray-200 hover:border-[#029bba]/50 transition-colors">
                      <h4 className="font-bold text-gray-900">{cp.name}</h4>
                      <p className="text-sm text-gray-500">{cp.location}</p>
                      <div className="flex items-center gap-2 mt-3">
                        <span className="px-2 py-1 bg-[#029bba]/10 text-[#029bba] text-xs rounded-lg font-medium">{cp.type}</span>
                        <span className="text-xs text-gray-400">{cp.year}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </Section>
            )}

          </div>{/* end left column */}

          {/* ── RIGHT SIDEBAR ── */}
          <div className="lg:col-span-1" ref={sidebarRef}>
            <div className="sticky top-24 space-y-6">

              {/* Contact Card */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden">
                <div className="p-6 space-y-3">
                  <button onClick={() => handleContactReveal('call')}
                    className="w-full bg-[#029bba] hover:bg-[#027a94] text-white font-bold py-4 rounded-xl transition-colors shadow-lg flex items-center justify-center gap-2">
                    <Phone className="w-5 h-5" />
                    {revealedContact === 'call'
                      ? `Tap again: ${project.developerProfile?.contactNumber}`
                      : 'Call Now'}
                  </button>

                  <div className="flex items-center gap-4">
                    <div className="flex-1 h-px bg-gray-200" />
                    <span className="text-sm text-gray-400">or</span>
                    <div className="flex-1 h-px bg-gray-200" />
                  </div>

                  <button type="button"
                    onClick={() => { setInquiryType('project_interest'); setShowInquiry(true); }}
                    className="w-full bg-gray-900 hover:bg-gray-800 text-white font-bold py-3.5 rounded-xl transition-colors">
                    Send Inquiry
                  </button>
                  <button type="button"
                    onClick={() => { setInquiryType('call_back'); setShowInquiry(true); }}
                    className="w-full bg-white border border-gray-200 hover:bg-gray-50 text-gray-800 font-semibold py-3.5 rounded-xl transition-colors">
                    Request Call
                  </button>
                  <button onClick={() => handleContactReveal('whatsapp')}
                    className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-4 rounded-xl transition-colors flex items-center justify-center gap-2">
                    <MessageCircle className="w-5 h-5" />
                    {revealedContact === 'whatsapp'
                      ? `Tap again: ${project.developerProfile?.whatsappNumber || project.developerProfile?.contactNumber}`
                      : 'Chat on WhatsApp'}
                  </button>
                  <p className="text-xs text-center text-gray-400">
                    By continuing, you agree to{' '}
                    <Link href="/terms" className="text-[#029bba] hover:underline">Terms of Use</Link>.
                  </p>
                </div>
              </div>

              {/* Quick Info */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                <h3 className="font-bold text-gray-900 mb-4">Quick Info</h3>
                <div className="space-y-3 text-sm">
                  {project.launchDate && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Launch Date</span>
                      <span className="font-medium">{formatDate(project.launchDate)}</span>
                    </div>
                  )}
                  {project.expectedCompletionDate && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Completion</span>
                      <span className="font-medium">{formatDate(project.expectedCompletionDate)}</span>
                    </div>
                  )}
                  {project.possessionStartDate && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Possession</span>
                      <span className="font-medium">{formatDate(project.possessionStartDate)}</span>
                    </div>
                  )}
                  {project.developmentProgress !== undefined && (
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-gray-500">Progress</span>
                        <span className="font-medium text-[#029bba]">{project.developmentProgress}%</span>
                      </div>
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full bg-[#029bba] rounded-full"
                          style={{ width: `${project.developmentProgress}%` }} />
                      </div>
                    </div>
                  )}
                  {project.approvalAuthority && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Approved By</span>
                      <span className="font-medium">{project.approvalAuthority}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Highrise Insight */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-[#029bba]" />
                    <h3 className="font-bold text-gray-900">Highrise Insight</h3>
                  </div>
                  <span className="text-[11px] text-gray-400 uppercase tracking-wide">By Highrise.pk</span>
                </div>
                {(project.highriseScore !== undefined || project.riskLevel || project.deliveryStatus || project.verificationLevel) ? (
                  <div className="space-y-4 text-sm">
                    {typeof project.highriseScore === 'number' && (
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-gray-500">Score</span>
                          <span className="font-bold">{project.highriseScore} / 100</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-green-500 via-yellow-400 to-red-500 rounded-full"
                            style={{ width: `${Math.min(Math.max(project.highriseScore, 0), 100)}%` }} />
                        </div>
                      </div>
                    )}
                    {project.riskLevel && (
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500">Risk Level</span>
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${
                          project.riskLevel === 'low'    ? 'bg-green-50 text-green-700 border-green-200'
                          : project.riskLevel === 'medium' ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-red-50 text-red-700 border-red-200'
                        }`}>{project.riskLevel === 'low' ? 'Low' : project.riskLevel === 'medium' ? 'Medium' : 'High'}</span>
                      </div>
                    )}
                    {project.deliveryStatus && (
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500">Delivery</span>
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                          {project.deliveryStatus === 'on_track' ? 'On Track'
                           : project.deliveryStatus === 'slightly_delayed' ? 'Slight Delay'
                           : project.deliveryStatus === 'critical_delay' ? 'Critical Delay'
                           : 'Completed'}
                        </span>
                      </div>
                    )}
                    <p className="text-xs text-gray-400 pt-2 border-t border-gray-100">
                      Updated: {project.updatedAt ? formatDate(project.updatedAt) : '—'}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">
                    Verification in progress. Highrise Insight will appear once complete.
                  </p>
                )}
              </div>

              {/* Safety note */}
              <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
                <div className="flex gap-3">
                  <Shield className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-amber-800">
                    <p className="font-medium mb-1">Safety First</p>
                    <p className="text-amber-700">
                      Always visit the project site before making any payment. Verify all documents independently.
                    </p>
                  </div>
                </div>
              </div>

            </div>
          </div>{/* end sidebar */}

        </div>
      </div>

      {/* ═══════════ MODALS ═══════════ */}
      <ImageGalleryModal
        isOpen={galleryOpen && allImages.length > 0}
        onClose={() => setGalleryOpen(false)}
        images={allImages}
        initialIndex={galleryIndex}
        projectName={project.projectName}
      />
      <VideoModal
        isOpen={videoOpen}
        onClose={() => setVideoOpen(false)}
        videoUrl={activeVideoUrl}
      />
      <UniversalInquiryModal
        isOpen={showInquiry}
        onClose={() => setShowInquiry(false)}
        entityType="project"
        entityId={project._id}
        entityTitle={project.projectName}
        entityPrice={project.minPrice}
        entityLocation={`${areaDisplay}, ${project.city}`}
        entityImage={primaryImage}
        developerId={project.developer}
        developerName={project.developerProfile?.companyName}
        leadType={inquiryType}
        buttonText={
          inquiryType === 'site_visit' ? 'Schedule Visit'
          : inquiryType === 'call_back' ? 'Request Callback'
          : 'Send Inquiry'
        }
      />
      <LeadFormModal
        isOpen={leadModalOpen}
        onClose={() => { setLeadModalOpen(false); setSelectedUnitNum(null); }}
        unitNumber={selectedUnitNum}
        projectId={project._id}
        projectName={project.projectName}
      />

      {/* Login Prompt Modal */}
      {showLoginPrompt && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => setShowLoginPrompt(false)}>
          <div className="relative bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden"
            onClick={e => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-[#029bba] to-[#017a8a] px-6 py-8 text-center relative overflow-hidden">
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full" />
              <div className="absolute -bottom-10 -left-10 w-24 h-24 bg-white/10 rounded-full" />
              <div className="relative">
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  {loginPromptType === 'call' ? <Phone className="w-8 h-8 text-white" /> : <MessageCircle className="w-8 h-8 text-white" />}
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">Login Required</h3>
                <p className="text-white/80 text-sm">Please login to view contact details</p>
              </div>
            </div>
            <div className="px-6 py-6">
              <div className="bg-gray-50 rounded-2xl p-4 mb-6 text-center">
                <p className="text-sm text-gray-500 mb-1">Developer Contact</p>
                <p className="text-2xl font-bold text-gray-400 tracking-wider">
                  {maskPhone(project.developerProfile?.contactNumber)}
                </p>
                <p className="text-xs text-gray-400 mt-2 flex items-center justify-center gap-1">
                  <Lock className="w-3 h-3" />Login to reveal full number
                </p>
              </div>
              <div className="space-y-3 mb-6">
                {[
                  { icon: 'green',  text: 'Direct contact with verified developers' },
                  { icon: 'blue',   text: 'Save favourites & track inquiries' },
                  { icon: 'purple', text: 'Get personalised property alerts' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm">
                    <div className={`w-8 h-8 rounded-full bg-${item.icon}-100 flex items-center justify-center flex-shrink-0`}>
                      <CheckCircle className={`w-4 h-4 text-${item.icon}-600`} />
                    </div>
                    <span className="text-gray-600">{item.text}</span>
                  </div>
                ))}
              </div>
              <div className="space-y-3">
                <Link href={`/login?redirect=/projects/${project.slug}`}
                  className="w-full bg-gradient-to-r from-[#029bba] to-[#017a8a] hover:from-[#02a8c9] hover:to-[#018a9a] text-white font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg">
                  Login to Continue <ArrowRight className="w-4 h-4" />
                </Link>
                <Link href={`/register?redirect=/projects/${project.slug}`}
                  className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 rounded-xl transition-all flex items-center justify-center">
                  Create Free Account
                </Link>
              </div>
              <div className="mt-6 pt-6 border-t border-gray-100 text-center">
                <p className="text-sm text-gray-500 mb-3">Don&apos;t want to login?</p>
                <button
                  onClick={() => { setShowLoginPrompt(false); setInquiryType('call_back'); setShowInquiry(true); }}
                  className="text-[#029bba] font-semibold text-sm hover:underline flex items-center justify-center gap-2 mx-auto">
                  <PhoneCall className="w-4 h-4" />Request a Callback Instead
                </button>
              </div>
            </div>
            <button onClick={() => setShowLoginPrompt(false)}
              className="absolute top-4 right-4 p-2 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

// ============================================
// ISR DATA FETCHING
// ============================================

export const getStaticPaths: GetStaticPaths = async () => {
  try {
    await dbConnect();
    const projects = await Project.find({ isVerified: true, isDeleted: { $ne: true } })
      .select('slug')
      .limit(100)
      .lean();

    const paths = projects
      .filter(p => p.slug)
      .map(p => ({ params: { slug: p.slug as string } }));

    return { paths, fallback: 'blocking' };
  } catch {
    return { paths: [], fallback: 'blocking' };
  }
};

export const getStaticProps: GetStaticProps<PageProps> = async ({ params }) => {
  const slug = params?.slug as string;
  if (!slug) return { notFound: true };

  try {
    await dbConnect();

    // Build query — support both slug and 24-char ObjectId
    const isObjectId = /^[a-f\d]{24}$/i.test(slug);
    const query = isObjectId
      ? { $or: [{ slug }, { _id: slug }], isDeleted: { $ne: true } }
      : { slug, isDeleted: { $ne: true } };

    // No populate — developerProfile snapshot has all we need
    // (populating wrong field name was causing serialization crashes)
    const rawDoc = await Project.findOne(query)
      .lean() as Record<string, unknown> | null;

    if (!rawDoc) return { notFound: true };

    // Visibility gate — only show verified projects publicly
    if (!rawDoc.isVerified && rawDoc.status !== 'verified') {
      return { notFound: true };
    }

    // Serialize (remove mongoose internals, convert ObjectId → string)
    const project = JSON.parse(JSON.stringify(rawDoc)) as ProjectData;

    // Fetch first page of units for SSR
    const projectId = rawDoc._id as import('mongoose').Types.ObjectId;
    const rawUnits = await Unit.find({ project: projectId, status: { $ne: 'cancelled' } })
      .select('unitNumber floorNumber floorName unitType price areaSqft areaMarla status bedrooms listingType facing')
      .sort({ floorNumber: 1, unitNumber: 1 })
      .limit(50)
      .lean();

    const initialUnits = JSON.parse(JSON.stringify(rawUnits)) as UnitRow[];

    return {
      props: { project, initialUnits },
      revalidate: 30,
    };
  } catch {
    return { notFound: true };
  }
};