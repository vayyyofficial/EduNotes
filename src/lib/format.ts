import { ContentBlock } from '../types/textbook';

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export function formatDate(isoString: string): string {
  if (!isoString) return '-';
  try {
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(new Date(isoString));
  } catch {
    return isoString;
  }
}

export function generateBlockId(): string {
  return `blk_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

export function extractPlainTextFromBlocks(
  title: string,
  bookName: string,
  blocks: ContentBlock[]
): string {
  const lines: string[] = [title, bookName, ''];

  for (const block of blocks) {
    switch (block.type) {
      case 'heading':
        lines.push(`## ${block.text || ''}`, '');
        break;
      case 'subheading':
        lines.push(`### ${block.text || ''}`, '');
        break;
      case 'paragraph':
        lines.push(block.text || '', '');
        break;
      case 'quote':
        lines.push(`"${block.text || ''}"${block.author ? ` — ${block.author}` : ''}`, '');
        break;
      case 'bullet_list':
        (block.items || []).forEach((item) => lines.push(`- ${item}`));
        lines.push('');
        break;
      case 'numbered_list':
        (block.items || []).forEach((item, idx) => lines.push(`${idx + 1}. ${item}`));
        lines.push('');
        break;
      case 'note':
        lines.push(`[${block.title || 'Catatan Penting'}]`, block.text || '', '');
        break;
      case 'takeaway':
        lines.push(`[${block.title || 'Poin Kesimpulan'}]`);
        (block.items || []).forEach((item) => lines.push(`• ${item}`));
        lines.push('');
        break;
      case 'definition':
        lines.push(`${block.term || 'Istilah'}: ${block.text || ''}`, '');
        break;
      case 'table':
        if (block.headers?.length) lines.push(block.headers.join(' | '));
        (block.rows || []).forEach((row) => lines.push(row.join(' | ')));
        lines.push('');
        break;
    }
  }

  return lines.join('\n').trim();
}
