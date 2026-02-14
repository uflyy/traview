import React, { useEffect, useMemo, useState } from "react";
import {
  Zap,
  Heart,
  DollarSign,
  Award,
  BookOpen,
  Coffee,
  PenTool,
  BarChart3,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Send,
  Wrench,
  Plus,
  Layers,
  Languages,
} from "lucide-react";

/**
 * Tourism, Tenure & Tears (TTT)
 * Lightweight satire simulator
 * - Multi-paper pipeline (max 3)
 * - Reviewer + revise points
 * - Random events
 * - 12-week run with ending card
 * - ZH/EN toggle
 *
 * Drop this file in ttt.tsx and render <TTT /> from your app entry.
 */

type Lang = "zh" | "en";
type Tier = "Q1" | "Q2" | "Q3";
type PaperStatus = "Draft" | "Under Review" | "R&R" | "Accepted" | "Rejected";

type Resources = {
  energy: number; // 0-100
  mood: number; // 0-100
  funding: number; // 0-100
  reputation: number; // 0-100
  teaching: number; // 0-100
};

type ReviewerType =
  | "Methodology Freak"
  | "Theory Purist"
  | "Citation Hoarder"
  | "Three-Line Rejector"
  | "Writing Coach"
  | "Misreader"
  | "Rare Nice Reviewer"
  | "One-Method Evangelist";

type ReviewComment = {
  reviewerType: ReviewerType;
  severity: 1 | 2 | 3 | 4 | 5;
  text: string;
  points: number; // revise points contribution
};

type ReviewState = {
  round: 1 | 2;
  etaWeeks: number;
  comments: ReviewComment[];
  revisePointsLeft: number;
};

type Paper = {
  id: string;
  title: string;
  tier: Tier;
  topic: string;
  status: PaperStatus;
  progress: number; // 0-120
  quality: number; // 0-100 (rough)
  review?: ReviewState;
};

type EventChoice = {
  labelKey: string;
  effect: Partial<Resources>;
  logKey: string;
};

type GameEvent = {
  id: string;
  titleKey: string;
  descKey: string;
  choices: EventChoice[];
};

const SAVE_KEY = "ttt_satire_v02";

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const rint = (lo: number, hi: number) => Math.floor(Math.random() * (hi - lo + 1)) + lo;
const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];
const uid = () => `p_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;

const DICT: Record<Lang, Record<string, string>> = {
  zh: {
    title: "TOURISM, TENURE & TEARS",
    subtitle: "青年学者梗模拟器 v0.2",
    week: "周",
    of: " / ",
    ap: "AP",
    energy: "精力",
    mood: "心态",
    funding: "经费",
    reputation: "声望",
    teaching: "教学压力",
    efficiency: "效率",
    pipeline: "论文管线",
    active: "当前",
    log: "终端日志",
    endWeek: "结束本周",
    startNewPaper: "新开论文",
    maxPaperHint: "最多 3 篇",
    actions: "行动",
    write: "写作",
    data: "跑数据",
    grade: "批作业",
    rest: "休息",
    submit: "投稿",
    revise: "改稿",
    switchLang: "中英切换",
    draft: "草稿",
    underReview: "审稿中",
    rr: "大修/小修",
    accepted: "录用",
    rejected: "拒稿",
    needsDraft: "需要草稿进度 ≥ 100%",
    needsRR: "仅限 R&R 状态",
    needsFunding: "经费不足",
    notEnoughAP: "AP 不够",
    eventTitle: "突发事件",
    choose: "请选择一个处理方式",
    close: "关闭",
    decisionLetter: "编辑来信",
    reviewerComments: "审稿意见",
    severity: "强度",
    pointsLeft: "剩余改稿点",
    decision: "结果",
    round: "轮次",
    decisionIn: "预计出结果",
    weeks: "周",
    endCardTitle: "结局",
    playAgain: "再来一局",
    reset: "清空存档",
    resultYouAre: "你的学术人格",
    resultStats: "本局统计",
    acceptedN: "录用",
    rejectedN: "拒稿",
    rrN: "R&R",
    draftsN: "草稿",
    tip: "提示：休息和降教学压力会显著提升效率。",
    statusOk: "勉强在线",
    statusTired: "快撑不住了",
    statusBurn: "濒临崩溃",
    btnDeal: "就这样吧",
    btnPolitely: "礼貌解释",
    btnOvernight: "熬夜重做",
    btnIgnore: "装没看见",
    btnAccept: "接下来",
    btnDecline: "婉拒",
    btnRerun: "重跑",
    btnAskRA: "找RA",
    btnPretend: "假装没事",
    btnSayYes: "答应",
    btnSayMaybe: "先等等",
    btnFollowUp: "马上跟进",
    btnWait: "再观望",
    logWelcome: "欢迎来到学术世界。请保持水分和理智。",
    logNoAP: "AP 用完了，结束本周吧。",
    logNeedFunding: "云计算拒绝启动：经费不足。",
    logWrite: "写作推进。",
    logData: "回归跑起来了。",
    logGrade: "批作业结束。你看见了 12 种新语法。",
    logRest: "短暂恢复。墙不会拒稿。",
    logStartPaper: "新开论文：焦虑与多巴胺同时上线。",
    logMaxPapers: "论文太多了（最多 3 篇）。先把坑填一填。",
    logSubmit: "已投稿。系统显示：Under Review。",
    logNotReady: "草稿还不够。请先写到 100%。",
    logRevise: "改稿中。审稿人依然很自信。",
    logNoRR: "没有 R&R 可改。珍惜这份平静。",
    logWeekBegins: "新的一周开始了，邮箱已经看起来很凶。",
    logDecisionReject: "结果：拒稿。恭喜获得新选题机会。",
    logDecisionRRMajor: "结果：Major Revision。周末消失。",
    logDecisionRRMinor: "结果：Minor Revision。你差点以为自己被尊重了。",
    logDecisionAccept: "结果：录用。快乐持续 3 秒钟。",
    logEvent: "事件触发：",
    logReviseDone: "改稿点清零，已自动 resubmit，进入下一轮审稿。",
    logEndRun: "12 周结束。本局已结算。",
    persona1: "🔥 顶刊燃尽机",
    persona2: "😎 平衡生存者",
    persona3: "🏫 教学英雄",
    persona4: "🧂 咸味现实主义者",
    persona5: "🦄 稀有独角兽",
  },
  en: {
    title: "TOURISM, TENURE & TEARS",
    subtitle: "A Satirical Academic Simulator v0.2",
    week: "Week",
    of: " / ",
    ap: "AP",
    energy: "Energy",
    mood: "Mood",
    funding: "Funding",
    reputation: "Reputation",
    teaching: "Teaching Pressure",
    efficiency: "Efficiency",
    pipeline: "Pipeline",
    active: "Active",
    log: "Terminal Log",
    endWeek: "END WEEK",
    startNewPaper: "Start New Paper",
    maxPaperHint: "Max 3 papers",
    actions: "Actions",
    write: "WRITE",
    data: "RUN DATA",
    grade: "GRADE",
    rest: "REST",
    submit: "SUBMIT",
    revise: "REVISE",
    switchLang: "ZH/EN",
    draft: "Draft",
    underReview: "Under Review",
    rr: "R&R",
    accepted: "Accepted",
    rejected: "Rejected",
    needsDraft: "Needs Draft progress ≥ 100%",
    needsRR: "Only for R&R",
    needsFunding: "Not enough funding",
    notEnoughAP: "Not enough AP",
    eventTitle: "Random Event",
    choose: "Choose an option",
    close: "Close",
    decisionLetter: "Decision Letter",
    reviewerComments: "Reviewer Comments",
    severity: "Severity",
    pointsLeft: "Revise points left",
    decision: "Decision",
    round: "Round",
    decisionIn: "Decision in",
    weeks: "weeks",
    endCardTitle: "RESULT",
    playAgain: "Play Again",
    reset: "Clear Save",
    resultYouAre: "You are",
    resultStats: "Run stats",
    acceptedN: "Accepted",
    rejectedN: "Rejected",
    rrN: "R&R",
    draftsN: "Drafts",
    tip: "Tip: Rest and manage teaching pressure to boost efficiency.",
    statusOk: "Barely functioning",
    statusTired: "Running on fumes",
    statusBurn: "Near burnout",
    btnDeal: "Deal with it",
    btnPolitely: "Explain politely",
    btnOvernight: "Redo overnight",
    btnIgnore: "Ignore",
    btnAccept: "Accept",
    btnDecline: "Decline",
    btnRerun: "Rerun everything",
    btnAskRA: "Ask RA",
    btnPretend: "Pretend it is fine",
    btnSayYes: "Say yes",
    btnSayMaybe: "Say maybe",
    btnFollowUp: "Follow up now",
    btnWait: "Wait",
    logWelcome: "Welcome to the ivory tower. Stay hydrated.",
    logNoAP: "No AP left. End the week.",
    logNeedFunding: "Cloud compute refused: insufficient funding.",
    logWrite: "Writing progress.",
    logData: "Regressions are running.",
    logGrade: "Grading done. You discovered 12 new grammars.",
    logRest: "Rested a bit. The wall did not reject you.",
    logStartPaper: "New paper started. Dopamine and panic arrived together.",
    logMaxPapers: "Too many papers (max 3). Finish something first.",
    logSubmit: "Submitted. Status: Under Review.",
    logNotReady: "Not ready. Reach 100% draft first.",
    logRevise: "Revising. Reviewer confidence remains undefeated.",
    logNoRR: "No R&R to revise. Enjoy peace.",
    logWeekBegins: "A new week begins. The inbox already looks hostile.",
    logDecisionReject: "Decision: REJECT. Congrats on a fresh new topic.",
    logDecisionRRMajor: "Decision: MAJOR REVISION. Your weekend evaporated.",
    logDecisionRRMinor: "Decision: MINOR REVISION. Almost respectful.",
    logDecisionAccept: "Decision: ACCEPT. Happiness lasted 3 seconds.",
    logEvent: "Event triggered:",
    logReviseDone: "Revise points cleared. Auto resubmitted. Next round begins.",
    logEndRun: "12 weeks completed. Run settled.",
    persona1: "🔥 Burnt-Out Q1 Machine",
    persona2: "😎 Balanced Survivor",
    persona3: "🏫 Teaching Hero",
    persona4: "🧂 Salty Realist",
    persona5: "🦄 Rare Unicorn",
  },
};

const TOPICS = [
  "Overtourism",
  "Air Quality",
  "Events",
  "Hotel Performance",
  "Mobility Data",
  "DMO Social Media",
  "Pricing",
  "Risk Perception",
  "Sustainability",
];

const TITLE_TEMPLATES = [
  "The effect of {X} on {Y}: Evidence from {D}",
  "Beyond {X}: Rethinking {Y} in tourism",
  "A spatial analysis of {X} and {Y} across destinations",
  "{X}, {Y}, and the tenure clock: An empirical investigation",
];

const TITLE_X = [
  "overtourism",
  "air pollution",
  "festival shocks",
  "online ratings",
  "price adjustments",
  "platform transparency",
  "mobility restrictions",
  "AI content",
];

const TITLE_Y = [
  "resident sentiment",
  "destination demand",
  "guest satisfaction",
  "crime externalities",
  "spillover effects",
  "labor outcomes",
  "tourist well-being",
];

const TITLE_D = [
  "OTA reviews",
  "mobility traces",
  "panel city data",
  "a quasi-experiment",
  "weekly demand logs",
  "a dataset you do not fully trust",
];

const REVIEWERS: Array<{ type: ReviewerType; baseSeverity: 1 | 2 | 3 | 4 | 5; basePoints: number; pool: string[] }> = [
  {
    type: "Methodology Freak",
    baseSeverity: 5,
    basePoints: 22,
    pool: [
      "Endogeneity is fatal. Please find a natural experiment in a vacuum.",
      "Parallel trends are not convincing. Add more placebo tests and call it a day.",
      "Your identification is not clean enough. Ideally, it should be impossible.",
    ],
  },
  {
    type: "Theory Purist",
    baseSeverity: 4,
    basePoints: 16,
    pool: [
      "The theoretical contribution is unclear. Please rewrite the framework.",
      "Nice results, but where is the mechanism? Not that mechanism.",
      "This reads empirical. The journal expects theory and perfect empirics.",
    ],
  },
  {
    type: "Citation Hoarder",
    baseSeverity: 4,
    basePoints: 14,
    pool: [
      "Please cite these 17 papers (attached). Especially the ones I wrote.",
      "The literature review misses several seminal works (mine).",
      "Add more citations in every paragraph, including the title.",
    ],
  },
  {
    type: "Three-Line Rejector",
    baseSeverity: 5,
    basePoints: 10,
    pool: ["Not suitable for this journal.", "The contribution is limited.", "I am not convinced. Reject."],
  },
  {
    type: "Writing Coach",
    baseSeverity: 3,
    basePoints: 10,
    pool: [
      "The writing needs polishing. Improve clarity and tighten the argument.",
      "Define key constructs earlier and reduce redundancy.",
      "Promising paper, but several sentences are hard to follow.",
    ],
  },
  {
    type: "Misreader",
    baseSeverity: 4,
    basePoints: 12,
    pool: [
      "You did not control for GDP. Please do it (again).",
      "The sample size is unclear. Add a flowchart and label everything twice.",
      "I cannot find Table 2. Please rename all tables.",
    ],
  },
  {
    type: "One-Method Evangelist",
    baseSeverity: 4,
    basePoints: 12,
    pool: ["Why not SEM?", "Why not ML?", "Why not a DSGE model with a unicorn instrument?"],
  },
  {
    type: "Rare Nice Reviewer",
    baseSeverity: 2,
    basePoints: 8,
    pool: ["Promising paper. Minor points only.", "A pleasure to review. Clear contribution.", "Well executed and relevant."],
  },
];

function makeTitle() {
  const t = pick(TITLE_TEMPLATES);
  return t.replace("{X}", pick(TITLE_X)).replace("{Y}", pick(TITLE_Y)).replace("{D}", pick(TITLE_D));
}

function tierDifficulty(t: Tier) {
  return t === "Q1" ? 72 : t === "Q2" ? 52 : 34;
}

function computeEfficiency(r: Resources) {
  const energyFactor = r.energy >= 60 ? 1.15 : r.energy >= 35 ? 1.0 : r.energy >= 20 ? 0.85 : 0.7;
  const teachPenalty = 1 - clamp(r.teaching / 150, 0, 0.35);
  const moodPenalty = 1 - clamp((35 - r.mood) / 200, 0, 0.18); // low mood slightly hurts
  return clamp(energyFactor * teachPenalty * moodPenalty, 0.55, 1.25);
}

function computeQuality(r: Resources, progress: number, base: number) {
  const progressBonus = clamp((progress - 100) * 0.18, 0, 6);
  const teachPenalty = clamp(r.teaching * 0.12, 0, 14);
  const lowEnergyPenalty = r.energy < 25 ? clamp((25 - r.energy) * 0.35, 0, 9) : 0;
  return clamp(base + progressBonus - teachPenalty - lowEnergyPenalty, 0, 100);
}

function genReview(tier: Tier, round: 1 | 2, rep: number, quality: number) {
  const reviewerCount = tier === "Q1" ? 3 : 2;
  const picked: typeof REVIEWERS = [];
  const pool = [...REVIEWERS];

  while (picked.length < reviewerCount && pool.length > 0) {
    const r = pick(pool);
    picked.push(r);
    pool.splice(pool.indexOf(r), 1);
  }

  const comments: ReviewComment[] = picked.map((r) => {
    // soften severity if quality high
    const soften = quality >= 75 ? 1 : quality >= 60 ? 0.5 : 0;
    const sev = clamp(Math.round(r.baseSeverity - soften), 1, 5) as 1 | 2 | 3 | 4 | 5;

    // points scale with severity and tier slightly
    const tierBoost = tier === "Q1" ? 1.12 : tier === "Q2" ? 1.0 : 0.92;
    const points = clamp(Math.round((r.basePoints + rint(0, 6)) * (sev / 3) * tierBoost), 6, 30);

    return { reviewerType: r.type, severity: sev, text: pick(r.pool), points };
  });

  const baseEta = tier === "Q1" ? rint(4, 7) : tier === "Q2" ? rint(3, 6) : rint(2, 5);
  const etaWeeks = clamp(baseEta + (round === 2 ? 1 : 0) + (rep < 15 ? 1 : 0), 2, 9);

  const pointsTotal = clamp(comments.reduce((s, c) => s + c.points, 0), tier === "Q1" ? 30 : 22, tier === "Q1" ? 80 : 60);

  return { etaWeeks, comments, pointsTotal };
}

type Decision = "Reject" | "Major" | "Minor" | "Accept";
function decide(tier: Tier, rep: number, quality: number, round: 1 | 2): Decision {
  const difficulty = tierDifficulty(tier);
  const score = quality + rep * 0.25 - difficulty + (round === 2 ? 6 : 0); // resub helps a bit

  // simple but feels real
  // base probabilities by tier
  let pReject = tier === "Q1" ? 0.40 : tier === "Q2" ? 0.28 : 0.16;
  let pAccept = tier === "Q1" ? 0.03 : tier === "Q2" ? 0.06 : 0.12;
  let pMinor = tier === "Q1" ? 0.10 : tier === "Q2" ? 0.20 : 0.32;
  let pMajor = 1 - (pReject + pAccept + pMinor);

  // shift based on score
  const shift = clamp(score / 140, -0.18, 0.22);
  pReject = clamp(pReject - shift * 0.9, 0.05, 0.85);
  pAccept = clamp(pAccept + Math.max(0, shift) * 0.7, 0.01, 0.35);
  pMinor = clamp(pMinor + shift * 0.6, 0.02, 0.75);
  pMajor = clamp(1 - (pReject + pAccept + pMinor), 0.05, 0.80);

  // normalize
  const s = pReject + pMajor + pMinor + pAccept;
  pReject /= s;
  pMajor /= s;
  pMinor /= s;
  pAccept /= s;

  const r = Math.random();
  if (r < pReject) return "Reject";
  if (r < pReject + pMajor) return "Major";
  if (r < pReject + pMajor + pMinor) return "Minor";
  return "Accept";
}

function makeEvents(lang: Lang): GameEvent[] {
  // use label keys so both languages share same structure
  return [
    {
      id: "student_font",
      titleKey: "Student Complaint",
      descKey: "A student says your PPT font is too small and requests a meeting.",
      choices: [
        { labelKey: "btnPolitely", effect: { mood: -2, teaching: -6, reputation: +1 }, logKey: "Explained politely. They still want 48pt fonts." },
        { labelKey: "btnOvernight", effect: { energy: -12, teaching: -10, mood: -3 }, logKey: "You resized everything overnight. The slides are now billboard-ready." },
        { labelKey: "btnIgnore", effect: { teaching: +10, reputation: -3, mood: +2 }, logKey: "You ignored it. The complaint found a form." },
      ],
    },
    {
      id: "committee",
      titleKey: "Committee Surprise",
      descKey: "You are added to a committee because you are 'good with data'.",
      choices: [
        { labelKey: "btnAccept", effect: { reputation: +2, teaching: +6, mood: -2 }, logKey: "You accepted. Your calendar lost a fight." },
        { labelKey: "btnDecline", effect: { reputation: -1, mood: -1, teaching: -2 }, logKey: "You declined carefully. The hallway got colder." },
      ],
    },
    {
      id: "data_loss",
      titleKey: "Data Vanished",
      descKey: "Your file final_final_v7_REAL.dta disappeared. The universe offers no explanation.",
      choices: [
        { labelKey: "btnRerun", effect: { energy: -18, mood: -8 }, logKey: "You reran the pipeline. It worked. You aged 3 years." },
        { labelKey: "btnAskRA", effect: { funding: -10, energy: -6, mood: -2 }, logKey: "RA helped. Your budget cried quietly." },
        { labelKey: "btnPretend", effect: { mood: +3, reputation: -4 }, logKey: "You pretended it is fine. Future-you is now your enemy." },
      ],
    },
    {
      id: "special_issue",
      titleKey: "Special Issue Invite",
      descKey: "An editor invites you to a special issue. Deadline is 'soon'.",
      choices: [
        { labelKey: "btnSayYes", effect: { reputation: +6, mood: -3, teaching: +8 }, logKey: "You said yes. Your life said no." },
        { labelKey: "btnSayMaybe", effect: { reputation: +2, mood: -1 }, logKey: "You said maybe. Academia's most powerful spell." },
      ],
    },
    {
      id: "collab",
      titleKey: "Hallway Collaboration",
      descKey: "A famous scholar says, 'We should collaborate sometime.'",
      choices: [
        { labelKey: "btnFollowUp", effect: { reputation: +8, mood: +4, energy: -6 }, logKey: "You followed up. They replied. Rare loot." },
        { labelKey: "btnWait", effect: { mood: +1 }, logKey: "You waited. The draft email lives forever." },
      ],
    },
  ];
}

/** UI pieces */
function ResourceBar({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <div className="flex flex-col gap-1 w-full">
      <div className="flex justify-between text-xs font-mono uppercase text-gray-400">
        <span className="flex items-center gap-1">
          <Icon size={12} /> {label}
        </span>
        <span>{clamp(Math.round(value), 0, 100)}/100</span>
      </div>
      <div className="h-3 w-full bg-gray-800 border border-gray-700 p-0.5">
        <div className={`h-full transition-all duration-300 ${color}`} style={{ width: `${clamp(value, 0, 100)}%` }} />
      </div>
    </div>
  );
}

function Pill({ children, tone }: { children: React.ReactNode; tone?: "neutral" | "good" | "bad" | "warn" }) {
  const cls =
    tone === "good"
      ? "bg-emerald-700 text-emerald-50"
      : tone === "bad"
      ? "bg-red-700 text-red-50"
      : tone === "warn"
      ? "bg-amber-700 text-amber-50"
      : "bg-zinc-700 text-zinc-50";
  return <span className={`text-[10px] px-2 py-0.5 font-bold ${cls}`}>{children}</span>;
}

function statusLabel(r: Resources, t: Record<string, string>) {
  if (r.energy < 18 || r.mood < 18) return t.statusBurn;
  if (r.energy < 35 || r.mood < 35) return t.statusTired;
  return t.statusOk;
}

/** Main */
export default function TTT() {
  const [lang, setLang] = useState<Lang>("zh");
  const t = DICT[lang];

  // load save once
  const loaded = useMemo(() => {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }, []);

  const [week, setWeek] = useState<number>(loaded?.week ?? 1);
  const totalWeeks = 12;

  const [ap, setAp] = useState<number>(loaded?.ap ?? 2); // simplified: 2 actions per week
  const [resources, setResources] = useState<Resources>(
    loaded?.resources ?? { energy: 78, mood: 70, funding: 30, reputation: 10, teaching: 25 }
  );
  const [papers, setPapers] = useState<Paper[]>(
    loaded?.papers ?? [
      {
        id: uid(),
        title: makeTitle(),
        tier: "Q1",
        topic: pick(TOPICS),
        status: "Draft",
        progress: 45,
        quality: 30,
      },
    ]
  );
  const [activeId, setActiveId] = useState<string>(loaded?.activeId ?? (loaded?.papers?.[0]?.id ?? papers[0]?.id));
  const [logs, setLogs] = useState<string[]>(loaded?.logs ?? [t.logWelcome]);

  const [eventModal, setEventModal] = useState<{ open: boolean; ev: GameEvent | null }>({ open: false, ev: null });
  const [reviewModal, setReviewModal] = useState<{ open: boolean; paperId: string | null; decision: Decision | null }>(
    { open: false, paperId: null, decision: null }
  );
  const [endModal, setEndModal] = useState<boolean>(loaded?.endModal ?? false);

  const activePaper = useMemo(() => papers.find((p) => p.id === activeId) ?? papers[0], [papers, activeId]);

  const eff = useMemo(() => computeEfficiency(resources), [resources]);

  const addLog = (msg: string) => setLogs((prev) => [msg, ...prev].slice(0, 8));

  const updateRes = (delta: Partial<Resources>) => {
    setResources((prev) => {
      const next = { ...prev };
      (Object.keys(delta) as Array<keyof Resources>).forEach((k) => {
        next[k] = clamp(next[k] + (delta[k] ?? 0)!, 0, 100);
      });
      return next;
    });
  };

  const spendAP = (cost: number) => {
    if (ap < cost) {
      addLog(t.notEnoughAP);
      return false;
    }
    setAp((x) => x - cost);
    return true;
  };

  const mutatePaper = (id: string, fn: (p: Paper) => Paper) => {
    setPapers((prev) => prev.map((p) => (p.id === id ? fn(p) : p)));
  };

  // autosave
  useEffect(() => {
    try {
      localStorage.setItem(
        SAVE_KEY,
        JSON.stringify({
          week,
          ap,
          lang,
          resources,
          papers,
          activeId,
          logs,
          endModal,
        })
      );
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [week, ap, lang, resources, papers, activeId, logs, endModal]);

  // keep t.logWelcome correct when switching language (optional light touch)
  useEffect(() => {
    // do not rewrite logs, just ensure first welcome exists for new users
    // no-op
  }, [lang]);

  const canSubmit = activePaper?.status === "Draft" && activePaper.progress >= 100;
  const canRevise = activePaper?.status === "R&R";

  /** Actions (lightweight) */
  const actWrite = () => {
    if (!activePaper) return;
    if (!spendAP(1)) return;
    const gain = Math.round(rint(12, 18) * eff);
    updateRes({ energy: -12, mood: -2, teaching: +2 });
    mutatePaper(activePaper.id, (p) => {
      if (p.status !== "Draft") return p;
      const prog = clamp(p.progress + gain, 0, 120);
      const q = computeQuality(resources, prog, clamp(p.quality + Math.round(gain * 0.35), 0, 100));
      return { ...p, progress: prog, quality: q };
    });
    addLog(`${t.logWrite} +${gain}%`);
  };

  const actData = () => {
    if (!activePaper) return;
    if (!spendAP(1)) return;
    if (resources.funding < 2) {
      addLog(t.logNeedFunding);
      return;
    }
    const gain = Math.round(rint(10, 16) * eff);
    updateRes({ energy: -10, mood: -2, funding: -2, teaching: +1 });
    mutatePaper(activePaper.id, (p) => {
      if (p.status !== "Draft") return p;
      const prog = clamp(p.progress + gain, 0, 120);
      const q = computeQuality(resources, prog, clamp(p.quality + Math.round(gain * 0.45), 0, 100));
      return { ...p, progress: prog, quality: q };
    });

    if (Math.random() < 0.18) {
      updateRes({ mood: -4, energy: -5 });
      addLog("Data shock: merge exploded.");
    } else {
      addLog(`${t.logData} +${gain}%`);
    }
  };

  const actGrade = () => {
    if (!spendAP(1)) return;
    updateRes({ energy: -10, mood: -1, teaching: -14 });
    addLog(t.logGrade);
  };

  const actRest = () => {
    if (!spendAP(1)) return;
    const restEff = clamp(1 - resources.teaching / 160, 0.55, 1.0);
    updateRes({ energy: Math.round(16 * restEff), mood: Math.round(10 * restEff), teaching: -2 });
    addLog(t.logRest);
  };

  const actSubmit = () => {
    if (!activePaper) return;
    if (!spendAP(1)) return;
    if (activePaper.status !== "Draft") return;
    if (activePaper.progress < 100) {
      addLog(t.logNotReady);
      return;
    }
    updateRes({ energy: -6, mood: -2, teaching: +2 });

    const quality = computeQuality(resources, activePaper.progress, activePaper.quality);
    const pkg = genReview(activePaper.tier, 1, resources.reputation, quality);

    mutatePaper(activePaper.id, (p) => ({
      ...p,
      status: "Under Review",
      quality,
      review: {
        round: 1,
        etaWeeks: pkg.etaWeeks,
        comments: pkg.comments,
        revisePointsLeft: pkg.pointsTotal,
      },
    }));

    addLog(t.logSubmit);
  };

  const actRevise = () => {
    if (!activePaper) return;
    if (!spendAP(1)) return;
    if (activePaper.status !== "R&R" || !activePaper.review) {
      addLog(t.logNoRR);
      return;
    }

    // revise reduction: depends on energy and mood, simplified
    const base = rint(10, 18);
    const energyBonus = resources.energy >= 55 ? 4 : resources.energy >= 35 ? 2 : 0;
    const moodPenalty = resources.mood < 25 ? 3 : resources.mood < 40 ? 1 : 0;
    const reduction = clamp(base + energyBonus - moodPenalty, 6, 24);

    // costs
    updateRes({ energy: -14, mood: -5, teaching: +2 });

    mutatePaper(activePaper.id, (p) => {
      if (!p.review) return p;
      const left = clamp(p.review.revisePointsLeft - reduction, 0, 999);
      if (left === 0) {
        // auto resubmit, round 2 review
        const newQuality = clamp(p.quality + rint(4, 8), 0, 100);
        const pkg = genReview(p.tier, 2, resources.reputation, newQuality);
        addLog(t.logReviseDone);
        return {
          ...p,
          quality: newQuality,
          status: "Under Review",
          review: {
            round: 2,
            etaWeeks: pkg.etaWeeks,
            comments: pkg.comments,
            revisePointsLeft: pkg.pointsTotal,
          },
        };
      }
      addLog(`${t.logRevise} -${reduction}, left ${left}`);
      return { ...p, review: { ...p.review, revisePointsLeft: left } };
    });
  };

  const startNewPaper = () => {
    if (!spendAP(1)) return;
    if (papers.length >= 3) {
      addLog(t.logMaxPapers);
      return;
    }
    updateRes({ energy: -3, mood: -1, teaching: +1 });

    const np: Paper = {
      id: uid(),
      title: makeTitle(),
      tier: pick(["Q1", "Q2", "Q3"]),
      topic: pick(TOPICS),
      status: "Draft",
      progress: 0,
      quality: rint(12, 24),
    };
    setPapers((prev) => [np, ...prev]);
    setActiveId(np.id);
    addLog(t.logStartPaper);
  };

  const maybeEvent = () => {
    if (Math.random() < 0.42) {
      const ev = pick(makeEvents(lang));
      setEventModal({ open: true, ev });
      addLog(`${t.logEvent} ${lang === "zh" ? ev.titleKey : ev.titleKey}`);
    }
  };

  const tickReviewsAndDecide = () => {
    // we will collect first decision to show in modal
    let modalPaperId: string | null = null;
    let modalDecision: Decision | null = null;

    setPapers((prev) =>
      prev.map((p) => {
        if (p.status !== "Under Review" || !p.review) return p;

        const eta = p.review.etaWeeks - 1;
        if (eta > 0) {
          return { ...p, review: { ...p.review, etaWeeks: eta } };
        }

        // decide now
        const d = decide(p.tier, resources.reputation, p.quality, p.review.round);

        // prepare decision modal
        if (!modalPaperId) {
          modalPaperId = p.id;
          modalDecision = d;
        }

        if (d === "Reject") return { ...p, status: "Rejected" };
        if (d === "Accept") return { ...p, status: "Accepted" };

        // R&R with revise points. Major adds more
        const basePoints = p.review.revisePointsLeft;
        const extra = d === "Major" ? rint(16, 26) : rint(8, 16);
        const left = clamp(basePoints + extra, 18, p.tier === "Q1" ? 80 : 60);

        return { ...p, status: "R&R", review: { ...p.review, revisePointsLeft: left } };
      })
    );

    // show modal if we decided something
    if (modalPaperId && modalDecision) {
      setReviewModal({ open: true, paperId: modalPaperId, decision: modalDecision });

      if (modalDecision === "Reject") {
        updateRes({ mood: -16, energy: -6, reputation: -2 });
        addLog(t.logDecisionReject);
      } else if (modalDecision === "Accept") {
        updateRes({ mood: +14, reputation: +12, funding: +6 });
        addLog(t.logDecisionAccept);
      } else if (modalDecision === "Major") {
        updateRes({ mood: -8, energy: -3, reputation: +2 });
        addLog(t.logDecisionRRMajor);
      } else if (modalDecision === "Minor") {
        updateRes({ mood: -3, energy: -2, reputation: +4 });
        addLog(t.logDecisionRRMinor);
      }
    }
  };

  const endWeek = () => {
    if (endModal) return;

    // if AP left, allow but warn lightly
    setWeek((w) => w + 1);
    setAp(2);

    // upkeep
    updateRes({
      energy: -clamp(Math.round(resources.teaching / 28), 0, 6),
      mood: resources.energy < 18 ? -3 : -1,
      teaching: +2,
    });

    tickReviewsAndDecide();
    maybeEvent();

    addLog(t.logWeekBegins);

    // end run
    if (week >= totalWeeks) {
      setEndModal(true);
      addLog(t.logEndRun);
    }
  };

  const clearSave = () => {
    localStorage.removeItem(SAVE_KEY);
    window.location.reload();
  };

  const restartRun = () => {
    localStorage.removeItem(SAVE_KEY);
    // fast restart without reload
    setWeek(1);
    setAp(2);
    setResources({ energy: 78, mood: 70, funding: 30, reputation: 10, teaching: 25 });
    const p0: Paper = {
      id: uid(),
      title: makeTitle(),
      tier: "Q1",
      topic: pick(TOPICS),
      status: "Draft",
      progress: 45,
      quality: 30,
    };
    setPapers([p0]);
    setActiveId(p0.id);
    setLogs([DICT[lang].logWelcome]);
    setEventModal({ open: false, ev: null });
    setReviewModal({ open: false, paperId: null, decision: null });
    setEndModal(false);
  };

  const stats = useMemo(() => {
    const accepted = papers.filter((p) => p.status === "Accepted").length;
    const rejected = papers.filter((p) => p.status === "Rejected").length;
    const rr = papers.filter((p) => p.status === "R&R").length;
    const drafts = papers.filter((p) => p.status === "Draft").length;
    return { accepted, rejected, rr, drafts };
  }, [papers]);

  const persona = useMemo(() => {
    // lightweight persona logic
    if (stats.accepted >= 2 && resources.mood >= 55) return t.persona5;
    if (stats.accepted >= 1 && (resources.energy < 25 || resources.mood < 25)) return t.persona1;
    if (resources.teaching >= 70 && stats.accepted === 0) return t.persona3;
    if (resources.mood >= 50 && resources.energy >= 45) return t.persona2;
    return t.persona4;
  }, [resources, stats, t]);

  const activeReviewPaper = useMemo(() => papers.find((p) => p.id === reviewModal.paperId) ?? null, [papers, reviewModal.paperId]);

  // UI helpers
  const weekDisplay = `${Math.min(week, totalWeeks)}${t.of}${totalWeeks}`;
  const status = statusLabel(resources, t);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-mono p-4 md:p-8 flex flex-col gap-6 select-none">
      {/* Header */}
      <header className="grid grid-cols-2 md:grid-cols-8 gap-4 bg-zinc-900 border-2 border-zinc-700 p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        <div className="col-span-2 flex flex-col justify-center border-r border-zinc-700 pr-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold text-yellow-500 leading-tight">{t.title}</h1>
              <div className="text-[10px] text-zinc-500 mt-1">{t.subtitle}</div>
            </div>
            <button
              onClick={() => setLang((x) => (x === "zh" ? "en" : "zh"))}
              className="bg-zinc-800 border border-zinc-600 px-2 py-1 text-[10px] hover:bg-zinc-700 flex items-center gap-1"
              title={t.switchLang}
            >
              <Languages size={14} />
              {t.switchLang}
            </button>
          </div>

          <div className="mt-2 flex items-center gap-2">
            <Pill tone={resources.energy < 18 || resources.mood < 18 ? "warn" : "neutral"}>{status}</Pill>
            <Pill tone="neutral">
              {t.week} {weekDisplay}
            </Pill>
            <Pill tone="neutral">
              {t.ap}: {ap}/2
            </Pill>
          </div>
          <div className="text-[10px] text-zinc-500 mt-2">{t.tip}</div>
        </div>

        <ResourceBar label={t.energy} value={resources.energy} icon={Zap} color="bg-blue-500" />
        <ResourceBar label={t.mood} value={resources.mood} icon={Heart} color="bg-pink-500" />
        <ResourceBar label={t.funding} value={resources.funding} icon={DollarSign} color="bg-emerald-500" />
        <ResourceBar label={t.reputation} value={resources.reputation} icon={Award} color="bg-purple-500" />
        <ResourceBar label={t.teaching} value={resources.teaching} icon={BookOpen} color="bg-amber-500" />

        <div className="flex flex-col items-center justify-center bg-zinc-800 border border-zinc-600 rounded">
          <span className="text-[10px] text-zinc-400 uppercase">{t.efficiency}</span>
          <span className="text-2xl font-bold text-white">{eff.toFixed(2)}x</span>
        </div>
      </header>

      <main className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-grow">
        {/* Left */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          {/* Pixel scene */}
          <div className="relative aspect-video bg-zinc-900 border-2 border-zinc-700 overflow-hidden shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
            <div className="absolute inset-0 bg-[radial-gradient(#333_1px,transparent_1px)] [background-size:16px_16px] opacity-20" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="w-24 h-32 bg-zinc-800 border-2 border-zinc-600 mx-auto relative mb-4 animate-bounce duration-1000">
                  <div className="absolute top-4 left-4 w-4 h-4 bg-zinc-200" />
                  <div className="absolute top-4 right-4 w-4 h-4 bg-zinc-200" />
                  <div className="absolute bottom-4 left-4 right-4 h-4 bg-zinc-500" />
                </div>

                {activePaper && (
                  <div className="max-w-xl mx-auto">
                    <div className="flex items-center justify-center gap-2 mb-2 flex-wrap">
                      <Pill
                        tone={
                          activePaper.status === "Accepted"
                            ? "good"
                            : activePaper.status === "Rejected"
                            ? "bad"
                            : activePaper.status === "R&R"
                            ? "warn"
                            : "neutral"
                        }
                      >
                        {activePaper.status === "Draft"
                          ? t.draft
                          : activePaper.status === "Under Review"
                          ? t.underReview
                          : activePaper.status === "R&R"
                          ? t.rr
                          : activePaper.status === "Accepted"
                          ? t.accepted
                          : t.rejected}
                      </Pill>
                      <Pill tone="neutral">{activePaper.tier}</Pill>
                      <Pill tone="neutral">{activePaper.topic}</Pill>
                      {activePaper.status === "Under Review" && activePaper.review && (
                        <Pill tone="warn">
                          {t.decisionIn} ~{activePaper.review.etaWeeks} {t.weeks}
                        </Pill>
                      )}
                      {activePaper.status === "R&R" && activePaper.review && (
                        <Pill tone="warn">
                          {t.pointsLeft}: {activePaper.review.revisePointsLeft}
                        </Pill>
                      )}
                    </div>

                    <div className="text-sm font-bold text-zinc-100 line-clamp-2">{activePaper.title}</div>

                    <div className="mt-3 flex items-center gap-2">
                      <div className="flex-grow h-2 bg-black border border-zinc-700">
                        <div className="h-full bg-blue-500" style={{ width: `${clamp(activePaper.progress, 0, 120)}%` }} />
                      </div>
                      <span className="text-[10px] font-bold">{Math.round(activePaper.progress)}%</span>
                      <span className="text-[10px] text-zinc-400">
                        Q={Math.round(activePaper.quality)}/100
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* AP indicator */}
            <div className="absolute top-4 left-4 flex gap-2 items-center">
              {[...Array(2)].map((_, i) => (
                <div
                  key={i}
                  className={`w-7 h-7 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${
                    i < ap ? "bg-yellow-400" : "bg-zinc-700"
                  }`}
                />
              ))}
              <span className="ml-2 text-sm font-bold">{t.ap}</span>
            </div>
          </div>

          {/* Action grid */}
          <div className="bg-zinc-900 border-2 border-zinc-700 p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs uppercase font-black text-zinc-500 flex items-center gap-2">
                <PenTool size={14} /> {t.actions}
              </h2>
              <div className="text-[10px] text-zinc-500">{t.maxPaperHint}</div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <button
                onClick={actWrite}
                className="bg-blue-900 border-2 border-blue-400 p-3 hover:bg-blue-800 active:translate-y-1 shadow-[3px_3px_0px_0px_rgba(30,58,138,1)] transition-all"
              >
                <div className="flex items-center gap-2">
                  <PenTool size={16} />
                  <div className="font-bold">{t.write}</div>
                </div>
                <div className="text-[10px] opacity-70 mt-1">1 AP</div>
              </button>

              <button
                onClick={actData}
                className="bg-emerald-900 border-2 border-emerald-400 p-3 hover:bg-emerald-800 active:translate-y-1 shadow-[3px_3px_0px_0px_rgba(6,78,59,1)] transition-all"
              >
                <div className="flex items-center gap-2">
                  <BarChart3 size={16} />
                  <div className="font-bold">{t.data}</div>
                </div>
                <div className="text-[10px] opacity-70 mt-1">1 AP | -$2</div>
              </button>

              <button
                onClick={actGrade}
                className="bg-amber-900 border-2 border-amber-400 p-3 hover:bg-amber-800 active:translate-y-1 shadow-[3px_3px_0px_0px_rgba(120,53,15,1)] transition-all"
              >
                <div className="flex items-center gap-2">
                  <BookOpen size={16} />
                  <div className="font-bold">{t.grade}</div>
                </div>
                <div className="text-[10px] opacity-70 mt-1">1 AP</div>
              </button>

              <button
                onClick={actRest}
                className="bg-zinc-800 border-2 border-zinc-500 p-3 hover:bg-zinc-700 active:translate-y-1 shadow-[3px_3px_0px_0px_rgba(39,39,42,1)] transition-all"
              >
                <div className="flex items-center gap-2">
                  <Coffee size={16} />
                  <div className="font-bold">{t.rest}</div>
                </div>
                <div className="text-[10px] opacity-70 mt-1">1 AP</div>
              </button>

              <button
                onClick={actSubmit}
                disabled={!canSubmit}
                className={`p-3 border-2 active:translate-y-1 transition-all shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]
                ${canSubmit ? "bg-white text-black border-zinc-400 hover:bg-zinc-200" : "bg-zinc-700 text-zinc-300 border-zinc-600 cursor-not-allowed"}`}
              >
                <div className="flex items-center gap-2">
                  <Send size={16} />
                  <div className="font-black">{t.submit}</div>
                </div>
                <div className="text-[10px] opacity-70 mt-1">{t.needsDraft}</div>
              </button>

              <button
                onClick={actRevise}
                disabled={!canRevise}
                className={`p-3 border-2 active:translate-y-1 transition-all shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]
                ${canRevise ? "bg-red-600 text-white border-red-900 hover:bg-red-700" : "bg-zinc-700 text-zinc-300 border-zinc-600 cursor-not-allowed"}`}
              >
                <div className="flex items-center gap-2">
                  <Wrench size={16} />
                  <div className="font-black">{t.revise}</div>
                </div>
                <div className="text-[10px] opacity-70 mt-1">{t.needsRR}</div>
              </button>

              <button
                onClick={startNewPaper}
                className="col-span-2 md:col-span-3 bg-zinc-900 border-2 border-dashed border-zinc-600 p-3 hover:border-zinc-400 transition-all"
              >
                <div className="flex items-center justify-center gap-2">
                  <Plus size={16} />
                  <div className="font-bold">{t.startNewPaper}</div>
                </div>
                <div className="text-[10px] text-zinc-500 mt-1">{t.maxPaperHint}</div>
              </button>
            </div>
          </div>

          {/* End week */}
          <button
            onClick={endWeek}
            className="bg-white text-black font-black p-4 border-b-4 border-zinc-400 hover:bg-zinc-200 active:border-b-0 active:translate-y-1 transition-all"
          >
            {t.endWeek}
          </button>
        </div>

        {/* Right */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          {/* Pipeline */}
          <div className="bg-zinc-900 border-2 border-zinc-700 p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col gap-3">
            <h2 className="text-xs uppercase font-black text-zinc-500 border-b border-zinc-800 pb-2 flex items-center gap-2">
              <Layers size={14} /> {t.pipeline}
            </h2>

            <div className="space-y-2 max-h-[360px] overflow-auto pr-1">
              {papers.map((p) => {
                const isActive = p.id === activeId;
                const tone =
                  p.status === "Accepted" ? "good" : p.status === "Rejected" ? "bad" : p.status === "R&R" ? "warn" : "neutral";
                return (
                  <button
                    key={p.id}
                    onClick={() => setActiveId(p.id)}
                    className={`w-full text-left bg-zinc-800 border p-3 transition-all
                    ${isActive ? "border-yellow-400 shadow-[0_0_0_2px_rgba(250,204,21,0.35)]" : "border-zinc-600 hover:border-zinc-400"}`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Pill tone={tone as any}>
                          {p.status === "Draft"
                            ? t.draft
                            : p.status === "Under Review"
                            ? t.underReview
                            : p.status === "R&R"
                            ? t.rr
                            : p.status === "Accepted"
                            ? t.accepted
                            : t.rejected}
                        </Pill>
                        <Pill tone="neutral">{p.tier}</Pill>
                        {p.status === "Under Review" && p.review && (
                          <Pill tone="warn">
                            ~{p.review.etaWeeks}
                            {lang === "zh" ? "周" : "w"}
                          </Pill>
                        )}
                        {p.status === "R&R" && p.review && <Pill tone="warn">Pts {p.review.revisePointsLeft}</Pill>}
                      </div>
                      <div className="text-[10px] text-zinc-400">{Math.round(p.quality)}/100</div>
                    </div>

                    <div className="text-sm font-bold line-clamp-2 mb-2">{p.title}</div>
                    <div className="flex items-center gap-2">
                      <div className="flex-grow h-2 bg-black border border-zinc-700">
                        <div className="h-full bg-blue-500" style={{ width: `${clamp(p.progress, 0, 120)}%` }} />
                      </div>
                      <span className="text-[10px] font-bold">{Math.round(p.progress)}%</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Log */}
          <div className="bg-black border-2 border-zinc-700 p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex-grow flex flex-col gap-2">
            <h2 className="text-xs uppercase font-black text-zinc-600">{t.log}</h2>
            <div className="text-[11px] font-mono space-y-2">
              {logs.map((log, i) => (
                <div key={i} className={`${i === 0 ? "text-zinc-100" : "text-zinc-600"}`}>
                  {`> ${log}`}
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={restartRun}
              className="flex-1 bg-zinc-800 border border-zinc-600 p-3 text-xs hover:bg-zinc-700"
            >
              {t.playAgain}
            </button>
            <button
              onClick={clearSave}
              className="bg-zinc-900 border border-zinc-700 p-3 text-xs hover:bg-zinc-800"
            >
              {t.reset}
            </button>
          </div>
        </div>
      </main>

      {/* Review Modal */}
      {reviewModal.open && activeReviewPaper && reviewModal.decision && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-50">
          <div className="max-w-2xl w-full bg-zinc-900 border-4 border-red-600 p-6 shadow-[16px_16px_0px_0px_rgba(153,27,27,0.4)]">
            <div className="flex items-center justify-between gap-2 mb-4">
              <div className="flex items-center gap-2 text-red-500">
                <AlertTriangle size={22} />
                <h2 className="text-xl font-black italic">{t.decisionLetter}</h2>
              </div>
              <button
                onClick={() => setReviewModal({ open: false, paperId: null, decision: null })}
                className="text-zinc-300 hover:text-white"
                aria-label="close"
              >
                <XCircle size={18} />
              </button>
            </div>

            <div className="mb-3">
              <div className="flex items-center gap-2 flex-wrap mb-2">
                <Pill
                  tone={
                    reviewModal.decision === "Accept"
                      ? "good"
                      : reviewModal.decision === "Reject"
                      ? "bad"
                      : "warn"
                  }
                >
                  {reviewModal.decision.toUpperCase()}
                </Pill>
                <Pill tone="neutral">{activeReviewPaper.tier}</Pill>
                {activeReviewPaper.review && (
                  <Pill tone="neutral">
                    {t.round} {activeReviewPaper.review.round}
                  </Pill>
                )}
                {activeReviewPaper.status === "R&R" && activeReviewPaper.review && (
                  <Pill tone="warn">
                    {t.pointsLeft}: {activeReviewPaper.review.revisePointsLeft}
                  </Pill>
                )}
              </div>

              <div className="text-sm font-bold">{activeReviewPaper.title}</div>
            </div>

            {activeReviewPaper.review && (
              <div className="bg-black p-4 border border-zinc-700 space-y-3">
                <div className="text-xs uppercase text-zinc-500 font-black">{t.reviewerComments}</div>
                {activeReviewPaper.review.comments.slice(0, 4).map((c, idx) => (
                  <div key={idx} className="text-sm leading-relaxed">
                    <div className="text-[11px] text-zinc-400 mb-1">
                      {c.reviewerType} | {t.severity} {c.severity}/5 | +{c.points} pts
                    </div>
                    <div className="italic">“{c.text}”</div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                onClick={() => setReviewModal({ open: false, paperId: null, decision: null })}
                className="bg-red-600 text-white p-3 font-bold hover:bg-red-700 border-b-4 border-red-900"
              >
                OK
              </button>
              <button
                onClick={() => {
                  setReviewModal({ open: false, paperId: null, decision: null });
                  updateRes({ mood: +5 });
                  addLog(lang === "zh" ? "吐槽群聊：心态+5。" : "Rant in chat: Mood +5.");
                }}
                className="bg-zinc-700 text-white p-3 font-bold hover:bg-zinc-600 border-b-4 border-zinc-900"
              >
                {lang === "zh" ? "吐槽一下" : "Rant"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Event Modal */}
      {eventModal.open && eventModal.ev && (
        <div className="fixed inset-0 bg-black/75 flex items-end md:items-center justify-center p-4 z-40">
          <div className="max-w-xl w-full bg-zinc-900 border-2 border-blue-500 p-5 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
            <div className="flex items-start justify-between gap-3 mb-2">
              <h3 className="font-bold text-blue-400 uppercase tracking-tighter">{t.eventTitle}</h3>
              <button
                onClick={() => setEventModal({ open: false, ev: null })}
                className="text-zinc-300 hover:text-white"
              >
                <XCircle size={16} />
              </button>
            </div>

            <div className="text-sm text-zinc-200 font-bold mb-2">{eventModal.ev.titleKey}</div>
            <p className="text-sm text-zinc-300 mb-4">{eventModal.ev.descKey}</p>

            <div className="text-[11px] text-zinc-500 mb-2">{t.choose}</div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {eventModal.ev.choices.map((ch, i) => (
                <button
                  key={i}
                  onClick={() => {
                    updateRes(ch.effect);
                    addLog(ch.logKey);
                    setEventModal({ open: false, ev: null });
                  }}
                  className="text-xs bg-zinc-800 border border-zinc-600 px-3 py-2 hover:bg-zinc-700 text-left"
                >
                  {t[ch.labelKey] ?? ch.labelKey}
                  <div className="text-[10px] text-zinc-400 mt-1">
                    {Object.entries(ch.effect)
                      .map(([k, v]) => `${k}${(v as number) >= 0 ? "+" : ""}${v}`)
                      .join(" | ")}
                  </div>
                </button>
              ))}
            </div>

            <div className="mt-4 text-[10px] text-zinc-500 flex items-center gap-2">
              <Clock size={12} /> {lang === "zh" ? "事件处理完，继续活着。" : "Resolve it and keep going."}
            </div>
          </div>
        </div>
      )}

      {/* End Modal */}
      {endModal && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-50">
          <div className="max-w-xl w-full bg-zinc-900 border-4 border-emerald-600 p-6 shadow-[16px_16px_0px_0px_rgba(5,150,105,0.35)]">
            <div className="flex items-center justify-between gap-2 mb-4">
              <div className="flex items-center gap-2 text-emerald-400">
                <CheckCircle2 size={22} />
                <h2 className="text-xl font-black italic">{t.endCardTitle}</h2>
              </div>
              <button onClick={() => setEndModal(false)} className="text-zinc-300 hover:text-white">
                <XCircle size={18} />
              </button>
            </div>

            <div className="mb-4">
              <div className="text-[11px] text-zinc-500 mb-1">{t.resultYouAre}</div>
              <div className="text-lg font-black">{persona}</div>
            </div>

            <div className="bg-black border border-zinc-700 p-4 text-sm">
              <div className="text-[11px] text-zinc-500 mb-2">{t.resultStats}</div>
              <div className="grid grid-cols-2 gap-2 text-[12px]">
                <div>{t.acceptedN}: <span className="font-bold">{stats.accepted}</span></div>
                <div>{t.rejectedN}: <span className="font-bold">{stats.rejected}</span></div>
                <div>{t.rrN}: <span className="font-bold">{stats.rr}</span></div>
                <div>{t.draftsN}: <span className="font-bold">{stats.drafts}</span></div>
              </div>
              <div className="mt-3 text-[12px] text-zinc-300">
                Energy {Math.round(resources.energy)} | Mood {Math.round(resources.mood)} | Rep {Math.round(resources.reputation)}
              </div>
              <div className="mt-2 text-[11px] text-zinc-500 italic">
                {lang === "zh"
                  ? "你活下来了。系统并未承诺任何幸福。"
                  : "You survived. The system did not promise happiness."}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-5">
              <button
                onClick={restartRun}
                className="bg-emerald-600 text-white p-3 font-bold hover:bg-emerald-700 border-b-4 border-emerald-900"
              >
                {t.playAgain}
              </button>
              <button
                onClick={clearSave}
                className="bg-zinc-700 text-white p-3 font-bold hover:bg-zinc-600 border-b-4 border-zinc-900"
              >
                {t.reset}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="flex justify-between items-center text-[10px] text-zinc-600 border-t border-zinc-800 pt-4">
        <div>ttt.tsx v0.2</div>
        <div className="flex gap-4 items-center">
          <span className="flex items-center gap-1">
            <CheckCircle2 size={10} /> AUTOSAVED
          </span>
          <span className="flex items-center gap-1">
            <Clock size={10} /> {lang === "zh" ? "12 周速通" : "12-week speedrun"}
          </span>
        </div>
      </footer>
    </div>
  );
}
