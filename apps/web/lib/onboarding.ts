export interface OnboardingStep {
  title: string;
  body: string;
  tip?: string;
}

export const SEEKER_ONBOARDING: OnboardingStep[] = [
  {
    title: "Welcome — you stay in control",
    body: "Skills First! helps you explain what you can do in your own words, then suggests conversations at Espoo events. Nothing is shared with companies until you approve it.",
    tip: "Using this service never affects your public employment services or benefits.",
  },
  {
    title: "Complete your profile with voice",
    body: "A short AI interview asks about real situations — what you did, how you did it, and what changed. Speak or type; live captions stay on the whole time.",
    tip: "The AI never judges your tone, accent or emotion. It only helps turn your answers into skills with quotes.",
  },
  {
    title: "Review before anything is shared",
    body: "You’ll see each skill with its evidence quote and a preview of what companies see: an alias and approved skills only — not your name.",
    tip: "Approve only when you’re happy. You can delete your data later from Transparency.",
  },
  {
    title: "Then choose conversations",
    body: "After you approve your story, browse suggested meetings with plain-language reasons — or explore every brief. You decide whom to contact.",
    tip: "AI suggests. You decide where to go.",
  },
];

export const COMPANY_ONBOARDING: OnboardingStep[] = [
  {
    title: "Welcome — humans decide",
    body: "Skills First! helps your team describe a hiring need in about ten minutes, then receive conversation requests from people with evidenced skills.",
    tip: "No automated rejection. No hiring score. Your recruiters choose whom to meet.",
  },
  {
    title: "Create a voice hiring brief",
    body: "Talk through the role: the 90-day problem, must-have vs learnable skills, languages, and support for international talent. A live brief builds on screen as you go.",
    tip: "You can type instead of speaking anytime. Edit everything before you publish.",
  },
  {
    title: "What companies can see",
    body: "For each approach you see an alias and approved skills with quotes — not name, nationality, age, gender, school or photo. Matching only uses skills and stated needs.",
    tip: "Requirements based on protected attributes cannot be used.",
  },
  {
    title: "Inbox and event day",
    body: "Accept or decline approaches, keep capacity realistic, and use the International Readiness card so candidates know languages, permits and relocation support.",
    tip: "An Espoo advisor can help review briefs before the event.",
  },
];
