import { supabase, isSupabaseConfigured } from './supabaseClient';
import bcrypt from 'bcryptjs';

export interface SupabaseNote {
  slug: string;
  content: string;
  password?: string | null;
  language: string;
  owner_id?: string | null;
  created_at: string;
  updated_at: string;
}

export const supabaseNoteService = {
  isAvailable() {
    return isSupabaseConfigured && supabase !== null;
  },

  async getNote(slug: string): Promise<SupabaseNote | null> {
    if (!this.isAvailable()) return null;
    try {
      const { data, error } = await supabase!
        .from('notes')
        .select('*')
        .eq('slug', slug)
        .maybeSingle();

      if (error) {
        console.warn('[Supabase] getNote error:', error.message);
        return null;
      }
      return data;
    } catch (err) {
      console.warn('[Supabase] getNote exception:', err);
      return null;
    }
  },

  async saveNote(slug: string, updates: Partial<{ content: string; language: string; password?: string | null; ownerId?: string | null }>): Promise<boolean> {
    if (!this.isAvailable()) return false;
    try {
      const payload: any = {
        slug,
        updated_at: new Date().toISOString(),
      };
      if (updates.content !== undefined) payload.content = updates.content;
      if (updates.language !== undefined) payload.language = updates.language;
      if (updates.password !== undefined) payload.password = updates.password;
      if (updates.ownerId !== undefined) payload.owner_id = updates.ownerId;

      const { error } = await supabase!
        .from('notes')
        .upsert(payload, { onConflict: 'slug' });

      if (error) {
        console.warn('[Supabase] saveNote error:', error.message);
        return false;
      }
      return true;
    } catch (err) {
      console.warn('[Supabase] saveNote exception:', err);
      return false;
    }
  },

  async changeSlug(oldSlug: string, newSlug: string): Promise<{ success: boolean; error?: string }> {
    if (!this.isAvailable()) return { success: false, error: 'Supabase chưa được cấu hình' };
    try {
      const existingNew = await this.getNote(newSlug);
      if (existingNew) {
        return { success: false, error: 'URL mới này đã được sử dụng, vui lòng chọn tên khác' };
      }

      const oldNote = await this.getNote(oldSlug);
      if (!oldNote) {
        return { success: false, error: 'Ghi chú gốc không tồn tại' };
      }

      // Insert new note with old content
      const { error: insertErr } = await supabase!
        .from('notes')
        .insert({
          ...oldNote,
          slug: newSlug,
          updated_at: new Date().toISOString(),
        });
      if (insertErr) return { success: false, error: insertErr.message };

      // Delete old note
      await supabase!.from('notes').delete().eq('slug', oldSlug);

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  async getUserNotes(userId: string): Promise<SupabaseNote[]> {
    if (!this.isAvailable() || !userId) return [];
    try {
      const { data, error } = await supabase!
        .from('notes')
        .select('*')
        .eq('owner_id', userId)
        .order('updated_at', { ascending: false });

      if (error) return [];
      return data || [];
    } catch {
      return [];
    }
  },

  hashPassword(password: string): string {
    return bcrypt.hashSync(password, 10);
  },

  verifyPassword(inputPass: string, hashedPass: string): boolean {
    if (!hashedPass) return true;
    try {
      return bcrypt.compareSync(inputPass, hashedPass);
    } catch {
      return false;
    }
  },
};
