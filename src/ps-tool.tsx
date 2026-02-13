import { useState, useEffect, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LabelList
} from 'recharts';
import {
  Users, Building2, Search, Calendar,
  Download, ShieldCheck, Clock, Sun, Moon, ChevronDown, ChevronUp
} from 'lucide-react';
import Papa from 'papaparse';
import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
  ZoomableGroup
} from "react-simple-maps";

const msaGeoUrl = "msa.json";
const stateGeoUrl = "https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json";
const TEMPLE_CHERRY = "#9D2235";

/** ========= Smaller + cleaner sizing ========= */
const CHART_TICK_FONT = 12;
const LABEL_FONT = 12;
const HEADER_TITLE_PX = 20;
const META_LABEL_PX = 12;
const BTN_PX = 12;
const ICON_SIZE_SM = 16;

const TOOLTIP_LABEL_PX = 12;
const TOOLTIP_N_PX = 12;

interface DataPoint { label: string; value: number; n: number; }

interface BaseData {
  id: string | number;
  name: string;
  sample_size: number;
  avg_rating: number;
  year?: number | string;
  month?: number | string;
  job_means: DataPoint[];
  biz_means: DataPoint[];
  skill_means: DataPoint[];
  fohboh_means: DataPoint[];
  law_comparison: { period: string; rating: number; n: number }[];
  lat?: number;
  lng?: number;
  hasLaw: boolean;
}

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length && payload[0].payload) {
    const d = payload[0].payload;
    return (
      <div className="bg-zinc-950/95 border border-zinc-800 px-3 py-2 rounded-xl shadow-2xl text-zinc-100">
        <p
          className="font-extrabold text-zinc-400 uppercase tracking-widest mb-1"
          style={{ fontSize: TOOLTIP_LABEL_PX }}
        >
          {d.label}
        </p>
        <p className="text-[#9D2235] text-2xl font-black leading-none">
          {(d.value || 0).toFixed(3)}
        </p>
        <p className="text-zinc-400 font-bold mt-1" style={{ fontSize: TOOLTIP_N_PX }}>
          SAMPLE N = {d.n || 0}
        </p>
      </div>
    );
  }
  return null;
};

function normalize(s: any) {
  return String(s ?? "").toLowerCase().replace(/\s+/g, " ").trim();
}

function findDefaultCity(list: BaseData[]) {
  const phl = list.find(d => normalize(d.name).includes("philadelphia"));
  return phl || list[0] || null;
}

function findDefaultMsa(list: BaseData[]) {
  const target = "philadelphia-camden-wilmington, pa-nj-de-md";
  const hit = list.find(d => normalize(d.name) === target || normalize(d.name).includes(target));
  return hit || list[0] || null;
}

const Dashboard = () => {
  const [view, setView] = useState<'city' | 'msa'>('city');
  const [cityData, setCityData] = useState<BaseData[]>([]);
  const [msaData, setMsaData] = useState<BaseData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<BaseData | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const [basemap, setBasemap] = useState<'dark' | 'light'>('dark');
  const [showMore, setShowMore] = useState(false);

  const transformRow = (row: any, nameKey: string, idKey: string): BaseData => {
    const law_comparison = [
      { period: 'Pre-Law (12-1m)', rating: row.mean_m12_m1, n: row.n_m12_m1 },
      { period: 'Post-Law (0-11m)', rating: row.mean_0_11, n: row.n_0_11 }
    ].filter(d => d.rating !== null && !isNaN(d.rating));

    return {
      id: String(row[idKey] || ""),
      name: String(row[nameKey] || ""),
      sample_size: Number(row.sample_size) || 0,
      avg_rating: Number(row.avg_rating) || 0,
      year: row.year,
      month: row.month,
      lat: Number(row.latitude),
      lng: Number(row.longitude),
      hasLaw: law_comparison.length > 0,
      job_means: [
        { label: '< 1Y', value: row['job_mean_LESS THAN 1 YEAR'], n: row['job_n_LESS THAN 1 YEAR'] },
        { label: '1-3Y', value: row['job_mean_MORE THAN 1 YEAR'], n: row['job_n_MORE THAN 1 YEAR'] },
        { label: '3-5Y', value: row['job_mean_MORE THAN 3 YEARS'], n: row['job_n_MORE THAN 3 YEARS'] },
        { label: '5-8Y', value: row['job_mean_MORE THAN 5 YEARS'], n: row['job_n_MORE THAN 5 YEARS'] },
        { label: '8-10Y', value: row['job_mean_MORE THAN 8 YEARS'], n: row['job_n_MORE THAN 8 YEARS'] },
        { label: '> 10Y', value: row['job_mean_MORE THAN  10 YEARS'], n: row['job_n_MORE THAN  10 YEARS'] },
      ].filter(d => d.value != null),
      biz_means: [
        { label: 'Hotel', value: row.biz_mean_Hotel, n: row.biz_n_Hotel },
        { label: 'Restaurant', value: row.biz_mean_Restaurant, n: row.biz_n_Restaurant },
        { label: 'Catering', value: row.biz_mean_Catering, n: row.biz_n_Catering },
      ].filter(d => d.value != null),
      skill_means: [
        { label: 'Unskilled', value: row.skill_mean_1, n: row.skill_n_1 },
        { label: 'Semi-skilled', value: row.skill_mean_2, n: row.skill_n_2 },
        { label: 'Skilled', value: row.skill_mean_3, n: row.skill_n_3 },
        { label: 'Professional', value: row.skill_mean_4, n: row.skill_n_4 },
      ].filter(d => d.value != null),
      fohboh_means: [
        { label: 'FOH', value: row.fohboh_mean_FOH, n: row.fohboh_n_FOH },
        { label: 'BOH', value: row.fohboh_mean_BOH, n: row.fohboh_n_BOH },
        { label: 'Mix', value: row.fohboh_mean_Mix, n: row.fohboh_n_Mix },
      ].filter(d => d.value != null),
      law_comparison
    };
  };

  useEffect(() => {
    Promise.all([
      new Promise(resolve => Papa.parse("city.csv", { download: true, header: true, dynamicTyping: true, complete: resolve })),
      new Promise(resolve => Papa.parse("msa.csv", { download: true, header: true, dynamicTyping: true, complete: resolve }))
    ]).then(([cityRes, msaRes]: any) => {
      const cData = cityRes.data.map((r: any) => transformRow(r, 'location', 'location')).filter((d: any) => d.name && d.lat);
      const mData = msaRes.data.map((r: any) => transformRow(r, 'cbsaname20', 'geoid')).filter((d: any) => d.name);

      setCityData(cData);
      setMsaData(mData);

      // initial default (city view)
      setSelectedItem(findDefaultCity(cData));
      setLoading(false);
    });
  }, []);

  // When switching view, reset selection to the correct default (and collapse More)
  useEffect(() => {
    if (loading) return;
    setShowMore(false);
    setSearchTerm("");

    if (view === 'city') {
      setSelectedItem(prev => {
        const exists = prev && cityData.some(d => String(d.id) === String(prev.id));
        return exists ? prev : findDefaultCity(cityData);
      });
    } else {
      setSelectedItem(prev => {
        const exists = prev && msaData.some(d => String(d.id) === String(prev.id));
        return exists ? prev : findDefaultMsa(msaData);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, loading]);

  const sortedCityMarkers = useMemo(
    () => [...cityData].sort((a, b) => b.sample_size - a.sample_size),
    [cityData]
  );
  const maxMsaN = useMemo(
    () => Math.max(...msaData.map(d => d.sample_size), 1),
    [msaData]
  );

  const searchRecommendations = useMemo(() => {
    const list = view === 'city' ? cityData : msaData;
    if (!searchTerm) return list.filter(i => i.hasLaw).sort((a, b) => b.sample_size - a.sample_size).slice(0, 10);
    return list.filter(i => i.name.toLowerCase().includes(searchTerm.toLowerCase())).slice(0, 10);
  }, [searchTerm, view, cityData, msaData]);

  // Basemap styles
  const mapShellClass =
    basemap === 'dark'
      ? "bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950"
      : "bg-gradient-to-br from-zinc-100 via-zinc-50 to-zinc-200";

  const mapOverlayOpacity = basemap === 'dark' ? 0.55 : 0.25;

  const stateFill = basemap === 'dark' ? "#151515" : "#f3f4f6";
  const stateStroke = basemap === 'dark' ? "#2a2a2a" : "#cbd5e1";
  const msaEmptyFill = basemap === 'dark' ? "#1a1a1a" : "#e5e7eb";
  const msaStroke = basemap === 'dark' ? "#2b2b2b" : "#cbd5e1";

  const rightPanelText = basemap === 'dark' ? "text-zinc-100" : "text-zinc-900";

  if (loading) return <div className="h-screen flex items-center justify-center bg-zinc-950 text-white font-bold">PS-SAT Tool Loading...</div>;

  // Build right-side cards list and choose top 2
  type CardKey = 'law' | 'tenure' | 'biz' | 'skill' | 'fohboh';
  const allCards: CardKey[] = selectedItem?.hasLaw
    ? ['law', 'tenure', 'biz', 'skill', 'fohboh']
    : ['tenure', 'biz', 'skill', 'fohboh'];

  const primary = allCards.slice(0, 2);
  const secondary = allCards.slice(2);

  return (
    <div className="flex flex-col h-screen bg-[#070707] text-zinc-100 overflow-hidden font-sans">
      {/* Header */}
      <header className="flex items-center justify-between px-5 py-3 bg-white border-b-4 border-[#9D2235] z-40 shadow-xl">
        <div className="flex items-center gap-4 min-w-[560px]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#9D2235] flex items-center justify-center rounded text-white font-black text-xl">T</div>
            <div className="leading-tight">
              <h1 className="text-[#9D2235] font-black tracking-tight uppercase" style={{ fontSize: HEADER_TITLE_PX }}>
                PS-SAT: Predictive Scheduling & Satisfaction Analytics Tool
              </h1>
              <p className="text-zinc-600 font-semibold" style={{ fontSize: META_LABEL_PX }}>
                Developed by Dr. Yang Yang, Temple University,&nbsp;
                <a
                  href="https://dryangyang.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#9D2235] underline underline-offset-2 hover:opacity-80"
                >
                  dryangyang.com
                </a>
              </p>
            </div>
          </div>

          <nav className="flex gap-1 bg-zinc-100 p-1 rounded-lg">
            <button
              onClick={() => setView('city')}
              className={`px-3 py-2 rounded-md font-extrabold transition-all ${view === 'city' ? 'bg-white text-[#9D2235] shadow-sm' : 'text-zinc-400'}`}
              style={{ fontSize: BTN_PX }}
            >
              CITY LEVEL
            </button>
            <button
              onClick={() => {
                setView('msa');
                // force default MSA immediately when switching
                const def = findDefaultMsa(msaData);
                if (def) setSelectedItem(def);
              }}
              className={`px-3 py-2 rounded-md font-extrabold transition-all ${view === 'msa' ? 'bg-white text-[#9D2235] shadow-sm' : 'text-zinc-400'}`}
              style={{ fontSize: BTN_PX }}
            >
              MSA LEVEL
            </button>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <div
            className="relative w-[420px]"
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
          >
            <Search className="absolute left-4 top-3 text-zinc-400" size={18} />
            <input
              className="bg-zinc-100 rounded-full py-2.5 pl-11 pr-4 w-full text-zinc-800 outline-none focus:ring-2 focus:ring-[#9D2235]"
              style={{ fontSize: BTN_PX }}
              placeholder={view === 'city' ? "Search city..." : "Search MSA..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {isSearchFocused && searchRecommendations.length > 0 && (
              <div className="absolute top-full mt-2 w-full bg-white border border-zinc-200 rounded-xl shadow-2xl z-50 max-h-72 overflow-y-auto text-zinc-800">
                {searchRecommendations.map(item => (
                  <button
                    key={item.id}
                    onClick={() => { setSelectedItem(item); setSearchTerm(""); }}
                    className="w-full px-4 py-3 text-left hover:bg-zinc-50 border-b border-zinc-50 flex justify-between items-center"
                    style={{ fontSize: BTN_PX }}
                  >
                    <span className="flex items-center gap-2 font-semibold uppercase">
                      {item.name}
                      {item.hasLaw && <ShieldCheck size={16} className="text-[#9D2235]" />}
                    </span>
                    <span className="text-zinc-400 italic">N={item.sample_size}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <a
            href="user_manual.pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-[#9D2235] text-white px-4 py-2.5 rounded-md font-extrabold flex items-center gap-2 shadow-md hover:opacity-95"
            style={{ fontSize: BTN_PX }}
          >
            <Download size={18} /> MANUAL
          </a>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 flex overflow-hidden p-5 gap-5">
        {/* Map */}
        <div className={`flex-[3] rounded-3xl border ${basemap === 'dark' ? "border-zinc-800" : "border-zinc-300"} relative overflow-hidden shadow-inner ${mapShellClass}`}>
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              opacity: mapOverlayOpacity,
              backgroundImage:
                "radial-gradient(circle at 20% 25%, rgba(255,255,255,0.25), transparent 45%), radial-gradient(circle at 85% 70%, rgba(157,34,53,0.22), transparent 55%)"
            }}
          />

          {/* Basemap toggle */}
          <div className="absolute top-4 left-4 z-30">
            <button
              onClick={() => setBasemap(basemap === 'dark' ? 'light' : 'dark')}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl shadow-lg border ${
                basemap === 'dark'
                  ? "bg-zinc-950/70 text-zinc-100 border-zinc-800"
                  : "bg-white/80 text-zinc-900 border-zinc-200"
              } backdrop-blur hover:opacity-90`}
              style={{ fontSize: 12, fontWeight: 800 }}
            >
              {basemap === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
              {basemap === 'dark' ? "Light" : "Dark"}
            </button>
          </div>

          <ComposableMap projection="geoAlbersUsa" className="w-full h-full relative">
            <ZoomableGroup zoom={1}>
              {view === 'msa' ? (
                <Geographies geography={msaGeoUrl}>
                  {({ geographies }: { geographies: any[] }) =>
                    geographies?.map((geo) => {
                      const msaId = String(geo.properties?.GEOID || geo.properties?.geoid || geo.id || "").replace(/^0+/, "").trim();
                      const msaMatch = msaData.find(m => String(m.id).replace(/^0+/, "").trim() === msaId);
                      const isSelected = selectedItem?.id && String(selectedItem.id).replace(/^0+/, "").trim() === msaId;

                      const opacity = msaMatch ? (0.10 + (msaMatch.sample_size / maxMsaN) * 0.70) : 0.05;

                      // In light mode, keep the cherry but strengthen boundary contrast
                      const selectedFill = basemap === 'dark' ? "#f5f5f5" : "#111827";
                      const selectedStroke = basemap === 'dark' ? "#ffffff" : "#111827";

                      return (
                        <Geography
                          key={geo.rsmKey}
                          geography={geo}
                          onClick={() => msaMatch && setSelectedItem(msaMatch)}
                          fill={msaMatch ? (isSelected ? selectedFill : TEMPLE_CHERRY) : msaEmptyFill}
                          fillOpacity={msaMatch ? (isSelected ? 1 : opacity) : 1}
                          stroke={isSelected ? selectedStroke : msaStroke}
                          strokeWidth={isSelected ? 1.2 : 0.45}
                          style={{
                            default: { outline: "none" },
                            hover: {
                              fillOpacity: msaMatch ? 0.95 : 1,
                              fill: msaMatch ? TEMPLE_CHERRY : msaEmptyFill,
                              cursor: msaMatch ? "pointer" : "default",
                              outline: "none"
                            }
                          }}
                        />
                      );
                    })
                  }
                </Geographies>
              ) : (
                <>
                  <Geographies geography={stateGeoUrl}>
                    {({ geographies }: { geographies: any[] }) =>
                      geographies.map(geo => (
                        <Geography
                          key={geo.rsmKey}
                          geography={geo}
                          fill={stateFill}
                          stroke={stateStroke}
                          strokeWidth={0.7}
                          style={{ default: { outline: "none" }, hover: { outline: "none" }, pressed: { outline: "none" } }}
                        />
                      ))
                    }
                  </Geographies>

                  {sortedCityMarkers.map((city) => {
                    const hasValidCoords = typeof city.lng === 'number' && typeof city.lat === 'number' && !isNaN(city.lng) && !isNaN(city.lat);
                    if (!hasValidCoords) return null;

                    const r = Math.max(1.8, Math.sqrt(city.sample_size) / 3.0);

                    return (
                      <Marker key={city.id} coordinates={[city.lng as number, city.lat as number]}>
                        <circle
                          r={r}
                          fill={selectedItem?.id === city.id ? (basemap === 'dark' ? "#ffffff" : "#111827") : TEMPLE_CHERRY}
                          fillOpacity={selectedItem?.id === city.id ? 0.95 : 0.55}
                          stroke={selectedItem?.id === city.id ? TEMPLE_CHERRY : "none"}
                          strokeWidth={1.8}
                          className="cursor-pointer transition-all hover:scale-125"
                          onClick={() => setSelectedItem(city)}
                        />
                      </Marker>
                    );
                  })}
                </>
              )}
            </ZoomableGroup>
          </ComposableMap>

          {/* Smaller label card, bottom-left */}
          {selectedItem && (
            <div className="absolute bottom-5 left-5 pointer-events-none">
              <div className={`backdrop-blur px-4 py-3 rounded-2xl shadow-xl border max-w-[380px]
                ${basemap === 'dark'
                  ? "bg-white/92 border-zinc-200 text-zinc-900"
                  : "bg-white/92 border-zinc-200 text-zinc-900"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-black uppercase flex items-center gap-2 truncate" style={{ fontSize: 12 }}>
                    {selectedItem.hasLaw && <ShieldCheck size={14} className="text-[#9D2235]" />}
                    <span className="truncate">{selectedItem.name}</span>
                  </h3>
                  <span className="text-zinc-500 font-semibold text-[11px] whitespace-nowrap">
                    N={selectedItem.sample_size || 0}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-2">
                  <div className="rounded-xl bg-zinc-50 px-3 py-2 border border-zinc-200">
                    <p className="text-zinc-500 font-bold uppercase tracking-wider text-[10px]">
                      Avg Satisfaction
                    </p>
                    <p className="font-black text-[#9D2235] text-xl leading-none mt-1">
                      {(selectedItem.avg_rating || 0).toFixed(3)}
                    </p>
                  </div>
                  <div className="rounded-xl bg-zinc-50 px-3 py-2 border border-zinc-200">
                    <p className="text-zinc-500 font-bold uppercase tracking-wider text-[10px]">
                      Sample Size
                    </p>
                    <p className="font-black text-xl leading-none mt-1">
                      {selectedItem.sample_size || 0}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right panel */}
        <div className={`flex-[1] max-w-[420px] overflow-y-auto pr-1 custom-scrollbar space-y-4 ${rightPanelText}`}>
          {selectedItem && (
            <>
              {/* Right-side top identity header (City/MSA name) */}
              <div className={`rounded-3xl border shadow-lg p-4 ${
                basemap === 'dark'
                  ? "bg-zinc-950 border-zinc-800"
                  : "bg-white border-zinc-200"
              }`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-1 rounded-lg text-[11px] font-extrabold uppercase tracking-widest ${
                          basemap === 'dark' ? "bg-zinc-900 text-zinc-300" : "bg-zinc-100 text-zinc-700"
                        }`}
                      >
                        {view === 'city' ? "City" : "MSA"}
                      </span>
                      {selectedItem.hasLaw && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-[#9D2235]">
                          <ShieldCheck size={14} />
                          Policy available
                        </span>
                      )}
                    </div>

                    <div className="mt-2 font-black uppercase tracking-tight leading-snug text-[13px] break-words">
                      {selectedItem.name}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className={`text-[11px] font-bold ${basemap === 'dark' ? "text-zinc-400" : "text-zinc-500"}`}>
                      N
                    </div>
                    <div className={`text-[18px] font-black leading-none ${basemap === 'dark' ? "text-zinc-100" : "text-zinc-900"}`}>
                      {selectedItem.sample_size || 0}
                    </div>
                    <div className={`mt-2 text-[11px] font-bold ${basemap === 'dark' ? "text-zinc-400" : "text-zinc-500"}`}>
                      Avg
                    </div>
                    <div className="text-[18px] font-black leading-none text-[#9D2235]">
                      {(selectedItem.avg_rating || 0).toFixed(3)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Primary 2 cards */}
              {primary.map((k) => (
                <CardSwitch
                  key={k}
                  k={k}
                  selectedItem={selectedItem}
                  basemap={basemap}
                />
              ))}

              {/* More toggle */}
              {secondary.length > 0 && (
                <div className={`rounded-3xl border shadow-lg ${
                  basemap === 'dark' ? "bg-zinc-950 border-zinc-800" : "bg-white border-zinc-200"
                }`}>
                  <button
                    onClick={() => setShowMore(v => !v)}
                    className="w-full px-4 py-3 flex items-center justify-between"
                  >
                    <span className={`text-[12px] font-extrabold uppercase tracking-widest ${
                      basemap === 'dark' ? "text-zinc-300" : "text-zinc-700"
                    }`}>
                      More charts ({secondary.length})
                    </span>
                    {showMore ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </button>

                  {showMore && (
                    <div className="px-4 pb-4 space-y-4">
                      {secondary.map((k) => (
                        <CardSwitch
                          key={k}
                          k={k}
                          selectedItem={selectedItem}
                          basemap={basemap}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </main>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 8px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #2b2b2b; border-radius: 10px; }
        @import url('https://fonts.googleapis.com/css2?family=Public+Sans:wght@400;600;800;900&display=swap');
        body { font-family: 'Public Sans', sans-serif; }
      `}</style>
    </div>
  );
};

/** Switch renderer for right-panel cards */
function CardSwitch({
  k,
  selectedItem,
  basemap
}: {
  k: 'law' | 'tenure' | 'biz' | 'skill' | 'fohboh';
  selectedItem: BaseData;
  basemap: 'dark' | 'light';
}) {
  if (k === 'law') {
    return (
      <div className={`p-4 rounded-3xl shadow-lg ${
        basemap === 'dark' ? "bg-zinc-950 border border-zinc-800" : "bg-white border border-zinc-200"
      }`}>
        <h3
          className="font-extrabold mb-3 text-[#9D2235] uppercase tracking-widest flex items-center justify-between"
          style={{ fontSize: 12 }}
        >
          <span className="flex items-center gap-2">
            <Calendar size={16} /> Legislative Effect
          </span>
          {selectedItem.year && (
            <span className={`px-2 py-1 rounded font-semibold normal-case text-[11px] ${
              basemap === 'dark' ? "bg-zinc-900 text-zinc-300" : "bg-zinc-100 text-zinc-700"
            }`}>
              {selectedItem.year}-{selectedItem.month}
            </span>
          )}
        </h3>

        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={selectedItem.law_comparison}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={basemap === 'dark' ? "#27272a" : "#e5e7eb"} />
              <XAxis dataKey="period" tick={{ fill: basemap === 'dark' ? '#a1a1aa' : '#52525b', fontSize: CHART_TICK_FONT }} axisLine={false} />
              <YAxis domain={[0, 5]} hide />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="rating" fill="#9D2235" radius={[8, 8, 0, 0]} barSize={32}>
                <LabelList
                  dataKey="n"
                  position="top"
                  style={{ fontSize: LABEL_FONT, fill: '#9D2235', fontWeight: 800 }}
                  formatter={(v: any) => `N=${v}`}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  }

  if (k === 'tenure') {
    return (
      <MiniBarCard
        title="Satisfaction By Tenure"
        icon={<Clock size={16} className="text-[#9D2235]" />}
        data={selectedItem.job_means}
        barColor="#9D2235"
        basemap={basemap}
      />
    );
  }

  if (k === 'biz') {
    return (
      <MiniBarCard
        title="Business Model"
        icon={<Building2 size={16} className="text-[#a855f7]" />}
        data={selectedItem.biz_means}
        barColor="#a855f7"
        basemap={basemap}
        showN
      />
    );
  }

  if (k === 'skill') {
    return (
      <MiniBarCard
        title="Skill Level"
        icon={<Users size={16} className="text-[#22c55e]" />}
        data={selectedItem.skill_means}
        barColor="#22c55e"
        basemap={basemap}
        showN
      />
    );
  }

  return (
    <MiniBarCard
      title="FOH vs BOH"
      icon={<Users size={16} className="text-[#f59e0b]" />}
      data={selectedItem.fohboh_means}
      barColor="#f59e0b"
      basemap={basemap}
      showN
    />
  );
}

/** Smaller reusable right-side card */
function MiniBarCard({
  title,
  icon,
  data,
  barColor,
  showN,
  basemap
}: {
  title: string;
  icon: React.ReactNode;
  data: DataPoint[];
  barColor: string;
  showN?: boolean;
  basemap: 'dark' | 'light';
}) {
  return (
    <div className={`rounded-3xl p-4 shadow-xl border ${
      basemap === 'dark' ? "bg-zinc-950 border-zinc-800" : "bg-white border-zinc-200"
    }`}>
      <h3 className={`font-extrabold mb-3 uppercase tracking-widest flex items-center gap-2 ${
        basemap === 'dark' ? "text-zinc-300" : "text-zinc-700"
      }`} style={{ fontSize: 12 }}>
        {icon} {title}
      </h3>
      <div className="h-40">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <XAxis
              dataKey="label"
              tick={{ fill: basemap === 'dark' ? '#a1a1aa' : '#52525b', fontSize: 12 }}
              axisLine={false}
            />
            <YAxis domain={[0, 5]} hide />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="value" fill={barColor} radius={[6, 6, 0, 0]} barSize={28}>
              {showN && (
                <LabelList
                  dataKey="n"
                  position="top"
                  style={{ fontSize: 12, fill: barColor, fontWeight: 800 }}
                  formatter={(v: any) => `N=${v}`}
                />
              )}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default Dashboard;
