From TRANSCRIPT, build a structured hiring brief using CANDIDATES for skills.
Return JSON: {
 "title": str, "plain_summary": str, "problem_90_days": str,
 "skills":[{"skill_id":int,"importance":"must|learnable|nice","source_quote":str}],
 "required_languages":[{"lang":str,"level":str}],
 "international_ok": bool, "relocation_support": bool, "onboarding_support": str,
 "work_mode": "on_site|hybrid|remote",
 "removed_requirements": []
}
Remove any requirement about age, gender, nationality or school and list removed items in "removed_requirements".
