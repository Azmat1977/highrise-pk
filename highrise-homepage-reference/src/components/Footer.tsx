import React from 'react';
import { Link } from 'react-router-dom';
import { Building2, ShieldCheck, Mail, Phone, MapPin, Globe } from 'lucide-react';
import { PropertyResearchTool } from '../types/index.ts';

interface FooterProps {
  onOpenTool: (tool: PropertyResearchTool) => void;
}

export const Footer: React.FC<FooterProps> = ({ onOpenTool }) => {
  return (
    <footer className="bg-[#002236] text-slate-300 pt-16 pb-12 border-t border-[#004063]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-12 border-b border-slate-700/60">
          {/* Brand Info */}
          <div className="lg:col-span-2 space-y-4">
            <Link to="/" className="inline-block group focus:outline-none" aria-label="Highrise.pk Home">
              <div className="bg-white/95 rounded-2xl p-2.5 sm:p-3.5 shadow-lg inline-block transition-transform duration-200 group-hover:scale-105 border border-white/20">
                <img
                  src="/assets/aistudio/Highrise_824d53ac.png"
                  alt="Highrise.pk Logo"
                  className="h-16 sm:h-20 w-auto object-contain"
                />
              </div>
            </Link>

            <p className="text-sm sm:text-base font-bold text-[#8fc2d0]">
              Elevating Real Estate in Pakistan.
            </p>

            <p className="text-xs text-slate-400 leading-relaxed max-w-sm">
              Pakistan's trusted property discovery & intelligence platform. Helping families and overseas Pakistanis discover verified properties, compare developments, evaluate builders, and understand payment plans with full transparency.
            </p>

            <div className="flex items-center gap-3 pt-2">
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-[#029bba]/20 text-[#38aec7] border border-[#029bba]/30 inline-flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                Transparency First
              </span>
            </div>
          </div>

          {/* Column 1: Properties */}
          <div>
            <h4 className="font-heading font-semibold text-white text-xs uppercase tracking-wider mb-4">
              Explore Properties
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/properties?purpose=buy" className="hover:text-[#38aec7] transition-colors">
                  Properties for Sale
                </Link>
              </li>
              <li>
                <Link to="/properties?purpose=rent" className="hover:text-[#38aec7] transition-colors">
                  Properties for Rent
                </Link>
              </li>
              <li>
                <Link to="/properties?city=Islamabad" className="hover:text-[#38aec7] transition-colors">
                  Properties in Islamabad
                </Link>
              </li>
              <li>
                <Link to="/properties?city=Lahore" className="hover:text-[#38aec7] transition-colors">
                  Properties in Lahore
                </Link>
              </li>
              <li>
                <Link to="/properties?city=Karachi" className="hover:text-[#38aec7] transition-colors">
                  Properties in Karachi
                </Link>
              </li>
              <li>
                <Link to="/properties?category=house" className="hover:text-[#38aec7] transition-colors">
                  Houses & Villas
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 2: Projects & Developers */}
          <div>
            <h4 className="font-heading font-semibold text-white text-xs uppercase tracking-wider mb-4">
              Developments
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/projects" className="hover:text-[#38aec7] transition-colors">
                  All Developments
                </Link>
              </li>
              <li>
                <Link to="/projects?status=under-construction" className="hover:text-[#38aec7] transition-colors">
                  Under Construction
                </Link>
              </li>
              <li>
                <Link to="/projects?status=ready-to-move" className="hover:text-[#38aec7] transition-colors">
                  Ready to Move
                </Link>
              </li>
              <li>
                <Link to="/projects#developers" className="hover:text-[#38aec7] transition-colors">
                  Featured Developers
                </Link>
              </li>
              <li>
                <Link to="/projects/the-centaurus-residences-ii" className="hover:text-[#38aec7] transition-colors">
                  The Centaurus II Towers
                </Link>
              </li>
              <li>
                <Link to="/projects/crescent-mall-residencia" className="hover:text-[#38aec7] transition-colors">
                  Crescent Mall & Residencia
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Property Intelligence & Tools */}
          <div>
            <h4 className="font-heading font-semibold text-white text-xs uppercase tracking-wider mb-4">
              Intelligence Tools
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <button
                  type="button"
                  onClick={() => onOpenTool('valuation')}
                  className="hover:text-[#38aec7] transition-colors text-left font-semibold text-white flex items-center gap-1.5"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[#38aec7]" />
                  <span>Property Market Valuation</span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onOpenTool('converter')}
                  className="hover:text-[#38aec7] transition-colors text-left"
                >
                  Area Converter (Marla/Kanal)
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onOpenTool('construction')}
                  className="hover:text-[#38aec7] transition-colors text-left"
                >
                  Construction Cost Estimator
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onOpenTool('installment')}
                  className="hover:text-[#38aec7] transition-colors text-left"
                >
                  Installment Calculator
                </button>
              </li>
              <li>
                <Link to="/properties" className="hover:text-[#38aec7] transition-colors">
                  Property Search Filters
                </Link>
              </li>
              <li>
                <span className="text-slate-400 cursor-not-allowed">
                  NOC Status Verification Guide
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom row */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <p>© 2016 Highrise.pk. All rights reserved.</p>
          <div className="flex flex-wrap gap-5 text-slate-400">
            <Link to="/properties" className="hover:text-white transition-colors">
              Privacy Policy
            </Link>
            <Link to="/properties" className="hover:text-white transition-colors">
              Terms of Service
            </Link>
            <Link to="/projects" className="hover:text-white transition-colors">
              NOC Disclaimer
            </Link>
            <a
              href="mailto:contact@highrise.pk"
              className="hover:text-[#38aec7] transition-colors"
            >
              contact@highrise.pk
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};
