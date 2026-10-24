import React, { useState } from 'react';
import { Phone, Mail, Send, CheckCircle2, ShieldCheck, User } from 'lucide-react';

interface EnquiryFormProps {
  title: string;
  itemTitle: string;
  agentName?: string;
  agentAgency?: string;
  agentPhone?: string;
  agentAvatar?: string;
  type?: 'property' | 'project' | 'site-visit';
}

export const EnquiryForm: React.FC<EnquiryFormProps> = ({
  title,
  itemTitle,
  agentName = 'Highrise Advisory Desk',
  agentAgency = 'Verified Partner Network',
  agentPhone = '+92 51 111 444 747',
  agentAvatar,
  type = 'property',
}) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState(
    type === 'site-visit'
      ? `I would like to schedule a site inspection visit for ${itemTitle}.`
      : `Hello, I am interested in ${itemTitle}. Please share verified details and pricing.`
  );
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone) return;
    setSubmitted(true);
  };

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-lg sticky top-28">
      {/* Agent / Representative Header */}
      <div className="flex items-center gap-3.5 pb-4 border-b border-slate-100 mb-4">
        {agentAvatar ? (
          <img
            src={agentAvatar}
            alt={agentName}
            className="w-12 h-12 rounded-full object-cover border-2 border-[#029bba]"
          />
        ) : (
          <div className="w-12 h-12 rounded-full bg-[#004063] text-white flex items-center justify-center font-heading font-bold text-base shadow-xs">
            {agentName.slice(0, 2).toUpperCase()}
          </div>
        )}
        <div>
          <h4 className="font-heading font-bold text-slate-900 text-sm">
            {agentName}
          </h4>
          <p className="text-xs text-slate-600 font-medium">
            {agentAgency}
          </p>
          <span className="inline-flex items-center gap-1 text-[11px] text-[#007196] font-semibold mt-0.5">
            <ShieldCheck className="w-3.5 h-3.5 text-[#029bba]" />
            Verified Representative (Sample)
          </span>
        </div>
      </div>

      {!submitted ? (
        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <h5 className="font-heading font-semibold text-slate-900 text-sm mb-1">
              {title}
            </h5>
            <p className="text-xs text-slate-600 truncate mb-3">
              Regarding: <strong>{itemTitle}</strong>
            </p>
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-600 mb-1">
              Full Name *
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Asad Khan"
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#029bba]"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-600 mb-1">
              Phone / WhatsApp Number *
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+92 300 1234567"
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#029bba]"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-600 mb-1">
              Email Address (Optional)
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="asad@example.com"
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#029bba]"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-600 mb-1">
              Your Message
            </label>
            <textarea
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#029bba] resize-none"
            />
          </div>

          <button
            type="submit"
            className="w-full py-2.5 rounded-xl bg-[#004063] hover:bg-[#029bba] text-white font-semibold text-xs shadow-md transition-all duration-200 flex items-center justify-center gap-2"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Send Enquiry (Prototype)</span>
          </button>

          <p className="text-[10px] text-slate-600 text-center leading-tight">
            Protected under Highrise.pk sample privacy guidelines. No external transmission.
          </p>
        </form>
      ) : (
        <div className="py-6 text-center space-y-3">
          <div className="w-12 h-12 mx-auto rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h5 className="font-heading font-bold text-slate-900 text-base">
            Enquiry Received (Prototype)
          </h5>
          <p className="text-xs text-slate-600 leading-relaxed">
            Thank you, <strong>{name}</strong>! Your demonstration enquiry has been logged locally in prototype state. Because this is a frontend prototype, no real message or SMS was sent to external owners.
          </p>
          <button
            type="button"
            onClick={() => setSubmitted(false)}
            className="mt-2 px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-semibold hover:bg-slate-200 transition-colors"
          >
            Submit Another Query
          </button>
        </div>
      )}
    </div>
  );
};
