// ========== FILE: components/admin/campaigns/RichTextEditor.tsx ==========
// 🎨 ENTERPRISE RICH TEXT EDITOR — HIGHRISE.PK
// TipTap-powered WYSIWYG editor for campaign content
// ═══════════════════════════════════════════════════════════════
// FEATURES:
//   ✅ Full formatting: Bold, Italic, Underline, Strike
//   ✅ Headings: H1, H2, H3
//   ✅ Lists: Bullet, Ordered
//   ✅ Links with URL validation
//   ✅ Image insertion via URL
//   ✅ Text alignment: Left, Center, Right
//   ✅ Text colors
//   ✅ Highlight
//   ✅ Blockquote
//   ✅ Horizontal rule
//   ✅ Undo / Redo
//   ✅ Placeholder text
//   ✅ Word & character count
//   ✅ Real-time onChange callback
//   ✅ Read-only mode support
// ═══════════════════════════════════════════════════════════════

'use client';

import React, { useCallback, useEffect, useImperativeHandle, forwardRef, useState } from 'react';
import { useEditor, EditorContent, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import { Color } from '@tiptap/extension-color';
import { TextStyle } from '@tiptap/extension-text-style';
import Highlight from '@tiptap/extension-highlight';
import {
  Bold,
  Italic,
  UnderlineIcon,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Link2,
  ImageIcon,
  Quote,
  Minus,
  Undo,
  Redo,
  Type,
  Highlighter,
  Code,
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════════
// 🎨 TYPES
// ═══════════════════════════════════════════════════════════════

// ✅ Handle exposed to parent via ref — for cursor-position insertion
export interface RichTextEditorHandle {
  /** Insert content at current TipTap cursor position */
  insertAtCursor: (content: string) => void;
  /** Focus the editor */
  focus: () => void;
}

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  readOnly?: boolean;
  minHeight?: string;
}

interface ToolbarButtonProps {
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}

// ═══════════════════════════════════════════════════════════════
// 🔧 TOOLBAR BUTTON COMPONENT
// ═══════════════════════════════════════════════════════════════

const ToolbarButton: React.FC<ToolbarButtonProps> = ({
  onClick,
  isActive = false,
  disabled = false,
  title,
  children,
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    title={title}
    className={`
      p-1.5 rounded-lg transition-all duration-150 
      ${isActive
        ? 'bg-[#029bba] text-white shadow-sm'
        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
      }
      ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
    `}
  >
    {children}
  </button>
);

// ═══════════════════════════════════════════════════════════════
// 🔧 TOOLBAR DIVIDER
// ═══════════════════════════════════════════════════════════════

const ToolbarDivider = () => (
  <div className="w-px h-5 bg-gray-200 mx-1 flex-shrink-0" />
);

// ═══════════════════════════════════════════════════════════════
// 🔧 LINK MODAL
// ═══════════════════════════════════════════════════════════════

const LinkModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (url: string) => void;
  initialUrl?: string;
}> = ({ isOpen, onClose, onConfirm, initialUrl = '' }) => {
  const [url, setUrl] = useState(initialUrl);

  useEffect(() => {
    if (isOpen) {
      setUrl(initialUrl);
      // Lock body scroll
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen, initialUrl]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    const trimmed = url.trim();
    if (!trimmed) return;
    // Auto-prepend https if missing
    const finalUrl = trimmed.startsWith('http') ? trimmed : `https://${trimmed}`;
    onConfirm(finalUrl);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6 z-10">
        <h3 className="text-lg font-bold text-[#004063] mb-4">
          Insert Link
        </h3>
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleConfirm()}
          placeholder="https://highrise.pk/property/..."
          autoFocus
          className="w-full px-4 py-2.5 rounded-xl border border-gray-300 
                     focus:ring-2 focus:ring-[#029bba]/20 focus:border-[#029bba] 
                     outline-none text-sm mb-4"
        />
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-300 
                       text-gray-700 font-medium hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="flex-1 px-4 py-2.5 rounded-xl bg-[#029bba] 
                       hover:bg-[#027a94] text-white font-medium transition-colors"
          >
            Insert Link
          </button>
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// 🔧 IMAGE MODAL
// ═══════════════════════════════════════════════════════════════

const ImageModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (url: string, alt: string) => void;
}> = ({ isOpen, onClose, onConfirm }) => {
  const [url, setUrl]   = useState('');
  const [alt, setAlt]   = useState('');

  useEffect(() => {
    if (isOpen) {
      setUrl('');
      setAlt('');
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    const trimmed = url.trim();
    if (!trimmed) return;
    onConfirm(trimmed, alt.trim() || 'Image');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6 z-10">
        <h3 className="text-lg font-bold text-[#004063] mb-4">
          Insert Image
        </h3>
        <div className="space-y-3 mb-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">
              Image URL <span className="text-red-500">*</span>
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://cdn.highrise.pk/image.jpg"
              autoFocus
              className="w-full px-4 py-2.5 rounded-xl border border-gray-300 
                         focus:ring-2 focus:ring-[#029bba]/20 focus:border-[#029bba] 
                         outline-none text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">
              Alt Text (for accessibility)
            </label>
            <input
              type="text"
              value={alt}
              onChange={(e) => setAlt(e.target.value)}
              placeholder="Beautiful property in DHA Phase 5"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-300 
                         focus:ring-2 focus:ring-[#029bba]/20 focus:border-[#029bba] 
                         outline-none text-sm"
            />
          </div>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-300 
                       text-gray-700 font-medium hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!url.trim()}
            className="flex-1 px-4 py-2.5 rounded-xl bg-[#029bba] 
                       hover:bg-[#027a94] text-white font-medium 
                       transition-colors disabled:opacity-50"
          >
            Insert Image
          </button>
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// 🔧 EDITOR TOOLBAR
// ═══════════════════════════════════════════════════════════════

const EditorToolbar: React.FC<{
  editor: Editor | null;
  onLinkClick: () => void;
  onImageClick: () => void;
}> = ({ editor, onLinkClick, onImageClick }) => {
  if (!editor) return null;

  return (
    <div className="flex flex-wrap items-center gap-0.5 p-2 border-b 
                    border-gray-200 bg-gray-50 rounded-t-xl">

      {/* Undo / Redo */}
      <ToolbarButton
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
        title="Undo (Ctrl+Z)"
      >
        <Undo className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
        title="Redo (Ctrl+Y)"
      >
        <Redo className="w-4 h-4" />
      </ToolbarButton>

      <ToolbarDivider />

      {/* Headings */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        isActive={editor.isActive('heading', { level: 1 })}
        title="Heading 1"
      >
        <Heading1 className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        isActive={editor.isActive('heading', { level: 2 })}
        title="Heading 2"
      >
        <Heading2 className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        isActive={editor.isActive('heading', { level: 3 })}
        title="Heading 3"
      >
        <Heading3 className="w-4 h-4" />
      </ToolbarButton>

      <ToolbarDivider />

      {/* Text formatting */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        isActive={editor.isActive('bold')}
        title="Bold (Ctrl+B)"
      >
        <Bold className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        isActive={editor.isActive('italic')}
        title="Italic (Ctrl+I)"
      >
        <Italic className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        isActive={editor.isActive('underline')}
        title="Underline (Ctrl+U)"
      >
        <UnderlineIcon className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleStrike().run()}
        isActive={editor.isActive('strike')}
        title="Strikethrough"
      >
        <Strikethrough className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleCode().run()}
        isActive={editor.isActive('code')}
        title="Inline Code"
      >
        <Code className="w-4 h-4" />
      </ToolbarButton>

      <ToolbarDivider />

      {/* Text color */}
      <div className="relative flex items-center" title="Text Color">
        <Type className="w-4 h-4 text-gray-600 mx-1" />
        <input
          type="color"
          className="w-5 h-5 rounded cursor-pointer border-0 bg-transparent p-0"
          title="Text Color"
          onChange={(e) =>
            editor.chain().focus().setColor(e.target.value).run()
          }
          defaultValue="#000000"
        />
      </div>

      {/* Highlight */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHighlight().run()}
        isActive={editor.isActive('highlight')}
        title="Highlight"
      >
        <Highlighter className="w-4 h-4" />
      </ToolbarButton>

      <ToolbarDivider />

      {/* Alignment */}
      <ToolbarButton
        onClick={() => editor.chain().focus().setTextAlign('left').run()}
        isActive={editor.isActive({ textAlign: 'left' })}
        title="Align Left"
      >
        <AlignLeft className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().setTextAlign('center').run()}
        isActive={editor.isActive({ textAlign: 'center' })}
        title="Align Center"
      >
        <AlignCenter className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().setTextAlign('right').run()}
        isActive={editor.isActive({ textAlign: 'right' })}
        title="Align Right"
      >
        <AlignRight className="w-4 h-4" />
      </ToolbarButton>

      <ToolbarDivider />

      {/* Lists */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        isActive={editor.isActive('bulletList')}
        title="Bullet List"
      >
        <List className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        isActive={editor.isActive('orderedList')}
        title="Numbered List"
      >
        <ListOrdered className="w-4 h-4" />
      </ToolbarButton>

      <ToolbarDivider />

      {/* Block elements */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        isActive={editor.isActive('blockquote')}
        title="Blockquote"
      >
        <Quote className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
        title="Horizontal Rule"
      >
        <Minus className="w-4 h-4" />
      </ToolbarButton>

      <ToolbarDivider />

      {/* Link & Image */}
      <ToolbarButton
        onClick={onLinkClick}
        isActive={editor.isActive('link')}
        title="Insert Link"
      >
        <Link2 className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={onImageClick}
        title="Insert Image"
      >
        <ImageIcon className="w-4 h-4" />
      </ToolbarButton>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// 🚀 MAIN EDITOR COMPONENT
// ═══════════════════════════════════════════════════════════════

const RichTextEditor = forwardRef<RichTextEditorHandle, RichTextEditorProps>(({
  content,
  onChange,
  placeholder = 'Start writing your campaign content here...',
  readOnly = false,
  minHeight = '400px',
}, ref) => {
  const [linkModalOpen,  setLinkModalOpen]  = useState(false);
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [wordCount,      setWordCount]      = useState(0);
  const [charCount,      setCharCount]      = useState(0);

  // ─────────────────────────────────────────────
  // Initialize TipTap editor
  // ─────────────────────────────────────────────
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Underline,
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Link.configure({
        openOnClick:       false,
        HTMLAttributes: {
          target: '_blank',
          rel:    'noopener noreferrer',
          class:  'text-[#029bba] underline hover:text-[#027a94]',
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'max-w-full h-auto rounded-xl my-4',
        },
      }),
      Placeholder.configure({
        placeholder,
        emptyEditorClass: 'is-editor-empty',
      }),
    ],
    content,
    immediatelyRender: false,   // 🔒 SSR safety for Next.js Pages Router
    editable: !readOnly,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onChange(html);

      // Update word & char counts
      const text = editor.getText();
      const words = text.trim() ? text.trim().split(/\s+/).length : 0;
      setWordCount(words);
      setCharCount(text.length);
    },
    editorProps: {
      attributes: {
        class: `prose prose-sm max-w-none focus:outline-none px-6 py-4`,
        style: `min-height: ${minHeight}`,
      },
    },
  });

  // ─────────────────────────────────────────────
  // ✅ Expose editor methods to parent via ref
  // Parent (MissionControl) calls insertAtCursor(tag)
  // to insert merge tags at the actual cursor position
  // ─────────────────────────────────────────────
  useImperativeHandle(ref, () => ({
    insertAtCursor: (content: string) => {
      if (!editor) return;
      // insertContent inserts at current cursor position in TipTap
      // If no selection, inserts at end of document
      editor.chain().focus().insertContent(content).run();
    },
    focus: () => {
      editor?.commands.focus();
    },
  }), [editor]);

  // ─────────────────────────────────────────────
  // ✅ Expose editor methods to parent via ref
  // Parent (MissionControl) calls insertAtCursor(tag)
  // to insert merge tags at the actual cursor position
  // ─────────────────────────────────────────────
  useImperativeHandle(ref, () => ({
    insertAtCursor: (content: string) => {
      if (!editor) return;
      // insertContent inserts at current cursor position in TipTap
      // If no selection, inserts at end of document
      editor.chain().focus().insertContent(content).run();
    },
    focus: () => {
      editor?.commands.focus();
    },
  }), [editor]);

  // ─────────────────────────────────────────────
  // Sync external content changes
  // (e.g. template pre-fill from TemplateGallery)
  // ─────────────────────────────────────────────
  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    if (content !== current) {
      editor.commands.setContent(content, { emitUpdate: false });
    }
  }, [content, editor]);

  // ─────────────────────────────────────────────
  // Link handlers
  // ─────────────────────────────────────────────
  const handleLinkConfirm = useCallback((url: string) => {
    if (!editor) return;
    if (editor.state.selection.empty) {
      // No text selected — insert URL as text
      editor
        .chain()
        .focus()
        .insertContent(`<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`)
        .run();
    } else {
      editor.chain().focus().setLink({ href: url }).run();
    }
  }, [editor]);

  const handleLinkClick = useCallback(() => {
    if (!editor) return;
    setLinkModalOpen(true);
  }, [editor]);

  // ─────────────────────────────────────────────
  // Image handlers
  // ─────────────────────────────────────────────
  const handleImageConfirm = useCallback((url: string, alt: string) => {
    if (!editor) return;
    editor.chain().focus().setImage({ src: url, alt }).run();
  }, [editor]);

  // ─────────────────────────────────────────────
  // Cleanup on unmount
  // ─────────────────────────────────────────────
  useEffect(() => {
    return () => {
      editor?.destroy();
    };
  }, [editor]);

  return (
    <>
      {/* Editor Container */}
      <div className="border border-gray-200 rounded-xl overflow-hidden 
                      focus-within:ring-2 focus-within:ring-[#029bba]/20 
                      focus-within:border-[#029bba] transition-all bg-white">

        {/* Toolbar */}
        {!readOnly && (
          <EditorToolbar
            editor={editor}
            onLinkClick={handleLinkClick}
            onImageClick={() => setImageModalOpen(true)}
          />
        )}

        {/* Editor Content */}
        <EditorContent
          editor={editor}
          className="bg-white"
        />

        {/* Footer: word/char count */}
        {!readOnly && (
          <div className="flex items-center justify-between px-4 py-2 
                          border-t border-gray-100 bg-gray-50 rounded-b-xl">
            <div className="flex items-center gap-4">
              <span className="text-xs text-gray-400">
                <span className="font-semibold text-gray-600">{wordCount}</span> words
              </span>
              <span className="text-xs text-gray-400">
                <span className="font-semibold text-gray-600">{charCount}</span> characters
              </span>
            </div>
            <span className="text-xs text-gray-400">
              Ctrl+B Bold · Ctrl+I Italic · Ctrl+Z Undo
            </span>
          </div>
        )}
      </div>

      {/* Tiptap placeholder styles */}
      <style>{`
        .is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: #9ca3af;
          pointer-events: none;
          height: 0;
        }
        .ProseMirror {
          min-height: ${minHeight};
        }
        .ProseMirror h1 { font-size: 1.75rem; font-weight: 800; color: #004063; margin-bottom: 0.5rem; }
        .ProseMirror h2 { font-size: 1.375rem; font-weight: 700; color: #004063; margin-bottom: 0.5rem; }
        .ProseMirror h3 { font-size: 1.125rem; font-weight: 700; color: #004063; margin-bottom: 0.5rem; }
        .ProseMirror p  { margin-bottom: 0.75rem; line-height: 1.7; color: #374151; }
        .ProseMirror ul { list-style-type: disc;    padding-left: 1.5rem; margin-bottom: 0.75rem; }
        .ProseMirror ol { list-style-type: decimal; padding-left: 1.5rem; margin-bottom: 0.75rem; }
        .ProseMirror li { margin-bottom: 0.25rem; }
        .ProseMirror blockquote {
          border-left: 4px solid #029bba;
          padding-left: 1rem;
          color: #6b7280;
          font-style: italic;
          margin: 1rem 0;
        }
        .ProseMirror hr { border-color: #e5e7eb; margin: 1.5rem 0; }
        .ProseMirror code {
          background: #f3f4f6;
          padding: 0.125rem 0.375rem;
          border-radius: 0.375rem;
          font-size: 0.875em;
          color: #029bba;
        }
        .ProseMirror a {
          color: #029bba;
          text-decoration: underline;
        }
        .ProseMirror img {
          max-width: 100%;
          height: auto;
          border-radius: 0.75rem;
          margin: 1rem 0;
        }
      `}</style>

      {/* Modals */}
      <LinkModal
        isOpen={linkModalOpen}
        onClose={() => setLinkModalOpen(false)}
        onConfirm={handleLinkConfirm}
        initialUrl={editor?.getAttributes('link').href || ''}
      />
      <ImageModal
        isOpen={imageModalOpen}
        onClose={() => setImageModalOpen(false)}
        onConfirm={handleImageConfirm}
      />
    </>
  );
});

RichTextEditor.displayName = 'RichTextEditor';

export default RichTextEditor;
// ========== END OF FILE ==========