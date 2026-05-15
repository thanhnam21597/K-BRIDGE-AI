export type KoreanVietnameseKbTag =
  | "hierarchy"
  | "addressing-seniors"
  | "communication-style"
  | "meeting-etiquette"
  | "feedback-culture"
  | "work-hours"
  | "work-life-balance"
  | "remote-collaboration"
  | "virtual-team-building"
  | "misunderstanding"
  | "reporting-delay"
  | "relationship-building"
  | "glossary";

const CATEGORY_BY_TAG: Record<KoreanVietnameseKbTag, string> = {
  hierarchy: "Hierarchy & Addressing Seniors",
  "addressing-seniors": "Hierarchy & Addressing Seniors",
  "communication-style": "Communication Style",
  "meeting-etiquette": "Meeting Etiquette",
  "feedback-culture": "Feedback Culture",
  "work-hours": "Work Hours & Work-life Balance",
  "work-life-balance": "Work Hours & Work-life Balance",
  "remote-collaboration": "Virtual Team Building",
  "virtual-team-building": "Virtual Team Building",
  misunderstanding: "Common Misunderstandings",
  "reporting-delay": "Communication Style",
  "relationship-building": "Relationship Building",
  glossary: "Common Misunderstandings",
};

export type KoreanVietnameseKbEntry = {
  id: string;
  title: string;
  tags: KoreanVietnameseKbTag[];
  content: string;
};

export const KOREAN_VIETNAMESE_WORKPLACE_KB: KoreanVietnameseKbEntry[] = [
  {
    id: "kb-1",
    title: "Hierarchy and titles",
    tags: ["hierarchy", "addressing-seniors"],
    content:
      "In Korean companies, job title and seniority strongly influence communication. Use formal address first (Manager Kim, Team Lead Park) and avoid calling seniors by first name unless invited.",
  },
  {
    id: "kb-2",
    title: "Addressing seniors in email and chat",
    tags: ["addressing-seniors", "communication-style"],
    content:
      "Start politely, include context, then request. Suggested structure: greeting + purpose + status + request + thanks. This reduces perceived abruptness in Korean workplace norms.",
  },
  {
    id: "kb-3",
    title: "Nunchi social awareness",
    tags: ["communication-style", "hierarchy"],
    content:
      "Nunchi means sensing team mood, unspoken priorities, and timing. Vietnamese professionals may focus on explicit instructions, while Korean teams expect proactive context reading.",
  },
  {
    id: "kb-4",
    title: "Indirect versus direct communication",
    tags: ["communication-style", "misunderstanding"],
    content:
      "Korean corporate communication tends to be indirect to preserve harmony. Instead of saying 'No', people may say 'That may be difficult'. Treat softened phrases as risk signals.",
  },
  {
    id: "kb-5",
    title: "Direct feedback misunderstanding",
    tags: ["feedback-culture", "misunderstanding", "communication-style"],
    content:
      "Vietnamese teammates may see indirect Korean feedback as unclear. Korean managers may see direct disagreement as confrontational. Acknowledge first, then propose alternatives with rationale.",
  },
  {
    id: "kb-6",
    title: "Meeting etiquette before meeting",
    tags: ["meeting-etiquette", "remote-collaboration"],
    content:
      "Korean teams value preparation. Share agenda, status summary, blockers, and recommendations before meetings. Entering with a clear pre-read builds trust quickly.",
  },
  {
    id: "kb-7",
    title: "Meeting etiquette during meeting",
    tags: ["meeting-etiquette", "hierarchy"],
    content:
      "Be concise, avoid interrupting senior speakers, and summarize decisions clearly. If disagreeing, use respectful phrasing like: 'From my understanding, may I suggest another option?'",
  },
  {
    id: "kb-8",
    title: "Meeting etiquette after meeting",
    tags: ["meeting-etiquette", "remote-collaboration"],
    content:
      "Send a written recap with owners and deadlines. In cross-language teams, post-meeting written confirmation prevents hidden misunderstandings and is highly valued.",
  },
  {
    id: "kb-9",
    title: "Feedback culture and response",
    tags: ["feedback-culture", "relationship-building"],
    content:
      "Korean managers may provide feedback privately and indirectly. Employees are expected to reflect and improve without defensive reactions. Respond with appreciation and concrete next actions.",
  },
  {
    id: "kb-10",
    title: "Reporting delays with ownership",
    tags: ["reporting-delay", "communication-style", "feedback-culture"],
    content:
      "Report delays early using three parts: cause, impact, and mitigation plan. Avoid reporting only bad news; always include ownership and revised timeline.",
  },
  {
    id: "kb-11",
    title: "Escalation norms",
    tags: ["hierarchy", "communication-style", "reporting-delay"],
    content:
      "Escalate through proper line (mentor, team lead, manager) and provide evidence. Skipping hierarchy can be interpreted as disrespect unless urgency is clearly justified.",
  },
  {
    id: "kb-12",
    title: "Work hours expectation",
    tags: ["work-hours", "work-life-balance"],
    content:
      "Korean teams may emphasize responsiveness and commitment, especially near release milestones. Clarify expected availability windows to avoid silent overwork.",
  },
  {
    id: "kb-13",
    title: "Work-life balance in remote teams",
    tags: ["work-life-balance", "remote-collaboration", "work-hours"],
    content:
      "Vietnamese employees may prefer flexible communication hours; Korean teams may expect synchronized collaboration. Define overlap hours and urgent versus non-urgent channels explicitly.",
  },
  {
    id: "kb-14",
    title: "Remote communication rhythm",
    tags: ["remote-collaboration", "meeting-etiquette"],
    content:
      "Daily short updates and weekly structured reports match Korean expectations. Consistency is often valued more than volume in remote collaboration.",
  },
  {
    id: "kb-15",
    title: "Virtual team building value",
    tags: ["virtual-team-building", "relationship-building", "remote-collaboration"],
    content:
      "Participation in informal online sessions (coffee chat, game, culture sharing) is relationship-building, not optional fluff. It strengthens trust for future project alignment.",
  },
  {
    id: "kb-16",
    title: "Jeong and relationship building",
    tags: ["relationship-building", "communication-style"],
    content:
      "Jeong reflects long-term relational warmth and loyalty. Reliability, small acts of support, and respectful follow-through build jeong over time in distributed teams.",
  },
  {
    id: "kb-17",
    title: "Misunderstanding silence as agreement",
    tags: ["misunderstanding", "meeting-etiquette", "hierarchy"],
    content:
      "Silence after a proposal is not always agreement. It may mean members are considering hierarchy or risk. Ask for explicit confirmation and next owner.",
  },
  {
    id: "kb-18",
    title: "Misunderstanding quick yes",
    tags: ["misunderstanding", "communication-style"],
    content:
      "A quick 'Yes' in meetings may mean 'I heard you', not 'I commit'. Confirm with deadline, deliverable, and responsible person in writing.",
  },
  {
    id: "kb-19",
    title: "Tone mismatch in text communication",
    tags: ["misunderstanding", "addressing-seniors", "communication-style"],
    content:
      "Vietnamese humor or casual phrasing in text can be misread as too informal by senior Korean stakeholders. Adjust tone by audience level.",
  },
  {
    id: "kb-20",
    title: "Cross-cultural glossary practice",
    tags: ["glossary", "remote-collaboration", "misunderstanding"],
    content:
      "Keep a shared VN-EN-KR glossary for key business terms such as risk, blocker, owner, deadline, and escalation. This reduces ambiguity in bilingual and trilingual projects.",
  },
  {
    id: "kb-21",
    title: "Sample company policy: meeting windows and response SLA",
    tags: ["meeting-etiquette", "work-hours", "remote-collaboration"],
    content:
      "Mock policy for remote Korean team: core meeting windows are 09:30-11:30 KST and 14:00-17:00 KST; async messages should be acknowledged within 2 business hours; urgent production issues must be escalated immediately via Slack #urgent plus direct ping to on-duty lead.",
  },
  {
    id: "kb-22",
    title: "Sample reporting format for daily and weekly status",
    tags: ["reporting-delay", "meeting-etiquette", "communication-style"],
    content:
      "Recommended report template: 1) Yesterday done, 2) Today plan, 3) Blockers, 4) Needed support, 5) ETA impact. For delay reports, include root cause, affected scope, mitigation option A/B, and requested decision owner.",
  },
  {
    id: "kb-23",
    title: "Internal email template: asking for help politely",
    tags: ["addressing-seniors", "communication-style", "glossary"],
    content:
      "Template: Subject: [Support Needed][Ticket-123] Clarification on API scope. Body: Greeting + concise context + what you already tried + specific question + expected timeline + appreciation. This style is polite, efficient, and easy for Korean seniors to respond to.",
  },
  {
    id: "kb-24",
    title: "Escalation chain guideline for onboarding period",
    tags: ["hierarchy", "reporting-delay", "relationship-building"],
    content:
      "Escalation guideline: first ask Buddy for quick context, then Tech Lead for technical decision, then Manager for priority trade-offs, and HR for policy or people-risk issues. Include evidence, impact, and proposed next step in each escalation message.",
  },
];

const TAG_KEYWORDS: Record<KoreanVietnameseKbTag, string[]> = {
  hierarchy: ["hierarchy", "cap bac", "senior", "manager", "team lead", "sep han"],
  "addressing-seniors": ["xung ho", "address", "title", "kính ngữ", "honorific"],
  "communication-style": ["giao tiep", "communication", "indirect", "direct", "nunchi"],
  "meeting-etiquette": ["meeting", "hop", "weekly", "agenda", "recap"],
  "feedback-culture": ["feedback", "nhan xet", "phan hoi", "danh gia"],
  "work-hours": ["work hours", "gio lam", "overtime", "availability"],
  "work-life-balance": ["work-life", "can bang", "ngoai gio", "burnout"],
  "remote-collaboration": ["remote", "tu xa", "async", "status update", "handoff"],
  "virtual-team-building": ["team building", "coffee chat", "bonding", "van hoa doi nhom"],
  misunderstanding: ["misunderstanding", "hieu nham", "conflict", "xung dot"],
  "reporting-delay": ["delay", "tre tien do", "report", "bao cao", "escalation", "blocker", "eta"],
  "relationship-building": ["relationship", "jeong", "trust", "tin cay"],
  glossary: ["glossary", "thuat ngu", "vn en kr", "translate term", "template", "email", "policy"],
};

export function selectKbEntriesForQuery(query: string, limit = 8) {
  const normalizedQuery = query.toLowerCase();
  const queryTokens = normalizedQuery.split(/[^a-z0-9\u00C0-\u024F\u1E00-\u1EFF]+/).filter(Boolean);

  const matchedTags = new Set<KoreanVietnameseKbTag>();
  for (const [tag, keywords] of Object.entries(TAG_KEYWORDS) as Array<
    [KoreanVietnameseKbTag, string[]]
  >) {
    if (keywords.some((keyword) => normalizedQuery.includes(keyword.toLowerCase()))) {
      matchedTags.add(tag);
    }
  }

  return KOREAN_VIETNAMESE_WORKPLACE_KB
    .map((entry) => {
      const tagScore = entry.tags.reduce(
        (acc, tag) => acc + (matchedTags.has(tag) ? 3 : 0),
        0,
      );
      const contentLower = `${entry.title} ${entry.content}`.toLowerCase();
      const tokenScore = queryTokens.reduce(
        (acc, token) => acc + (contentLower.includes(token) ? 1 : 0),
        0,
      );
      return { entry, score: tagScore + tokenScore };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ entry }) => entry);
}

export function buildKbContextForQuery(query: string, limit = 8) {
  return selectKbEntriesForQuery(query, limit)
    .map(
      (entry, index) =>
        `[Seed ${index + 1}] tags=${entry.tags.join(", ")} | ${entry.title}\n${entry.content}`,
    )
    .join("\n\n");
}

export function getKbCategoryFromTags(tags: KoreanVietnameseKbTag[]) {
  return CATEGORY_BY_TAG[tags[0]] ?? "General";
}
