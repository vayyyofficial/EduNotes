import {
  Atom,
  BookOpen,
  Calculator,
  Code2,
  Compass,
  Dna,
  FileText,
  FlaskConical,
  Globe,
  Landmark,
  Languages,
  Scale,
} from 'lucide-react';

export const SUBJECT_ICON_OPTIONS = [
  { value: 'BookOpen', label: 'Buku' },
  { value: 'Calculator', label: 'Matematika' },
  { value: 'Landmark', label: 'Sejarah' },
  { value: 'Languages', label: 'Bahasa' },
  { value: 'Code2', label: 'Informatika' },
  { value: 'Scale', label: 'Pancasila / Hukum' },
  { value: 'Atom', label: 'Fisika' },
  { value: 'FlaskConical', label: 'Kimia' },
  { value: 'Dna', label: 'Biologi' },
  { value: 'Globe', label: 'Geografi' },
  { value: 'Compass', label: 'Umum' },
  { value: 'FileText', label: 'Catatan' },
] as const;

interface SubjectIconProps {
  name?: string;
  className?: string;
}

export function SubjectIcon({ name = 'BookOpen', className = 'w-5 h-5' }: SubjectIconProps) {
  switch (name) {
    case 'Calculator':
      return <Calculator className={className} />;
    case 'Landmark':
      return <Landmark className={className} />;
    case 'Languages':
      return <Languages className={className} />;
    case 'Code2':
      return <Code2 className={className} />;
    case 'Scale':
      return <Scale className={className} />;
    case 'Atom':
      return <Atom className={className} />;
    case 'FlaskConical':
      return <FlaskConical className={className} />;
    case 'Dna':
      return <Dna className={className} />;
    case 'Globe':
      return <Globe className={className} />;
    case 'Compass':
      return <Compass className={className} />;
    case 'FileText':
      return <FileText className={className} />;
    case 'BookOpen':
    default:
      return <BookOpen className={className} />;
  }
}
