// components/aria/AriaChat.tsx
// Highrise.pk — Aleem AI chat interface
// V6.4.1 — Improved UI: larger text, prominent buttons, mobile-friendly
// NO framer-motion | NO external modal lib | NO axios

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
} from 'react';
import type { IAriaContext } from '@/models/Conversation';
import {
  Send,
  X,
  Loader2,
  MessageCircle,
  Phone,
  User,
  Mail,
  CheckCircle,
  Minimize2,
  Bot,
  Home,
  TrendingUp,
  ShoppingCart,
  Search,
  PhoneCall,
  ShieldCheck,
} from 'lucide-react';
import { useSession } from 'next-auth/react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Message {
  id:        string;
  role:      'user' | 'assistant';
  content:   string;
  timestamp: Date;
}

interface LeadForm {
  name:       string;
  phone:      string;
  email:      string;
  intent:     string;
  urgency:    string;
  budgetTier: string;
  message:    string;
}

type QuotaMode = 'normal' | 'priority' | 'lead_only';

interface AriaChatProps {
  context:    IAriaContext;
  sessionId:  string;
  onMinimize: () => void;
  onClose:    () => void;
}

/** Verified listing card returned by the grounded ALEEM search. */
interface AleemListing {
  slug:         string;
  title:        string;
  city:         string;
  society:      string;
  propertyType: string;
  listingType:  string;
  price:        number;
  area:         number;
  unit:         string;
  imageUrl:     string | null;
  isFeatured:   boolean;
}

/** Response contract of POST /api/ai/chat. */
interface AleemChatResponse {
  success?:      boolean;
  response?:     string;
  listings?:     AleemListing[];
  conversationId?: string | null;
  requiresAuth?: boolean;
  grounded?:     boolean;
  message?:      string;
  requestId?:    string;
}

// ─── Quick reply buttons (context-aware) ─────────────────────────────────────

const QUICK_REPLIES_GENERAL = [
  { label: 'Buy', value: 'Mujhe property khareedni hai' },
  { label: 'Rent', value: 'Kiraye par ghar chahiye' },
  { label: 'Check NOC', value: 'Society ka NOC check karna hai' },
  { label: 'Find listings', value: '5 marla plot B-17 mein, 60 lakh tak' },
];

const QUICK_REPLIES_PROPERTY = [
  { label: '💰 Is price negotiable?', value: 'Is the price negotiable for this property?' },
  { label: '📅 Schedule visit', value: 'I would like to schedule a site visit.' },
  { label: '🏦 Home loan available?', value: 'Can I get a home loan for this property?' },
  { label: '📄 Documents needed?', value: 'What documents are required for this purchase?' },
];

const QUICK_REPLIES_SOCIETY = [ 
  { label: '📋 NOC details', value: 'Tell me more about the NOC status of this society.' },
  { label: 'ً💰 Verified listings here', value: 'Show me verified listings available in this society.' },
  { label: '⚠️ Any risks?', value: 'Are there any risks I should know about before investing?' },
  { label: '📅 Schedule visit', value: 'I would like to visit this society.' },
];

function getQuickReplies(context: IAriaContext): typeof QUICK_REPLIES_GENERAL {
  if (context.type === 'property') return QUICK_REPLIES_PROPERTY;
  if (context.type === 'society')  return QUICK_REPLIES_SOCIETY;
  return QUICK_REPLIES_GENERAL;
}

// ─── Budget tier options ──────────────────────────────────────────────────────

const BUDGET_TIERS = [
  { value: 'under_50L', label: 'Under 50 Lakh' },
  { value: '50L_1Cr',   label: '50L – 1 Crore'  },
  { value: '1Cr_3Cr',   label: '1 – 3 Crore'    },
  { value: '3Cr_5Cr',   label: '3 – 5 Crore'    },
  { value: 'above_5Cr', label: 'Above 5 Crore'  },
];

const URGENCY_OPTIONS = [
  { value: 'immediate',       label: 'ASAP'           },
  { value: 'within_month',    label: 'Within a month' },
  { value: 'within_3months',  label: 'Within 3 months'},
  { value: 'exploring',       label: 'Just exploring' },
];

const INTENT_OPTIONS = [
  { value: 'buy',     label: '🏠 Buy',     icon: ShoppingCart },
  { value: 'rent',    label: '🔑 Rent',    icon: Home         },
  { value: 'invest',  label: '📈 Invest',  icon: TrendingUp   },
  { value: 'verify',  label: '🔍 Verify',  icon: Search       },
];

// ─── Message bubble (LARGER TEXT) ─────────────────────────────────────────────

function MessageBubble({ message }: { message: Message }): React.ReactElement {
  const isUser = message.role === 'user';
  return (
    <div className={`flex items-end gap-2 mb-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Avatar */}
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#029bba] to-[#004063] flex items-center justify-center flex-shrink-0 mb-1">
          <Bot className="w-4 h-4 text-white" />
        </div>
      )}
      {/* Bubble — text-[15px] for better readability */}
      <div
        className={`max-w-[80%] px-4 py-3 rounded-2xl text-[15px] leading-relaxed ${
          isUser
            ? 'bg-[#029bba] text-white rounded-br-sm'
            : 'bg-white text-gray-800 border border-gray-100 rounded-bl-sm shadow-sm'
        }`}
      >
        {message.content}
      </div>
    </div>
  );
}

// ─── Typing indicator ─────────────────────────────────────────────────────────

function TypingIndicator(): React.ReactElement {
  return (
    <div className="flex items-end gap-2 mb-3">
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#029bba] to-[#004063] flex items-center justify-center flex-shrink-0">
        <Bot className="w-4 h-4 text-white" />
      </div>
      <div className="bg-white border border-gray-100 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  );
}

// ─── Lead capture form (LARGER INPUTS) ────────────────────────────────────────

interface LeadFormProps {
  context:        IAriaContext;
  sessionId:      string;
  quotaMode?:     QuotaMode;
  onSuccess:      () => void;
  onClose:        () => void;
}

function LeadCaptureForm({
  context,
  sessionId,
  quotaMode = 'normal',
  onSuccess,
  onClose,
}: LeadFormProps): React.ReactElement {

  const [form, setForm] = useState<LeadForm>({
    name: '', phone: '', email: '',
    intent: 'buy', urgency: 'exploring',
    budgetTier: '', message: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!form.name.trim())  { setError('Please enter your name.'); return; }
    if (!form.phone.trim()) { setError('Please enter your phone number.'); return; }

    setSubmitting(true);
    try {
      // ALEEM is the single lead path. The legacy /api/aria/leads endpoint
      // built its own Lead records with placeholder values, so it is no
      // longer used. Only the property slug is sent; the server re-reads the
      // listing itself rather than trusting a client snapshot.
      const res = await fetch('/api/aleem/lead', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name:         form.name.trim(),
          phone:        form.phone.trim(),
          email:        form.email.trim() || undefined,
          intent:       form.intent,
          message:      form.message.trim() || undefined,
          propertySlug: context.type === 'property' ? context.slug : undefined,
          sessionId,
        }),
      });

      const data = await res.json() as { success?: boolean; error?: string; leadId?: string };
      if (!res.ok || !data.success) {
        setError(data.error ?? 'Unable to submit. Please try again.');
        return;
      }
      onSuccess();
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }, [form, sessionId, context, onSuccess]);

   return (
    <form onSubmit={handleSubmit} className="p-4 bg-[#f0f9ff] border-t border-[#029bba]/20">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <p className="text-sm font-semibold text-[#004063] flex items-center gap-2">
            <User className="w-4 h-4" />
            Talk to a Highrise expert
          </p>
          <p className="text-xs text-gray-600 mt-0.5">
            Share your details and our team will reach out. No spam, no pressure.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close form"
          className="p-1.5 -mt-1 -mr-1 rounded-lg text-[#004063]/60 hover:text-[#004063] hover:bg-white transition-colors focus:outline-none focus:ring-2 focus:ring-[#029bba] flex-shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Intent buttons (LARGER) */}
      <div className="flex gap-1.5 mb-3 flex-wrap">
        {INTENT_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setForm((f) => ({ ...f, intent: opt.value }))}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              form.intent === opt.value
                ? 'bg-[#029bba] text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Name (text-base prevents iOS zoom) */}
      <div className="mb-2.5">
        <input
          type="text"
          placeholder="Your Name *"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          className="w-full px-3.5 py-3 text-base border border-gray-200 rounded-xl focus:outline-none focus:border-[#029bba] bg-white"
          maxLength={100}
        />
      </div>

      {/* Phone (text-base prevents iOS zoom) */}
      <div className="mb-2.5">
        <div className="relative">
          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="tel"
            placeholder="03xx-xxxxxxx *"
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            className="w-full pl-10 pr-3.5 py-3 text-base border border-gray-200 rounded-xl focus:outline-none focus:border-[#029bba] bg-white"
            maxLength={15}
          />
        </div>
      </div>

      {/* Email (optional, text-base) */}
      <div className="mb-2.5">
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="email"
            placeholder="Email (optional)"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            className="w-full pl-10 pr-3.5 py-3 text-base border border-gray-200 rounded-xl focus:outline-none focus:border-[#029bba] bg-white"
          />
        </div>
      </div>

      {/* Budget + Urgency row */}
      <div className="grid grid-cols-2 gap-2 mb-2.5">
        <select
          value={form.budgetTier}
          onChange={(e) => setForm((f) => ({ ...f, budgetTier: e.target.value }))}
          className="px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-[#029bba] bg-white text-gray-700"
        >
          <option value="">Budget range</option>
          {BUDGET_TIERS.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
        <select
          value={form.urgency}
          onChange={(e) => setForm((f) => ({ ...f, urgency: e.target.value }))}
          className="px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-[#029bba] bg-white text-gray-700"
        >
          {URGENCY_OPTIONS.map((u) => (
            <option key={u.value} value={u.value}>{u.label}</option>
          ))}
        </select>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-2 px-3 py-2 bg-[#fef2f2] border-l-4 border-[#ef4444] text-red-700 text-sm rounded-lg">
          {error}
        </div>
      )}

      {/* Submit button (LARGER) */}
      <button
        type="submit"
        disabled={submitting}
        className="w-full py-3 bg-[#029bba] text-white rounded-xl text-base font-semibold hover:bg-[#027a94] disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
      >
        {submitting ? (
          <><Loader2 className="w-5 h-5 animate-spin" /> Submitting...</>
        ) : (
          'Submit — Our Team Will Call You'
        )}
      </button>

      <p className="text-xs text-gray-500 text-center mt-2.5 flex items-center justify-center gap-1.5">
        <ShieldCheck className="w-3.5 h-3.5 text-[#10b981] flex-shrink-0" />
        Your number stays private. Highrise connects you, sellers never get it directly.
      </p>
    </form>
  );
}

// ─── Main chat component ──────────────────────────────────────────────────────

export default function AriaChat({
  context,
  sessionId,
  onMinimize,
  onClose,
}: AriaChatProps): React.ReactElement {

  const { data: session } = useSession();
  const [messages,        setMessages]         = useState<Message[]>([]);
  const [input,           setInput]            = useState('');
  const [isTyping,        setIsTyping]         = useState(false);
  const [conversationId,  setConversationId]   = useState<string | undefined>();
  const [showLeadForm,    setShowLeadForm]     = useState(false);
  const [leadCaptured,    setLeadCaptured]     = useState(false);
  const [quickReplies]                          = useState(getQuickReplies(context));
  const [showQuickReplies, setShowQuickReplies] = useState(true);
  const [error,           setError]            = useState('');
  const [quotaMode,       setQuotaMode]        = useState<QuotaMode>('normal');

  // Slugs of the verified listings ALEEM showed last turn. Sent back on the
  // next message so an explicit "yes, arrange a callback" can be matched to
  // the exact listings the user actually saw.
  const [lastListings,    setLastListings]     = useState<string[]>([]);
  const [listings,        setListings]         = useState<AleemListing[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef       = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // No auto-greeting. The customer speaks first; ALEEM answers what was
  // actually asked instead of opening with a scripted pitch.

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isTyping) return;

    setShowQuickReplies(false);
    setError('');

    const userMsg: Message = {
      id:        crypto.randomUUID(),
      role:      'user',
      content:   text.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
      // Only navigation fields are sent. The server re-reads every fact from
      // MongoDB, so client-claimed price/NOC/score values are ignored anyway.
      const res = await fetch('/api/ai/chat', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text.trim(),
          sessionId,
          context: {
            type:         context.type,
            id:           context.id,
            slug:         context.slug,
            title:        context.title,
            city:         context.city,
            canonicalUrl: context.canonicalUrl,
          },
          lastListings,
        }),
      });

      const data = await res.json() as AleemChatResponse;

      if (!res.ok) {
        // ALEEM returns a specific message for guest vs signed-in limits, so
        // prefer the server text over a generic one.
        setError(
          data.message ??
          (res.status === 429
            ? 'Thoda wait karein â€” aap ne bohot saaray messages bheje hain.'
            : 'Aleem temporarily unavailable. Please try again.')
        );
        return;
      }

      if (data.conversationId) setConversationId(data.conversationId);

      const assistantMsg: Message = {
        id:        crypto.randomUUID(),
        role:      'assistant',
        content:   data.response ?? 'Main aap ki baat samajh nahi saka. Dobara try karein.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMsg]);

      // Grounded verified listings. Remember exactly which slugs were shown so
      // a later consent message can be matched to them.
      if (Array.isArray(data.listings)) {
        setListings(data.listings);
        setLastListings(data.listings.map((item) => item.slug));
      }

      // No engagement-based lead prompting. A callback is created only when
      // the user explicitly asks for one, which the server handles.

    } catch {
      setError('Network error. Please check your connection.');
    } finally {
      setIsTyping(false);
      inputRef.current?.focus();
    }
  }, [isTyping, sessionId, context, conversationId, leadCaptured, messages.length]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  }, [input, sendMessage]);

  const handleQuickReply = useCallback((value: string) => {
    sendMessage(value);
  }, [sendMessage]);

  const handleLeadSuccess = useCallback(() => {
    setLeadCaptured(true);
    setShowLeadForm(false);
    setMessages((prev) => [
      ...prev,
      {
        id:        crypto.randomUUID(),
        role:      'assistant',
        content:   'Shukriya! Aap ki request note kar li gayi hai 🎉” hamari team aap se raabta karegi. Tab tak aap aur verified properties browse kar sakte hain.',
        timestamp: new Date(),
      },
    ]);
  }, []);

  return (
    <div className="flex flex-col h-full bg-gray-50">

      {/* Header (LARGER text) */}
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-[#029bba] to-[#004063] text-white flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-base font-bold leading-tight">Aleem</p>
            <p className="text-xs text-white/80 leading-tight">Property Specialist</p>
          </div>
          <div className={`w-2.5 h-2.5 rounded-full ml-1 ${
            quotaMode === 'lead_only' ? 'bg-[#ef4444]' :
            quotaMode === 'priority'  ? 'bg-[#f59e0b] animate-pulse' :
            'bg-[#10b981] animate-pulse'
          }`} />
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onMinimize}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            aria-label="Minimize"
          >
            <Minimize2 className="w-4 h-4" />
          </button>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Context badge */}
      {context.type !== 'general' && context.title && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-[#004063]/5 border-b border-[#029bba]/10 flex-shrink-0">
          <MessageCircle className="w-4 h-4 text-[#029bba] flex-shrink-0" />
          <p className="text-xs text-[#004063] font-medium truncate">
            Talking about: <span className="text-[#029bba] font-semibold">{context.title}</span>
          </p>
        </div>
      )}

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 min-h-0">
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
        {isTyping && <TypingIndicator />}
        {error && (
          <div className="mb-3 px-3 py-2.5 bg-[#fef2f2] border-l-4 border-[#ef4444] text-red-700 text-sm rounded-lg">
            {error}
          </div>
        )}
        {/* Lead captured success */}
        {leadCaptured && (
          <div className="flex items-center gap-2 px-3 py-2.5 bg-[#f0fdf4] border border-[#10b981]/30 rounded-xl mb-3">
            <CheckCircle className="w-5 h-5 text-[#10b981] flex-shrink-0" />
            <p className="text-sm text-[#10b981] font-semibold">
              Details submitted ✓ Team will contact you soon
            </p>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick replies (LARGER text) */}
      {showQuickReplies && messages.length === 1 && (
        <div className="px-4 pb-3 flex-shrink-0">
          <p className="text-xs text-gray-500 mb-2 font-medium">Quick questions:</p>
          <div className="flex flex-col gap-2">
            {quickReplies.map((qr) => (
              <button
                key={qr.value}
                onClick={() => handleQuickReply(qr.value)}
                className="w-full text-left px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-700 hover:bg-[#029bba]/5 hover:border-[#029bba]/30 transition-colors font-medium"
              >
                {qr.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Lead capture form */}
      {showLeadForm && !leadCaptured && (
        <>
          {/* Disabled: this banner promised a callback "within 1 hour", the
              same timing promise removed everywhere else. quotaMode is never
              set by /api/ai/chat, so it was already unreachable. The block is
              deleted properly in A4 with the rest of the legacy lead path. */}
          {false && (
            <div className="px-4 py-3 bg-gradient-to-r from-[#029bba] to-[#004063] text-white text-center">
              <p className="text-sm font-bold">
                {quotaMode === 'lead_only'
                  ? '🌟 VIP Priority Callback'
                  : '⭐ Premium Personal Service'}
              </p>
              <p className="text-xs opacity-90 mt-0.5">
                Hamari expert team within 1 hour call karegi
              </p>
            </div>
          )}
          <LeadCaptureForm
            context={context}
            sessionId={sessionId}
            quotaMode={quotaMode}
            onSuccess={handleLeadSuccess}
            onClose={() => setShowLeadForm(false)}
          />
        </>
      )}

      {/* Input area (LARGER) */}
      <div className="flex-shrink-0 border-t border-gray-200 bg-white px-3 py-3">
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Apna sawal likhein..."
            className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-base focus:outline-none focus:border-[#029bba] focus:bg-white transition-colors placeholder:text-gray-400"
            maxLength={1000}
            disabled={isTyping}
          />
          <button
            type="submit"
            disabled={!input.trim() || isTyping}
            className="w-12 h-12 bg-[#029bba] text-white rounded-xl flex items-center justify-center hover:bg-[#027a94] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
            aria-label="Send"
          >
            {isTyping
              ? <Loader2 className="w-5 h-5 animate-spin" />
              : <Send className="w-5 h-5" />
            }
          </button>
        </form>

        {/* PROMINENT Request Callback button */}
        {!showLeadForm && !leadCaptured && messages.length >= 2 && (
          <button
            onClick={() => setShowLeadForm(true)}
            className="w-full mt-3 py-3 bg-gradient-to-r from-[#10b981] to-[#059669] text-white rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2 shadow-md"
          >
            <PhoneCall className="w-4 h-4" />
            Request a Callback from Our Team
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Greeting builder ─────────────────────────────────────────────────────────

function buildGreeting(context: IAriaContext, userName?: string | null): string {
  const name = userName ? `, ${userName.split(' ')[0]}` : '';

  if (context.type === 'property' && context.title) {
    return `Assalam-u-Alaikum${name}! 👋 Main Aleem hoon, Highrise.pk se.\n\nAap "${context.title}"${context.city ? ` (${context.city})` : ''} property dekh rahe hain. Kya main aap ki kuch madad kar sakta hoon? Price, location, ya kuch aur jaanna chahein? 🏠`;
  }

  if (context.type === 'society' && context.title) {
    const riskNote = context.overallRiskLevel === 'safe'
      ? '✅ Ye society safe category mein hai.'
      : context.overallRiskLevel === 'avoid'
      ? '⚠️ Please careful rahein — is society mein kuch risks hain.'
      : '';
    return `Assalam-u-Alaikum${name}! 👋 Main Aleem hoon, Highrise.pk se.\n\nAap "${context.title}"${context.nocStatus ? ` (NOC: ${context.nocStatus})` : ''} dekh rahe hain. ${riskNote}\n\nKya aap invest karna chahte hain ya bas verify kar rahe hain?`;
  }

  return `Assalam-u-Alaikum${name}! 👋 Main Aleem hoon, Highrise.pk se.\n\nProperty dhundh rahe hain ya invest karna chahte hain? Mujhe batayein, main aap ki best property find karne mein madad karunga.\n\n(Aap English, Urdu, ya Roman Urdu — jo bhi language comfortable hai, use kar saktay hain)`;
}