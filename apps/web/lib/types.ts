/** Mirror of backend DTOs */

export type PersonaRole = "company" | "seeker" | "organiser";

export interface Persona {
  id: string;
  role: PersonaRole;
  label: string;
}

export interface SkillRef {
  skill_id: number;
  label: string;
}

export type Bucket = "strong" | "good" | "explore";

export interface Reason {
  type: "direct" | "transferable" | "learnable_gap" | "consideration";
  brief_skill?: string | null;
  seeker_skill?: string | null;
  evidence_quote?: string | null;
  text: string;
}

export interface Suggestion {
  brief_id: number;
  seeker_id: number;
  bucket: Bucket;
  reasons: Reason[];
  data_used: string[];
  company_name?: string | null;
  brief_summary?: string | null;
  seeker_alias?: string | null;
  fit_summary?: string | null;
  gaps_summary?: string | null;
  overview?: string | null;
}

export interface SuggestionsResponse {
  suggestions: Suggestion[];
  budget_remaining: number | null;
}

export interface LanguageLevel {
  lang: string;
  level: string;
}

export interface BriefSkill {
  skill_id: number;
  label: string;
  importance: "must" | "learnable" | "nice";
  source_quote?: string | null;
}

export interface Brief {
  id: number;
  company_id: number;
  event_id: number;
  title: string;
  plain_summary: string;
  problem_90_days: string;
  status: string;
  required_languages: LanguageLevel[];
  international_ok: boolean;
  relocation_support: boolean;
  onboarding_support: string;
  permit_info_url: string | null;
  work_mode: string;
  tables: number;
  slot_minutes: number;
  company_name?: string | null;
  skills: BriefSkill[];
}
