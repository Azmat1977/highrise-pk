// components/aleem/AleemChat.tsx
// Highrise.pk — Aleem AI chat interface
// V7.4.0 — STAGE 0.4: Added Urdu script auto-detection, dynamic directionality (RTL/LTR), Nastaliq font stacks, and Language toggles in header

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
  Building,
  MapPin,
  RotateCcw,
  AlertCircle,
  Languages,
} from 'lucide-react';
import { useSession } from 'next-auth/react';
import FeedbackButtons from './FeedbackButtons';

interface Message {
  id:        string;
  role:      'user' | 'assistant';
  content:   string;
  timestamp: Date;
  listings?: AleemListing[];
  messageId?: string;
}

interface LeadForm {
  name:     string;
  phone:    string;
  email:    string;
  intent:   string;
  message:  string;
  honeypot: string;
}

interface AssignedAgentInfo {
  name?: string;
  phone?: string;
  matchTier?: 'area_match' | 'city_match' | 'none';
}

type QuotaMode = 'normal' | 'priority' | 'lead_only';
type LocaleMode = 'auto' | 'en' | 'ur';

interface AriaChatProps {
  context:    IAriaContext;
  sessionId:  string;
  onMinimize: () => void;
  onClose:    () => void;
}

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

interface AleemChatResponse {
  success?:      boolean;
  messageId?:    string;
  response?:     string;
  listings?:     AleemListing[];
  conversationId?: string | null;
  requiresAuth?: boolean;
  grounded?:     boolean;
  message?:      string;
  requestId?:    string;
}

const QUICK_REPLIES_GENERAL = [
  { label: 'Buy Property 🏠', value: 'Mujhe property khareedni hai' },
  { label: 'Rent Home 🔑', value: 'Kiraye par ghar chahiye' },
  { label: 'Check Society NOC 📋', value: 'Society ka NOC check karna hai' },
  { label: 'Plot Search 📍', value: '5 marla plot B-17 mein, 60 lakh tak' },
];

const QUICK_REPLIES_PROPERTY = [
  { label: '💰 Is price negotiable?', value: 'Is the price negotiable for this property?' },
  { label: '📅 Schedule visit', value: 'I would like to schedule a site visit.' },
  { label: '🏦 Home loan available?', value: 'Can I get a home loan for this property?' },
  { label: '📄 Documents needed?', value: 'What documents are required for this purchase?' },
];

const QUICK_REPLIES_SOCIETY = [ 
  { label: '📋 NOC details', value: 'Tell me more about the NOC status of this society.' },
  { label: '💰 Verified listings here', value: 'Show me verified listings available in this society.' },
  { label: '⚠️ Any risks?', value: 'Are there any risks I should know about before investing?' },
  { label: '📅 Schedule visit', value: 'I would like to visit this society.' },
];

function getQuickReplies(context: IAriaContext): typeof QUICK_REPLIES_GENERAL {
  if (context.type === 'property') return QUICK_REPLIES_PROPERTY;
  if (context.type === 'society')  return QUICK_REPLIES_SOCIETY;
  return QUICK_REPLIES_GENERAL;
}

const INTENT_OPTIONS = [
  { value: 'buy',     label: '🏠 Buy',     icon: ShoppingCart },
  { value: 'rent',    label: '🔑 Rent',    icon: Home         },
  { value: 'invest',  label: '📈 Invest',  icon: TrendingUp   },
  { value: 'verify',  label: '🔍 Verify',  icon: Search       },
];

// Helper to check if string contains Urdu / Arabic characters
function hasUrduScript(text: string): boolean {
  return /[\u0600-\u06FF]/.test(text);
}

function FormattedMessage({ content, isUser }: { content: string; isUser: boolean }): React.ReactElement {
  if (isUser) {
    return <span className="whitespace-pre-wrap">{content}</span>;
  }

  const cleaned = content
    .replace(/\\\[\s*/g, '')
    .replace(/\s*\\\]/g, '')
    .replace(/\\left\(/g, '(')
    .replace(/\\right\)/g, ')')
    .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1 ÷ $2)')
    .replace(/\\text\{([^}]+)\}/g, '$1');

  const lines = cleaned.split('\n');
  const isUrdu = hasUrduScript(cleaned);

  return (
    <div className={`space-y-2 text-[15px] leading-relaxed ${isUrdu ? 'font-nastaliq tracking-normal text-right' : ''}`}>
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={idx} className="h-1" />;

        if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
          const cells = trimmed.split('|').map((c) => c.trim()).filter(Boolean);
          if (cells.every((c) => /^[-:]+$/.test(c))) return null;

          return (
            <div key={idx} className="grid grid-cols-3 gap-1 bg-gray-50 p-1.5 rounded border border-gray-200 text-xs font-medium text-gray-700">
              {cells.map((cell, cIdx) => (
                <span key={cIdx} className="truncate">{cell}</span>
              ))}
            </div>
          );
        }

        if (trimmed.startsWith('- ') || trimmed.startsWith('* ') || trimmed.startsWith('• ')) {
          const bulletText = trimmed.replace(/^[-*•]\s*/, '');
          return (
            <div key={idx} className="flex items-start gap-2 pl-1">
              <span className="text-[#029bba] font-bold text-base leading-none">•</span>
              <span>{formatBoldText(bulletText)}</span>
            </div>
          );
        }

        return <p key={idx}>{formatBoldText(trimmed)}</p>;
      })}
    </div>
  );
}

function formatBoldText(text: string): (string | React.ReactElement)[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-bold text-gray-900">{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

function ListingCard({ item }: { item: AleemListing }): React.ReactElement {
  const formattedPrice = item.price > 0 ? `PKR ${item.price.toLocaleString('en-US')}` : 'Price on request';
  const locationText = [item.society, item.city].filter(Boolean).join(', ') || 'Pakistan';
  const areaText = item.area > 0 ? `${item.area}${item.unit ? ` ${item.unit}` : ''}` : '';

  return (
    <div className="w-[220px] flex-shrink-0 bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      <div className="relative h-28 bg-gray-100 flex items-center justify-center overflow-hidden">
        {item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt={item.title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-gray-400 p-2 text-center">
            <Building className="w-8 h-8 mb-1 opacity-50" />
            <span className="text-[10px]">No image</span>
          </div>
        )}
        <div className="absolute top-2 right-2 bg-emerald-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
          <CheckCircle className="w-3 h-3" />
          <span>Verified</span>
        </div>
      </div>

      <div className="p-3">
        <h4 className="text-xs font-bold text-gray-900 line-clamp-1 mb-1" title={item.title}>
          {item.title}
        </h4>

        <div className="flex items-center gap-1 text-[11px] text-gray-500 mb-1.5 line-clamp-1">
          <MapPin className="w-3 h-3 text-[#029bba] flex-shrink-0" />
          <span>{locationText}</span>
        </div>

        <div className="flex items-center justify-between text-xs font-semibold text-gray-800 mb-2">
          <span className="text-[#004063]">{formattedPrice}</span>
          {areaText && <span className="text-[10px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">{areaText}</span>}
        </div>

        {item.slug && (
          <a
            href={`/property/${item.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full text-center py-1.5 bg-gradient-to-r from-[#029bba] to-[#004063] text-white text-xs font-semibold rounded-lg hover:opacity-95 transition-opacity"
          >
            View Details
          </a>
        )}
      </div>
    </div>
  );
}

function MessageBubble({
  message,
  sessionId,
  contextType,
  contextSlug,
}: {
  message: Message;
  sessionId: string;
  contextType?: string;
  contextSlug?: string;
}): React.ReactElement {
  const isUser = message.role === 'user';
  const hasListings = Array.isArray(message.listings) && message.listings.length > 0;
  const isUrdu = hasUrduScript(message.content);

  return (
    <div className={`flex items-end gap-2 mb-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#029bba] to-[#004063] flex items-center justify-center flex-shrink-0 mb-1">
          <Bot className="w-4 h-4 text-white" />
        </div>
      )}

      <div className={`flex flex-col max-w-[85%] ${isUrdu ? 'w-full' : ''}`}>
        <div
          dir={isUrdu ? 'rtl' : 'ltr'}
          className={`px-4 py-3 rounded-2xl text-[15px] leading-relaxed overflow-hidden ${
            isUser
              ? 'bg-[#029bba] text-white rounded-br-sm'
              : 'bg-white text-gray-800 border border-gray-100 rounded-bl-sm shadow-sm'
          }`}
        >
          <FormattedMessage content={message.content} isUser={isUser} />
        </div>

        {!isUser && message.messageId && (
          <FeedbackButtons
            messageId={message.messageId}
            sessionId={sessionId}
            contextType={contextType}
            contextSlug={contextSlug}
          />
        )}

        {hasListings && (
          <div className="mt-3 flex gap-2 overflow-x-auto pb-2 pt-1 scrollbar-thin scrollbar-thumb-gray-300">
            {message.listings!.map((item, idx) => (
              <ListingCard key={item.slug || idx} item={item} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

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

interface LeadFormProps {
  context:        IAriaContext;
  sessionId:      string;
  quotaMode?:     QuotaMode;
  onSuccess:      (agent?: AssignedAgentInfo) => void;
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
    intent: 'buy', message: '',
    honeypot: '',
  });
  const [formOpenedAt] = useState<number>(() => Date.now());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!form.name.trim())  { setError('Please enter your name.'); return; }
    if (!form.phone.trim()) { setError('Please enter your phone number.'); return; }

    setSubmitting(true);
    try {
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
          honeypot:     form.honeypot,
          formOpenedAt,
        }),
      });

      const data = await res.json() as {
        success?: boolean;
        error?: string;
        leadId?: string;
        assignedAgent?: AssignedAgentInfo;
      };
      if (!res.ok || !data.success) {
        setError(data.error ?? 'Unable to submit. Please try again.');
        return;
      }
      onSuccess(data.assignedAgent);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }, [form, sessionId, context, onSuccess]);

  return (
    <form onSubmit={handleSubmit} className="p-4 bg-[#f0f9ff] border-t border-[#029bba]/20 relative">
      <div className="absolute opacity-0 pointer-events-none w-0 h-0 -z-10 overflow-hidden" aria-hidden="true">
        <label htmlFor="aleem_website_hp">Do not fill this field</label>
        <input
          id="aleem_website_hp"
          type="text"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          value={form.honeypot}
          onChange={(e) => setForm((f) => ({ ...f, honeypot: e.target.value }))}
        />
      </div>

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

      {error && (
        <div className="mb-2 px-3 py-2 bg-[#fef2f2] border-l-4 border-[#ef4444] text-red-700 text-sm rounded-lg">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full py-3 bg-[#029bba] text-white rounded-xl text-base font-semibold hover:bg-[#027a94] disabled:opacity-60 transition-colors flex items-center justify-center gap-2 active:scale-[0.98]"
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

export default function AriaChat({
  context,
  sessionId: initialSessionId,
  onMinimize,
  onClose,
}: AriaChatProps): React.ReactElement {
  const { data: session } = useSession();
  const [currentSessionId, setCurrentSessionId] = useState<string>(initialSessionId);
  const [messages,          setMessages]         = useState<Message[]>([]);
  const [input,             setInput]            = useState('');
  const [isTyping,          setIsTyping]         = useState(false);
  const [conversationId,    setConversationId]   = useState<string | undefined>();
  const [showLeadForm,      setShowLeadForm]     = useState(false);
  const [leadCaptured,      setLeadCaptured]     = useState(false);
  const [assignedAgent,     setAssignedAgent]    = useState<AssignedAgentInfo | null>(null);
  const [quickReplies]                            = useState(getQuickReplies(context));
  const [showQuickReplies,  setShowQuickReplies] = useState(true);
  const [error,             setError]            = useState('');
  const [quotaMode,         setQuotaMode]        = useState<QuotaMode>('normal');
  const [showResetModal,    setShowResetModal]   = useState(false);
  const [isResetting,       setIsResetting]      = useState(false);
  
  // STAGE 0.4: Language Settings
  const [localeMode,        setLocaleMode]       = useState<LocaleMode>('auto');

  const [lastListings,      setLastListings]     = useState<string[]>([]);
  const [listings,          setListings]         = useState<AleemListing[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef       = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const storedLocale = sessionStorage.getItem('aleem_locale_preference') as LocaleMode;
    if (storedLocale && ['auto', 'en', 'ur'].includes(storedLocale)) {
      setLocaleMode(storedLocale);
    }
  }, []);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 640) {
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = '';
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const toggleLocale = useCallback(() => {
    setLocaleMode((prev) => {
      const next: LocaleMode = prev === 'auto' ? 'ur' : prev === 'ur' ? 'en' : 'auto';
      sessionStorage.setItem('aleem_locale_preference', next);
      return next;
    });
  }, []);

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
      const res = await fetch('/api/ai/chat', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text.trim(),
          sessionId: currentSessionId,
          context: {
            type:         context.type,
            id:           context.id,
            slug:         context.slug,
            title:        context.title,
            city:         context.city,
            canonicalUrl: context.canonicalUrl,
          },
          lastListings,
          localePreference: localeMode !== 'auto' ? localeMode : undefined,
        }),
      });

      const data = await res.json() as AleemChatResponse;

      if (!res.ok) {
        setError(
          data.message ??
          (res.status === 429
            ? 'Thoda wait karein — aap ne bohot saaray messages bheje hain.'
            : 'Aleem temporarily unavailable. Please try again.')
        );
        return;
      }

      if (data.conversationId) setConversationId(data.conversationId);

      const assistantMsg: Message = {
        id:        crypto.randomUUID(),
        messageId: data.messageId,
        role:      'assistant',
        content:   data.response ?? 'Main aap ki baat samajh nahi saka. Dobara try karein.',
        timestamp: new Date(),
        listings:  Array.isArray(data.listings) ? data.listings : undefined,
      };
      setMessages((prev) => [...prev, assistantMsg]);

      if (Array.isArray(data.listings)) {
        setListings(data.listings);
        setLastListings(data.listings.map((item) => item.slug));
      }

    } catch {
      setError('Network error. Please check your connection.');
    } finally {
      setIsTyping(false);
      inputRef.current?.focus();
    }
  }, [isTyping, currentSessionId, context, lastListings, localeMode]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  }, [input, sendMessage]);

  const handleQuickReply = useCallback((value: string) => {
    sendMessage(value);
  }, [sendMessage]);

  const handleLeadSuccess = useCallback((agent?: AssignedAgentInfo) => {
    setLeadCaptured(true);
    setShowLeadForm(false);
    if (agent && agent.phone) {
      setAssignedAgent(agent);
    }
  }, []);

  const handleConfirmResetSession = useCallback(async () => {
    setIsResetting(true);
    try {
      await fetch('/api/aleem/reset-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: currentSessionId }),
      });
    } catch {
      // Best-effort server reset
    } finally {
      setCurrentSessionId(crypto.randomUUID());
      setMessages([]);
      setListings([]);
      setLastListings([]);
      setShowLeadForm(false);
      setLeadCaptured(false);
      setAssignedAgent(null);
      setShowQuickReplies(true);
      setError('');
      setIsResetting(false);
      setShowResetModal(false);
    }
  }, [currentSessionId]);

  const getWhatsAppLink = (phone: string, title?: string) => {
    let clean = phone.replace(/\D/g, '');
    if (clean.startsWith('0')) clean = '92' + clean.slice(1);
    else if (!clean.startsWith('92')) clean = '92' + clean;

    const msg = encodeURIComponent(
      title
        ? `Assalam-u-Alaikum, I am inquiring regarding ${title} via Highrise.pk.`
        : `Assalam-u-Alaikum, I requested a callback on Highrise.pk.`
    );
    return `https://wa.me/${clean}?text=${msg}`;
  };

  const getPlaceholderText = () => {
    if (localeMode === 'ur') return 'اپنا سوال لکھیں...';
    if (localeMode === 'en') return 'Ask your question...';
    return 'Apna sawal likhein...';
  };

  const isUrduPreferred = localeMode === 'ur';

  return (
    <div className="fixed inset-0 sm:relative sm:inset-auto z-50 sm:z-0 flex flex-col h-full w-full sm:h-[550px] sm:w-[360px] sm:max-w-[calc(100vw-2rem)] bg-gray-50 sm:rounded-2xl sm:shadow-2xl overflow-hidden border border-gray-100 animate-slideUp sm:animate-none">

      <div className="flex items-center justify-between px-4 py-3.5 bg-gradient-to-r from-[#029bba] to-[#004063] text-white flex-shrink-0">
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
          {/* STAGE 0.4: Language Selector */}
          <button
            type="button"
            onClick={toggleLocale}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors active:scale-95 flex items-center gap-1 font-bold text-xs"
            aria-label="Toggle language preference"
            title={`Current locale preference: ${localeMode.toUpperCase()}`}
          >
            <Languages className="w-4 h-4 text-white/95" />
            <span className="text-[10px] text-white uppercase">{localeMode}</span>
          </button>

          {/* STAGE 0.2: Start Fresh / Reset Session Button */}
          <button
            type="button"
            onClick={() => setShowResetModal(true)}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors active:scale-95"
            aria-label="Start Fresh Chat"
            title="Start fresh conversation"
          >
            <RotateCcw className="w-4 h-4 text-white/90 hover:text-white" />
          </button>

          <button
            onClick={onMinimize}
            className="hidden sm:block p-2 hover:bg-white/10 rounded-lg transition-colors"
            aria-label="Minimize"
          >
            <Minimize2 className="w-4 h-4" />
          </button>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors active:scale-95"
            aria-label="Close"
          >
            <X className="w-5 h-5 sm:w-4 sm:h-4" />
          </button>
        </div>
      </div>

      {context.type !== 'general' && context.title && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-[#004063]/5 border-b border-[#029bba]/10 flex-shrink-0">
          <MessageCircle className="w-4 h-4 text-[#029bba] flex-shrink-0" />
          <p className="text-xs text-[#004063] font-medium truncate">
            Talking about: <span className="text-[#029bba] font-semibold">{context.title}</span>
          </p>
        </div>
      )}

      <div 
        className="flex-1 overflow-y-auto px-4 py-4 min-h-0"
        aria-live="polite"
      >
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center min-h-[80%] p-4 text-center">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#029bba] to-[#004063] flex items-center justify-center shadow-md mb-4 animate-bounce">
              <Bot className="w-7 h-7 text-white" />
            </div>
            <h3 className={`text-lg font-black text-[#004063] mb-1 ${isUrduPreferred ? 'font-nastaliq text-right w-full' : ''}`}>
              {isUrduPreferred ? 'السلام علیکم!' : 'Assalam-u-Alaikum!'}
            </h3>
            <p className={`text-sm text-gray-600 max-w-xs mb-6 ${isUrduPreferred ? 'font-nastaliq text-right leading-loose w-full' : 'leading-relaxed'}`}>
              {isUrduPreferred 
                ? 'میں علیم ہوں، ہائی رائز پی کے سے۔ میں آپ کا اے آئی پراپرٹی اسپیشلسٹ اور کنسٹرکشن ایڈوائزر ہوں۔ میں غیر تصدیق شدہ لسٹنگز یا جعلی ریٹس کے بغیر درست تجزیہ پیش کرتا ہوں۔'
                : 'Main Aleem hoon, Highrise.pk se. Main aap ka AI property specialist aur construction advisor hoon. Main unverified listings or fake rates se pak accurate analysis deta hoon.'}
            </p>
            <div className="w-full max-w-sm space-y-2.5 text-left">
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider pl-1">Mujhse Poochhein:</p>
              <div className="flex flex-col gap-2">
                {quickReplies.slice(0, 3).map((qr) => (
                  <button
                    key={qr.value}
                    onClick={() => handleQuickReply(qr.value)}
                    className="w-full text-left px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-[#029bba]/5 hover:border-[#029bba]/30 hover:text-[#029bba] transition-all shadow-sm active:scale-[0.98]"
                  >
                    {qr.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            sessionId={currentSessionId}
            contextType={context.type}
            contextSlug={context.slug}
          />
        ))}
        {isTyping && <TypingIndicator />}
        {error && (
          <div className="mb-3 px-3 py-2.5 bg-[#fef2f2] border-l-4 border-[#ef4444] text-red-700 text-sm rounded-lg">
            {error}
          </div>
        )}
        {leadCaptured && (
          <div className="bg-white border border-[#10b981]/40 rounded-2xl p-4 shadow-sm mb-3 animate-slideUp">
            <div className="flex items-start gap-2.5 mb-3">
              <div className="w-8 h-8 rounded-full bg-[#10b981]/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                <CheckCircle className="w-5 h-5 text-[#10b981]" />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900 leading-tight">
                  Callback Request Confirmed!
                </p>
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                  {assignedAgent
                    ? `Assigned to verified regional specialist: ${assignedAgent.name || 'Regional Agent'}`
                    : 'Our certified property desk will contact you shortly.'}
                </p>
              </div>
            </div>

            {assignedAgent?.phone ? (
              <div className="space-y-2 mt-2 pt-2 border-t border-gray-100">
                <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                  Don&apos;t want to wait? Connect instantly:
                </p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <a
                    href={getWhatsAppLink(assignedAgent.phone, context.title)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 py-2.5 px-3 bg-[#10b981] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow hover:bg-[#059669] transition-colors active:scale-95 text-center"
                  >
                    <MessageCircle className="w-4 h-4" />
                    Chat on WhatsApp
                  </a>
                  <a
                    href={`tel:${assignedAgent.phone}`}
                    className="py-2.5 px-3 bg-gray-100 text-[#004063] rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-gray-200 transition-colors active:scale-95"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    Call
                  </a>
                </div>
              </div>
            ) : (
              <div className="mt-2 pt-2 border-t border-gray-100">
                <p className="text-xs text-gray-600">
                  A Highrise property consultant will review your request and call back.
                </p>
              </div>
            )}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {showQuickReplies && messages.length > 0 && (
        <div className="px-4 pb-3 flex-shrink-0">
          <div className="flex gap-2 overflow-x-auto pb-1.5 scrollbar-none snap-x touch-pan-x">
            {quickReplies.map((qr) => (
              <button
                key={qr.value}
                onClick={() => handleQuickReply(qr.value)}
                className="flex-shrink-0 snap-center px-4 py-2.5 bg-white border border-gray-200 rounded-full text-xs font-bold text-[#004063] hover:bg-[#029bba]/5 hover:border-[#029bba]/30 hover:text-[#029bba] transition-all shadow-sm active:scale-95"
              >
                {qr.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {showLeadForm && !leadCaptured && (
        <LeadCaptureForm
          context={context}
          sessionId={currentSessionId}
          quotaMode={quotaMode}
          onSuccess={handleLeadSuccess}
          onClose={() => setShowLeadForm(false)}
        />
      )}

      <div className="flex-shrink-0 border-t border-gray-200 bg-white px-3 py-3">
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={getPlaceholderText()}
            className={`flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-[#029bba]/10 focus:border-[#029bba] focus:bg-white transition-all placeholder:text-gray-400 ${
              hasUrduScript(input) ? 'font-nastaliq text-right' : ''
            }`}
            maxLength={1000}
            disabled={isTyping}
          />
          <button
            type="submit"
            disabled={!input.trim() || isTyping}
            className="w-12 h-12 bg-[#029bba] text-white rounded-xl flex items-center justify-center hover:bg-[#027a94] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0 active:scale-95"
            aria-label="Send"
          >
            {isTyping
              ? <Loader2 className="w-5 h-5 animate-spin" />
              : <Send className="w-5 h-5" />
            }
          </button>
        </form>

        {!showLeadForm && !leadCaptured && messages.length >= 2 && (
          <button
            onClick={() => setShowLeadForm(true)}
            className="aleem-cta w-full mt-3 py-3 text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-2 shadow-md focus:outline-none focus:ring-4 focus:ring-[#029bba]/40 active:scale-[0.98]"
          >
            <PhoneCall className="w-4 h-4" />
            Request a Callback from Our Team
          </button>
        )}
      </div>

      {/* STAGE 0.2: Reset Session Confirmation Modal */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-xs bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden text-left p-5 animate-slideUp">
            <div className="flex items-center gap-2.5 mb-2">
              <div className="p-2 bg-[#f59e0b]/15 text-[#f59e0b] rounded-xl">
                <AlertCircle className="w-5 h-5" />
              </div>
              <h4 className="text-base font-bold text-[#004063]">Start fresh chat?</h4>
            </div>

            <p className="text-xs text-gray-600 mb-5 leading-relaxed">
              Yeh aap ki current conversation context ko clear kar dega aur aik naya chat session shuru karega.
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowResetModal(false)}
                disabled={isResetting}
                className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-xs font-bold hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleConfirmResetSession()}
                disabled={isResetting}
                className="flex-1 py-2.5 bg-[#ef4444] text-white rounded-xl text-xs font-bold hover:bg-[#dc2626] disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5"
              >
                {isResetting ? (
                  <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Resetting...</>
                ) : (
                  'Yes, Start Fresh'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .aleem-cta {
          background-image: linear-gradient(
            110deg,
            #029bba 0%,
            #004063 35%,
            #0288a6 65%,
            #029bba 100%
          );
          background-size: 220% 100%;
          background-position: 0% 50%;
          animation: aleem-cta-slide 6s ease-in-out infinite;
          transition: filter 0.2s ease, transform 0.2s ease;
        }
        .aleem-cta:hover {
          filter: brightness(1.08);
          transform: translateY(-1px);
        }
        .aleem-cta:active {
          transform: translateY(0);
        }
        @keyframes aleem-cta-slide {
          0%   { background-position: 0% 50%; }
          50%  { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes aleem-slide-up {
          from { transform: translateY(100%); }
          to   { transform: translateY(0); }
        }
        .animate-slideUp {
          animation: aleem-slide-up 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .scrollbar-none::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-none {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        @media (prefers-reduced-motion: reduce) {
          .aleem-cta {
            animation: none;
            background-position: 0% 50%;
          }
          .animate-slideUp {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}