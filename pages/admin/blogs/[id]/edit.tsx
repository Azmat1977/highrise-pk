import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import AdminLayout from '@/components/admin/AdminLayout';
import TipTapEditor, { TipTapEditorRef } from '@/components/admin/blog/TipTapEditor';
import MediaPickerModal from '@/components/admin/blog/MediaPickerModal';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Save,
  Image as ImageIcon,
  X,
  Calendar,
  Tag,
  FileText,
  AlertCircle,
  Check,
  Loader2,
  Upload,
  Star,
  Clock,
  Trash2,
  RefreshCw,
} from 'lucide-react';
import toast from 'react-hot-toast';

// Blog categories from your model
const CATEGORIES = [
  'Investment',
  'Legal',
  'Guide',
  'Technology',
  'Market Analysis',
  'News',
  'Tips',
  'Lifestyle',
];

interface BlogFormData {
  title: string;
  excerpt: string;
  content: string;
  category: string;
  author: string;
  tags: string[];
  status: 'draft' | 'published' | 'scheduled';
  featured: boolean;
  metaTitle: string;
  metaDescription: string;
  scheduledFor: string;
  image: {
    url: string;
    public_id: string;
  } | null;
}

export default function EditBlogPage() {
  const router = useRouter();
  const { id } = router.query;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [mediaPickerFor, setMediaPickerFor] = useState<'featured' | 'content'>('featured');
  const [tagInput, setTagInput] = useState('');
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Editor ref for inserting images into content
  const editorRef = useRef<TipTapEditorRef>(null);

  // Form data
  const [formData, setFormData] = useState<BlogFormData>({
    title: '',
    excerpt: '',
    content: '',
    category: '',
    author: '',
    tags: [],
    status: 'draft',
    featured: false,
    metaTitle: '',
    metaDescription: '',
    scheduledFor: '',
    image: null,
  });

  // Fetch blog data
  useEffect(() => {
    if (!id) return;

    const fetchBlog = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/admin/blogs/${id}`);
        const data = await res.json();

        if (data.success && data.blog) {
          const blog = data.blog;
          setFormData({
            title: blog.title || '',
            excerpt: blog.excerpt || '',
            content: blog.content || '',
            category: blog.category || '',
            author: blog.author || '',
            tags: blog.tags || [],
            status: blog.status || 'draft',
            featured: blog.featured || false,
            metaTitle: blog.metaTitle || '',
            metaDescription: blog.metaDescription || '',
            scheduledFor: blog.scheduledFor
              ? new Date(blog.scheduledFor).toISOString().slice(0, 16)
              : '',
            image: blog.image || null,
          });
        } else {
          toast.error('Blog not found');
          router.push('/admin/blogs');
        }
      } catch (error) {
        console.error('Error fetching blog:', error);
        toast.error('Failed to load blog');
        router.push('/admin/blogs');
      } finally {
        setLoading(false);
      }
    };

    fetchBlog();
  }, [id, router]);

  // Handle input change
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));

    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  // Handle content change from TipTap
  const handleContentChange = (content: string) => {
    setFormData((prev) => ({ ...prev, content }));
    if (errors.content) {
      setErrors((prev) => ({ ...prev, content: '' }));
    }
  };

  // Handle featured image select from media picker
  const handleImageSelect = (media: any) => {
    setFormData((prev) => ({
      ...prev,
      image: {
        url: media.url,
        public_id: media.publicId || media.public_id,
      },
    }));
    if (errors.image) {
      setErrors((prev) => ({ ...prev, image: '' }));
    }
    setShowMediaPicker(false);
  };

  // Handle content image insert (from editor toolbar)
  const handleContentImageSelect = (media: any) => {
    if (editorRef.current) {
      editorRef.current.insertImage(media.url);
    }
    setShowMediaPicker(false);
  };

  // Remove featured image
  const handleRemoveImage = () => {
    setFormData((prev) => ({ ...prev, image: null }));
  };

  // Add tag
  const handleAddTag = () => {
    const tag = tagInput.trim().toLowerCase();
    if (tag && !formData.tags.includes(tag)) {
      setFormData((prev) => ({
        ...prev,
        tags: [...prev.tags, tag],
      }));
      setTagInput('');
    }
  };

  // Remove tag
  const handleRemoveTag = (tagToRemove: string) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.filter((tag) => tag !== tagToRemove),
    }));
  };

  // Handle tag input keypress
  const handleTagKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      handleAddTag();
    }
  };

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }

    if (!formData.excerpt.trim()) {
      newErrors.excerpt = 'Excerpt is required';
    } else if (formData.excerpt.length > 500) {
      newErrors.excerpt = 'Excerpt must be less than 500 characters';
    }

    if (!formData.content.trim() || formData.content === '<p></p>') {
      newErrors.content = 'Content is required';
    }

    if (!formData.category) {
      newErrors.category = 'Category is required';
    }

    if (!formData.image?.url) {
      newErrors.image = 'Featured image is required';
    }

    if (formData.status === 'scheduled' && !formData.scheduledFor) {
      newErrors.scheduledFor = 'Schedule date is required for scheduled posts';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Calculate word count and read time
  const getWordCount = () => {
    const text = formData.content.replace(/<[^>]*>/g, '');
    return text.split(/\s+/).filter(Boolean).length;
  };

  const getReadTime = () => {
    const words = getWordCount();
    const minutes = Math.ceil(words / 200);
    return `${minutes} min read`;
  };

  // Save blog
  const handleSave = async (status?: 'draft' | 'published') => {
    const saveStatus = status || formData.status;
    setFormData((prev) => ({ ...prev, status: saveStatus }));

    if (!validateForm()) {
      toast.error('Please fix the errors before saving');
      return;
    }

    setSaving(true);

    try {
      const res = await fetch(`/api/admin/blogs/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          status: saveStatus,
        }),
      });

      const data = await res.json();

      if (data.success) {
        toast.success(
          saveStatus === 'published'
            ? 'Blog published successfully!'
            : 'Blog updated successfully!'
        );

        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('refreshAdminStats'));
        }

        router.push('/admin/blogs');
      } else {
        toast.error(data.message || 'Failed to update blog');
      }
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Failed to update blog');
    } finally {
      setSaving(false);
    }
  };

  // Delete blog
  const handleDelete = async () => {
    setDeleting(true);

    try {
      const res = await fetch(`/api/admin/blogs/${id}`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (data.success) {
        toast.success('Blog moved to trash');

        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('refreshAdminStats'));
        }

        router.push('/admin/blogs');
      } else {
        toast.error(data.message || 'Failed to delete blog');
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete blog');
    } finally {
      setDeleting(false);
      setShowDeleteModal(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <RefreshCw className="w-10 h-10 text-[#029bba] animate-spin mx-auto mb-4" />
            <p className="text-gray-500">Loading blog...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/admin/blogs')}
              className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Edit Post</h1>
              <p className="text-gray-500 text-sm mt-1">
                Update your blog post
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowDeleteModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 text-red-600 hover:bg-red-50 rounded-xl font-medium transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
            <button
              onClick={() => handleSave('draft')}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Save Draft
            </button>
            <button
              onClick={() => handleSave('published')}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#029bba] hover:bg-[#027a94] text-white rounded-xl font-medium transition-colors disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              {formData.status === 'published' ? 'Update' : 'Publish'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content - Left Side */}
          <div className="lg:col-span-2 space-y-6">
            {/* Title */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="Enter blog title..."
                className={`w-full px-4 py-3 text-lg border rounded-xl focus:ring-2 focus:ring-[#029bba]/20 outline-none transition-all ${
                  errors.title
                    ? 'border-red-300 focus:border-red-500'
                    : 'border-gray-200 focus:border-[#029bba]'
                }`}
              />
              {errors.title && (
                <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.title}
                </p>
              )}
            </div>

            {/* Excerpt */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Excerpt <span className="text-red-500">*</span>
              </label>
              <textarea
                name="excerpt"
                value={formData.excerpt}
                onChange={handleChange}
                placeholder="Write a short summary..."
                rows={3}
                className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-[#029bba]/20 outline-none transition-all resize-none ${
                  errors.excerpt
                    ? 'border-red-300 focus:border-red-500'
                    : 'border-gray-200 focus:border-[#029bba]'
                }`}
              />
              <div className="flex justify-between mt-1">
                {errors.excerpt ? (
                  <p className="text-red-500 text-sm flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors.excerpt}
                  </p>
                ) : (
                  <span />
                )}
                <span
                  className={`text-sm ${
                    formData.excerpt.length > 500 ? 'text-red-500' : 'text-gray-400'
                  }`}
                >
                  {formData.excerpt.length}/500
                </span>
              </div>
            </div>

            {/* Content Editor */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Content <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <span>{getWordCount()} words</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {getReadTime()}
                  </span>
                </div>
              </div>
              
              {/* TipTap Editor with ref */}
              <TipTapEditor
                ref={editorRef}
                content={formData.content}
                onChange={handleContentChange}
                placeholder="Start writing your blog post..."
                onImageUpload={() => {
                  setMediaPickerFor('content');
                  setShowMediaPicker(true);
                }}
              />
              
              {errors.content && (
                <p className="text-red-500 text-sm mt-2 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.content}
                </p>
              )}
            </div>

            {/* SEO Section */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#029bba]" />
                SEO Settings
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Meta Title
                  </label>
                  <input
                    type="text"
                    name="metaTitle"
                    value={formData.metaTitle}
                    onChange={handleChange}
                    placeholder="SEO title (max 60 characters)"
                    maxLength={60}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/20 outline-none transition-all"
                  />
                  <div className="flex justify-end mt-1">
                    <span
                      className={`text-sm ${
                        formData.metaTitle.length > 60 ? 'text-red-500' : 'text-gray-400'
                      }`}
                    >
                      {formData.metaTitle.length}/60
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Meta Description
                  </label>
                  <textarea
                    name="metaDescription"
                    value={formData.metaDescription}
                    onChange={handleChange}
                    placeholder="SEO description (max 155 characters)"
                    maxLength={155}
                    rows={2}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/20 outline-none transition-all resize-none"
                  />
                  <div className="flex justify-end mt-1">
                    <span
                      className={`text-sm ${
                        formData.metaDescription.length > 155
                          ? 'text-red-500'
                          : 'text-gray-400'
                      }`}
                    >
                      {formData.metaDescription.length}/155
                    </span>
                  </div>
                </div>

                {/* SEO Preview */}
                <div className="p-4 bg-gray-50 rounded-xl">
                  <p className="text-xs text-gray-500 mb-2">Search Preview</p>
                  <p className="text-[#1a0dab] text-lg hover:underline cursor-pointer truncate">
                    {formData.metaTitle || formData.title || 'Page Title'}
                  </p>
                  <p className="text-green-700 text-sm truncate">
                    https://highrise.pk/blog/
                    {formData.title
                      ? formData.title.toLowerCase().replace(/\s+/g, '-').substring(0, 30)
                      : 'post-url'}
                  </p>
                  <p className="text-gray-600 text-sm mt-1 line-clamp-2">
                    {formData.metaDescription || formData.excerpt || 'Page description will appear here...'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar - Right Side */}
          <div className="space-y-6">
            {/* Featured Image */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                <ImageIcon className="w-4 h-4" />
                Featured Image <span className="text-red-500">*</span>
              </h3>

              {formData.image?.url ? (
                <div className="relative">
                  <img
                    src={formData.image.url}
                    alt="Featured"
                    className="w-full h-48 object-cover rounded-xl"
                  />
                  <button
                    onClick={handleRemoveImage}
                    className="absolute top-2 right-2 p-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      setMediaPickerFor('featured');
                      setShowMediaPicker(true);
                    }}
                    className="absolute bottom-2 right-2 px-3 py-1.5 bg-white/90 hover:bg-white text-gray-700 text-sm font-medium rounded-lg transition-colors"
                  >
                    Change
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setMediaPickerFor('featured');
                    setShowMediaPicker(true);
                  }}
                  className={`w-full h-48 border-2 border-dashed rounded-xl flex flex-col items-center justify-center transition-colors ${
                    errors.image
                      ? 'border-red-300 bg-red-50'
                      : 'border-gray-300 hover:border-[#029bba] hover:bg-[#029bba]/5'
                  }`}
                >
                  <Upload className={`w-8 h-8 mb-2 ${errors.image ? 'text-red-400' : 'text-gray-400'}`} />
                  <span className={`text-sm font-medium ${errors.image ? 'text-red-500' : 'text-gray-600'}`}>
                    Click to select image
                  </span>
                  <span className="text-xs text-gray-400 mt-1">
                    Recommended: 1200 x 630 px
                  </span>
                </button>
              )}
              {errors.image && (
                <p className="text-red-500 text-sm mt-2 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.image}
                </p>
              )}
            </div>

            {/* Category & Author */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category <span className="text-red-500">*</span>
                </label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className={`w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-[#029bba]/20 outline-none transition-all ${
                    errors.category
                      ? 'border-red-300 focus:border-red-500'
                      : 'border-gray-200 focus:border-[#029bba]'
                  }`}
                >
                  <option value="">Select category</option>
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
                {errors.category && (
                  <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors.category}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Author
                </label>
                <input
                  type="text"
                  name="author"
                  value={formData.author}
                  onChange={handleChange}
                  placeholder="Author name"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/20 outline-none transition-all"
                />
              </div>
            </div>

            {/* Tags */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <label className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <Tag className="w-4 h-4" />
                Tags
              </label>
              <div className="flex gap-2 mt-2">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyPress={handleTagKeyPress}
                  placeholder="Add tag..."
                  className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/20 outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={handleAddTag}
                  className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-colors"
                >
                  Add
                </button>
              </div>
              {formData.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {formData.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-[#029bba]/10 text-[#029bba] rounded-full text-sm"
                    >
                      #{tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="hover:text-red-500 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Publishing Options */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
              <h3 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Publishing
              </h3>

              <div>
                <label className="block text-sm text-gray-600 mb-2">Status</label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/20 outline-none transition-all"
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="scheduled">Scheduled</option>
                </select>
              </div>

              {formData.status === 'scheduled' && (
                <div>
                  <label className="block text-sm text-gray-600 mb-2">
                    Schedule Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    name="scheduledFor"
                    value={formData.scheduledFor}
                    onChange={handleChange}
                    className={`w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-[#029bba]/20 outline-none transition-all ${
                      errors.scheduledFor
                        ? 'border-red-300 focus:border-red-500'
                        : 'border-gray-200 focus:border-[#029bba]'
                    }`}
                  />
                  {errors.scheduledFor && (
                    <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {errors.scheduledFor}
                    </p>
                  )}
                </div>
              )}

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="featured"
                  checked={formData.featured}
                  onChange={handleChange}
                  className="w-5 h-5 rounded border-gray-300 text-[#029bba] focus:ring-[#029bba]"
                />
                <span className="flex items-center gap-2 text-sm text-gray-700">
                  <Star className="w-4 h-4 text-yellow-500" />
                  Featured Post
                </span>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Media Picker Modal - Dynamic based on purpose */}
      <MediaPickerModal
        isOpen={showMediaPicker}
        onClose={() => setShowMediaPicker(false)}
        onSelect={mediaPickerFor === 'featured' ? handleImageSelect : handleContentImageSelect}
        title={mediaPickerFor === 'featured' ? 'Select Featured Image' : 'Insert Image in Content'}
      />

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl max-w-md w-full p-6"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Delete Post?</h3>
                <p className="text-sm text-gray-500">
                  This will move the post to trash.
                </p>
              </div>
            </div>

            <div className="p-3 bg-gray-50 rounded-xl mb-6">
              <p className="text-sm text-gray-700 truncate">{formData.title}</p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {deleting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                Delete
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AdminLayout>
  );
}