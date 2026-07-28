import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import Youtube from '@tiptap/extension-youtube';
import CharacterCount from '@tiptap/extension-character-count';
import Highlight from '@tiptap/extension-highlight';
import { TextStyle } from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { Table } from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableHeader from '@tiptap/extension-table-header';
import TableCell from '@tiptap/extension-table-cell';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { common, createLowlight } from 'lowlight';

import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Code,
  List,
  ListOrdered,
  Quote,
  Undo,
  Redo,
  Link as LinkIcon,
  Image as ImageIcon,
  Youtube as YoutubeIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Heading1,
  Heading2,
  Heading3,
  Pilcrow,
  Minus,
  X,
  Highlighter,
  CheckSquare,
  Table as TableIcon,
  Palette,
  Subscript as SubscriptIcon,
  Superscript as SuperscriptIcon,
} from 'lucide-react';

import { useState, useCallback, useImperativeHandle, forwardRef } from 'react';

const lowlight = createLowlight(common);

interface TipTapEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  onImageUpload?: () => void;
}

export interface TipTapEditorRef {
  insertImage: (url: string, alt?: string) => void;
}

const HeadingWithId = StarterKit.configure({
  heading: {
    levels: [1, 2, 3],
    HTMLAttributes: {
      class: 'scroll-mt-28',
    },
  },
});

const TipTapEditor = forwardRef<TipTapEditorRef, TipTapEditorProps>(
  ({ content, onChange, placeholder = 'Start writing your blog post...', onImageUpload }, ref) => {
    const [showLinkModal, setShowLinkModal] = useState(false);
    const [showYoutubeModal, setShowYoutubeModal] = useState(false);
    const [showImageModal, setShowImageModal] = useState(false);
    const [showColorPalette, setShowColorPalette] = useState(false);

    const [linkUrl, setLinkUrl] = useState('');
    const [youtubeUrl, setYoutubeUrl] = useState('');
    const [imageUrl, setImageUrl] = useState('');
    const [imageAlt, setImageAlt] = useState('');

    const colorOptions = [
      '#111827',
      '#374151',
      '#6B7280',
      '#029bba',
      '#2563eb',
      '#059669',
      '#dc2626',
      '#d97706',
      '#7c3aed',
      '#db2777',
    ];

    const editor = useEditor({
      extensions: [
        HeadingWithId,
        Image.configure({
          HTMLAttributes: {
            class: 'rounded-xl max-w-full h-auto my-6 shadow-sm',
          },
        }),
        Link.configure({
          openOnClick: false,
          autolink: true,
          linkOnPaste: true,
          HTMLAttributes: {
            class: 'text-[#029bba] underline hover:text-[#027a94]',
            rel: 'noopener noreferrer nofollow',
            target: '_blank',
          },
        }),
        Placeholder.configure({
          placeholder,
        }),
        TextAlign.configure({
          types: ['heading', 'paragraph'],
        }),
        Underline,
        Youtube.configure({
          HTMLAttributes: {
            class: 'rounded-xl w-full aspect-video my-6 shadow-sm',
          },
        }),
        CharacterCount,
        Highlight.configure({ multicolor: true }),
        TextStyle,
        Color,
        Subscript,
        Superscript,
        TaskList,
        TaskItem.configure({
          nested: true,
        }),
        Table.configure({
          resizable: true,
          HTMLAttributes: {
            class: 'tiptap-table',
          },
        }),
        TableRow,
        TableHeader,
        TableCell,
        CodeBlockLowlight.configure({
          lowlight,
          HTMLAttributes: {
            class: 'rounded-xl overflow-x-auto',
          },
        }),
      ],
      content,
      onUpdate: ({ editor }) => {
        onChange(editor.getHTML());
      },
      editorProps: {
        attributes: {
          class:
            'prose prose-lg max-w-none focus:outline-none min-h-[500px] px-5 py-4',
        },
      },
      immediatelyRender: false,
    });

    useImperativeHandle(ref, () => ({
      insertImage: (url: string, alt?: string) => {
        if (editor && url) {
          editor.chain().focus().setImage({ src: url, alt: alt || '' }).run();
        }
      },
    }));

    const addLink = useCallback(() => {
      if (!editor) return;

      if (!linkUrl.trim()) {
        editor.chain().focus().extendMarkRange('link').unsetLink().run();
        setLinkUrl('');
        setShowLinkModal(false);
        return;
      }

      editor
        .chain()
        .focus()
        .extendMarkRange('link')
        .setLink({ href: linkUrl.trim() })
        .run();

      setLinkUrl('');
      setShowLinkModal(false);
    }, [editor, linkUrl]);

    const addYoutubeVideo = useCallback(() => {
      if (!youtubeUrl.trim() || !editor) return;

      editor.commands.setYoutubeVideo({
        src: youtubeUrl.trim(),
      });

      setYoutubeUrl('');
      setShowYoutubeModal(false);
    }, [editor, youtubeUrl]);

    const addImage = useCallback(() => {
      if (!imageUrl.trim() || !editor) return;

      editor
        .chain()
        .focus()
        .setImage({
          src: imageUrl.trim(),
          alt: imageAlt.trim(),
        })
        .run();

      setImageUrl('');
      setImageAlt('');
      setShowImageModal(false);
    }, [editor, imageUrl, imageAlt]);

    if (!editor) {
      return (
        <div className="border border-gray-200 rounded-xl p-4 min-h-[500px] flex items-center justify-center bg-white">
          <div className="animate-spin w-8 h-8 border-2 border-[#029bba] border-t-transparent rounded-full" />
        </div>
      );
    }

    const ToolbarButton = ({
      onClick,
      isActive = false,
      disabled = false,
      children,
      title,
    }: {
      onClick: () => void;
      isActive?: boolean;
      disabled?: boolean;
      children: React.ReactNode;
      title: string;
    }) => (
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        title={title}
        className={`p-2 rounded-lg transition-colors ${
          isActive
            ? 'bg-[#029bba] text-white'
            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        {children}
      </button>
    );

    const Divider = () => <div className="w-px h-6 bg-gray-200 mx-1" />;

    return (
      <div className="border border-gray-200 rounded-2xl overflow-hidden bg-white shadow-sm">
        {/* Toolbar */}
        <div className="border-b border-gray-200 p-3 flex flex-wrap items-center gap-1 bg-gray-50">
          {/* Undo / Redo */}
          <ToolbarButton
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            title="Undo"
          >
            <Undo className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            title="Redo"
          >
            <Redo className="w-4 h-4" />
          </ToolbarButton>

          <Divider />

          {/* Structure */}
          <ToolbarButton
            onClick={() => editor.chain().focus().setParagraph().run()}
            isActive={editor.isActive('paragraph')}
            title="Paragraph"
          >
            <Pilcrow className="w-4 h-4" />
          </ToolbarButton>
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

          <Divider />

          {/* Text styles */}
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBold().run()}
            isActive={editor.isActive('bold')}
            title="Bold"
          >
            <Bold className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            isActive={editor.isActive('italic')}
            title="Italic"
          >
            <Italic className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            isActive={editor.isActive('underline')}
            title="Underline"
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
            onClick={() => editor.chain().focus().toggleHighlight().run()}
            isActive={editor.isActive('highlight')}
            title="Highlight"
          >
            <Highlighter className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleSubscript().run()}
            isActive={editor.isActive('subscript')}
            title="Subscript"
          >
            <SubscriptIcon className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleSuperscript().run()}
            isActive={editor.isActive('superscript')}
            title="Superscript"
          >
            <SuperscriptIcon className="w-4 h-4" />
          </ToolbarButton>

          {/* Color picker */}
          <div className="relative">
            <ToolbarButton
              onClick={() => setShowColorPalette((prev) => !prev)}
              title="Text color"
            >
              <Palette className="w-4 h-4" />
            </ToolbarButton>

            {showColorPalette && (
              <div className="absolute z-20 top-12 left-0 bg-white border border-gray-200 rounded-xl shadow-xl p-3 w-48">
                <div className="grid grid-cols-5 gap-2">
                  {colorOptions.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => {
                        editor.chain().focus().setColor(color).run();
                        setShowColorPalette(false);
                      }}
                      className="w-7 h-7 rounded-full border border-gray-200"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    editor.chain().focus().unsetColor().run();
                    setShowColorPalette(false);
                  }}
                  className="mt-3 w-full px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg"
                >
                  Reset color
                </button>
              </div>
            )}
          </div>

          <Divider />

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
          <ToolbarButton
            onClick={() => editor.chain().focus().setTextAlign('justify').run()}
            isActive={editor.isActive({ textAlign: 'justify' })}
            title="Justify"
          >
            <AlignJustify className="w-4 h-4" />
          </ToolbarButton>

          <Divider />

          {/* Lists / blocks */}
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
            title="Ordered List"
          >
            <ListOrdered className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleTaskList().run()}
            isActive={editor.isActive('taskList')}
            title="Task List"
          >
            <CheckSquare className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            isActive={editor.isActive('blockquote')}
            title="Quote / Callout"
          >
            <Quote className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            isActive={editor.isActive('codeBlock')}
            title="Code Block"
          >
            <Code className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
            title="Horizontal Rule"
          >
            <Minus className="w-4 h-4" />
          </ToolbarButton>

          <Divider />

          {/* Table */}
          <ToolbarButton
            onClick={() =>
              editor
                .chain()
                .focus()
                .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
                .run()
            }
            title="Insert Table"
          >
            <TableIcon className="w-4 h-4" />
          </ToolbarButton>

          <Divider />

          {/* Links / media */}
          <ToolbarButton
            onClick={() => setShowLinkModal(true)}
            isActive={editor.isActive('link')}
            title="Add Link"
          >
            <LinkIcon className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => {
              if (onImageUpload) {
                onImageUpload();
              } else {
                setShowImageModal(true);
              }
            }}
            title="Add Image"
          >
            <ImageIcon className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => setShowYoutubeModal(true)}
            title="Embed YouTube"
          >
            <YoutubeIcon className="w-4 h-4" />
          </ToolbarButton>
        </div>

        {/* Content */}
        <EditorContent editor={editor} />

        {/* Footer Stats */}
        <div className="border-t border-gray-200 px-4 py-2 bg-gray-50 flex items-center justify-between text-sm text-gray-500">
          <span>{editor.storage.characterCount.words()} words</span>
          <span>{editor.storage.characterCount.characters()} characters</span>
        </div>

        {/* Link Modal */}
        {showLinkModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-md p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Add Link</h3>
                <button
                  onClick={() => setShowLinkModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <input
                type="url"
                placeholder="https://example.com"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/20 outline-none"
                autoFocus
              />

              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => setShowLinkModal(false)}
                  className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={addLink}
                  className="flex-1 px-4 py-2.5 bg-[#029bba] hover:bg-[#027a94] text-white rounded-xl font-medium"
                >
                  Add Link
                </button>
              </div>

              {editor.isActive('link') && (
                <button
                  onClick={() => {
                    editor.chain().focus().unsetLink().run();
                    setShowLinkModal(false);
                  }}
                  className="w-full mt-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-xl text-sm font-medium"
                >
                  Remove Link
                </button>
              )}
            </div>
          </div>
        )}

        {/* YouTube Modal */}
        {showYoutubeModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-md p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Add YouTube Video</h3>
                <button
                  onClick={() => setShowYoutubeModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <input
                type="url"
                placeholder="https://www.youtube.com/watch?v=..."
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/20 outline-none"
                autoFocus
              />

              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => setShowYoutubeModal(false)}
                  className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={addYoutubeVideo}
                  className="flex-1 px-4 py-2.5 bg-[#029bba] hover:bg-[#027a94] text-white rounded-xl font-medium"
                >
                  Embed Video
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Image Modal */}
        {showImageModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-md p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Add Image</h3>
                <button
                  onClick={() => setShowImageModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <input
                type="url"
                placeholder="https://example.com/image.jpg"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/20 outline-none mb-3"
                autoFocus
              />

              <input
                type="text"
                placeholder="Alt text (recommended for SEO)"
                value={imageAlt}
                onChange={(e) => setImageAlt(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/20 outline-none"
              />

              <p className="text-sm text-gray-500 mt-2">
                Add accessible alt text for better SEO and accessibility.
              </p>

              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => setShowImageModal(false)}
                  className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={addImage}
                  className="flex-1 px-4 py-2.5 bg-[#029bba] hover:bg-[#027a94] text-white rounded-xl font-medium"
                >
                  Add Image
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Global Styles */}
        <style jsx global>{`
          .ProseMirror {
            min-height: 500px;
            outline: none;
          }

          .ProseMirror p.is-editor-empty:first-child::before {
            color: #9ca3af;
            content: attr(data-placeholder);
            float: left;
            height: 0;
            pointer-events: none;
          }

          .ProseMirror h1 {
            font-size: 2.25rem;
            line-height: 1.2;
            font-weight: 800;
            margin-top: 1.25em;
            margin-bottom: 0.5em;
          }

          .ProseMirror h2 {
            font-size: 1.75rem;
            line-height: 1.3;
            font-weight: 700;
            margin-top: 1.2em;
            margin-bottom: 0.5em;
          }

          .ProseMirror h3 {
            font-size: 1.35rem;
            line-height: 1.35;
            font-weight: 700;
            margin-top: 1.1em;
            margin-bottom: 0.45em;
          }

          .ProseMirror p {
            margin: 0.9em 0;
            line-height: 1.8;
          }

          .ProseMirror ul,
          .ProseMirror ol {
            padding-left: 1.5em;
            margin: 1em 0;
          }

          .ProseMirror ul {
            list-style-type: disc;
          }

          .ProseMirror ol {
            list-style-type: decimal;
          }

          .ProseMirror blockquote {
            border-left: 4px solid #029bba;
            background: #f8fafc;
            padding: 1rem 1rem 1rem 1.25rem;
            margin: 1.25em 0;
            color: #4b5563;
            border-radius: 0.75rem;
          }

          .ProseMirror code {
            background-color: #f3f4f6;
            padding: 0.15em 0.4em;
            border-radius: 0.375rem;
            font-family: monospace;
          }

          .ProseMirror pre {
            background-color: #111827;
            color: #f9fafb;
            padding: 1rem;
            border-radius: 0.75rem;
            overflow-x: auto;
            margin: 1.25em 0;
          }

          .ProseMirror pre code {
            background: none;
            padding: 0;
            color: inherit;
          }

          .ProseMirror hr {
            border: none;
            border-top: 2px solid #e5e7eb;
            margin: 2em 0;
          }

          .ProseMirror img {
            max-width: 100%;
            height: auto;
            border-radius: 0.75rem;
            margin: 1.5em 0;
          }

          .ProseMirror a {
            color: #029bba;
            text-decoration: underline;
          }

          .ProseMirror a:hover {
            color: #027a94;
          }

          .ProseMirror iframe {
            width: 100%;
            aspect-ratio: 16 / 9;
            border-radius: 0.75rem;
            margin: 1.5em 0;
          }

          .ProseMirror .task-list {
            list-style: none;
            padding-left: 0.5rem;
          }

          .ProseMirror .task-list li {
            display: flex;
            align-items: flex-start;
            gap: 0.5rem;
            margin: 0.5rem 0;
          }

          .ProseMirror table {
            width: 100%;
            border-collapse: collapse;
            margin: 1.5em 0;
            overflow: hidden;
            border-radius: 0.75rem;
          }

          .ProseMirror table td,
          .ProseMirror table th {
            border: 1px solid #e5e7eb;
            padding: 0.75rem;
            vertical-align: top;
          }

          .ProseMirror table th {
            background: #f8fafc;
            font-weight: 700;
          }

          .ProseMirror mark {
            background: #fef08a;
            padding: 0.1em 0.2em;
            border-radius: 0.25rem;
          }
        `}</style>
      </div>
    );
  }
);

TipTapEditor.displayName = 'TipTapEditor';

export default TipTapEditor;
