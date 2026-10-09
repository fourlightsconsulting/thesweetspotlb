export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18";
  };
  public: {
    Tables: {
      ad_performance: {
        Row: {
          account_id: string;
          ad_id: string;
          ad_name: string;
          add_to_cart: number | null;
          adset_id: string;
          adset_name: string;
          campaign_id: string;
          campaign_name: string;
          clicks: number | null;
          created_by: string | null;
          day: string;
          id: number;
          imported_at: string;
          impressions: number | null;
          initiate_checkout: number | null;
          landing_page_views: number | null;
          link_clicks: number | null;
          messaging_started: number | null;
          note: string;
          placement: string;
          platform: string;
          profile_visits: number | null;
          publisher: string;
          purchase_value_cents: number | null;
          purchases: number | null;
          spend_cents: number;
          video_views: number | null;
        };
        Insert: {
          account_id?: string;
          ad_id?: string;
          ad_name?: string;
          add_to_cart?: number | null;
          adset_id?: string;
          adset_name?: string;
          campaign_id?: string;
          campaign_name?: string;
          clicks?: number | null;
          created_by?: string | null;
          day: string;
          id?: never;
          imported_at?: string;
          impressions?: number | null;
          initiate_checkout?: number | null;
          landing_page_views?: number | null;
          link_clicks?: number | null;
          messaging_started?: number | null;
          note?: string;
          placement?: string;
          platform: string;
          profile_visits?: number | null;
          publisher?: string;
          purchase_value_cents?: number | null;
          purchases?: number | null;
          spend_cents?: number;
          video_views?: number | null;
        };
        Update: {
          account_id?: string;
          ad_id?: string;
          ad_name?: string;
          add_to_cart?: number | null;
          adset_id?: string;
          adset_name?: string;
          campaign_id?: string;
          campaign_name?: string;
          clicks?: number | null;
          created_by?: string | null;
          day?: string;
          id?: never;
          imported_at?: string;
          impressions?: number | null;
          initiate_checkout?: number | null;
          landing_page_views?: number | null;
          link_clicks?: number | null;
          messaging_started?: number | null;
          note?: string;
          placement?: string;
          platform?: string;
          profile_visits?: number | null;
          publisher?: string;
          purchase_value_cents?: number | null;
          purchases?: number | null;
          spend_cents?: number;
          video_views?: number | null;
        };
        Relationships: [];
      };
      ad_registry: {
        Row: {
          archived: boolean;
          code: string;
          created_at: string;
          created_by: string | null;
          details: Json;
          id: string;
          kind: string;
          name: string;
          note: string;
        };
        Insert: {
          archived?: boolean;
          code: string;
          created_at?: string;
          created_by?: string | null;
          details?: Json;
          id?: string;
          kind: string;
          name?: string;
          note?: string;
        };
        Update: {
          archived?: boolean;
          code?: string;
          created_at?: string;
          created_by?: string | null;
          details?: Json;
          id?: string;
          kind?: string;
          name?: string;
          note?: string;
        };
        Relationships: [];
      };
      analytics_events: {
        Row: {
          bot: boolean;
          bot_reason: string | null;
          browser: string | null;
          city: string | null;
          client_ip: string | null;
          country: string | null;
          device_type: string | null;
          event_name: string;
          fbc: string | null;
          fbclid: string | null;
          fbp: string | null;
          gclid: string | null;
          id: number;
          internal: boolean;
          item_id: string | null;
          landing_page: string | null;
          locale: Database["public"]["Enums"]["locale"] | null;
          meta_event_id: string | null;
          meta_relayed_at: string | null;
          occurred_at: string;
          order_id: string | null;
          os: string | null;
          params: Json;
          path: string | null;
          referrer: string | null;
          user_agent: string | null;
          utm_campaign: string | null;
          utm_content: string | null;
          utm_id: string | null;
          utm_medium: string | null;
          utm_source: string | null;
          utm_term: string | null;
          value_cents: number | null;
          visit_id: string | null;
          visitor_id: string | null;
        };
        Insert: {
          bot?: boolean;
          bot_reason?: string | null;
          browser?: string | null;
          city?: string | null;
          client_ip?: string | null;
          country?: string | null;
          device_type?: string | null;
          event_name: string;
          fbc?: string | null;
          fbclid?: string | null;
          fbp?: string | null;
          gclid?: string | null;
          id?: never;
          internal?: boolean;
          item_id?: string | null;
          landing_page?: string | null;
          locale?: Database["public"]["Enums"]["locale"] | null;
          meta_event_id?: string | null;
          meta_relayed_at?: string | null;
          occurred_at?: string;
          order_id?: string | null;
          os?: string | null;
          params?: Json;
          path?: string | null;
          referrer?: string | null;
          user_agent?: string | null;
          utm_campaign?: string | null;
          utm_content?: string | null;
          utm_id?: string | null;
          utm_medium?: string | null;
          utm_source?: string | null;
          utm_term?: string | null;
          value_cents?: number | null;
          visit_id?: string | null;
          visitor_id?: string | null;
        };
        Update: {
          bot?: boolean;
          bot_reason?: string | null;
          browser?: string | null;
          city?: string | null;
          client_ip?: string | null;
          country?: string | null;
          device_type?: string | null;
          event_name?: string;
          fbc?: string | null;
          fbclid?: string | null;
          fbp?: string | null;
          gclid?: string | null;
          id?: never;
          internal?: boolean;
          item_id?: string | null;
          landing_page?: string | null;
          locale?: Database["public"]["Enums"]["locale"] | null;
          meta_event_id?: string | null;
          meta_relayed_at?: string | null;
          occurred_at?: string;
          order_id?: string | null;
          os?: string | null;
          params?: Json;
          path?: string | null;
          referrer?: string | null;
          user_agent?: string | null;
          utm_campaign?: string | null;
          utm_content?: string | null;
          utm_id?: string | null;
          utm_medium?: string | null;
          utm_source?: string | null;
          utm_term?: string | null;
          value_cents?: number | null;
          visit_id?: string | null;
          visitor_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "analytics_events_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
        ];
      };
      audit_log: {
        Row: {
          action: string;
          actor: string | null;
          at: string;
          changes: Json;
          id: number;
          row_id: string;
          table_name: string;
        };
        Insert: {
          action: string;
          actor?: string | null;
          at?: string;
          changes: Json;
          id?: never;
          row_id: string;
          table_name: string;
        };
        Update: {
          action?: string;
          actor?: string | null;
          at?: string;
          changes?: Json;
          id?: never;
          row_id?: string;
          table_name?: string;
        };
        Relationships: [];
      };
      branch_closures: {
        Row: {
          branch_id: string;
          id: string;
          note: string;
          on_date: string;
        };
        Insert: {
          branch_id: string;
          id?: string;
          note?: string;
          on_date: string;
        };
        Update: {
          branch_id?: string;
          id?: string;
          note?: string;
          on_date?: string;
        };
        Relationships: [
          {
            foreignKeyName: "branch_closures_branch_id_fkey";
            columns: ["branch_id"];
            isOneToOne: false;
            referencedRelation: "branches";
            referencedColumns: ["id"];
          },
        ];
      };
      branch_hours: {
        Row: {
          branch_id: string;
          closes_at: string;
          opens_at: string;
          weekday: number;
        };
        Insert: {
          branch_id: string;
          closes_at: string;
          opens_at: string;
          weekday: number;
        };
        Update: {
          branch_id?: string;
          closes_at?: string;
          opens_at?: string;
          weekday?: number;
        };
        Relationships: [
          {
            foreignKeyName: "branch_hours_branch_id_fkey";
            columns: ["branch_id"];
            isOneToOne: false;
            referencedRelation: "branches";
            referencedColumns: ["id"];
          },
        ];
      };
      branches: {
        Row: {
          accepts_online_orders: boolean;
          address_ar: string;
          address_en: string;
          created_at: string;
          delivery_eta_max: number;
          delivery_eta_min: number;
          id: string;
          last_order_minutes: number;
          maps_url: string | null;
          name_ar: string;
          name_en: string;
          ordering: string;
          phone: string | null;
          pickup_eta_max: number;
          pickup_eta_min: number;
          slug: string;
          time_zone: string;
          updated_at: string;
        };
        Insert: {
          accepts_online_orders?: boolean;
          address_ar?: string;
          address_en?: string;
          created_at?: string;
          delivery_eta_max?: number;
          delivery_eta_min?: number;
          id?: string;
          last_order_minutes?: number;
          maps_url?: string | null;
          name_ar: string;
          name_en: string;
          ordering?: string;
          phone?: string | null;
          pickup_eta_max?: number;
          pickup_eta_min?: number;
          slug: string;
          time_zone?: string;
          updated_at?: string;
        };
        Update: {
          accepts_online_orders?: boolean;
          address_ar?: string;
          address_en?: string;
          created_at?: string;
          delivery_eta_max?: number;
          delivery_eta_min?: number;
          id?: string;
          last_order_minutes?: number;
          maps_url?: string | null;
          name_ar?: string;
          name_en?: string;
          ordering?: string;
          phone?: string | null;
          pickup_eta_max?: number;
          pickup_eta_min?: number;
          slug?: string;
          time_zone?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      categories: {
        Row: {
          created_at: string;
          description_ar: string;
          description_en: string;
          id: string;
          image_path: string | null;
          is_active: boolean;
          name_ar: string;
          name_en: string;
          parent_id: string | null;
          slug: string;
          sort_order: number;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          description_ar?: string;
          description_en?: string;
          id?: string;
          image_path?: string | null;
          is_active?: boolean;
          name_ar: string;
          name_en: string;
          parent_id?: string | null;
          slug: string;
          sort_order?: number;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          description_ar?: string;
          description_en?: string;
          id?: string;
          image_path?: string | null;
          is_active?: boolean;
          name_ar?: string;
          name_en?: string;
          parent_id?: string | null;
          slug?: string;
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey";
            columns: ["parent_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
        ];
      };
      customers: {
        Row: {
          created_at: string;
          email: string | null;
          email_verified_at: string | null;
          id: string;
          marketing_opt_in_at: string | null;
          name: string;
          phone: string;
          preferred_locale: Database["public"]["Enums"]["locale"];
          profile_completed: boolean | null;
          updated_at: string;
          user_id: string | null;
        };
        Insert: {
          created_at?: string;
          email?: string | null;
          email_verified_at?: string | null;
          id?: string;
          marketing_opt_in_at?: string | null;
          name?: string;
          phone: string;
          preferred_locale?: Database["public"]["Enums"]["locale"];
          profile_completed?: boolean | null;
          updated_at?: string;
          user_id?: string | null;
        };
        Update: {
          created_at?: string;
          email?: string | null;
          email_verified_at?: string | null;
          id?: string;
          marketing_opt_in_at?: string | null;
          name?: string;
          phone?: string;
          preferred_locale?: Database["public"]["Enums"]["locale"];
          profile_completed?: boolean | null;
          updated_at?: string;
          user_id?: string | null;
        };
        Relationships: [];
      };
      delivery_zones: {
        Row: {
          branch_id: string;
          created_at: string;
          fee_cents: number;
          id: string;
          is_active: boolean;
          min_order_cents: number;
          name_ar: string;
          name_en: string;
          slug: string;
          sort_order: number;
          updated_at: string;
        };
        Insert: {
          branch_id: string;
          created_at?: string;
          fee_cents: number;
          id?: string;
          is_active?: boolean;
          min_order_cents?: number;
          name_ar: string;
          name_en: string;
          slug: string;
          sort_order?: number;
          updated_at?: string;
        };
        Update: {
          branch_id?: string;
          created_at?: string;
          fee_cents?: number;
          id?: string;
          is_active?: boolean;
          min_order_cents?: number;
          name_ar?: string;
          name_en?: string;
          slug?: string;
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "delivery_zones_branch_id_fkey";
            columns: ["branch_id"];
            isOneToOne: false;
            referencedRelation: "branches";
            referencedColumns: ["id"];
          },
        ];
      };
      discount_codes: {
        Row: {
          code: string;
          created_at: string;
          description: string;
          ends_at: string | null;
          first_order_only: boolean;
          id: string;
          is_active: boolean;
          kind: Database["public"]["Enums"]["discount_kind"];
          max_discount_cents: number | null;
          min_subtotal_cents: number;
          starts_at: string | null;
          updated_at: string;
          usage_limit: number | null;
          usage_limit_per_customer: number | null;
          value: number;
        };
        Insert: {
          code: string;
          created_at?: string;
          description?: string;
          ends_at?: string | null;
          first_order_only?: boolean;
          id?: string;
          is_active?: boolean;
          kind: Database["public"]["Enums"]["discount_kind"];
          max_discount_cents?: number | null;
          min_subtotal_cents?: number;
          starts_at?: string | null;
          updated_at?: string;
          usage_limit?: number | null;
          usage_limit_per_customer?: number | null;
          value: number;
        };
        Update: {
          code?: string;
          created_at?: string;
          description?: string;
          ends_at?: string | null;
          first_order_only?: boolean;
          id?: string;
          is_active?: boolean;
          kind?: Database["public"]["Enums"]["discount_kind"];
          max_discount_cents?: number | null;
          min_subtotal_cents?: number;
          starts_at?: string | null;
          updated_at?: string;
          usage_limit?: number | null;
          usage_limit_per_customer?: number | null;
          value?: number;
        };
        Relationships: [];
      };
      insight_rows: {
        Row: {
          day: string;
          dim1: string;
          dim2: string;
          dim3: string;
          imported_at: string;
          metrics: Json;
          report: string;
          source: string;
        };
        Insert: {
          day: string;
          dim1?: string;
          dim2?: string;
          dim3?: string;
          imported_at?: string;
          metrics?: Json;
          report: string;
          source: string;
        };
        Update: {
          day?: string;
          dim1?: string;
          dim2?: string;
          dim3?: string;
          imported_at?: string;
          metrics?: Json;
          report?: string;
          source?: string;
        };
        Relationships: [];
      };
      job_runs: {
        Row: {
          error: string | null;
          finished_at: string | null;
          id: number;
          job: string;
          outcome: string;
          pg_net_id: number | null;
          queued_at: string;
          request: Json;
          requested_by: string | null;
          response: Json | null;
          status_code: number | null;
        };
        Insert: {
          error?: string | null;
          finished_at?: string | null;
          id?: never;
          job: string;
          outcome?: string;
          pg_net_id?: number | null;
          queued_at?: string;
          request?: Json;
          requested_by?: string | null;
          response?: Json | null;
          status_code?: number | null;
        };
        Update: {
          error?: string | null;
          finished_at?: string | null;
          id?: never;
          job?: string;
          outcome?: string;
          pg_net_id?: number | null;
          queued_at?: string;
          request?: Json;
          requested_by?: string | null;
          response?: Json | null;
          status_code?: number | null;
        };
        Relationships: [];
      };
      notifications: {
        Row: {
          attempts: number;
          channel: string;
          created_at: string;
          id: string;
          kind: string;
          last_error: string | null;
          order_id: string | null;
          payload: Json;
          provider_message_id: string | null;
          recipient: string;
          sent_at: string | null;
          status: Database["public"]["Enums"]["notification_status"];
          template: string;
        };
        Insert: {
          attempts?: number;
          channel?: string;
          created_at?: string;
          id?: string;
          kind: string;
          last_error?: string | null;
          order_id?: string | null;
          payload?: Json;
          provider_message_id?: string | null;
          recipient: string;
          sent_at?: string | null;
          status?: Database["public"]["Enums"]["notification_status"];
          template: string;
        };
        Update: {
          attempts?: number;
          channel?: string;
          created_at?: string;
          id?: string;
          kind?: string;
          last_error?: string | null;
          order_id?: string | null;
          payload?: Json;
          provider_message_id?: string | null;
          recipient?: string;
          sent_at?: string | null;
          status?: Database["public"]["Enums"]["notification_status"];
          template?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notifications_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
        ];
      };
      option_groups: {
        Row: {
          created_at: string;
          id: string;
          key: string;
          kind: Database["public"]["Enums"]["option_group_kind"];
          max_select: number;
          min_select: number;
          name_ar: string;
          name_en: string;
          source_category_id: string | null;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          key: string;
          kind?: Database["public"]["Enums"]["option_group_kind"];
          max_select: number;
          min_select?: number;
          name_ar: string;
          name_en: string;
          source_category_id?: string | null;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          key?: string;
          kind?: Database["public"]["Enums"]["option_group_kind"];
          max_select?: number;
          min_select?: number;
          name_ar?: string;
          name_en?: string;
          source_category_id?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "option_groups_source_category_id_fkey";
            columns: ["source_category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
        ];
      };
      options: {
        Row: {
          created_at: string;
          group_id: string;
          id: string;
          is_available: boolean;
          key: string;
          name_ar: string;
          name_en: string;
          price_cents: number;
          product_id: string | null;
          sort_order: number;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          group_id: string;
          id?: string;
          is_available?: boolean;
          key: string;
          name_ar: string;
          name_en: string;
          price_cents?: number;
          product_id?: string | null;
          sort_order?: number;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          group_id?: string;
          id?: string;
          is_available?: boolean;
          key?: string;
          name_ar?: string;
          name_en?: string;
          price_cents?: number;
          product_id?: string | null;
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "options_group_id_fkey";
            columns: ["group_id"];
            isOneToOne: false;
            referencedRelation: "option_groups";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "options_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      order_item_options: {
        Row: {
          group_key: string;
          group_name_ar: string;
          group_name_en: string;
          id: string;
          option_id: string | null;
          option_key: string;
          option_name_ar: string;
          option_name_en: string;
          order_item_id: string;
          price_cents: number;
        };
        Insert: {
          group_key: string;
          group_name_ar: string;
          group_name_en: string;
          id?: string;
          option_id?: string | null;
          option_key: string;
          option_name_ar: string;
          option_name_en: string;
          order_item_id: string;
          price_cents: number;
        };
        Update: {
          group_key?: string;
          group_name_ar?: string;
          group_name_en?: string;
          id?: string;
          option_id?: string | null;
          option_key?: string;
          option_name_ar?: string;
          option_name_en?: string;
          order_item_id?: string;
          price_cents?: number;
        };
        Relationships: [
          {
            foreignKeyName: "order_item_options_option_id_fkey";
            columns: ["option_id"];
            isOneToOne: false;
            referencedRelation: "options";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "order_item_options_order_item_id_fkey";
            columns: ["order_item_id"];
            isOneToOne: false;
            referencedRelation: "order_items";
            referencedColumns: ["id"];
          },
        ];
      };
      order_items: {
        Row: {
          base_price_cents: number;
          id: string;
          line_total_cents: number | null;
          name_ar: string;
          name_en: string;
          note: string;
          order_id: string;
          position: number;
          product_id: string | null;
          product_slug: string;
          quantity: number;
          unit_price_cents: number;
        };
        Insert: {
          base_price_cents: number;
          id?: string;
          line_total_cents?: number | null;
          name_ar: string;
          name_en: string;
          note?: string;
          order_id: string;
          position: number;
          product_id?: string | null;
          product_slug: string;
          quantity: number;
          unit_price_cents: number;
        };
        Update: {
          base_price_cents?: number;
          id?: string;
          line_total_cents?: number | null;
          name_ar?: string;
          name_en?: string;
          note?: string;
          order_id?: string;
          position?: number;
          product_id?: string | null;
          product_slug?: string;
          quantity?: number;
          unit_price_cents?: number;
        };
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "order_items_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      orders: {
        Row: {
          address_floor: string | null;
          address_street: string | null;
          branch_id: string;
          cancel_reason: string | null;
          cancelled_at: string | null;
          client_ip: string | null;
          client_user_agent: string | null;
          completed_at: string | null;
          customer_id: string;
          customer_name: string;
          customer_phone: string;
          delivery_fee_cents: number;
          delivery_note: string | null;
          delivery_zone_id: string | null;
          delivery_zone_name_ar: string | null;
          delivery_zone_name_en: string | null;
          discount_cents: number;
          discount_code: string | null;
          discount_code_id: string | null;
          eta_max_minutes: number;
          eta_min_minutes: number;
          fbc: string | null;
          fbp: string | null;
          fulfilment: Database["public"]["Enums"]["fulfilment"];
          id: string;
          idempotency_key: string;
          is_test: boolean;
          locale: Database["public"]["Enums"]["locale"];
          meta_relayed_at: string | null;
          number: number;
          payment_method: Database["public"]["Enums"]["payment_method"];
          payment_status: Database["public"]["Enums"]["payment_status"];
          placed_at: string;
          preparing_at: string | null;
          public_token: string;
          quoted_total_cents: number | null;
          ready_at: string | null;
          source: string;
          status: Database["public"]["Enums"]["order_status"];
          subtotal_cents: number;
          total_cents: number | null;
          updated_at: string;
          visit_id: string | null;
          visitor_id: string | null;
        };
        Insert: {
          address_floor?: string | null;
          address_street?: string | null;
          branch_id: string;
          cancel_reason?: string | null;
          cancelled_at?: string | null;
          client_ip?: string | null;
          client_user_agent?: string | null;
          completed_at?: string | null;
          customer_id: string;
          customer_name: string;
          customer_phone: string;
          delivery_fee_cents?: number;
          delivery_note?: string | null;
          delivery_zone_id?: string | null;
          delivery_zone_name_ar?: string | null;
          delivery_zone_name_en?: string | null;
          discount_cents?: number;
          discount_code?: string | null;
          discount_code_id?: string | null;
          eta_max_minutes: number;
          eta_min_minutes: number;
          fbc?: string | null;
          fbp?: string | null;
          fulfilment: Database["public"]["Enums"]["fulfilment"];
          id?: string;
          idempotency_key: string;
          is_test?: boolean;
          locale?: Database["public"]["Enums"]["locale"];
          meta_relayed_at?: string | null;
          number?: number;
          payment_method: Database["public"]["Enums"]["payment_method"];
          payment_status?: Database["public"]["Enums"]["payment_status"];
          placed_at?: string;
          preparing_at?: string | null;
          public_token?: string;
          quoted_total_cents?: number | null;
          ready_at?: string | null;
          source?: string;
          status?: Database["public"]["Enums"]["order_status"];
          subtotal_cents: number;
          total_cents?: number | null;
          updated_at?: string;
          visit_id?: string | null;
          visitor_id?: string | null;
        };
        Update: {
          address_floor?: string | null;
          address_street?: string | null;
          branch_id?: string;
          cancel_reason?: string | null;
          cancelled_at?: string | null;
          client_ip?: string | null;
          client_user_agent?: string | null;
          completed_at?: string | null;
          customer_id?: string;
          customer_name?: string;
          customer_phone?: string;
          delivery_fee_cents?: number;
          delivery_note?: string | null;
          delivery_zone_id?: string | null;
          delivery_zone_name_ar?: string | null;
          delivery_zone_name_en?: string | null;
          discount_cents?: number;
          discount_code?: string | null;
          discount_code_id?: string | null;
          eta_max_minutes?: number;
          eta_min_minutes?: number;
          fbc?: string | null;
          fbp?: string | null;
          fulfilment?: Database["public"]["Enums"]["fulfilment"];
          id?: string;
          idempotency_key?: string;
          is_test?: boolean;
          locale?: Database["public"]["Enums"]["locale"];
          meta_relayed_at?: string | null;
          number?: number;
          payment_method?: Database["public"]["Enums"]["payment_method"];
          payment_status?: Database["public"]["Enums"]["payment_status"];
          placed_at?: string;
          preparing_at?: string | null;
          public_token?: string;
          quoted_total_cents?: number | null;
          ready_at?: string | null;
          source?: string;
          status?: Database["public"]["Enums"]["order_status"];
          subtotal_cents?: number;
          total_cents?: number | null;
          updated_at?: string;
          visit_id?: string | null;
          visitor_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "orders_branch_id_fkey";
            columns: ["branch_id"];
            isOneToOne: false;
            referencedRelation: "branches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "orders_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customer_summaries";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "orders_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "orders_delivery_zone_id_fkey";
            columns: ["delivery_zone_id"];
            isOneToOne: false;
            referencedRelation: "delivery_zones";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "orders_discount_code_id_fkey";
            columns: ["discount_code_id"];
            isOneToOne: false;
            referencedRelation: "discount_code_usage";
            referencedColumns: ["code_id"];
          },
          {
            foreignKeyName: "orders_discount_code_id_fkey";
            columns: ["discount_code_id"];
            isOneToOne: false;
            referencedRelation: "discount_codes";
            referencedColumns: ["id"];
          },
        ];
      };
      product_option_groups: {
        Row: {
          default_options: string[];
          group_id: string;
          product_id: string;
          sort_order: number;
        };
        Insert: {
          default_options?: string[];
          group_id: string;
          product_id: string;
          sort_order?: number;
        };
        Update: {
          default_options?: string[];
          group_id?: string;
          product_id?: string;
          sort_order?: number;
        };
        Relationships: [
          {
            foreignKeyName: "product_option_groups_group_id_fkey";
            columns: ["group_id"];
            isOneToOne: false;
            referencedRelation: "option_groups";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "product_option_groups_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      products: {
        Row: {
          category_id: string;
          created_at: string;
          description_ar: string;
          description_en: string;
          id: string;
          image_path: string | null;
          is_active: boolean;
          is_available: boolean;
          kind: Database["public"]["Enums"]["product_kind"];
          name_ar: string;
          name_en: string;
          orderable_online: boolean;
          price_cents: number;
          slug: string;
          sort_order: number;
          tag: Database["public"]["Enums"]["product_tag"] | null;
          updated_at: string;
        };
        Insert: {
          category_id: string;
          created_at?: string;
          description_ar?: string;
          description_en?: string;
          id?: string;
          image_path?: string | null;
          is_active?: boolean;
          is_available?: boolean;
          kind?: Database["public"]["Enums"]["product_kind"];
          name_ar: string;
          name_en: string;
          orderable_online?: boolean;
          price_cents: number;
          slug: string;
          sort_order?: number;
          tag?: Database["public"]["Enums"]["product_tag"] | null;
          updated_at?: string;
        };
        Update: {
          category_id?: string;
          created_at?: string;
          description_ar?: string;
          description_en?: string;
          id?: string;
          image_path?: string | null;
          is_active?: boolean;
          is_available?: boolean;
          kind?: Database["public"]["Enums"]["product_kind"];
          name_ar?: string;
          name_en?: string;
          orderable_online?: boolean;
          price_cents?: number;
          slug?: string;
          sort_order?: number;
          tag?: Database["public"]["Enums"]["product_tag"] | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
        ];
      };
      site_settings: {
        Row: {
          is_public: boolean;
          key: string;
          updated_at: string;
          value: Json;
        };
        Insert: {
          is_public?: boolean;
          key: string;
          updated_at?: string;
          value: Json;
        };
        Update: {
          is_public?: boolean;
          key?: string;
          updated_at?: string;
          value?: Json;
        };
        Relationships: [];
      };
      staff: {
        Row: {
          created_at: string;
          display_name: string;
          is_active: boolean;
          role: Database["public"]["Enums"]["staff_role"];
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          display_name: string;
          is_active?: boolean;
          role?: Database["public"]["Enums"]["staff_role"];
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          display_name?: string;
          is_active?: boolean;
          role?: Database["public"]["Enums"]["staff_role"];
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      tracking_links: {
        Row: {
          archived: boolean;
          created_at: string;
          created_by: string | null;
          destination: string;
          id: string;
          label: string;
          url: string;
          utm_campaign: string;
          utm_content: string;
          utm_id: string;
          utm_medium: string;
          utm_source: string;
          utm_term: string;
        };
        Insert: {
          archived?: boolean;
          created_at?: string;
          created_by?: string | null;
          destination: string;
          id?: string;
          label?: string;
          url: string;
          utm_campaign: string;
          utm_content?: string;
          utm_id: string;
          utm_medium: string;
          utm_source: string;
          utm_term?: string;
        };
        Update: {
          archived?: boolean;
          created_at?: string;
          created_by?: string | null;
          destination?: string;
          id?: string;
          label?: string;
          url?: string;
          utm_campaign?: string;
          utm_content?: string;
          utm_id?: string;
          utm_medium?: string;
          utm_source?: string;
          utm_term?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      customer_summaries: {
        Row: {
          created_at: string | null;
          email: string | null;
          first_order_at: string | null;
          id: string | null;
          last_order_at: string | null;
          marketing_opt_in_at: string | null;
          name: string | null;
          orders: number | null;
          phone: string | null;
          preferred_locale: Database["public"]["Enums"]["locale"] | null;
          spent_cents: number | null;
        };
        Relationships: [];
      };
      discount_code_usage: {
        Row: {
          code_id: string | null;
          discount_cents: number | null;
          last_used_at: string | null;
          sales_cents: number | null;
          uses: number | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      audit_trail: {
        Args: {
          p_column?: string;
          p_limit?: number;
          p_row_id?: string;
          p_table?: string;
        };
        Returns: {
          action: string;
          actor_name: string;
          at: string;
          changes: Json;
          row_id: string;
          table_name: string;
        }[];
      };
      beirut_start: { Args: { p_day: string }; Returns: string };
      branch_is_open: {
        Args: { p_at?: string; p_branch: string };
        Returns: boolean;
      };
      check_discount_code: {
        Args: { p_code: string; p_phone?: string; p_subtotal_cents: number };
        Returns: Json;
      };
      create_order: {
        Args: { payload: Json };
        Returns: {
          already_placed: boolean;
          order_id: string;
          order_number: number;
          public_token: string;
          total_cents: number;
        }[];
      };
      dashboard_marketing: {
        Args: { p_from: string; p_to: string };
        Returns: Json;
      };
      dashboard_orders: {
        Args: { p_from: string; p_to: string };
        Returns: Json;
      };
      dashboard_web: { Args: { p_from: string; p_to: string }; Returns: Json };
      database_usage: {
        Args: never;
        Returns: {
          database_bytes: number;
          events: number;
          events_bytes: number;
        }[];
      };
      get_order_status: { Args: { token: string }; Returns: Json };
      health_attention: { Args: never; Returns: Json };
      health_bucket: {
        Args: {
          p_bot: boolean;
          p_event: string;
          p_internal: boolean;
          p_params: Json;
        };
        Returns: string;
      };
      health_handled: {
        Args: {
          p_bot: boolean;
          p_event: string;
          p_internal: boolean;
          p_params: Json;
        };
        Returns: string;
      };
      health_overview: { Args: never; Returns: Json };
      health_problems: { Args: { p_from: string; p_to: string }; Returns: Json };
      housekeeping: { Args: never; Returns: undefined };
      is_staff: {
        Args: { minimum?: Database["public"]["Enums"]["staff_role"] };
        Returns: boolean;
      };
      job_secret_ok: { Args: { p_secret: string }; Returns: boolean };
      merge_insight_rows: {
        Args: { p_rows: Json; p_source: string };
        Returns: number;
      };
      order_attribution: {
        Args: { p_from: string; p_to: string };
        Returns: {
          campaign: string;
          channel: string;
          content: string;
          food_cents: number;
          medium: string;
          order_id: string;
          placed_at: string;
          rule: string;
          source: string;
          term: string;
          total_cents: number;
          visit_id: string;
        }[];
      };
      order_source: { Args: { p_order: string }; Returns: Json };
      order_status_rank: {
        Args: { s: Database["public"]["Enums"]["order_status"] };
        Returns: number;
      };
      purge_event_pii: { Args: never; Returns: number };
      reconcile_jobs: { Args: never; Returns: number };
      referrer_name: { Args: { p_referrer: string }; Returns: string };
      replace_ad_performance: {
        Args: {
          p_account_id: string;
          p_platform: string;
          p_rows: Json;
          p_since: string;
          p_until: string;
        };
        Returns: Json;
      };
      replace_insight_rows: {
        Args: {
          p_report: string;
          p_rows: Json;
          p_since: string;
          p_source: string;
          p_until: string;
        };
        Returns: Json;
      };
      run_job: { Args: { p_body?: Json; p_job: string }; Returns: number };
      staff_directory: {
        Args: never;
        Returns: {
          created_at: string;
          display_name: string;
          email: string;
          is_active: boolean;
          last_sign_in_at: string;
          role: Database["public"]["Enums"]["staff_role"];
          user_id: string;
        }[];
      };
      tracking_link_results: {
        Args: never;
        Returns: {
          last_visit: string;
          orders: number;
          sales_cents: number;
          utm_id: string;
          visits: number;
        }[];
      };
      traffic_channel: {
        Args: {
          p_fbclid: string;
          p_gclid: string;
          p_medium: string;
          p_referrer_name: string;
          p_source: string;
        };
        Returns: string;
      };
      visit_summaries: {
        Args: { p_since: string; p_until: string };
        Returns: {
          campaign: string;
          carts: number;
          channel: string;
          checkouts: number;
          content: string;
          country: string;
          device: string;
          events: number;
          exit_page: string;
          item_views: number;
          landing_page: string;
          locale: string;
          medium: string;
          ordered: boolean;
          page_views: number;
          paid: boolean;
          source: string;
          started_at: string;
          term: string;
          touch_at: string;
          visit_id: string;
          visitor_id: string;
        }[];
      };
    };
    Enums: {
      discount_kind: "percent" | "amount";
      fulfilment: "pickup" | "delivery";
      locale: "en" | "ar";
      notification_status: "queued" | "sending" | "sent" | "failed";
      option_group_kind: "options" | "items";
      order_status:
        "received" | "preparing" | "ready" | "out_for_delivery" | "completed" | "cancelled";
      payment_method: "cash_on_delivery" | "pay_at_pickup";
      payment_status: "unpaid" | "paid" | "refunded";
      product_kind: "item" | "bundle";
      product_tag: "fav" | "new" | "limited";
      staff_role: "staff" | "manager" | "owner";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      discount_kind: ["percent", "amount"],
      fulfilment: ["pickup", "delivery"],
      locale: ["en", "ar"],
      notification_status: ["queued", "sending", "sent", "failed"],
      option_group_kind: ["options", "items"],
      order_status: [
        "received",
        "preparing",
        "ready",
        "out_for_delivery",
        "completed",
        "cancelled",
      ],
      payment_method: ["cash_on_delivery", "pay_at_pickup"],
      payment_status: ["unpaid", "paid", "refunded"],
      product_kind: ["item", "bundle"],
      product_tag: ["fav", "new", "limited"],
      staff_role: ["staff", "manager", "owner"],
    },
  },
} as const;
