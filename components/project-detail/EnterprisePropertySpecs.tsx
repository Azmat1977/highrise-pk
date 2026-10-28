'use client';

import React from 'react';
import { 
  Settings2, Zap, Flame, Droplets, ArrowUpDown, 
  Car, ShieldCheck, Box, Building2, PaintBucket,
  LayoutDashboard, DoorOpen, Utensils, Bath, Wind, 
  Siren, ArrowUpRight
} from 'lucide-react';
import type { ProjectDetailData } from '@/types/projectDetail';

export default function EnterprisePropertySpecs({ project }: { project: ProjectDetailData }) {
  
  const projAny = project as Record<string, any>;
  const utilities = projAny.feeTransparency || {};
  const floors = project.floorDetails || projAny.societyDetails || {};
  const finishing = projAny.finishingSpecs || {};
  
  const SpecRow = ({ label, value, icon: Icon, isHighlight = false }: { label: string; value: React.ReactNode; icon: React.ComponentType<{ className?: string }>; isHighlight?: boolean; }) => {
    if (!value && value !== 0 && value !== false) return null;
    return (
      <div className="flex items-start justify-between py-3 border-b border-gray-100 last:border-0 group">
        <div className="flex items-center gap-2.5">
          <Icon className={`w-4 h-4 mt-0.5 ${isHighlight ? 'text-[#029bba]' : 'text-gray-400 group-hover:text-gray-600 transition-colors'}`} />
          <span className="text-sm font-semibold text-gray-600 group-hover:text-gray-900 transition-colors pr-2">{label}</span>
        </div>
        <div className="text-sm font-bold text-gray-900 text-right max-w-[55%] leading-tight">
          {value}
        </div>
      </div>
    );
  };

  const deliveryLabel = {
    grey_structure: 'Grey Structure (Unfinished)',
    semi_furnished: 'Semi-Furnished (Standard)',
    fully_furnished: 'Fully Furnished (Turnkey)'
  }[finishing.deliveryCondition as string] || 'Developer Defined';

  return (
    <section id="specs" className="scroll-mt-24">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between gap-3 bg-gradient-to-r from-gray-50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#004063]/10 flex items-center justify-center shrink-0">
              <Settings2 className="w-4 h-4 text-[#004063]" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Infrastructure &amp; Handover</h2>
              <p className="text-xs text-gray-500 mt-0.5">Physical scale, utilities, and what you get on possession</p>
            </div>
          </div>
        </div>

        <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-x-12 gap-y-8">
          
          {/* COLUMN 1: Utilities & Structural */}
          <div className="space-y-8">
            <div>
              <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-4 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#029bba]" /> Utilities & Power
              </h3>
              <div className="bg-gray-50/50 rounded-xl p-4 border border-gray-100">
                <SpecRow icon={Zap} label="Electricity (WAPDA)" value={utilities.electricityIncluded ? <span className="text-emerald-600">Active Connection</span> : 'Independent Meter Required'} />
                <SpecRow icon={Flame} label="Sui Gas" value={utilities.gasIncluded ? <span className="text-emerald-600">Active Connection</span> : <span className="text-amber-600">Subject to Govt Policy</span>} />
                <SpecRow icon={Droplets} label="Water Supply" value={utilities.waterIncluded ? 'WASA / Society Supplied' : 'Bore/Tubewell'} />
                <SpecRow icon={Zap} label="Backup Power" value={<span className="text-[#029bba]">24/7 Generator (Common Areas)</span>} isHighlight />
              </div>
            </div>

            <div>
              <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-4 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#004063]" /> Structural Scale
              </h3>
              <div className="bg-gray-50/50 rounded-xl p-4 border border-gray-100">
                <SpecRow icon={Building2} label="Total Floors" value={floors.totalFloors || (projAny.totalFloors ? `${projAny.totalFloors} Floors` : 'Developer Managed')} />
                <SpecRow icon={Car} label="Parking Levels" value={floors.floorsForParking || floors.parkingFloors ? `${floors.floorsForParking || floors.parkingFloors} Dedicated Basement(s)` : 'Ground / Open Parking'} />
                <SpecRow icon={Box} label="Total Units" value={project.totalUnits ? `${project.totalUnits} Units` : 'Varies by Layout'} />
              </div>
            </div>
          </div>

          {/* COLUMN 2: Handover Specs & Safety */}
          <div className="space-y-8">
            <div>
              <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-4 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]" /> Interior Finishing & Handover
              </h3>
              <div className="bg-gray-50/50 rounded-xl p-4 border border-gray-100">
                <SpecRow icon={PaintBucket} label="Delivery Condition" value={<span className="text-[#004063]">{deliveryLabel}</span>} />
                <SpecRow icon={LayoutDashboard} label="Flooring" value={finishing.flooring || 'TBD by Developer'} />
                <SpecRow icon={DoorOpen} label="Woodwork & Doors" value={finishing.woodwork || 'TBD by Developer'} />
                <SpecRow icon={Utensils} label="Kitchen Deliverables" value={finishing.kitchen || 'TBD by Developer'} />
                <SpecRow icon={Bath} label="Washroom Fittings" value={finishing.washrooms || 'TBD by Developer'} />
                <SpecRow icon={ShieldCheck} label="Windows & Glazing" value={finishing.windows || 'Aluminum with safety grills'} />
              </div>
            </div>

            <div>
              <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-4 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500" /> Commercial & Safety Standards
              </h3>
              <div className="bg-gray-50/50 rounded-xl p-4 border border-gray-100">
                <SpecRow icon={Wind} label="HVAC / Climate" value={finishing.hvac || 'Split AC provisioned'} />
                <SpecRow icon={Siren} label="Fire Safety" value={finishing.fireSafety || 'Emergency exits and extinguishers'} />
                <SpecRow icon={ArrowUpDown} label="Elevators" value="High-Speed Passenger & Cargo Lifts" />
                <SpecRow icon={ArrowUpRight} label="Commercial Mobility" value={finishing.commercialMobility || 'Staircase / Lift Access'} />
              </div>
            </div>
          </div>

        </div>

        {/* Bottom Footer Note */}
        <div className="bg-blue-50/50 px-6 py-4 border-t border-blue-100 flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
          <p className="text-xs text-blue-800 leading-relaxed font-medium">
            <strong className="text-blue-900">Important Note:</strong> Handover specifications and finishing materials 
            (brands, tiles, wood types) are provided by the developer and are subject to availability at the time of possession. 
            Always confirm exact deliverables in your final booking contract.
          </p>
        </div>

      </div>
    </section>
  );
}