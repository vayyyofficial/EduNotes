import React, { useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  BookMarked,
  Eye,
  Heading2,
  Heading3,
  Lightbulb,
  List,
  ListOrdered,
  Pencil,
  Plus,
  Quote,
  StickyNote,
  Table as TableIcon,
  Trash2,
  Type,
} from 'lucide-react';
import { ContentBlock, ContentBlockType } from '../types/textbook';
import { generateBlockId } from '../lib/format';
import { RichContentRenderer } from './RichContentRenderer';

interface StructuredEditorProps {
  blocks: ContentBlock[];
  onChange: (blocks: ContentBlock[]) => void;
}

const BLOCK_LABELS: Record<ContentBlockType, string> = {
  heading: 'Judul Bagian',
  subheading: 'Subjudul',
  paragraph: 'Paragraf',
  bullet_list: 'Daftar Poin',
  numbered_list: 'Daftar Bernomor',
  table: 'Tabel',
  quote: 'Kutipan',
  note: 'Catatan Penting',
  takeaway: 'Poin Kesimpulan',
  definition: 'Istilah Penting',
};

export function StructuredEditor({ blocks, onChange }: StructuredEditorProps) {
  const [previewMode, setPreviewMode] = useState(false);

  const addBlock = (type: ContentBlockType) => {
    let newBlock: ContentBlock;
    switch (type) {
      case 'bullet_list':
      case 'numbered_list':
        newBlock = { id: generateBlockId(), type, items: [''] };
        break;
      case 'takeaway':
        newBlock = { id: generateBlockId(), type, title: 'Poin Kesimpulan', items: [''] };
        break;
      case 'note':
        newBlock = { id: generateBlockId(), type, title: 'Catatan Penting', text: '' };
        break;
      case 'quote':
        newBlock = { id: generateBlockId(), type, text: '', author: '' };
        break;
      case 'definition':
        newBlock = { id: generateBlockId(), type, term: '', text: '' };
        break;
      case 'table':
        newBlock = {
          id: generateBlockId(),
          type,
          headers: ['Kolom 1', 'Kolom 2'],
          rows: [['', '']],
        };
        break;
      default:
        newBlock = { id: generateBlockId(), type, text: '' };
    }
    onChange([...blocks, newBlock]);
    setPreviewMode(false);
  };

  const updateBlock = (id: string, patch: Partial<ContentBlock>) => {
    onChange(blocks.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  };

  const removeBlock = (id: string) => {
    onChange(blocks.filter((b) => b.id !== id));
  };

  const moveBlock = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= blocks.length) return;
    const next = [...blocks];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  return (
    <div className="rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex flex-wrap items-center gap-1.5">
          <ToolbarBtn icon={<Heading2 className="h-3.5 w-3.5" />} label="Judul" onClick={() => addBlock('heading')} />
          <ToolbarBtn icon={<Heading3 className="h-3.5 w-3.5" />} label="Subjudul" onClick={() => addBlock('subheading')} />
          <ToolbarBtn icon={<Type className="h-3.5 w-3.5" />} label="Paragraf" onClick={() => addBlock('paragraph')} />
          <ToolbarBtn icon={<List className="h-3.5 w-3.5" />} label="Poin" onClick={() => addBlock('bullet_list')} />
          <ToolbarBtn icon={<ListOrdered className="h-3.5 w-3.5" />} label="Nomor" onClick={() => addBlock('numbered_list')} />
          <ToolbarBtn icon={<TableIcon className="h-3.5 w-3.5" />} label="Tabel" onClick={() => addBlock('table')} />
          <ToolbarBtn icon={<Quote className="h-3.5 w-3.5" />} label="Kutipan" onClick={() => addBlock('quote')} />
          <ToolbarBtn icon={<StickyNote className="h-3.5 w-3.5" />} label="Catatan" onClick={() => addBlock('note')} />
          <ToolbarBtn icon={<Lightbulb className="h-3.5 w-3.5" />} label="Kesimpulan" onClick={() => addBlock('takeaway')} />
          <ToolbarBtn icon={<BookMarked className="h-3.5 w-3.5" />} label="Istilah" onClick={() => addBlock('definition')} />
        </div>

        <button
          type="button"
          onClick={() => setPreviewMode((prev) => !prev)}
          className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
            previewMode
              ? 'bg-yellow-400 text-neutral-950'
              : 'border border-neutral-300 bg-white text-neutral-800 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-200 dark:hover:bg-neutral-800'
          }`}
        >
          {previewMode ? (
            <>
              <Pencil className="h-3.5 w-3.5" />
              Editor
            </>
          ) : (
            <>
              <Eye className="h-3.5 w-3.5" />
              Pratinjau
            </>
          )}
        </button>
      </div>

      <div className="p-4 sm:p-5">
        {previewMode ? (
          <div className="mx-auto max-w-3xl py-2">
            <RichContentRenderer blocks={blocks} />
          </div>
        ) : blocks.length === 0 ? (
          <div className="py-8 text-center text-sm text-neutral-500 dark:text-neutral-400">
            Klik tombol di toolbar atas untuk menambahkan blok materi.
          </div>
        ) : (
          <div className="space-y-4">
            {blocks.map((block, index) => (
              <div
                key={block.id}
                className="rounded-lg border border-neutral-200 bg-neutral-50/50 p-4 dark:border-neutral-800 dark:bg-neutral-900/40"
              >
                <div className="mb-3 flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-neutral-600 dark:text-neutral-400">
                    {index + 1}. {BLOCK_LABELS[block.type]}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => moveBlock(index, -1)}
                      disabled={index === 0}
                      className="rounded p-1 text-neutral-500 hover:bg-neutral-200 disabled:opacity-30 dark:hover:bg-neutral-800"
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveBlock(index, 1)}
                      disabled={index === blocks.length - 1}
                      className="rounded p-1 text-neutral-500 hover:bg-neutral-200 disabled:opacity-30 dark:hover:bg-neutral-800"
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeBlock(block.id)}
                      className="rounded p-1 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {(block.type === 'heading' || block.type === 'subheading') && (
                  <input
                    type="text"
                    value={block.text || ''}
                    onChange={(e) => updateBlock(block.id, { text: e.target.value })}
                    placeholder={block.type === 'heading' ? 'Judul bagian...' : 'Subjudul...'}
                    className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm font-semibold text-neutral-950 focus:border-yellow-400 focus:outline-none dark:border-neutral-700 dark:bg-neutral-950 dark:text-white"
                  />
                )}

                {block.type === 'paragraph' && (
                  <textarea
                    rows={3}
                    value={block.text || ''}
                    onChange={(e) => updateBlock(block.id, { text: e.target.value })}
                    placeholder="Isi paragraf (gunakan **tebal** dan *miring*)..."
                    className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-yellow-400 focus:outline-none dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100"
                  />
                )}

                {block.type === 'quote' && (
                  <div className="space-y-2">
                    <textarea
                      rows={2}
                      value={block.text || ''}
                      onChange={(e) => updateBlock(block.id, { text: e.target.value })}
                      placeholder="Isi kutipan..."
                      className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm italic text-neutral-900 focus:border-yellow-400 focus:outline-none dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100"
                    />
                    <input
                      type="text"
                      value={block.author || ''}
                      onChange={(e) => updateBlock(block.id, { author: e.target.value })}
                      placeholder="Tokoh / sumber kutipan (opsional)"
                      className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs text-neutral-900 focus:border-yellow-400 focus:outline-none dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100"
                    />
                  </div>
                )}

                {block.type === 'note' && (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={block.title || ''}
                      onChange={(e) => updateBlock(block.id, { title: e.target.value })}
                      placeholder="Judul catatan"
                      className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm font-semibold text-neutral-950 focus:border-yellow-400 focus:outline-none dark:border-neutral-700 dark:bg-neutral-950 dark:text-white"
                    />
                    <textarea
                      rows={2}
                      value={block.text || ''}
                      onChange={(e) => updateBlock(block.id, { text: e.target.value })}
                      placeholder="Isi catatan penting..."
                      className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-yellow-400 focus:outline-none dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100"
                    />
                  </div>
                )}

                {block.type === 'definition' && (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={block.term || ''}
                      onChange={(e) => updateBlock(block.id, { term: e.target.value })}
                      placeholder="Nama istilah"
                      className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm font-semibold text-neutral-950 focus:border-yellow-400 focus:outline-none dark:border-neutral-700 dark:bg-neutral-950 dark:text-white"
                    />
                    <textarea
                      rows={2}
                      value={block.text || ''}
                      onChange={(e) => updateBlock(block.id, { text: e.target.value })}
                      placeholder="Penjelasan istilah..."
                      className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-yellow-400 focus:outline-none dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100"
                    />
                  </div>
                )}

                {(block.type === 'bullet_list' ||
                  block.type === 'numbered_list' ||
                  block.type === 'takeaway') && (
                  <div className="space-y-2">
                    {block.type === 'takeaway' && (
                      <input
                        type="text"
                        value={block.title || ''}
                        onChange={(e) => updateBlock(block.id, { title: e.target.value })}
                        placeholder="Judul kesimpulan"
                        className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm font-semibold text-neutral-950 focus:border-yellow-400 focus:outline-none dark:border-neutral-700 dark:bg-neutral-950 dark:text-white"
                      />
                    )}
                    {(block.items || []).map((item, iIdx) => (
                      <div key={iIdx} className="flex items-center gap-2">
                        <span className="w-5 text-xs text-neutral-500 tabular-nums">
                          {block.type === 'numbered_list' ? `${iIdx + 1}.` : '•'}
                        </span>
                        <input
                          type="text"
                          value={item}
                          onChange={(e) => {
                            const nextItems = [...(block.items || [])];
                            nextItems[iIdx] = e.target.value;
                            updateBlock(block.id, { items: nextItems });
                          }}
                          placeholder="Tulis poin..."
                          className="flex-1 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-sm text-neutral-900 focus:border-yellow-400 focus:outline-none dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const nextItems = (block.items || []).filter((_, idx) => idx !== iIdx);
                            updateBlock(block.id, { items: nextItems.length ? nextItems : [''] });
                          }}
                          className="rounded p-1.5 text-neutral-400 hover:text-red-600"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() =>
                        updateBlock(block.id, { items: [...(block.items || []), ''] })
                      }
                      className="inline-flex items-center gap-1 text-xs font-semibold text-neutral-700 hover:text-neutral-950 dark:text-neutral-300 dark:hover:text-white"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Tambah Poin
                    </button>
                  </div>
                )}

                {block.type === 'table' && (
                  <div className="space-y-2">
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse text-sm">
                        <thead>
                          <tr>
                            {(block.headers || []).map((header, cIdx) => (
                              <th key={cIdx} className="p-1">
                                <input
                                  type="text"
                                  value={header}
                                  onChange={(e) => {
                                    const nextHeaders = [...(block.headers || [])];
                                    nextHeaders[cIdx] = e.target.value;
                                    updateBlock(block.id, { headers: nextHeaders });
                                  }}
                                  className="w-full rounded border border-neutral-300 bg-neutral-100 px-2 py-1 text-xs font-semibold text-neutral-950 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
                                />
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {(block.rows || []).map((row, rIdx) => (
                            <tr key={rIdx}>
                              {row.map((cell, cIdx) => (
                                <td key={cIdx} className="p-1">
                                  <input
                                    type="text"
                                    value={cell}
                                    onChange={(e) => {
                                      const nextRows = (block.rows || []).map((r) => [...r]);
                                      nextRows[rIdx][cIdx] = e.target.value;
                                      updateBlock(block.id, { rows: nextRows });
                                    }}
                                    className="w-full rounded border border-neutral-200 bg-white px-2 py-1 text-xs text-neutral-900 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100"
                                  />
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="flex gap-3 text-xs font-semibold">
                      <button
                        type="button"
                        onClick={() => {
                          const cols = block.headers?.length || 2;
                          updateBlock(block.id, {
                            rows: [...(block.rows || []), Array(cols).fill('')],
                          });
                        }}
                        className="inline-flex items-center gap-1 text-neutral-700 hover:text-neutral-950 dark:text-neutral-300"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Baris
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const nextHeaders = [
                            ...(block.headers || []),
                            `Kolom ${(block.headers?.length || 0) + 1}`,
                          ];
                          const nextRows = (block.rows || []).map((r) => [...r, '']);
                          updateBlock(block.id, { headers: nextHeaders, rows: nextRows });
                        }}
                        className="inline-flex items-center gap-1 text-neutral-700 hover:text-neutral-950 dark:text-neutral-300"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Kolom
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ToolbarBtn({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-md border border-neutral-200 bg-white px-2.5 py-1.5 text-xs font-medium text-neutral-700 transition-colors hover:bg-neutral-100 hover:text-neutral-950 whitespace-nowrap shrink-0 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-white"
    >
      {icon}
      {label}
    </button>
  );
}
