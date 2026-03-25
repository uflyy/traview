import React, { useState, useMemo, useEffect } from 'react';
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Cell
} from 'recharts';
import { 
  Layout, Database, TrendingUp, BarChart3,
  ChevronLeft, ChevronRight, Globe, Mail, Menu, X, PieChart,
  PlayCircle, MessageSquareText, BrainCircuit,
  Map as MapIcon, Network, TerminalSquare, MonitorCheck, Layers
} from 'lucide-react';

const SITE_URL = 'https://www.dryangyang.com';
const pdfUrl = (name: string) => `${import.meta.env.BASE_URL}${name}`;

// ==========================================
// 1. 全局翻译数据与文案配置
// ==========================================
const translations = {
  zh: {
    nav: {
      intro: "总体介绍",
      features: "核心功能",
      compare: "多维对比",
      experience: "用户体验",
      lang: "EN",
      download: "下载 V1.0"
    },
    hero: {
      badge: "Traview V1.0 现已发布",
      title1: "下一代多维数据",
      title2: "分析与预测平台",
      desc: "打破原始数据与可发表洞见之间的壁垒。将统计推断、机器学习、文本挖掘与空间分析无缝整合于一个以数据表为中心的现代工作区。",
      download: "下载 Windows 版 (V1.0)",
      demo: "观看演示",
      carousel: {
        main: "主界面",
        results: "结果窗口",
        syntax: "语法窗口",
        spatial: "空间分析",
        prev: "上一张",
        next: "下一张"
      }
    },
    features: {
      tag: "全方位研究工具箱",
      title1: "九大核心模块。",
      title2: "无限分析可能。",
      desc: "无需在多个软件间反复切换，Traview 为您提供涵盖多学科需求的核心分析生态。",
      items: [
        { icon: <Database />, title: "数据管理", desc: "通过强大的数据集管理器，轻松导入、清洗、重新编码、合并和管理多个复杂数据集。" },
        { icon: <PieChart />, title: "多元统计", desc: "描述性统计、交叉制表，以及直方图、热力图等丰富的可视化工具，帮您快速掌握数据分布。" },
        { icon: <SigmaIcon />, title: "计量经济", desc: "通过严格的回归分析和政策评估模型（OLS、离散选择、DID、Heckman等）确立因果关系。" },
        { icon: <TrendingUp />, title: "时序与预测", desc: "识别趋势、季节性和结构性变化。在高度动态的环境中通过 ARIMA、VAR 等预测未来。" },
        { icon: <MessageSquareText />, title: "文本分析", desc: "将非结构化评论转化为数据。执行情感分析、词频统计和精确的主题模型 (LDA)。" },
        { icon: <BrainCircuit />, title: "机器学习", desc: "无需编写代码即可使用先进的预测算法——分类树、回归树、随机森林和支持向量机。" },
        { icon: <MapIcon />, title: "空间分析 (GIS)", desc: "在精美的地图上可视化数据。分析地理分布、区域集群空间异质性和 Hotspot 热点。" },
        { icon: <Network />, title: "高级模型", desc: "内置结构方程模型 (SEM)、中介/调节效应模型 (Process) 以及元分析 (Meta-Analysis)。" },
        { icon: <TerminalSquare />, title: "结果与日志", desc: "自动生成的语法日志 (Syntax) 和智能的统一结果窗口，让导出到研究报告变得前所未有的简单。" }
      ]
    },
    compare: {
      tag: "基准测试",
      title: "主流视窗统计软件对比",
      desc: "在保持专业深度的同时，Traview 在交互友好度和工作流集成上确立了全新标杆。",
      radarTitle: "综合能力概览 (Radar)",
      barTitle: "单项维度排行",
      tableTitle: "评分明细表",
      softwareName: "软件名称",
      target: "目标",
      categories: {
        gui: "GUI交互",
        eco: "计量深度",
        ts: "时间序列",
        viz: "可视化/EDA",
        script: "脚本扩展",
        flow: "集成工作流"
      }
    },
    experience: {
      tag: "核心理念",
      title: "极致顺畅的用户体验",
      items: [
        {
          title: "集中式结果管理 (Results Window)",
          desc: "彻底告别散落各处的输出弹窗。Traview 将所有的分析输出统一汇总到一个结果窗口中，便于对比、追溯和一键导出至 Word/PDF。",
          icon: <MonitorCheck className="w-7 h-7" />
        },
        {
          title: "智能排错与透明日志 (Syntax & Log)",
          desc: "强大的日志系统记录每一个关键事件。当模型报错时，Traview 会输出人类可读的错误指导，引导用户排查问题，而不是盲目重试。",
          icon: <TerminalSquare className="w-7 h-7" />
        },
        {
          title: "高度集成的工作流 (Integrated Flow)",
          desc: "核心优势是“在一个环境里把多类研究任务串联起来”。从导入数据、提取文本情感，到因果推断和生成报告，全程无需离开平台。",
          icon: <Layers className="w-7 h-7" />
        }
      ]
    },
    cta: {
      title: "准备好提升您的分析效率了吗？",
      desc: "加入全球研究人员、教育工作者和行业专家的行列，体验全面、可重复的现代数据科学工作流。",
      btn1: "立即下载 V1.0",
      docBeginner: "下载新手入门文档",
      docGuide: "下载实操指南文档"
    },
    footer: {
      rights: "© 2026 Traview Platform. 保留所有权利。",
      privacy: "隐私政策",
      terms: "服务条款",
      docs: "文档中心"
    }
  },
  en: {
    nav: {
      intro: "Overview",
      features: "Features",
      compare: "Comparison",
      experience: "Experience",
      lang: "中",
      download: "Download V1.0"
    },
    hero: {
      badge: "Traview V1.0 is now available",
      title1: "The Unified Desktop",
      title2: "Analytics Platform",
      desc: "Bridge the gap between raw data and publish-ready insights. Seamlessly integrating statistics, machine learning, text, and spatial analysis into one workspace.",
      download: "Download for Windows (V1.0)",
      demo: "Watch Demo",
      carousel: {
        main: "Main workspace",
        results: "Results window",
        syntax: "Syntax & log",
        spatial: "Spatial analysis",
        prev: "Previous slide",
        next: "Next slide"
      }
    },
    features: {
      tag: "Analytical Arsenal",
      title1: "Nine robust modules.",
      title2: "Infinite possibilities.",
      desc: "From raw, messy data to polished insights. Everything you need is natively integrated without switching software.",
      items: [
        { icon: <Database />, title: "Data Management", desc: "Import, clean, recode, merge, and manage multiple datasets effortlessly with the robust Dataset Manager." },
        { icon: <PieChart />, title: "Multivariate Statistics", desc: "Descriptive stats, cross-tabulations, and rich visualizations like histograms and heatmaps to grasp your data." },
        { icon: <SigmaIcon />, title: "Econometrics", desc: "Establish causal relationships and control variables through rigorous regression and policy evaluation models." },
        { icon: <TrendingUp />, title: "Time Series", desc: "Identify trends, seasonality, and structural changes. Forecast future demands in highly dynamic environments." },
        { icon: <MessageSquareText />, title: "Text Analysis", desc: "Transform unstructured reviews into data. Perform sentiment analysis, word frequencies, and precise topic modeling." },
        { icon: <BrainCircuit />, title: "Machine Learning", desc: "Access predictive algorithms—classification, regression trees, random forests—without writing code." },
        { icon: <MapIcon />, title: "Spatial Analysis", desc: "Visualize data on beautiful maps. Analyze geographic distributions, regional clusters, and spatial differences." },
        { icon: <Network />, title: "Advanced Models", desc: "Utilize Structural Equation Modeling (SEM), Process Models, and Meta-Analysis dedicated workspaces." },
        { icon: <TerminalSquare />, title: "Results & Logging", desc: "Never lose track. Auto-generated syntax logs and a smart Results Window simplify exporting to your reports." }
      ]
    },
    compare: {
      tag: "Benchmarking",
      title: "Mainstream Software Comparison",
      desc: "While maintaining deep analytical capabilities, Traview sets a new standard for GUI friendliness and workflow integration.",
      radarTitle: "Overall Capability (Radar)",
      barTitle: "Dimension Ranking",
      tableTitle: "Detailed Scores",
      softwareName: "Software Name",
      target: "Target",
      categories: {
        gui: "GUI Friendliness",
        eco: "Econometrics",
        ts: "Time Series",
        viz: "Visuals / EDA",
        script: "Scripting",
        flow: "Workflow"
      }
    },
    experience: {
      tag: "Core Philosophy",
      title: "Designed for intuitive analysis.",
      items: [
        {
          title: "Centralized Results Window",
          desc: "Say goodbye to scattered output dialogs. All outputs—ANOVA tables to regression charts—are routed to a unified window for easy comparison and one-click export (Word/PDF).",
          icon: <MonitorCheck className="w-7 h-7" />
        },
        {
          title: "Smart Debugging & Syntax Log",
          desc: "A powerful log system records every event. When an analysis fails, Traview provides clear, human-readable error explanations, guiding users to fix issues rather than crashing.",
          icon: <TerminalSquare className="w-7 h-7" />
        },
        {
          title: "Highly Integrated Workflow",
          desc: "The core advantage is chaining multiple research tasks. From data import to NLP sentiment extraction, causal inference, and reporting—never leave the desktop.",
          icon: <Layers className="w-7 h-7" />
        }
      ]
    },
    cta: {
      title: "Ready to elevate your analysis?",
      desc: "Join researchers, educators, and industry professionals who trust Traview for comprehensive, reproducible data science.",
      btn1: "Download Traview V1.0",
      docBeginner: "Download getting started (PDF)",
      docGuide: "Download practical guide (PDF)"
    },
    footer: {
      rights: "© 2026 Traview Platform. All rights reserved.",
      privacy: "Privacy Policy",
      terms: "Terms of Service",
      docs: "Documentation"
    }
  }
};

// ==========================================
// 2. 软件对比数据源
// ==========================================
const compareData = [
  { name: "Traview", gui: 4.5, eco: 4, ts: 4, viz: 4, script: 3.5, flow: 5 },
  { name: "SPSS", gui: 4.5, eco: 3, ts: 2.5, viz: 3, script: 4, flow: 4.5 },
  { name: "Stata", gui: 3.5, eco: 5, ts: 4.5, viz: 4, script: 5, flow: 4 },
  { name: "EViews", gui: 4, eco: 4.5, ts: 5, viz: 3, script: 3.5, flow: 3.5 },
  { name: "LIMDEP", gui: 2.5, eco: 4.5, ts: 2, viz: 1.5, script: 3, flow: 2.5 },
  { name: "JMP", gui: 5, eco: 2.5, ts: 2.5, viz: 5, script: 3.5, flow: 4 },
  { name: "SAS", gui: 2.5, eco: 4.5, ts: 4, viz: 3.5, script: 5, flow: 3.5 }
];
const categoryKeys = ["gui", "eco", "ts", "viz", "script", "flow"];

// 品牌色配置
const BRAND_COLOR = "#9E1B34";
const softwareColors = {
  "Traview": BRAND_COLOR,
  "SPSS": "#3b82f6",     // Blue
  "Stata": "#10b981",    // Green
  "EViews": "#f59e0b",   // Orange
  "LIMDEP": "#8b5cf6",   // Purple
  "JMP": "#ec4899",      // Pink
  "SAS": "#64748b"       // Slate
};

// ==========================================
// 3. 辅助组件
// ==========================================
function SigmaIcon(props) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M18 7V4H6l6 8-6 8h12v-3"/>
    </svg>
  );
}

function FeatureCard({ icon, title, desc }) {
  return (
    <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm hover:shadow-[0_20px_40px_-15px_rgba(158,27,52,0.15)] hover:-translate-y-1 hover:border-[#9E1B34]/30 transition-all duration-500 group">
      <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-6 bg-slate-50 text-slate-600 group-hover:bg-[#9E1B34] group-hover:text-white transition-colors duration-500">
        {React.cloneElement(icon, { className: "w-6 h-6" })}
      </div>
      <h3 className="text-xl font-bold text-slate-900 mb-3 tracking-tight">{title}</h3>
      <p className="text-slate-500 leading-relaxed text-sm">{desc}</p>
    </div>
  );
}

function PhilosophyCard({ icon, title, desc }) {
  return (
    <div className="group text-center p-8 rounded-3xl bg-white border border-slate-200 shadow-sm hover:shadow-xl transition-all duration-500 hover:-translate-y-2 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-rose-50 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-150 duration-700 ease-out z-0"></div>
      <div className="relative z-10">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-rose-50/80 backdrop-blur-sm flex items-center justify-center text-[#9E1B34] mb-6 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 border border-rose-100/50">
          {icon}
        </div>
        <h3 className="text-xl font-bold mb-4 text-slate-900">{title}</h3>
        <p className="text-slate-500 leading-relaxed text-[15px]">{desc}</p>
      </div>
    </div>
  );
}

const HERO_SLIDE_FILES = [
  { file: 'traview.png', labelKey: 'main' as const },
  { file: 'result.png', labelKey: 'results' as const },
  { file: 'syntax.png', labelKey: 'syntax' as const },
  { file: 'spatial.png', labelKey: 'spatial' as const },
];

function HeroScreenshotCarousel({
  carousel,
}: {
  carousel: {
    main: string;
    results: string;
    syntax: string;
    spatial: string;
    prev: string;
    next: string;
  };
}) {
  const slides = useMemo(
    () =>
      HERO_SLIDE_FILES.map((s) => ({
        file: s.file,
        label: carousel[s.labelKey],
      })),
    [carousel]
  );

  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % slides.length);
    }, 4500);
    return () => window.clearInterval(id);
  }, [paused, slides.length]);

  const go = (delta: number) => {
    setIndex((i) => (i + delta + slides.length) % slides.length);
  };

  return (
    <div
      className="relative"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="relative min-h-[260px] sm:min-h-[320px] md:min-h-[380px] overflow-hidden rounded-lg border border-slate-800/80 bg-slate-900/90">
        {slides.map((slide, i) => (
          <img
            key={slide.file}
            src={pdfUrl(slide.file)}
            alt={`Traview — ${slide.label}`}
            className={`absolute inset-0 w-full h-full object-contain object-top p-2 sm:p-3 transition-opacity duration-700 ease-out ${
              i === index ? 'opacity-100 z-[1]' : 'opacity-0 z-0 pointer-events-none'
            }`}
            draggable={false}
          />
        ))}
        <button
          type="button"
          onClick={() => go(-1)}
          aria-label={carousel.prev}
          className="absolute left-2 top-1/2 z-[2] -translate-y-1/2 rounded-full bg-slate-950/70 p-2 text-white border border-slate-600/80 hover:bg-[#9E1B34]/90 hover:border-[#9E1B34] transition-colors shadow-lg backdrop-blur-sm"
        >
          <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>
        <button
          type="button"
          onClick={() => go(1)}
          aria-label={carousel.next}
          className="absolute right-2 top-1/2 z-[2] -translate-y-1/2 rounded-full bg-slate-950/70 p-2 text-white border border-slate-600/80 hover:bg-[#9E1B34]/90 hover:border-[#9E1B34] transition-colors shadow-lg backdrop-blur-sm"
        >
          <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>
      </div>
      <p className="text-center text-sm font-medium text-slate-400 mt-3 tabular-nums" aria-live="polite">
        {slides[index].label}
        <span className="text-slate-600 ml-2 font-normal text-xs">
          {index + 1}/{slides.length}
        </span>
      </p>
      <div className="flex justify-center gap-2 mt-3">
        {slides.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setIndex(i)}
            aria-label={`${i + 1} / ${slides.length}`}
            className={`h-2 rounded-full transition-all duration-300 ${
              i === index ? 'w-8 bg-[#9E1B34]' : 'w-2 bg-slate-600 hover:bg-slate-500'
            }`}
          />
        ))}
      </div>
    </div>
  );
}

// ==========================================
// 4. 对比图表组件 (包含交互开关 & 明细表)
// ==========================================
function ComparisonComponent({ t }) {
  const [activeCategory, setActiveCategory] = useState("eco");
  const [selectedSoftwares, setSelectedSoftwares] = useState(["Traview", "SPSS", "Stata"]);

  const toggleSoftware = (name) => {
    if (selectedSoftwares.includes(name)) {
      if (selectedSoftwares.length > 1) setSelectedSoftwares(selectedSoftwares.filter(s => s !== name));
    } else {
      setSelectedSoftwares([...selectedSoftwares, name]);
    }
  };

  const radarData = useMemo(() => {
    return categoryKeys.map(key => {
      const entry = { subject: t.compare.categories[key] };
      compareData.forEach(soft => {
        if (selectedSoftwares.includes(soft.name)) entry[soft.name] = soft[key];
      });
      return entry;
    });
  }, [selectedSoftwares, t]);

  return (
    <div className="space-y-8">
      {/* 软件多选开关区 */}
      <div className="flex flex-wrap gap-2 justify-center mb-8">
        {compareData.map(soft => {
          const isSelected = selectedSoftwares.includes(soft.name);
          return (
            <button
              key={soft.name}
              onClick={() => toggleSoftware(soft.name)}
              className={`px-5 py-2.5 rounded-full text-sm font-bold transition-all ${
                isSelected ? 'ring-2 ring-offset-2 shadow-md' : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50'
              }`}
              style={{
                backgroundColor: isSelected ? softwareColors[soft.name] : undefined,
                color: isSelected ? 'white' : undefined,
                borderColor: isSelected ? softwareColors[soft.name] : undefined
              }}
            >
              {soft.name}
            </button>
          );
        })}
      </div>

      {/* 顶部图表区 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* 雷达图 */}
        <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-200">
          <h3 className="text-lg font-bold mb-6 text-slate-800 flex items-center gap-2">
            <Layout className="text-[#9E1B34]" size={18} />
            {t.compare.radarTitle}
          </h3>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                <PolarGrid stroke="#f1f5f9" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 12, fontWeight: 500 }} />
                <PolarRadiusAxis angle={30} domain={[0, 5]} tick={false} axisLine={false} />
                {selectedSoftwares.map(name => (
                  <Radar
                    key={name} name={name} dataKey={name}
                    stroke={softwareColors[name]} fill={softwareColors[name]}
                    fillOpacity={name === 'Traview' ? 0.2 : 0.1} 
                    strokeWidth={name === 'Traview' ? 3 : 2}
                  />
                ))}
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '13px', paddingTop: '20px' }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 柱状图 */}
        <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-200">
          <div className="flex justify-between items-center mb-6">
             <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <BarChart3 className="text-[#9E1B34]" size={18} />
              {t.compare.barTitle}
            </h3>
            <select 
              value={activeCategory} 
              onChange={(e) => setActiveCategory(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-sm font-semibold rounded-lg p-2 outline-none focus:ring-2 ring-[#9E1B34]/50 text-slate-700"
            >
              {categoryKeys.map(key => <option key={key} value={key}>{t.compare.categories[key]}</option>)}
            </select>
          </div>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={[...compareData].sort((a, b) => b[activeCategory] - a[activeCategory])}
                margin={{ top: 5, right: 20, left: 30, bottom: 5 }}
              >
                <CartesianGrid horizontal={false} stroke="#f8fafc" />
                <XAxis type="number" domain={[0, 5]} hide />
                <YAxis 
                  dataKey="name" type="category" 
                  tick={{ fill: '#475569', fontSize: 13, fontWeight: 600 }}
                  width={70} axisLine={false} tickLine={false}
                />
                <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
                <Bar dataKey={activeCategory} radius={[0, 6, 6, 0]} barSize={24}>
                  {compareData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={selectedSoftwares.includes(entry.name) ? softwareColors[entry.name] : '#cbd5e1'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 底部详细数据表格 */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden mt-8">
        <div className="p-6 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-800">{t.compare.tableTitle}</h2>
          <div className="text-[10px] text-slate-400 font-medium bg-white px-3 py-1 rounded-full border border-slate-200">
            Score: 1.0 - 5.0
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left table-fixed min-w-[800px]">
            <thead>
              <tr className="text-slate-400 text-[11px] uppercase tracking-widest font-bold border-b border-slate-100">
                <th className="px-6 py-5 w-[220px]">{t.compare.softwareName}</th>
                {categoryKeys.map(key => (
                  <th key={key} className="px-6 py-5 text-center">{t.compare.categories[key]}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {compareData.map(soft => {
                const isTarget = soft.name === 'Traview';
                const isSelected = selectedSoftwares.includes(soft.name);
                return (
                  <tr key={soft.name} className={`transition-colors duration-300 ${isTarget ? 'bg-rose-50/30 hover:bg-rose-50/50' : 'hover:bg-slate-50/50'} ${!isSelected && !isTarget ? 'opacity-40 grayscale' : ''}`}>
                    <td className={`px-6 py-5 ${isTarget ? 'text-lg font-black text-[#9E1B34]' : 'text-base font-bold text-slate-700'}`}>
                      <div className="flex items-center">
                        <div 
                          className={`rounded-full shrink-0 transition-all ${isTarget ? 'w-4 h-4 mr-4 ring-4 ring-rose-100 shadow-sm' : 'w-2.5 h-2.5 mr-3'}`} 
                          style={{ backgroundColor: softwareColors[soft.name] }}
                        ></div>
                        <span className="truncate">{soft.name}</span>
                        {isTarget && (
                          <span className="ml-3 text-[10px] bg-[#9E1B34] text-white px-2.5 py-1 rounded-full font-black shadow-sm shrink-0 uppercase tracking-tighter">
                            {t.compare.target}
                          </span>
                        )}
                      </div>
                    </td>
                    {categoryKeys.map(key => (
                      <td key={key} className="px-6 py-5 text-center">
                        <span className={`inline-block px-3 py-1.5 rounded-xl transition-all duration-300 ${
                          isTarget 
                            ? 'text-sm md:text-base font-black shadow-md ring-2' 
                            : 'text-xs md:text-sm font-bold ring-1'
                          } ${
                          soft[key] >= 4.5 ? `${isTarget ? 'bg-[#9E1B34] text-white ring-rose-300' : 'bg-green-50 text-green-700 ring-green-200'}` : 
                          soft[key] >= 4 ? `${isTarget ? 'bg-rose-600 text-white ring-rose-300' : 'bg-blue-50 text-blue-700 ring-blue-200'}` : 
                          soft[key] <= 2.5 ? `${isTarget ? 'bg-slate-800 text-white ring-slate-400' : 'bg-red-50 text-red-600 ring-red-100'}` : 
                          `${isTarget ? 'bg-rose-800 text-white ring-rose-400' : 'bg-slate-50 text-slate-600 ring-slate-200'}`
                        }`}>
                          {soft[key].toFixed(1)}
                        </span>
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 5. 主应用组件 (App Shell)
// ==========================================
export default function App() {
  const [lang, setLang] = useState('zh');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const t = translations[lang];

  const scrollTo = (id) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
      setIsMobileMenuOpen(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 selection:bg-rose-100 selection:text-[#9E1B34] scroll-smooth">
      
      {/* ===== Navigation ===== */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => scrollTo('hero')}>
              <Globe className="h-8 w-8 text-[#9E1B34]" />
              <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#9E1B34] to-[#7A1528]">
                Traview
              </span>
            </div>
            
            {/* Desktop Nav */}
            <div className="hidden md:flex items-center space-x-8">
              <button onClick={() => scrollTo('philosophy')} className="text-slate-600 hover:text-[#9E1B34] font-medium transition-colors">{t.nav.intro}</button>
              <button onClick={() => scrollTo('features')} className="text-slate-600 hover:text-[#9E1B34] font-medium transition-colors">{t.nav.features}</button>
              <button onClick={() => scrollTo('compare')} className="text-slate-600 hover:text-[#9E1B34] font-medium transition-colors">{t.nav.compare}</button>
              <button onClick={() => scrollTo('experience')} className="text-slate-600 hover:text-[#9E1B34] font-medium transition-colors">{t.nav.experience}</button>
              
              <div className="w-[1px] h-4 bg-slate-300"></div>
              
              <button 
                onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')}
                className="font-bold text-slate-500 hover:text-[#9E1B34] transition-colors"
              >
                {t.nav.lang}
              </button>
              <a
                href={SITE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-[#9E1B34] text-white px-5 py-2 rounded-full font-medium hover:bg-[#7A1528] transition-all shadow-md hover:shadow-lg inline-block text-center"
              >
                {t.nav.download}
              </a>
            </div>

            {/* Mobile Menu Toggle */}
            <div className="md:hidden flex items-center gap-4">
               <button 
                onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')}
                className="font-bold text-slate-500"
              >
                {t.nav.lang}
              </button>
              <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="text-slate-600 hover:text-[#9E1B34]">
                {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Nav Drawer */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-slate-100 px-4 pt-2 pb-4 space-y-1 shadow-lg">
            <button onClick={() => scrollTo('philosophy')} className="block w-full text-left px-3 py-2 text-slate-600 font-medium">{t.nav.intro}</button>
            <button onClick={() => scrollTo('features')} className="block w-full text-left px-3 py-2 text-slate-600 font-medium">{t.nav.features}</button>
            <button onClick={() => scrollTo('compare')} className="block w-full text-left px-3 py-2 text-slate-600 font-medium">{t.nav.compare}</button>
            <button onClick={() => scrollTo('experience')} className="block w-full text-left px-3 py-2 text-slate-600 font-medium">{t.nav.experience}</button>
            <a
              href={SITE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full text-center mt-4 bg-[#9E1B34] text-white px-3 py-3 rounded-md font-medium"
            >
              {t.nav.download}
            </a>
          </div>
        )}
      </nav>

      <main>
        {/* ===== Hero Section (暗黑风格 + Abstract Mockup) ===== */}
        <section id="hero" className="relative pt-32 pb-32 overflow-hidden bg-slate-950">
          <div className="absolute top-0 right-1/4 w-[600px] h-[600px] bg-[#9E1B34]/20 rounded-full blur-[120px] mix-blend-screen pointer-events-none animate-pulse"></div>
          <div className="absolute bottom-0 left-1/4 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[100px] mix-blend-screen pointer-events-none"></div>
          
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="text-center max-w-4xl mx-auto mb-16">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900/50 border border-[#9E1B34]/30 text-rose-300 text-sm font-semibold mb-8 backdrop-blur-sm shadow-[0_0_15px_rgba(158,27,52,0.2)]">
                <span className="flex h-2 w-2 rounded-full bg-[#9E1B34] shadow-[0_0_8px_#9E1B34]"></span>
                {t.hero.badge}
              </div>
              <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-white mb-8 leading-tight">
                {t.hero.title1} <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-400 via-[#9E1B34] to-rose-500">
                  {t.hero.title2}
                </span>
              </h1>
              <p className="text-xl md:text-2xl text-slate-400 mb-10 leading-relaxed max-w-3xl mx-auto font-light">
                {t.hero.desc}
              </p>
              <div className="flex flex-col sm:flex-row gap-5 justify-center items-center">
                <a
                  href={SITE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 bg-[#9E1B34] text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-rose-700 transition-all duration-300 shadow-[0_0_20px_rgba(158,27,52,0.4)] hover:shadow-[0_0_30px_rgba(158,27,52,0.6)] hover:-translate-y-1 group w-full sm:w-auto"
                >
                  {t.hero.download} <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </a>
                <button className="flex items-center justify-center gap-2 bg-slate-900 text-slate-300 border border-slate-700 px-8 py-4 rounded-xl font-bold text-lg hover:bg-slate-800 hover:text-white transition-all duration-300 w-full sm:w-auto">
                  <PlayCircle className="w-5 h-5" /> {t.hero.demo}
                </button>
              </div>
            </div>

            {/* 软件界面截图 */}
            <div className="relative max-w-5xl mx-auto mt-20 group">
              <div className="absolute -inset-1 bg-gradient-to-b from-[#9E1B34]/30 to-transparent rounded-2xl blur-xl opacity-50 group-hover:opacity-70 transition-opacity duration-700 pointer-events-none" />
              <div className="relative rounded-2xl bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 shadow-2xl overflow-hidden">
                <div className="bg-slate-800/50 px-4 py-3 border-b border-slate-700/50 flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-rose-500/80" />
                  <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                  <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                  <div className="ml-4 text-xs font-medium text-slate-500">Traview</div>
                </div>
                <div className="p-2 sm:p-4 bg-slate-950/50">
                  <HeroScreenshotCarousel carousel={t.hero.carousel} />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ===== Experience Section (核心体验/理念) ===== */}
        <section id="philosophy" className="py-24 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-sm font-bold tracking-widest text-[#9E1B34] uppercase mb-3">{t.experience.tag}</h2>
              <h3 className="text-3xl md:text-4xl font-bold text-slate-900">{t.experience.title}</h3>
            </div>
            <div className="grid md:grid-cols-3 gap-10">
              {t.experience.items.map((item, idx) => (
                <PhilosophyCard key={idx} icon={item.icon} title={item.title} desc={item.desc} />
              ))}
            </div>
          </div>
        </section>

        {/* ===== Features Section (Bento Grid) ===== */}
        <section id="features" className="py-24 bg-slate-50 border-y border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
              <div className="max-w-2xl">
                <h2 className="text-sm font-bold tracking-widest text-[#9E1B34] uppercase mb-3">{t.features.tag}</h2>
                <h3 className="text-3xl md:text-5xl font-extrabold text-slate-900 tracking-tight">
                  {t.features.title1} <br />{t.features.title2}
                </h3>
              </div>
              <p className="text-lg text-slate-500 max-w-md">
                {t.features.desc}
              </p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {t.features.items.map((item, idx) => (
                <FeatureCard key={idx} icon={item.icon} title={item.title} desc={item.desc} />
              ))}
            </div>
          </div>
        </section>

        {/* ===== Comparison Section (带有高级筛选功能的雷达图与排名图) ===== */}
        <section id="compare" className="py-24 bg-white relative overflow-hidden">
          {/* Decorative background circle */}
          <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-slate-50 rounded-full translate-x-1/3 -translate-y-1/3 pointer-events-none"></div>
          
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="text-center max-w-3xl mx-auto mb-16">
               <h2 className="text-sm font-bold tracking-widest text-[#9E1B34] uppercase mb-3">{t.compare.tag}</h2>
              <h3 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-6 tracking-tight">{t.compare.title}</h3>
              <p className="text-xl text-slate-500">{t.compare.desc}</p>
            </div>
            
            <ComparisonComponent t={t} />
          </div>
        </section>

        {/* ===== CTA Section ===== */}
        <section className="py-24 bg-slate-900 relative overflow-hidden border-t border-slate-800">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[300px] bg-[#9E1B34]/40 blur-[150px] pointer-events-none"></div>
          
          <div className="max-w-4xl mx-auto px-4 text-center relative z-10">
            <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-8 tracking-tight">{t.cta.title}</h2>
            <p className="text-slate-300 text-xl mb-12 font-light">{t.cta.desc}</p>
            <div className="flex flex-col sm:flex-row flex-wrap gap-4 justify-center items-stretch">
              <a
                href={SITE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex justify-center items-center bg-[#9E1B34] text-white px-10 py-5 rounded-xl font-bold text-lg hover:bg-rose-700 transition-all duration-300 shadow-[0_0_20px_rgba(158,27,52,0.5)] hover:-translate-y-1"
              >
                {t.cta.btn1}
              </a>
              <a
                href={pdfUrl('new.pdf')}
                download
                className="inline-flex justify-center items-center bg-transparent text-white border border-slate-600 px-10 py-5 rounded-xl font-bold text-lg hover:bg-slate-800 transition-all duration-300"
              >
                {t.cta.docBeginner}
              </a>
              <a
                href={pdfUrl('data.pdf')}
                download
                className="inline-flex justify-center items-center bg-transparent text-white border border-slate-600 px-10 py-5 rounded-xl font-bold text-lg hover:bg-slate-800 transition-all duration-300"
              >
                {t.cta.docGuide}
              </a>
            </div>
          </div>
        </section>

      </main>

      {/* ===== Footer ===== */}
      <footer className="bg-slate-950 text-slate-400 py-16 border-t border-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center border-b border-slate-800 pb-10 mb-10 gap-6">
            <div className="flex items-center gap-3">
              <Globe className="h-8 w-8 text-[#9E1B34]" />
              <span className="text-2xl font-bold text-white tracking-tight">Traview <span className="text-slate-500 font-light">旅言</span></span>
            </div>
            <div className="flex items-center gap-8">
              <a href={SITE_URL} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-[#9E1B34] transition-colors font-medium">
                <Globe className="w-4 h-4" /> www.dryangyang.com
              </a>
              <a href="mailto:traview@gmail.com" className="flex items-center gap-2 hover:text-[#9E1B34] transition-colors font-medium">
                <Mail className="w-4 h-4" /> traview@gmail.com
              </a>
            </div>
          </div>
          <div className="flex flex-col md:flex-row justify-between items-center text-sm">
            <p>{t.footer.rights}</p>
            <div className="flex space-x-8 mt-6 md:mt-0 font-medium">
              <span className="hover:text-white transition-colors cursor-pointer">{t.footer.privacy}</span>
              <span className="hover:text-white transition-colors cursor-pointer">{t.footer.terms}</span>
              <span className="hover:text-white transition-colors cursor-pointer">{t.footer.docs}</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}