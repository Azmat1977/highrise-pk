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

// ─── Quick reply buttons (context-aware) ─────────────────────────────────────

const QUICK_REPLIES_GENERAL = [
  { label: '🏠 I want to buy', value: 'I want to buy a property in Pakistan.' },
  { label: '💰 Investment advice', value: 'I am looking for investment opportunities in real estate.' },
  { label: '🏘️ Check society NOC', value: 'I want to check the NOC status of a housing society.' },
  { label: '📊 Market prices', value: 'What are the current property prices?' },
];

const QUICK_REPLIES_PROPERTY = [
  { label: '💰 Is price negotiable?', value: 'Is the price negotiable for this property?' },
  { label: '📅 Schedule visit', value: 'I would like to schedule a site visit.' },
  { label: '🏦 Home loan available?', value: 'Can I get a home loan for this property?' },
  { label: '📄 Documents needed?', value: 'What documents are required for this purchase?' },
];

const QUICK_REPLIES_SOCIETY = [
  { label: '📋 NOC details', value: 'Tell me more about the NOC status of this society.' },
  { label: '💰 Plot prices', value: 'What are the current plot prices in this society?' },
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
  conversationId: string;
  sessionId:      string;
  quotaMode?:     QuotaMode;
  onSuccess:      () => void;
}

function LeadCaptureForm({
  context,
  conversationId,
  sessionId,
  quotaMode = 'normal',
  onSuccess,
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
      const res = await fetch('/api/aria/leads', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name:        form.name.trim(),
          phone:       form.phone.trim(),
          email:       form.email.trim() || undefined,
          conversationId,
          sessionId,
          intent:      form.intent,
          urgency:     form.urgency,
          budgetTier:  form.budgetTier || undefined,
          message:     form.message.trim() || undefined,
          sourceType:  context.type,
          sourceId:    context.id,
          sourceSlug:  context.slug,
          sourceTitle: context.title,
          sourceUrl:   context.canonicalUrl,
          quotaMode,
        }),
      });

      const data = await res.json() as { success?: boolean; error?: string };
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
  }, [form, conversationId, sessionId, context, quotaMode, onSuccess]);

  return (
    <form onSubmit={handleSubmit} className="p-4 bg-[#f0f9ff] border-t border-[#029bba]/20">
      <p className="text-sm font-semibold text-[#004063] mb-3 flex items-center gap-2">
        <User className="w-4 h-4" />
        Share your details — our team will contact you within 24 hours
      </p>

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

      <p className="text-xs text-gray-500 text-center mt-2.5">
        📵 Your number is never shared publicly. Managed marketplace model.
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

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef       = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Initial greeting
  useEffect(() => {
    const greeting = buildGreeting(context, session?.user?.name);
    setMessages([{
      id:        crypto.randomUUID(),
      role:      'assistant',
      content:   greeting,
      timestamp: new Date(),
    }]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
      const res = await fetch('/api/aria/chat', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message:        text.trim(),
          sessionId,
          context,
          conversationId,
        }),
      });

      const data = await res.json() as {
        reply?:           string;
        conversationId?:  string;
        error?:           string;
        code?:            string;
        quotaMode?:       QuotaMode;
        quotaPercentage?: number;
      };

      if (!res.ok) {
        if (res.status === 429) {
          setError('Thoda wait karein — aap ne bohot saaray messages bheje hain.');
        } else if (res.status === 503 && data.code === 'QUOTA_EXCEEDED') {
          setError('');
          setQuotaMode('lead_only');
          setShowLeadForm(true);
          const sysMsg: Message = {
            id:        crypto.randomUUID(),
            role:      'assistant',
            content:   data.error ?? 'Aleem bohot busy hai. Aap apna detail share karein.',
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, sysMsg]);
        } else {
          setError(data.error ?? 'Aleem temporarily unavailable. Please try again.');
        }
        return;
      }

      if (data.conversationId) setConversationId(data.conversationId);
      if (data.quotaMode)      setQuotaMode(data.quotaMode);

      const assistantMsg: Message = {
        id:        crypto.randomUUID(),
        role:      'assistant',
        content:   data.reply ?? 'Main aap ki baat samajh nahi saka. Dobara try karein.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMsg]);

      // Lead form trigger logic
      const threshold = data.quotaMode === 'priority' ? 2 : 4;
      if (!leadCaptured && messages.length >= threshold) {
        setShowLeadForm(true);
      }

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
        content:   'Shukriya! 🎉 Hamari team 24 hours mein aap se call karegi. Tab tak aap aur properties browse kar sakte hain.',
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
      {showLeadForm && !leadCaptured && conversationId && (
        <>
          {(quotaMode === 'priority' || quotaMode === 'lead_only') && (
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
            conversationId={conversationId}
            sessionId={sessionId}
            quotaMode={quotaMode}
            onSuccess={handleLeadSuccess}
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
        {!showLeadForm && !leadCaptured && conversationId && messages.length >= 2 && (
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