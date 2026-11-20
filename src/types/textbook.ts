export type ContentBlockType =
  | 'heading'
  | 'subheading'
  | 'paragraph'
  | 'bullet_list'
  | 'numbered_list'
  | 'table'
  | 'quote'
  | 'note'
  | 'takeaway'
  | 'definition';

export interface ContentBlock {
  id: string;
  type: ContentBlockType;
  text?: string;
  title?: string;
  term?: string;
  author?: string;
  items?: string[];
  headers?: string[];
  rows?: string[][];
}

export interface SubchapterVersion {
  id: string;
  versionNumber: number;
  title: string;
  content: ContentBlock[];
  changeSummary: string;
  sourceMode: 'manual' | 'scan_update' | 'scan_new' | 'restore';
  createdAt: string;
}

export interface Subchapter {
  id: string;
  code: string;
  title: string;
  description: string;
  content: ContentBlock[];
  tags: string[];
  updatedAt: string;
  versions: SubchapterVersion[];
}

export interface Chapter {
  id: string;
  number: number;
  title: string;
  description: string;
  subchapters: Subchapter[];
}

export interface BookReference {
  id: string;
  title: string;
  author: string;
  year: string;
  publisherOrUrl: string;
  linkedChapterId?: string;
  linkedSubchapterId?: string;
}

export interface Book {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  color: string;
  updatedAt: string;
  chapters: Chapter[];
  references: BookReference[];
}

export interface ProposedSubchapterAction {
  id: string;
  action: 'update_existing' | 'add_new';
  targetSubchapterId?: string;
  title: string;
  description: string;
  originalContent?: ContentBlock[];
  proposedContent: ContentBlock[];
  changeNote: string;
}

export interface ProposedChapterPlan {
  id: string;
  action: 'keep_existing' | 'create_new';
  targetChapterId?: string;
  chapterTitle: string;
  chapterDescription: string;
  subchapters: ProposedSubchapterAction[];
}

export interface AutoStructuringProposal {
  bookId: string;
  bookName: string;
  photoCount: number;
  plainLanguageSummary: string;
  chapterPlans: ProposedChapterPlan[];
  mergedOrMovedNotes: string[];
  unclearHandwritingItems: string[];
  createdAt: string;
}

export interface LocalScanHistoryItem {
  id: string;
  bookName: string;
  photoCount: number;
  summary: string;
  createdAt: string;
}
