'use client'

import React, { useEffect } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Strike from '@tiptap/extension-strike'
import Image from '@tiptap/extension-image'
import TextAlign from '@tiptap/extension-text-align'
import Table from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableCell from '@tiptap/extension-table-cell'
import TableHeader from '@tiptap/extension-table-header'
import Blockquote from '@tiptap/extension-blockquote'
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Code,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Heading1,
  Heading2,
  Heading3,
  Quote,
  Table as TableIcon,
} from 'lucide-react'

interface RichTextEditorProps {
  content: string
  onChange: (html: string) => void
}

export default function RichTextEditor({ content, onChange }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        bulletList: {
          keepMarks: true,
          keepAttributes: false,
          HTMLAttributes: { class: 'list-disc pl-6 my-2 text-slate-300' },
        },
        orderedList: {
          keepMarks: true,
          keepAttributes: false,
          HTMLAttributes: { class: 'list-decimal pl-6 my-2 text-slate-300' },
        },
        code: {
          HTMLAttributes: {
            class: 'bg-slate-950 text-emerald-400 rounded px-1.5 py-0.5 font-mono text-sm border border-slate-800',
          },
        },
        heading: {
          levels: [1, 2, 3],
          HTMLAttributes: { class: 'text-white font-bold my-4' },
        },
      }),
      Underline.configure({}),
      Strike.configure({}),
      Image.configure({
        inline: false,
        allowBase64: true,
        HTMLAttributes: { class: 'max-w-full h-auto rounded-lg border border-slate-800 my-4' },
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph', 'image', 'blockquote'],
        alignments: ['left', 'center', 'right'],
      }),
      Table.configure({
        resizable: true,
        HTMLAttributes: {
          class: 'border border-slate-800 w-full table-auto my-4 text-sm text-slate-300',
        },
      }),
      TableRow,
      TableHeader.configure({
        HTMLAttributes: { class: 'bg-slate-900 border border-slate-800 p-2 font-semibold text-slate-100 text-left' },
      }),
      TableCell.configure({
        HTMLAttributes: { class: 'border border-slate-800 p-2' },
      }),
      Blockquote.configure({
        HTMLAttributes: {
          class: 'border-l-4 border-blue-500 pl-4 italic text-slate-400 my-4 bg-slate-900/30 py-1 rounded-r-lg',
        },
      }),
    ],
    content: content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
    editorProps: {
      attributes: {
        class: 'focus:outline-none min-h-[300px] max-h-[500px] overflow-y-auto px-4 py-3 text-slate-300 prose prose-invert max-w-none',
      },
    },
  })

  // Sync content with props if editor is initialized and content changes externally
  useEffect(() => {
    if (editor && editor.getHTML() !== content) {
      editor.commands.setContent(content)
    }
  }, [content, editor])

  if (!editor) {
    return (
      <div className="w-full h-[350px] border border-slate-800 bg-slate-950/80 rounded-xl flex items-center justify-center text-slate-500 text-sm">
        Loading editor...
      </div>
    )
  }

  const CommandButton = ({
    onClick,
    isActive,
    title,
    children,
  }: {
    onClick: () => void
    isActive: boolean
    title: string
    children: React.ReactNode
  }) => (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`p-2 rounded-lg transition-all duration-150 flex items-center justify-center ${
        isActive
          ? 'bg-blue-600 text-white shadow-md shadow-blue-500/10'
          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
      }`}
    >
      {children}
    </button>
  )

  return (
    <div className="w-full border border-slate-800 bg-slate-900/30 rounded-xl overflow-hidden shadow-inner">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 p-2 border-b border-slate-800 bg-slate-900/60 backdrop-blur-sm">
        <CommandButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          isActive={editor.isActive('bold')}
          title="Bold"
        >
          <Bold className="w-4 h-4" />
        </CommandButton>

        <CommandButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          isActive={editor.isActive('italic')}
          title="Italic"
        >
          <Italic className="w-4 h-4" />
        </CommandButton>

        <CommandButton
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          isActive={editor.isActive('underline')}
          title="Underline"
        >
          <UnderlineIcon className="w-4 h-4" />
        </CommandButton>

        <CommandButton
          onClick={() => editor.chain().focus().toggleStrike().run()}
          isActive={editor.isActive('strike')}
          title="Strikethrough"
        >
          <Strikethrough className="w-4 h-4" />
        </CommandButton>

        <CommandButton
          onClick={() => editor.chain().focus().toggleCode().run()}
          isActive={editor.isActive('code')}
          title="Code"
        >
          <Code className="w-4 h-4" />
        </CommandButton>

        <div className="w-px h-6 bg-slate-850 mx-1" />

        <CommandButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          isActive={editor.isActive('heading', { level: 1 })}
          title="Heading 1"
        >
          <Heading1 className="w-4 h-4" />
        </CommandButton>

        <CommandButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          isActive={editor.isActive('heading', { level: 2 })}
          title="Heading 2"
        >
          <Heading2 className="w-4 h-4" />
        </CommandButton>

        <CommandButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          isActive={editor.isActive('heading', { level: 3 })}
          title="Heading 3"
        >
          <Heading3 className="w-4 h-4" />
        </CommandButton>

        <div className="w-px h-6 bg-slate-850 mx-1" />

        <CommandButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          isActive={editor.isActive('bulletList')}
          title="Bullet List"
        >
          <List className="w-4 h-4" />
        </CommandButton>

        <CommandButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          isActive={editor.isActive('orderedList')}
          title="Numbered List"
        >
          <ListOrdered className="w-4 h-4" />
        </CommandButton>

        <CommandButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          isActive={editor.isActive('blockquote')}
          title="Quote"
        >
          <Quote className="w-4 h-4" />
        </CommandButton>

        <div className="w-px h-6 bg-slate-850 mx-1" />

        <CommandButton
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
          isActive={editor.isActive({ textAlign: 'left' })}
          title="Align Left"
        >
          <AlignLeft className="w-4 h-4" />
        </CommandButton>

        <CommandButton
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
          isActive={editor.isActive({ textAlign: 'center' })}
          title="Align Center"
        >
          <AlignCenter className="w-4 h-4" />
        </CommandButton>

        <CommandButton
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
          isActive={editor.isActive({ textAlign: 'right' })}
          title="Align Right"
        >
          <AlignRight className="w-4 h-4" />
        </CommandButton>

        <div className="w-px h-6 bg-slate-850 mx-1" />

        <CommandButton
          onClick={() =>
            editor
              .chain()
              .focus()
              .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
              .run()
          }
          isActive={editor.isActive('table')}
          title="Insert Table"
        >
          <TableIcon className="w-4 h-4" />
        </CommandButton>
      </div>

      {/* Editor Content */}
      <EditorContent editor={editor} className="bg-slate-950/40" />
    </div>
  )
}
