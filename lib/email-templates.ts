// ========== FILE: lib/email-templates.ts ==========
// 🔒 ENTERPRISE EMAIL TEMPLATES - HIGHRISE.PK
// Security: XSS-safe | All user data escaped | Safe URLs enforced
// ═══════════════════════════════════════════════════════════════

import { format } from 'date-fns';

// ═══════════════════════════════════════════════════════════════
// 🔐 SECURITY HELPERS
// ═══════════════════════════════════════════════════════════════

/**
 * Escape user-controlled data before HTML interpolation.
 * Must be applied to ALL user-supplied values in templates.
 */
function escapeHtml(unsafe: unknown): string {
  return String(unsafe ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Validate a URL is safe before putting in href.
 * Returns '#' for unsafe or missing URLs.
 */
function safeUrl(url: unknown): string {
  if (!url || typeof url !== 'string') return '#';
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return '#';
    return url;
  } catch {
    return '#';
  }
}

/**
 * Sanitize phone number — digits and + only for tel/wa.me URLs.
 */
function safePhone(phone: unknown): string {
  if (!phone || typeof phone !== 'string') return '';
  return phone.replace(/[^0-9+]/g, '').slice(0, 15);
}

/**
 * Safe date formatting — returns fallback on invalid date.
 */
function safeFormatDate(
  dateStr: unknown,
  fmt: string,
  fallback: string
): string {
  try {
    if (!dateStr) return fallback;
    const d = new Date(String(dateStr));
    if (isNaN(d.getTime())) return fallback;
    return format(d, fmt);
  } catch {
    return fallback;
  }
}

/**
 * Safely extract string from unknown data field.
 */
function str(value: unknown, fallback: string = ''): string {
  if (value === null || value === undefined) return fallback;
  return String(value);
}

// ═══════════════════════════════════════════════════════════════
// 🔐 TYPES
// ═══════════════════════════════════════════════════════════════

export interface EmailTemplate {
  id: string;
  name: string;
  description: string;
  subject: string;
  preview: string;
  html: (data: Record<string, unknown>) => string;
}

// ═══════════════════════════════════════════════════════════════
// 🔐 CONSTANTS
// ═══════════════════════════════════════════════════════════════

const PRIMARY_COLOR = '#029bba';
const SECONDARY_COLOR = '#004063';

// ═══════════════════════════════════════════════════════════════
// 🔐 BASE TEMPLATE
// ═══════════════════════════════════════════════════════════════

function baseTemplate(content: string, unsubscribeLink?: string): string {
  const safeUnsub = unsubscribeLink ? safeUrl(unsubscribeLink) : null;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Highrise.pk</title>
  <style>
    body { margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, sans-serif; background-color: #f8f9fa; color: #333; }
    .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, ${PRIMARY_COLOR} 0%, ${SECONDARY_COLOR} 100%); padding: 40px 30px; text-align: center; }
    .logo { font-size: 32px; font-weight: 700; color: white; margin: 0 0 10px 0; }
    .tagline { color: rgba(255,255,255,0.9); font-size: 14px; margin: 0; }
    .content { padding: 40px 30px; }
    .footer { background-color: #f8f9fa; padding: 30px; text-align: center; border-top: 1px solid #e9ecef; }
    .social-links { margin: 20px 0; }
    .social-links a { display: inline-block; margin: 0 10px; color: ${PRIMARY_COLOR}; text-decoration: none; }
    .unsubscribe { color: #999; font-size: 12px; margin-top: 20px; }
    .unsubscribe a { color: #999; }
    .cta-button { display: inline-block; padding: 14px 30px; background-color: ${PRIMARY_COLOR}; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; margin: 20px 0; }
    .feature-card { background-color: #f8f9fa; border-radius: 12px; padding: 20px; margin: 20px 0; border-left: 4px solid ${PRIMARY_COLOR}; }
    .property-card { border: 1px solid #e9ecef; border-radius: 12px; overflow: hidden; margin: 20px 0; }
    .property-image { width: 100%; height: 200px; object-fit: cover; }
    .property-details { padding: 20px; }
    .property-price { color: ${PRIMARY_COLOR}; font-size: 20px; font-weight: 700; margin: 10px 0; }
    .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin: 20px 0; }
    .stat-item { text-align: center; padding: 15px; background-color: #f8f9fa; border-radius: 8px; }
    .stat-value { font-size: 24px; font-weight: 700; color: ${PRIMARY_COLOR}; margin: 5px 0; }
    .stat-label { font-size: 12px; color: #666; }
    @media (max-width: 600px) {
      .container { border-radius: 0; }
      .header, .content { padding: 30px 20px; }
      .stats-grid { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 class="logo">🏠 Highrise.pk</h1>
      <p class="tagline">Pakistan's Premier Real Estate Platform</p>
    </div>
    <div class="content">${content}</div>
    <div class="footer">
      <div class="social-links">
        <a href="https://facebook.com/highrise.pk">Facebook</a>
        <a href="https://instagram.com/highrise.pk">Instagram</a>
        <a href="https://linkedin.com/company/highrise-pk">LinkedIn</a>
        <a href="https://twitter.com/highrise_pk">Twitter</a>
      </div>
      <p class="unsubscribe">
        ${safeUnsub && safeUnsub !== '#'
          ? `You received this email because you subscribed to Highrise.pk newsletter.<br>
             <a href="${safeUnsub}">Unsubscribe</a> |
             <a href="https://highrise.pk/preferences">Update Preferences</a>`
          : 'Highrise.pk - All rights reserved.'
        }
      </p>
    </div>
  </div>
</body>
</html>`;
}

// ═══════════════════════════════════════════════════════════════
// TEMPLATE 1: Welcome Email
// ═══════════════════════════════════════════════════════════════

export const welcomeTemplate: EmailTemplate = {
  id: 'welcome',
  name: 'Welcome Email',
  description: 'Sent to new subscribers',
  subject: 'Welcome to Highrise.pk Newsletter! 🏠',
  preview: 'Thank you for joining our community of real estate enthusiasts.',
  html: (data: Record<string, unknown>) => {
    const name = data.name ? escapeHtml(data.name) : null;
    const unsubscribeLink = typeof data.unsubscribeLink === 'string'
      ? data.unsubscribeLink
      : undefined;

    const content = `
      <h2 style="color: ${SECONDARY_COLOR}; margin: 0 0 20px 0;">
        Welcome${name ? `, ${name}` : ''}! 👋
      </h2>
      <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
        Thank you for subscribing to the Highrise.pk newsletter! We're excited to have you join
        our community of real estate enthusiasts, investors, and homeowners.
      </p>
      <div class="feature-card">
        <h3 style="color: ${SECONDARY_COLOR}; margin: 0 0 10px 0;">What to Expect:</h3>
        <ul style="color: #4a4a4a; margin: 0; padding-left: 20px;">
          <li>📊 <strong>Weekly Market Insights</strong> - Latest trends and analysis</li>
          <li>🏡 <strong>Featured Properties</strong> - Hand-picked listings</li>
          <li>💡 <strong>Expert Tips</strong> - Buying, selling, and investing guides</li>
          <li>🎯 <strong>Exclusive Deals</strong> - Special offers for subscribers</li>
        </ul>
      </div>
      <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6; margin: 20px 0;">
        Ready to explore properties?
      </p>
      <div style="text-align: center;">
        <a href="https://highrise.pk/properties" class="cta-button">Browse Properties →</a>
      </div>
      <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6; margin: 20px 0 0 0;">
        Best regards,<br>
        <strong>The Highrise.pk Team</strong>
      </p>`;

    return baseTemplate(content, unsubscribeLink);
  },
};

// ═══════════════════════════════════════════════════════════════
// TEMPLATE 2: Weekly Update
// ═══════════════════════════════════════════════════════════════

export const weeklyUpdateTemplate: EmailTemplate = {
  id: 'weekly_update',
  name: 'Weekly Update',
  description: 'Weekly newsletter with market updates',
  subject: 'This Week in Real Estate: {{date}}',
  preview: 'Market trends, featured properties, and expert insights.',
  html: (data: Record<string, unknown>) => {
    const stats = (data.marketStats !== null && typeof data.marketStats === 'object')
      ? (data.marketStats as Record<string, unknown>)
      : {};
    const properties = Array.isArray(data.featuredProperties)
      ? data.featuredProperties
      : [];
    const formattedDate = safeFormatDate(data.date, 'MMMM d, yyyy', 'This Week');
    const unsubscribeLink = typeof data.unsubscribeLink === 'string'
      ? data.unsubscribeLink
      : undefined;

    const propertyCards = properties.slice(0, 2).map((property: unknown) => {
      const p = (property !== null && typeof property === 'object')
        ? (property as Record<string, unknown>)
        : {};
      const imgSrc = safeUrl(p.image) !== '#'
        ? safeUrl(p.image)
        : 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=400';
      const slug = encodeURIComponent(str(p.slug, 'property'));
      return `
        <div class="property-card">
          <img src="${imgSrc}" alt="${escapeHtml(p.title ?? 'Property')}" class="property-image">
          <div class="property-details">
            <h4 style="margin: 0 0 10px 0; color: #333;">${escapeHtml(p.title ?? 'Property')}</h4>
            <div class="property-price">${escapeHtml(p.price ?? 'PKR 3.5 Crore')}</div>
            <p style="color: #666; margin: 10px 0; font-size: 14px;">
              ${escapeHtml(p.location ?? 'Lahore')} &bull;
              ${escapeHtml(p.bedrooms ?? '4')} Beds &bull;
              ${escapeHtml(p.bathrooms ?? '3')} Baths
            </p>
            <a href="https://highrise.pk/property/${slug}"
               class="cta-button" style="font-size: 14px; padding: 10px 20px;">
              View Details
            </a>
          </div>
        </div>`;
    }).join('');

    const content = `
      <h2 style="color: ${SECONDARY_COLOR}; margin: 0 0 10px 0;">This Week in Real Estate</h2>
      <p style="color: #666; margin: 0 0 30px 0;">${escapeHtml(formattedDate)}</p>
      <div class="stats-grid">
        <div class="stat-item">
          <div class="stat-value">${escapeHtml(stats.averagePrice ?? 'PKR 2.5Cr')}</div>
          <div class="stat-label">Avg. Property Price</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">${escapeHtml(stats.newListings ?? '245')}</div>
          <div class="stat-label">New Listings</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">${escapeHtml(stats.priceChange ?? '+3.2%')}</div>
          <div class="stat-label">Price Change</div>
        </div>
      </div>
      <h3 style="color: ${SECONDARY_COLOR}; margin: 30px 0 15px 0;">📈 Market Insights</h3>
      <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
        The Lahore real estate market shows continued growth with a
        ${escapeHtml(stats.priceChange ?? '3.2%')} increase in average prices this week.
      </p>
      <h3 style="color: ${SECONDARY_COLOR}; margin: 30px 0 15px 0;">🏡 Featured Properties</h3>
      ${propertyCards}
      <div style="text-align: center; margin: 30px 0;">
        <a href="https://highrise.pk/properties" class="cta-button">View All Properties →</a>
      </div>
      <div class="feature-card">
        <h3 style="color: ${SECONDARY_COLOR}; margin: 0 0 10px 0;">💡 Expert Tip of the Week</h3>
        <p style="color: #4a4a4a; margin: 0;">
          <strong>Negotiation Strategy:</strong> Always research comparable properties before making an offer.
          Properties listed for 60+ days often have room for negotiation.
        </p>
      </div>`;

    return baseTemplate(content, unsubscribeLink);
  },
};

// ═══════════════════════════════════════════════════════════════
// TEMPLATE 3: Property Alert
// ═══════════════════════════════════════════════════════════════

export const propertyAlertTemplate: EmailTemplate = {
  id: 'property_alert',
  name: 'Property Alert',
  description: 'Alert subscribers about new properties matching their criteria',
  subject: 'New Properties Matching Your Criteria! 🔔',
  preview: 'Check out these new properties that match your saved search.',
  html: (data: Record<string, unknown>) => {
    const properties = Array.isArray(data.properties) ? data.properties : [];
    const searchCriteria = escapeHtml(data.searchCriteria ?? '4-bedroom houses in DHA Lahore');
    const unsubscribeLink = typeof data.unsubscribeLink === 'string'
      ? data.unsubscribeLink
      : undefined;

    const propertyCards = properties.slice(0, 3).map((property: unknown) => {
      const p = (property !== null && typeof property === 'object')
        ? (property as Record<string, unknown>)
        : {};
      const imgSrc = safeUrl(p.image) !== '#'
        ? safeUrl(p.image)
        : 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=300';
      const slug = encodeURIComponent(str(p.slug, 'property-1'));
      return `
        <div class="property-card" style="margin-bottom: 20px;">
          <div style="display: flex; gap: 20px; padding: 20px;">
            <div style="flex: 0 0 150px;">
              <img src="${imgSrc}" alt="${escapeHtml(p.title ?? 'Property')}"
                   style="width: 150px; height: 120px; object-fit: cover; border-radius: 8px;">
            </div>
            <div style="flex: 1;">
              <h4 style="margin: 0 0 10px 0; color: #333;">${escapeHtml(p.title ?? 'Modern House')}</h4>
              <div style="color: ${PRIMARY_COLOR}; font-size: 18px; font-weight: 700; margin: 5px 0;">
                ${escapeHtml(p.price ?? 'PKR 4.2 Crore')}
              </div>
              <p style="color: #666; margin: 5px 0; font-size: 14px;">
                📍 ${escapeHtml(p.location ?? 'DHA Phase 5, Lahore')}
              </p>
              <div style="margin: 10px 0; font-size: 14px; color: #666;">
                🛏️ ${escapeHtml(p.bedrooms ?? '4')} Beds &nbsp;
                🚿 ${escapeHtml(p.bathrooms ?? '3')} Baths &nbsp;
                📏 ${escapeHtml(p.area ?? '10 Marla')}
              </div>
              <a href="https://highrise.pk/property/${slug}"
                 style="display: inline-block; padding: 8px 16px; background-color: ${PRIMARY_COLOR};
                        color: white; text-decoration: none; border-radius: 6px; font-size: 14px;">
                View Details
              </a>
            </div>
          </div>
        </div>`;
    }).join('');

    const content = `
      <h2 style="color: ${SECONDARY_COLOR}; margin: 0 0 20px 0;">New Properties Alert! 🔔</h2>
      <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
        We found <strong>${escapeHtml(properties.length || 3)} new properties</strong>
        matching: <strong>${searchCriteria}</strong>
      </p>
      ${propertyCards}
      <div style="text-align: center; margin: 30px 0;">
        <a href="https://highrise.pk/properties" class="cta-button">View All Matching Properties →</a>
      </div>
      <div class="feature-card">
        <h3 style="color: ${SECONDARY_COLOR}; margin: 0 0 10px 0;">💡 Quick Tip</h3>
        <p style="color: #4a4a4a; margin: 0;">
          Properties in this price range are selling fast! Consider scheduling a viewing soon.
        </p>
      </div>`;

    return baseTemplate(content, unsubscribeLink);
  },
};

// ═══════════════════════════════════════════════════════════════
// TEMPLATE 4: Market Insights
// ═══════════════════════════════════════════════════════════════

export const marketInsightsTemplate: EmailTemplate = {
  id: 'market_insights',
  name: 'Market Insights',
  description: 'Deep dive into market trends and analysis',
  subject: 'Market Insights: {{topic}}',
  preview: 'Expert analysis and trends in the real estate market.',
  html: (data: Record<string, unknown>) => {
    const topic = escapeHtml(data.topic ?? 'Lahore Real Estate Q1 2025 Analysis');
    const insights = Array.isArray(data.insights) ? data.insights : [];
    const charts = Array.isArray(data.charts) ? data.charts : [];
    const unsubscribeLink = typeof data.unsubscribeLink === 'string'
      ? data.unsubscribeLink
      : undefined;

    const insightItems = insights.map((insight: unknown) => `
      <div style="margin-bottom: 15px; padding-left: 20px; position: relative;">
        <div style="position: absolute; left: 0; top: 5px; width: 8px; height: 8px;
                    background-color: ${PRIMARY_COLOR}; border-radius: 50%;"></div>
        <p style="color: #4a4a4a; margin: 0;">${escapeHtml(insight)}</p>
      </div>`).join('');

    const chartItems = charts.map((chart: unknown) => {
      const c = (chart !== null && typeof chart === 'object')
        ? (chart as Record<string, unknown>)
        : {};
      return `
        <div style="margin: 30px 0; text-align: center;">
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 12px;">
            <h4 style="color: ${SECONDARY_COLOR}; margin: 0 0 15px 0;">${escapeHtml(c.title ?? 'Price Trends')}</h4>
            <div style="height: 200px; background: linear-gradient(to right, ${PRIMARY_COLOR} 70%, #e9ecef 30%);
                        border-radius: 8px; position: relative; margin: 20px 0;">
              <div style="position: absolute; top: 10px; left: 10px; color: white; font-weight: 600;">
                +${escapeHtml(c.value ?? '15%')}
              </div>
            </div>
            <p style="color: #666; font-size: 14px; margin: 10px 0 0 0;">
              ${escapeHtml(c.description ?? 'Year-over-year growth')}
            </p>
          </div>
        </div>`;
    }).join('');

    const content = `
      <h2 style="color: ${SECONDARY_COLOR}; margin: 0 0 10px 0;">Market Insights</h2>
      <h3 style="color: #333; margin: 0 0 30px 0; font-size: 22px;">${topic}</h3>
      <div style="background-color: #f0f9ff; border-left: 4px solid ${PRIMARY_COLOR}; padding: 20px; margin: 0 0 30px 0;">
        <p style="color: #4a4a4a; margin: 0; font-style: italic;">
          "The Lahore property market continues to show resilience with steady growth in premium sectors."
        </p>
      </div>
      <h4 style="color: ${SECONDARY_COLOR}; margin: 0 0 15px 0;">📊 Key Findings</h4>
      ${insightItems}
      ${chartItems}
      <div class="feature-card">
        <h4 style="color: ${SECONDARY_COLOR}; margin: 0 0 10px 0;">🎯 Investment Recommendations</h4>
        <p style="color: #4a4a4a; margin: 0;">
          Based on current trends, we recommend focusing on <strong>DHA Phase 6</strong> and
          <strong>Bahria Town</strong> for long-term investment.
        </p>
      </div>
      <div style="text-align: center; margin: 30px 0;">
        <a href="https://highrise.pk/blog/market-analysis" class="cta-button">Read Full Analysis →</a>
      </div>`;

    return baseTemplate(content, unsubscribeLink);
  },
};

// ═══════════════════════════════════════════════════════════════
// TEMPLATE 5: Custom Template
// ═══════════════════════════════════════════════════════════════

export const customTemplate: EmailTemplate = {
  id: 'custom',
  name: 'Custom Template',
  description: 'Create your own email design',
  subject: '{{subject}}',
  preview: 'Custom email content',
  html: (data: Record<string, unknown>) => {
    const content = typeof data.content === 'string'
      ? data.content
      : '<p>Custom email content</p>';
    const unsubscribeLink = typeof data.unsubscribeLink === 'string'
      ? data.unsubscribeLink
      : undefined;
    return baseTemplate(content, unsubscribeLink);
  },
};

// ═══════════════════════════════════════════════════════════════
// TEMPLATE 6: Inquiry Auto-Response
// ═══════════════════════════════════════════════════════════════

export const inquiryAutoResponseTemplate: EmailTemplate = {
  id: 'inquiry_auto_response',
  name: 'Inquiry Auto-Response',
  description: 'Automatic response when someone submits a property inquiry',
  subject: 'Thank You for Your Inquiry - {{propertyTitle}} | Highrise.pk',
  preview: 'We received your inquiry and will get back to you soon.',
  html: (data: Record<string, unknown>) => {
    const customerName = escapeHtml(data.customerName ?? '');
    const propertyTitle = escapeHtml(data.propertyTitle ?? '');
    const propertyPrice = escapeHtml(data.propertyPrice ?? '');
    const propertyLocation = escapeHtml(data.propertyLocation ?? '');
    const propertyImgSrc = safeUrl(data.propertyImage);
    const propertyUrl = safeUrl(data.propertyUrl);
    const brochureUrl = safeUrl(data.brochureUrl);
    const priceListUrl = safeUrl(data.priceListUrl);
    const whatsappNumber = safePhone(data.whatsappNumber) || '923001234567';
    const unsubscribeLink = typeof data.unsubscribeLink === 'string'
      ? data.unsubscribeLink
      : undefined;

    const waText = encodeURIComponent(
      `Assalam-u-Alaikum! Maine ${str(data.propertyTitle, 'property')} ke liye inquiry bheji thi. Kya aap details share kar sakte hain?`
    );

    const content = `
      <h2 style="color: ${SECONDARY_COLOR}; margin: 0 0 20px 0;">
        Assalam-u-Alaikum${customerName ? `, ${customerName}` : ''}! 👋
      </h2>
      <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
        Aap ka bohot shukriya Highrise.pk par inquiry bhejne ke liye!
        Hamari team jald az jald aap se contact karegi.
      </p>
      ${propertyTitle ? `
        <div class="feature-card" style="background-color: #f0f9ff;">
          <h3 style="color: ${SECONDARY_COLOR}; margin: 0 0 15px 0;">📋 Aapki Inquiry Details:</h3>
          <div class="property-card" style="margin-top: 15px;">
            ${propertyImgSrc !== '#' ? `<img src="${propertyImgSrc}" alt="${propertyTitle}" class="property-image">` : ''}
            <div class="property-details">
              <h4 style="margin: 0 0 10px 0; color: #333;">${propertyTitle}</h4>
              ${propertyPrice ? `<div class="property-price">${propertyPrice}</div>` : ''}
              ${propertyLocation ? `<p style="color: #666; margin: 10px 0; font-size: 14px;">📍 ${propertyLocation}</p>` : ''}
              ${propertyUrl !== '#' ? `
                <a href="${propertyUrl}" class="cta-button" style="font-size: 14px; padding: 10px 20px;">
                  View Property Details
                </a>` : ''}
            </div>
          </div>
        </div>` : ''}
      ${(brochureUrl !== '#' || priceListUrl !== '#') ? `
        <div style="margin: 30px 0;">
          <h3 style="color: ${SECONDARY_COLOR}; margin: 0 0 15px 0;">📎 Attachments:</h3>
          ${brochureUrl !== '#' ? `
            <a href="${brochureUrl}"
               style="display: inline-block; padding: 12px 20px; background-color: #f8f9fa;
                      border: 1px solid #e9ecef; border-radius: 8px; color: #333;
                      text-decoration: none; font-size: 14px; margin-right: 10px;">
              📄 Download Brochure
            </a>` : ''}
          ${priceListUrl !== '#' ? `
            <a href="${priceListUrl}"
               style="display: inline-block; padding: 12px 20px; background-color: #f8f9fa;
                      border: 1px solid #e9ecef; border-radius: 8px; color: #333;
                      text-decoration: none; font-size: 14px;">
              💰 Download Price List
            </a>` : ''}
        </div>` : ''}
      <div style="text-align: center; margin: 30px 0; padding: 25px; background-color: #dcfce7; border-radius: 12px;">
        <h3 style="color: #166534; margin: 0 0 10px 0;">💬 Jaldi Response Chahiye?</h3>
        <p style="color: #166534; margin: 0 0 15px 0; font-size: 14px;">WhatsApp par direct baat karein!</p>
        <a href="https://wa.me/${whatsappNumber}?text=${waText}"
           style="display: inline-block; padding: 14px 30px; background-color: #25D366;
                  color: white; text-decoration: none; border-radius: 8px; font-weight: 600;">
          📱 WhatsApp par Chat Karein
        </a>
      </div>
      <div class="feature-card">
        <h3 style="color: ${SECONDARY_COLOR}; margin: 0 0 10px 0;">🏠 Highrise.pk Kyun Choose Karein?</h3>
        <ul style="color: #4a4a4a; margin: 0; padding-left: 20px; line-height: 1.8;">
          <li>✅ <strong>Verified Properties</strong> - Sab properties verified hain</li>
          <li>✅ <strong>Best Prices</strong> - Market competitive rates</li>
          <li>✅ <strong>Expert Guidance</strong> - Free consultation available</li>
          <li>✅ <strong>Secure Transactions</strong> - Legal documentation support</li>
        </ul>
      </div>
      <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6; margin: 20px 0 0 0;">
        JazakAllah,<br>
        <strong>Highrise.pk Team</strong><br>
        <span style="color: #666; font-size: 14px;">📧 info@highrise.pk</span>
      </p>`;

    return baseTemplate(content, unsubscribeLink);
  },
};

// ═══════════════════════════════════════════════════════════════
// TEMPLATE 7: Admin Inquiry Notification
// ═══════════════════════════════════════════════════════════════

export const adminInquiryNotificationTemplate: EmailTemplate = {
  id: 'admin_inquiry_notification',
  name: 'Admin Inquiry Notification',
  description: 'Notification to admin when new inquiry comes',
  subject: '🔔 New Inquiry: {{propertyTitle}} - {{customerName}}',
  preview: 'A new property inquiry has been received.',
  html: (data: Record<string, unknown>) => {
    const customerName = escapeHtml(data.customerName ?? 'Not provided');
    const customerEmail = escapeHtml(data.customerEmail ?? 'Not provided');
    const customerPhone = safePhone(data.customerPhone);
    const customerPhoneDisplay = escapeHtml(data.customerPhone ?? 'Not provided');
    const customerMessage = data.customerMessage
      ? escapeHtml(data.customerMessage)
      : null;
    const propertyTitle = escapeHtml(data.propertyTitle ?? 'Property Title');
    const propertyPrice = escapeHtml(data.propertyPrice ?? '');
    const propertyLocation = escapeHtml(data.propertyLocation ?? '');
    const propertyUrl = safeUrl(data.propertyUrl);
    const inquiryTime = escapeHtml(data.inquiryTime ?? new Date().toLocaleString());
    const source = escapeHtml(data.source ?? 'Website');

    const waText = encodeURIComponent(
      `Assalam-u-Alaikum ${str(data.customerName, 'customer')}! Main Highrise.pk se bol raha hoon. Aap ne ${str(data.propertyTitle, 'property')} ke baare mein inquiry bheji thi.`
    );

    const content = `
      <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin-bottom: 20px;">
        <h3 style="color: #92400e; margin: 0;">🔔 New Property Inquiry Received!</h3>
      </div>
      <h2 style="color: ${SECONDARY_COLOR}; margin: 0 0 20px 0;">Customer Details</h2>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
        <tr>
          <td style="padding: 12px; border-bottom: 1px solid #e9ecef; font-weight: 600; width: 140px;">👤 Name:</td>
          <td style="padding: 12px; border-bottom: 1px solid #e9ecef;">${customerName}</td>
        </tr>
        <tr>
          <td style="padding: 12px; border-bottom: 1px solid #e9ecef; font-weight: 600;">📧 Email:</td>
          <td style="padding: 12px; border-bottom: 1px solid #e9ecef;">
            <a href="mailto:${escapeHtml(data.customerEmail ?? '')}" style="color: ${PRIMARY_COLOR};">
              ${customerEmail}
            </a>
          </td>
        </tr>
        <tr>
          <td style="padding: 12px; border-bottom: 1px solid #e9ecef; font-weight: 600;">📞 Phone:</td>
          <td style="padding: 12px; border-bottom: 1px solid #e9ecef;">
            <a href="tel:${customerPhone}" style="color: ${PRIMARY_COLOR};">${customerPhoneDisplay}</a>
          </td>
        </tr>
        <tr>
          <td style="padding: 12px; border-bottom: 1px solid #e9ecef; font-weight: 600;">🕐 Time:</td>
          <td style="padding: 12px; border-bottom: 1px solid #e9ecef;">${inquiryTime}</td>
        </tr>
        <tr>
          <td style="padding: 12px; border-bottom: 1px solid #e9ecef; font-weight: 600;">📍 Source:</td>
          <td style="padding: 12px; border-bottom: 1px solid #e9ecef;">${source}</td>
        </tr>
      </table>
      ${customerMessage ? `
        <div class="feature-card">
          <h3 style="color: ${SECONDARY_COLOR}; margin: 0 0 10px 0;">💬 Customer Message:</h3>
          <p style="color: #4a4a4a; margin: 0; font-style: italic;">"${customerMessage}"</p>
        </div>` : ''}
      <h2 style="color: ${SECONDARY_COLOR}; margin: 30px 0 20px 0;">Property Details</h2>
      <div class="property-card">
        <div class="property-details">
          <h4 style="margin: 0 0 10px 0; color: #333;">${propertyTitle}</h4>
          ${propertyPrice ? `<div class="property-price">${propertyPrice}</div>` : ''}
          ${propertyLocation ? `<p style="color: #666; margin: 10px 0; font-size: 14px;">📍 ${propertyLocation}</p>` : ''}
        </div>
      </div>
      <div style="text-align: center; margin: 30px 0;">
        <a href="https://wa.me/${customerPhone}?text=${waText}"
           style="display: inline-block; padding: 14px 30px; background-color: #25D366;
                  color: white; text-decoration: none; border-radius: 8px; font-weight: 600; margin-right: 10px;">
          📱 WhatsApp Reply
        </a>
        <a href="tel:${customerPhone}"
           style="display: inline-block; padding: 14px 30px; background-color: ${PRIMARY_COLOR};
                  color: white; text-decoration: none; border-radius: 8px; font-weight: 600;">
          📞 Call Customer
        </a>
      </div>
      ${propertyUrl !== '#' ? `
        <div style="text-align: center;">
          <a href="${propertyUrl}" class="cta-button" style="background-color: #6b7280;">
            View Property Listing →
          </a>
        </div>` : ''}
      <p style="color: #666; font-size: 14px; text-align: center; margin: 30px 0 0 0;">
        ⚡ Quick response = Happy customer!
      </p>`;

    return baseTemplate(content);
  },
};

// ═══════════════════════════════════════════════════════════════
// TEMPLATE 8: Agent Onboarding Confirmation (sent to agent)
// ═══════════════════════════════════════════════════════════════

export const agentOnboardingConfirmationTemplate: EmailTemplate = {
  id: 'agent_onboarding_confirmation',
  name: 'Agent Onboarding Confirmation',
  description: 'Sent to agent after onboarding form submission',
  subject: 'Application Received - Highrise.pk Verification | Aapki Application Mil Gayi',
  preview: 'Your agent application has been received and is under review.',
  html: (data: Record<string, unknown>) => {
    const agentName   = escapeHtml(data.agentName   ?? 'Agent');
    const agencyName  = escapeHtml(data.agencyName  ?? '');
    const profileId   = escapeHtml(data.profileId   ?? '');
    const submittedAt = safeFormatDate(data.submittedAt, 'dd MMM yyyy, hh:mm a', 'Just now');
    const supportUrl  = safeUrl(
      str(data.supportUrl, 'https://highrise.pk/contact')
    );

    const content = `
      <h2 style="color: ${SECONDARY_COLOR}; margin: 0 0 20px 0;">
        Assalam-u-Alaikum, ${agentName}! 🎉
      </h2>

      <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
        Aapki agent application <strong>Highrise.pk</strong> par successfully receive ho gayi hai.
        Hamari verification team <strong>1-3 business days</strong> mein review karegi.
      </p>

      <div class="feature-card" style="background-color: #f0f9ff; border-left: 4px solid ${PRIMARY_COLOR};">
        <h3 style="color: ${SECONDARY_COLOR}; margin: 0 0 12px 0;">📋 Application Summary</h3>
        <table style="width: 100%; border-collapse: collapse;">
          ${agencyName ? `
          <tr>
            <td style="padding: 6px 0; color: #666; width: 40%; font-size: 14px;">Agency / Company:</td>
            <td style="padding: 6px 0; font-weight: 600; font-size: 14px;">${agencyName}</td>
          </tr>` : ''}
          <tr>
            <td style="padding: 6px 0; color: #666; font-size: 14px;">Application ID:</td>
            <td style="padding: 6px 0; font-family: monospace; font-size: 13px; color: ${PRIMARY_COLOR};">${profileId}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #666; font-size: 14px;">Submitted:</td>
            <td style="padding: 6px 0; font-size: 14px;">${submittedAt}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #666; font-size: 14px;">Status:</td>
            <td style="padding: 6px 0;">
              <span style="background: #fef3c7; color: #92400e; padding: 2px 10px; border-radius: 20px; font-size: 13px; font-weight: 600;">
                ⏳ Under Review
              </span>
            </td>
          </tr>
        </table>
      </div>

      <div style="margin: 24px 0;">
        <h3 style="color: ${SECONDARY_COLOR}; margin: 0 0 12px 0;">✅ Next Steps</h3>
        <div style="display: flex; flex-direction: column; gap: 10px;">
          <div style="background: #f8f9fa; border-radius: 8px; padding: 12px 16px; border-left: 3px solid ${PRIMARY_COLOR};">
            <strong style="color: #333;">Step 1 — Document Review</strong>
            <p style="color: #666; margin: 4px 0 0; font-size: 14px;">
              Hamari team aapki submitted details verify karegi. Agar additional documents chahiye honge to email aayegi.
            </p>
          </div>
          <div style="background: #f8f9fa; border-radius: 8px; padding: 12px 16px; border-left: 3px solid #94a3b8;">
            <strong style="color: #333;">Step 2 — Admin Approval</strong>
            <p style="color: #666; margin: 4px 0 0; font-size: 14px;">
              Approval ke baad aapko email notification milegi aur aap properties list kar sakein ge.
            </p>
          </div>
          <div style="background: #f8f9fa; border-radius: 8px; padding: 12px 16px; border-left: 3px solid #94a3b8;">
            <strong style="color: #333;">Step 3 — Start Listing</strong>
            <p style="color: #666; margin: 4px 0 0; font-size: 14px;">
              Approved agents Highrise.pk ke verified network mein dikhenge aur leads receive kar sakte hain.
            </p>
          </div>
        </div>
      </div>

      <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 14px 16px; border-radius: 0 8px 8px 0; margin: 20px 0;">
        <strong style="color: #92400e;">⚠️ Important / Zaroori Baat</strong>
        <p style="color: #92400e; margin: 6px 0 0; font-size: 14px;">
          Fake ya inaccurate details platform se removal ka sabab ban sakti hain.
          Sirf real aur verified business information submit karein.
        </p>
      </div>

      <div style="text-align: center; margin: 28px 0;">
        <a href="${supportUrl}" class="cta-button">
          Contact Support →
        </a>
      </div>

      <p style="color: #4a4a4a; font-size: 15px; line-height: 1.6; margin: 20px 0 0 0;">
        JazakAllah Khair,<br>
        <strong>Highrise.pk Verification Team</strong><br>
        <span style="color: #666; font-size: 13px;">📧 support@highrise.pk</span>
      </p>`;

    return baseTemplate(content);
  },
};

// ═══════════════════════════════════════════════════════════════
// TEMPLATE 9: Admin New Agent Application Notification
// ═══════════════════════════════════════════════════════════════

export const adminNewAgentApplicationTemplate: EmailTemplate = {
  id: 'admin_new_agent_application',
  name: 'Admin New Agent Application',
  description: 'Sent to admin when a new agent submits onboarding form',
  subject: '🔔 New Agent Application: {{agencyName}} — Action Required',
  preview: 'A new agent application requires your review.',
  html: (data: Record<string, unknown>) => {
    const agentName    = escapeHtml(data.agentName    ?? 'Unknown');
    const agencyName   = escapeHtml(data.agencyName   ?? 'Unknown Agency');
    const agentEmail   = escapeHtml(data.agentEmail   ?? 'Not provided');
    const city         = escapeHtml(data.city         ?? 'Not provided');
    const agentType    = escapeHtml(data.agentType    ?? 'individual');
    const profileId    = escapeHtml(data.profileId    ?? '');
    const submittedAt  = safeFormatDate(data.submittedAt, 'dd MMM yyyy, hh:mm a', 'Just now');
    const licenseNo    = escapeHtml(data.licenseNumber ?? 'Not provided');
    const ntnNo        = escapeHtml(data.ntnNo        ?? 'Not provided');
    const reviewUrl    = safeUrl(str(data.reviewUrl, 'https://highrise.pk/admin/agents'));
    const hasLicense   = Boolean(data.licenseNumber);
    const hasNtn       = Boolean(data.ntnNo);

    const content = `
      <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 14px 16px; border-radius: 0 8px 8px 0; margin-bottom: 24px;">
        <strong style="color: #92400e;">🔔 New Agent Application — Review Required</strong>
        <p style="color: #92400e; margin: 4px 0 0; font-size: 14px;">
          A new agent has submitted their onboarding application. Please review within 1-3 business days.
        </p>
      </div>

      <h2 style="color: ${SECONDARY_COLOR}; margin: 0 0 20px 0;">Agent Application Details</h2>

      <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
        <tr style="background: #f8f9fa;">
          <td style="padding: 10px 12px; color: #666; font-size: 14px; width: 35%; border-bottom: 1px solid #e9ecef;">
            👤 Agent Name
          </td>
          <td style="padding: 10px 12px; font-weight: 600; font-size: 14px; border-bottom: 1px solid #e9ecef;">
            ${agentName}
          </td>
        </tr>
        <tr>
          <td style="padding: 10px 12px; color: #666; font-size: 14px; border-bottom: 1px solid #e9ecef;">
            🏢 Agency / Company
          </td>
          <td style="padding: 10px 12px; font-weight: 600; font-size: 14px; border-bottom: 1px solid #e9ecef;">
            ${agencyName}
          </td>
        </tr>
        <tr style="background: #f8f9fa;">
          <td style="padding: 10px 12px; color: #666; font-size: 14px; border-bottom: 1px solid #e9ecef;">
            📧 Email
          </td>
          <td style="padding: 10px 12px; font-size: 14px; border-bottom: 1px solid #e9ecef;">
            ${agentEmail}
          </td>
        </tr>
        <tr>
          <td style="padding: 10px 12px; color: #666; font-size: 14px; border-bottom: 1px solid #e9ecef;">
            📍 City
          </td>
          <td style="padding: 10px 12px; font-size: 14px; border-bottom: 1px solid #e9ecef;">
            ${city}
          </td>
        </tr>
        <tr style="background: #f8f9fa;">
          <td style="padding: 10px 12px; color: #666; font-size: 14px; border-bottom: 1px solid #e9ecef;">
            🏷️ Agent Type
          </td>
          <td style="padding: 10px 12px; font-size: 14px; border-bottom: 1px solid #e9ecef;">
            ${agentType}
          </td>
        </tr>
        <tr>
          <td style="padding: 10px 12px; color: #666; font-size: 14px; border-bottom: 1px solid #e9ecef;">
            📄 License No
          </td>
          <td style="padding: 10px 12px; font-size: 14px; border-bottom: 1px solid #e9ecef;">
            ${hasLicense
              ? `<span style="color: #059669; font-weight: 600;">${licenseNo}</span>`
              : `<span style="color: #dc2626;">Not provided</span>`
            }
          </td>
        </tr>
        <tr style="background: #f8f9fa;">
          <td style="padding: 10px 12px; color: #666; font-size: 14px; border-bottom: 1px solid #e9ecef;">
            🔢 NTN
          </td>
          <td style="padding: 10px 12px; font-size: 14px; border-bottom: 1px solid #e9ecef;">
            ${hasNtn
              ? `<span style="color: #059669; font-weight: 600;">${ntnNo}</span>`
              : `<span style="color: #6b7280;">Not provided</span>`
            }
          </td>
        </tr>
        <tr>
          <td style="padding: 10px 12px; color: #666; font-size: 14px; border-bottom: 1px solid #e9ecef;">
            🕐 Submitted
          </td>
          <td style="padding: 10px 12px; font-size: 14px; border-bottom: 1px solid #e9ecef;">
            ${submittedAt}
          </td>
        </tr>
        <tr style="background: #f8f9fa;">
          <td style="padding: 10px 12px; color: #666; font-size: 14px;">
            🆔 Profile ID
          </td>
          <td style="padding: 10px 12px; font-family: monospace; font-size: 13px; color: ${PRIMARY_COLOR};">
            ${profileId}
          </td>
        </tr>
      </table>

      <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 14px 16px; margin-bottom: 24px;">
        <strong style="color: #166534; font-size: 14px;">✅ Anti-Fraud Checks Passed</strong>
        <ul style="color: #166534; margin: 8px 0 0; padding-left: 20px; font-size: 13px; line-height: 1.8;">
          <li>CNIC verified and locked from user signup</li>
          <li>Duplicate CNIC check across Agent &amp; Developer collections — Passed</li>
          <li>License number uniqueness check — ${hasLicense ? 'Passed' : 'Skipped (not provided)'}</li>
          <li>NTN uniqueness check — ${hasNtn ? 'Passed' : 'Skipped (not provided)'}</li>
          <li>Phone uniqueness check — Passed</li>
          <li>Existing profile check — Passed (no prior application)</li>
        </ul>
      </div>

      <div style="text-align: center; margin: 28px 0;">
        <a href="${reviewUrl}"
           style="display: inline-block; background: ${PRIMARY_COLOR}; color: #ffffff;
                  padding: 14px 32px; text-decoration: none; border-radius: 8px;
                  font-weight: 600; font-size: 16px;">
          Review Application →
        </a>
      </div>

      <p style="color: #999; font-size: 12px; text-align: center; margin: 20px 0 0;">
        This is an automated notification from Highrise.pk verification system.
      </p>`;

    return baseTemplate(content);
  },
};

// ═══════════════════════════════════════════════════════════════
// TEMPLATE 10: Agent Onboarding APPROVED
// ═══════════════════════════════════════════════════════════════

export const agentOnboardingApprovedTemplate: EmailTemplate = {
  id: 'agent_onboarding_approved',
  name: 'Agent Onboarding Approved',
  description: 'Sent to agent when application is approved',
  subject: '🎉 Mubarak Ho! Your Agent Account is Approved - Highrise.pk',
  preview: 'Your agent verification is complete. Start listing properties now.',
  html: (data: Record<string, unknown>) => {
    const agentName = escapeHtml(data.agentName ?? 'Agent');
    const agencyName = escapeHtml(data.agencyName ?? '');
    const dashboardUrl = safeUrl(str(data.dashboardUrl, 'https://highrise.pk/agent/dashboard'));

    const content = `
      <div style="text-align: center; margin-bottom: 24px;">
        <div style="display: inline-block; background: #10b981; color: white; padding: 16px; border-radius: 50%; font-size: 32px;">✓</div>
      </div>

      <h2 style="color: ${SECONDARY_COLOR}; margin: 0 0 16px 0; text-align: center;">
        🎉 Mubarak Ho, ${agentName}!
      </h2>

      <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6; text-align: center; margin: 0 0 24px 0;">
        Aapki agent application <strong>approve</strong> ho gayi hai.
        Aap ab Highrise.pk ke verified agents network ka hissa hain.
      </p>

      <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 24px; border-radius: 12px; text-align: center; margin: 24px 0;">
        <h3 style="margin: 0 0 8px 0; color: white;">✅ Account Status: VERIFIED</h3>
        ${agencyName ? `<p style="margin: 0; opacity: 0.95;">${agencyName}</p>` : ''}
      </div>

      <h3 style="color: ${SECONDARY_COLOR}; margin: 24px 0 12px 0;">🚀 Ab Aap Ye Kar Sakte Hain:</h3>
      <ul style="color: #4a4a4a; line-height: 1.8; padding-left: 20px;">
        <li><strong>Properties List Karein</strong> — Unlimited verified listings</li>
        <li><strong>Client Inquiries Receive Karein</strong> — Direct leads from verified buyers</li>
        <li><strong>Verified Agent Badge</strong> — Aapki profile par trust badge</li>
        <li><strong>Public Profile</strong> — Buyers can find and contact you directly</li>
        <li><strong>Analytics Dashboard</strong> — Track your performance</li>
      </ul>

      <div style="text-align: center; margin: 32px 0;">
        <a href="${dashboardUrl}" class="cta-button" style="background: #10b981; font-size: 16px;">
          Go to Dashboard →
        </a>
      </div>

      <div class="feature-card" style="background: #f0fdf4; border-left-color: #10b981;">
        <h4 style="color: #166534; margin: 0 0 8px 0;">💡 Quick Tip</h4>
        <p style="color: #166534; margin: 0; font-size: 14px;">
          Apni profile complete karein, professional photos add karein, aur quick response do —
          ye sab Trust Score barhane mein madad karte hain.
        </p>
      </div>

      <p style="color: #4a4a4a; font-size: 15px; margin: 24px 0 0 0;">
        JazakAllah,<br>
        <strong>Highrise.pk Verification Team</strong>
      </p>`;

    return baseTemplate(content);
  },
};

// ═══════════════════════════════════════════════════════════════
// TEMPLATE 11: Agent Onboarding REJECTED
// ═══════════════════════════════════════════════════════════════

export const agentOnboardingRejectedTemplate: EmailTemplate = {
  id: 'agent_onboarding_rejected',
  name: 'Agent Onboarding Rejected',
  description: 'Sent to agent when application is rejected',
  subject: 'Application Review Update - Highrise.pk',
  preview: 'Important update about your agent application.',
  html: (data: Record<string, unknown>) => {
    const agentName = escapeHtml(data.agentName ?? 'Agent');
    const reason = data.reason ? escapeHtml(data.reason) : null;
    const supportUrl = safeUrl(str(data.supportUrl, 'https://highrise.pk/contact'));

    const content = `
      <h2 style="color: ${SECONDARY_COLOR}; margin: 0 0 16px 0;">
        Application Review Update
      </h2>

      <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
        Assalam-u-Alaikum ${agentName},
      </p>

      <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
        After careful review, hum aapki agent application is waqt approve nahi kar sake.
      </p>

      ${reason ? `
        <div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 16px; border-radius: 0 8px 8px 0; margin: 20px 0;">
          <strong style="color: #991b1b; display: block; margin-bottom: 8px;">Reason / Wajah:</strong>
          <p style="color: #991b1b; margin: 0; font-size: 14px; line-height: 1.6;">${reason}</p>
        </div>` : ''}

      <h3 style="color: ${SECONDARY_COLOR}; margin: 24px 0 12px 0;">📝 What You Can Do</h3>
      <ul style="color: #4a4a4a; line-height: 1.8; padding-left: 20px;">
        <li>Address the concerns mentioned above</li>
        <li>Update or resubmit the required documents</li>
        <li>Contact our support team if you need clarification</li>
        <li>You may submit a new application after 30 days</li>
      </ul>

      <div style="text-align: center; margin: 28px 0;">
        <a href="${supportUrl}" class="cta-button">
          Contact Support →
        </a>
      </div>

      <p style="color: #666; font-size: 14px; line-height: 1.6; margin: 20px 0 0 0;">
        Hum samajhte hain ye disappointing ho sakta hai. Agar aap ko lagta hai ye decision
        ghalat hai, support team se rabta karein.
      </p>

      <p style="color: #4a4a4a; font-size: 15px; margin: 20px 0 0 0;">
        Best regards,<br>
        <strong>Highrise.pk Verification Team</strong>
      </p>`;

    return baseTemplate(content);
  },
};

// ═══════════════════════════════════════════════════════════════
// TEMPLATE 12: Agent Onboarding INFO REQUIRED
// ═══════════════════════════════════════════════════════════════

export const agentOnboardingInfoRequiredTemplate: EmailTemplate = {
  id: 'agent_onboarding_info_required',
  name: 'Agent Onboarding Info Required',
  description: 'Sent to agent when more information is needed',
  subject: 'Additional Information Needed - Highrise.pk Agent Application',
  preview: 'Please provide additional information to complete your verification.',
  html: (data: Record<string, unknown>) => {
    const agentName = escapeHtml(data.agentName ?? 'Agent');
    const reason = data.reason ? escapeHtml(data.reason) : 'Additional information required.';
    const dashboardUrl = safeUrl(str(data.dashboardUrl, 'https://highrise.pk/dashboard'));

    const content = `
      <h2 style="color: ${SECONDARY_COLOR}; margin: 0 0 16px 0;">
        Additional Information Required
      </h2>

      <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
        Assalam-u-Alaikum ${agentName},
      </p>

      <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
        Hamari verification team ne aapki application review ki hai, lekin process complete karne
        ke liye kuch additional information chahiye.
      </p>

      <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; border-radius: 0 8px 8px 0; margin: 20px 0;">
        <strong style="color: #92400e; display: block; margin-bottom: 8px;">📋 What We Need:</strong>
        <p style="color: #92400e; margin: 0; font-size: 14px; line-height: 1.7;">${reason}</p>
      </div>

      <h3 style="color: ${SECONDARY_COLOR}; margin: 24px 0 12px 0;">🔄 Next Steps</h3>
      <ol style="color: #4a4a4a; line-height: 1.8; padding-left: 20px;">
        <li>Login to your Highrise.pk dashboard</li>
        <li>Review the requested information above</li>
        <li>Update your profile with the required details</li>
        <li>Resubmit your application for review</li>
      </ol>

      <div style="text-align: center; margin: 28px 0;">
        <a href="${dashboardUrl}" class="cta-button">
          Update Application →
        </a>
      </div>

      <p style="color: #666; font-size: 14px; line-height: 1.6; margin: 20px 0 0 0;">
        ⏱️ <strong>Tip:</strong> Jaldi response = jaldi approval. Hum aapki application
        priority pe rakhenge jab aap updated information submit karein.
      </p>

      <p style="color: #4a4a4a; font-size: 15px; margin: 20px 0 0 0;">
        Best regards,<br>
        <strong>Highrise.pk Verification Team</strong>
      </p>`;

    return baseTemplate(content);
  },
};

// ═══════════════════════════════════════════════════════════════
// TEMPLATE 13: Developer Onboarding Confirmation
// ═══════════════════════════════════════════════════════════════

export const developerOnboardingConfirmationTemplate: EmailTemplate = {
  id: 'developer_onboarding_confirmation',
  name: 'Developer Onboarding Confirmation',
  description: 'Sent to developer after onboarding form submission',
  subject: 'Application Received - Highrise.pk Developer Verification',
  preview: 'Your developer application has been received and is under review.',
  html: (data: Record<string, unknown>) => {
    const developerName = escapeHtml(data.developerName ?? 'Developer');
    const companyName = escapeHtml(data.companyName ?? '');
    const profileId = escapeHtml(data.profileId ?? '');
    const submittedAt = safeFormatDate(data.submittedAt, 'dd MMM yyyy, hh:mm a', 'Just now');
    const supportUrl = safeUrl(str(data.supportUrl, 'https://highrise.pk/contact'));

    const content = `
      <h2 style="color: ${SECONDARY_COLOR}; margin: 0 0 20px 0;">
        Assalam-u-Alaikum, ${developerName}! 🏗️
      </h2>

      <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
        Aapki developer application <strong>${companyName}</strong> ke liye successfully receive
        ho gayi hai. Hamari verification team <strong>1-3 business days</strong> mein review karegi.
      </p>

      <div class="feature-card" style="background-color: #f0f9ff; border-left: 4px solid ${PRIMARY_COLOR};">
        <h3 style="color: ${SECONDARY_COLOR}; margin: 0 0 12px 0;">📋 Application Summary</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 6px 0; color: #666; width: 40%; font-size: 14px;">Company:</td>
            <td style="padding: 6px 0; font-weight: 600; font-size: 14px;">${companyName}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #666; font-size: 14px;">Application ID:</td>
            <td style="padding: 6px 0; font-family: monospace; font-size: 13px; color: ${PRIMARY_COLOR};">${profileId}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #666; font-size: 14px;">Submitted:</td>
            <td style="padding: 6px 0; font-size: 14px;">${submittedAt}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #666; font-size: 14px;">Status:</td>
            <td style="padding: 6px 0;">
              <span style="background: #fef3c7; color: #92400e; padding: 2px 10px; border-radius: 20px; font-size: 13px; font-weight: 600;">
                ⏳ Under Review
              </span>
            </td>
          </tr>
        </table>
      </div>

      <div style="margin: 24px 0;">
        <h3 style="color: ${SECONDARY_COLOR}; margin: 0 0 12px 0;">✅ Verification Process</h3>
        <ul style="color: #4a4a4a; padding-left: 20px; line-height: 1.8;">
          <li><strong>SECP & NTN Verification</strong> — FBR aur SECP records check honge</li>
          <li><strong>Authorized Person CNIC</strong> — NADRA verification</li>
          <li><strong>Past Projects Review</strong> — Documentation aur portfolio review</li>
          <li><strong>Email Notification</strong> — Approval ya feedback ki email aayegi</li>
        </ul>
      </div>

      <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 14px 16px; border-radius: 0 8px 8px 0; margin: 20px 0;">
        <strong style="color: #92400e;">⚠️ Important</strong>
        <p style="color: #92400e; margin: 6px 0 0; font-size: 14px;">
          Fake ya inaccurate documents permanent ban ka sabab ban sakte hain.
          Hum FBR aur SECP records ke saath cross-verify karte hain.
        </p>
      </div>

      <div style="text-align: center; margin: 28px 0;">
        <a href="${supportUrl}" class="cta-button">
          Contact Support →
        </a>
      </div>

      <p style="color: #4a4a4a; font-size: 15px; margin: 20px 0 0 0;">
        JazakAllah Khair,<br>
        <strong>Highrise.pk Verification Team</strong>
      </p>`;

    return baseTemplate(content);
  },
};

// ═══════════════════════════════════════════════════════════════
// TEMPLATE 14: Developer Onboarding APPROVED
// ═══════════════════════════════════════════════════════════════

export const developerOnboardingApprovedTemplate: EmailTemplate = {
  id: 'developer_onboarding_approved',
  name: 'Developer Onboarding Approved',
  description: 'Sent to developer when application is approved',
  subject: '🎉 Mubarak Ho! Your Developer Account is Approved - Highrise.pk',
  preview: 'Your developer verification is complete. Start listing projects now.',
  html: (data: Record<string, unknown>) => {
    const developerName = escapeHtml(data.developerName ?? 'Developer');
    const companyName = escapeHtml(data.companyName ?? '');
    const dashboardUrl = safeUrl(str(data.dashboardUrl, 'https://highrise.pk/developer/dashboard'));

    const content = `
      <div style="text-align: center; margin-bottom: 24px;">
        <div style="display: inline-block; background: #10b981; color: white; padding: 16px; border-radius: 50%; font-size: 32px;">✓</div>
      </div>

      <h2 style="color: ${SECONDARY_COLOR}; margin: 0 0 16px 0; text-align: center;">
        🎉 Mubarak Ho, ${developerName}!
      </h2>

      <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6; text-align: center; margin: 0 0 24px 0;">
        <strong>${companyName}</strong> ki developer application <strong>approve</strong> ho gayi hai.
        Aap ab Highrise.pk ke verified developers network ka hissa hain.
      </p>

      <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 24px; border-radius: 12px; text-align: center; margin: 24px 0;">
        <h3 style="margin: 0 0 8px 0; color: white;">✅ Account Status: VERIFIED DEVELOPER</h3>
        <p style="margin: 0; opacity: 0.95;">${companyName}</p>
      </div>

      <h3 style="color: ${SECONDARY_COLOR}; margin: 24px 0 12px 0;">🏗️ Ab Aap Ye Kar Sakte Hain:</h3>
      <ul style="color: #4a4a4a; line-height: 1.8; padding-left: 20px;">
        <li><strong>Projects Add Karein</strong> — Unlimited project listings</li>
        <li><strong>Units Manage Karein</strong> — Block-wise, phase-wise inventory</li>
        <li><strong>Verified Developer Badge</strong> — Trust badge on your profile</li>
        <li><strong>Public Developer Profile</strong> — Buyers can find and contact you</li>
        <li><strong>Buyer Inquiries</strong> — Direct leads from verified buyers</li>
        <li><strong>Analytics Dashboard</strong> — Track views, leads, conversions</li>
      </ul>

      <div style="text-align: center; margin: 32px 0;">
        <a href="${dashboardUrl}" class="cta-button" style="background: #10b981; font-size: 16px;">
          Go to Developer Dashboard →
        </a>
      </div>

      <div class="feature-card" style="background: #f0fdf4; border-left-color: #10b981;">
        <h4 style="color: #166534; margin: 0 0 8px 0;">💡 Pro Tip</h4>
        <p style="color: #166534; margin: 0; font-size: 14px;">
          Complete your developer profile, add past projects ki photos, aur quickly respond karein
          buyer inquiries ko — ye sab Trust Score aur Badge tier barhane mein madad karte hain.
        </p>
      </div>

      <p style="color: #4a4a4a; font-size: 15px; margin: 24px 0 0 0;">
        JazakAllah,<br>
        <strong>Highrise.pk Verification Team</strong>
      </p>`;

    return baseTemplate(content);
  },
};

// ═══════════════════════════════════════════════════════════════
// TEMPLATE 15: Developer Onboarding REJECTED
// ═══════════════════════════════════════════════════════════════

export const developerOnboardingRejectedTemplate: EmailTemplate = {
  id: 'developer_onboarding_rejected',
  name: 'Developer Onboarding Rejected',
  description: 'Sent to developer when application is rejected',
  subject: 'Application Review Update - Highrise.pk',
  preview: 'Important update about your developer application.',
  html: (data: Record<string, unknown>) => {
    const developerName = escapeHtml(data.developerName ?? 'Developer');
    const companyName = escapeHtml(data.companyName ?? '');
    const reason = data.reason ? escapeHtml(data.reason) : null;
    const supportUrl = safeUrl(str(data.supportUrl, 'https://highrise.pk/contact'));

    const content = `
      <h2 style="color: ${SECONDARY_COLOR}; margin: 0 0 16px 0;">
        Application Review Update
      </h2>

      <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
        Assalam-u-Alaikum ${developerName},
      </p>

      <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
        After careful review, hum <strong>${companyName}</strong> ki developer application
        is waqt approve nahi kar sake.
      </p>

      ${reason ? `
        <div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 16px; border-radius: 0 8px 8px 0; margin: 20px 0;">
          <strong style="color: #991b1b; display: block; margin-bottom: 8px;">Reason / Wajah:</strong>
          <p style="color: #991b1b; margin: 0; font-size: 14px; line-height: 1.6;">${reason}</p>
        </div>` : ''}

      <h3 style="color: ${SECONDARY_COLOR}; margin: 24px 0 12px 0;">📝 What You Can Do</h3>
      <ul style="color: #4a4a4a; line-height: 1.8; padding-left: 20px;">
        <li>Address the concerns mentioned above</li>
        <li>Verify your SECP and NTN documents are valid and current</li>
        <li>Ensure authorized person CNIC is correct</li>
        <li>Contact our support team for clarification</li>
        <li>You may submit a new application after 30 days</li>
      </ul>

      <div style="text-align: center; margin: 28px 0;">
        <a href="${supportUrl}" class="cta-button">
          Contact Support →
        </a>
      </div>

      <p style="color: #666; font-size: 14px; line-height: 1.6; margin: 20px 0 0 0;">
        Agar aap ko lagta hai ye decision ghalat hai ya documents mein technical issue tha,
        support team se rabta karein. Hum re-evaluation kar sakte hain.
      </p>

      <p style="color: #4a4a4a; font-size: 15px; margin: 20px 0 0 0;">
        Best regards,<br>
        <strong>Highrise.pk Verification Team</strong>
      </p>`;

    return baseTemplate(content);
  },
};

// ═══════════════════════════════════════════════════════════════
// TEMPLATE 16: Developer Onboarding INFO REQUIRED
// ═══════════════════════════════════════════════════════════════

export const developerOnboardingInfoRequiredTemplate: EmailTemplate = {
  id: 'developer_onboarding_info_required',
  name: 'Developer Onboarding Info Required',
  description: 'Sent to developer when more information is needed',
  subject: 'Additional Information Needed - Highrise.pk Developer Application',
  preview: 'Please provide additional information to complete your developer verification.',
  html: (data: Record<string, unknown>) => {
    const developerName = escapeHtml(data.developerName ?? 'Developer');
    const companyName = escapeHtml(data.companyName ?? '');
    const reason = data.reason ? escapeHtml(data.reason) : 'Additional information required.';
    const dashboardUrl = safeUrl(str(data.dashboardUrl, 'https://highrise.pk/dashboard'));

    const content = `
      <h2 style="color: ${SECONDARY_COLOR}; margin: 0 0 16px 0;">
        Additional Information Required
      </h2>

      <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
        Assalam-u-Alaikum ${developerName},
      </p>

      <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
        Hamari verification team ne <strong>${companyName}</strong> ki application review ki hai,
        lekin process complete karne ke liye kuch additional information chahiye.
      </p>

      <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; border-radius: 0 8px 8px 0; margin: 20px 0;">
        <strong style="color: #92400e; display: block; margin-bottom: 8px;">📋 What We Need:</strong>
        <p style="color: #92400e; margin: 0; font-size: 14px; line-height: 1.7;">${reason}</p>
      </div>

      <h3 style="color: ${SECONDARY_COLOR}; margin: 24px 0 12px 0;">🔄 Next Steps</h3>
      <ol style="color: #4a4a4a; line-height: 1.8; padding-left: 20px;">
        <li>Login to your Highrise.pk dashboard</li>
        <li>Review the requested information above</li>
        <li>Update your application with the required details</li>
        <li>Resubmit for verification</li>
      </ol>

      <div style="text-align: center; margin: 28px 0;">
        <a href="${dashboardUrl}" class="cta-button">
          Update Application →
        </a>
      </div>

      <p style="color: #666; font-size: 14px; line-height: 1.6; margin: 20px 0 0 0;">
        ⏱️ <strong>Tip:</strong> Jitni jaldi aap updated info submit karein, utni jaldi
        approval mil sakti hai. Hum priority pe review karenge.
      </p>

      <p style="color: #4a4a4a; font-size: 15px; margin: 20px 0 0 0;">
        Best regards,<br>
        <strong>Highrise.pk Verification Team</strong>
      </p>`;

    return baseTemplate(content);
  },
};

// ═══════════════════════════════════════════════════════════════
// TEMPLATE 17: Society Onboarding Confirmation
// ═══════════════════════════════════════════════════════════════

export const societyOnboardingConfirmationTemplate: EmailTemplate = {
  id: 'society_onboarding_confirmation',
  name: 'Society Onboarding Confirmation',
  description: 'Sent to society rep after onboarding form submission',
  subject: 'Application Received - Highrise.pk Society Verification',
  preview: 'Your society registration has been received and is under review.',
  html: (data: Record<string, unknown>) => {
    const repName     = escapeHtml(data.toName      ?? 'Representative');
    const societyName = escapeHtml(data.societyName ?? '');
    const nocNumber   = escapeHtml(data.nocNumber   ?? '');
    const authority   = escapeHtml(data.authority   ?? '');
    const submittedAt = safeFormatDate(data.submittedAt, 'dd MMM yyyy, hh:mm a', 'Just now');
    const supportUrl  = safeUrl(str(data.supportUrl, 'https://highrise.pk/contact'));

    const content = `
      <h2 style="color: ${SECONDARY_COLOR}; margin: 0 0 20px 0;">
        Assalam-u-Alaikum, ${repName}! 🏘️
      </h2>

      <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
        <strong>${societyName}</strong> ki society registration application
        <strong>Highrise.pk</strong> par successfully receive ho gayi hai.
        Hamari compliance team <strong>2-3 business days</strong> mein review karegi.
      </p>

      <div class="feature-card" style="background-color: #f0f9ff; border-left: 4px solid ${PRIMARY_COLOR};">
        <h3 style="color: ${SECONDARY_COLOR}; margin: 0 0 12px 0;">📋 Application Summary</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 6px 0; color: #666; width: 40%; font-size: 14px;">Society Name:</td>
            <td style="padding: 6px 0; font-weight: 600; font-size: 14px;">${societyName}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #666; font-size: 14px;">NOC Number:</td>
            <td style="padding: 6px 0; font-family: monospace; font-size: 13px; color: ${PRIMARY_COLOR};">${nocNumber}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #666; font-size: 14px;">Authority:</td>
            <td style="padding: 6px 0; font-size: 14px;">${authority}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #666; font-size: 14px;">Submitted:</td>
            <td style="padding: 6px 0; font-size: 14px;">${submittedAt}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #666; font-size: 14px;">Status:</td>
            <td style="padding: 6px 0;">
              <span style="background: #fef3c7; color: #92400e; padding: 2px 10px; border-radius: 20px; font-size: 13px; font-weight: 600;">
                ⏳ Under Review
              </span>
            </td>
          </tr>
        </table>
      </div>

      <div style="margin: 24px 0;">
        <h3 style="color: ${SECONDARY_COLOR}; margin: 0 0 12px 0;">✅ Verification Process</h3>
        <div style="display: flex; flex-direction: column; gap: 10px;">
          <div style="background: #f8f9fa; border-radius: 8px; padding: 12px 16px; border-left: 3px solid ${PRIMARY_COLOR};">
            <strong style="color: #333;">Step 1 — NOC & Document Review</strong>
            <p style="color: #666; margin: 4px 0 0; font-size: 14px;">
              Hamari legal team aapka NOC certificate aur submitted documents verify karegi
              concerned authority (${authority}) ke records se.
            </p>
          </div>
          <div style="background: #f8f9fa; border-radius: 8px; padding: 12px 16px; border-left: 3px solid #94a3b8;">
            <strong style="color: #333;">Step 2 — Authorized Person KYC</strong>
            <p style="color: #666; margin: 4px 0 0; font-size: 14px;">
              Authorized representative ka CNIC aur designation verify hoga.
            </p>
          </div>
          <div style="background: #f8f9fa; border-radius: 8px; padding: 12px 16px; border-left: 3px solid #94a3b8;">
            <strong style="color: #333;">Step 3 — Approval & Dashboard Access</strong>
            <p style="color: #666; margin: 4px 0 0; font-size: 14px;">
              Approval ke baad aapka account Society role par upgrade hoga. Aap plot management
              aur society dashboard access kar sakein ge.
            </p>
          </div>
        </div>
      </div>

      <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 14px 16px; border-radius: 0 8px 8px 0; margin: 20px 0;">
        <strong style="color: #92400e;">⚠️ Important / Zaroori Baat</strong>
        <p style="color: #92400e; margin: 6px 0 0; font-size: 14px;">
          Fake NOC ya inaccurate information submit karna permanent ban aur legal action
          ka sabab ban sakta hai. Hum directly ${authority} se verify karte hain.
        </p>
      </div>

      <div style="text-align: center; margin: 28px 0;">
        <a href="${supportUrl}" class="cta-button">
          Contact Support →
        </a>
      </div>

      <p style="color: #4a4a4a; font-size: 15px; margin: 20px 0 0 0;">
        JazakAllah Khair,<br>
        <strong>Highrise.pk Compliance Team</strong><br>
        <span style="color: #666; font-size: 13px;">📧 compliance@highrise.pk</span>
      </p>`;

    return baseTemplate(content);
  },
};

// ═══════════════════════════════════════════════════════════════
// TEMPLATE 18: Admin New Society Application Notification
// ═══════════════════════════════════════════════════════════════

export const adminNewSocietyApplicationTemplate: EmailTemplate = {
  id: 'admin_new_society_application',
  name: 'Admin New Society Application',
  description: 'Sent to admin when a new society submits onboarding form',
  subject: '🔔 New Society Application: {{societyName}} — Action Required',
  preview: 'A new society application requires your review.',
  html: (data: Record<string, unknown>) => {
    const societyName    = escapeHtml(data.societyName    ?? 'Unknown Society');
    const applicantName  = escapeHtml(data.applicantName  ?? 'Unknown');
    const applicantEmail = escapeHtml(data.applicantEmail ?? 'Not provided');
    const nocNumber      = escapeHtml(data.nocNumber      ?? 'Not provided');
    const authority      = escapeHtml(data.authority      ?? 'Not provided');
    const city           = escapeHtml(data.city           ?? 'Not provided');
    const profileId      = escapeHtml(data.profileId      ?? '');
    const submittedAt    = safeFormatDate(data.submittedAt, 'dd MMM yyyy, hh:mm a', 'Just now');
    const reviewUrl      = safeUrl(
      str(data.reviewUrl, 'https://highrise.pk/admin/applications')
    );

    const content = `
      <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 14px 16px; border-radius: 0 8px 8px 0; margin-bottom: 24px;">
        <strong style="color: #92400e;">🔔 New Society Application — Review Required</strong>
        <p style="color: #92400e; margin: 4px 0 0; font-size: 14px;">
          A new housing society has submitted their registration application.
          Please review within 2-3 business days.
        </p>
      </div>

      <h2 style="color: ${SECONDARY_COLOR}; margin: 0 0 20px 0;">Society Application Details</h2>

      <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
        <tr style="background: #f8f9fa;">
          <td style="padding: 10px 12px; color: #666; font-size: 14px; width: 35%; border-bottom: 1px solid #e9ecef;">
            🏘️ Society Name
          </td>
          <td style="padding: 10px 12px; font-weight: 600; font-size: 14px; border-bottom: 1px solid #e9ecef;">
            ${societyName}
          </td>
        </tr>
        <tr>
          <td style="padding: 10px 12px; color: #666; font-size: 14px; border-bottom: 1px solid #e9ecef;">
            👤 Applicant Name
          </td>
          <td style="padding: 10px 12px; font-size: 14px; border-bottom: 1px solid #e9ecef;">
            ${applicantName}
          </td>
        </tr>
        <tr style="background: #f8f9fa;">
          <td style="padding: 10px 12px; color: #666; font-size: 14px; border-bottom: 1px solid #e9ecef;">
            📧 Email
          </td>
          <td style="padding: 10px 12px; font-size: 14px; border-bottom: 1px solid #e9ecef;">
            ${applicantEmail}
          </td>
        </tr>
        <tr>
          <td style="padding: 10px 12px; color: #666; font-size: 14px; border-bottom: 1px solid #e9ecef;">
            📄 NOC Number
          </td>
          <td style="padding: 10px 12px; font-family: monospace; font-size: 13px; border-bottom: 1px solid #e9ecef; color: ${PRIMARY_COLOR};">
            ${nocNumber}
          </td>
        </tr>
        <tr style="background: #f8f9fa;">
          <td style="padding: 10px 12px; color: #666; font-size: 14px; border-bottom: 1px solid #e9ecef;">
            🏛️ Authority
          </td>
          <td style="padding: 10px 12px; font-weight: 600; font-size: 14px; border-bottom: 1px solid #e9ecef;">
            ${authority}
          </td>
        </tr>
        <tr>
          <td style="padding: 10px 12px; color: #666; font-size: 14px; border-bottom: 1px solid #e9ecef;">
            📍 City
          </td>
          <td style="padding: 10px 12px; font-size: 14px; border-bottom: 1px solid #e9ecef;">
            ${city}
          </td>
        </tr>
        <tr style="background: #f8f9fa;">
          <td style="padding: 10px 12px; color: #666; font-size: 14px; border-bottom: 1px solid #e9ecef;">
            🕐 Submitted
          </td>
          <td style="padding: 10px 12px; font-size: 14px; border-bottom: 1px solid #e9ecef;">
            ${submittedAt}
          </td>
        </tr>
        <tr>
          <td style="padding: 10px 12px; color: #666; font-size: 14px;">
            🆔 Profile ID
          </td>
          <td style="padding: 10px 12px; font-family: monospace; font-size: 13px; color: ${PRIMARY_COLOR};">
            ${profileId}
          </td>
        </tr>
      </table>

      <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 14px 16px; margin-bottom: 24px;">
        <strong style="color: #166534; font-size: 14px;">✅ Anti-Fraud Checks Passed</strong>
        <ul style="color: #166534; margin: 8px 0 0; padding-left: 20px; font-size: 13px; line-height: 1.8;">
          <li>NOC number uniqueness check — Passed (no duplicate active profiles)</li>
          <li>Authorized person CNIC uniqueness — Passed (cross-collection check)</li>
          <li>NTN uniqueness check — Passed (if provided)</li>
          <li>Duplicate profile check for this user — Passed</li>
          <li>User role eligibility — Passed (standard user account)</li>
        </ul>
      </div>

      <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 14px 16px; margin-bottom: 24px;">
        <strong style="color: #1e40af; font-size: 14px;">📋 Admin Action Required</strong>
        <ul style="color: #1e40af; margin: 8px 0 0; padding-left: 20px; font-size: 13px; line-height: 1.8;">
          <li>Verify NOC number with <strong>${authority}</strong> directly</li>
          <li>Review uploaded NOC certificate and layout plan</li>
          <li>Verify authorized person CNIC with NADRA (if needed)</li>
          <li>Approve, reject, or request additional information</li>
        </ul>
      </div>

      <div style="text-align: center; margin: 28px 0;">
        <a href="${reviewUrl}"
           style="display: inline-block; background: ${PRIMARY_COLOR}; color: #ffffff;
                  padding: 14px 32px; text-decoration: none; border-radius: 8px;
                  font-weight: 600; font-size: 16px;">
          Review Society Application →
        </a>
      </div>

      <p style="color: #999; font-size: 12px; text-align: center; margin: 20px 0 0;">
        This is an automated notification from Highrise.pk compliance system.
      </p>`;

    return baseTemplate(content);
  },
};

// ═══════════════════════════════════════════════════════════════
// TEMPLATE 19: Society Onboarding APPROVED
// ═══════════════════════════════════════════════════════════════

export const societyOnboardingApprovedTemplate: EmailTemplate = {
  id: 'society_onboarding_approved',
  name: 'Society Onboarding Approved',
  description: 'Sent to society rep when application is approved',
  subject: '🎉 Mubarak Ho! Your Society is Verified - Highrise.pk',
  preview: 'Your society verification is complete. Access your dashboard now.',
  html: (data: Record<string, unknown>) => {
    const repName     = escapeHtml(data.toName      ?? 'Representative');
    const societyName = escapeHtml(data.societyName ?? '');
    const dashboardUrl = safeUrl(
      str(data.dashboardUrl, 'https://highrise.pk/society/dashboard')
    );

    const content = `
      <div style="text-align: center; margin-bottom: 24px;">
        <div style="display: inline-block; background: #10b981; color: white; padding: 16px; border-radius: 50%; font-size: 32px;">✓</div>
      </div>

      <h2 style="color: ${SECONDARY_COLOR}; margin: 0 0 16px 0; text-align: center;">
        🎉 Mubarak Ho, ${repName}!
      </h2>

      <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6; text-align: center; margin: 0 0 24px 0;">
        <strong>${societyName}</strong> ki verification <strong>complete</strong> ho gayi hai.
        Aap ab Highrise.pk ke verified societies network ka hissa hain.
      </p>

      <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 24px; border-radius: 12px; text-align: center; margin: 24px 0;">
        <h3 style="margin: 0 0 8px 0; color: white;">✅ Status: NOC VERIFIED SOCIETY</h3>
        <p style="margin: 0; opacity: 0.95;">${societyName}</p>
      </div>

      <h3 style="color: ${SECONDARY_COLOR}; margin: 24px 0 12px 0;">🏘️ Ab Aap Ye Kar Sakte Hain:</h3>
      <ul style="color: #4a4a4a; line-height: 1.8; padding-left: 20px;">
        <li><strong>Society Dashboard</strong> — Full management portal access</li>
        <li><strong>Plot Management</strong> — Add, update, and track plot inventory</li>
        <li><strong>Block & Phase Management</strong> — Update possession status</li>
        <li><strong>Verified Society Badge</strong> — Trust badge on public profile</li>
        <li><strong>Buyer Inquiries</strong> — Direct leads from verified investors</li>
        <li><strong>Installment Plans</strong> — Publish payment plans publicly</li>
        <li><strong>NOC Verified Listing</strong> — Society featured in verified browse</li>
      </ul>

      <div style="text-align: center; margin: 32px 0;">
        <a href="${dashboardUrl}" class="cta-button" style="background: #10b981; font-size: 16px;">
          Go to Society Dashboard →
        </a>
      </div>

      <div class="feature-card" style="background: #f0fdf4; border-left-color: #10b981;">
        <h4 style="color: #166534; margin: 0 0 8px 0;">💡 Pro Tip</h4>
        <p style="color: #166534; margin: 0; font-size: 14px;">
          Apni society ka master plan, amenities list, aur block-wise plot availability
          update karein. Complete profiles par 3x zyada inquiries aati hain.
        </p>
      </div>

      <p style="color: #4a4a4a; font-size: 15px; margin: 24px 0 0 0;">
        JazakAllah,<br>
        <strong>Highrise.pk Compliance Team</strong>
      </p>`;

    return baseTemplate(content);
  },
};

// ═══════════════════════════════════════════════════════════════
// TEMPLATE 20: Society Onboarding REJECTED
// ═══════════════════════════════════════════════════════════════

export const societyOnboardingRejectedTemplate: EmailTemplate = {
  id: 'society_onboarding_rejected',
  name: 'Society Onboarding Rejected',
  description: 'Sent to society rep when application is rejected',
  subject: 'Application Review Update - Highrise.pk Society Registration',
  preview: 'Important update about your society registration application.',
  html: (data: Record<string, unknown>) => {
    const repName     = escapeHtml(data.toName      ?? 'Representative');
    const societyName = escapeHtml(data.societyName ?? '');
    const reason      = data.reason ? escapeHtml(data.reason) : null;
    const supportUrl  = safeUrl(str(data.supportUrl, 'https://highrise.pk/contact'));

    const content = `
      <h2 style="color: ${SECONDARY_COLOR}; margin: 0 0 16px 0;">
        Application Review Update
      </h2>

      <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
        Assalam-u-Alaikum ${repName},
      </p>

      <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
        After careful review, hum <strong>${societyName}</strong> ki society registration
        application is waqt approve nahi kar sake.
      </p>

      ${reason ? `
        <div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 16px; border-radius: 0 8px 8px 0; margin: 20px 0;">
          <strong style="color: #991b1b; display: block; margin-bottom: 8px;">Reason / Wajah:</strong>
          <p style="color: #991b1b; margin: 0; font-size: 14px; line-height: 1.6;">${reason}</p>
        </div>` : ''}

      <h3 style="color: ${SECONDARY_COLOR}; margin: 24px 0 12px 0;">📝 What You Can Do</h3>
      <ul style="color: #4a4a4a; line-height: 1.8; padding-left: 20px;">
        <li>Address the concerns mentioned above</li>
        <li>Obtain valid NOC from the concerned authority</li>
        <li>Ensure all submitted documents are authentic and current</li>
        <li>Contact our support team for clarification</li>
        <li>You may submit a new application after 30 days</li>
      </ul>

      <div style="text-align: center; margin: 28px 0;">
        <a href="${supportUrl}" class="cta-button">
          Contact Support →
        </a>
      </div>

      <p style="color: #666; font-size: 14px; line-height: 1.6; margin: 20px 0 0 0;">
        Agar aap ko lagta hai ye decision ghalat hai ya NOC documents mein technical issue tha,
        support team se rabta zaroor karein.
      </p>

      <p style="color: #4a4a4a; font-size: 15px; margin: 20px 0 0 0;">
        Best regards,<br>
        <strong>Highrise.pk Compliance Team</strong>
      </p>`;

    return baseTemplate(content);
  },
};

// ═══════════════════════════════════════════════════════════════
// TEMPLATE 21: Society Onboarding INFO REQUIRED
// ═══════════════════════════════════════════════════════════════

export const societyOnboardingInfoRequiredTemplate: EmailTemplate = {
  id: 'society_onboarding_info_required',
  name: 'Society Onboarding Info Required',
  description: 'Sent to society rep when more information is needed',
  subject: 'Additional Information Needed - Highrise.pk Society Registration',
  preview: 'Please provide additional information to complete your society verification.',
  html: (data: Record<string, unknown>) => {
    const repName      = escapeHtml(data.toName      ?? 'Representative');
    const societyName  = escapeHtml(data.societyName ?? '');
    const reason       = data.reason
      ? escapeHtml(data.reason)
      : 'Additional information required.';
    const dashboardUrl = safeUrl(
      str(data.dashboardUrl, 'https://highrise.pk/dashboard')
    );

    const content = `
      <h2 style="color: ${SECONDARY_COLOR}; margin: 0 0 16px 0;">
        Additional Information Required
      </h2>

      <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
        Assalam-u-Alaikum ${repName},
      </p>

      <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
        Hamari compliance team ne <strong>${societyName}</strong> ki application review ki hai,
        lekin verification complete karne ke liye kuch additional information chahiye.
      </p>

      <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; border-radius: 0 8px 8px 0; margin: 20px 0;">
        <strong style="color: #92400e; display: block; margin-bottom: 8px;">📋 What We Need:</strong>
        <p style="color: #92400e; margin: 0; font-size: 14px; line-height: 1.7;">${reason}</p>
      </div>

      <h3 style="color: ${SECONDARY_COLOR}; margin: 24px 0 12px 0;">🔄 Next Steps</h3>
      <ol style="color: #4a4a4a; line-height: 1.8; padding-left: 20px;">
        <li>Login to your Highrise.pk dashboard</li>
        <li>Review the requested information above</li>
        <li>Upload any additional documents required</li>
        <li>Resubmit your application for verification</li>
      </ol>

      <div style="text-align: center; margin: 28px 0;">
        <a href="${dashboardUrl}" class="cta-button">
          Update Application →
        </a>
      </div>

      <p style="color: #666; font-size: 14px; line-height: 1.6; margin: 20px 0 0 0;">
        ⏱️ <strong>Tip:</strong> Jitni jaldi additional documents submit karein, utni jaldi
        verification complete ho sakti hai. Hum priority pe review karenge.
      </p>

      <p style="color: #4a4a4a; font-size: 15px; margin: 20px 0 0 0;">
        Best regards,<br>
        <strong>Highrise.pk Compliance Team</strong>
      </p>`;

    return baseTemplate(content);
  },
};

// ═══════════════════════════════════════════════════════════════
// SOCIETY EMAIL HELPER FUNCTIONS
// Called directly from /api/onboarding/society.ts
// ═══════════════════════════════════════════════════════════════

interface SocietyConfirmationEmailParams {
  toEmail: string;
  toName: string;
  societyName: string;
  nocNumber: string;
  authority: string;
  submittedAt: Date;
}

interface AdminSocietyAlertEmailParams {
  societyName: string;
  applicantName: string;
  applicantEmail: string;
  nocNumber: string;
  authority: string;
  city: string;
  profileId: string;
  submittedAt: Date;
}

/**
 * Send society onboarding confirmation to the applicant.
 * Fire-and-forget — caller wraps in Promise.all().catch()
 */
export async function sendSocietyConfirmationEmail(
  params: SocietyConfirmationEmailParams
): Promise<void> {
  const { sendEmail } = await import('@/lib/email');
  const html = societyOnboardingConfirmationTemplate.html({
    toName: params.toName,
    societyName: params.societyName,
    nocNumber: params.nocNumber,
    authority: params.authority,
    submittedAt: params.submittedAt,
  });
  await sendEmail({
    to: params.toEmail,
    subject: societyOnboardingConfirmationTemplate.subject,
    html,
  });
}

/**
 * Send new society application alert to admin.
 * Fire-and-forget — caller wraps in Promise.all().catch()
 */
export async function sendAdminSocietyAlertEmail(
  params: AdminSocietyAlertEmailParams
): Promise<void> {
  const { sendEmail } = await import('@/lib/email');
  const adminEmail = process.env.ADMIN_EMAIL ?? 'admin@highrise.pk';
  const html = adminNewSocietyApplicationTemplate.html({
    societyName: params.societyName,
    applicantName: params.applicantName,
    applicantEmail: params.applicantEmail,
    nocNumber: params.nocNumber,
    authority: params.authority,
    city: params.city,
    profileId: params.profileId,
    submittedAt: params.submittedAt,
    reviewUrl: `https://highrise.pk/admin/applications`,
  });
  await sendEmail({
    to: adminEmail,
    subject: `🔔 New Society Application: ${params.societyName} — Action Required`,
    html,
  });
}

// ═══════════════════════════════════════════════════════════════
// TEMPLATE 22: Aria Lead Captured — Sales Team Notification
// ═══════════════════════════════════════════════════════════════

export const ariaLeadCapturedTemplate: EmailTemplate = {
  id: 'aria_lead_captured',
  name: 'Aria Lead Captured',
  description: 'Sent to sales team when Aria captures a new lead',
  subject: '🤖 New Aria Lead: {{customerName}} — {{sourceTitle}}',
  preview: 'Aria has captured a new qualified lead.',
  html: (data: Record<string, unknown>) => {
    const customerName  = escapeHtml(data.customerName  ?? 'Unknown');
    const customerPhone = escapeHtml(data.customerPhone ?? 'Not provided');
    const customerEmail = escapeHtml(data.customerEmail ?? '');
    const sourceTitle   = escapeHtml(data.sourceTitle   ?? 'General Inquiry');
    const sourceType    = escapeHtml(data.sourceType    ?? 'general');
    const intent        = escapeHtml(data.intent        ?? 'general');
    const urgency       = escapeHtml(data.urgency       ?? 'exploring');
    const budgetTier    = escapeHtml(data.budgetTier    ?? 'Not specified');
    const message       = data.message ? escapeHtml(data.message) : null;
    const leadId        = escapeHtml(data.leadId        ?? '');
    const sourceUrl     = safeUrl(data.sourceUrl);
    const adminUrl      = safeUrl(`https://highrise.pk/admin/leads`);

    const urgencyMap: Record<string, string> = {
      immediate:      '🔴 ASAP — Contact immediately!',
      within_month:   '🟡 Within a month',
      within_3months: '🟢 Within 3 months',
      exploring:      '⚪ Just exploring',
    };

    const budgetMap: Record<string, string> = {
      under_50L: 'Under 50 Lakh',
      '50L_1Cr':  '50L – 1 Crore',
      '1Cr_3Cr':  '1 – 3 Crore',
      '3Cr_5Cr':  '3 – 5 Crore',
      above_5Cr:  'Above 5 Crore',
    };

    const content = `
      <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 14px 16px; border-radius: 0 8px 8px 0; margin-bottom: 24px;">
        <strong style="color: #92400e;">🤖 Aleem has captured a new lead!</strong>
        <p style="color: #92400e; margin: 4px 0 0; font-size: 14px;">
          A visitor on Highrise.pk submitted their contact details via Aleem.
        </p>
      </div>

      <h2 style="color: ${SECONDARY_COLOR}; margin: 0 0 20px 0;">Lead Details</h2>

      <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
        <tr style="background: #f8f9fa;">
          <td style="padding: 10px 12px; color: #666; font-size: 14px; width: 35%; border-bottom: 1px solid #e9ecef;">👤 Name</td>
          <td style="padding: 10px 12px; font-weight: 600; font-size: 14px; border-bottom: 1px solid #e9ecef;">${customerName}</td>
        </tr>
        <tr>
          <td style="padding: 10px 12px; color: #666; font-size: 14px; border-bottom: 1px solid #e9ecef;">📞 Phone</td>
          <td style="padding: 10px 12px; font-size: 14px; border-bottom: 1px solid #e9ecef;">
            <a href="tel:${customerPhone}" style="color: ${PRIMARY_COLOR}; font-weight: 600;">${customerPhone}</a>
          </td>
        </tr>
        ${customerEmail ? `
        <tr style="background: #f8f9fa;">
          <td style="padding: 10px 12px; color: #666; font-size: 14px; border-bottom: 1px solid #e9ecef;">📧 Email</td>
          <td style="padding: 10px 12px; font-size: 14px; border-bottom: 1px solid #e9ecef;">
            <a href="mailto:${customerEmail}" style="color: ${PRIMARY_COLOR};">${customerEmail}</a>
          </td>
        </tr>` : ''}
        <tr>
          <td style="padding: 10px 12px; color: #666; font-size: 14px; border-bottom: 1px solid #e9ecef;">🎯 Intent</td>
          <td style="padding: 10px 12px; font-size: 14px; border-bottom: 1px solid #e9ecef; text-transform: capitalize;">${intent}</td>
        </tr>
        <tr style="background: #f8f9fa;">
          <td style="padding: 10px 12px; color: #666; font-size: 14px; border-bottom: 1px solid #e9ecef;">⏰ Urgency</td>
          <td style="padding: 10px 12px; font-size: 14px; border-bottom: 1px solid #e9ecef; font-weight: 600;">
            ${urgencyMap[str(data.urgency, 'exploring')] ?? urgency}
          </td>
        </tr>
        <tr>
          <td style="padding: 10px 12px; color: #666; font-size: 14px; border-bottom: 1px solid #e9ecef;">💰 Budget</td>
          <td style="padding: 10px 12px; font-size: 14px; border-bottom: 1px solid #e9ecef;">
            ${budgetMap[str(data.budgetTier, '')] ?? budgetTier}
          </td>
        </tr>
        <tr style="background: #f8f9fa;">
          <td style="padding: 10px 12px; color: #666; font-size: 14px; border-bottom: 1px solid #e9ecef;">📍 Source</td>
          <td style="padding: 10px 12px; font-size: 14px; border-bottom: 1px solid #e9ecef; text-transform: capitalize;">${sourceType}</td>
        </tr>
        <tr>
          <td style="padding: 10px 12px; color: #666; font-size: 14px; border-bottom: 1px solid #e9ecef;">🏠 Interested In</td>
          <td style="padding: 10px 12px; font-size: 14px; border-bottom: 1px solid #e9ecef;">
            ${sourceUrl !== '#'
              ? `<a href="${sourceUrl}" style="color: ${PRIMARY_COLOR};">${sourceTitle}</a>`
              : sourceTitle
            }
          </td>
        </tr>
        <tr style="background: #f8f9fa;">
          <td style="padding: 10px 12px; color: #666; font-size: 14px;">🆔 Lead ID</td>
          <td style="padding: 10px 12px; font-family: monospace; font-size: 13px; color: ${PRIMARY_COLOR};">${leadId}</td>
        </tr>
      </table>

      ${message ? `
        <div class="feature-card">
          <h3 style="color: ${SECONDARY_COLOR}; margin: 0 0 10px 0;">💬 Customer Message</h3>
          <p style="color: #4a4a4a; margin: 0; font-style: italic;">"${message}"</p>
        </div>` : ''}

      <div style="text-align: center; margin: 28px 0;">
        <a href="${adminUrl}"
           style="display: inline-block; background: ${PRIMARY_COLOR}; color: #ffffff;
                  padding: 14px 32px; text-decoration: none; border-radius: 8px;
                  font-weight: 600; font-size: 16px;">
          View in Admin Panel →
        </a>
      </div>

      <p style="color: #999; font-size: 12px; text-align: center; margin: 20px 0 0;">
        ⚡ Quick response = higher conversion! Contact within 2 hours for best results.
      </p>`;

    return baseTemplate(content);
  },
};

// ═══════════════════════════════════════════════════════════════
// TEMPLATE 23: Aria Lead Auto-Response — Sent to Buyer
// ═══════════════════════════════════════════════════════════════

export const ariaLeadAutoResponseTemplate: EmailTemplate = {
  id: 'aria_lead_auto_response',
  name: 'Aria Lead Auto-Response',
  description: 'Sent to buyer after Aria captures their lead',
  subject: 'Highrise.pk — Hamari Team Aap Se Contact Karegi! 🏠',
  preview: 'Thank you for your interest. Our team will contact you within 24 hours.',
  html: (data: Record<string, unknown>) => {
    const customerName = escapeHtml(data.customerName ?? '');
    const sourceTitle  = escapeHtml(data.sourceTitle  ?? 'the property');
    const sourceUrl    = safeUrl(data.sourceUrl);
    const intent       = str(data.intent, 'general');

    const intentMsg: Record<string, string> = {
      buy:     'aap ek property khareedna chahte hain',
      rent:    'aap kiraye par property dhundh rahe hain',
      invest:  'aap real estate mein invest karna chahte hain',
      verify:  'aap ek society verify karna chahte hain',
      general: 'aap property mein interested hain',
    };

    const content = `
      <h2 style="color: ${SECONDARY_COLOR}; margin: 0 0 20px 0;">
        Shukriya${customerName ? `, ${customerName}` : ''}! 🎉
      </h2>

      <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
        Hamne receive kar liya ke ${intentMsg[intent] ?? intentMsg.general} —
        specifically <strong>${sourceTitle}</strong> ke baare mein.
      </p>

      <div style="background: linear-gradient(135deg, ${PRIMARY_COLOR} 0%, ${SECONDARY_COLOR} 100%); color: white; padding: 24px; border-radius: 12px; text-align: center; margin: 24px 0;">
        <h3 style="margin: 0 0 8px 0; color: white; font-size: 20px;">⏰ 24 Hours mein Contact</h3>
        <p style="margin: 0; opacity: 0.9; font-size: 14px;">
          Hamari property expert team aap ko call karegi aur sab details share karegi.
        </p>
      </div>

      <h3 style="color: ${SECONDARY_COLOR}; margin: 24px 0 12px 0;">✅ Aap Ne Kya Receive Karein Ge:</h3>
      <ul style="color: #4a4a4a; line-height: 1.8; padding-left: 20px;">
        <li><strong>Personalized Property Options</strong> — Aapki requirements ke mutabiq</li>
        <li><strong>Verified Information</strong> — NOC status, legal documents, pricing</li>
        <li><strong>Site Visit Coordination</strong> — Hamari team sab arrange karegi</li>
        <li><strong>No Hidden Charges</strong> — True cost transparency</li>
      </ul>

      ${sourceUrl !== '#' ? `
        <div style="text-align: center; margin: 28px 0;">
          <a href="${sourceUrl}"
             style="display: inline-block; background: ${PRIMARY_COLOR}; color: #ffffff;
                    padding: 12px 24px; text-decoration: none; border-radius: 8px;
                    font-weight: 600; font-size: 14px;">
            View ${sourceTitle} Again →
          </a>
        </div>` : ''}

      <div class="feature-card" style="background: #f0fdf4; border-left: 4px solid #10b981;">
        <h4 style="color: #166534; margin: 0 0 8px 0;">🔒 Aapki Privacy Protected Hai</h4>
        <p style="color: #166534; margin: 0; font-size: 14px;">
          Aapka phone number sirf Highrise.pk ki verified team ko mile ga.
          Hum aapka number publicly kabhi share nahi karte.
        </p>
      </div>

      <p style="color: #4a4a4a; font-size: 15px; margin: 24px 0 0 0;">
        JazakAllah,<br>
        <strong>Aleem &amp; The Highrise.pk Team</strong><br>
        <span style="color: #666; font-size: 13px;">📧 info@highrise.pk</span>
      </p>`;

    return baseTemplate(content);
  },
};

// ─── Aria email helper ────────────────────────────────────────────────────────

interface AriaLeadEmailParams {
  customerName:  string;
  customerPhone: string;
  customerEmail?: string;
  sourceType:    string;
  sourceTitle?:  string;
  sourceUrl?:    string;
  intent:        string;
  urgency:       string;
  budgetTier?:   string;
  message?:      string;
  leadId:        string;
}

/**
 * Send both aria lead emails in parallel:
 * 1. Sales team notification
 * 2. Buyer auto-response (only if email provided)
 *
 * Returns EmailResult[] from lib/email's sendEmail() — caller can check success.
 * Failures are non-fatal — they get logged but do not throw.
 */
export async function sendAriaLeadEmails(
  params: AriaLeadEmailParams
): Promise<void> {
  // Dynamic import — sendEmail returns EmailResult, not void
  const emailModule  = await import('@/lib/email');
  const sendEmailFn  = emailModule.sendEmail;
  const adminEmail   = process.env.ADMIN_EMAIL ?? 'admin@highrise.pk';
  const salesEmail   = process.env.SALES_EMAIL ?? adminEmail;

  const emailPromises: Array<ReturnType<typeof sendEmailFn>> = [
    // Sales team notification
    sendEmailFn({
      to:      salesEmail,
      subject: `🤖 New Aleem Lead: ${params.customerName} — ${params.sourceTitle ?? 'General'}`,
      html:    ariaLeadCapturedTemplate.html({
        customerName:  params.customerName,
        customerPhone: params.customerPhone,
        customerEmail: params.customerEmail,
        sourceTitle:   params.sourceTitle,
        sourceType:    params.sourceType,
        sourceUrl:     params.sourceUrl,
        intent:        params.intent,
        urgency:       params.urgency,
        budgetTier:    params.budgetTier,
        message:       params.message,
        leadId:        params.leadId,
      }),
    }),
  ];

  // Buyer auto-response (only if email provided)
  if (params.customerEmail) {
    emailPromises.push(
      sendEmailFn({
        to:      params.customerEmail,
        subject: 'Highrise.pk — Hamari Team Aap Se Contact Karegi! 🏠',
        html:    ariaLeadAutoResponseTemplate.html({
          customerName: params.customerName,
          sourceTitle:  params.sourceTitle,
          sourceUrl:    params.sourceUrl,
          intent:       params.intent,
        }),
      })
    );
  }

  // Wait for both — EmailResult objects discarded (fire-and-forget pattern)
  await Promise.all(emailPromises);
}

// ═══════════════════════════════════════════════════════════════
// TEMPLATE 24: Quota Alert to Admin (V6.4.0)
// ═══════════════════════════════════════════════════════════════

export const quotaAlertTemplate: EmailTemplate = {
  id: 'quota_alert',
  name: 'Aleem Quota Alert',
  description: 'Alerts admin when daily Groq quota hits 75%/90%/100%',
  subject: '⚡ Aleem Quota Alert: {{percentage}}% Used',
  preview: 'Daily Aleem AI quota threshold reached.',
  html: (data: Record<string, unknown>) => {
    const threshold = Number(data.threshold ?? 0);
    const percentage = Number(data.percentage ?? 0);
    const used = Number(data.used ?? 0);
    const limit = Number(data.limit ?? 14400);

    let severity: string;
    let bgColor: string;
    let title: string;

    if (threshold >= 100) {
      severity = '🔴 CRITICAL — 100% Quota Reached';
      bgColor  = '#ef4444';
      title    = 'Aleem is in LEAD-ONLY mode';
    } else if (threshold >= 90) {
      severity = '🟠 HIGH — 90% Quota Reached';
      bgColor  = '#f97316';
      title    = 'Aleem switched to PRIORITY mode';
    } else {
      severity = '🟡 WARNING — 75% Quota Reached';
      bgColor  = '#f59e0b';
      title    = 'Aleem usage approaching limit';
    }

    const content = `
      <div style="background: ${bgColor}; color: white; padding: 20px; border-radius: 12px 12px 0 0; text-align: center;">
        <h2 style="margin: 0; font-size: 20px;">${severity}</h2>
        <p style="margin: 8px 0 0; opacity: 0.95;">${escapeHtml(title)}</p>
      </div>

      <div style="padding: 24px;">
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <tr style="background: #f8f9fa;">
            <td style="padding: 12px; color: #666; font-size: 14px; width: 40%;">Threshold:</td>
            <td style="padding: 12px; font-weight: 700; font-size: 14px;">${threshold}%</td>
          </tr>
          <tr>
            <td style="padding: 12px; color: #666; font-size: 14px;">Current Usage:</td>
            <td style="padding: 12px; font-weight: 700; font-size: 14px;">${percentage}% (${used.toLocaleString()} / ${limit.toLocaleString()})</td>
          </tr>
          <tr style="background: #f8f9fa;">
            <td style="padding: 12px; color: #666; font-size: 14px;">Resets At:</td>
            <td style="padding: 12px; font-size: 14px;">12:00 AM UTC (5:00 AM PKT)</td>
          </tr>
        </table>

        <div style="background: #f0f9ff; border-left: 4px solid #029bba; padding: 16px; border-radius: 0 8px 8px 0; margin-bottom: 20px;">
          <strong style="color: #004063;">What's happening:</strong>
          <ul style="color: #4a4a4a; margin: 8px 0 0; padding-left: 20px; line-height: 1.8; font-size: 14px;">
            ${threshold >= 100 ? `
              <li>Aleem is NO LONGER calling Groq API</li>
              <li>All new chats go directly to lead capture form</li>
              <li>Leads marked as 'burning' temperature (highest priority)</li>
              <li>Quota resets at midnight UTC</li>
            ` : threshold >= 90 ? `
              <li>Aleem still working normally</li>
              <li>Lead capture form appears after just 2 messages</li>
              <li>Leads marked as 'hot' temperature</li>
              <li>VIP framing shown to users</li>
            ` : `
              <li>Aleem working normally</li>
              <li>Standard lead capture behavior</li>
              <li>Monitoring active — alert at 90% if reached</li>
              <li>Consider upgrading or adding 2nd API key if this happens often</li>
            `}
          </ul>
        </div>

        <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; border-radius: 0 8px 8px 0;">
          <strong style="color: #92400e;">Recommended Actions:</strong>
          <ul style="color: #92400e; margin: 8px 0 0; padding-left: 20px; line-height: 1.8; font-size: 14px;">
            ${threshold >= 100 ? `
              <li><strong>Immediate:</strong> Monitor priority leads in admin panel</li>
              <li>Add a second Groq API key (free) to double capacity</li>
              <li>Consider Groq paid tier if hitting daily</li>
            ` : `
              <li>Review daily usage trend</li>
              <li>If recurring → add backup API key or upgrade</li>
              <li>Cost of upgrade: ~$5-20/month for 3x capacity</li>
            `}
          </ul>
        </div>

        <p style="color: #999; font-size: 12px; text-align: center; margin: 20px 0 0;">
          Quota tracking — Highrise.pk Aleem AI
        </p>
      </div>
    `;

    return baseTemplate(content);
  },
};

// ═══════════════════════════════════════════════════════════════
// TEMPLATE 25: Priority Hot Lead Alert (V6.4.0)
// ═══════════════════════════════════════════════════════════════

export const priorityLeadAlertTemplate: EmailTemplate = {
  id: 'priority_lead_alert',
  name: 'Priority Hot Lead Alert',
  description: 'Sent for quota-mode leads (hot/burning temperature)',
  subject: '🔥 PRIORITY LEAD: {{customerName}} — Call Within 1 Hour!',
  preview: 'High-intent buyer captured during peak demand.',
  html: (data: Record<string, unknown>) => {
    const customerName  = escapeHtml(data.customerName  ?? 'Unknown');
    const customerPhone = escapeHtml(data.customerPhone ?? 'Not provided');
    const customerEmail = escapeHtml(data.customerEmail ?? '');
    const intent        = escapeHtml(data.intent        ?? 'general');
    const urgency       = escapeHtml(data.urgency       ?? 'exploring');
    const budgetTier    = escapeHtml(data.budgetTier    ?? 'Not specified');
    const sourceTitle   = escapeHtml(data.sourceTitle   ?? 'General Inquiry');
    const sourceUrl     = safeUrl(data.sourceUrl);
    const leadId        = escapeHtml(data.leadId        ?? '');
    const quotaMode     = String(data.quotaMode ?? 'priority');
    const temperature   = String(data.temperature ?? 'hot');
    const phoneClean    = safePhone(data.customerPhone);
    const adminUrl      = safeUrl(`https://highrise.pk/admin/leads`);

    const tempBadge = temperature === 'burning'
      ? '<span style="background: #ef4444; color: white; padding: 4px 12px; border-radius: 20px; font-weight: 700; font-size: 11px;">🔥 BURNING (VIP)</span>'
      : '<span style="background: #f97316; color: white; padding: 4px 12px; border-radius: 20px; font-weight: 700; font-size: 11px;">🔥 HOT</span>';

    const modeLabel = quotaMode === 'lead_only'
      ? 'CAPTURED IN VIP MODE (100% quota — highest intent users)'
      : 'CAPTURED IN PRIORITY MODE (90%+ quota — high intent users)';

    const waText = encodeURIComponent(
      `Assalam-u-Alaikum ${String(data.customerName ?? 'sir/madam')}! Main Highrise.pk se bol raha hoon. Aap ne ${String(data.sourceTitle ?? 'property')} ke baare mein Aleem se baat ki thi.`
    );

    const content = `
      <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 24px; border-radius: 12px 12px 0 0; text-align: center;">
        <h2 style="margin: 0; font-size: 22px;">🔥 PRIORITY LEAD CAPTURED</h2>
        <p style="margin: 8px 0 0; opacity: 0.95; font-size: 14px;">Call within 1 hour for best conversion</p>
        <div style="margin-top: 12px;">${tempBadge}</div>
      </div>

      <div style="padding: 24px;">
        <div style="background: #fee2e2; border-left: 4px solid #ef4444; padding: 14px 16px; border-radius: 0 8px 8px 0; margin-bottom: 20px;">
          <strong style="color: #991b1b; font-size: 13px;">⚠️ ${escapeHtml(modeLabel)}</strong>
          <p style="color: #991b1b; margin: 4px 0 0; font-size: 13px;">
            These users are HIGHLY engaged. Quick response = 3x higher conversion rate.
          </p>
        </div>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
          <tr style="background: #f8f9fa;">
            <td style="padding: 12px; color: #666; font-size: 14px; width: 35%;">👤 Name</td>
            <td style="padding: 12px; font-weight: 700; font-size: 16px;">${customerName}</td>
          </tr>
          <tr>
            <td style="padding: 12px; color: #666; font-size: 14px;">📞 Phone</td>
            <td style="padding: 12px; font-size: 16px;">
              <a href="tel:${phoneClean}" style="color: ${PRIMARY_COLOR}; font-weight: 700; text-decoration: none;">${customerPhone}</a>
            </td>
          </tr>
          ${customerEmail ? `
          <tr style="background: #f8f9fa;">
            <td style="padding: 12px; color: #666; font-size: 14px;">📧 Email</td>
            <td style="padding: 12px; font-size: 14px;">
              <a href="mailto:${customerEmail}" style="color: ${PRIMARY_COLOR};">${customerEmail}</a>
            </td>
          </tr>` : ''}
          <tr>
            <td style="padding: 12px; color: #666; font-size: 14px;">🎯 Intent</td>
            <td style="padding: 12px; font-size: 14px; font-weight: 600; text-transform: capitalize;">${intent}</td>
          </tr>
          <tr style="background: #f8f9fa;">
            <td style="padding: 12px; color: #666; font-size: 14px;">⏰ Urgency</td>
            <td style="padding: 12px; font-size: 14px; font-weight: 600;">${urgency}</td>
          </tr>
          <tr>
            <td style="padding: 12px; color: #666; font-size: 14px;">💰 Budget</td>
            <td style="padding: 12px; font-size: 14px;">${budgetTier}</td>
          </tr>
          <tr style="background: #f8f9fa;">
            <td style="padding: 12px; color: #666; font-size: 14px;">🏠 Interested In</td>
            <td style="padding: 12px; font-size: 14px;">
              ${sourceUrl !== '#'
                ? `<a href="${sourceUrl}" style="color: ${PRIMARY_COLOR};">${sourceTitle}</a>`
                : sourceTitle}
            </td>
          </tr>
          <tr>
            <td style="padding: 12px; color: #666; font-size: 14px;">🆔 Lead ID</td>
            <td style="padding: 12px; font-family: monospace; font-size: 12px; color: ${PRIMARY_COLOR};">${leadId}</td>
          </tr>
        </table>

        <div style="text-align: center; margin: 24px 0;">
          <a href="tel:${phoneClean}" style="display: inline-block; background: #ef4444; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 16px; margin-right: 8px;">
            📞 Call Now
          </a>
          <a href="https://wa.me/${phoneClean}?text=${waText}" style="display: inline-block; background: #25D366; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 16px;">
            📱 WhatsApp
          </a>
        </div>

        <div style="text-align: center;">
          <a href="${adminUrl}" style="display: inline-block; background: ${PRIMARY_COLOR}; color: white; padding: 10px 20px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">
            View Full Lead in Admin →
          </a>
        </div>

        <p style="color: #999; font-size: 11px; text-align: center; margin: 24px 0 0;">
          ⚡ Average conversion: 47% for hot leads contacted within 1 hour
        </p>
      </div>
    `;

    return baseTemplate(content);
  },
};

// ═══════════════════════════════════════════════════════════════
// V6.4.0 HELPER: Send Quota Alert Email
// ═══════════════════════════════════════════════════════════════

interface QuotaAlertEmailParams {
  threshold:  number;   // 75, 90, or 100
  percentage: number;   // actual current percentage
  used:       number;
  limit:      number;
}

export async function sendQuotaAlertEmail(params: QuotaAlertEmailParams): Promise<void> {
  const emailModule = await import('@/lib/email');
  const sendEmailFn = emailModule.sendEmail;

  const adminEmail =
    process.env.ADMIN_QUOTA_ALERT_EMAIL ||
    process.env.ADMIN_EMAIL ||
    'admin@highrise.pk';

  await sendEmailFn({
    to:      adminEmail,
    subject: `⚡ Aleem Quota Alert: ${params.threshold}% Used (${params.percentage}% current)`,
    html:    quotaAlertTemplate.html({
      threshold:  params.threshold,
      percentage: params.percentage,
      used:       params.used,
      limit:      params.limit,
    }),
  });
}

// ═══════════════════════════════════════════════════════════════
// V6.4.0 HELPER: Send Priority Hot Lead Alert
// ═══════════════════════════════════════════════════════════════

interface PriorityLeadAlertParams {
  customerName:  string;
  customerPhone: string;
  customerEmail?: string;
  intent:        string;
  urgency:       string;
  budgetTier?:   string;
  sourceTitle?:  string;
  sourceUrl?:    string;
  leadId:        string;
  quotaMode:     'priority' | 'lead_only';
  temperature:   'hot' | 'burning';
}

export async function sendPriorityLeadAlert(params: PriorityLeadAlertParams): Promise<void> {
  const emailModule = await import('@/lib/email');
  const sendEmailFn = emailModule.sendEmail;

  const adminEmail =
    process.env.SALES_EMAIL ||
    process.env.ADMIN_EMAIL ||
    'admin@highrise.pk';

  await sendEmailFn({
    to:      adminEmail,
    subject: `🔥 PRIORITY LEAD: ${params.customerName} — Call Within 1 Hour!`,
    html:    priorityLeadAlertTemplate.html({
      customerName:  params.customerName,
      customerPhone: params.customerPhone,
      customerEmail: params.customerEmail,
      intent:        params.intent,
      urgency:       params.urgency,
      budgetTier:    params.budgetTier,
      sourceTitle:   params.sourceTitle,
      sourceUrl:     params.sourceUrl,
      leadId:        params.leadId,
      quotaMode:     params.quotaMode,
      temperature:   params.temperature,
    }),
  });
}
// ═══════════════════════════════════════════════════════════════
// TEMPLATE 26: Email OTP Verification (V6.4.5+)
// ═══════════════════════════════════════════════════════════════

export const emailOtpVerificationTemplate: EmailTemplate = {
  id: 'email_otp_verification',
  name: 'Email OTP Verification',
  description: 'Sent when user verifies a business email (company, auth person, etc.)',
  subject: '🔐 Your Highrise.pk Verification Code: {{code}}',
  preview: 'Use this code to verify your email address on Highrise.pk',
  html: (data: Record<string, unknown>) => {
    const code    = escapeHtml(data.code    ?? '000000');
    const purpose = str(data.purpose, 'general');
    const email   = escapeHtml(data.email   ?? '');

    const purposeLabels: Record<string, string> = {
      company_email:            'Company Email',
      authorized_person_email:  'Authorized Person Email',
      agent_email:              'Agent Email',
      society_email:            'Society Email',
      general:                  'Email',
    };
    const label = purposeLabels[purpose] ?? 'Email';

    const content = `
      <h2 style="color: ${SECONDARY_COLOR}; margin: 0 0 16px 0; text-align: center;">
        🔐 ${label} Verification
      </h2>

      <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6; text-align: center; margin: 0 0 16px 0;">
        Assalam-u-Alaikum! Please use the code below to verify
        your <strong>${label.toLowerCase()}</strong>${email ? ` (${email})` : ''}:
      </p>

      <!-- OTP Code Box -->
      <div style="background: linear-gradient(135deg, ${SECONDARY_COLOR} 0%, #1a2a40 100%);
                  padding: 30px; border-radius: 12px; text-align: center; margin: 24px 0;">
        <p style="color: ${PRIMARY_COLOR}; margin: 0 0 10px; font-size: 12px;
                  text-transform: uppercase; letter-spacing: 3px; font-weight: 600;">
          Verification Code
        </p>
        <p style="color: #ffffff; margin: 0; font-size: 42px; font-weight: 700;
                  letter-spacing: 12px; font-family: 'Courier New', monospace;">
          ${code}
        </p>
      </div>

      <!-- Expiry Warning -->
      <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b;
                  padding: 14px 16px; border-radius: 0 8px 8px 0; margin: 20px 0;">
        <p style="color: #92400e; margin: 0; font-size: 14px;">
          ⏰ This code expires in <strong>10 minutes</strong>. Do not share it with anyone.
        </p>
      </div>

      <!-- Why this email -->
      <div style="background-color: #f0f9ff; border-left: 4px solid ${PRIMARY_COLOR};
                  padding: 14px 16px; border-radius: 0 8px 8px 0; margin: 20px 0;">
        <p style="color: #0c4a6e; margin: 0; font-size: 14px;">
          <strong>Why am I receiving this?</strong><br>
          Someone is verifying this email address on Highrise.pk as a
          <strong> ${label.toLowerCase()}</strong>.
          If this wasn't you, you can safely ignore this email.
        </p>
      </div>

      <!-- Security note -->
      <div style="background-color: #f0fdf4; border-left: 4px solid #10b981;
                  padding: 14px 16px; border-radius: 0 8px 8px 0; margin: 20px 0;">
        <p style="color: #166534; margin: 0; font-size: 14px;">
          🔒 Highrise.pk will <strong>never</strong> ask for this code via phone, WhatsApp, or SMS.
          Only enter it on the Highrise.pk website.
        </p>
      </div>

      <p style="color: #999; font-size: 14px; margin: 24px 0 0; text-align: center;">
        Having trouble? Contact us at
        <a href="mailto:support@highrise.pk" style="color: ${PRIMARY_COLOR}; text-decoration: none;">
          support@highrise.pk
        </a>
      </p>

      <p style="color: #4a4a4a; font-size: 15px; line-height: 1.6; margin: 20px 0 0 0; text-align: center;">
        — The Highrise.pk Verification Team
      </p>`;

    return baseTemplate(content);
  },
};

// ═══════════════════════════════════════════════════════════════
// TEMPLATE 27: Email Verification Success Confirmation (V6.4.5+)
// ═══════════════════════════════════════════════════════════════

export const emailVerificationSuccessTemplate: EmailTemplate = {
  id: 'email_verification_success',
  name: 'Email Verification Success',
  description: 'Sent after email is successfully verified',
  subject: '✅ Email Verified Successfully — Highrise.pk',
  preview: 'Your email has been verified on Highrise.pk',
  html: (data: Record<string, unknown>) => {
    const purpose = str(data.purpose, 'general');
    const email   = escapeHtml(data.email ?? '');

    const purposeLabels: Record<string, string> = {
      company_email:            'Company Email',
      authorized_person_email:  'Authorized Person Email',
      agent_email:              'Agent Email',
      society_email:            'Society Email',
      general:                  'Email',
    };
    const label = purposeLabels[purpose] ?? 'Email';

    const siteUrl = typeof data.siteUrl === 'string'
      ? data.siteUrl
      : 'https://highrise.pk';

    const content = `
      <div style="text-align: center; margin-bottom: 24px;">
        <div style="display: inline-block; background: #10b981; color: white;
                    padding: 16px; border-radius: 50%; font-size: 32px;">✓</div>
      </div>

      <h2 style="color: ${SECONDARY_COLOR}; margin: 0 0 16px 0; text-align: center;">
        ✅ ${label} Verified!
      </h2>

      <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6; text-align: center; margin: 0 0 20px 0;">
        Your ${label.toLowerCase()}
        ${email ? `(<strong>${email}</strong>)` : ''} has been successfully verified on Highrise.pk.
      </p>

      <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                  color: white; padding: 20px; border-radius: 12px;
                  text-align: center; margin: 24px 0;">
        <h3 style="margin: 0; color: white; font-size: 18px;">
          🔒 Email Status: VERIFIED
        </h3>
        <p style="margin: 8px 0 0; opacity: 0.9; font-size: 14px;">
          ${email}
        </p>
      </div>

      <div class="feature-card" style="background: #f0fdf4; border-left: 4px solid #10b981;">
        <h4 style="color: #166534; margin: 0 0 8px 0;">What's Next?</h4>
        <p style="color: #166534; margin: 0; font-size: 14px;">
          Continue completing your profile to get verified faster.
          All required email verifications must be complete before admin review.
        </p>
      </div>

      <div style="text-align: center; margin: 28px 0;">
        <a href="${safeUrl(siteUrl)}/developer/profile" class="cta-button">
          Continue Profile →
        </a>
      </div>

      <p style="color: #4a4a4a; font-size: 15px; margin: 20px 0 0 0; text-align: center;">
        — The Highrise.pk Verification Team
      </p>`;

    return baseTemplate(content);
  },
};


// ═══════════════════════════════════════════════════════════════
// TEMPLATE 28: Agent Suspended (V6.8.0)
// ═══════════════════════════════════════════════════════════════

export const agentSuspendedTemplate: EmailTemplate = {
  id: 'agent_suspended',
  name: 'Agent Suspended',
  description: 'Sent to agent when admin suspends their account',
  subject: 'Account Suspended - Highrise.pk',
  preview: 'Your agent account has been suspended.',
  html: (data: Record<string, unknown>) => {
    const agentName  = escapeHtml(data.agentName ?? 'Agent');
    const agencyName = escapeHtml(data.agencyName ?? '');
    const reason     = data.reason ? escapeHtml(data.reason) : 'Not specified.';
    const supportUrl = safeUrl(str(data.supportUrl, 'https://highrise.pk/contact'));

    const content = `
      <div style="text-align: center; margin-bottom: 24px;">
        <div style="display: inline-block; background: #f97316; color: white; padding: 16px; border-radius: 50%; font-size: 32px;">⚠️</div>
      </div>

      <h2 style="color: ${SECONDARY_COLOR}; margin: 0 0 16px 0; text-align: center;">
        Account Suspended
      </h2>

      <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
        Assalam-u-Alaikum ${agentName},
      </p>

      <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
        Aap ka <strong>Highrise.pk</strong> agent account
        ${agencyName ? `(<strong>${agencyName}</strong>)` : ''} suspend kar diya gaya hai.
        Aap ki listings public view se hidden ho gayi hain aur aap agent portal access nahi kar sakein ge.
      </p>

      <div style="background: #fff7ed; border-left: 4px solid #f97316; padding: 16px; border-radius: 0 8px 8px 0; margin: 20px 0;">
        <strong style="color: #9a3412; display: block; margin-bottom: 8px;">Suspension Reason:</strong>
        <p style="color: #9a3412; margin: 0; font-size: 14px; line-height: 1.6;">${reason}</p>
      </div>

      <h3 style="color: ${SECONDARY_COLOR}; margin: 24px 0 12px 0;">📝 What You Can Do</h3>
      <ul style="color: #4a4a4a; line-height: 1.8; padding-left: 20px;">
        <li>Contact our support team to appeal</li>
        <li>Address the issues mentioned above</li>
        <li>Wait for admin review after resolving concerns</li>
      </ul>

      <div style="text-align: center; margin: 28px 0;">
        <a href="${supportUrl}" class="cta-button">
          Contact Support →
        </a>
      </div>

      <p style="color: #4a4a4a; font-size: 15px; margin: 20px 0 0 0;">
        Regards,<br>
        <strong>Highrise.pk Team</strong>
      </p>`;

    return baseTemplate(content);
  },
};

// ═══════════════════════════════════════════════════════════════
// TEMPLATE 29: Agent Reinstated (V6.8.0)
// ═══════════════════════════════════════════════════════════════

export const agentReinstatedTemplate: EmailTemplate = {
  id: 'agent_reinstated',
  name: 'Agent Reinstated',
  description: 'Sent to agent when admin reinstates their suspended account',
  subject: '🎉 Welcome Back! Your Account is Active Again - Highrise.pk',
  preview: 'Your agent account has been reinstated.',
  html: (data: Record<string, unknown>) => {
    const agentName    = escapeHtml(data.agentName ?? 'Agent');
    const agencyName   = escapeHtml(data.agencyName ?? '');
    const dashboardUrl = safeUrl(str(data.dashboardUrl, 'https://highrise.pk/agent/dashboard'));

    const content = `
      <div style="text-align: center; margin-bottom: 24px;">
        <div style="display: inline-block; background: #10b981; color: white; padding: 16px; border-radius: 50%; font-size: 32px;">✓</div>
      </div>

      <h2 style="color: ${SECONDARY_COLOR}; margin: 0 0 16px 0; text-align: center;">
        🎉 Welcome Back, ${agentName}!
      </h2>

      <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6; text-align: center; margin: 0 0 24px 0;">
        ${agencyName ? `<strong>${agencyName}</strong> ka ` : 'Aap ka '}<strong>Highrise.pk</strong> agent account
        reinstate ho gaya hai. Aap dobara verified agents network ka hissa hain.
      </p>

      <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 24px; border-radius: 12px; text-align: center; margin: 24px 0;">
        <h3 style="margin: 0 0 8px 0; color: white;">✅ Account Status: ACTIVE</h3>
        ${agencyName ? `<p style="margin: 0; opacity: 0.95;">${agencyName}</p>` : ''}
      </div>

      <h3 style="color: ${SECONDARY_COLOR}; margin: 24px 0 12px 0;">🚀 Ab Aap Dobara Kar Sakte Hain:</h3>
      <ul style="color: #4a4a4a; line-height: 1.8; padding-left: 20px;">
        <li>Properties list aur manage kar sakte hain</li>
        <li>Client inquiries aur leads receive kar sakte hain</li>
        <li>Verified agent badge dobara active hai</li>
        <li>Public profile visible hai buyers ke liye</li>
        <li>Agent dashboard aur analytics access</li>
      </ul>

      <div style="text-align: center; margin: 32px 0;">
        <a href="${dashboardUrl}" class="cta-button" style="background: #10b981; font-size: 16px;">
          Go to Dashboard →
        </a>
      </div>

      <div class="feature-card" style="background: #f0fdf4; border-left-color: #10b981;">
        <h4 style="color: #166534; margin: 0 0 8px 0;">💡 Reminder</h4>
        <p style="color: #166534; margin: 0; font-size: 14px;">
          Please log in again to activate your session. Platform guidelines follow karein
          taake future mein koi issue na ho.
        </p>
      </div>

      <p style="color: #4a4a4a; font-size: 15px; margin: 24px 0 0 0;">
        JazakAllah,<br>
        <strong>Highrise.pk Team</strong>
      </p>`;

    return baseTemplate(content);
  },
};

// ═══════════════════════════════════════════════════════════════
// TEMPLATE 30: Agent — New Lead Received (V6.8.0)
// ═══════════════════════════════════════════════════════════════

export const agentNewLeadTemplate: EmailTemplate = {
  id: 'agent_new_lead',
  name: 'Agent New Lead',
  description: 'Sent to agent when a new inquiry is received on their property',
  subject: '🔥 New Lead: {{propertyTitle}} - Respond Quickly!',
  preview: 'A new buyer inquiry requires your attention.',
  html: (data: Record<string, unknown>) => {
    const agentName        = escapeHtml(data.agentName ?? 'Agent');
    const customerName     = escapeHtml(data.customerName ?? 'Buyer');
    const customerPhone    = safePhone(data.customerPhone);
    const customerPhoneDisplay = escapeHtml(data.customerPhone ?? 'Not provided');
    const customerEmail    = escapeHtml(data.customerEmail ?? '');
    const propertyTitle    = escapeHtml(data.propertyTitle ?? 'Your Property');
    const propertyPrice    = escapeHtml(data.propertyPrice ?? '');
    const propertyLocation = escapeHtml(data.propertyLocation ?? '');
    const message          = data.message ? escapeHtml(data.message) : null;
    const leadId           = escapeHtml(data.leadId ?? '');
    const dashboardUrl     = safeUrl(str(data.dashboardUrl, 'https://highrise.pk/agent/leads'));
    const propertyUrl      = safeUrl(data.propertyUrl);

    const waText = encodeURIComponent(
      `Assalam-u-Alaikum ${str(data.customerName, 'sir/madam')}! Main Highrise.pk se bol raha hoon. Aap ne ${str(data.propertyTitle, 'property')} ke baare mein inquiry bheji thi.`
    );

    const content = `
      <div style="background: linear-gradient(135deg, ${PRIMARY_COLOR} 0%, ${SECONDARY_COLOR} 100%); color: white; padding: 24px; border-radius: 12px 12px 0 0; text-align: center; margin: -30px -30px 24px -30px;">
        <h2 style="margin: 0; font-size: 22px;">🔥 New Lead Received!</h2>
        <p style="margin: 8px 0 0; opacity: 0.9; font-size: 14px;">
          Assalam-u-Alaikum ${agentName}, respond within 2 hours for best conversion
        </p>
      </div>

      <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 14px 16px; border-radius: 0 8px 8px 0; margin-bottom: 20px;">
        <strong style="color: #92400e; font-size: 14px;">⚡ Response Time = Higher Conversion</strong>
        <p style="color: #92400e; margin: 4px 0 0; font-size: 13px;">
          Buyers who receive replies within 2 hours convert 3x more often.
        </p>
      </div>

      <h3 style="color: ${SECONDARY_COLOR}; margin: 20px 0 12px 0;">👤 Buyer Details</h3>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
        <tr style="background: #f8f9fa;">
          <td style="padding: 10px 12px; color: #666; font-size: 14px; width: 35%; border-bottom: 1px solid #e9ecef;">Name</td>
          <td style="padding: 10px 12px; font-weight: 700; font-size: 15px; border-bottom: 1px solid #e9ecef;">${customerName}</td>
        </tr>
        <tr>
          <td style="padding: 10px 12px; color: #666; font-size: 14px; border-bottom: 1px solid #e9ecef;">📞 Phone</td>
          <td style="padding: 10px 12px; font-size: 15px; border-bottom: 1px solid #e9ecef;">
            <a href="tel:${customerPhone}" style="color: ${PRIMARY_COLOR}; font-weight: 700; text-decoration: none;">
              ${customerPhoneDisplay}
            </a>
          </td>
        </tr>
        ${customerEmail ? `
        <tr style="background: #f8f9fa;">
          <td style="padding: 10px 12px; color: #666; font-size: 14px; border-bottom: 1px solid #e9ecef;">📧 Email</td>
          <td style="padding: 10px 12px; font-size: 14px; border-bottom: 1px solid #e9ecef;">
            <a href="mailto:${customerEmail}" style="color: ${PRIMARY_COLOR};">${customerEmail}</a>
          </td>
        </tr>` : ''}
        ${leadId ? `
        <tr>
          <td style="padding: 10px 12px; color: #666; font-size: 14px;">Lead ID</td>
          <td style="padding: 10px 12px; font-family: monospace; font-size: 12px; color: ${PRIMARY_COLOR};">${leadId}</td>
        </tr>` : ''}
      </table>

      <h3 style="color: ${SECONDARY_COLOR}; margin: 20px 0 12px 0;">🏠 Property Details</h3>
      <div class="property-card" style="margin-bottom: 20px;">
        <div class="property-details">
          <h4 style="margin: 0 0 8px 0; color: #333;">${propertyTitle}</h4>
          ${propertyPrice ? `<div class="property-price">${propertyPrice}</div>` : ''}
          ${propertyLocation ? `<p style="color: #666; margin: 8px 0; font-size: 14px;">📍 ${propertyLocation}</p>` : ''}
        </div>
      </div>

      ${message ? `
      <div class="feature-card">
        <h4 style="color: ${SECONDARY_COLOR}; margin: 0 0 10px 0;">💬 Buyer's Message</h4>
        <p style="color: #4a4a4a; margin: 0; font-style: italic;">"${message}"</p>
      </div>` : ''}

      <div style="text-align: center; margin: 28px 0;">
        <a href="tel:${customerPhone}"
           style="display: inline-block; background: #10b981; color: white;
                  padding: 14px 26px; text-decoration: none; border-radius: 8px;
                  font-weight: 700; font-size: 15px; margin: 0 6px 8px 0;">
          📞 Call Now
        </a>
        <a href="https://wa.me/${customerPhone}?text=${waText}"
           style="display: inline-block; background: #25D366; color: white;
                  padding: 14px 26px; text-decoration: none; border-radius: 8px;
                  font-weight: 700; font-size: 15px; margin: 0 6px 8px 0;">
          💬 WhatsApp
        </a>
        <a href="${dashboardUrl}"
           style="display: inline-block; background: ${PRIMARY_COLOR}; color: white;
                  padding: 14px 26px; text-decoration: none; border-radius: 8px;
                  font-weight: 700; font-size: 15px;">
          View in Dashboard →
        </a>
      </div>

      ${propertyUrl !== '#' ? `
      <div style="text-align: center; margin: 16px 0;">
        <a href="${propertyUrl}" style="color: ${PRIMARY_COLOR}; text-decoration: none; font-size: 13px;">
          View Property Listing →
        </a>
      </div>` : ''}

      <p style="color: #999; font-size: 12px; text-align: center; margin: 24px 0 0;">
        This is an automated notification from Highrise.pk lead system.
      </p>`;

    return baseTemplate(content);
  },
};

// ═══════════════════════════════════════════════════════════════
// TEMPLATE 31: Agent Listing Approved (V6.8.0)
// ═══════════════════════════════════════════════════════════════

export const agentListingApprovedTemplate: EmailTemplate = {
  id: 'agent_listing_approved',
  name: 'Agent Listing Approved',
  description: 'Sent to agent when admin approves their property listing',
  subject: '✅ Your Listing is Live: {{propertyTitle}} - Highrise.pk',
  preview: 'Your property listing has been approved and is now live.',
  html: (data: Record<string, unknown>) => {
    const agentName     = escapeHtml(data.agentName ?? 'Agent');
    const propertyTitle = escapeHtml(data.propertyTitle ?? 'Your Property');
    const propertyPrice = escapeHtml(data.propertyPrice ?? '');
    const propertyUrl   = safeUrl(data.propertyUrl);
    const dashboardUrl  = safeUrl(str(data.dashboardUrl, 'https://highrise.pk/agent/listings'));

    const content = `
      <div style="text-align: center; margin-bottom: 24px;">
        <div style="display: inline-block; background: #10b981; color: white; padding: 16px; border-radius: 50%; font-size: 32px;">✓</div>
      </div>

      <h2 style="color: ${SECONDARY_COLOR}; margin: 0 0 16px 0; text-align: center;">
        🎉 Listing Approved!
      </h2>

      <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6; text-align: center; margin: 0 0 24px 0;">
        Mubarak Ho ${agentName}! Aapki listing <strong>${propertyTitle}</strong> approve ho gayi hai
        aur ab live hai Highrise.pk par.
      </p>

      <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 20px; border-radius: 12px; text-align: center; margin: 24px 0;">
        <h3 style="margin: 0 0 8px 0; color: white; font-size: 18px;">🏠 Status: LIVE</h3>
        <p style="margin: 0; opacity: 0.95; font-size: 14px;">${propertyTitle}</p>
        ${propertyPrice ? `<p style="margin: 8px 0 0; opacity: 0.9; font-size: 14px;">${propertyPrice}</p>` : ''}
      </div>

      <h3 style="color: ${SECONDARY_COLOR}; margin: 24px 0 12px 0;">📈 Ab Kya Hoga:</h3>
      <ul style="color: #4a4a4a; line-height: 1.8; padding-left: 20px;">
        <li>Aap ki listing search results mein appear hogi</li>
        <li>Buyers aap ki property view kar sakein ge</li>
        <li>Inquiries direct aap ko notify hongi</li>
        <li>Trust Score aur badges automatically update honge</li>
      </ul>

      <div style="text-align: center; margin: 32px 0;">
        ${propertyUrl !== '#' ? `
        <a href="${propertyUrl}" class="cta-button" style="background: ${PRIMARY_COLOR}; margin: 0 8px 8px 0;">
          View Live Listing →
        </a>` : ''}
        <a href="${dashboardUrl}" class="cta-button" style="background: #10b981;">
          Manage Listings →
        </a>
      </div>

      <div class="feature-card" style="background: #f0f9ff; border-left-color: ${PRIMARY_COLOR};">
        <h4 style="color: ${SECONDARY_COLOR}; margin: 0 0 8px 0;">💡 Pro Tip</h4>
        <p style="color: #4a4a4a; margin: 0; font-size: 14px;">
          High-quality photos aur detailed description walli listings 5x zyada inquiries lati hain.
          Regularly listings update karein for maximum visibility.
        </p>
      </div>

      <p style="color: #4a4a4a; font-size: 15px; margin: 24px 0 0 0;">
        JazakAllah,<br>
        <strong>Highrise.pk Team</strong>
      </p>`;

    return baseTemplate(content);
  },
};

// ═══════════════════════════════════════════════════════════════
// V6.8.0 HELPER: Send Agent New Lead Notification
// ═══════════════════════════════════════════════════════════════

interface AgentLeadEmailParams {
  agentEmail:       string;
  agentName:        string;
  customerName:     string;
  customerPhone:    string;
  customerEmail?:   string;
  propertyTitle:    string;
  propertyPrice?:   string;
  propertyLocation?: string;
  propertyUrl?:     string;
  message?:         string;
  leadId:           string;
}

export async function sendAgentLeadNotification(
  params: AgentLeadEmailParams
): Promise<void> {
  const { sendEmail } = await import('@/lib/email');
  await sendEmail({
    to:       params.agentEmail,
    subject:  `🔥 New Lead: ${params.propertyTitle} - Respond Quickly!`,
    html:     agentNewLeadTemplate.html({
      agentName:        params.agentName,
      customerName:     params.customerName,
      customerPhone:    params.customerPhone,
      customerEmail:    params.customerEmail,
      propertyTitle:    params.propertyTitle,
      propertyPrice:    params.propertyPrice,
      propertyLocation: params.propertyLocation,
      propertyUrl:      params.propertyUrl,
      message:          params.message,
      leadId:           params.leadId,
      dashboardUrl:     'https://highrise.pk/agent/leads',
    }),
    fromName: 'Highrise.pk Leads',
  });
}

// ═══════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════

// New Owner Templates defined in your submit-verification/approve/reject APIs
// are integrated here for centralized rendering capability.

export const emailTemplates: EmailTemplate[] = [
  welcomeTemplate,
  weeklyUpdateTemplate,
  propertyAlertTemplate,
  marketInsightsTemplate,
  customTemplate,
  inquiryAutoResponseTemplate,
  adminInquiryNotificationTemplate,
  agentOnboardingConfirmationTemplate,
  adminNewAgentApplicationTemplate,
  agentOnboardingApprovedTemplate,
  agentOnboardingRejectedTemplate,
  agentOnboardingInfoRequiredTemplate,
  developerOnboardingConfirmationTemplate,
  developerOnboardingApprovedTemplate,
  developerOnboardingRejectedTemplate,
  developerOnboardingInfoRequiredTemplate,
  societyOnboardingConfirmationTemplate,
  adminNewSocietyApplicationTemplate,
  societyOnboardingApprovedTemplate,
  societyOnboardingRejectedTemplate,
  societyOnboardingInfoRequiredTemplate,
  ariaLeadCapturedTemplate,
  ariaLeadAutoResponseTemplate,
  quotaAlertTemplate,
  priorityLeadAlertTemplate,
  // V6.6.0 Owner Templates (Dynamically added from logic in APIs)
  {
    id: 'owner_verification_submitted',
    name: 'Owner Verification Submitted',
    description: 'Confirmation to owner after CNIC submission',
    subject: '📋 Verification Submitted — Highrise.pk',
    preview: 'Aapki application successfully receive ho gayi hai.',
    html: (data) => '', // Logic handled in submit-verification.ts
  },
  {
    id: 'owner_verification_approved',
    name: 'Owner Verification Approved',
    description: 'Sent when admin approves owner',
    subject: '🎉 Verified Owner — Highrise.pk',
    preview: 'Mubarak Ho! Aap Verified Owner ban gaye hain.',
    html: (data) => '', // Logic handled in approve.ts
  }
];

export const getTemplateById = (id: string): EmailTemplate | undefined => {
  return emailTemplates.find((template) => template.id === id);
};

export const renderTemplate = (
  templateId: string,
  data: Record<string, unknown>
): string => {
  const template = getTemplateById(templateId);
  if (!template) {
    return customTemplate.html(data);
  }

  // Replace {{variable}} placeholders in subject line
  let subject = template.subject;
  for (const [key, value] of Object.entries(data)) {
    subject = subject.replace(`{{${key}}}`, escapeHtml(value));
  }

  return template.html(data);
};

// ========== END OF FILE ==========