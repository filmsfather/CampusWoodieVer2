import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Create a single supabase client for interacting with your database
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Types for Supabase database
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          name: string
          role: ('student' | 'teacher' | 'admin')[]
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          name: string
          role?: ('student' | 'teacher' | 'admin')[]
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          role?: ('student' | 'teacher' | 'admin')[]
          created_at?: string
          updated_at?: string
        }
      }
      classes: {
        Row: {
          id: number
          name: string
          created_at: string
          updated_at: string
        }
        Insert: {
          name: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          name?: string
          created_at?: string
          updated_at?: string
        }
      }
      workbooks: {
        Row: {
          id: number
          title: string
          subject: Database['public']['Enums']['subject']
          type: Database['public']['Enums']['workbook_type']
          tags: string[]
          week: number | null
          is_common: boolean
          required_count: number | null
          youtube_url: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          title: string
          subject: Database['public']['Enums']['subject']
          type: Database['public']['Enums']['workbook_type']
          tags?: string[]
          week?: number | null
          is_common?: boolean
          required_count?: number | null
          youtube_url?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          title?: string
          subject?: Database['public']['Enums']['subject']
          type?: Database['public']['Enums']['workbook_type']
          tags?: string[]
          week?: number | null
          is_common?: boolean
          required_count?: number | null
          youtube_url?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      workbook_items: {
        Row: {
          id: number
          workbook_id: number
          prompt: string
          item_type: string
          options: Record<string, unknown> | null
          answer_key: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          workbook_id: number
          prompt: string
          item_type: string
          options?: Record<string, unknown> | null
          answer_key?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          workbook_id?: number
          prompt?: string
          item_type?: string
          options?: Record<string, unknown> | null
          answer_key?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      assignments: {
        Row: {
          id: number
          workbook_id: number
          target_type: string
          target_id: string
          session_no: number | null
          due_at: string
          created_by: string | null
          created_at: string
        }
        Insert: {
          workbook_id: number
          target_type: string
          target_id: string
          session_no?: number | null
          due_at: string
          created_by?: string | null
          created_at?: string
        }
        Update: {
          workbook_id?: number
          target_type?: string
          target_id?: string
          session_no?: number | null
          due_at?: string
          created_by?: string | null
          created_at?: string
        }
      }
      student_tasks: {
        Row: {
          id: number
          assignment_id: number
          user_id: string
          status: Database['public']['Enums']['task_status']
          progress_pct: number
          created_at: string
          updated_at: string
        }
        Insert: {
          assignment_id: number
          user_id: string
          status?: Database['public']['Enums']['task_status']
          progress_pct?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          assignment_id?: number
          user_id?: string
          status?: Database['public']['Enums']['task_status']
          progress_pct?: number
          created_at?: string
          updated_at?: string
        }
      }
      class_members: {
        Row: {
          class_id: number
          user_id: string
        }
        Insert: {
          class_id: number
          user_id: string
        }
        Update: {
          class_id?: number
          user_id?: string
        }
      }
      answers: {
        Row: {
          id: number
          student_task_id: number
          workbook_item_id: number
          response_text: string | null
          selected_option: number | null
          correctness: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          student_task_id: number
          workbook_item_id: number
          response_text?: string | null
          selected_option?: number | null
          correctness?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          student_task_id?: number
          workbook_item_id?: number
          response_text?: string | null
          selected_option?: number | null
          correctness?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      srs_state: {
        Row: {
          id: number
          answer_id: number
          streak: number
          next_due_at: string | null
        }
        Insert: {
          answer_id: number
          streak?: number
          next_due_at?: string | null
        }
        Update: {
          answer_id?: number
          streak?: number
          next_due_at?: string | null
        }
      }
      essay_reviews: {
        Row: {
          id: number
          student_task_id: number
          grade: string | null
          feedback: string | null
          created_at: string
        }
        Insert: {
          student_task_id: number
          grade?: string | null
          feedback?: string | null
          created_at?: string
        }
        Update: {
          student_task_id?: number
          grade?: string | null
          feedback?: string | null
          created_at?: string
        }
      }
      viewing_notes: {
        Row: {
          id: number
          student_task_id: number
          title: string | null
          country: string | null
          director: string | null
          genre: string | null
          subgenre: string | null
          notes: string | null
          created_at: string
        }
        Insert: {
          student_task_id: number
          title?: string | null
          country?: string | null
          director?: string | null
          genre?: string | null
          subgenre?: string | null
          notes?: string | null
          created_at?: string
        }
        Update: {
          student_task_id?: number
          title?: string | null
          country?: string | null
          director?: string | null
          genre?: string | null
          subgenre?: string | null
          notes?: string | null
          created_at?: string
        }
      }
      lecture_summaries: {
        Row: {
          id: number
          student_task_id: number
          summary: string | null
          created_at: string
        }
        Insert: {
          student_task_id: number
          summary?: string | null
          created_at?: string
        }
        Update: {
          student_task_id?: number
          summary?: string | null
          created_at?: string
        }
      }
      pdf_uploads: {
        Row: {
          id: number
          student_task_id: number
          file_path: string
          created_at: string
        }
        Insert: {
          student_task_id: number
          file_path: string
          created_at?: string
        }
        Update: {
          student_task_id?: number
          file_path?: string
          created_at?: string
        }
      }
      print_requests: {
        Row: {
          id: number
          pdf_upload_id: number
          preferred_date: string | null
          period: string | null
          copies: number
          color: Database['public']['Enums']['color_opt']
          status: Database['public']['Enums']['print_status']
          created_at: string
        }
        Insert: {
          pdf_upload_id: number
          preferred_date?: string | null
          period?: string | null
          copies?: number
          color?: Database['public']['Enums']['color_opt']
          status?: Database['public']['Enums']['print_status']
          created_at?: string
        }
        Update: {
          pdf_upload_id?: number
          preferred_date?: string | null
          period?: string | null
          copies?: number
          color?: Database['public']['Enums']['color_opt']
          status?: Database['public']['Enums']['print_status']
          created_at?: string
        }
      }
      workbook_item_images: {
        Row: {
          id: number
          workbook_item_id: number
          file_path: string
          created_at: string
        }
        Insert: {
          workbook_item_id: number
          file_path: string
          created_at?: string
        }
        Update: {
          workbook_item_id?: number
          file_path?: string
          created_at?: string
        }
      }
      task_images: {
        Row: {
          id: number
          student_task_id: number
          file_path: string
          created_at: string
        }
        Insert: {
          student_task_id: number
          file_path: string
          created_at?: string
        }
        Update: {
          student_task_id?: number
          file_path?: string
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      subject: 'directing' | 'writing' | 'research' | 'integrated'
      workbook_type: 'SRS' | 'PDF' | 'ESSAY' | 'VIEWING' | 'LECTURE'
      role: 'student' | 'teacher' | 'admin'
      task_status: 'pending' | 'in_progress' | 'completed'
      print_status: 'requested' | 'done' | 'canceled'
      color_opt: 'bw' | 'color'
    }
  }
}

// Create a typed client
export const createSupabaseClient = () => {
  return createClient<Database>(supabaseUrl, supabaseAnonKey)
}