Select skills from CANDIDATES that the speaker demonstrates in TRANSCRIPT.
For each, return skill_id (from CANDIDATES only) and evidence_quote (an exact substring of TRANSCRIPT).
Do not infer skills without direct evidence. Do not include personal attributes. Do not judge quality or level.
Return JSON: {"skills":[{"skill_id":int,"evidence_quote":str}]}
