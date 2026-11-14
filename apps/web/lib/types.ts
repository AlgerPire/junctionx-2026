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
  /** Skill overlap vs must-haves (0–100). Not a hiring score. */
  skill_overlap_pct?: number | null;
  must_have_total?: number | null;
  must_have_covered?: number | null;
  approach_status?: string | null;
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
  created_at?: string | null;
  skills: BriefSkill[];
}

export interface StorySkill {
  skill_id: number;
  label: string;
  evidence_quote: string;
  seeker_confirmed: boolean;
}

export type InviteStatus = "invited" | "accepted" | "declined" | "withdrawn";

export interface Invite {
  id: number;
  brief_id: number;
  seeker_id: number;
  status: InviteStatus;
  message: string;
  proposed_slot: string;
  created_at?: string | null;
  responded_at?: string | null;
  brief_title?: string | null;
  company_name?: string | null;
  seeker_alias?: string | null;
  seeker_display_name?: string | null;
}

export interface MustHaveCheck {
  skill: string;
  status: "evidenced" | "related" | "not_evidenced";
  seeker_skill?: string | null;
  evidence_quote?: string | null;
}

export interface ReviewFlag {
  kind:
    | "unconfirmed_skill"
    | "short_evidence"
    | "shared_quote"
    | "similar_phrasing"
    | "missing_must_have"
    | "consideration";
  text: string;
  skill?: string | null;
}

export interface CandidateReview {
  suggestion: Suggestion;
  must_haves: MustHaveCheck[];
  flags: ReviewFlag[];
  provenance: string[];
  skills: StorySkill[];
  approved_at?: string | null;
  invite: Invite | null;
  approach_status?: string | null;
}

export interface BriefStats {
  brief_id: number;
  title: string;
  status: string;
  work_mode: string;
  created_at?: string | null;
  must_count: number;
  learnable_count: number;
  nice_count: number;
  languages: LanguageLevel[];
  candidates: Record<Bucket, number>;
  requests: Record<"requested" | "accepted" | "declined", number>;
  invites: Record<"invited" | "accepted" | "declined", number>;
  queue_est_minutes: number;
}

export interface Approach {
  id: number;
  seeker_id: number;
  brief_id: number;
  status: "requested" | "accepted" | "declined" | "done";
  created_at?: string | null;
  decided_at?: string | null;
  seeker_alias?: string | null;
  brief_title?: string | null;
  queue_est_minutes?: number | null;
  seeker_display_name?: string | null;
  bucket?: Bucket | null;
  fit_summary?: string | null;
}

export interface InboxItem {
  approach: Approach;
  story: { approved_at?: string | null; skills: StorySkill[] } | null;
}
