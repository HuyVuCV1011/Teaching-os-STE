'use client'

import React, { useEffect, useState, useRef } from 'react'
import { useEditor, EditorContent, BubbleMenu, FloatingMenu } from '@tiptap/react'
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
  Heading1,
  Heading2,
  Heading3,
  Quote,
  Table as TableIcon,
  Sparkles,
  Loader2,
  Plus,
} from 'lucide-react'
import toast from 'react-hot-toast'

interface NovelRichTextEditorProps {
  content: string
  onChange: (html: string) => void
  modelChoice?: string
}

export default function NovelRichTextEditor({
  content,
  onChange,
  modelChoice = 'gemini-2.0-flash',
}: NovelRichTextEditorProps) {
  const [isAiLoading, setIsAiLoading] = useState(false)
  const [isSlashMenuOpen, setIsSlashMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const editor = useEditor({
    immediatelyRender: false,
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
        strike: false,
        blockquote: false,
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
        class: 'focus:outline-none min-h-[350px] max-h-[600px] overflow-y-auto px-6 py-4 text-slate-300 prose prose-invert max-w-none',
      },
      handleKeyDown: (view, event) => {
        // Handle custom keyboard shortcuts
        // Trigger autocomplete with Ctrl + Space
        if (event.ctrlKey && event.code === 'Space') {
          event.preventDefault()
          triggerAiAutocomplete()
          return true
        }

        // Close slash menu on Escape
        if (event.key === 'Escape') {
          setIsSlashMenuOpen(false)
        }

        return false
      },
    },
  })

  // Sync content with props if editor is initialized and content changes externally
  useEffect(() => {
    if (editor && editor.getHTML() !== content) {
      editor.commands.setContent(content)
    }
  }, [content, editor])

  // Click outside listener to close slash dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsSlashMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  if (!editor) {
    return (
      <div className="w-full h-[350px] border border-slate-800 bg-slate-950/80 rounded-xl flex items-center justify-center text-slate-500 text-sm">
        Loading Notion-style editor...
      </div>
    )
  }

  // Trigger autocomplete
  const triggerAiAutocomplete = async () => {
    if (!editor || isAiLoading) return

    const { selection } = editor.state
    const textBefore = editor.state.doc.textBetween(0, selection.from)
    const textAfter = editor.state.doc.textBetween(selection.from, editor.state.doc.content.size)

    if (!textBefore.trim()) {
      toast.error('Please type some text first to let AI know the context.')
      return
    }

    setIsAiLoading(true)
    const toastId = toast.loading('AI is writing continuation...')

    try {
      const apiBaseUrl = process.env.NEXT_PUBLIC_RUBICORE_API_URL || 'http://localhost:8080'
      const response = await fetch(`${apiBaseUrl}/pilot/autocomplete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model_choice: modelChoice,
          text_before: textBefore,
          text_after: textAfter || null,
        }),
      })

      if (!response.ok) {
        throw new Error('Autocomplete server returned an error')
      }

      const data = await response.json()
      const completion = data.completion

      if (completion) {
        editor.chain().focus().insertContent(completion).run()
        toast.success('AI completion inserted!', { id: toastId })
      } else {
        toast.error('AI generated empty response.', { id: toastId })
      }
    } catch (err) {
      console.error('AI Autocomplete failed:', err)
      const message = err instanceof Error ? err.message : 'Please try again.'
      toast.error(`AI writing failed: ${message}`, { id: toastId })
    } finally {
      setIsAiLoading(false)
    }
  }

  const runCommand = (command: () => void) => {
    command()
    setIsSlashMenuOpen(false)
  }

  return (
    <div className="relative w-full border border-slate-800 bg-slate-950/20 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-md">
      {/* Floating command/status info bar */}
      <div className="absolute top-3 right-4 flex items-center gap-2 z-10">
        <button
          type="button"
          onClick={triggerAiAutocomplete}
          disabled={isAiLoading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/25 transition-all duration-200"
          title="Or press Ctrl + Space"
        >
          {isAiLoading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Sparkles className="w-3.5 h-3.5" />
          )}
          {isAiLoading ? 'Writing...' : 'Ask AI to write'}
        </button>
      </div>

      {/* Tiptap Bubble Menu */}
      {editor && (
        <BubbleMenu
          editor={editor}
          tippyOptions={{ duration: 100 }}
          className="flex items-center gap-0.5 p-1 rounded-lg border border-slate-800 bg-slate-950/90 shadow-lg backdrop-blur-md z-30"
        >
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={`p-1.5 rounded text-xs transition-colors ${
              editor.isActive('bold') ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Bold className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`p-1.5 rounded text-xs transition-colors ${
              editor.isActive('italic') ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Italic className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            className={`p-1.5 rounded text-xs transition-colors ${
              editor.isActive('underline') ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <UnderlineIcon className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleStrike().run()}
            className={`p-1.5 rounded text-xs transition-colors ${
              editor.isActive('strike') ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Strikethrough className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleCode().run()}
            className={`p-1.5 rounded text-xs transition-colors ${
              editor.isActive('code') ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Code className="w-3.5 h-3.5" />
          </button>
        </BubbleMenu>
      )}

      {/* Tiptap Floating Menu (Notion-style + button) */}
      {editor && (
        <FloatingMenu
          editor={editor}
          tippyOptions={{ duration: 100 }}
          className="flex items-center z-20"
        >
          <div ref={menuRef} className="relative">
            <button
              type="button"
              onClick={() => setIsSlashMenuOpen(!isSlashMenuOpen)}
              className="p-1.5 rounded-full bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 shadow-md transition-all duration-200"
              title="Add blocks or Ask AI"
            >
              <Plus className="w-4 h-4" />
            </button>

            {isSlashMenuOpen && (
              <div className="absolute left-0 bottom-8 md:bottom-auto md:top-8 w-60 max-h-80 overflow-y-auto rounded-xl border border-slate-800 bg-slate-950/95 shadow-xl backdrop-blur-md p-1.5 flex flex-col gap-0.5 z-40 animate-in fade-in slide-in-from-bottom-2 duration-150">
                <div className="px-2.5 py-1.5 text-[10px] font-semibold text-slate-500 tracking-wider uppercase">
                  AI Features
                </div>
                <button
                  type="button"
                  onClick={() => runCommand(triggerAiAutocomplete)}
                  className="flex items-center gap-2.5 px-2.5 py-2 text-left text-xs font-medium rounded-lg text-indigo-300 hover:bg-indigo-500/10 transition-colors w-full"
                >
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                  <span>Ask AI to continue writing</span>
                </button>

                <div className="h-px bg-slate-900 my-1" />

                <div className="px-2.5 py-1.5 text-[10px] font-semibold text-slate-500 tracking-wider uppercase">
                  Basic Blocks
                </div>
                <button
                  type="button"
                  onClick={() => runCommand(() => editor.chain().focus().toggleHeading({ level: 1 }).run())}
                  className="flex items-center gap-2.5 px-2.5 py-2 text-left text-xs rounded-lg text-slate-300 hover:bg-slate-900 transition-colors w-full"
                >
                  <Heading1 className="w-4 h-4 text-slate-500" />
                  <span>Heading 1</span>
                </button>
                <button
                  type="button"
                  onClick={() => runCommand(() => editor.chain().focus().toggleHeading({ level: 2 }).run())}
                  className="flex items-center gap-2.5 px-2.5 py-2 text-left text-xs rounded-lg text-slate-300 hover:bg-slate-900 transition-colors w-full"
                >
                  <Heading2 className="w-4 h-4 text-slate-500" />
                  <span>Heading 2</span>
                </button>
                <button
                  type="button"
                  onClick={() => runCommand(() => editor.chain().focus().toggleHeading({ level: 3 }).run())}
                  className="flex items-center gap-2.5 px-2.5 py-2 text-left text-xs rounded-lg text-slate-300 hover:bg-slate-900 transition-colors w-full"
                >
                  <Heading3 className="w-4 h-4 text-slate-500" />
                  <span>Heading 3</span>
                </button>
                <button
                  type="button"
                  onClick={() => runCommand(() => editor.chain().focus().toggleBulletList().run())}
                  className="flex items-center gap-2.5 px-2.5 py-2 text-left text-xs rounded-lg text-slate-300 hover:bg-slate-900 transition-colors w-full"
                >
                  <List className="w-4 h-4 text-slate-500" />
                  <span>Bullet List</span>
                </button>
                <button
                  type="button"
                  onClick={() => runCommand(() => editor.chain().focus().toggleOrderedList().run())}
                  className="flex items-center gap-2.5 px-2.5 py-2 text-left text-xs rounded-lg text-slate-300 hover:bg-slate-900 transition-colors w-full"
                >
                  <ListOrdered className="w-4 h-4 text-slate-500" />
                  <span>Numbered List</span>
                </button>
                <button
                  type="button"
                  onClick={() => runCommand(() => editor.chain().focus().toggleBlockquote().run())}
                  className="flex items-center gap-2.5 px-2.5 py-2 text-left text-xs rounded-lg text-slate-300 hover:bg-slate-900 transition-colors w-full"
                >
                  <Quote className="w-4 h-4 text-slate-500" />
                  <span>Blockquote</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    runCommand(() =>
                      editor
                        .chain()
                        .focus()
                        .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
                        .run()
                    )
                  }
                  className="flex items-center gap-2.5 px-2.5 py-2 text-left text-xs rounded-lg text-slate-300 hover:bg-slate-900 transition-colors w-full"
                >
                  <TableIcon className="w-4 h-4 text-slate-500" />
                  <span>Insert Table</span>
                </button>
              </div>
            )}
          </div>
        </FloatingMenu>
      )}

      {/* Editor Canvas */}
      <div className="border-t border-slate-900 bg-slate-950/40">
        <EditorContent editor={editor} />
      </div>

      {/* Footer Info */}
      <div className="flex justify-between items-center px-6 py-2 bg-slate-950 border-t border-slate-900 text-[10px] text-slate-600 font-mono">
        <span>PRESS <kbd className="bg-slate-900 px-1 py-0.5 rounded border border-slate-800 text-slate-400">Ctrl + Space</kbd> FOR AI</span>
        <span>Notion-style editor v1.0</span>
      </div>
    </div>
  )
}
