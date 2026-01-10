export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      ball_by_ball: {
        Row: {
          ai_commentary: string | null
          ball_number: number
          batsman_id: string | null
          bowler_id: string | null
          commentary: string | null
          created_at: string
          dismissed_player_id: string | null
          extra_type: string | null
          extras: number | null
          fielder_id: string | null
          id: string
          innings: number
          is_wicket: boolean | null
          match_id: string
          over_number: number
          runs: number | null
          wicket_type: string | null
        }
        Insert: {
          ai_commentary?: string | null
          ball_number: number
          batsman_id?: string | null
          bowler_id?: string | null
          commentary?: string | null
          created_at?: string
          dismissed_player_id?: string | null
          extra_type?: string | null
          extras?: number | null
          fielder_id?: string | null
          id?: string
          innings: number
          is_wicket?: boolean | null
          match_id: string
          over_number: number
          runs?: number | null
          wicket_type?: string | null
        }
        Update: {
          ai_commentary?: string | null
          ball_number?: number
          batsman_id?: string | null
          bowler_id?: string | null
          commentary?: string | null
          created_at?: string
          dismissed_player_id?: string | null
          extra_type?: string | null
          extras?: number | null
          fielder_id?: string | null
          id?: string
          innings?: number
          is_wicket?: boolean | null
          match_id?: string
          over_number?: number
          runs?: number | null
          wicket_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ball_by_ball_batsman_id_fkey"
            columns: ["batsman_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ball_by_ball_bowler_id_fkey"
            columns: ["bowler_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ball_by_ball_dismissed_player_id_fkey"
            columns: ["dismissed_player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ball_by_ball_fielder_id_fkey"
            columns: ["fielder_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ball_by_ball_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      match_summaries: {
        Row: {
          best_batter_id: string | null
          best_bowler_id: string | null
          best_fielder_id: string | null
          created_at: string
          id: string
          innings1_batting: Json | null
          innings1_bowling: Json | null
          innings1_fow: Json | null
          innings1_score: Json | null
          innings2_batting: Json | null
          innings2_bowling: Json | null
          innings2_fow: Json | null
          innings2_score: Json | null
          match_id: string
          player_of_match_id: string | null
        }
        Insert: {
          best_batter_id?: string | null
          best_bowler_id?: string | null
          best_fielder_id?: string | null
          created_at?: string
          id?: string
          innings1_batting?: Json | null
          innings1_bowling?: Json | null
          innings1_fow?: Json | null
          innings1_score?: Json | null
          innings2_batting?: Json | null
          innings2_bowling?: Json | null
          innings2_fow?: Json | null
          innings2_score?: Json | null
          match_id: string
          player_of_match_id?: string | null
        }
        Update: {
          best_batter_id?: string | null
          best_bowler_id?: string | null
          best_fielder_id?: string | null
          created_at?: string
          id?: string
          innings1_batting?: Json | null
          innings1_bowling?: Json | null
          innings1_fow?: Json | null
          innings1_score?: Json | null
          innings2_batting?: Json | null
          innings2_bowling?: Json | null
          innings2_fow?: Json | null
          innings2_score?: Json | null
          match_id?: string
          player_of_match_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "match_summaries_best_batter_id_fkey"
            columns: ["best_batter_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_summaries_best_bowler_id_fkey"
            columns: ["best_bowler_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_summaries_best_fielder_id_fkey"
            columns: ["best_fielder_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_summaries_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: true
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_summaries_player_of_match_id_fkey"
            columns: ["player_of_match_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      matches: {
        Row: {
          created_at: string
          id: string
          match_number: number | null
          result_summary: string | null
          round: string | null
          scheduled_at: string | null
          status: Database["public"]["Enums"]["match_status"]
          team1_id: string
          team1_score: Json | null
          team2_id: string
          team2_score: Json | null
          toss_decision: string | null
          toss_winner_id: string | null
          tournament_id: string
          updated_at: string
          venue: string | null
          winner_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          match_number?: number | null
          result_summary?: string | null
          round?: string | null
          scheduled_at?: string | null
          status?: Database["public"]["Enums"]["match_status"]
          team1_id: string
          team1_score?: Json | null
          team2_id: string
          team2_score?: Json | null
          toss_decision?: string | null
          toss_winner_id?: string | null
          tournament_id: string
          updated_at?: string
          venue?: string | null
          winner_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          match_number?: number | null
          result_summary?: string | null
          round?: string | null
          scheduled_at?: string | null
          status?: Database["public"]["Enums"]["match_status"]
          team1_id?: string
          team1_score?: Json | null
          team2_id?: string
          team2_score?: Json | null
          toss_decision?: string | null
          toss_winner_id?: string | null
          tournament_id?: string
          updated_at?: string
          venue?: string | null
          winner_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "matches_team1_id_fkey"
            columns: ["team1_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_team2_id_fkey"
            columns: ["team2_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_toss_winner_id_fkey"
            columns: ["toss_winner_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      player_team_history: {
        Row: {
          created_at: string
          id: string
          joined_at: string
          left_at: string | null
          player_id: string
          stats: Json | null
          team_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          joined_at?: string
          left_at?: string | null
          player_id: string
          stats?: Json | null
          team_id: string
        }
        Update: {
          created_at?: string
          id?: string
          joined_at?: string
          left_at?: string | null
          player_id?: string
          stats?: Json | null
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_team_history_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_team_history_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      players: {
        Row: {
          batting_style: string | null
          bowling_style: string | null
          created_at: string
          id: string
          image_url: string | null
          jersey_number: number | null
          name: string
          role: string | null
          stats: Json | null
          team_id: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          batting_style?: string | null
          bowling_style?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          jersey_number?: number | null
          name: string
          role?: string | null
          stats?: Json | null
          team_id: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          batting_style?: string | null
          bowling_style?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          jersey_number?: number | null
          name?: string
          role?: string | null
          stats?: Json | null
          team_id?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "players_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          role: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          role?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          role?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      teams: {
        Row: {
          created_at: string
          id: string
          logo_url: string | null
          name: string
          owner_id: string
          sport: Database["public"]["Enums"]["sport_type"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name: string
          owner_id: string
          sport: Database["public"]["Enums"]["sport_type"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name?: string
          owner_id?: string
          sport?: Database["public"]["Enums"]["sport_type"]
          updated_at?: string
        }
        Relationships: []
      }
      tournament_teams: {
        Row: {
          created_at: string
          group_name: string | null
          id: string
          seed: number | null
          team_id: string
          tournament_id: string
        }
        Insert: {
          created_at?: string
          group_name?: string | null
          id?: string
          seed?: number | null
          team_id: string
          tournament_id: string
        }
        Update: {
          created_at?: string
          group_name?: string | null
          id?: string
          seed?: number | null
          team_id?: string
          tournament_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournament_teams_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_teams_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      tournaments: {
        Row: {
          created_at: string
          description: string | null
          end_date: string | null
          format: Database["public"]["Enums"]["tournament_format"]
          id: string
          max_teams: number | null
          name: string
          organizer_id: string
          prize_pool: string | null
          rules: Json | null
          sport: Database["public"]["Enums"]["sport_type"]
          start_date: string | null
          status: Database["public"]["Enums"]["tournament_status"]
          updated_at: string
          venue: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          end_date?: string | null
          format?: Database["public"]["Enums"]["tournament_format"]
          id?: string
          max_teams?: number | null
          name: string
          organizer_id: string
          prize_pool?: string | null
          rules?: Json | null
          sport: Database["public"]["Enums"]["sport_type"]
          start_date?: string | null
          status?: Database["public"]["Enums"]["tournament_status"]
          updated_at?: string
          venue?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          end_date?: string | null
          format?: Database["public"]["Enums"]["tournament_format"]
          id?: string
          max_teams?: number | null
          name?: string
          organizer_id?: string
          prize_pool?: string | null
          rules?: Json | null
          sport?: Database["public"]["Enums"]["sport_type"]
          start_date?: string | null
          status?: Database["public"]["Enums"]["tournament_status"]
          updated_at?: string
          venue?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      match_status:
        | "scheduled"
        | "live"
        | "completed"
        | "abandoned"
        | "postponed"
      sport_type:
        | "cricket"
        | "football"
        | "basketball"
        | "volleyball"
        | "badminton"
        | "tennis"
        | "kabaddi"
        | "hockey"
        | "athletics"
        | "esports"
        | "custom"
      tournament_format:
        | "knockout"
        | "league"
        | "round_robin"
        | "swiss"
        | "group_knockout"
        | "custom"
      tournament_status:
        | "draft"
        | "registration"
        | "active"
        | "completed"
        | "cancelled"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      match_status: [
        "scheduled",
        "live",
        "completed",
        "abandoned",
        "postponed",
      ],
      sport_type: [
        "cricket",
        "football",
        "basketball",
        "volleyball",
        "badminton",
        "tennis",
        "kabaddi",
        "hockey",
        "athletics",
        "esports",
        "custom",
      ],
      tournament_format: [
        "knockout",
        "league",
        "round_robin",
        "swiss",
        "group_knockout",
        "custom",
      ],
      tournament_status: [
        "draft",
        "registration",
        "active",
        "completed",
        "cancelled",
      ],
    },
  },
} as const
