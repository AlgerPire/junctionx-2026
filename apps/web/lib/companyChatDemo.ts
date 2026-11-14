import type { ChatMessage } from "@/components/dashboard/ChatBubbles";
import type { SpeechLangCode } from "@/lib/speechLang";

export type DemoQa = { user: string; assistant: string };

export type CompanyChatDemoPack = {
  placeholder: string;
  greeting: string;
  /** Common hiring questions — a random subset plays each run. */
  questions: DemoQa[];
};

export const COMPANY_CHAT_DEMOS: Record<SpeechLangCode, CompanyChatDemoPack> = {
  "en-GB": {
    placeholder: "Ask the assistant anything…",
    greeting: "Hi! Need a new job, a candidate, or an invite?",
    questions: [
      {
        user: "Show candidates for our data analyst role.",
        assistant: "I can open that list — you decide who to invite.",
      },
      {
        user: "Draft a job for a clinical data analyst.",
        assistant: "Sure — I'll open a new job and we can fill it by voice.",
      },
      {
        user: "What's in my inbox right now?",
        assistant: "I'll take you to open requests so you can review them.",
      },
      {
        user: "Invite the strongest match for the analyst job.",
        assistant: "I can open their profile — you choose whether to send the invite.",
      },
      {
        user: "Find people with SQL and stakeholder storytelling.",
        assistant: "I'll filter by those skills and show who fits — you pick next.",
      },
      {
        user: "Open my published jobs.",
        assistant: "Opening your jobs list so you can jump into any role.",
      },
      {
        user: "How does matching work here?",
        assistant: "We match on skills and evidence only — humans always decide.",
      },
      {
        user: "Start a hybrid nursing coordinator job.",
        assistant: "Let's draft that together — you stay in control of every field.",
      },
    ],
  },
  "fi-FI": {
    placeholder: "Kysy assistentilta mitä tahansa…",
    greeting: "Hei! Tarvitsetko uuden työpaikan, ehdokkaan vai kutsun?",
    questions: [
      {
        user: "Näytä data-analyytikon ehdokkaat.",
        assistant: "Voin avata listan — sinä päätät kenet kutsut.",
      },
      {
        user: "Laadi työpaikka kliiniselle data-analyytikolle.",
        assistant: "Selvä — avaan uuden työpaikan, ja voimme täyttää sen äänellä.",
      },
      {
        user: "Mitä inboxissani on?",
        assistant: "Vien sinut avoimiin pyyntöihin, jotta voit tarkastella niitä.",
      },
      {
        user: "Kutsu paras osuma analyytikkotyöhön.",
        assistant: "Voin avata profiilin — sinä päätät lähetätkö kutsun.",
      },
      {
        user: "Etsi SQL-osaajia, joilla on sidosryhmäviestintää.",
        assistant: "Suodatan noilla taidoilla ja näytän sopivat — sinä valitset.",
      },
      {
        user: "Avaa julkaistut työpaikkani.",
        assistant: "Avaa työpaikkalistasi, jotta pääset mihin tahansa rooliin.",
      },
      {
        user: "Miten matching toimii?",
        assistant: "Vastaamme taitoihin ja näyttöön — ihminen päättää aina.",
      },
      {
        user: "Aloita hybridinen nursing coordinator -työpaikka.",
        assistant: "Tehdään se yhdessä — pidät jokaisen kentän hallinnassa.",
      },
    ],
  },
  "sv-SE": {
    placeholder: "Fråga assistenten om vad som helst…",
    greeting: "Hej! Behöver du en jobbannons, en kandidat eller en inbjudan?",
    questions: [
      {
        user: "Visa kandidater till dataanalytikerrollen.",
        assistant: "Jag kan öppna listan — du bestämmer vem du bjuder in.",
      },
      {
        user: "Skriv en jobbannons för en klinisk dataanalytiker.",
        assistant: "Absolut — jag öppnar en ny jobbannons och vi fyller i den med röst.",
      },
      {
        user: "Vad finns i min inkorg?",
        assistant: "Jag tar dig till öppna förfrågningar så du kan granska dem.",
      },
      {
        user: "Bjud in den starkaste matchen till analytikerjobbet.",
        assistant: "Jag kan öppna profilen — du väljer om inbjudan skickas.",
      },
      {
        user: "Hitta personer med SQL och storytelling.",
        assistant: "Jag filtrerar på de skillnaderna och visar vem som passar.",
      },
      {
        user: "Öppna mina publicerade jobb.",
        assistant: "Öppnar din jobblista så du kan hoppa in i valfri roll.",
      },
      {
        user: "Hur fungerar matchningen?",
        assistant: "Vi matchar på skills och evidens — människor bestämmer alltid.",
      },
      {
        user: "Starta en hybrid nursing coordinator-jobbannons.",
        assistant: "Vi tar den tillsammans — du styr varje fält.",
      },
    ],
  },
  "uk-UA": {
    placeholder: "Запитайте асистента про що завгодно…",
    greeting: "Привіт! Потрібна нова вакансія, кандидат чи запрошення?",
    questions: [
      {
        user: "Покажи кандидатів на роль аналітика даних.",
        assistant: "Можу відкрити список — ви вирішуєте, кого запросити.",
      },
      {
        user: "Склади вакансію для клінічного аналітика даних.",
        assistant: "Гаразд — відкрию нову вакансію, і заповнимо її голосом.",
      },
      {
        user: "Що зараз у моїй скриньці?",
        assistant: "Відкрию відкриті запити, щоб ви могли їх переглянути.",
      },
      {
        user: "Запроси найкращий збіг до вакансії аналітика.",
        assistant: "Можу відкрити профіль — ви вирішуєте, чи надсилати запрошення.",
      },
      {
        user: "Знайди людей із SQL і сторітелінгом.",
        assistant: "Відфільтрую за цими навичками і покажу, хто підходить.",
      },
      {
        user: "Відкрий мої опубліковані вакансії.",
        assistant: "Відкриваю список вакансій — можете зайти в будь-яку роль.",
      },
      {
        user: "Як тут працює матчинг?",
        assistant: "Ми зіставляємо навички й докази — рішення завжди за людьми.",
      },
      {
        user: "Почни гібридну вакансію nursing coordinator.",
        assistant: "Зробимо разом — ви контролюєте кожне поле.",
      },
    ],
  },
};

export function shufflePick<T>(items: T[], count: number): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = copy[i];
    copy[i] = copy[j];
    copy[j] = tmp;
  }
  return copy.slice(0, Math.min(count, copy.length));
}

export function buildStaticDemoMessages(pack: CompanyChatDemoPack, count = 2): ChatMessage[] {
  const picks = shufflePick(pack.questions, count);
  const out: ChatMessage[] = [{ role: "assistant", content: pack.greeting }];
  for (const qa of picks) {
    out.push({ role: "user", content: qa.user });
    out.push({ role: "assistant", content: qa.assistant });
  }
  return out;
}
