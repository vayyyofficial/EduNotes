import React from 'react';
import { ContentBlock } from '../types/textbook';

function renderInlineFormatting(text: string): React.ReactNode[] {
  const tokens = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return tokens.map((token, idx) => {
    if (token.startsWith('**') && token.endsWith('**') && token.length > 4) {
      return (
        <strong key={idx} className="font-semibold text-neutral-950 dark:text-white">
          {token.slice(2, -2)}
        </strong>
      );
    }
    if (token.startsWith('*') && token.endsWith('*') && token.length > 2) {
      return (
        <em key={idx} className="italic">
          {token.slice(1, -1)}
        </em>
      );
    }
    return <React.Fragment key={idx}>{token}</React.Fragment>;
  });
}

interface RichContentRendererProps {
  blocks: ContentBlock[];
}

export function RichContentRenderer({ blocks }: RichContentRendererProps) {
  if (!blocks || blocks.length === 0) {
    return (
      <p className="text-sm text-neutral-500 dark:text-neutral-400">
        Belum ada isi materi pada subbab ini.
      </p>
    );
  }

  return (
    <div className="space-y-6 font-serif text-[17px] leading-[1.85] text-neutral-800 dark:text-neutral-200">
      {blocks.map((block) => {
        switch (block.type) {
          case 'heading':
            return (
              <h2
                key={block.id}
                className="pt-4 font-sans text-2xl font-bold tracking-tight text-neutral-950 dark:text-white"
              >
                {block.text}
              </h2>
            );

          case 'subheading':
            return (
              <h3
                key={block.id}
                className="pt-2 font-sans text-lg font-semibold tracking-tight text-neutral-900 dark:text-neutral-100"
              >
                {block.text}
              </h3>
            );

          case 'paragraph':
            return (
              <p key={block.id} className="whitespace-pre-line">
                {renderInlineFormatting(block.text || '')}
              </p>
            );

          case 'bullet_list':
            return (
              <ul key={block.id} className="list-disc space-y-2 pl-6">
                {(block.items || []).map((item, idx) => (
                  <li key={idx} className="pl-1">
                    {renderInlineFormatting(item)}
                  </li>
                ))}
              </ul>
            );

          case 'numbered_list':
            return (
              <ol key={block.id} className="list-decimal space-y-2 pl-6">
                {(block.items || []).map((item, idx) => (
                  <li key={idx} className="pl-1">
                    {renderInlineFormatting(item)}
                  </li>
                ))}
              </ol>
            );

          case 'quote':
            return (
              <blockquote
                key={block.id}
                className="rounded-xl border border-neutral-200 bg-neutral-50/80 px-6 py-4 italic text-neutral-700 dark:border-neutral-800 dark:bg-neutral-900/60 dark:text-neutral-300"
              >
                <p>&ldquo;{renderInlineFormatting(block.text || '')}&rdquo;</p>
                {block.author && (
                  <footer className="mt-2 font-sans text-xs font-semibold not-italic text-neutral-500 dark:text-neutral-400">
                    — {block.author}
                  </footer>
                )}
              </blockquote>
            );

          case 'note':
            return (
              <div
                key={block.id}
                className="rounded-xl border border-yellow-400/60 bg-yellow-50/70 p-5 font-sans text-sm leading-relaxed text-neutral-900 dark:border-yellow-400/30 dark:bg-yellow-400/10 dark:text-neutral-100"
              >
                <p className="mb-1.5 font-semibold text-neutral-950 dark:text-yellow-300">
                  {block.title || 'Catatan Penting'}
                </p>
                <p className="whitespace-pre-line">
                  {renderInlineFormatting(block.text || '')}
                </p>
              </div>
            );

          case 'takeaway':
            return (
              <div
                key={block.id}
                className="rounded-xl border border-neutral-200 bg-neutral-50 p-5 font-sans text-sm leading-relaxed text-neutral-900 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100"
              >
                <p className="mb-3 font-semibold text-neutral-950 dark:text-white">
                  {block.title || 'Poin Kesimpulan'}
                </p>
                <ul className="space-y-2">
                  {(block.items || []).map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2.5">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-yellow-400" />
                      <span>{renderInlineFormatting(item)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );

          case 'definition':
            return (
              <dl
                key={block.id}
                className="rounded-xl border border-neutral-200 bg-white p-5 font-sans dark:border-neutral-800 dark:bg-neutral-900/60"
              >
                <dt className="text-sm font-bold text-neutral-950 dark:text-yellow-400">
                  {block.term || 'Istilah Penting'}
                </dt>
                <dd className="mt-1.5 text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">
                  {renderInlineFormatting(block.text || '')}
                </dd>
              </dl>
            );

          case 'table':
            return (
              <div
                key={block.id}
                className="overflow-x-auto rounded-xl border border-neutral-200 font-sans dark:border-neutral-800"
              >
                <table className="w-full border-collapse text-left text-sm">
                  {block.headers && block.headers.length > 0 && (
                    <thead className="border-b border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900">
                      <tr>
                        {block.headers.map((header, idx) => (
                          <th
                            key={idx}
                            className="px-4 py-3 font-semibold text-neutral-950 dark:text-white"
                          >
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                  )}
                  <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                    {(block.rows || []).map((row, rIdx) => (
                      <tr key={rIdx} className="bg-white dark:bg-neutral-950">
                        {row.map((cell, cIdx) => (
                          <td
                            key={cIdx}
                            className="px-4 py-3 text-neutral-700 tabular-nums dark:text-neutral-300"
                          >
                            {renderInlineFormatting(cell)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );

          default:
            return null;
        }
      })}
    </div>
  );
}
