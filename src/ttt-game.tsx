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
  Camera,
  Link as LinkIcon,
} from "lucide-react";
import html2canvas from "html2canvas";
import QRCode from "qrcode";

/**
 * Tourism, Tenure & Tears (TTT)
 * Satire simulator, Gameboy edition
 * - Multi-paper pipeline (max 5)
 * - Reviewer + revise points + shortened review cycle
 * - More frequent random events
 * - Rejection can resubmit
 * - Funding enters system (grant action)
 * - ZH/EN toggle
 * - Dark/Bright theme toggle
 * - Difficulty (AP per week): Low/Med/High => 10/7/5
 * - Infinite logs with scroll
 * - Screenshot mode ending card
 * - Horse-year banner + dryangyang.com link
 * - User guide links (ZH/EN)
 */

type Lang = "zh" | "en";
type Tier = "Q1" | "Q2" | "Q3";
type PaperStatus = "Draft" | "Under Review" | "R&R" | "Accepted" | "Rejected";
type ThemeMode = "dark" | "bright";
type Difficulty = "low" | "mid" | "high";

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
  points: number;
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
  quality: number; // 0-100
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

type Decision = "Reject" | "Major" | "Minor" | "Accept";

const SAVE_KEY = "ttt_gameboy_v10";

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const rint = (lo: number, hi: number) => Math.floor(Math.random() * (hi - lo + 1)) + lo;
const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];
const uid = () => `p_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;

const DIFF_AP: Record<Difficulty, number> = { low: 7, mid: 5, high: 3 };

const GUIDE_ZH = "manual.pdf";
const GUIDE_EN = "/guide/en.html";
const SITE_URL = "https://sites.temple.edu/yangyang";

const TOPICS = [
  "Sustainability",
  "Overtourism",
  "Labor",
  "Mobility",
  "DMO Marketing",
  "Hotel Pricing",
  "Destination Resilience",
  "Sport Events",
  "Air Pollution",
  "Social Media",
];

const TITLE_TEMPLATES = [
  "A spatial analysis of {X} and {Y} across {D}",
  "Do {X} policies reshape {Y}? Evidence from {D}",
  "{X} shocks and {Y}: A panel study in {D}",
  "Forecasting {Y} using {X}: Lessons from {D}",
  "{X} and {Y} in the era of uncertainty: Insights from {D}",
];

const TITLE_X = ["overtourism", "green nudges", "big data", "AI content", "price adjustment", "risk perception"];
const TITLE_Y = ["visitor emotions", "labor outcomes", "tourism demand", "hotel performance", "resident support"];
const TITLE_D = ["destinations", "MSAs", "state DMOs", "urban districts", "national parks"];

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
  const moodPenalty = 1 - clamp((35 - r.mood) / 200, 0, 0.18);
  return clamp(energyFactor * teachPenalty * moodPenalty, 0.55, 1.25);
}

function computeQuality(r: Resources, progress: number, base: number) {
  const progressBonus = clamp((progress - 100) * 0.18, 0, 6);
  const teachPenalty = clamp(r.teaching * 0.12, 0, 14);
  const lowEnergyPenalty = r.energy < 25 ? clamp((25 - r.energy) * 0.35, 0, 9) : 0;
  return clamp(base + progressBonus - teachPenalty - lowEnergyPenalty, 0, 100);
}

const REVIEWERS: Array<{ type: ReviewerType; baseSeverity: 1 | 2 | 3 | 4 | 5; basePoints: number; pool: string[] }> = [
  {
    type: "Methodology Freak",
    baseSeverity: 5,
    basePoints: 18,
    pool: [
      "Endogeneity is fatal. Please use a natural experiment in a vacuum.",
      "Your identification strategy is not convincing. Consider 17 robustness checks and 3 placebo tests.",
      "Please justify each fixed effect as if defending a thesis at 2am.",
    ],
  },
  {
    type: "Theory Purist",
    baseSeverity: 4,
    basePoints: 14,
    pool: [
      "Theoretical contribution is unclear. Please add 6 new theories and reconcile them.",
      "ELM is mentioned. Please connect it to every variable including weather.",
      "Your framework is interesting, but it needs a framework for the framework.",
    ],
  },
  {
    type: "Citation Hoarder",
    baseSeverity: 3,
    basePoints: 12,
    pool: [
      "The literature review is missing my 2009 paper and also my 2011 paper and my 2014 paper.",
      "Please cite at least 40 more studies, preferably all mine.",
      "You should include a paragraph that summarizes the entire field since 1973.",
    ],
  },
  {
    type: "Three-Line Rejector",
    baseSeverity: 5,
    basePoints: 20,
    pool: [
      "Not suitable for the journal. Good luck.",
      "The paper lacks novelty. Reject.",
      "The topic is important but the paper is not. Reject.",
    ],
  },
  {
    type: "Writing Coach",
    baseSeverity: 2,
    basePoints: 10,
    pool: [
      "The writing is clear. Please make it even clearer by adding more clarity.",
      "Consider reducing redundancy. Also add more detail. Thanks.",
      "Minor edits needed. Mostly commas. Thousands of commas.",
    ],
  },
  {
    type: "Misreader",
    baseSeverity: 4,
    basePoints: 15,
    pool: [
      "You did not include variable Z (which you included on page 2). Please add it.",
      "Your sample seems to be from Antarctica (it is not). Please clarify.",
      "You claimed results contradict themselves (they do not). Please rewrite everything.",
    ],
  },
  {
    type: "Rare Nice Reviewer",
    baseSeverity: 1,
    basePoints: 6,
    pool: ["Nice work. A few small suggestions. Also: take a break.", "Strong paper. Minor polish only.", "Clear contribution. Please keep it concise."],
  },
  {
    type: "One-Method Evangelist",
    baseSeverity: 4,
    basePoints: 16,
    pool: [
      "You must use my favorite method. Otherwise results are invalid.",
      "Please replace your model with a model I like.",
      "Consider an entirely different method and dataset, within 2 weeks.",
    ],
  },
];

// Review cycle shortened by 1 week overall vs your uploaded version.
// Keeps feeling realistic but faster.
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
    const soften = quality >= 75 ? 1 : quality >= 60 ? 0.5 : 0;
    const sev = clamp(Math.round(r.baseSeverity - soften), 1, 5) as 1 | 2 | 3 | 4 | 5;

    const tierBoost = tier === "Q1" ? 1.12 : tier === "Q2" ? 1.0 : 0.92;
    const points = clamp(Math.round((r.basePoints + rint(0, 6)) * (sev / 3) * tierBoost), 6, 30);

    return { reviewerType: r.type, severity: sev, text: pick(r.pool), points };
  });

  // Shorter review times: reduce base ranges and remove extra +1 for round-2.
  // Cap ETA to at most 2 weeks to keep average turnaround <= 2.
  const baseEta = tier === "Q1" ? rint(1, 3) : tier === "Q2" ? rint(1, 2) : rint(1, 2);
  const etaWeeks = clamp(baseEta + (rep < 15 ? 1 : 0), 1, 2);

  const pointsTotal = clamp(
    comments.reduce((s, c) => s + c.points, 0),
    tier === "Q1" ? 30 : 22,
    tier === "Q1" ? 80 : 60
  );

  return { etaWeeks, comments, pointsTotal };
}

function decide(tier: Tier, rep: number, quality: number, round: 1 | 2): Decision {
  const difficulty = tierDifficulty(tier);
  const score = quality + rep * 0.25 - difficulty + (round === 2 ? 6 : 0);

  let pReject = tier === "Q1" ? 0.30 : tier === "Q2" ? 0.20 : 0.10;
  let pAccept = tier === "Q1" ? 0.03 : tier === "Q2" ? 0.06 : 0.12;
  let pMinor = tier === "Q1" ? 0.10 : tier === "Q2" ? 0.20 : 0.32;
  let pMajor = 1 - (pReject + pAccept + pMinor);

  const shift = clamp(score / 140, -0.18, 0.22);
  pReject = clamp(pReject - shift * 0.9, 0.05, 0.85);
  pAccept = clamp(pAccept + Math.max(0, shift) * 0.7, 0.01, 0.35);
  pMinor = clamp(pMinor + shift * 0.6, 0.02, 0.75);
  pMajor = clamp(1 - (pReject + pAccept + pMinor), 0.05, 0.80);

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

function makeEvents(): GameEvent[] {
  return [
    {
      id: "student_font",
      titleKey: "Student Complaint",
      descKey: "A student says your PPT font is too small and requests a meeting.",
      choices: [
        { labelKey: "btnPolitely", effect: { mood: -2, teaching: -6, reputation: +1 }, logKey: "Explained politely. They still want 48pt fonts." },
        { labelKey: "btnOvernight", effect: { energy: -12, teaching: -10, mood: -3 }, logKey: "You resized everything overnight. Billboard-ready slides." },
        { labelKey: "btnIgnore", effect: { teaching: +10, reputation: -3, mood: +2 }, logKey: "Ignored. The complaint found a form." },
      ],
    },
    {
      id: "committee",
      titleKey: "Committee Surprise",
      descKey: "You are added to a committee because you are 'good with data'.",
      choices: [
        { labelKey: "btnAccept", effect: { reputation: +2, teaching: +6, mood: -2 }, logKey: "Accepted. Calendar lost a fight." },
        { labelKey: "btnDecline", effect: { reputation: -1, mood: -1, teaching: -2 }, logKey: "Declined carefully. Hallway got colder." },
      ],
    },
    {
      id: "data_loss",
      titleKey: "Data Vanished",
      descKey: "Your file final_final_v7_REAL.dta disappeared. The universe offers no explanation.",
      choices: [
        { labelKey: "btnRerun", effect: { energy: -18, mood: -8 }, logKey: "Reran pipeline. It worked. You aged 3 years." },
        { labelKey: "btnAskRA", effect: { funding: -10, energy: -6, mood: -2 }, logKey: "RA helped. Budget cried quietly." },
        { labelKey: "btnPretend", effect: { mood: +3, reputation: -4 }, logKey: "Pretended fine. Future-you is now enemy." },
      ],
    },
    {
      id: "special_issue",
      titleKey: "Special Issue Invite",
      descKey: "An editor invites you to a special issue. Deadline is 'soon'.",
      choices: [
        { labelKey: "btnSayYes", effect: { reputation: +6, mood: -3, teaching: +8 }, logKey: "You said yes. Your life said no." },
        { labelKey: "btnSayMaybe", effect: { reputation: +2, mood: -1 }, logKey: "You said maybe. Academia's strongest spell." },
      ],
    },
    {
      id: "collab",
      titleKey: "Hallway Collaboration",
      descKey: "A famous scholar says, 'We should collaborate sometime.'",
      choices: [
        { labelKey: "btnFollowUp", effect: { reputation: +8, mood: +4, energy: -6 }, logKey: "Followed up. They replied. Rare loot." },
        { labelKey: "btnWait", effect: { mood: +1 }, logKey: "Waited. Draft email lives forever." },
      ],
    },
    {
      id: "grant_deadline",
      titleKey: "Grant Deadline",
      descKey: "A grant deadline appears out of nowhere. It is tomorrow (of course).",
      choices: [
        { labelKey: "btnOvernight", effect: { funding: +14, energy: -14, mood: -5 }, logKey: "You wrote a budget narrative at 3am. Miraculously funded." },
        { labelKey: "btnPolitely", effect: { mood: +1, teaching: -2 }, logKey: "You let it go. Inner peace +1." },
      ],
    },
  ];
}

const DICT: Record<Lang, Record<string, string>> = {
  zh: {
    title: "TOURISM, TENURE & TEARS",
    subtitle: "学术生存模拟器",
    horse: "🐴 马年快乐", 
    site: "www.dryangyang.com",
    guide: "使用说明",
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
    maxPaperHint: "最多 5 篇",
    actions: "行动",
    write: "写作",
    data: "跑数据",
    grade: "批作业",
    rest: "休息",
    submit: "投稿",
    revise: "改稿",
    resubmit: "再投一次",
    grant: "搞钱",
    switchLang: "中英切换",
    theme: "主题",
    diff: "强度",
    diffLow: "低 AP7",
    diffMid: "中 AP5",
    diffHigh: "高 AP3",
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
    screenshot: "截图模式",
    exitShot: "退出截图模式",
    copyText: "复制结果文字",
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
    logMaxPapers: "论文太多了（最多 5 篇）。先把坑填一填。",
    logSubmit: "已投稿。系统显示：Under Review。",
    logNotReady: "草稿还不够。请先写到 100%。",
    logRevise: "改稿中。审稿人依然很自信。",
    logNoRR: "没有 R&R 可改。珍惜这份平静。",
    logResubmit: "拒稿不代表结束：换个期刊继续投。",
    logWeekBegins: "新的一周开始了，邮箱已经看起来很凶。",
    logDecisionReject: "结果：拒稿。恭喜获得新选题机会。",
    logDecisionRRMajor: "结果：Major Revision。周末消失。",
    logDecisionRRMinor: "结果：Minor Revision。你差点以为自己被尊重了。",
    logDecisionAccept: "结果：录用。快乐持续 3 秒钟。",
    logEvent: "事件触发：",
    logReviseDone: "改稿点清零，已自动 resubmit，进入下一轮审稿。",
    logGrantWin: "经费到账：你会写预算叙事了。",
    logGrantFail: "经费被拒：请补充 14 份附件并重投。",
    logEndRun: "12 周结束。本局已结算。",
    persona1: "🔥 顶刊燃尽机",
    persona2: "😎 平衡生存者",
    persona3: "🏫 教学英雄",
    persona4: "🧂 咸味现实主义者",
    persona5: "🦄 稀有独角兽",
    selectWeeks: "选择游戏周数",
    weeksOption: "周",
    username: "用户名（可选）",
    usernamePlaceholder: "输入你的名字",
    includeUsername: "在截图中显示用户名",
    generateScreenshot: "生成截图",
    downloadImage: "下载图片",
    shareVia: "分享到",
    copyLink: "复制分享链接",
    shareWeChat: "微信分享",
    shareXiaohongshu: "小红书分享",
    shareWeibo: "微博分享",
    shareInstagram: "Instagram 分享",
    shareTwitter: "Twitter 分享",
    weChat: "微信",
    xiaohongshu: "小红书",
    weibo: "微博",
    instagram: "Instagram",
    twitter: "Twitter",
  },
  en: {
    title: "TOURISM, TENURE & TEARS",
    subtitle: "Early-Career Satire Simulator",
    horse: "🐴 Happy Year of the Horse",
    site: "www.dryangyang.com",
    guide: "User Guide",
    week: "Week",
    of: " / ",
    ap: "AP",
    energy: "Energy",
    mood: "Mood",
    funding: "Funding",
    reputation: "Reputation",
    teaching: "Teaching",
    efficiency: "Efficiency",
    pipeline: "Pipeline",
    active: "Active",
    log: "Terminal Log",
    endWeek: "END WEEK",
    startNewPaper: "Start New Paper",
    maxPaperHint: "Max 5",
    actions: "Actions",
    write: "WRITE",
    data: "RUN DATA",
    grade: "GRADE",
    rest: "REST",
    submit: "SUBMIT",
    revise: "REVISE",
    resubmit: "RESUBMIT",
    grant: "FUND",
    switchLang: "ZH/EN",
    theme: "Theme",
    diff: "Intensity",
    diffLow: "Low AP10",
    diffMid: "Mid AP7",
    diffHigh: "High AP5",
    draft: "Draft",
    underReview: "Under Review",
    rr: "R&R",
    accepted: "Accepted",
    rejected: "Rejected",
    needsDraft: "Need progress ≥ 100%",
    needsRR: "Only for R&R",
    needsFunding: "Not enough funding",
    notEnoughAP: "Not enough AP",
    eventTitle: "Event",
    choose: "Choose a response",
    close: "Close",
    decisionLetter: "Decision Letter",
    reviewerComments: "Reviewer Comments",
    severity: "Severity",
    pointsLeft: "Revise points left",
    decision: "Decision",
    round: "Round",
    decisionIn: "Decision in",
    weeks: "weeks",
    endCardTitle: "Ending",
    playAgain: "Play again",
    reset: "Clear save",
    screenshot: "Screenshot Mode",
    exitShot: "Exit",
    copyText: "Copy text",
    resultYouAre: "You are",
    resultStats: "Run stats",
    acceptedN: "Accepted",
    rejectedN: "Rejected",
    rrN: "R&R",
    draftsN: "Drafts",
    tip: "Tip: Rest + lower teaching load boosts efficiency a lot.",
    statusOk: "Barely online",
    statusTired: "Running on fumes",
    statusBurn: "Collapse incoming",
    btnPolitely: "Explain politely",
    btnOvernight: "Pull all-nighter",
    btnIgnore: "Ignore it",
    btnAccept: "Accept",
    btnDecline: "Decline",
    btnRerun: "Rerun",
    btnAskRA: "Ask RA",
    btnPretend: "Pretend fine",
    btnSayYes: "Say yes",
    btnSayMaybe: "Say maybe",
    btnFollowUp: "Follow up",
    btnWait: "Wait",
    logWelcome: "Welcome to academia. Hydrate and cope.",
    logNoAP: "No AP left. End the week.",
    logNeedFunding: "Cloud compute refused: insufficient funding.",
    logWrite: "Writing progressed.",
    logData: "Regressions are running.",
    logGrade: "Grading done. You discovered 12 new grammars.",
    logRest: "Recovered briefly. The wall never rejects.",
    logStartPaper: "New paper started: anxiety + dopamine.",
    logMaxPapers: "Too many papers (max 5). Fill a hole first.",
    logSubmit: "Submitted. Status: Under Review.",
    logNotReady: "Not ready. Get to 100% first.",
    logRevise: "Revising. Reviewer confidence remains undefeated.",
    logNoRR: "No R&R to revise. Enjoy the silence.",
    logResubmit: "Rejection is not the end. Try another journal.",
    logWeekBegins: "A new week begins. Your inbox looks aggressive.",
    logDecisionReject: "Decision: Reject. Congratulations on a new research agenda.",
    logDecisionRRMajor: "Decision: Major Revision. Weekend deleted.",
    logDecisionRRMinor: "Decision: Minor Revision. You almost felt respected.",
    logDecisionAccept: "Decision: Accept. Joy lasts 3 seconds.",
    logEvent: "Event triggered:",
    logReviseDone: "Revise points cleared. Auto-resubmitted to round 2.",
    logGrantWin: "Funding secured. Your budget narrative was poetic.",
    logGrantFail: "Funding rejected. Please attach 14 more documents.",
    logEndRun: "12 weeks done. Run settled.",
    persona1: "🔥 Burnout Engine",
    persona2: "😎 Balanced Survivor",
    persona3: "🏫 Teaching Hero",
    persona4: "🧂 Salty Realist",
    persona5: "🦄 Rare Unicorn",
    selectWeeks: "Select total weeks",
    weeksOption: "weeks",
    username: "Username (optional)",
    usernamePlaceholder: "Enter your name",
    includeUsername: "Include username in screenshot",
    generateScreenshot: "Generate Screenshot",
    downloadImage: "Download Image",
    shareVia: "Share via",
    copyLink: "Copy share link",
    shareWeChat: "Share to WeChat",
    shareXiaohongshu: "Share to Xiaohongshu",
    shareWeibo: "Share to Weibo",
    shareInstagram: "Share to Instagram",
    shareTwitter: "Share to Twitter",
    weChat: "WeChat",
    xiaohongshu: "Xiaohongshu",
    weibo: "Weibo",
    instagram: "Instagram",
    twitter: "Twitter",
  },
};

function statusLabel(r: Resources, t: Record<string, string>) {
  if (r.energy < 18 || r.mood < 18) return t.statusBurn;
  if (r.energy < 35 || r.mood < 35) return t.statusTired;
  return t.statusOk;
}

function personaOf(stats: { accepted: number; rejected: number; rr: number; drafts: number }, r: Resources, t: Record<string, string>) {
  if (stats.accepted >= 2) return t.persona5;
  if (stats.accepted >= 1 && r.energy < 30) return t.persona1;
  if (r.teaching > 70 && stats.accepted === 0) return t.persona3;
  if (r.mood >= 55 && r.energy >= 45) return t.persona2;
  return t.persona4;
}

/** Main */
export default function TTTGame() {
  const loaded = useMemo(() => {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }, []);

  const [lang, setLang] = useState<Lang>(loaded?.lang ?? "zh");
  const t = DICT[lang];

  const [theme, setTheme] = useState<ThemeMode>(loaded?.theme ?? "dark");
  const [difficulty, setDifficulty] = useState<Difficulty>(loaded?.difficulty ?? "mid");
  const apMax = DIFF_AP[difficulty];

  const [week, setWeek] = useState<number>(loaded?.week ?? 1);
  const [totalWeeks, setTotalWeeks] = useState<number>(loaded?.totalWeeks ?? 12);

  const [ap, setAp] = useState<number>(() => {
    const v = typeof loaded?.ap === "number" ? loaded.ap : apMax;
    return clamp(v, 0, apMax);
  });

  const [resources, setResources] = useState<Resources>(
    loaded?.resources ?? { energy: 78, mood: 70, funding: 30, reputation: 10, teaching: 25 }
  );

  const [papers, setPapers] = useState<Paper[]>(
    loaded?.papers ?? [
      { id: uid(), title: makeTitle(), tier: "Q1", topic: pick(TOPICS), status: "Draft", progress: 45, quality: 30 },
    ]
  );

  const [activeId, setActiveId] = useState<string>(
    loaded?.activeId ?? (loaded?.papers?.[0]?.id ?? papers[0]?.id)
  );

  const [logs, setLogs] = useState<string[]>(loaded?.logs ?? [t.logWelcome]);

  const [eventModal, setEventModal] = useState<{ open: boolean; ev: GameEvent | null }>({ open: false, ev: null });
  const [reviewModal, setReviewModal] = useState<{ open: boolean; paperId: string | null; decision: Decision | null }>(
    { open: false, paperId: null, decision: null }
  );

  const [endModal, setEndModal] = useState<boolean>(loaded?.endModal ?? false);
  const [screenshotMode, setScreenshotMode] = useState<boolean>(false);
  const [username, setUsername] = useState<string>(loaded?.username ?? "");
  const [includeNameInShot, setIncludeNameInShot] = useState<boolean>(loaded?.includeNameInShot ?? true);
  const [shotDataUrl, setShotDataUrl] = useState<string | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [shareLink, setShareLink] = useState<string | null>(null);

  const activePaper = useMemo(() => papers.find((p) => p.id === activeId) ?? papers[0], [papers, activeId]);
  const eff = useMemo(() => computeEfficiency(resources), [resources]);

  const themeShell =
    theme === "dark"
      ? {
          bg: "bg-[#0b120b] text-[#d7ffd7]",
          panel: "bg-[#0f1b0f] border-[#2d5b2d]",
          panel2: "bg-[#0b120b] border-[#2d5b2d]",
          muted: "text-[#8ff08f]",
          btn: "bg-[#0b120b] border-[#2d5b2d] hover:bg-[#112011]",
        }
      : {
          bg: "bg-[#f6f3e6] text-[#1b2a1b]",
          panel: "bg-[#e8f0dd] border-[#6b8f6b]",
          panel2: "bg-[#f6f3e6] border-[#6b8f6b]",
          muted: "text-[#2f5a2f]",
          btn: "bg-[#f6f3e6] border-[#6b8f6b] hover:bg-[#efe9d2]",
        };

  const addLog = (msg: string) => setLogs((prev) => [msg, ...prev]); // keep all logs

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
          totalWeeks,
          username,
          includeNameInShot,
          ap,
          lang,
          theme,
          difficulty,
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
  }, [week, totalWeeks, username, includeNameInShot, ap, lang, theme, difficulty, resources, papers, activeId, logs, endModal]);

  // if difficulty changed, clamp AP so UI does not break
  useEffect(() => {
    setAp((x) => clamp(x, 0, apMax));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [difficulty]);

  /** Actions */
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

    if (Math.random() < 0.22) {
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

  // Funding enters system: simple grant attempt (risk-reward)
  const actGrant = () => {
    if (!spendAP(1)) return;
    updateRes({ energy: -6, mood: -2, teaching: +1 });

    const baseP = resources.reputation >= 55 ? 0.65 : resources.reputation >= 30 ? 0.5 : 0.35;
    const p = clamp(baseP + (resources.energy >= 60 ? 0.08 : 0) - (resources.teaching >= 70 ? 0.08 : 0), 0.18, 0.82);
    const ok = Math.random() < p;

    if (ok) {
      updateRes({ funding: +14, reputation: +2, mood: +2 });
      addLog(t.logGrantWin);
    } else {
      updateRes({ mood: -5, reputation: -1 });
      addLog(t.logGrantFail);
    }
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
      review: { round: 1, etaWeeks: pkg.etaWeeks, comments: pkg.comments, revisePointsLeft: pkg.pointsTotal },
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

    const base = rint(60, 100);
    const energyBonus = resources.energy >= 55 ? 6 : resources.energy >= 35 ? 3 : 0;
    const moodPenalty = resources.mood < 25 ? 3 : resources.mood < 40 ? 1 : 0;
    const reputationBonus = Math.floor(resources.reputation / 30); // small bonus for higher rep
    // increase max reduction so revise completes faster per action
    const reduction = clamp(base + energyBonus + reputationBonus - moodPenalty, 12, 80);

    updateRes({ energy: -16, mood: -6, teaching: +2 });

    mutatePaper(activePaper.id, (p) => {
      if (!p.review) return p;
      const left = clamp(p.review.revisePointsLeft - reduction, 0, 999);
      if (left === 0) {
        const newQuality = clamp(p.quality + rint(10, 20), 0, 100);
        const pkg = genReview(p.tier, 2, resources.reputation, newQuality);
        // shorten round-2 ETA to speed up the revise turnaround
        const fastEta = Math.max(1, Math.round(pkg.etaWeeks * 0.6));
        addLog(t.logReviseDone);
        return {
          ...p,
          quality: newQuality,
          status: "Under Review",
          review: { round: 2, etaWeeks: fastEta, comments: pkg.comments, revisePointsLeft: pkg.pointsTotal },
        };
      }
      addLog(`${t.logRevise} -${reduction}, left ${left}`);
      return { ...p, review: { ...p.review, revisePointsLeft: left } };
    });
  };

  // Rejected can resubmit: back to Draft with some penalty
  const actResubmit = () => {
    if (!activePaper) return;
    if (!spendAP(1)) return;
    if (activePaper.status !== "Rejected") return;

    updateRes({ energy: -6, mood: -2, teaching: +1 });

    mutatePaper(activePaper.id, (p) => {
      const newProg = clamp(Math.round(p.progress * 0.82), 60, 110);
      const newQ = clamp(p.quality - rint(4, 8), 0, 100);
      return { ...p, status: "Draft", progress: newProg, quality: newQ, review: undefined };
    });

    addLog(t.logResubmit);
  };

  const startNewPaper = () => {
    if (!spendAP(1)) return;
    if (papers.length > 5) {
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

  // Higher event frequency
  const maybeEvent = () => {
    if (Math.random() < 0.65) {
      const ev = pick(makeEvents());
      setEventModal({ open: true, ev });
      addLog(`${t.logEvent} ${ev.titleKey}`);
    }
  };

  const tickReviewsAndDecide = () => {
    let modalPaperId: string | null = null;
    let modalDecision: Decision | null = null;

    setPapers((prev) =>
      prev.map((p) => {
        if (p.status !== "Under Review" || !p.review) return p;

        const eta = p.review.etaWeeks - 1;
        if (eta > 0) {
          return { ...p, review: { ...p.review, etaWeeks: eta } };
        }

        const d = decide(p.tier, resources.reputation, p.quality, p.review.round);
        if (!modalPaperId) {
          modalPaperId = p.id;
          modalDecision = d;
        }

        if (d === "Reject") return { ...p, status: "Rejected" };
        if (d === "Accept") return { ...p, status: "Accepted" };

        const basePoints = p.review.revisePointsLeft;
        const extra = d === "Major" ? rint(16, 26) : rint(8, 16);
        const left = clamp(basePoints + extra, 18, p.tier === "Q1" ? 80 : 60);

        return { ...p, status: "R&R", review: { ...p.review, revisePointsLeft: left } };
      })
    );

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

    setWeek((w) => w + 1);
    setAp(apMax);

    updateRes({
      energy: -clamp(Math.round(resources.teaching / 28), 0, 6),
      mood: resources.energy < 18 ? -3 : -1,
      teaching: +2,
    });

    tickReviewsAndDecide();
    maybeEvent();

    addLog(t.logWeekBegins);

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
    setWeek(1);
    setAp(apMax);
    setResources({ energy: 78, mood: 70, funding: 30, reputation: 10, teaching: 25 });
    const p0: Paper = { id: uid(), title: makeTitle(), tier: "Q1", topic: pick(TOPICS), status: "Draft", progress: 45, quality: 30 };
    setPapers([p0]);
    setActiveId(p0.id);
    setLogs([DICT[lang].logWelcome]);
    setEventModal({ open: false, ev: null });
    setReviewModal({ open: false, paperId: null, decision: null });
    setEndModal(false);
    setScreenshotMode(false);
  };

  const stats = useMemo(() => {
    const accepted = papers.filter((p) => p.status === "Accepted").length;
    const rejected = papers.filter((p) => p.status === "Rejected").length;
    const rr = papers.filter((p) => p.status === "R&R").length;
    const drafts = papers.filter((p) => p.status === "Draft").length;
    return { accepted, rejected, rr, drafts };
  }, [papers]);

  const persona = useMemo(() => personaOf(stats, resources, t), [stats, resources, t]);

  const canSubmit = activePaper?.status === "Draft" && activePaper.progress >= 100;
  const canRevise = activePaper?.status === "R&R";
  const canResubmit = activePaper?.status === "Rejected";

  const ResourceBar = ({
    label,
    value,
    icon: Icon,
  }: {
    label: string;
    value: number;
    icon: any;
  }) => (
    <div className="flex flex-col gap-1 w-full">
      <div className={`flex justify-between text-xs font-mono uppercase ${themeShell.muted}`}>
        <span className="flex items-center gap-1">
          <Icon size={12} /> {label}
        </span>
        <span>{Math.round(value)}/100</span>
      </div>
      <div className={`h-3 w-full border p-0.5 ${themeShell.panel2}`}>
        <div className="h-full transition-all duration-500" style={{ width: `${clamp(value, 0, 100)}%`, background: theme === "dark" ? "#8ff08f" : "#2f5a2f" }} />
      </div>
    </div>
  );

  const statusTag = (s: PaperStatus) => {
    if (s === "Draft") return t.draft;
    if (s === "Under Review") return t.underReview;
    if (s === "R&R") return t.rr;
    if (s === "Accepted") return t.accepted;
    return t.rejected;
  };

  const apSquares = (
    <div className="flex flex-wrap gap-2 max-w-[320px] items-center">
      {[...Array(apMax)].map((_, i) => (
        <div
          key={i}
          className={`w-5 h-5 border-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${
            i < ap ? (theme === "dark" ? "bg-[#8ff08f] border-black" : "bg-[#2f5a2f] border-black") : "bg-zinc-700 border-black"
          }`}
        />
      ))}
      <span className={`ml-2 text-sm font-bold ${themeShell.muted}`}>{t.ap}</span>
    </div>
  );

  const generateAndDownloadScreenshot = async () => {
    const el = document.getElementById("screenshot-card");
    if (!el) return;
    try {
      const canvas = await html2canvas(el, { backgroundColor: "#0b120b", scale: 2 });
      const link = document.createElement("a");
      link.href = canvas.toDataURL("image/png");
      link.download = `ttt-result-${Date.now()}.png`;
      link.click();
    } catch (err) {
      console.error("Screenshot failed:", err);
    }
  };

  const generateShareableLink = () => {
    const data = {
      persona,
      accepted: stats.accepted,
      rejected: stats.rejected,
      rr: stats.rr,
      drafts: stats.drafts,
      energy: Math.round(resources.energy),
      mood: Math.round(resources.mood),
      username: includeNameInShot ? username : "",
    };
    const jsonString = JSON.stringify(data);
    // Convert to UTF-8 bytes and then base64 encode
    const utf8Bytes = new TextEncoder().encode(jsonString);
    const binaryString = Array.from(utf8Bytes)
      .map((byte) => String.fromCharCode(byte))
      .join("");
    const encoded = btoa(binaryString);
    return `${window.location.origin}?result=${encoded}`;
  };

  const handleSharePlatform = (platform: string) => {
    try {
      console.log("Share clicked:", platform);
      const url = generateShareableLink();
      console.log("Generated link:", url);
      const title = `TOURISM, TENURE & TEARS - ${persona}`;
      let shareUrl = "";

      switch (platform) {
        case "weChat":
          console.log("Generating QR code for:", url);
          QRCode.toDataURL(url).then((qrDataUrl: string) => {
            console.log("QR code generated successfully");
            setQrCodeUrl(qrDataUrl);
          }).catch((err) => {
            console.error("QR code error:", err);
            alert(lang === "zh" ? "二维码生成失败: " + String(err) : "QR code failed: " + String(err));
          });
          return;
        case "xiaohongshu":
          console.log("Setting share link for xiaohongshu");
          setShareLink(url);
          return;
        case "weibo":
          shareUrl = `https://service.weibo.com/share/share.php?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`;
          console.log("Weibo URL:", shareUrl);
          break;
        case "instagram":
          console.log("Setting share link for instagram");
          setShareLink(url);
          return;
        case "twitter":
          shareUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`;
          console.log("Twitter URL:", shareUrl);
          break;
        default:
          console.log("Unknown platform:", platform);
          alert("Unknown platform: " + platform);
          return;
      }

      if (shareUrl) {
        console.log("Opening share URL");
        const win = window.open(shareUrl, "_blank", "width=600,height=400");
        if (!win || win.closed || typeof win.closed === 'undefined') {
          console.warn("Popup was blocked");
          alert(lang === "zh" ? "弹窗被阻止，请手动复制链接分享" : "Popup blocked. Please share the link manually.");
        }
      }
    } catch (err) {
      console.error("handleSharePlatform error:", err);
      alert("Error in share handler: " + String(err));
    }
  };

  const QRCodeModal = () => (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 bg-black/80">
      <div className="border-4 border-[#8ff08f] bg-[#0b120b] p-8 text-[#d7ffd7] max-w-sm rounded">
        <div className="text-center">
          <div className="text-sm font-black text-[#8ff08f] mb-4">
            {lang === "zh" ? "微信扫一扫" : "Scan with WeChat"}
          </div>
          {qrCodeUrl && (
            <img src={qrCodeUrl} alt="QR Code" className="border-2 border-[#2d5b2d] p-2 mx-auto" />
          )}
          <button
            onClick={() => setQrCodeUrl(null)}
            className="mt-4 px-4 py-2 border-2 border-[#8ff08f] bg-[#0f1b0f] font-black hover:bg-[#1b2b1b] w-full"
          >
            {lang === "zh" ? "关闭" : "Close"}
          </button>
        </div>
      </div>
    </div>
  );

  const ShareLinkModal = () => (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 bg-black/80">
      <div className="border-4 border-[#8ff08f] bg-[#0b120b] p-8 text-[#d7ffd7] max-w-sm rounded">
        <div className="text-center">
          <div className="text-sm font-black text-[#8ff08f] mb-4">
            {lang === "zh" ? "复制分享链接" : "Copy share link"}
          </div>
          <div className="bg-[#0f1b0f] p-3 border-2 border-[#2d5b2d] mb-4 text-xs break-all font-mono rounded">
            {shareLink}
          </div>
          <div className="flex gap-2 justify-center flex-col">
            <button
              onClick={() => {
                shareLink && navigator.clipboard.writeText(shareLink);
              }}
              className="px-4 py-2 border-2 border-[#8ff08f] bg-[#0f1b0f] font-black hover:bg-[#1b2b1b] w-full"
            >
              📋 {lang === "zh" ? "复制链接" : "Copy Link"}
            </button>
            <button
              onClick={() => setShareLink(null)}
              className="px-4 py-2 border-2 border-[#2d5b2d] bg-[#0f1b0f] font-black hover:bg-[#1b2b1b] w-full"
            >
              {lang === "zh" ? "关闭" : "Close"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const ScreenshotOverlay = () => (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-6 bg-black overflow-y-auto">
      <div className="w-full max-w-[900px]">
        {/* Screenshot Card */}
        <div
          id="screenshot-card"
          className="border-4 border-[#8ff08f] bg-[#0b120b] p-6 text-[#d7ffd7] shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] mb-6"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-xs text-[#8ff08f] font-black">{DICT.en.title}</div>
              <div className="text-lg font-black mt-1">{lang === "zh" ? "🐴 马年快乐" : "🐴 Happy Year of the Horse"}</div>
              <div className="text-xs mt-1">{lang === "zh" ? `周数: ${week}/${totalWeeks}` : `Weeks: ${week}/${totalWeeks}`}</div>
              {includeNameInShot && username && (
                <div className="text-sm font-black mt-2 text-[#8ff08f]">{username}</div>
              )}
            </div>
            <a href={SITE_URL} target="_blank" rel="noreferrer" className="text-xs underline font-black text-[#8ff08f]">
              {SITE_URL.replace("https://", "")}
            </a>
          </div>

          <div className="mt-5 border-2 border-[#2d5b2d] bg-[#0f1b0f] p-5">
            <div className="text-xs text-[#8ff08f] font-black">{lang === "zh" ? "你的学术人格" : "You are"}</div>
            <div className="text-2xl font-black mt-1">{persona}</div>

            <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
              <div>Energy: <span className="font-black">{Math.round(resources.energy)}</span></div>
              <div>Mood: <span className="font-black">{Math.round(resources.mood)}</span></div>
              <div>Reputation: <span className="font-black">{Math.round(resources.reputation)}</span></div>
              <div>Funding: <span className="font-black">{Math.round(resources.funding)}</span></div>
            </div>

            <div className="mt-4 text-sm border-t border-[#2d5b2d] pt-3">
              <div className="flex gap-4 flex-wrap">
                <span>{lang === "zh" ? "录用" : "Accepted"}: <b>{stats.accepted}</b></span>
                <span>{lang === "zh" ? "拒稿" : "Rejected"}: <b>{stats.rejected}</b></span>
                <span>R&R: <b>{stats.rr}</b></span>
                <span>{lang === "zh" ? "草稿" : "Drafts"}: <b>{stats.drafts}</b></span>
              </div>
              <div className="mt-2 italic text-[#8ff08f]">
                {lang === "zh" ? "Paper 满格，身心健全，马年大吉" : "You survived. May the happiness be with you!"}
              </div>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className={`border-4 border-[#8ff08f] bg-[#0b120b] p-6 text-[#d7ffd7]`}>
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <label className="flex items-center gap-2 text-sm font-black">
              <input
                type="checkbox"
                checked={includeNameInShot}
                onChange={(e) => setIncludeNameInShot(e.target.checked)}
                className="w-4 h-4 cursor-pointer"
              />
              {t.includeUsername}
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
            <button
              onClick={generateAndDownloadScreenshot}
              className="px-4 py-2 border-2 border-[#8ff08f] bg-[#0f1b0f] font-black hover:bg-[#1b2b1b]"
            >
              📥 {t.downloadImage}
            </button>
            <button
              onClick={() => {
                try {
                  const text = {
                    zh: `TOURISM, TENURE & TEARS\n${persona}\n录用:${stats.accepted} 拒稿:${stats.rejected} R&R:${stats.rr}\n${SITE_URL}`,
                    en: `TOURISM, TENURE & TEARS\n${persona}\nAccepted:${stats.accepted} Rejected:${stats.rejected} R&R:${stats.rr}\n${SITE_URL}`,
                  };
                  console.log("Copy button clicked, attempting to copy:", text[lang]);
                  if (navigator.clipboard) {
                    navigator.clipboard.writeText(text[lang]).then(() => {
                      console.log("Copied successfully");
                      alert(lang === "zh" ? "已复制" : "Copied!");
                    }).catch((err) => {
                      console.error("Copy failed:", err);
                      alert(lang === "zh" ? "复制失败" : "Copy failed");
                    });
                  } else {
                    console.warn("Clipboard API not available");
                    alert(lang === "zh" ? "浏览器不支持" : "Clipboard not available");
                  }
                } catch (err) {
                  console.error("Copy error:", err);
                  alert(lang === "zh" ? "出错了: " + err : "Error: " + err);
                }
              }}
              className="px-4 py-2 border-2 border-[#2d5b2d] bg-[#0f1b0f] font-black hover:bg-[#1b2b1b]"
            >
              📋 {t.copyText}
            </button>
          </div>

          <div className={`text-xs text-[#8ff08f] font-black mb-2`}>{t.shareVia}</div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-4">
            <button
              onClick={() => {
                try {
                  console.log("WeChat button clicked");
                  handleSharePlatform("weChat");
                } catch (err) {
                  console.error("WeChat share error:", err);
                  alert("Error: " + String(err));
                }
              }}
              className="px-2 py-2 border-2 border-[#2d5b2d] bg-[#0f1b0f] text-[10px] font-black hover:bg-[#1b2b1b] cursor-pointer"
            >
              {t.weChat || "WeChat"}
            </button>
            <button
              onClick={() => {
                try {
                  console.log("Xiaohongshu button clicked");
                  handleSharePlatform("xiaohongshu");
                } catch (err) {
                  console.error("Xiaohongshu share error:", err);
                  alert("Error: " + String(err));
                }
              }}
              className="px-2 py-2 border-2 border-[#2d5b2d] bg-[#0f1b0f] text-[10px] font-black hover:bg-[#1b2b1b] cursor-pointer"
            >
              {t.xiaohongshu || "Xiaohongshu"}
            </button>
            <button
              onClick={() => {
                try {
                  console.log("Weibo button clicked");
                  handleSharePlatform("weibo");
                } catch (err) {
                  console.error("Weibo share error:", err);
                  alert("Error: " + String(err));
                }
              }}
              className="px-2 py-2 border-2 border-[#2d5b2d] bg-[#0f1b0f] text-[10px] font-black hover:bg-[#1b2b1b] cursor-pointer"
            >
              {t.weibo || "Weibo"}
            </button>
            <button
              onClick={() => {
                try {
                  console.log("Instagram button clicked");
                  handleSharePlatform("instagram");
                } catch (err) {
                  console.error("Instagram share error:", err);
                  alert("Error: " + String(err));
                }
              }}
              className="px-2 py-2 border-2 border-[#2d5b2d] bg-[#0f1b0f] text-[10px] font-black hover:bg-[#1b2b1b] cursor-pointer"
            >
              {t.instagram || "Instagram"}
            </button>
            <button
              onClick={() => {
                try {
                  console.log("Twitter button clicked");
                  handleSharePlatform("twitter");
                } catch (err) {
                  console.error("Twitter share error:", err);
                  alert("Error: " + String(err));
                }
              }}
              className="px-2 py-2 border-2 border-[#2d5b2d] bg-[#0f1b0f] text-[10px] font-black hover:bg-[#1b2b1b] cursor-pointer"
            >
              {t.twitter || "Twitter"}
            </button>
          </div>

          <div className="flex gap-3 flex-wrap pt-4 border-t border-[#2d5b2d]">
            <button
              onClick={() => setScreenshotMode(false)}
              className="px-4 py-2 border-2 border-[#8ff08f] bg-[#0f1b0f] font-black hover:bg-[#1b2b1b]"
            >
              {t.exitShot}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className={`min-h-screen font-mono p-4 md:p-8 flex flex-col gap-6 select-none ${themeShell.bg}`}>
      {screenshotMode && <ScreenshotOverlay />}
      {qrCodeUrl && <QRCodeModal />}
      {shareLink && <ShareLinkModal />}

      {/* Banner */}
      <div className={`border-2 p-3 flex items-center justify-between gap-3 ${themeShell.panel}`}>
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-sm font-black">{t.horse}</span>
          <span className={`text-xs ${themeShell.muted}`}>{t.madeBy}</span>

          <a
            href={SITE_URL}
            target="_blank"
            rel="noreferrer"
            className={`text-xs underline font-bold flex items-center gap-1 ${themeShell.muted}`}
          >
            <LinkIcon size={12} /> {t.site}
          </a>

          <a
            href={lang === "zh" ? GUIDE_ZH : GUIDE_EN}
            target="_blank"
            rel="noreferrer"
            className={`text-xs underline font-bold flex items-center gap-1 ${themeShell.muted}`}
          >
            <BookOpen size={12} /> {t.guide}
          </a>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setTheme((x) => (x === "dark" ? "bright" : "dark"))}
            className={`px-2 py-1 text-[10px] border-2 font-black ${themeShell.btn}`}
            title={t.theme}
          >
            {t.theme}: {theme === "dark" ? "DARK" : "BRIGHT"}
          </button>

          <select
            value={difficulty}
            onChange={(e) => {
              const d = e.target.value as Difficulty;
              setDifficulty(d);
              setAp(DIFF_AP[d]);
            }}
            className={`px-2 py-1 text-[10px] border-2 font-black outline-none ${themeShell.panel2}`}
            title={t.diff}
          >
            <option value="low">{t.diffLow}</option>
            <option value="mid">{t.diffMid}</option>
            <option value="high">{t.diffHigh}</option>
          </select>

          <button
            onClick={() => setLang((x) => (x === "zh" ? "en" : "zh"))}
            className={`px-2 py-1 text-[10px] border-2 font-black flex items-center gap-1 ${themeShell.btn}`}
            title={t.switchLang}
          >
            <Languages size={12} /> {lang === "zh" ? "EN" : "中文"}
          </button>

          <select
            value={totalWeeks}
            onChange={(e) => setTotalWeeks(parseInt(e.target.value, 10))}
            className={`px-2 py-1 text-[10px] border-2 font-black outline-none ${themeShell.panel2}`}
            title={t.selectWeeks}
          >
            <option value={12}>12 {t.weeksOption}</option>
            <option value={24}>24 {t.weeksOption}</option>
            <option value={52}>52 {t.weeksOption}</option>
          </select>

          <input
            type="text"
            placeholder={t.usernamePlaceholder}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className={`px-2 py-1 text-[10px] border-2 font-black outline-none flex-1 min-w-[100px] ${themeShell.panel2}`}
            title={t.username}
            maxLength={30}
          />
        </div>
      </div>

      {/* Top Header */}
      <header className={`grid grid-cols-2 md:grid-cols-6 gap-4 border-2 p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] ${themeShell.panel}`}>
        <div className="flex flex-col justify-center border-r pr-4" style={{ borderColor: theme === "dark" ? "#2d5b2d" : "#6b8f6b" }}>
          <h1 className="text-xl font-bold leading-tight">
            {t.title}
            <div className={`text-xs mt-1 ${themeShell.muted}`}>{t.subtitle}</div>
          </h1>
        </div>

        <ResourceBar label={t.energy} value={resources.energy} icon={Zap} />
        <ResourceBar label={t.mood} value={resources.mood} icon={Heart} />
        <ResourceBar label={t.funding} value={resources.funding} icon={DollarSign} />
        <ResourceBar label={t.reputation} value={resources.reputation} icon={Award} />

        <div className={`flex flex-col items-center justify-center border rounded ${themeShell.panel2}`}>
          <span className={`text-[10px] uppercase ${themeShell.muted}`}>{t.week}</span>
          <span className="text-2xl font-bold">{week}{t.of}{totalWeeks}</span>
        </div>
      </header>

      <main className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-grow">
        {/* Left */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          {/* Scene */}
          <div className={`relative h-[300px] border-2 overflow-hidden shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] ${themeShell.panel}`}>
            <div className="absolute inset-0 opacity-20" style={{
              backgroundImage: theme === "dark"
                ? "radial-gradient(#2d5b2d 1px, transparent 1px)"
                : "radial-gradient(#6b8f6b 1px, transparent 1px)",
              backgroundSize: "16px 16px"
            }} />

            <div className="absolute top-4 left-4">{apSquares}</div>

            <div className="absolute inset-0 flex flex-col items-center justify-start pt-8">
              <div className={`w-20 h-28 border-2 relative mb-3 ${themeShell.panel2}`}>
                <div className="absolute top-4 left-4 w-3 h-3" style={{ background: theme === "dark" ? "#d7ffd7" : "#1b2a1b" }} />
                <div className="absolute top-4 right-4 w-3 h-3" style={{ background: theme === "dark" ? "#d7ffd7" : "#1b2a1b" }} />
                <div className="absolute bottom-4 left-4 right-4 h-3" style={{ background: theme === "dark" ? "#8ff08f" : "#2f5a2f" }} />
              </div>

              <p className={`text-xs italic ${themeShell.muted}`}>{statusLabel(resources, t)}</p>
              <p className={`text-[10px] mt-1 ${themeShell.muted}`}>{t.efficiency}: {eff.toFixed(2)}</p>
            </div>

            {activePaper && (
              <div className="absolute bottom-0 left-0 right-0 bg-black/70 border-t px-4 py-3" style={{ borderColor: theme === "dark" ? "#2d5b2d" : "#6b8f6b" }}>
                <div className="flex justify-between items-center text-xs mb-2" style={{ color: theme === "dark" ? "#8ff08f" : "#d7ffd7" }}>
                  <span className="flex items-center gap-2 flex-wrap">
                    <span className={`px-1 border`} style={{ borderColor: theme === "dark" ? "#2d5b2d" : "#6b8f6b" }}>
                      {statusTag(activePaper.status)}
                    </span>
                    <span className="px-1 border" style={{ borderColor: theme === "dark" ? "#2d5b2d" : "#6b8f6b" }}>
                      {activePaper.tier}
                    </span>
                    <span className="px-1 border" style={{ borderColor: theme === "dark" ? "#2d5b2d" : "#6b8f6b" }}>
                      {activePaper.topic}
                    </span>
                  </span>

                  {activePaper.review?.etaWeeks ? (
                    <span className="flex items-center gap-1">
                      <Clock size={12} /> {t.decisionIn} {activePaper.review.etaWeeks} {t.weeks}
                    </span>
                  ) : (
                    <span className="flex items-center gap-1">
                      <Clock size={12} /> {lang === "zh" ? "审稿周期已加速" : "Review cycle accelerated"}
                    </span>
                  )}
                </div>

                <div className="text-sm font-bold truncate mb-2">{activePaper.title}</div>

                <div className="flex items-center gap-2">
                  <div className="flex-grow h-2 bg-zinc-800">
                    <div
                      className="h-full transition-all"
                      style={{ width: `${clamp(activePaper.progress, 0, 120)}%`, background: theme === "dark" ? "#8ff08f" : "#2f5a2f" }}
                    />
                  </div>
                  <span className="text-[10px] font-bold" style={{ color: theme === "dark" ? "#d7ffd7" : "#1b2a1b" }}>
                    {Math.round(activePaper.progress)}%  Q:{Math.round(activePaper.quality)}/100
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Action Grid */}
          <div className={`border-2 p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] ${themeShell.panel}`}>
            <div className={`text-xs uppercase font-black mb-3 ${themeShell.muted}`}>{t.actions}</div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <button onClick={actWrite} className={`p-3 border-2 font-black text-left ${themeShell.btn}`}>
                <div className="flex items-center gap-2"><PenTool size={16} /> {t.write}</div>
                <div className={`text-[10px] mt-1 ${themeShell.muted}`}>1 AP</div>
              </button>

              <button onClick={actData} className={`p-3 border-2 font-black text-left ${themeShell.btn}`}>
                <div className="flex items-center gap-2"><BarChart3 size={16} /> {t.data}</div>
                <div className={`text-[10px] mt-1 ${themeShell.muted}`}>1 AP | -$2</div>
              </button>

              <button onClick={actGrade} className={`p-3 border-2 font-black text-left ${themeShell.btn}`}>
                <div className="flex items-center gap-2"><BookOpen size={16} /> {t.grade}</div>
                <div className={`text-[10px] mt-1 ${themeShell.muted}`}>1 AP</div>
              </button>

              <button onClick={actRest} className={`p-3 border-2 font-black text-left ${themeShell.btn}`}>
                <div className="flex items-center gap-2"><Coffee size={16} /> {t.rest}</div>
                <div className={`text-[10px] mt-1 ${themeShell.muted}`}>1 AP</div>
              </button>

              <button
                onClick={actGrant}
                className={`p-3 border-2 font-black text-left ${themeShell.btn}`}
              >
                <div className="flex items-center gap-2"><DollarSign size={16} /> {t.grant}</div>
                <div className={`text-[10px] mt-1 ${themeShell.muted}`}>1 AP</div>
              </button>

              <button
                onClick={actSubmit}
                disabled={!canSubmit}
                className={`p-3 border-2 font-black text-left ${canSubmit ? themeShell.btn : "p-3 border-2 font-black text-left opacity-40 cursor-not-allowed " + themeShell.panel2}`}
              >
                <div className="flex items-center gap-2"><Send size={16} /> {t.submit}</div>
                <div className={`text-[10px] mt-1 ${themeShell.muted}`}>{canSubmit ? "1 AP" : t.needsDraft}</div>
              </button>

              <button
                onClick={actRevise}
                disabled={!canRevise}
                className={`p-3 border-2 font-black text-left ${canRevise ? themeShell.btn : "p-3 border-2 font-black text-left opacity-40 cursor-not-allowed " + themeShell.panel2}`}
              >
                <div className="flex items-center gap-2"><Wrench size={16} /> {t.revise}</div>
                <div className={`text-[10px] mt-1 ${themeShell.muted}`}>{canRevise ? "1 AP" : t.needsRR}</div>
              </button>

              <button
                onClick={actResubmit}
                disabled={!canResubmit}
                className={`p-3 border-2 font-black text-left ${canResubmit ? themeShell.btn : "p-3 border-2 font-black text-left opacity-40 cursor-not-allowed " + themeShell.panel2}`}
              >
                <div className="flex items-center gap-2"><Layers size={16} /> {t.resubmit}</div>
                <div className={`text-[10px] mt-1 ${themeShell.muted}`}>{canResubmit ? "1 AP" : ""}</div>
              </button>
            </div>

            <div className="mt-3 flex items-center justify-between gap-2 flex-wrap">
              <button onClick={startNewPaper} className={`px-3 py-2 border-2 font-black flex items-center gap-2 ${themeShell.btn}`}>
                <Plus size={14} /> {t.startNewPaper} <span className={`text-[10px] ${themeShell.muted}`}>({t.maxPaperHint})</span>
              </button>

              <button
                onClick={() => setScreenshotMode(true)}
                className={`px-3 py-2 border-2 font-black flex items-center gap-2 ${themeShell.btn}`}
                title={t.screenshot}
              >
                <Camera size={14} /> {t.screenshot}
              </button>
            </div>

            <div className={`mt-3 text-[10px] ${themeShell.muted}`}>{t.tip}</div>
          </div>
        </div>

        {/* Right: Pipeline + Log */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          {/* Pipeline */}
          <div className={`border-2 p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] ${themeShell.panel}`}>
            <h2 className={`text-xs uppercase font-black pb-2 mb-3 border-b ${themeShell.muted}`} style={{ borderColor: theme === "dark" ? "#2d5b2d" : "#6b8f6b" }}>
              {t.pipeline}
            </h2>

            <div className="flex flex-col gap-3">
              {papers.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setActiveId(p.id)}
                  className={`text-left border-2 p-3 ${p.id === activeId ? themeShell.btn : themeShell.panel2}`}
                  style={{ borderColor: p.id === activeId ? (theme === "dark" ? "#8ff08f" : "#2f5a2f") : undefined }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] px-1 border" style={{ borderColor: theme === "dark" ? "#2d5b2d" : "#6b8f6b" }}>
                        {statusTag(p.status)}
                      </span>
                      <span className="text-[10px] px-1 border" style={{ borderColor: theme === "dark" ? "#2d5b2d" : "#6b8f6b" }}>
                        {p.tier}
                      </span>
                    </div>
                    <span className={`text-[10px] ${themeShell.muted}`}>{p.topic}</span>
                  </div>

                  <div className="text-sm font-bold mt-2 line-clamp-2">{p.title}</div>

                  <div className="flex items-center gap-2 mt-2">
                    <div className="flex-grow h-2 bg-zinc-800">
                      <div
                        className="h-full transition-all"
                        style={{ width: `${clamp(p.progress, 0, 120)}%`, background: theme === "dark" ? "#8ff08f" : "#2f5a2f" }}
                      />
                    </div>
                    <span className={`text-[10px] font-bold ${themeShell.muted}`}>{Math.round(p.progress)}%</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Log */}
          <div className={`border-2 p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] ${themeShell.panel}`}>
            <h2 className={`text-xs uppercase font-black mb-2 ${themeShell.muted}`}>{t.log}</h2>

            <div className="text-[11px] space-y-2 max-h-[420px] overflow-y-auto pr-1">
              {logs.map((log, i) => (
                <div key={i} className={i === 0 ? "" : themeShell.muted}>
                  {`> ${log}`}
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={endWeek}
            className="bg-white text-black font-black p-4 border-b-4 border-zinc-400 hover:bg-zinc-200 active:border-b-0 active:translate-y-1 transition-all"
          >
            {t.endWeek}
          </button>

          <div className={`flex gap-2`}>
            <button onClick={restartRun} className={`flex-1 px-3 py-2 border-2 font-black ${themeShell.btn}`}>
              {t.playAgain}
            </button>
            <button onClick={clearSave} className={`flex-1 px-3 py-2 border-2 font-black ${themeShell.btn}`}>
              {t.reset}
            </button>
          </div>
        </div>
      </main>

      {/* Event Modal */}
      {eventModal.open && eventModal.ev && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className={`max-w-lg w-full border-4 p-6 shadow-[16px_16px_0px_0px_rgba(0,0,0,0.4)] ${themeShell.panel}`} style={{ borderColor: theme === "dark" ? "#8ff08f" : "#2f5a2f" }}>
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle size={22} />
              <h2 className="text-lg font-black">{t.eventTitle}: {eventModal.ev.titleKey}</h2>
            </div>
            <div className={`text-sm mb-4 ${themeShell.muted}`}>{eventModal.ev.descKey}</div>
            <div className={`text-xs font-black mb-2 ${themeShell.muted}`}>{t.choose}</div>

            <div className="grid grid-cols-1 gap-2">
              {eventModal.ev.choices.map((c, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    updateRes(c.effect);
                    addLog(c.logKey);
                    setEventModal({ open: false, ev: null });
                  }}
                  className={`px-3 py-2 border-2 font-black text-left ${themeShell.btn}`}
                >
                  {t[c.labelKey] ?? c.labelKey}
                  <div className={`text-[10px] mt-1 ${themeShell.muted}`}>
                    {Object.entries(c.effect).map(([k, v]) => `${k} ${v! >= 0 ? "+" : ""}${v}`).join("  ")}
                  </div>
                </button>
              ))}
            </div>

            <button onClick={() => setEventModal({ open: false, ev: null })} className={`mt-4 px-3 py-2 border-2 font-black ${themeShell.btn}`}>
              {t.close}
            </button>
          </div>
        </div>
      )}

      {/* Review Decision Modal */}
      {reviewModal.open && reviewModal.paperId && reviewModal.decision && (
        <div className="fixed inset-0 bg-black/85 flex items-center justify-center p-4 z-50">
          <div className="max-w-xl w-full bg-zinc-950 border-4 border-red-600 p-6 shadow-[16px_16px_0px_0px_rgba(153,27,27,0.35)]">
            <div className="flex items-center gap-2 text-red-500 mb-4">
              <AlertTriangle size={22} />
              <h2 className="text-xl font-black">{t.decisionLetter}</h2>
            </div>

            <div className="mb-3 text-sm text-zinc-200">
              <span className="font-black">{t.decision}:</span>{" "}
              <span className="italic">
                {reviewModal.decision === "Reject"
                  ? t.rejected
                  : reviewModal.decision === "Accept"
                  ? t.accepted
                  : reviewModal.decision === "Major"
                  ? "Major Revision"
                  : "Minor Revision"}
              </span>
            </div>

            {(() => {
              const p = papers.find((x) => x.id === reviewModal.paperId);
              if (!p?.review) return null;
              return (
                <div className="bg-black border border-zinc-700 p-4">
                  <div className="flex items-center justify-between text-xs text-zinc-400 mb-2">
                    <span>{t.round}: {p.review.round}</span>
                    <span>{t.pointsLeft}: {p.status === "R&R" ? p.review.revisePointsLeft : "-"}</span>
                  </div>

                  <div className="text-xs font-black text-zinc-400 mb-2">{t.reviewerComments}</div>
                  <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
                    {p.review.comments.map((c, i) => (
                      <div key={i} className="border border-zinc-800 p-2">
                        <div className="text-[11px] text-zinc-300">
                          <span className="font-black">{c.reviewerType}</span>{" "}
                          <span className="text-zinc-500">({t.severity}: {c.severity}/5, +{c.points} pts)</span>
                        </div>
                        <div className="text-[11px] italic text-zinc-200 mt-1">"{c.text}"</div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            <div className="mt-4 flex gap-2 flex-wrap">
              <button onClick={() => setReviewModal({ open: false, paperId: null, decision: null })} className="px-3 py-2 bg-red-600 text-white font-black border-b-4 border-red-900">
                OK
              </button>
              <button onClick={() => setReviewModal({ open: false, paperId: null, decision: null })} className="px-3 py-2 bg-zinc-700 text-white font-black border-b-4 border-zinc-900">
                {lang === "zh" ? "吐槽两句" : "Rant a bit"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ending Modal */}
      {endModal && (
        <div className="fixed inset-0 bg-black/85 flex items-center justify-center p-4 z-50">
          <div className={`max-w-lg w-full border-4 p-6 shadow-[16px_16px_0px_0px_rgba(0,0,0,0.4)] ${themeShell.panel}`} style={{ borderColor: theme === "dark" ? "#8ff08f" : "#2f5a2f" }}>
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-black">{t.endCardTitle}</h2>
              <button onClick={() => setScreenshotMode(true)} className={`px-3 py-2 border-2 font-black flex items-center gap-2 ${themeShell.btn}`}>
                <Camera size={14} /> {t.screenshot}
              </button>
            </div>

            <div className="mt-4">
              <div className={`text-xs font-black ${themeShell.muted}`}>{t.resultYouAre}</div>
              <div className="text-2xl font-black mt-1">{persona}</div>
            </div>

            <div className="mt-4 border-t pt-4" style={{ borderColor: theme === "dark" ? "#2d5b2d" : "#6b8f6b" }}>
              <div className={`text-xs font-black mb-2 ${themeShell.muted}`}>{t.resultStats}</div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>{t.acceptedN}: <b>{stats.accepted}</b></div>
                <div>{t.rejectedN}: <b>{stats.rejected}</b></div>
                <div>{t.rrN}: <b>{stats.rr}</b></div>
                <div>{t.draftsN}: <b>{stats.drafts}</b></div>
              </div>

              <div className={`text-[10px] mt-3 ${themeShell.muted}`}>{t.tip}</div>
            </div>

            <div className="mt-5 flex gap-2 flex-wrap">
              <button onClick={restartRun} className={`px-3 py-2 border-2 font-black ${themeShell.btn}`}>
                {t.playAgain}
              </button>
              <button onClick={clearSave} className={`px-3 py-2 border-2 font-black ${themeShell.btn}`}>
                {t.reset}
              </button>
              <a href={SITE_URL} target="_blank" rel="noreferrer" className={`px-3 py-2 border-2 font-black flex items-center gap-2 ${themeShell.btn}`}>
                <LinkIcon size={14} /> {t.site}
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
