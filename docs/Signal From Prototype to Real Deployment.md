# Signal: From Prototype to Real Deployment

Rollout plan for the City of Espoo recruitment and matchmaking events · Draft for discussion, 14 November 2026 · Not legal advice: every legal point needs confirmation by Espoo’s data protection officer and legal counsel.

## 1. What “real” means

The hackathon prototype uses synthetic data, demo personas with no login, and cached demo turns. A real deployment needs verified companies, real jobseekers who have given informed consent, real skills data, EU-based hosting, named people who are accountable, and results we can measure.

Three principles guide the plan:

- **Start small.** One closed pilot event before anything scales.
- **Humans stay in charge.** Signal suggests and explains. Espoo staff, company recruiters and jobseekers decide. Nobody is scored, ranked out or rejected by the system.
- **Earn trust before features.** Privacy, fairness and accessibility work comes first, because Espoo’s biggest challenge is that companies doubt the city’s service.

## 2. Governance and legal groundwork (weeks 1 to 4, before any real data)

**Roles and contracts**

- City of Espoo is the data controller. The delivery team, hosting provider, speech-to-text provider and language-model provider are processors under data processing agreements.
- Provider terms must say: no training on Espoo data, minimal or zero retention, and processing inside the EU/EEA.

**Lawful basis and consent**

- Confirm the lawful basis with the data protection officer. The likely design is explicit, withdrawable consent for the Skill Story, kept separate from the city’s employment services.
- Using Signal must never affect a jobseeker’s access to services or benefits. Say this in plain words in the sign-up flow.
- Complete a data protection impact assessment (DPIA) before the pilot.

**EU AI Act**

- AI used for recruitment and selection can fall under the high-risk category (Annex III, employment). Signal is built as decision support with no scoring or ranking of people, but the final classification needs a written legal opinion on its intended purpose. Plan as if it is high-risk.
- Timing: according to current reports, the Digital Omnibus (Regulation (EU) 2026/1744, in force since 27 July 2026) moved the application date for stand-alone high-risk obligations to 2 December 2027, while transparency duties (people must know they are dealing with AI) apply from 2 August 2026. Confirm the exact dates, and whether anything differs for public authorities, with counsel.
- Prohibited practices already apply. Inferring emotions in workplace contexts is restricted, so Signal uses voice only for transcription and never analyses tone, accent or emotion.
- Prepare high-risk-style documentation anyway: risk management, data governance, logging, human oversight, accuracy and robustness testing, and staff AI-literacy training.

**Finnish and public-sector requirements to check**

- Rules on the privacy of applicants in working life and the non-discrimination act.
- Public-sector accessibility requirements for digital services (WCAG 2.1 AA level and an accessibility statement).
- Espoo’s information-security assessment and procurement route (small pilot, innovation procurement or framework). Decide the route early, since it sets the timeline.

**Oversight group**

- A small advisory group: Espoo advisors, one or two company representatives, jobseeker representatives (including international talent), and an outside AI and fairness expert. It meets before and after the pilot.

**Exit criteria for this phase:** DPIA approved, processing agreements signed, written classification note, pilot scope and success metrics agreed.

## 3. Real data: what we use and where it comes from

**Skills taxonomy**

- Use ESCO (European Skills, Competences, Qualifications and Occupations). It is multilingual, including Finnish, Swedish and English.
- Import the full skills list. Add a synonyms layer for fast-moving areas such as software and data. Allow a free-text skill that is flagged for advisor review when ESCO has no match.

**Demand-side data**

- The main source is the brief the company gives us, in its own words, approved by the company.
- For benchmarking, use open job data such as Job Market Finland and Work in Finland listings. Check each source’s terms and API availability. Do not scrape sites against their terms.

**Company verification**

- Check the business ID against the Finnish Patent and Registration Office (PRH) business information service, then have an Espoo advisor approve the account.

**Jobseeker data**

- Only what people choose to give: skills with their own quotes, working languages, whether they need relocation information, and availability.
- No scraping of social profiles, no purchased data. An optional “paste your CV to prefill” can be added later, processed as input only and with consent.

**Event data**

- Registration lists from Espoo’s current event platform, through an export or integration, with only the fields Signal needs.

**Benchmarks for the organiser dashboard**

- Statistics Finland and the national skills anticipation work, shown as context and never as a judgment about a person.

**Data minimisation**

- Collected: pseudonymous alias, approved skills with quotes, stated languages, event choices, approach history.
- Not collected and never used for matching: name in matching views, nationality, age, gender, school, photo, address, voice characteristics.

**Retention (to be confirmed by the data protection officer)**

- Audio is never stored.
- Transcripts are deleted when the person approves their story, or within 24 hours at the latest.
- Approved stories are removed a fixed period after the event unless the person renews them.
- Audit logs are kept for a defined period. Deletion on request is handled within a defined time.

**Evaluation data**

- Build a “golden set” of 100 to 200 brief and profile pairs, labelled by Espoo advisors, from consenting participants or anonymised material, plus synthetic cases. Never train models on user data without separate consent.

## 4. Production changes: prototype to real system

- **Identity and access:** magic-link sign-in for jobseekers and company contacts, optional Suomi.fi e-identification later, role-based access (jobseeker, company, advisor, event staff, administrator, data protection view), an advisor approval step for companies.
- **Hosting and data:** EU/EEA cloud region, encrypted storage and transport, separate environments, backups, and a documented deletion process.
- **Speech and language models:** providers under contract (no training, minimal retention, EU processing). Keep an adapter so a provider can be replaced. Freeze model versions for each event and log which version produced which output.
- **Matching:** unchanged principle, deterministic code that sees only skills, stated needs and stated languages. Thresholds recalibrated on real data (section 7).
- **Audit and transparency:** user-visible log of what was shared and why. Internal log of every AI call (prompt version and ids, not transcripts).
- **Accessibility:** WCAG 2.1 AA testing with real users and assistive technology, captions and a text option for every voice feature, plain-language copy in Finnish, Swedish and English.
- **Reliability for event day:** static pre-registration and check-in pages, a waiting room for the start of the event, caching on read endpoints, load testing at several times the expected attendance, monitoring and alerting.
- **Security:** penetration test, dependency scanning, secrets management, an incident response runbook.
- **Integrations:** export and import with the existing event platform, a notification channel for reminders (email first).

## 5. Onboarding

### 5.1 Company onboarding (counting back from event day, T)

The goal is a usable brief before the event, with as little effort as possible. Companies are hard to engage, so the first contact is a person, not a form.

1. **Invite (T minus 8 weeks).** An Espoo business advisor invites the company, explains the ten-minute brief, and shows what the last event produced. Be honest that this is a pilot.
2. **Account and verification.** The contact person signs in by magic link. Signal checks the business ID, and an advisor approves the account.
3. **Terms and code of conduct.** Plain-language terms: what jobseekers can see, that candidate information is used for event conversations only, and that requirements based on age, gender, nationality or school cannot be used.
4. **The brief interview.** The company speaks or types for about ten minutes. Signal asks about the problem to solve in the first 90 days, must-have skills, what can be learned on the job, languages, openness to international candidates, and relocation and onboarding support. An advisor-assisted version is always available: the advisor runs the same interview with the company on a call.
5. **Review and publish.** The company edits the brief. An advisor reviews it for discriminatory wording and unclear requirements. The International Readiness card (languages, permit route, relocation and onboarding support) is filled in with advisor help.
6. **Event setup.** Number of tables, conversation length, who attends, who receives follow-ups.
7. **Reminders.** At T minus 21, 14 and 10 days. If there is still no brief at T minus 14, the advisor drafts one from the company’s public job ads and the company approves it.
8. **Event day and after.** Check-in help desk, then a follow-up digest and a short feedback form.

**Measure:** share of companies with a published brief by T minus 14, minutes spent, satisfaction.

### 5.2 Jobseeker onboarding

**Entry points:** invitation through Espoo employment services, public sign-up for the event, and partner organisations (for example integration services and international communities). The service is for adults only.

1. **Sign up** with email or phone. Collect as little as possible.
2. **Layered privacy notice** in Finnish, Swedish and English: what is shared, with whom, when, and how to delete it. State that Signal does not affect their public services.
3. **Choose language and input:** speak or type.
4. **Skill Story (about 8 to 10 minutes).** A short example first, then three real situations. Support is available through assisted sessions at an Espoo service point, a “skills clinic” with staff, or a staff member filling it in together with the person.
5. **Review and approve.** Each skill is shown with its quote. The person can remove, add or edit, and sees a preview of what companies will see. Nothing is shared until they approve.
6. **Event preparation.** Suggested conversations with reasons, a limited number of approaches and how to use them, and International Readiness information for each role.
7. **After the event.** Follow-up notes, a feedback form, and a clear choice to renew or delete their data.

**Inclusion:** a paper or staff-assisted route, support for people with limited digital skills, screen-reader testing, and no penalty for weak speech recognition because every transcript can be edited and text is always available.

**Measure:** story completion rate, share of skills the person edits, perceived accuracy, relevant conversations held.

### 5.3 Espoo staff onboarding

- Roles: advisor, event staff, administrator, and a read-only view for the data protection officer.
- Training before the pilot: how suggestions are produced and explained, what human oversight means in practice, handling complaints and deletion requests, and AI literacy.
- A short runbook for each role and a named contact for incidents.

### 5.4 Event-day operations

- Static check-in and agenda page, waiting room at opening, and a support desk with staff who can use the system for people.
- A printed fallback agenda and a manual queue if systems fail.
- A monitoring screen for staff and an incident channel.

## 6. Step-by-step implementation roadmap

Timing assumes a core team of about five people and active Espoo participation. Treat the weeks as a starting estimate.

### Phase 0: Discovery and co-design (weeks 1 to 4)

- Interview five companies, ten jobseekers (including international talent) and the Espoo advisors. Observe a real event.
- Agree the pilot scope, success metrics and procurement route.
- Complete the governance work in section 2.
- **Exit:** signed scope, DPIA approved, oversight group formed.

### Phase 1: Foundation (weeks 3 to 9)

- Production hosting, identity and roles, consent and deletion flows, audit log, EU-region provider contracts.
- Import ESCO in Finnish, Swedish and English and build the synonyms layer.
- Accessibility baseline and plain-language copy.
- **Exit:** a user can sign up, consent, and delete their data end to end in the test environment.

### Phase 2: Real-data pipeline and matching calibration (weeks 8 to 14)

- Voice and text interview flows with real providers. Evidence validation (every quote must be an exact excerpt of what the person said).
- Build the golden set with advisors. Calibrate thresholds. Test across Finnish, Swedish and English.
- Run the counterfactual fairness tests on every build.
- **Exit:** agreed accuracy and fairness criteria met on the golden set.

### Phase 3: Onboarding flows and staff tools (weeks 10 to 16)

- Company and jobseeker onboarding as in section 5, advisor review screens, reminder emails, assisted-session mode.
- Organiser dashboard with small-number suppression, so no one can be identified from aggregates.
- Load test and event-day runbook.
- **Exit:** usability tests with real companies and jobseekers pass. Accessibility audit has no blocking issues.

### Phase 4: Closed pilot event (weeks 16 to 20)

- A small event: about ten companies and fifty to one hundred jobseekers who volunteered.
- Advisors observe, collect feedback on the spot, and can override or correct anything.
- **Exit:** event held without a data incident, with feedback and metrics collected.

### Phase 5: Evaluation and audit (weeks 20 to 24)

- Review results against the success metrics in section 9.
- Independent review of fairness, security and accessibility.
- Fix findings, update the DPIA and documentation, and decide with the oversight group whether to scale.
- **Exit:** written go or no-go decision.

### Phase 6: Scale (months 7 to 12)

- Integrate with the event platform, add more events and larger volumes.
- Add Finnish and Swedish voice quality improvements and more skill clusters.
- Set service levels and hand over operations and support to a named owner.

## 7. Making matching work on real data

- **Calibrate with people.** Compare Signal’s suggestions with what advisors would suggest on the golden set. Track the advisor override rate over time.
- **Language parity.** The same skill described in Finnish, Swedish or English must produce the same match. Test this on every release.
- **ESCO gaps.** Review skills that people mention and ESCO cannot match, add synonyms, and keep a reviewed list.
- **Extraction quality.** Track how often people remove or add skills, how long the story takes, and whether quotes support the skill. Quotes are validated by code, so a skill without a real quote is dropped.
- **Speech fairness.** Measure transcription accuracy across accents and speaking styles with consented test recordings. Since the person reviews and edits the transcript and text input is always available, speech quality must never reduce someone’s chances.
- **Fairness monitoring.** Keep the counterfactual test (change non-skill attributes and confirm suggestions stay identical). Add outcome monitoring only if the data protection officer approves collecting voluntary, separate and aggregated demographic data.
- **Change control.** Freeze model and threshold versions per event, log them, and retest before any upgrade.

## 8. Human oversight and accountability

- Every suggestion is advice. Companies choose whom to meet, jobseekers choose where to go, and advisors can override.
- Plain-language explanation for each suggestion and a way to ask a human “why”.
- A complaints and correction route with a response time, plus a deletion route.
- A visible notice that people are interacting with AI and that no automated decision is made about them.
- Named owners for incidents, model changes and data requests.

## 9. Success metrics (targets to agree with Espoo)

- **Companies:** brief published by T minus 14 days, minutes to complete, relevance of conversations, intention to return.
- **Jobseekers:** story completion, edit rate, perceived accuracy, relevant conversations, follow-up contacts.
- **Espoo:** advisor workload, visibility of supply gaps before the event, company retention to the next event.
- **Outcomes:** interviews and hires reported voluntarily after three months.
- **Safety and trust:** fairness tests passed, accessibility audit result, complaints, and zero data incidents.

## 10. Main risks and mitigations

- **Companies do not engage.** A personal invitation from an advisor, advisor-assisted briefs, a ten-minute commitment, and proof from the pilot.
- **Low digital confidence among jobseekers.** Assisted sessions, a staff-completed option and a paper route.
- **Poor Finnish speech recognition.** Always offer text, editable transcripts, test providers early, and measure by language.
- **Legal classification is stricter than expected.** Build to high-risk standards from the start and get the legal opinion in phase 0.
- **Suggestions look arbitrary.** Reasons with quotes, advisor calibration, and a visible “why” panel.
- **Event-day crash.** Static check-in, waiting room, load tests, and a manual fallback.
- **Provider changes or outages.** An adapter layer, a second provider on standby, and frozen versions per event.
- **Scope creep.** Keep to briefs, stories, suggestions, approaches and the organiser view until the pilot is evaluated.

## 11. Team and roles

- Product owner from Espoo, plus two or three advisors who join design sessions.
- Delivery team: technical lead, two engineers, a designer, and part-time input from a data protection specialist, an accessibility expert and an AI fairness reviewer.
- External: legal counsel for the AI Act classification and an independent security tester.

## 12. First 30 days checklist

- Name the product owner, the data protection contact and the oversight group.
- Commission the legal opinion on the AI Act classification and the lawful basis.
- Choose the pilot event, size and date, and the procurement route.
- Interview five companies, ten jobseekers and the advisors, and observe a live event.
- Start the DPIA and draft the plain-language privacy notice.
- Select speech and language providers, and request EU-processing and no-training terms.
- Import ESCO and start the synonyms list.
- Define metrics and baseline numbers from the last event (briefs received late, approaches per company, advisor hours).
- Plan the golden set labelling sessions with advisors.
