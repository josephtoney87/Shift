export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      audit_logs: {
        Row: {
          id: string
          table_name: string
          record_id: string
          operation: string
          old_data: Json | null
          new_data: Json | null
          changed_by: string | null
          changed_at: string
        }
        Insert: {
          id?: string
          table_name: string
          record_id: string
          operation: string
          old_data?: Json | null
          new_data?: Json | null
          changed_by?: string | null
          changed_at?: string
        }
        Update: {
          id?: string
          table_name?: string
          record_id?: string
          operation?: string
          old_data?: Json | null
          new_data?: Json | null
          changed_by?: string | null
          changed_at?: string
        }
      }
      calibrations: {
        Row: {
          id: string
          equipment_id: string
          calibration_date: string
          next_calibration_date: string
          performed_by: string | null
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          equipment_id: string
          calibration_date: string
          next_calibration_date: string
          performed_by?: string | null
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          equipment_id?: string
          calibration_date?: string
          next_calibration_date?: string
          performed_by?: string | null
          notes?: string | null
          created_at?: string
        }
      }
      end_cleanups: {
        Row: {
          id: string
          shift_id: string | null
          preparation_checks: Json
          cleaning_checks: Json
          notes: string | null
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          shift_id?: string | null
          preparation_checks: Json
          cleaning_checks: Json
          notes?: string | null
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          shift_id?: string | null
          preparation_checks?: Json
          cleaning_checks?: Json
          notes?: string | null
          created_by?: string | null
          created_at?: string
        }
      }
      parts: {
        Row: {
          id: string
          part_number: string
          revision: string
          material: string
          coating: string | null
          created_at: string
          updated_at: string
          deleted_at: string | null
          facility_id: string | null
        }
        Insert: {
          id?: string
          part_number: string
          revision: string
          material: string
          coating?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
          facility_id?: string | null
        }
        Update: {
          id?: string
          part_number?: string
          revision?: string
          material?: string
          coating?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
          facility_id?: string | null
        }
      }
      shift_reports: {
        Row: {
          id: string
          shift_id: string | null
          date: string
          completed_tasks_count: number
          pending_tasks_count: number
          summary_notes: string | null
          acknowledged_by: string | null
          acknowledged_at: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          shift_id?: string | null
          date: string
          completed_tasks_count?: number
          pending_tasks_count?: number
          summary_notes?: string | null
          acknowledged_by?: string | null
          acknowledged_at?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          shift_id?: string | null
          date?: string
          completed_tasks_count?: number
          pending_tasks_count?: number
          summary_notes?: string | null
          acknowledged_by?: string | null
          acknowledged_at?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      shifts: {
        Row: {
          id: string
          type: string
          start_time: string
          end_time: string
          created_at: string
          updated_at: string
          deleted_at: string | null
          facility_id: string | null
        }
        Insert: {
          id?: string
          type: string
          start_time: string
          end_time: string
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
          facility_id?: string | null
        }
        Update: {
          id?: string
          type?: string
          start_time?: string
          end_time?: string
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
          facility_id?: string | null
        }
      }
      start_checklists: {
        Row: {
          id: string
          shift_id: string | null
          work_order_number: string
          pallet_number: string
          part_number: string
          program_number: string
          starting_block_number: string
          tool_number: string
          tools_requiring_attention: string[] | null
          immediate_attention_tools: string[] | null
          notes: string | null
          safety_checks: Json
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          shift_id?: string | null
          work_order_number: string
          pallet_number: string
          part_number: string
          program_number: string
          starting_block_number: string
          tool_number: string
          tools_requiring_attention?: string[] | null
          immediate_attention_tools?: string[] | null
          notes?: string | null
          safety_checks: Json
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          shift_id?: string | null
          work_order_number?: string
          pallet_number?: string
          part_number?: string
          program_number?: string
          starting_block_number?: string
          tool_number?: string
          tools_requiring_attention?: string[] | null
          immediate_attention_tools?: string[] | null
          notes?: string | null
          safety_checks?: Json
          created_by?: string | null
          created_at?: string
        }
      }
      task_notes: {
        Row: {
          id: string
          task_id: string | null
          worker_id: string | null
          note_text: string
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          task_id?: string | null
          worker_id?: string | null
          note_text: string
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          task_id?: string | null
          worker_id?: string | null
          note_text?: string
          created_by?: string | null
          created_at?: string
        }
      }
      tasks: {
        Row: {
          id: string
          part_id: string | null
          description: string
          estimated_duration: number
          priority: string
          shift_id: string | null
          status: string
          carried_over_from_task_id: string | null
          created_by: string | null
          created_at: string
          updated_at: string
          deleted_at: string | null
          facility_id: string | null
        }
        Insert: {
          id?: string
          part_id?: string | null
          description: string
          estimated_duration: number
          priority: string
          shift_id?: string | null
          status: string
          carried_over_from_task_id?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
          facility_id?: string | null
        }
        Update: {
          id?: string
          part_id?: string | null
          description?: string
          estimated_duration?: number
          priority?: string
          shift_id?: string | null
          status?: string
          carried_over_from_task_id?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
          facility_id?: string | null
        }
      }
      time_logs: {
        Row: {
          id: string
          task_id: string | null
          worker_id: string | null
          start_time: string
          end_time: string | null
          duration: number | null
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          task_id?: string | null
          worker_id?: string | null
          start_time: string
          end_time?: string | null
          duration?: number | null
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          task_id?: string | null
          worker_id?: string | null
          start_time?: string
          end_time?: string | null
          duration?: number | null
          created_by?: string | null
          created_at?: string
        }
      }
      workers: {
        Row: {
          id: string
          name: string
          role: string
          shift_id: string | null
          is_manual: boolean | null
          created_at: string
          updated_at: string
          deleted_at: string | null
          facility_id: string | null
        }
        Insert: {
          id?: string
          name: string
          role: string
          shift_id?: string | null
          is_manual?: boolean | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
          facility_id?: string | null
        }
        Update: {
          id?: string
          name?: string
          role?: string
          shift_id?: string | null
          is_manual?: boolean | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
          facility_id?: string | null
        }
      }
    }
    Views: {
      mv_shift_summary: {
        Row: {
          shift_id: string | null
          shift_type: string | null
          work_date: string | null
          total_tasks: number | null
          completed_tasks: number | null
          in_progress_tasks: number | null
          pending_tasks: number | null
          carried_over_tasks: number | null
          avg_task_duration: number | null
        }
        Insert: {
          shift_id?: string | null
          shift_type?: string | null
          work_date?: string | null
          total_tasks?: number | null
          completed_tasks?: number | null
          in_progress_tasks?: number | null
          pending_tasks?: number | null
          carried_over_tasks?: number | null
          avg_task_duration?: number | null
        }
        Update: {
          shift_id?: string | null
          shift_type?: string | null
          work_date?: string | null
          total_tasks?: number | null
          completed_tasks?: number | null
          in_progress_tasks?: number | null
          pending_tasks?: number | null
          carried_over_tasks?: number | null
          avg_task_duration?: number | null
        }
      }
    }
    Functions: {
      refresh_shift_summary: {
        Args: Record<PropertyKey, never>
        Returns: unknown
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}