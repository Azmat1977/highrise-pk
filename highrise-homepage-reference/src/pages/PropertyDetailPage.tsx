import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  Heart, 
  Share2, 
  MapPin, 
  Bed, 
  Bath, 
  Maximize, 
  Building, 
  Calendar, 
  CheckCircle, 
  ShieldCheck, 
  Layers, 
  Compass, 
  Info,
  Check,
  ArrowRight
} from 'lucide-react';
import { SAMPLE_PROPERTIES } from '../data/mockData.ts';
import { Breadcrumbs } from '../components/Breadcrumbs.tsx';
import { PropertyGallery } from '../components/PropertyGallery.tsx';
import { VerificationBadge } from '../components/VerificationBadge.tsx';
import { EnquiryForm } from '../components/EnquiryForm.tsx';
import { PropertyCard } from '../components/PropertyCard.tsx';

export const PropertyDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();

  // Locate the property by slug or id, or fallback to the first sample property
  const property =
    SAMPLE_PROPERTIES.find((p) => p.slug === slug || p.id === slug) ||
    SAMPLE_PROPERTIES[0];

  const [isFavorite, setIsFavorite] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);

  const handleShare = () => {
    navigator.clipboard?.writeText(window.location.href);
    setCopiedShare(true);
    setTimeout(() => setCopiedShare(false), 2500);
  };

  // Find similar properties in the same city or category
  const similarProperties = SAMPLE_PROPERTIES.filter(
    (p) => p.id !== property.id && (p.city === property.city || p.category === property.category)
  ).slice(0, 3);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
      {/* SECTION A: BREADCRUMBS & PROPERTY HEADING */}
      <div className="space-y-4">
        <Breadcrumbs
          items={[
            { label: 'Properties', path: '/properties' },
            { label: property.city, path: `/properties?city=${property.city}` },
            { label: property.title },
          ]}
        />

        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6 pb-4 border-b border-slate-200">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`px-3 py-1 rounded-md text-xs font-semibold uppercase tracking-wider text-white ${
                  property.purpose === 'buy' ? 'bg-[#004063]' : 'bg-[#029bba]'
                }`}
              >
                For {property.purpose === 'buy' ? 'Sale' : 'Rent'}
              </span>
              <span className="px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-700">
                {property.categoryLabel}
              </span>
              <VerificationBadge
                status={property.verificationStatus}
                label={property.verificationLabel}
              />
            </div>

            <h1 className="font-heading font-extrabold text-2xl sm:text-3xl lg:text-4xl text-slate-900 tracking-tight leading-tight">
              {property.title}
            </h1>

            <p className="text-xs sm:text-sm text-slate-600 flex items-center gap-1.5 font-medium">
              <MapPin className="w-4 h-4 text-[#029bba] shrink-0" />
              <span>{property.address}</span>
            </p>
          </div>

          <div className="flex flex-col sm:flex-row lg:flex-col items-start lg:items-end justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-wider text-slate-500 font-medium">Asking Price</p>
              <p className="text-2xl sm:text-3xl font-extrabold font-heading text-[#004063]">
                {property.priceFormatted}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleShare}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              >
                {copiedShare ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span className="text-emerald-700 font-semibold">Link Copied!</span>
                  </>
                ) : (
                  <>
                    <Share2 className="w-4 h-4 text-slate-500" />
                    <span>Share</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setIsFavorite(!isFavorite)}
                aria-label="Add to favorites"
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border text-xs font-medium transition-colors ${
                  isFavorite
                    ? 'bg-rose-50 border-rose-200 text-rose-600'
                    : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Heart className={`w-4 h-4 ${isFavorite ? 'fill-current text-rose-500' : 'text-slate-500'}`} />
                <span>{isFavorite ? 'Saved' : 'Save'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION B: IMAGE GALLERY */}
      <PropertyGallery images={property.images} title={property.title} />

      {/* SECTION C: MAIN CONTENT & ENQUIRY SIDEBAR */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Main Details (8 Columns) */}
        <div className="lg:col-span-8 space-y-8">
          {/* Key Facts Grid */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
            <h2 className="font-heading font-bold text-slate-900 text-base mb-4">
              Property Specifications
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-slate-500 block text-[10px] uppercase font-semibold">Land Size</span>
                <span className="font-bold text-slate-900 text-sm mt-0.5 block">
                  {property.size} {property.sizeUnit}
                </span>
              </div>

              {property.coveredAreaSqFt && (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-500 block text-[10px] uppercase font-semibold">Covered Area</span>
                  <span className="font-bold text-slate-900 text-sm mt-0.5 block">
                    {property.coveredAreaSqFt.toLocaleString()} Sq. Ft.
                  </span>
                </div>
              )}

              {property.bedrooms !== undefined && (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-500 block text-[10px] uppercase font-semibold">Bedrooms</span>
                  <span className="font-bold text-slate-900 text-sm mt-0.5 block">
                    {property.bedrooms} Beds
                  </span>
                </div>
              )}

              {property.bathrooms !== undefined && (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-500 block text-[10px] uppercase font-semibold">Bathrooms</span>
                  <span className="font-bold text-slate-900 text-sm mt-0.5 block">
                    {property.bathrooms} Baths
                  </span>
                </div>
              )}

              {property.floor && (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-500 block text-[10px] uppercase font-semibold">Floor Level</span>
                  <span className="font-semibold text-slate-900 text-xs mt-0.5 block">
                    {property.floor}
                  </span>
                </div>
              )}

              {property.furnishing && (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-500 block text-[10px] uppercase font-semibold">Furnishing</span>
                  <span className="font-semibold text-slate-900 text-xs mt-0.5 block">
                    {property.furnishing}
                  </span>
                </div>
              )}

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-slate-500 block text-[10px] uppercase font-semibold">Purpose</span>
                <span className="font-semibold text-slate-900 text-xs mt-0.5 block capitalize">
                  For {property.purpose}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-slate-500 block text-[10px] uppercase font-semibold">Listed On</span>
                <span className="font-semibold text-slate-900 text-xs mt-0.5 block">
                  {property.publishedDate}
                </span>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-3">
            <h2 className="font-heading font-bold text-slate-900 text-lg">
              Property Description
            </h2>
            <p className="text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-line">
              {property.description}
            </p>
          </div>

          {/* Features and Amenities */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
            <h2 className="font-heading font-bold text-slate-900 text-lg">
              Key Features & Fixtures
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {property.features.map((feat, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-100 text-slate-800 font-medium"
                >
                  <CheckCircle className="w-4 h-4 text-[#029bba] shrink-0" />
                  <span>{feat}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Verification Scope Details */}
          <div className="bg-gradient-to-br from-cyan-50/70 to-slate-50 rounded-2xl p-6 border border-[#029bba]/30 shadow-xs space-y-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-[#029bba]" />
              <h3 className="font-heading font-bold text-[#004063] text-base">
                Verification Details & Title Scope
              </h3>
            </div>
            <p className="text-xs text-slate-700 leading-relaxed">
              {property.verificationDetails}
            </p>
            <div className="pt-2 text-[11px] text-slate-500 border-t border-[#029bba]/20">
              Highrise.pk prototype disclaimer: {property.sampleDisclaimer}
            </div>
          </div>

          {/* Location & Map Preview */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-heading font-bold text-slate-900 text-lg">
                  Location & Area Context
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {property.address}
                </p>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
                {property.city}
              </span>
            </div>

            {/* Illustrative Map Canvas */}
            <div className="relative h-64 rounded-xl overflow-hidden border border-slate-200 bg-slate-100 flex items-center justify-center text-center p-6">
              <div className="absolute inset-0 opacity-40 bg-[radial-gradient(#007196_1px,transparent_1px)] [background-size:16px_16px]" />
              <div className="relative z-10 space-y-2 max-w-sm">
                <div className="w-10 h-10 rounded-full bg-[#029bba] text-white flex items-center justify-center mx-auto shadow-md">
                  <MapPin className="w-5 h-5" />
                </div>
                <h4 className="font-heading font-bold text-slate-900 text-sm">
                  {property.area}, {property.city}
                </h4>
                <p className="text-[11px] text-slate-500 leading-tight">
                  Sample map boundary representation. In production integration, this mounts Google Maps Platform with geocoded coordinates.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar (4 Columns): Enquiry Form */}
        <div className="lg:col-span-4">
          <EnquiryForm
            title="Enquire About This Property"
            itemTitle={property.title}
            agentName={property.agent.name}
            agentAgency={property.agent.agency}
            agentPhone={property.agent.phone}
            agentAvatar={property.agent.avatar}
            type="property"
          />
        </div>
      </div>

      {/* SIMILAR PROPERTIES */}
      {similarProperties.length > 0 && (
        <div className="pt-8 border-t border-slate-200 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-heading font-bold text-xl sm:text-2xl text-slate-900">
                Similar Properties
              </h2>
              <p className="text-xs text-slate-500">
                Other sample listings in {property.city} or {property.categoryLabel} category.
              </p>
            </div>
            <Link
              to={`/properties?city=${property.city}`}
              className="text-xs font-semibold text-[#007196] hover:text-[#029bba] inline-flex items-center gap-1"
            >
              <span>Explore More in {property.city}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {similarProperties.map((p) => (
              <PropertyCard key={p.id} property={p} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
