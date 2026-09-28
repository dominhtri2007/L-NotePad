export interface User {
  id: string;
  username: string;
  email: string;
}

export interface NoteInfo {
  slug: string;
  content: string;
  language: string;
  hasPassword: boolean;
  isOwner?: boolean;
  locked?: boolean;
  updatedAt?: string;
}

export interface UserNoteSummary {
  slug: string;
  language: string;
  hasPassword: boolean;
  charsCount: number;
  wordsCount: number;
  updatedAt: string;
  preview: string;
}

export type EditorLanguage =
  | 'plaintext'
  | 'javascript'
  | 'typescript'
  | 'python'
  | 'html'
  | 'css'
  | 'json'
  | 'markdown'
  | 'sql'
  | 'cpp'
  | 'java'
  | 'bash';
