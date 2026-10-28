// pages/admin/societies/[id]/edit.tsx
import React, { useState, useCallback, useEffect, useRef } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import {
  Shield, ArrowLeft, Save, Loader2, X, CheckCircle, XCircle,
  AlertTriangle, Info, Upload, Plus, Trash2, MapPin, Building2,
  Award, Globe, FileText, Image as ImageIcon, Eye,
  EyeOff, BadgeCheck, Star, ChevronDown, ChevronUp, Banknote,
  Activity, Lightbulb, ExternalLink, RefreshCw, Edit,
  Download,
} from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';

// ─── Types ────────────────────────────────────────────────────────────────────

type NOCStatus = 'approved' | 'pending' | 'under_review' | 'illegal' | 'disputed' | 'cancelled' | 'expired';
type Authority = 'LDA' | 'CDA' | 'RDA' | 'KDA' | 'FDA' | 'MDA' | 'GDA' | 'DHA' | 'PHATA' | 'NHA' | 'NADRA' | 'Other';
type Category = 'housing_scheme' | 'gated_community' | 'apartment_complex' | 'commercial_zone' | 'mixed_use' | 'industrial_zone' | 'township';
type LitigationStatus = 'none' | 'active' | 'resolved';
type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';
type DocumentType = 'noc' | 'map' | 'master_plan' | 'court_order' | 'approval_letter' | 'other';

interface RiskAlert {
  _id: string;
  severity: string;
  title: string;
  message: string;
  issuedBy?: string;
  referenceNo?: string;
  date: string;
  isResolved: boolean;
  resolvedAt?: string;
  resolvedNote?: string;
}

interface SocietyDocument {
  _id: string;
  title: string;
  url: string;
  type: string;
  uploadedAt: string;
}

interface BlockRate {
  _id: string;
  blockName: string;
  plotSize: string;
  minPrice: number;
  maxPrice: number;
  pricePerMarla?: number;
  lastUpdated: string;
}

interface SocietyDetail {
  _id: string;
  name: string;
  slug: string;
  alternateNames: string[];
  category: string;
  description?: string;
  city: string;
  areaName: string;
  fullAddress?: string;
  coordinates?: { type: 'Point'; coordinates: [number, number] };
  nocStatus: string;
  nocNumber?: string;
  nocDate?: string;
  nocExpiryDate?: string;
  approvalAuthority: string;
  developmentAuthority?: string;
  registrationNo?: string;
  litigationStatus: string;
  litigationNote?: string;
  overallRiskLevel: string;
  riskAlerts: RiskAlert[];
  scores: {
    legal: number;
    growth: number;
    possession: number;
    infrastructure: number;
    livability: number;
    overall: number;
  };
  infrastructureDetails: {
    electricity: number;
    gas: number;
    water: number;
    sewerage: number;
    internet: number;
    roads: number;
  };
  livabilityDetails: {
    schools: number;
    hospitals: number;
    markets: number;
    transport: number;
    security: number;
    parks: number;
  };
  blockRates: BlockRate[];
  priceChangeYoY?: number;
  rentalYield?: number;
  featuredImage?: string;
  images: string[];
  documents: SocietyDocument[];
  developerName?: string;
  developerWebsite?: string;
  totalPlots?: number;
  totalPhases?: number;
  launchYear?: number;
  expectedCompletionYear?: number;
  possessionPercentage?: number;
  isVerifiedByHighrise: boolean;
  isPublished: boolean;
  isFeatured: boolean;
  viewCount: number;
  searchCount: number;
  lastVerifiedAt?: string;
  seoTitle?: string;
  seoDescription?: string;
  createdAt: string;
  updatedAt: string;
}

interface FormState {
  name: string;
  alternateNames: string[];
  category: Category;
  description: string;
  city: string;
  areaName: string;
  fullAddress: string;
  longitude: string;
  latitude: string;
  nocStatus: NOCStatus;
  nocNumber: string;
  nocDate: string;
  nocExpiryDate: string;
  approvalAuthority: Authority;
  developmentAuthority: string;
  registrationNo: string;
  litigationStatus: LitigationStatus;
  litigationNote: string;
  developerName: string;
  developerWebsite: string;
  totalPlots: string;
  totalPhases: string;
  launchYear: string;
  expectedCompletionYear: string;
  possessionPercentage: string;
  priceChangeYoY: string;
  rentalYield: string;
  growthScore: string;
  possessionScore: string;
  infra_electricity: string;
  infra_gas: string;
  infra_water: string;
  infra_sewerage: string;
  infra_internet: string;
  infra_roads: string;
  liva_schools: string;
  liva_hospitals: string;
  liva_markets: string;
  liva_transport: string;
  liva_security: string;
  liva_parks: string;
  featuredImage: string;
  images: string[];
  isVerifiedByHighrise: boolean;
  isPublished: boolean;
  isFeatured: boolean;
  seoTitle: string;
  seoDescription: string;
}

type BannerType = 'success' | 'error' | 'info';

interface Banner {
  type: BannerType;
  message: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CITIES = [
  'Lahore', 'Islamabad', 'Karachi', 'Rawalpindi', 'Faisalabad',
  'Multan', 'Peshawar', 'Quetta', 'Gujranwala', 'Sialkot',
  'Bahawalpur', 'Sargodha', 'Sukkur', 'Larkana', 'Sheikhupura',
  'Mardan', 'Mirpur', 'Hyderabad', 'Gwadar', 'Other',
];

const AUTHORITIES: { id: Authority; label: string; description: string }[] = [
  { id: 'LDA', label: 'LDA', description: 'Lahore Development Authority' },
  { id: 'CDA', label: 'CDA', description: 'Capital Development Authority (Islamabad)' },
  { id: 'RDA', label: 'RDA', description: 'Rawalpindi Development Authority' },
  { id: 'KDA', label: 'KDA', description: 'Karachi Development Authority' },
  { id: 'FDA', label: 'FDA', description: 'Faisalabad Development Authority' },
  { id: 'MDA', label: 'MDA', description: 'Multan Development Authority' },
  { id: 'GDA', label: 'GDA', description: 'Gwadar Development Authority' },
  { id: 'DHA', label: 'DHA', description: 'Defence Housing Authority' },
  { id: 'PHATA', label: 'PHATA', description: 'Punjab Housing & Town Planning Agency' },
  { id: 'NHA', label: 'NHA', description: 'National Highway Authority' },
  { id: 'NADRA', label: 'NADRA', description: 'National Database & Registration Authority' },
  { id: 'Other', label: 'Other', description: 'Specify in dev authority field' },
];

const CATEGORIES: { id: Category; label: string; description: string }[] = [
  { id: 'housing_scheme', label: 'Housing Scheme', description: 'Standard residential scheme' },
  { id: 'gated_community', label: 'Gated Community', description: 'Premium gated society' },
  { id: 'apartment_complex', label: 'Apartment Complex', description: 'High-rise apartments' },
  { id: 'commercial_zone', label: 'Commercial Zone', description: 'Business district' },
  { id: 'mixed_use', label: 'Mixed Use', description: 'Residential + commercial' },
  { id: 'industrial_zone', label: 'Industrial Zone', description: 'Factory/warehouse area' },
  { id: 'township', label: 'Township', description: 'Self-contained mega project' },
];

const DOC_TYPES: { id: DocumentType; label: string }[] = [
  { id: 'noc', label: 'NOC Certificate' },
  { id: 'map', label: 'Society Map' },
  { id: 'master_plan', label: 'Master Plan' },
  { id: 'court_order', label: 'Court Order' },
  { id: 'approval_letter', label: 'Approval Letter' },
  { id: 'other', label: 'Other' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateStr?: string): string {
  if (!dateStr) return 'N/A';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return 'N/A';
  }
}

function formatPKR(amount: number): string {
  if (amount >= 10_000_000) return `Rs ${(amount / 10_000_000).toFixed(2)} Cr`;
  if (amount >= 100_000) return `Rs ${(amount / 100_000).toFixed(2)} Lac`;
  return `Rs ${amount.toLocaleString()}`;
}

function societyToFormState(s: SocietyDetail): FormState {
  return {
    name: s.name,
    alternateNames: s.alternateNames || [],
    category: (s.category as Category) || 'housing_scheme',
    description: s.description || '',
    city: s.city,
    areaName: s.areaName,
    fullAddress: s.fullAddress || '',
    longitude: s.coordinates?.coordinates?.[0] !== undefined ? String(s.coordinates.coordinates[0]) : '',
    latitude: s.coordinates?.coordinates?.[1] !== undefined ? String(s.coordinates.coordinates[1]) : '',
    nocStatus: (s.nocStatus as NOCStatus) || 'pending',
    nocNumber: s.nocNumber || '',
    nocDate: s.nocDate ? s.nocDate.split('T')[0] : '',
    nocExpiryDate: s.nocExpiryDate ? s.nocExpiryDate.split('T')[0] : '',
    approvalAuthority: (s.approvalAuthority as Authority) || 'LDA',
    developmentAuthority: s.developmentAuthority || '',
    registrationNo: s.registrationNo || '',
    litigationStatus: (s.litigationStatus as LitigationStatus) || 'none',
    litigationNote: s.litigationNote || '',
    developerName: s.developerName || '',
    developerWebsite: s.developerWebsite || '',
    totalPlots: s.totalPlots !== undefined ? String(s.totalPlots) : '',
    totalPhases: s.totalPhases !== undefined ? String(s.totalPhases) : '',
    launchYear: s.launchYear !== undefined ? String(s.launchYear) : '',
    expectedCompletionYear: s.expectedCompletionYear !== undefined ? String(s.expectedCompletionYear) : '',
    possessionPercentage: s.possessionPercentage !== undefined ? String(s.possessionPercentage) : '',
    priceChangeYoY: s.priceChangeYoY !== undefined ? String(s.priceChangeYoY) : '',
    rentalYield: s.rentalYield !== undefined ? String(s.rentalYield) : '',
    growthScore: String(s.scores?.growth ?? 50),
    possessionScore: String(s.scores?.possession ?? 0),
    infra_electricity: String(s.infrastructureDetails?.electricity ?? 0),
    infra_gas: String(s.infrastructureDetails?.gas ?? 0),
    infra_water: String(s.infrastructureDetails?.water ?? 0),
    infra_sewerage: String(s.infrastructureDetails?.sewerage ?? 0),
    infra_internet: String(s.infrastructureDetails?.internet ?? 0),
    infra_roads: String(s.infrastructureDetails?.roads ?? 0),
    liva_schools: String(s.livabilityDetails?.schools ?? 0),
    liva_hospitals: String(s.livabilityDetails?.hospitals ?? 0),
    liva_markets: String(s.livabilityDetails?.markets ?? 0),
    liva_transport: String(s.livabilityDetails?.transport ?? 0),
    liva_security: String(s.livabilityDetails?.security ?? 0),
    liva_parks: String(s.livabilityDetails?.parks ?? 0),
    featuredImage: s.featuredImage || '',
    images: s.images || [],
    isVerifiedByHighrise: s.isVerifiedByHighrise,
    isPublished: s.isPublished,
    isFeatured: s.isFeatured,
    seoTitle: s.seoTitle || '',
    seoDescription: s.seoDescription || '',
  };
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function EditSocietyPage(): React.ReactElement {
  const router = useRouter();
  const { id } = router.query;
  const { data: session, status } = useSession();

  // Data
  const [society, setSociety] = useState<SocietyDetail | null>(null);
  const [form, setForm] = useState<FormState | null>(null);

  // UI
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [banner, setBanner] = useState<Banner | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [altNameInput, setAltNameInput] = useState('');
  const [uploadingFeature, setUploadingFeature] = useState(false);
  const [uploadingGallery, setUploadingGallery] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [deleteModal, setDeleteModal] = useState<{ mode: 'soft' | 'hard' } | null>(null);

  // Sub-section state
  const [showAddAlert, setShowAddAlert] = useState(false);
  const [showAddDocument, setShowAddDocument] = useState(false);
  const [showAddBlockRate, setShowAddBlockRate] = useState(false);
  const [resolveAlertId, setResolveAlertId] = useState<string | null>(null);

  // Generic confirm modal (replaces window.confirm — Rule 10)
  const [confirmModal, setConfirmModal] = useState<{
    title: string;
    message: string;
    confirmLabel: string;
    onConfirm: () => Promise<void>;
  } | null>(null);

  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({
    core: false,
    location: true,
    legal: false,
    developer: true,
    stats: true,
    scores: true,
    media: true,
    platform: false,
    seo: true,
    alerts: false,
    documents: true,
    pricing: true,
  });

  const featuredFileRef = useRef<HTMLInputElement>(null);
  const galleryFileRef = useRef<HTMLInputElement>(null);
  const docFileRef = useRef<HTMLInputElement>(null);

  // New alert form state
  const [newAlert, setNewAlert] = useState({
    severity: 'medium' as AlertSeverity,
    title: '',
    message: '',
    issuedBy: '',
    referenceNo: '',
  });

  // Resolve alert form state
  const [resolveNote, setResolveNote] = useState('');

  // New document form state
  const [newDoc, setNewDoc] = useState({
    title: '',
    type: 'noc' as DocumentType,
    url: '',
  });
  const [uploadingDoc, setUploadingDoc] = useState(false);

  // New block rate form state
  const [newBlockRate, setNewBlockRate] = useState({
    blockName: '',
    plotSize: '',
    minPrice: '',
    maxPrice: '',
    pricePerMarla: '',
  });

  // ─── Auth Guard ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (status === 'loading') return;
    if (!session?.user) {
      router.replace('/login?redirect=/admin/societies');
      return;
    }
    const userRole = (session.user as { role?: string }).role;
    if (userRole !== 'admin') {
      router.replace('/');
    }
  }, [session, status, router]);

  // Auto-clear banner
  useEffect(() => {
    if (!banner) return;
    const timer = setTimeout(() => setBanner(null), 5000);
    return () => clearTimeout(timer);
  }, [banner]);

  // ─── Fetch Society ───────────────────────────────────────────────────────

  const fetchSociety = useCallback(async () => {
    if (!id || typeof id !== 'string') return;

    setLoading(true);
    try {
      const res = await fetch(`/api/admin/societies/${id}`, { cache: 'no-store' });
      const data = await res.json();

      if (!res.ok || !data.success) {
        if (res.status === 404) {
          setBanner({ type: 'error', message: 'Society not found' });
        } else {
          setBanner({ type: 'error', message: data?.error || 'Failed to load society' });
        }
        setSociety(null);
        return;
      }

      setSociety(data.data.society);
      setForm(societyToFormState(data.data.society));
    } catch {
      setBanner({ type: 'error', message: 'Network error. Please try again.' });
      setSociety(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    const userRole = (session?.user as { role?: string })?.role;
    if (session?.user && userRole === 'admin' && id) {
      fetchSociety();
    }
  }, [session, id, fetchSociety]);

  // ─── Field Updaters ──────────────────────────────────────────────────────

  const updateField = <K extends keyof FormState>(field: K, value: FormState[K]) => {
    if (!form) return;
    setForm({ ...form, [field]: value });
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[field as string];
      return next;
    });
  };

  const toggleSection = (section: string) => {
    setCollapsedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const handleAddAltName = () => {
    if (!form) return;
    const name = altNameInput.trim();
    if (!name) return;
    if (form.alternateNames.includes(name)) {
      setBanner({ type: 'error', message: 'Alternate name already added' });
      return;
    }
    if (form.alternateNames.length >= 10) {
      setBanner({ type: 'error', message: 'Maximum 10 alternate names allowed' });
      return;
    }
    updateField('alternateNames', [...form.alternateNames, name]);
    setAltNameInput('');
  };

  const handleRemoveAltName = (idx: number) => {
    if (!form) return;
    updateField('alternateNames', form.alternateNames.filter((_, i) => i !== idx));
  };

  // ─── File Uploads ────────────────────────────────────────────────────────

  const uploadFile = async (file: File): Promise<string | null> => {
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setBanner({ type: 'error', message: data?.error || 'Upload failed' });
        return null;
      }
      return data.data?.url || data.url || data.secure_url || null;
    } catch {
      setBanner({ type: 'error', message: 'Upload failed due to network error' });
      return null;
    }
  };

  const handleFeaturedUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setBanner({ type: 'error', message: 'Image size must be under 5MB' });
      return;
    }
    if (!file.type.startsWith('image/')) {
      setBanner({ type: 'error', message: 'Only image files allowed' });
      return;
    }
    setUploadingFeature(true);
    const url = await uploadFile(file);
    setUploadingFeature(false);
    if (url) {
      updateField('featuredImage', url);
      setBanner({ type: 'success', message: 'Featured image uploaded' });
    }
    if (featuredFileRef.current) featuredFileRef.current.value = '';
  };

  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!form) return;
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    if (form.images.length + files.length > 20) {
      setBanner({ type: 'error', message: 'Maximum 20 gallery images allowed' });
      return;
    }
    setUploadingGallery(true);
    const uploadedUrls: string[] = [];
    for (const file of files) {
      if (file.size > 5 * 1024 * 1024) continue;
      if (!file.type.startsWith('image/')) continue;
      const url = await uploadFile(file);
      if (url) uploadedUrls.push(url);
    }
    setUploadingGallery(false);
    if (uploadedUrls.length > 0) {
      updateField('images', [...form.images, ...uploadedUrls]);
      setBanner({ type: 'success', message: `${uploadedUrls.length} image(s) uploaded` });
    }
    if (galleryFileRef.current) galleryFileRef.current.value = '';
  };

  const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setBanner({ type: 'error', message: 'Document size must be under 10MB' });
      return;
    }
    setUploadingDoc(true);
    const url = await uploadFile(file);
    setUploadingDoc(false);
    if (url) {
      setNewDoc((prev) => ({ ...prev, url }));
      setBanner({ type: 'success', message: 'Document uploaded — fill title and save' });
    }
    if (docFileRef.current) docFileRef.current.value = '';
  };

  // ─── Sub-operations ──────────────────────────────────────────────────────

  const performPatch = async (patchBody: Record<string, unknown>, successMsg: string): Promise<boolean> => {
    if (!id || typeof id !== 'string') return false;
    try {
      const res = await fetch(`/api/admin/societies/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patchBody),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        if (data.fieldErrors) {
          setFieldErrors(data.fieldErrors);
        }
        setBanner({ type: 'error', message: data?.error || 'Update failed' });
        return false;
      }
      setBanner({ type: 'success', message: successMsg });
      return true;
    } catch {
      setBanner({ type: 'error', message: 'Network error. Please try again.' });
      return false;
    }
  };

  const handleAddAlert = async () => {
    if (!newAlert.title.trim() || newAlert.title.trim().length < 2) {
      setBanner({ type: 'error', message: 'Alert title is required (min 2 chars)' });
      return;
    }
    if (!newAlert.message.trim() || newAlert.message.trim().length < 5) {
      setBanner({ type: 'error', message: 'Alert message is required (min 5 chars)' });
      return;
    }
    setActionLoading('addAlert');
    const success = await performPatch({
      addRiskAlert: {
        severity: newAlert.severity,
        title: newAlert.title.trim(),
        message: newAlert.message.trim(),
        issuedBy: newAlert.issuedBy.trim() || undefined,
        referenceNo: newAlert.referenceNo.trim() || undefined,
      },
    }, 'Risk alert added');
    setActionLoading(null);
    if (success) {
      setShowAddAlert(false);
      setNewAlert({ severity: 'medium', title: '', message: '', issuedBy: '', referenceNo: '' });
      fetchSociety();
    }
  };

  const handleResolveAlert = async (alertId: string) => {
    setActionLoading(`resolve-${alertId}`);
    const success = await performPatch({
      resolveRiskAlert: {
        alertId,
        resolvedNote: resolveNote.trim() || undefined,
      },
    }, 'Alert marked as resolved');
    setActionLoading(null);
    if (success) {
      setResolveAlertId(null);
      setResolveNote('');
      fetchSociety();
    }
  };

  const handleRemoveAlert = (alertId: string) => {
    setConfirmModal({
      title: 'Remove Alert',
      message: 'Remove this alert permanently? This action cannot be undone.',
      confirmLabel: 'Remove Alert',
      onConfirm: async () => {
        setActionLoading(`remove-alert-${alertId}`);
        const success = await performPatch(
          { removeRiskAlert: alertId },
          'Alert removed'
        );
        setActionLoading(null);
        if (success) fetchSociety();
      },
    });
  };

  const handleAddDocument = async () => {
    if (!newDoc.title.trim() || newDoc.title.trim().length < 2) {
      setBanner({ type: 'error', message: 'Document title is required (min 2 chars)' });
      return;
    }
    if (!newDoc.url.trim()) {
      setBanner({ type: 'error', message: 'Upload a document file first' });
      return;
    }
    setActionLoading('addDoc');
    const success = await performPatch({
      addDocument: {
        title: newDoc.title.trim(),
        url: newDoc.url,
        type: newDoc.type,
      },
    }, 'Document added');
    setActionLoading(null);
    if (success) {
      setShowAddDocument(false);
      setNewDoc({ title: '', type: 'noc', url: '' });
      fetchSociety();
    }
  };

  const handleRemoveDocument = (docId: string) => {
    setConfirmModal({
      title: 'Remove Document',
      message: 'Remove this document? The file will be unlinked from this society.',
      confirmLabel: 'Remove Document',
      onConfirm: async () => {
        setActionLoading(`remove-doc-${docId}`);
        const success = await performPatch(
          { removeDocument: docId },
          'Document removed'
        );
        setActionLoading(null);
        if (success) fetchSociety();
      },
    });
  };

  const handleAddBlockRate = async () => {
    if (!newBlockRate.blockName.trim()) {
      setBanner({ type: 'error', message: 'Block name is required' });
      return;
    }
    if (!newBlockRate.plotSize.trim()) {
      setBanner({ type: 'error', message: 'Plot size is required' });
      return;
    }
    const minPrice = parseFloat(newBlockRate.minPrice);
    const maxPrice = parseFloat(newBlockRate.maxPrice);
    if (isNaN(minPrice) || minPrice < 0) {
      setBanner({ type: 'error', message: 'Valid min price required' });
      return;
    }
    if (isNaN(maxPrice) || maxPrice < minPrice) {
      setBanner({ type: 'error', message: 'Max price must be ≥ min price' });
      return;
    }
    const pricePerMarla = newBlockRate.pricePerMarla ? parseFloat(newBlockRate.pricePerMarla) : undefined;

    setActionLoading('addBlockRate');
    const success = await performPatch({
      addBlockRate: {
        blockName: newBlockRate.blockName.trim(),
        plotSize: newBlockRate.plotSize.trim(),
        minPrice,
        maxPrice,
        ...(pricePerMarla !== undefined && !isNaN(pricePerMarla) && { pricePerMarla }),
      },
    }, 'Block rate added');
    setActionLoading(null);
    if (success) {
      setShowAddBlockRate(false);
      setNewBlockRate({ blockName: '', plotSize: '', minPrice: '', maxPrice: '', pricePerMarla: '' });
      fetchSociety();
    }
  };

  const handleRemoveBlockRate = (rateId: string) => {
    setConfirmModal({
      title: 'Remove Block Rate',
      message: 'Remove this pricing entry? It will disappear from the public report.',
      confirmLabel: 'Remove Rate',
      onConfirm: async () => {
        setActionLoading(`remove-rate-${rateId}`);
        const success = await performPatch(
          { removeBlockRate: rateId },
          'Block rate removed'
        );
        setActionLoading(null);
        if (success) fetchSociety();
      },
    });
  };

  // ─── Main Form Submit ────────────────────────────────────────────────────

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!form || !id || typeof id !== 'string') return;
      setBanner(null);
      setFieldErrors({});

      if (!form.name.trim() || form.name.trim().length < 2) {
        setBanner({ type: 'error', message: 'Society name is required (min 2 characters)' });
        return;
      }
      if (!form.city.trim()) {
        setBanner({ type: 'error', message: 'City is required' });
        return;
      }
      if (!form.areaName.trim()) {
        setBanner({ type: 'error', message: 'Area name is required' });
        return;
      }

      setSubmitting(true);

      // Build clean payload — only send what changed semantically
      const payload: Record<string, unknown> = {
        name: form.name.trim(),
        category: form.category,
        city: form.city.trim(),
        areaName: form.areaName.trim(),
        nocStatus: form.nocStatus,
        approvalAuthority: form.approvalAuthority,
        litigationStatus: form.litigationStatus,
        isVerifiedByHighrise: form.isVerifiedByHighrise,
        isPublished: form.isPublished,
        isFeatured: form.isFeatured,
        alternateNames: form.alternateNames,
      };

      if (form.description.trim()) payload.description = form.description.trim();
      if (form.fullAddress.trim()) payload.fullAddress = form.fullAddress.trim();

      const lng = parseFloat(form.longitude);
      const lat = parseFloat(form.latitude);
      if (!isNaN(lng) && !isNaN(lat)) {
        payload.coordinates = { longitude: lng, latitude: lat };
      }

      if (form.nocNumber.trim()) payload.nocNumber = form.nocNumber.trim();
      if (form.nocDate) payload.nocDate = new Date(form.nocDate).toISOString();
      if (form.nocExpiryDate) payload.nocExpiryDate = new Date(form.nocExpiryDate).toISOString();
      if (form.developmentAuthority.trim()) payload.developmentAuthority = form.developmentAuthority.trim();
      if (form.registrationNo.trim()) payload.registrationNo = form.registrationNo.trim();
      if (form.litigationNote.trim()) payload.litigationNote = form.litigationNote.trim();

      if (form.developerName.trim()) payload.developerName = form.developerName.trim();
      if (form.developerWebsite.trim()) payload.developerWebsite = form.developerWebsite.trim();

      const parseIntSafe = (v: string): number | undefined => {
        const n = parseInt(v, 10);
        return isNaN(n) ? undefined : n;
      };
      const parseFloatSafe = (v: string): number | undefined => {
        const n = parseFloat(v);
        return isNaN(n) ? undefined : n;
      };

      const totalPlots = parseIntSafe(form.totalPlots);
      if (totalPlots !== undefined) payload.totalPlots = totalPlots;
      const totalPhases = parseIntSafe(form.totalPhases);
      if (totalPhases !== undefined) payload.totalPhases = totalPhases;
      const launchYear = parseIntSafe(form.launchYear);
      if (launchYear !== undefined) payload.launchYear = launchYear;
      const expectedCompletionYear = parseIntSafe(form.expectedCompletionYear);
      if (expectedCompletionYear !== undefined) payload.expectedCompletionYear = expectedCompletionYear;
      const possessionPercentage = parseFloatSafe(form.possessionPercentage);
      if (possessionPercentage !== undefined) payload.possessionPercentage = possessionPercentage;
      const priceYoY = parseFloatSafe(form.priceChangeYoY);
      if (priceYoY !== undefined) payload.priceChangeYoY = priceYoY;
      const rentalYield = parseFloatSafe(form.rentalYield);
      if (rentalYield !== undefined) payload.rentalYield = rentalYield;

      const growth = parseIntSafe(form.growthScore);
      const possession = parseIntSafe(form.possessionScore);
      if (growth !== undefined || possession !== undefined) {
        payload.scores = {};
        if (growth !== undefined) (payload.scores as Record<string, number>).growth = growth;
        if (possession !== undefined) (payload.scores as Record<string, number>).possession = possession;
      }

      const infrastructureDetails: Record<string, number> = {};
      ['electricity', 'gas', 'water', 'sewerage', 'internet', 'roads'].forEach((key) => {
        const v = parseIntSafe(form[`infra_${key}` as keyof FormState] as string);
        if (v !== undefined) infrastructureDetails[key] = v;
      });
      if (Object.keys(infrastructureDetails).length > 0) {
        payload.infrastructureDetails = infrastructureDetails;
      }

      const livabilityDetails: Record<string, number> = {};
      ['schools', 'hospitals', 'markets', 'transport', 'security', 'parks'].forEach((key) => {
        const v = parseIntSafe(form[`liva_${key}` as keyof FormState] as string);
        if (v !== undefined) livabilityDetails[key] = v;
      });
      if (Object.keys(livabilityDetails).length > 0) {
        payload.livabilityDetails = livabilityDetails;
      }

      if (form.featuredImage) payload.featuredImage = form.featuredImage;
      payload.images = form.images;

      if (form.seoTitle.trim()) payload.seoTitle = form.seoTitle.trim();
      if (form.seoDescription.trim()) payload.seoDescription = form.seoDescription.trim();

      try {
        const res = await fetch(`/api/admin/societies/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json();

        if (!res.ok || !data.success) {
          if (data.fieldErrors) {
            setFieldErrors(data.fieldErrors);
            setBanner({ type: 'error', message: data.error || 'Please fix validation errors below' });
          } else {
            setBanner({ type: 'error', message: data.error || 'Failed to update society' });
          }
          return;
        }

        setBanner({ type: 'success', message: 'Society updated successfully' });
        fetchSociety(); // refresh data
      } catch {
        setBanner({ type: 'error', message: 'Network error. Please try again.' });
      } finally {
        setSubmitting(false);
      }
    },
    [form, id, fetchSociety]
  );

  // ─── Delete ──────────────────────────────────────────────────────────────

  const handleDelete = async () => {
    if (!deleteModal || !id || typeof id !== 'string') return;
    setActionLoading('delete');
    try {
      const url = deleteModal.mode === 'hard'
        ? `/api/admin/societies/${id}?hard=true`
        : `/api/admin/societies/${id}`;

      const res = await fetch(url, { method: 'DELETE' });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setBanner({ type: 'error', message: data?.error || 'Delete failed' });
        setActionLoading(null);
        return;
      }

      // Redirect on success
      router.push('/admin/societies');
    } catch {
      setBanner({ type: 'error', message: 'Network error during delete' });
      setActionLoading(null);
    }
  };

  // ─── Auth Loading ────────────────────────────────────────────────────────

  if (status === 'loading' || !session?.user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-[#029bba] animate-spin" />
      </div>
    );
  }

  const userRole = (session.user as { role?: string }).role;
  if (userRole !== 'admin') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-md p-8 max-w-md text-center">
          <Shield className="w-16 h-16 text-[#ef4444] mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600">Admin privileges required.</p>
        </div>
      </div>
    );
  }

  // ─── Loading State ───────────────────────────────────────────────────────

  if (loading) {
    return (
      <AdminLayout>
        <div className="p-6">
          <div className="flex items-center justify-center py-32">
            <Loader2 className="w-10 h-10 text-[#029bba] animate-spin" />
          </div>
        </div>
      </AdminLayout>
    );
  }

  // ─── Not Found State ─────────────────────────────────────────────────────

  if (!society || !form) {
    return (
      <AdminLayout>
        <div className="p-6 max-w-2xl mx-auto">
          <div className="bg-white rounded-2xl shadow-md p-8 text-center">
            <XCircle className="w-16 h-16 text-[#ef4444] mx-auto mb-4" />
            <h1 className="text-xl font-bold text-gray-900 mb-2">Society Not Found</h1>
            <p className="text-gray-600 mb-6">
              The society you&apos;re looking for doesn&apos;t exist or has been deleted.
            </p>
            <Link href="/admin/societies">
              <button className="px-6 py-3 rounded-xl bg-[#029bba] text-white font-semibold hover:bg-[#027a94] transition-colors inline-flex items-center gap-2">
                <ArrowLeft className="w-4 h-4" />
                Back to Societies
              </button>
            </Link>
          </div>
        </div>
      </AdminLayout>
    );
  }

  // ─── Main Render ─────────────────────────────────────────────────────────

  const activeAlerts = society.riskAlerts.filter((a) => !a.isResolved);
  const resolvedAlerts = society.riskAlerts.filter((a) => a.isResolved);

  return (
    <>
      <Head>
        <title>Edit {society.name} | Highrise Admin</title>
      </Head>

      <AdminLayout>
        <div className="p-6 max-w-7xl mx-auto">

          {/* HEADER */}
          <div className="mb-6">
            <Link href="/admin/societies">
              <button className="text-sm text-gray-600 hover:text-[#029bba] transition-colors inline-flex items-center gap-1 mb-3">
                <ArrowLeft className="w-4 h-4" />
                Back to Societies
              </button>
            </Link>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-3 flex-wrap">
                  <Edit className="w-7 h-7 text-[#029bba]" />
                  {society.name}
                  {society.isVerifiedByHighrise && <BadgeCheck className="w-6 h-6 text-[#029bba]" />}
                  {society.isFeatured && <Star className="w-5 h-5 text-[#f59e0b] fill-[#f59e0b]" />}
                </h1>
                <p className="text-gray-600 text-sm mt-1 flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5" />
                  {society.areaName}, {society.city} · {society.approvalAuthority}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={fetchSociety}
                  disabled={loading}
                  className="p-2.5 rounded-xl bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
                  title="Refresh"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
                <Link href={`/societies/${society.slug}`} target="_blank">
                  <button className="px-4 py-2.5 rounded-xl bg-white border border-gray-300 text-gray-700 text-sm font-semibold hover:bg-gray-50 transition-colors inline-flex items-center gap-2">
                    <ExternalLink className="w-4 h-4" />
                    View Public
                  </button>
                </Link>
              </div>
            </div>
          </div>

          {/* BANNER */}
          {banner && (
            <div
              className={`mb-6 rounded-xl border-l-4 p-4 flex items-start gap-3 ${
                banner.type === 'success' ? 'bg-[#f0fdf4] border-[#10b981] text-[#10b981]' :
                banner.type === 'error' ? 'bg-[#fef2f2] border-[#ef4444] text-red-700' :
                'bg-[#eff6ff] border-[#029bba] text-[#004063]'
              }`}
            >
              {banner.type === 'success' && <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />}
              {banner.type === 'error' && <XCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />}
              {banner.type === 'info' && <Info className="w-5 h-5 flex-shrink-0 mt-0.5" />}
              <span className="flex-1 text-sm font-medium">{banner.message}</span>
              <button onClick={() => setBanner(null)} className="opacity-60 hover:opacity-100" aria-label="Dismiss">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* 2-COLUMN LAYOUT */}
          <div className="grid lg:grid-cols-3 gap-6">

            {/* LEFT: Form Sections (2 cols) */}
            <div className="lg:col-span-2 space-y-5">

              <form onSubmit={handleSubmit} className="space-y-5" id="main-society-form">

                {/* SECTION: Core */}
                <FormSection title="Core Identity" icon={<Building2 className="w-5 h-5" />} isCollapsed={collapsedSections.core} onToggle={() => toggleSection('core')} required>
                  <div className="space-y-4">
                    <FormField label="Society Name" required error={fieldErrors.name}>
                      <input type="text" value={form.name} onChange={(e) => updateField('name', e.target.value)} placeholder="e.g. DHA Phase 5" maxLength={200} className="w-full h-11 px-3 rounded-xl border border-gray-300 text-sm focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/10 outline-none" />
                    </FormField>

                    <FormField label="Category" required>
                      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        {CATEGORIES.map((c) => (
                          <button key={c.id} type="button" onClick={() => updateField('category', c.id)} className={`text-left p-3 rounded-xl border-2 transition-all ${form.category === c.id ? 'border-[#029bba] bg-[#029bba]/5' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                            <div className="font-semibold text-gray-900 text-sm">{c.label}</div>
                            <div className="text-[11px] text-gray-500">{c.description}</div>
                          </button>
                        ))}
                      </div>
                    </FormField>

                    <FormField label="Alternate Names" optional>
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <input type="text" value={altNameInput} onChange={(e) => setAltNameInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddAltName(); } }} placeholder="Type and press Enter" className="flex-1 h-10 px-3 rounded-xl border border-gray-300 text-sm focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/10 outline-none" />
                          <button type="button" onClick={handleAddAltName} disabled={!altNameInput.trim()} className="px-4 h-10 rounded-xl bg-[#029bba] text-white text-sm font-semibold hover:bg-[#027a94] transition-colors disabled:opacity-50 inline-flex items-center gap-1">
                            <Plus className="w-4 h-4" /> Add
                          </button>
                        </div>
                        {form.alternateNames.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {form.alternateNames.map((name, i) => (
                              <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-sm">
                                {name}
                                <button type="button" onClick={() => handleRemoveAltName(i)} className="hover:text-[#ef4444]" aria-label={`Remove ${name}`}>
                                  <X className="w-3 h-3" />
                                </button>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </FormField>

                    <FormField label="Description" optional>
                      <textarea value={form.description} onChange={(e) => updateField('description', e.target.value)} placeholder="Brief description..." rows={4} maxLength={5000} className="w-full px-3 py-2 rounded-xl border border-gray-300 text-sm focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/10 outline-none resize-y" />
                      <FieldHint>{form.description.length}/5000 characters</FieldHint>
                    </FormField>
                  </div>
                </FormSection>

                {/* SECTION: Location */}
                <FormSection title="Location" icon={<MapPin className="w-5 h-5" />} isCollapsed={collapsedSections.location} onToggle={() => toggleSection('location')} required>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <FormField label="City" required error={fieldErrors.city}>
                      <select value={form.city} onChange={(e) => updateField('city', e.target.value)} className="w-full h-11 px-3 rounded-xl border border-gray-300 text-sm focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/10 outline-none cursor-pointer bg-white">
                        <option value="">Select city...</option>
                        {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </FormField>

                    <FormField label="Area / Locality" required error={fieldErrors.areaName}>
                      <input type="text" value={form.areaName} onChange={(e) => updateField('areaName', e.target.value)} placeholder="e.g. Raiwind Road" maxLength={200} className="w-full h-11 px-3 rounded-xl border border-gray-300 text-sm focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/10 outline-none" />
                    </FormField>

                    <div className="sm:col-span-2">
                      <FormField label="Full Address" optional>
                        <input type="text" value={form.fullAddress} onChange={(e) => updateField('fullAddress', e.target.value)} placeholder="Main Boulevard, Block A..." maxLength={500} className="w-full h-11 px-3 rounded-xl border border-gray-300 text-sm focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/10 outline-none" />
                      </FormField>
                    </div>

                    <FormField label="Longitude" optional>
                      <input type="number" step="any" value={form.longitude} onChange={(e) => updateField('longitude', e.target.value)} placeholder="74.3587" className="w-full h-11 px-3 rounded-xl border border-gray-300 text-sm focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/10 outline-none" />
                    </FormField>

                    <FormField label="Latitude" optional>
                      <input type="number" step="any" value={form.latitude} onChange={(e) => updateField('latitude', e.target.value)} placeholder="31.5204" className="w-full h-11 px-3 rounded-xl border border-gray-300 text-sm focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/10 outline-none" />
                    </FormField>
                  </div>
                </FormSection>

                {/* SECTION: Legal & NOC */}
                <FormSection title="Legal & NOC Information" icon={<Shield className="w-5 h-5" />} isCollapsed={collapsedSections.legal} onToggle={() => toggleSection('legal')} required>
                  <div className="space-y-4">
                    <FormField label="NOC Status" required>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {(['approved', 'pending', 'under_review', 'expired', 'illegal', 'disputed', 'cancelled'] as NOCStatus[]).map((s) => {
                          const isDanger = ['illegal', 'disputed', 'cancelled'].includes(s);
                          return (
                            <button key={s} type="button" onClick={() => updateField('nocStatus', s)} className={`px-3 py-2 rounded-xl border-2 text-xs font-semibold transition-all capitalize ${form.nocStatus === s ? s === 'approved' ? 'border-[#10b981] bg-[#10b981]/10 text-[#10b981]' : isDanger ? 'border-[#ef4444] bg-[#ef4444]/10 text-[#ef4444]' : 'border-[#f59e0b] bg-[#f59e0b]/10 text-[#92400e]' : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'}`}>
                              {s.replace('_', ' ')}
                            </button>
                          );
                        })}
                      </div>
                    </FormField>

                    <FormField label="Approval Authority" required>
                      <select value={form.approvalAuthority} onChange={(e) => updateField('approvalAuthority', e.target.value as Authority)} className="w-full h-11 px-3 rounded-xl border border-gray-300 text-sm focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/10 outline-none cursor-pointer bg-white">
                        {AUTHORITIES.map((a) => <option key={a.id} value={a.id}>{a.label} — {a.description}</option>)}
                      </select>
                    </FormField>

                    <div className="grid sm:grid-cols-2 gap-4">
                      <FormField label="NOC Number" optional>
                        <input type="text" value={form.nocNumber} onChange={(e) => updateField('nocNumber', e.target.value)} placeholder="LDA/NOC/2024/1234" maxLength={100} className="w-full h-11 px-3 rounded-xl border border-gray-300 text-sm focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/10 outline-none" />
                      </FormField>

                      <FormField label="Registration Number" optional>
                        <input type="text" value={form.registrationNo} onChange={(e) => updateField('registrationNo', e.target.value)} placeholder="Official #" maxLength={100} className="w-full h-11 px-3 rounded-xl border border-gray-300 text-sm focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/10 outline-none" />
                      </FormField>

                      <FormField label="NOC Issue Date" optional>
                        <input type="date" value={form.nocDate} onChange={(e) => updateField('nocDate', e.target.value)} className="w-full h-11 px-3 rounded-xl border border-gray-300 text-sm focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/10 outline-none" />
                      </FormField>

                      <FormField label="NOC Expiry Date" optional>
                        <input type="date" value={form.nocExpiryDate} onChange={(e) => updateField('nocExpiryDate', e.target.value)} className="w-full h-11 px-3 rounded-xl border border-gray-300 text-sm focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/10 outline-none" />
                      </FormField>
                    </div>

                    <FormField label="Development Authority (Custom)" optional>
                      <input type="text" value={form.developmentAuthority} onChange={(e) => updateField('developmentAuthority', e.target.value)} placeholder="If 'Other' above" maxLength={200} className="w-full h-11 px-3 rounded-xl border border-gray-300 text-sm focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/10 outline-none" />
                    </FormField>

                    <FormField label="Litigation Status" required>
                      <div className="grid grid-cols-3 gap-2">
                        {(['none', 'active', 'resolved'] as LitigationStatus[]).map((s) => (
                          <button key={s} type="button" onClick={() => updateField('litigationStatus', s)} className={`px-3 py-2 rounded-xl border-2 text-xs font-semibold transition-all capitalize ${form.litigationStatus === s ? s === 'none' ? 'border-[#10b981] bg-[#10b981]/10 text-[#10b981]' : s === 'active' ? 'border-[#ef4444] bg-[#ef4444]/10 text-[#ef4444]' : 'border-[#f59e0b] bg-[#f59e0b]/10 text-[#92400e]' : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'}`}>
                            {s}
                          </button>
                        ))}
                      </div>
                    </FormField>

                    {form.litigationStatus !== 'none' && (
                      <FormField label="Litigation Note" optional>
                        <textarea value={form.litigationNote} onChange={(e) => updateField('litigationNote', e.target.value)} rows={2} maxLength={2000} className="w-full px-3 py-2 rounded-xl border border-gray-300 text-sm focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/10 outline-none resize-y" />
                      </FormField>
                    )}
                  </div>
                </FormSection>

                {/* SECTION: Developer */}
                <FormSection title="Developer Information" icon={<Award className="w-5 h-5" />} isCollapsed={collapsedSections.developer} onToggle={() => toggleSection('developer')}>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <FormField label="Developer Name" optional>
                      <input type="text" value={form.developerName} onChange={(e) => updateField('developerName', e.target.value)} placeholder="e.g. Bahria Town Pvt Ltd" maxLength={200} className="w-full h-11 px-3 rounded-xl border border-gray-300 text-sm focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/10 outline-none" />
                    </FormField>

                    <FormField label="Developer Website" optional>
                      <input type="url" value={form.developerWebsite} onChange={(e) => updateField('developerWebsite', e.target.value)} placeholder="https://example.com" maxLength={300} className="w-full h-11 px-3 rounded-xl border border-gray-300 text-sm focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/10 outline-none" />
                    </FormField>
                  </div>
                </FormSection>

                {/* SECTION: Stats */}
                <FormSection title="Society Stats" icon={<Activity className="w-5 h-5" />} isCollapsed={collapsedSections.stats} onToggle={() => toggleSection('stats')}>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <FormField label="Total Plots" optional>
                      <input type="number" min="0" value={form.totalPlots} onChange={(e) => updateField('totalPlots', e.target.value)} className="w-full h-11 px-3 rounded-xl border border-gray-300 text-sm focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/10 outline-none" />
                    </FormField>
                    <FormField label="Total Phases" optional>
                      <input type="number" min="0" max="50" value={form.totalPhases} onChange={(e) => updateField('totalPhases', e.target.value)} className="w-full h-11 px-3 rounded-xl border border-gray-300 text-sm focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/10 outline-none" />
                    </FormField>
                    <FormField label="Possession %" optional>
                      <input type="number" min="0" max="100" value={form.possessionPercentage} onChange={(e) => updateField('possessionPercentage', e.target.value)} placeholder="0-100" className="w-full h-11 px-3 rounded-xl border border-gray-300 text-sm focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/10 outline-none" />
                    </FormField>
                    <FormField label="Launch Year" optional>
                      <input type="number" min="1900" max="2100" value={form.launchYear} onChange={(e) => updateField('launchYear', e.target.value)} className="w-full h-11 px-3 rounded-xl border border-gray-300 text-sm focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/10 outline-none" />
                    </FormField>
                    <FormField label="Expected Completion" optional>
                      <input type="number" min="1900" max="2100" value={form.expectedCompletionYear} onChange={(e) => updateField('expectedCompletionYear', e.target.value)} className="w-full h-11 px-3 rounded-xl border border-gray-300 text-sm focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/10 outline-none" />
                    </FormField>
                    <FormField label="Price Change YoY %" optional>
                      <input type="number" step="0.1" value={form.priceChangeYoY} onChange={(e) => updateField('priceChangeYoY', e.target.value)} placeholder="e.g. 12.5" className="w-full h-11 px-3 rounded-xl border border-gray-300 text-sm focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/10 outline-none" />
                    </FormField>
                    <FormField label="Rental Yield %" optional>
                      <input type="number" step="0.1" min="0" max="100" value={form.rentalYield} onChange={(e) => updateField('rentalYield', e.target.value)} placeholder="e.g. 5.5" className="w-full h-11 px-3 rounded-xl border border-gray-300 text-sm focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/10 outline-none" />
                    </FormField>
                  </div>
                </FormSection>

                {/* SECTION: Intelligence Scores */}
                <FormSection title="Intelligence Scores" icon={<Activity className="w-5 h-5" />} isCollapsed={collapsedSections.scores} onToggle={() => toggleSection('scores')}>
                  <div className="space-y-5">
                    <div className="bg-[#eff6ff] border border-[#029bba]/30 rounded-xl p-3 text-xs text-[#004063] flex items-start gap-2">
                      <Lightbulb className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <div><strong>Auto-calculated:</strong> Legal score, Infrastructure score, Livability score, and Overall composite — recalculated when you save.</div>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                      <ScoreInput label="Growth Score" value={form.growthScore} onChange={(v) => updateField('growthScore', v)} />
                      <ScoreInput label="Possession Score" value={form.possessionScore} onChange={(v) => updateField('possessionScore', v)} />
                    </div>

                    <div>
                      <h4 className="text-sm font-bold text-gray-700 mb-3">Infrastructure Sub-metrics</h4>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        <ScoreInput label="Electricity" value={form.infra_electricity} onChange={(v) => updateField('infra_electricity', v)} />
                        <ScoreInput label="Gas" value={form.infra_gas} onChange={(v) => updateField('infra_gas', v)} />
                        <ScoreInput label="Water" value={form.infra_water} onChange={(v) => updateField('infra_water', v)} />
                        <ScoreInput label="Sewerage" value={form.infra_sewerage} onChange={(v) => updateField('infra_sewerage', v)} />
                        <ScoreInput label="Internet" value={form.infra_internet} onChange={(v) => updateField('infra_internet', v)} />
                        <ScoreInput label="Roads" value={form.infra_roads} onChange={(v) => updateField('infra_roads', v)} />
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-bold text-gray-700 mb-3">Livability Sub-metrics</h4>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        <ScoreInput label="Schools" value={form.liva_schools} onChange={(v) => updateField('liva_schools', v)} />
                        <ScoreInput label="Hospitals" value={form.liva_hospitals} onChange={(v) => updateField('liva_hospitals', v)} />
                        <ScoreInput label="Markets" value={form.liva_markets} onChange={(v) => updateField('liva_markets', v)} />
                        <ScoreInput label="Transport" value={form.liva_transport} onChange={(v) => updateField('liva_transport', v)} />
                        <ScoreInput label="Security" value={form.liva_security} onChange={(v) => updateField('liva_security', v)} />
                        <ScoreInput label="Parks" value={form.liva_parks} onChange={(v) => updateField('liva_parks', v)} />
                      </div>
                    </div>
                  </div>
                </FormSection>

                {/* SECTION: Media */}
                <FormSection title="Media" icon={<ImageIcon className="w-5 h-5" />} isCollapsed={collapsedSections.media} onToggle={() => toggleSection('media')}>
                  <div className="space-y-5">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Featured Image</label>
                      {form.featuredImage ? (
                        <div className="relative w-full max-w-xs">
                          <div className="aspect-video rounded-xl overflow-hidden bg-gray-100 relative">
                            <Image src={form.featuredImage} alt="Featured" fill className="object-cover" sizes="400px" />
                          </div>
                          <button type="button" onClick={() => updateField('featuredImage', '')} className="absolute top-2 right-2 w-7 h-7 rounded-full bg-[#ef4444] text-white flex items-center justify-center shadow-md hover:bg-red-600 transition-colors">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <button type="button" onClick={() => featuredFileRef.current?.click()} disabled={uploadingFeature} className="w-full max-w-xs aspect-video rounded-xl border-2 border-dashed border-gray-300 hover:border-[#029bba] hover:bg-[#029bba]/5 transition-colors flex flex-col items-center justify-center gap-2 disabled:opacity-50">
                          {uploadingFeature ? <Loader2 className="w-8 h-8 text-[#029bba] animate-spin" /> : <><Upload className="w-8 h-8 text-gray-400" /><span className="text-sm font-semibold text-gray-700">Upload Featured Image</span></>}
                        </button>
                      )}
                      <input ref={featuredFileRef} type="file" accept="image/*" onChange={handleFeaturedUpload} className="hidden" />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Gallery ({form.images.length}/20)</label>
                      {form.images.length > 0 && (
                        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2 mb-3">
                          {form.images.map((img, i) => (
                            <div key={i} className="relative aspect-square rounded-lg overflow-hidden bg-gray-100 group">
                              <Image src={img} alt={`Gallery ${i + 1}`} fill className="object-cover" sizes="200px" />
                              <button type="button" onClick={() => updateField('images', form.images.filter((_, idx) => idx !== i))} className="absolute top-1 right-1 w-6 h-6 rounded-full bg-[#ef4444] text-white flex items-center justify-center shadow opacity-0 group-hover:opacity-100 transition-opacity">
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                      {form.images.length < 20 && (
                        <button type="button" onClick={() => galleryFileRef.current?.click()} disabled={uploadingGallery} className="w-full h-20 rounded-xl border-2 border-dashed border-gray-300 hover:border-[#029bba] hover:bg-[#029bba]/5 transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
                          {uploadingGallery ? <Loader2 className="w-5 h-5 text-[#029bba] animate-spin" /> : <><Plus className="w-5 h-5 text-gray-400" /><span className="text-sm font-semibold text-gray-700">Add Gallery Images</span></>}
                        </button>
                      )}
                      <input ref={galleryFileRef} type="file" accept="image/*" multiple onChange={handleGalleryUpload} className="hidden" />
                    </div>
                  </div>
                </FormSection>

                {/* SECTION: Platform */}
                <FormSection title="Platform Settings" icon={<Eye className="w-5 h-5" />} isCollapsed={collapsedSections.platform} onToggle={() => toggleSection('platform')}>
                  <div className="space-y-3">
            <ToggleField label="Publish (Visible on Public Site)" description="Society will appear at /societies/[slug]" checked={form.isPublished} onChange={(v) => updateField('isPublished', v)} icon={<Globe className="w-4 h-4" />} activeColor="#10b981" />                    <ToggleField label="Verified by Highrise" description="Highrise-verified badge shown publicly" checked={form.isVerifiedByHighrise} onChange={(v) => updateField('isVerifiedByHighrise', v)} icon={<BadgeCheck className="w-4 h-4" />} activeColor="#029bba" />
                    <ToggleField label="Featured on Homepage" description="Priority placement in featured societies" checked={form.isFeatured} onChange={(v) => updateField('isFeatured', v)} icon={<Star className="w-4 h-4" />} activeColor="#f59e0b" />
                  </div>
                </FormSection>

                {/* SECTION: SEO */}
                <FormSection title="SEO" icon={<FileText className="w-5 h-5" />} isCollapsed={collapsedSections.seo} onToggle={() => toggleSection('seo')}>
                  <div className="space-y-4">
                    <FormField label="SEO Title" optional>
                      <input type="text" value={form.seoTitle} onChange={(e) => updateField('seoTitle', e.target.value)} placeholder="Auto-generated if blank" maxLength={160} className="w-full h-11 px-3 rounded-xl border border-gray-300 text-sm focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/10 outline-none" />
                      <FieldHint>{form.seoTitle.length}/160 characters</FieldHint>
                    </FormField>
                    <FormField label="SEO Description" optional>
                      <textarea value={form.seoDescription} onChange={(e) => updateField('seoDescription', e.target.value)} rows={3} maxLength={320} className="w-full px-3 py-2 rounded-xl border border-gray-300 text-sm focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/10 outline-none resize-y" />
                      <FieldHint>{form.seoDescription.length}/320 characters</FieldHint>
                    </FormField>
                  </div>
                </FormSection>

                {/* MAIN SAVE BUTTON */}
                <div className="bg-white rounded-2xl shadow-sm p-5 sticky bottom-4 z-10 border border-gray-200">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <p className="text-sm text-gray-600">
                      Last updated: <strong className="text-gray-900">{formatDate(society.updatedAt)}</strong>
                    </p>
                    <button type="submit" disabled={submitting} className="px-5 py-2.5 rounded-xl bg-[#029bba] text-white text-sm font-semibold hover:bg-[#027a94] transition-colors disabled:opacity-50 inline-flex items-center gap-2 shadow-md">
                      {submitting ? <><Loader2 className="w-4 h-4 animate-spin" />Saving...</> : <><Save className="w-4 h-4" />Save All Changes</>}
                    </button>
                  </div>
                </div>
              </form>

              {/* RISK ALERTS SECTION (Outside main form — uses sub-ops PATCH) */}
              <FormSection
                title={`Risk Alerts (${activeAlerts.length} active${resolvedAlerts.length > 0 ? `, ${resolvedAlerts.length} resolved` : ''})`}
                icon={<AlertTriangle className="w-5 h-5" />}
                isCollapsed={collapsedSections.alerts}
                onToggle={() => toggleSection('alerts')}
              >
                <div className="space-y-4">
                  <button
                    type="button"
                    onClick={() => setShowAddAlert(!showAddAlert)}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#ef4444]/10 border-2 border-dashed border-[#ef4444]/30 text-[#ef4444] text-sm font-semibold hover:bg-[#ef4444]/20 transition-colors inline-flex items-center justify-center gap-2"
                  >
                    {showAddAlert ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                    {showAddAlert ? 'Cancel' : 'Add New Alert'}
                  </button>

                  {showAddAlert && (
                    <div className="bg-[#fef2f2] rounded-xl p-4 space-y-3 border border-[#ef4444]/30">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {(['low', 'medium', 'high', 'critical'] as AlertSeverity[]).map((s) => (
                          <button key={s} type="button" onClick={() => setNewAlert({ ...newAlert, severity: s })} className={`px-3 py-2 rounded-lg border-2 text-xs font-bold uppercase transition-all ${newAlert.severity === s ? s === 'critical' ? 'border-[#ef4444] bg-[#ef4444] text-white' : s === 'high' ? 'border-[#ef4444] bg-[#ef4444]/10 text-[#ef4444]' : s === 'medium' ? 'border-[#f59e0b] bg-[#f59e0b]/10 text-[#92400e]' : 'border-gray-300 bg-white text-gray-600' : 'border-gray-200 bg-white text-gray-500'}`}>
                            {s}
                          </button>
                        ))}
                      </div>
                      <input type="text" value={newAlert.title} onChange={(e) => setNewAlert({ ...newAlert, title: e.target.value })} placeholder="Alert title (e.g. Court Stay Order)" maxLength={200} className="w-full h-10 px-3 rounded-lg border border-gray-300 text-sm focus:border-[#029bba] outline-none" />
                      <textarea value={newAlert.message} onChange={(e) => setNewAlert({ ...newAlert, message: e.target.value })} placeholder="Detailed message..." rows={3} maxLength={2000} className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:border-[#029bba] outline-none resize-y" />
                      <div className="grid sm:grid-cols-2 gap-2">
                        <input type="text" value={newAlert.issuedBy} onChange={(e) => setNewAlert({ ...newAlert, issuedBy: e.target.value })} placeholder="Issued by (optional)" maxLength={200} className="h-10 px-3 rounded-lg border border-gray-300 text-sm focus:border-[#029bba] outline-none" />
                        <input type="text" value={newAlert.referenceNo} onChange={(e) => setNewAlert({ ...newAlert, referenceNo: e.target.value })} placeholder="Reference # (optional)" maxLength={100} className="h-10 px-3 rounded-lg border border-gray-300 text-sm focus:border-[#029bba] outline-none" />
                      </div>
                      <button type="button" onClick={handleAddAlert} disabled={actionLoading === 'addAlert'} className="w-full px-4 py-2.5 rounded-lg bg-[#ef4444] text-white text-sm font-semibold hover:bg-red-600 transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-2">
                        {actionLoading === 'addAlert' ? <><Loader2 className="w-4 h-4 animate-spin" />Adding...</> : <><Plus className="w-4 h-4" />Create Alert</>}
                      </button>
                    </div>
                  )}

                  {activeAlerts.length === 0 && resolvedAlerts.length === 0 && (
                    <p className="text-sm text-gray-500 text-center py-4">No alerts yet. Add one if there are risks to flag.</p>
                  )}

                  {activeAlerts.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-[#ef4444]">Active Alerts</h4>
                      {activeAlerts.map((alert) => (
                        <div key={alert._id} className="bg-white rounded-xl border-l-4 border-[#ef4444] p-3 shadow-sm">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${alert.severity === 'critical' ? 'bg-[#ef4444] text-white' : alert.severity === 'high' ? 'bg-[#ef4444]/15 text-[#ef4444]' : alert.severity === 'medium' ? 'bg-[#f59e0b]/15 text-[#f59e0b]' : 'bg-gray-100 text-gray-700'}`}>
                                {alert.severity}
                              </span>
                              <span className="font-bold text-gray-900 text-sm truncate">{alert.title}</span>
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <button type="button" onClick={() => { setResolveAlertId(alert._id); setResolveNote(''); }} className="p-1.5 rounded-lg text-[#10b981] hover:bg-[#10b981]/10 transition-colors" title="Resolve">
                                <CheckCircle className="w-4 h-4" />
                              </button>
                              <button type="button" onClick={() => handleRemoveAlert(alert._id)} disabled={actionLoading === `remove-alert-${alert._id}`} className="p-1.5 rounded-lg text-[#ef4444] hover:bg-red-50 transition-colors disabled:opacity-50" title="Remove">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                          <p className="text-xs text-gray-700 mb-2">{alert.message}</p>
                          <div className="text-[10px] text-gray-500 flex flex-wrap gap-2">
                            <span>📅 {formatDate(alert.date)}</span>
                            {alert.issuedBy && <span>👤 {alert.issuedBy}</span>}
                            {alert.referenceNo && <span>#️⃣ {alert.referenceNo}</span>}
                          </div>

                          {resolveAlertId === alert._id && (
                            <div className="mt-3 pt-3 border-t border-gray-200 space-y-2">
                              <textarea value={resolveNote} onChange={(e) => setResolveNote(e.target.value)} placeholder="Resolution note (optional)" rows={2} className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 focus:border-[#10b981] outline-none resize-y" />
                              <div className="flex gap-2">
                                <button type="button" onClick={() => handleResolveAlert(alert._id)} disabled={actionLoading === `resolve-${alert._id}`} className="flex-1 px-3 py-2 rounded-lg bg-[#10b981] text-white text-xs font-semibold hover:bg-green-600 transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-1">
                                  {actionLoading === `resolve-${alert._id}` ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
                                  Confirm Resolve
                                </button>
                                <button type="button" onClick={() => { setResolveAlertId(null); setResolveNote(''); }} className="px-3 py-2 rounded-lg bg-gray-100 text-gray-700 text-xs font-semibold hover:bg-gray-200 transition-colors">
                                  Cancel
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {resolvedAlerts.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-[#10b981]">Resolved Alerts</h4>
                      {resolvedAlerts.map((alert) => (
                        <div key={alert._id} className="bg-gray-50 rounded-xl border-l-4 border-[#10b981] p-3">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <span className="font-semibold text-gray-700 text-sm">{alert.title}</span>
                            <button type="button" onClick={() => handleRemoveAlert(alert._id)} disabled={actionLoading === `remove-alert-${alert._id}`} className="p-1 rounded text-gray-400 hover:text-[#ef4444] transition-colors disabled:opacity-50">
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                          <p className="text-xs text-gray-600">{alert.message}</p>
                          {alert.resolvedNote && <p className="text-xs text-[#10b981] mt-1 italic">✓ {alert.resolvedNote}</p>}
                          <p className="text-[10px] text-gray-400 mt-1">Resolved {formatDate(alert.resolvedAt)}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </FormSection>

              {/* DOCUMENTS SECTION */}
              <FormSection
                title={`Documents (${society.documents.length})`}
                icon={<FileText className="w-5 h-5" />}
                isCollapsed={collapsedSections.documents}
                onToggle={() => toggleSection('documents')}
              >
                <div className="space-y-4">
                  <button type="button" onClick={() => setShowAddDocument(!showAddDocument)} className="w-full px-4 py-2.5 rounded-xl bg-[#029bba]/10 border-2 border-dashed border-[#029bba]/30 text-[#029bba] text-sm font-semibold hover:bg-[#029bba]/20 transition-colors inline-flex items-center justify-center gap-2">
                    {showAddDocument ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                    {showAddDocument ? 'Cancel' : 'Add Document'}
                  </button>

                  {showAddDocument && (
                    <div className="bg-[#eff6ff] rounded-xl p-4 space-y-3 border border-[#029bba]/30">
                      <input type="text" value={newDoc.title} onChange={(e) => setNewDoc({ ...newDoc, title: e.target.value })} placeholder="Document title" maxLength={200} className="w-full h-10 px-3 rounded-lg border border-gray-300 text-sm focus:border-[#029bba] outline-none" />
                      <select value={newDoc.type} onChange={(e) => setNewDoc({ ...newDoc, type: e.target.value as DocumentType })} className="w-full h-10 px-3 rounded-lg border border-gray-300 text-sm focus:border-[#029bba] outline-none cursor-pointer bg-white">
                        {DOC_TYPES.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
                      </select>

                      {newDoc.url ? (
                        <div className="flex items-center gap-2 p-2 rounded-lg bg-white border border-[#10b981]/30">
                          <CheckCircle className="w-4 h-4 text-[#10b981]" />
                          <span className="text-xs text-gray-700 flex-1 truncate">File uploaded</span>
                          <button type="button" onClick={() => setNewDoc({ ...newDoc, url: '' })} className="text-xs text-[#ef4444]">Remove</button>
                        </div>
                      ) : (
                        <button type="button" onClick={() => docFileRef.current?.click()} disabled={uploadingDoc} className="w-full h-12 rounded-lg border-2 border-dashed border-gray-300 hover:border-[#029bba] transition-colors flex items-center justify-center gap-2 text-sm font-semibold text-gray-700 disabled:opacity-50">
                          {uploadingDoc ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Upload className="w-4 h-4" />Upload Document</>}
                        </button>
                      )}
                      <input ref={docFileRef} type="file" accept="image/*,application/pdf" onChange={handleDocUpload} className="hidden" />

                      <button type="button" onClick={handleAddDocument} disabled={actionLoading === 'addDoc' || !newDoc.url} className="w-full px-4 py-2.5 rounded-lg bg-[#029bba] text-white text-sm font-semibold hover:bg-[#027a94] transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-2">
                        {actionLoading === 'addDoc' ? <><Loader2 className="w-4 h-4 animate-spin" />Saving...</> : <><Save className="w-4 h-4" />Save Document</>}
                      </button>
                    </div>
                  )}

                  {society.documents.length === 0 && (
                    <p className="text-sm text-gray-500 text-center py-4">No documents uploaded yet.</p>
                  )}

                  {society.documents.length > 0 && (
                    <div className="space-y-2">
                      {society.documents.map((doc) => {
                        const typeLabel = DOC_TYPES.find(d => d.id === doc.type)?.label || doc.type;
                        return (
                          <div key={doc._id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors">
                            <div className="w-9 h-9 rounded-lg bg-[#029bba]/10 text-[#029bba] flex items-center justify-center flex-shrink-0">
                              <FileText className="w-4 h-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-semibold text-gray-900 text-sm truncate">{doc.title}</div>
                              <div className="text-xs text-gray-500">{typeLabel} · {formatDate(doc.uploadedAt)}</div>
                            </div>
                            <a href={doc.url} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded text-[#029bba] hover:bg-[#029bba]/10" title="View">
                              <Download className="w-4 h-4" />
                            </a>
                            <button type="button" onClick={() => handleRemoveDocument(doc._id)} disabled={actionLoading === `remove-doc-${doc._id}`} className="p-1.5 rounded text-[#ef4444] hover:bg-red-50 disabled:opacity-50">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </FormSection>

              {/* BLOCK RATES SECTION */}
              <FormSection
                title={`Block-wise Pricing (${society.blockRates.length})`}
                icon={<Banknote className="w-5 h-5" />}
                isCollapsed={collapsedSections.pricing}
                onToggle={() => toggleSection('pricing')}
              >
                <div className="space-y-4">
                  <button type="button" onClick={() => setShowAddBlockRate(!showAddBlockRate)} className="w-full px-4 py-2.5 rounded-xl bg-[#f59e0b]/10 border-2 border-dashed border-[#f59e0b]/30 text-[#f59e0b] text-sm font-semibold hover:bg-[#f59e0b]/20 transition-colors inline-flex items-center justify-center gap-2">
                    {showAddBlockRate ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                    {showAddBlockRate ? 'Cancel' : 'Add Block Rate'}
                  </button>

                  {showAddBlockRate && (
                    <div className="bg-[#fef3c7] rounded-xl p-4 space-y-3 border border-[#f59e0b]/30">
                      <div className="grid sm:grid-cols-2 gap-2">
                        <input type="text" value={newBlockRate.blockName} onChange={(e) => setNewBlockRate({ ...newBlockRate, blockName: e.target.value })} placeholder="Block name (e.g. Block A)" maxLength={100} className="h-10 px-3 rounded-lg border border-gray-300 text-sm focus:border-[#f59e0b] outline-none" />
                        <input type="text" value={newBlockRate.plotSize} onChange={(e) => setNewBlockRate({ ...newBlockRate, plotSize: e.target.value })} placeholder="Plot size (e.g. 5 Marla)" maxLength={100} className="h-10 px-3 rounded-lg border border-gray-300 text-sm focus:border-[#f59e0b] outline-none" />
                      </div>
                      <div className="grid sm:grid-cols-3 gap-2">
                        <input type="number" min="0" value={newBlockRate.minPrice} onChange={(e) => setNewBlockRate({ ...newBlockRate, minPrice: e.target.value })} placeholder="Min price (PKR)" className="h-10 px-3 rounded-lg border border-gray-300 text-sm focus:border-[#f59e0b] outline-none" />
                        <input type="number" min="0" value={newBlockRate.maxPrice} onChange={(e) => setNewBlockRate({ ...newBlockRate, maxPrice: e.target.value })} placeholder="Max price (PKR)" className="h-10 px-3 rounded-lg border border-gray-300 text-sm focus:border-[#f59e0b] outline-none" />
                        <input type="number" min="0" value={newBlockRate.pricePerMarla} onChange={(e) => setNewBlockRate({ ...newBlockRate, pricePerMarla: e.target.value })} placeholder="Per Marla (optional)" className="h-10 px-3 rounded-lg border border-gray-300 text-sm focus:border-[#f59e0b] outline-none" />
                      </div>
                      <button type="button" onClick={handleAddBlockRate} disabled={actionLoading === 'addBlockRate'} className="w-full px-4 py-2.5 rounded-lg bg-[#f59e0b] text-white text-sm font-semibold hover:bg-amber-600 transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-2">
                        {actionLoading === 'addBlockRate' ? <><Loader2 className="w-4 h-4 animate-spin" />Saving...</> : <><Save className="w-4 h-4" />Save Block Rate</>}
                      </button>
                    </div>
                  )}

                  {society.blockRates.length === 0 && (
                    <p className="text-sm text-gray-500 text-center py-4">No block rates added yet.</p>
                  )}

                  {society.blockRates.length > 0 && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="text-left py-2 px-3 font-semibold text-gray-700 text-xs uppercase">Block</th>
                            <th className="text-left py-2 px-3 font-semibold text-gray-700 text-xs uppercase">Size</th>
                            <th className="text-right py-2 px-3 font-semibold text-gray-700 text-xs uppercase">Min</th>
                            <th className="text-right py-2 px-3 font-semibold text-gray-700 text-xs uppercase">Max</th>
                            <th className="text-right py-2 px-3 font-semibold text-gray-700 text-xs uppercase">Per Marla</th>
                            <th className="text-right py-2 px-3"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {society.blockRates.map((b) => (
                            <tr key={b._id} className="border-b border-gray-100 hover:bg-gray-50">
                              <td className="py-2.5 px-3 font-bold text-gray-900">{b.blockName}</td>
                              <td className="py-2.5 px-3 text-gray-700">{b.plotSize}</td>
                              <td className="py-2.5 px-3 text-right text-gray-700">{formatPKR(b.minPrice)}</td>
                              <td className="py-2.5 px-3 text-right text-gray-700">{formatPKR(b.maxPrice)}</td>
                              <td className="py-2.5 px-3 text-right font-semibold text-[#029bba]">
                                {b.pricePerMarla ? formatPKR(b.pricePerMarla) : '—'}
                              </td>
                              <td className="py-2.5 px-3 text-right">
                                <button type="button" onClick={() => handleRemoveBlockRate(b._id)} disabled={actionLoading === `remove-rate-${b._id}`} className="p-1 rounded text-[#ef4444] hover:bg-red-50 disabled:opacity-50">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </FormSection>

            </div>

            {/* RIGHT: Sticky Sidebar */}
            <div className="space-y-4">
              <div className="bg-white rounded-2xl shadow-sm p-5 sticky top-4">
                <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-[#029bba]" />
                  Society Stats
                </h3>
                <div className="space-y-3 text-sm">
                  <StatRow label="Overall Score" value={`${society.scores.overall}/100`} color={society.scores.overall >= 75 ? 'text-[#10b981]' : society.scores.overall >= 50 ? 'text-[#f59e0b]' : 'text-[#ef4444]'} />
                  <StatRow label="Legal Score" value={`${society.scores.legal}/100`} />
                  <StatRow label="Growth Score" value={`${society.scores.growth}/100`} />
                  <StatRow label="Possession" value={`${society.scores.possession}/100`} />
                  <StatRow label="Infrastructure" value={`${society.scores.infrastructure}/100`} />
                  <StatRow label="Livability" value={`${society.scores.livability}/100`} />
                  <hr className="border-gray-100" />
                  <StatRow label="Risk Level" value={society.overallRiskLevel.replace('_', ' ')} color={society.overallRiskLevel === 'safe' ? 'text-[#10b981]' : society.overallRiskLevel === 'caution' ? 'text-[#f59e0b]' : 'text-[#ef4444]'} />
                  <StatRow label="View Count" value={society.viewCount.toLocaleString()} />
                  <StatRow label="Search Count" value={society.searchCount.toLocaleString()} />
                  <hr className="border-gray-100" />
                  <StatRow label="Created" value={formatDate(society.createdAt)} small />
                  <StatRow label="Updated" value={formatDate(society.updatedAt)} small />
                  {society.lastVerifiedAt && <StatRow label="Verified" value={formatDate(society.lastVerifiedAt)} small />}
                </div>

                <div className="mt-5 pt-5 border-t border-gray-100 space-y-2">
                 <Link href={`/societies/${society.slug}`} target="_blank">
                    <button className="w-full px-4 py-2.5 rounded-xl bg-[#029bba] text-white text-sm font-semibold hover:bg-[#027a94] transition-colors inline-flex items-center justify-center gap-2">
                      <ExternalLink className="w-4 h-4" />
                      View Public Page
                    </button>
                  </Link>
                  <button type="button" onClick={() => setDeleteModal({ mode: 'soft' })} className="w-full px-4 py-2.5 rounded-xl bg-[#f59e0b]/10 border border-[#f59e0b]/30 text-[#92400e] text-sm font-semibold hover:bg-[#f59e0b]/20 transition-colors inline-flex items-center justify-center gap-2">
                    <EyeOff className="w-4 h-4" />
                    Unpublish (Soft Delete)
                  </button>
                  <button type="button" onClick={() => setDeleteModal({ mode: 'hard' })} className="w-full px-4 py-2.5 rounded-xl bg-[#ef4444]/10 border border-[#ef4444]/30 text-[#ef4444] text-sm font-semibold hover:bg-[#ef4444]/20 transition-colors inline-flex items-center justify-center gap-2">
                    <Trash2 className="w-4 h-4" />
                    Permanent Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* GENERIC CONFIRM MODAL (for sub-operation removes) */}
        {confirmModal && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" role="dialog" aria-modal="true">
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => !actionLoading && setConfirmModal(null)}
            />
            <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 z-10">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 bg-[#ef4444]/10 text-[#ef4444]">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">
                    {confirmModal.title}
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {confirmModal.message}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setConfirmModal(null)}
                  disabled={!!actionLoading}
                  className="px-4 py-2 rounded-xl bg-gray-100 text-gray-700 text-sm font-semibold hover:bg-gray-200 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await confirmModal.onConfirm();
                    setConfirmModal(null);
                  }}
                  disabled={!!actionLoading}
                  className="px-4 py-2 rounded-xl bg-[#ef4444] text-white text-sm font-semibold hover:bg-red-600 transition-colors disabled:opacity-50 inline-flex items-center gap-2"
                >
                  {actionLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {confirmModal.confirmLabel}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* DELETE CONFIRMATION MODAL */}
        {deleteModal && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" role="dialog" aria-modal="true">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !actionLoading && setDeleteModal(null)} />
            <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 z-10">
              <div className="flex items-start gap-3 mb-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${deleteModal.mode === 'hard' ? 'bg-[#ef4444]/10 text-[#ef4444]' : 'bg-[#f59e0b]/10 text-[#f59e0b]'}`}>
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">
                    {deleteModal.mode === 'hard' ? 'Permanently Delete?' : 'Unpublish Society?'}
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Are you sure you want to {deleteModal.mode === 'hard' ? 'permanently delete' : 'unpublish'} <strong>{society.name}</strong>?
                    {deleteModal.mode === 'hard' && <span className="block mt-2 text-[#ef4444] font-semibold">⚠️ This cannot be undone. All alerts, documents, and pricing data will be lost.</span>}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 justify-end">
                <button type="button" onClick={() => setDeleteModal(null)} disabled={actionLoading === 'delete'} className="px-4 py-2 rounded-xl bg-gray-100 text-gray-700 text-sm font-semibold hover:bg-gray-200 transition-colors disabled:opacity-50">
                  Cancel
                </button>
                <button type="button" onClick={handleDelete} disabled={actionLoading === 'delete'} className={`px-4 py-2 rounded-xl text-white text-sm font-semibold transition-colors disabled:opacity-50 inline-flex items-center gap-2 ${deleteModal.mode === 'hard' ? 'bg-[#ef4444] hover:bg-red-600' : 'bg-[#f59e0b] hover:bg-amber-600'}`}>
                  {actionLoading === 'delete' && <Loader2 className="w-4 h-4 animate-spin" />}
                  {deleteModal.mode === 'hard' ? 'Permanently Delete' : 'Unpublish'}
                </button>
              </div>
            </div>
          </div>
        )}
      </AdminLayout>
    </>
  );
}

// ─── Sub-Components ───────────────────────────────────────────────────────────

interface FormSectionProps {
  title: string;
  icon: React.ReactElement;
  isCollapsed: boolean;
  onToggle: () => void;
  required?: boolean;
  children: React.ReactNode;
}

function FormSection({ title, icon, isCollapsed, onToggle, required, children }: FormSectionProps): React.ReactElement {
  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      <button type="button" onClick={onToggle} className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
        <div className="flex items-center gap-3 text-left">
          <div className="w-9 h-9 rounded-xl bg-[#029bba]/10 text-[#029bba] flex items-center justify-center flex-shrink-0">{icon}</div>
          <div>
            <div className="font-bold text-gray-900 flex items-center gap-2">
              {title}
              {required && <span className="text-xs font-semibold text-[#ef4444]">REQUIRED</span>}
            </div>
          </div>
        </div>
        {isCollapsed ? <ChevronDown className="w-5 h-5 text-gray-400" /> : <ChevronUp className="w-5 h-5 text-gray-400" />}
      </button>
      {!isCollapsed && <div className="px-5 pb-5 pt-2 border-t border-gray-100">{children}</div>}
    </div>
  );
}

interface FormFieldProps {
  label: string;
  required?: boolean;
  optional?: boolean;
  error?: string[];
  children: React.ReactNode;
}

function FormField({ label, required, optional, error, children }: FormFieldProps): React.ReactElement {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-2">
        {label}
        {required && <span className="text-[#ef4444] ml-1">*</span>}
        {optional && <span className="text-xs font-normal text-gray-400 ml-2">(optional)</span>}
      </label>
      {children}
      {error && error.length > 0 && (
        <p className="text-xs text-[#ef4444] mt-1 flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" /> {error[0]}
        </p>
      )}
    </div>
  );
}

function FieldHint({ children }: { children: React.ReactNode }): React.ReactElement {
  return <p className="text-[11px] text-gray-500 mt-1">{children}</p>;
}

interface ScoreInputProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
}

function ScoreInput({ label, value, onChange }: ScoreInputProps): React.ReactElement {
  const numValue = parseInt(value, 10) || 0;
  const scoreColor = numValue >= 75 ? 'text-[#10b981]' : numValue >= 50 ? 'text-[#f59e0b]' : 'text-gray-400';
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-700 mb-1">{label}</label>
      <div className="relative">
        <input type="number" min="0" max="100" value={value} onChange={(e) => onChange(e.target.value)} className="w-full h-10 pl-3 pr-12 rounded-lg border border-gray-300 text-sm focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/10 outline-none" />
        <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold ${scoreColor}`}>{numValue}</span>
      </div>
    </div>
  );
}

interface ToggleFieldProps {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  icon: React.ReactElement;
  activeColor: string;
}

function ToggleField({ label, description, checked, onChange, icon, activeColor }: ToggleFieldProps): React.ReactElement {
  return (
    <label className="flex items-center gap-3 p-4 rounded-xl border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-white transition-colors" style={{ backgroundColor: checked ? activeColor : '#9ca3af' }}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-gray-900 text-sm">{label}</div>
        <div className="text-xs text-gray-500">{description}</div>
      </div>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="w-5 h-5 rounded accent-[#029bba] flex-shrink-0" />
    </label>
  );
}

interface StatRowProps {
  label: string;
  value: string;
  color?: string;
  small?: boolean;
}

function StatRow({ label, value, color, small }: StatRowProps): React.ReactElement {
  return (
    <div className="flex items-center justify-between">
      <span className={`text-gray-600 ${small ? 'text-xs' : ''}`}>{label}</span>
      <span className={`font-semibold capitalize ${color || 'text-gray-900'} ${small ? 'text-xs' : ''}`}>{value}</span>
    </div>
  );
}