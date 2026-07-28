// models/Blog.ts

import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IBlog extends Document {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  category: string;
  
  // 🆕 Author as Reference (instead of just string)
  authorId?: Types.ObjectId;
  authorName: string;
  authorBio?: string;
  authorAvatar?: string;
  
  image: {
    url: string;
    public_id: string;
  };
  
  // 🆕 Gallery Support
  gallery?: {
    url: string;
    public_id: string;
    caption?: string;
    alt?: string;
  }[];
  
  readTime: string;
  status: 'draft' | 'published' | 'scheduled';
  publishedAt: Date | null;
  scheduledFor: Date | null;
  tags: string[];
  
  // SEO Fields
  metaTitle: string;
  metaDescription: string;
  keywords?: string[];  // 🆕
  canonicalUrl?: string;  // 🆕
  ogImage?: string;  // 🆕 Open Graph specific image
  
  views: number;
  featured: boolean;
  
  // 🆕 Featured Priority
  featuredPriority?: number;
  featuredUntil?: Date;
  
  source: 'manual' | 'ai_generated';
  aiMetadata?: {
    model: string;
    generatedAt: Date;
    sources: string[];
  };
  
  // 🆕 Related Posts
  relatedPosts?: Types.ObjectId[];
  
  // 🆕 Series Support
  series?: {
    name: string;
    part: number;
    totalParts?: number;
    previousPost?: Types.ObjectId;
    nextPost?: Types.ObjectId;
  };
  
  // 🆕 Comments & Social
  allowComments: boolean;
  commentCount: number;
  shareCount: number;
  likeCount: number;
  
  // 🆕 Edit Tracking
  lastEditedBy?: Types.ObjectId;
  lastEditedAt?: Date;
  editCount: number;
  
  // 🆕 Table of Contents
  tableOfContents?: {
    id: string;
    title: string;
    level: number;
  }[];
  enableTOC: boolean;
  
  // Soft Delete
  isDeleted: boolean;
  deletedAt: Date | null;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

const BlogSchema = new Schema<IBlog>(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    excerpt: {
      type: String,
      required: [true, 'Excerpt is required'],
      maxlength: [500, 'Excerpt cannot exceed 500 characters'],
    },
    content: {
      type: String,
      required: [true, 'Content is required'],
    },
    category: {
  type: String,
  required: [true, 'Category is required'],
  enum: [
    // 🏠 Property Guides
    'Buying Guide',
    'Selling Guide',
    'Renting Guide',
    'First-Time Buyers',
    
    // 💰 Investment & Finance
    'Investment',
    'Investment Tips',
    'ROI Analysis',
    'Real Estate Finance',
    'Mortgage & Loans',
    
    // 📊 Market & Analysis
    'Market Analysis',
    'Market Trends',
    'Price Trends',
    'Market News',
    'Industry Reports',
    
    // ⚖️ Legal & Documentation
    'Legal',
    'Legal Guide',
    'Property Laws',
    'Documentation',
    'Taxation',
    'Verification',
    
    // 🏙️ City & Area Guides
    'Karachi',
    'Lahore',
    'Islamabad',
    'Rawalpindi',
    'Faisalabad',
    'Multan',
    'Peshawar',
    'Quetta',
    'City Guide',
    'Area Guide',
    'Society Reviews',
    
    // 🏗️ Projects & Developers
    'New Projects',
    'Project Reviews',
    'Developer News',
    'Under Construction',
    'Upcoming Projects',
    
    // 🏡 Property Types
    'Apartments',
    'Houses',
    'Plots',
    'Commercial',
    'Offices',
    'Shops',
    'Farmhouses',
    'Penthouses',
    
    // 🎨 Lifestyle & Living
    'Lifestyle',
    'Home Decor',
    'Interior Design',
    'Architecture',
    'Smart Homes',
    'Renovation',
    'Maintenance',
    
    // 📰 News & Updates
    'News',
    'Government Policies',
    'CPEC Updates',
    'Infrastructure',
    'Economy',
    
    // 💡 Tips & Advice
    'Tips',
    'Expert Advice',
    'How-To Guides',
    'Checklist',
    'FAQs',
    
    // 🔧 Technology
    'Technology',
    'PropTech',
    'Virtual Tours',
    'Online Transactions',
    
    // 📋 Others
    'Opinion',
    'Interview',
    'Success Stories',
    'General',
  ],
},
    
    // 🆕 Author as Reference
    authorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    authorName: {
      type: String,
      required: [true, 'Author name is required'],
    },
    authorBio: {
      type: String,
      maxlength: 300,
    },
    authorAvatar: {
      type: String,
    },
    
    image: {
      url: { type: String, required: true },
      public_id: { type: String, required: true },
    },
    
    // 🆕 Gallery
    gallery: [{
      url: { type: String, required: true },
      public_id: { type: String, required: true },
      caption: { type: String, maxlength: 200 },
      alt: { type: String, maxlength: 150 },
    }],
    
    readTime: {
      type: String,
      default: '5 min read',
    },
    status: {
      type: String,
      enum: ['draft', 'published', 'scheduled'],
      default: 'draft',
    },
    publishedAt: {
      type: Date,
      default: null,
    },
    scheduledFor: {
      type: Date,
      default: null,
    },
    tags: [{
      type: String,
      trim: true,
    }],
    
    // SEO Fields
    metaTitle: {
      type: String,
      maxlength: [70, 'Meta title should not exceed 70 characters'],
    },
    metaDescription: {
      type: String,
      maxlength: [160, 'Meta description should not exceed 160 characters'],
    },
    keywords: [{
      type: String,
    }],
    canonicalUrl: {
      type: String,
    },
    ogImage: {
      type: String,
    },
    
    views: {
      type: Number,
      default: 0,
    },
    featured: {
      type: Boolean,
      default: false,
    },
    
    // 🆕 Featured Priority
    featuredPriority: {
      type: Number,
      default: 0,
    },
    featuredUntil: {
      type: Date,
    },
    
    source: {
      type: String,
      enum: ['manual', 'ai_generated'],
      default: 'manual',
    },
    aiMetadata: {
      model: String,
      generatedAt: Date,
      sources: [String],
    },
    
    // 🆕 Related Posts
    relatedPosts: [{
      type: Schema.Types.ObjectId,
      ref: 'Blog',
    }],
    
    // 🆕 Series Support
    series: {
      name: { type: String },
      part: { type: Number },
      totalParts: { type: Number },
      previousPost: { type: Schema.Types.ObjectId, ref: 'Blog' },
      nextPost: { type: Schema.Types.ObjectId, ref: 'Blog' },
    },
    
    // 🆕 Comments & Social
    allowComments: {
      type: Boolean,
      default: true,
    },
    commentCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    shareCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    likeCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    
    // 🆕 Edit Tracking
    lastEditedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    lastEditedAt: {
      type: Date,
    },
    editCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    
    // 🆕 Table of Contents
    tableOfContents: [{
      id: { type: String, required: true },
      title: { type: String, required: true },
      level: { type: Number, required: true }, // 2, 3, 4 for h2, h3, h4
    }],
    enableTOC: {
      type: Boolean,
      default: true,
    },
    
    // Soft Delete
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// ============================================
// INDEXES
// ============================================

BlogSchema.index({ status: 1, publishedAt: -1 });
BlogSchema.index({ category: 1 });
BlogSchema.index({ tags: 1 });
BlogSchema.index({ slug: 1 });
BlogSchema.index({ isDeleted: 1, status: 1 });
BlogSchema.index({ featured: 1, featuredPriority: -1 });  // 🆕
BlogSchema.index({ authorId: 1, status: 1 });  // 🆕
BlogSchema.index({ 'series.name': 1, 'series.part': 1 });  // 🆕
BlogSchema.index({ keywords: 1 });  // 🆕
BlogSchema.index({ views: -1 });  // 🆕 Popular posts

// Text search with weighted relevance
BlogSchema.index(
  {
    title: 'text',
    excerpt: 'text',
    content: 'text',
    tags: 'text',
    authorName: 'text',
  },
  {
    weights: {
      title: 10,       // Title matches are most important
      tags: 8,         // Tag matches are very important
      excerpt: 5,      // Excerpt matches are important
      authorName: 3,   // Author name matches
      content: 1,      // Content matches (lowest priority)
    },
    name: 'blog_text_search',
    default_language: 'english',
  }
);

// ============================================
// PRE-SAVE MIDDLEWARE
// ============================================

BlogSchema.pre('save', function (next) {
  // Create slug from title before saving
  if (this.isModified('title') && !this.slug) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      + '-' + Date.now().toString(36);
  }
  
  // Set publishedAt when status changes to published
  if (this.isModified('status') && this.status === 'published' && !this.publishedAt) {
    this.publishedAt = new Date();
  }
  
  // Calculate read time based on content length
  if (this.isModified('content')) {
    const wordsPerMinute = 200;
    const wordCount = this.content.split(/\s+/).length;
    const minutes = Math.ceil(wordCount / wordsPerMinute);
    this.readTime = `${minutes} min read`;
  }
  
  // 🆕 Auto-generate SEO fields
  if (!this.metaTitle && this.title) {
    this.metaTitle = `${this.title} | Highrise.pk Blog`;
    if (this.metaTitle.length > 70) {
      this.metaTitle = this.metaTitle.substring(0, 67) + '...';
    }
  }
  
  if (!this.metaDescription && this.excerpt) {
    this.metaDescription = this.excerpt.substring(0, 157);
    if (this.excerpt.length > 157) {
      this.metaDescription += '...';
    }
  }
  
  if (!this.keywords || this.keywords.length === 0) {
    this.keywords = [
      ...this.tags.slice(0, 5),
      this.category?.toLowerCase(),
      'highrise.pk',
      'pakistan real estate',
    ].filter(Boolean) as string[];
  }
  
  if (!this.canonicalUrl && this.slug) {
    this.canonicalUrl = `https://highrise.pk/blog/${this.slug}`;
  }
  
  if (!this.ogImage && this.image?.url) {
    this.ogImage = this.image.url;
  }
  
  // 🆕 Auto-generate Table of Contents from content
  if (this.isModified('content') && this.enableTOC) {
    const headingRegex = /<h([2-4])[^>]*id="([^"]*)"[^>]*>([^<]*)<\/h[2-4]>/gi;
    const toc: { id: string; title: string; level: number }[] = [];
    let match;
    
    while ((match = headingRegex.exec(this.content)) !== null) {
      toc.push({
        level: parseInt(match[1]),
        id: match[2],
        title: match[3].trim(),
      });
    }
    
    if (toc.length > 0) {
      this.tableOfContents = toc;
    }
  }
  
  // 🆕 Track edits
  if (!this.isNew && this.isModified('content')) {
    this.editCount = (this.editCount || 0) + 1;
    this.lastEditedAt = new Date();
  }
  
  next();
});

// ============================================
// VIRTUAL FIELDS
// ============================================

BlogSchema.virtual('url').get(function (this: IBlog) {
  return `/blog/${this.slug}`;
});

BlogSchema.virtual('isPublished').get(function (this: IBlog) {
  return this.status === 'published' && this.publishedAt && this.publishedAt <= new Date();
});

BlogSchema.virtual('isFeaturedActive').get(function (this: IBlog) {
  if (!this.featured) return false;
  if (!this.featuredUntil) return true;
  return this.featuredUntil > new Date();
});

// 🆕 Reading stats
BlogSchema.virtual('wordCount').get(function (this: IBlog) {
  return this.content?.split(/\s+/).length || 0;
});

// Ensure virtuals are included
BlogSchema.set('toJSON', { virtuals: true });
BlogSchema.set('toObject', { virtuals: true });

// ============================================
// MODEL EXPORT
// ============================================

const Blog = mongoose.models.Blog || mongoose.model<IBlog>('Blog', BlogSchema);

export default Blog;
