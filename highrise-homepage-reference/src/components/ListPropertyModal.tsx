import React, { useState } from 'react';
import { X, Building, CheckCircle2, ArrowRight } from 'lucide-react';
import { PropertyPurpose } from '../types/index.ts';
import { formatPKR } from '../utils/formatters.ts';

interface ListPropertyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ListPropertyModal: React.FC<ListPropertyModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [purpose, setPurpose] = useState<PropertyPurpose>('buy');
  const [city, setCity] = useState('Islamabad');
  const [area, setArea] = useState('');
  const [category, setCategory] = useState('house');
  const [size, setSize] = useState('');
  const [price, setPrice] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [ownerPhone, setOwnerPhone] = useState('');
  const [submitted, setSubmitted] = useState(false);

  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSubmitted(false);
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!area || !size || !price || !ownerName || !ownerPhone) return;
    setSubmitted(true);
  };

  const handleClose = () => {
    setSubmitted(false);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={handleClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200 cursor-pointer"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 relative max-h-[90vh] overflow-y-auto cursor-default"
      >
        <button
          type="button"
          onClick={() => {
            setSubmitted(false);
            onClose();
          }}
          aria-label="Close list property modal"
          className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {!submitted ? (
          <div>
            <div className="flex items-center gap-3.5 mb-4">
              <img
                src="/assets/aistudio/Highrise_824d53ac.png"
                alt="Highrise.pk"
                className="h-11 w-auto object-contain"
              />
              <div>
                <h3 className="font-heading font-bold text-slate-900 text-lg">
                  List Your Property on Highrise.pk
                </h3>
                <p className="text-xs text-slate-600">
                  Connect with genuine verified buyers and overseas investors.
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 my-4">
              {/* Purpose Selector */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                  Property Purpose
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPurpose('buy')}
                    className={`py-2 px-3 rounded-xl text-xs font-medium border transition-all ${
                      purpose === 'buy'
                        ? 'border-[#004063] bg-[#004063] text-white shadow-xs'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Sell Property
                  </button>
                  <button
                    type="button"
                    onClick={() => setPurpose('rent')}
                    className={`py-2 px-3 rounded-xl text-xs font-medium border transition-all ${
                      purpose === 'rent'
                        ? 'border-[#029bba] bg-[#029bba] text-white shadow-xs'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Rent Out Property
                  </button>
                </div>
              </div>

              {/* City & Category */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                    City
                  </label>
                  <select
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-800"
                  >
                    <option value="Islamabad">Islamabad</option>
                    <option value="Rawalpindi">Rawalpindi</option>
                    <option value="Lahore">Lahore</option>
                    <option value="Karachi">Karachi</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-800"
                  >
                    <option value="house">House / Villa</option>
                    <option value="apartment">Apartment / Flat</option>
                    <option value="residential-plot">Residential Plot</option>
                    <option value="commercial-plot">Commercial Plot</option>
                    <option value="shop-office">Shop / Office</option>
                    <option value="farmhouse">Farmhouse</option>
                  </select>
                </div>
              </div>

              {/* Area / Society */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                  Area or Society
                </label>
                <input
                  type="text"
                  required
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  placeholder="e.g. DHA Phase 2, Sector B"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-800"
                />
              </div>

              {/* Size & Asking Price */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                    Size (e.g. 5 Marla / 1 Kanal)
                  </label>
                  <input
                    type="text"
                    required
                    value={size}
                    onChange={(e) => setSize(e.target.value)}
                    placeholder="e.g. 5 Marla"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                    Asking Price (PKR)
                  </label>
                  <input
                    type="number"
                    required
                    min="1000"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="e.g. 28000000"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-800"
                  />
                </div>
              </div>

              {price && (
                <p className="text-xs text-[#007196] font-medium">
                  Estimated Preview: {formatPKR(parseFloat(price) || 0, purpose === 'rent')}
                </p>
              )}

              {/* Owner Contact */}
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                    Your Name
                  </label>
                  <input
                    type="text"
                    required
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    placeholder="e.g. Asim Raza"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                    WhatsApp / Phone
                  </label>
                  <input
                    type="tel"
                    required
                    value={ownerPhone}
                    onChange={(e) => setOwnerPhone(e.target.value)}
                    placeholder="+92 300 0000000"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-800"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-[#004063] hover:bg-[#007196] text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2 shadow-xs"
                >
                  <span>Submit Listing (Prototype)</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="py-6 text-center">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h4 className="font-heading font-bold text-slate-900 text-lg mb-2">
              Listing Submission Received (Prototype)
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed max-w-sm mx-auto mb-6">
              Thank you, <strong>{ownerName}</strong>! Your listing for <strong>{size} in {area}, {city}</strong> has been received by the prototype engine. No external database write has occurred.
            </p>
            <button
              type="button"
              onClick={() => {
                setSubmitted(false);
                onClose();
              }}
              className="px-6 py-2 rounded-xl bg-[#004063] text-white text-xs font-semibold hover:bg-[#007196] transition-colors"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
