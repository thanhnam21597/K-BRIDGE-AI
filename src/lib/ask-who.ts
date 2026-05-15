export type ContactRole = "HR" | "Buddy" | "Tech Lead" | "Manager";

export type EscalationTarget = {
  role: ContactRole;
  why: string;
  expectedResponseWindow: string;
  messageTemplate: string;
};

export type AskWhoScenarioId =
  | "account-access"
  | "policy-leave-benefit"
  | "task-unclear"
  | "conflict-feedback";

export type AskWhoScenario = {
  id: AskWhoScenarioId;
  title: string;
  context: string;
  escalationRule: string;
  targets: EscalationTarget[];
};

export const DEFAULT_ASK_WHO_SCENARIO_ID: AskWhoScenarioId = "task-unclear";

export const ASK_WHO_SCENARIOS: AskWhoScenario[] = [
  {
    id: "account-access",
    title: "Khong vao duoc tai khoan / quyen truy cap",
    context: "Mat quyen repo, Jira, Slack, email cong ty, VPN hoac moi vao chua co account.",
    escalationRule: "Neu sau 2 gio lam viec van block, escalate len Manager.",
    targets: [
      {
        role: "Buddy",
        why: "Buddy biet setup thuc te cua team va co the chi nhanh buoc check co ban.",
        expectedResponseWindow: "15-30 phut",
        messageTemplate:
          "Hi [Buddy], em chua truy cap duoc [tool/system]. Em da thu [A/B] nhung van loi [error]. Anh/chi huong dan em buoc tiep theo duoc khong?",
      },
      {
        role: "Tech Lead",
        why: "Tech Lead co quyen xac nhan access can cho cong viec ky thuat.",
        expectedResponseWindow: "30-90 phut",
        messageTemplate:
          "Hi [Tech Lead], em dang bi block vi chua truy cap duoc [tool/repo]. Anh/chi co the approve quyen [permission] hoac chi em dau moi phu trach duoc khong?",
      },
      {
        role: "Manager",
        why: "Manager can biet blocker anh huong deadline de uu tien xu ly.",
        expectedResponseWindow: "Trong ngay",
        messageTemplate:
          "Hi [Manager], em dang bi block access [system] tu [time], da lien he Buddy/Tech Lead. Nho anh/chi ho tro escalate de em tiep tuc task [task name].",
      },
    ],
  },
  {
    id: "policy-leave-benefit",
    title: "Hoi policy, nghi phep, bao hiem, luong",
    context: "Can ro cach xin nghi, overtime policy, phuc loi, hop dong, reimbursement.",
    escalationRule: "Neu qua 1 ngay lam viec khong co phan hoi, escalate cho Manager.",
    targets: [
      {
        role: "HR",
        why: "HR la owner cua policy va quy trinh hanh chinh nhan su.",
        expectedResponseWindow: "Trong ngay",
        messageTemplate:
          "Hi HR team, em muon hoi ve [policy]. Truong hop cua em: [mo ta ngan]. Nho anh/chi huong dan quy trinh va deadline can luu y.",
      },
      {
        role: "Buddy",
        why: "Buddy chia se kinh nghiem thuc te de ban hieu cach ap dung policy trong team.",
        expectedResponseWindow: "30-60 phut",
        messageTemplate:
          "Hi [Buddy], ve policy [x], team minh thuong thuc hien nhu the nao de dung quy trinh va van kip tien do?",
      },
      {
        role: "Manager",
        why: "Manager can xac nhan anh huong plan cong viec va sap xep uu tien.",
        expectedResponseWindow: "Trong ngay",
        messageTemplate:
          "Hi [Manager], em dang can xu ly [policy/leave request] vao [date]. Em da check voi HR, nho anh/chi xac nhan giup impact den ke hoach sprint.",
      },
    ],
  },
  {
    id: "task-unclear",
    title: "Khong ro yeu cau task / deadline",
    context: "Task mo ho, acceptance criteria khong ro, khong biet uu tien viec nao truoc.",
    escalationRule: "Neu qua 4 gio lam viec van mo ho, ping lai va escalate len Manager.",
    targets: [
      {
        role: "Tech Lead",
        why: "Tech Lead xac dinh scope ky thuat, acceptance criteria, va quality bar.",
        expectedResponseWindow: "30-90 phut",
        messageTemplate:
          "Hi [Tech Lead], em muon xac nhan scope task [ticket]. Em hieu la [A], expected output [B], deadline [C] - anh/chi xem giup em con thieu gi khong?",
      },
      {
        role: "Buddy",
        why: "Buddy giup ban nam ngu canh du an va cach giao tiep trong team.",
        expectedResponseWindow: "15-45 phut",
        messageTemplate:
          "Hi [Buddy], voi task [ticket], team minh thuong uu tien cach tiep can nao de vua dung expectation vua nhanh?",
      },
      {
        role: "Manager",
        why: "Manager quyet dinh trade-off deadline/scope khi co conflict uu tien.",
        expectedResponseWindow: "Trong ngay",
        messageTemplate:
          "Hi [Manager], task [ticket] dang co 2 huong xu ly [A/B]. Em de xuat [A] de kip [deadline]. Nho anh/chi xac nhan uu tien giup em.",
      },
    ],
  },
  {
    id: "conflict-feedback",
    title: "Gap misunderstanding / feedback nhay cam",
    context: "Co hieu nham khi chat, feedback de gay ap luc, can phan hoi kheo.",
    escalationRule: "Neu co dau hieu conflict leo thang, escalate som cho Manager.",
    targets: [
      {
        role: "Buddy",
        why: "Buddy giup ban hieu nuance van hoa va cach dien dat mem mai.",
        expectedResponseWindow: "15-45 phut",
        messageTemplate:
          "Hi [Buddy], em vua nhan feedback [short quote]. Em muon phan hoi ton trong va ro y, anh/chi xem giup em cach dien dat nay da on chua?",
      },
      {
        role: "Manager",
        why: "Manager co vai tro giai toa misunderstanding giua cac ben va can bang ky vong.",
        expectedResponseWindow: "Trong ngay",
        messageTemplate:
          "Hi [Manager], em muon align lai ve [issue]. Em da hieu feedback la [x] va de xuat hanh dong [y]. Nho anh/chi giup xac nhan huong phu hop cho team.",
      },
      {
        role: "HR",
        why: "HR ho tro khi feedback lien quan hanh vi khong phu hop hoac tam ly an toan.",
        expectedResponseWindow: "Trong ngay",
        messageTemplate:
          "Hi HR, em can tu van ve tinh huong giao tiep nhay cam trong cong viec. Em muon xu ly dung quy trinh va ton trong van hoa cong ty.",
      },
    ],
  },
];

const ASK_WHO_INTENT_KEYWORDS = [
  "hoi ai",
  "nen hoi ai",
  "nho ai",
  "khong biet hoi ai",
  "ping ai",
  "escalate",
  "who should i ask",
  "who to ask",
  "who can help",
];

const SCENARIO_KEYWORDS: Record<AskWhoScenarioId, string[]> = {
  "account-access": [
    "truy cap",
    "access",
    "permission",
    "repo",
    "vpn",
    "jira",
    "slack",
    "account",
    "login",
  ],
  "policy-leave-benefit": [
    "nghi phep",
    "leave",
    "policy",
    "bao hiem",
    "luong",
    "benefit",
    "ot",
    "hr",
    "hop dong",
  ],
  "task-unclear": [
    "khong ro",
    "mo ho",
    "deadline",
    "yeu cau",
    "task",
    "ticket",
    "uu tien",
    "scope",
  ],
  "conflict-feedback": [
    "hieu nham",
    "misunderstanding",
    "feedback",
    "conflict",
    "cang thang",
    "mau thuan",
    "nhay cam",
  ],
};

export function detectAskWhoScenarioFromText(text: string): AskWhoScenarioId | null {
  const normalized = text.trim().toLowerCase();
  if (!normalized) return null;

  const hasIntent = ASK_WHO_INTENT_KEYWORDS.some((keyword) => normalized.includes(keyword));

  for (const [scenarioId, keywords] of Object.entries(SCENARIO_KEYWORDS) as Array<
    [AskWhoScenarioId, string[]]
  >) {
    if (keywords.some((keyword) => normalized.includes(keyword))) {
      return scenarioId;
    }
  }

  return hasIntent ? DEFAULT_ASK_WHO_SCENARIO_ID : null;
}

export function getAskWhoScenarioShortLabel(scenarioId: AskWhoScenarioId) {
  const labels: Record<AskWhoScenarioId, string> = {
    "account-access": "Account access",
    "policy-leave-benefit": "Policy / leave / benefits",
    "task-unclear": "Task unclear",
    "conflict-feedback": "Conflict / feedback",
  };
  return labels[scenarioId];
}
