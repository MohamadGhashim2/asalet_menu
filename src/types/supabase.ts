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
      restaurant_settings: {
        Row: {
          id: string
          whatsapp: string | null
          currency: string | null
          tax_rate: number | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          whatsapp?: string | null
          currency?: string | null
          tax_rate?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          whatsapp?: string | null
          currency?: string | null
          tax_rate?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: never[]
      }
      categories: {
        Row: {
          id: string
          name: string
          description: string | null
          image_url: string | null
          sort_order: number | null
          is_active: boolean | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          image_url?: string | null
          sort_order?: number | null
          is_active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          image_url?: string | null
          sort_order?: number | null
          is_active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: never[]
      }
      menu_items: {
        Row: {
          id: string
          category_id: string | null
          name: string
          description: string | null
          base_price: number | null
          image_url: string | null
          is_available: boolean | null
          is_featured: boolean | null
          sort_order: number | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          category_id?: string | null
          name: string
          description?: string | null
          base_price?: number | null
          image_url?: string | null
          is_available?: boolean | null
          is_featured?: boolean | null
          sort_order?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          category_id?: string | null
          name?: string
          description?: string | null
          base_price?: number | null
          image_url?: string | null
          is_available?: boolean | null
          is_featured?: boolean | null
          sort_order?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: never[]
      }
      restaurant_tables: {
        Row: {
          id: string
          label: string
          code: string
          sort_order: number
          is_active: boolean
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          label: string
          code: string
          sort_order?: number
          is_active?: boolean
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          label?: string
          code?: string
          sort_order?: number
          is_active?: boolean
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: never[]
      }
      item_option_groups: {
        Row: {
          id: string
          item_id: string | null
          title: string
          kind: 'variant' | 'addon' | 'modifier' | null
          selection_type: 'single' | 'multiple' | null
          is_required: boolean | null
          min_select: number | null
          max_select: number | null
          sort_order: number | null
          is_active: boolean | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          item_id?: string | null
          title: string
          kind?: 'variant' | 'addon' | 'modifier' | null
          selection_type?: 'single' | 'multiple' | null
          is_required?: boolean | null
          min_select?: number | null
          max_select?: number | null
          sort_order?: number | null
          is_active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          item_id?: string | null
          title?: string
          kind?: 'variant' | 'addon' | 'modifier' | null
          selection_type?: 'single' | 'multiple' | null
          is_required?: boolean | null
          min_select?: number | null
          max_select?: number | null
          sort_order?: number | null
          is_active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: never[]
      }
      item_options: {
        Row: {
          id: string
          group_id: string | null
          name: string
          price: number | null
          is_default: boolean | null
          sort_order: number | null
          is_active: boolean | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          group_id?: string | null
          name: string
          price?: number | null
          is_default?: boolean | null
          sort_order?: number | null
          is_active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          group_id?: string | null
          name?: string
          price?: number | null
          is_default?: boolean | null
          sort_order?: number | null
          is_active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: never[]
      }
      option_group_templates: {
        Row: {
          id: string
          template_name: string
          display_title: string
          kind: 'variant' | 'addon' | 'modifier' | null
          selection_type: 'single' | 'multiple' | null
          is_required: boolean | null
          min_select: number | null
          max_select: number | null
          sort_order: number | null
          is_active: boolean | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          template_name: string
          display_title: string
          kind?: 'variant' | 'addon' | 'modifier' | null
          selection_type?: 'single' | 'multiple' | null
          is_required?: boolean | null
          min_select?: number | null
          max_select?: number | null
          sort_order?: number | null
          is_active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          template_name?: string
          display_title?: string
          kind?: 'variant' | 'addon' | 'modifier' | null
          selection_type?: 'single' | 'multiple' | null
          is_required?: boolean | null
          min_select?: number | null
          max_select?: number | null
          sort_order?: number | null
          is_active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: never[]
      }
      option_template_options: {
        Row: {
          id: string
          template_id: string | null
          name: string
          price: number | null
          is_default: boolean | null
          sort_order: number | null
          is_active: boolean | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          template_id?: string | null
          name: string
          price?: number | null
          is_default?: boolean | null
          sort_order?: number | null
          is_active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          template_id?: string | null
          name?: string
          price?: number | null
          is_default?: boolean | null
          sort_order?: number | null
          is_active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: never[]
      }
      item_option_template_links: {
        Row: {
          id: string
          item_id: string | null
          template_id: string | null
          sort_order: number | null
          is_active: boolean | null
          created_at: string | null
        }
        Insert: {
          id?: string
          item_id?: string | null
          template_id?: string | null
          sort_order?: number | null
          is_active?: boolean | null
          created_at?: string | null
        }
        Update: {
          id?: string
          item_id?: string | null
          template_id?: string | null
          sort_order?: number | null
          is_active?: boolean | null
          created_at?: string | null
        }
        Relationships: never[]
      }
      category_translations: {
        Row: {
          category_id: string
          locale: string
          name: string
          description: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          category_id: string
          locale: string
          name: string
          description?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          category_id?: string
          locale?: string
          name?: string
          description?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: never[]
      }
      menu_item_translations: {
        Row: {
          menu_item_id: string
          locale: string
          name: string
          description: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          menu_item_id: string
          locale: string
          name: string
          description?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          menu_item_id?: string
          locale?: string
          name?: string
          description?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: never[]
      }
      item_option_group_translations: {
        Row: {
          item_option_group_id: string
          locale: string
          title: string
          created_at: string
          updated_at: string
        }
        Insert: {
          item_option_group_id: string
          locale: string
          title: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          item_option_group_id?: string
          locale?: string
          title?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: never[]
      }
      item_option_translations: {
        Row: {
          item_option_id: string
          locale: string
          name: string
          created_at: string
          updated_at: string
        }
        Insert: {
          item_option_id: string
          locale: string
          name: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          item_option_id?: string
          locale?: string
          name?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: never[]
      }
      option_group_template_translations: {
        Row: {
          option_group_template_id: string
          locale: string
          display_title: string
          created_at: string
          updated_at: string
        }
        Insert: {
          option_group_template_id: string
          locale: string
          display_title: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          option_group_template_id?: string
          locale?: string
          display_title?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: never[]
      }
      option_template_option_translations: {
        Row: {
          option_template_option_id: string
          locale: string
          name: string
          created_at: string
          updated_at: string
        }
        Insert: {
          option_template_option_id: string
          locale: string
          name: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          option_template_option_id?: string
          locale?: string
          name?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: never[]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
