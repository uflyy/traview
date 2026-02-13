import { useState, useEffect, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LabelList
} from 'recharts';
import {
  Users, Building2, Search, Calendar,
  Download, ShieldCheck, Clock
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

/** ========= Global sizing (double-sized) ========= */
const CHART_TICK_FONT = 18;        // was ~9
const LABEL_FONT = 18;             // was ~9
const CARD_TITLE_PX = 20;          // was 10
const META_LABEL_PX = 18;          // was 9~10
const HEADER_TITLE_PX = 28;        // top left PS-SAT
const ICON_SIZE_SM = 28;           // was 14
const TOOLTIP_LABEL_PX = 20;       // was 10
const TOOLTIP_N_PX = 18;           // was 9
const TOOLTIP_VALUE_CLASS = "text-4xl"; // was text-lg

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
      <div className="bg-black border border-zinc-800 p-4 rounded-xl shadow-2xl text-zinc-100 font-sans">
        <p className={`font-black text-zinc-400 mb-2 uppercase tracking-widest`}
           style={{ fontSize: TOOLTIP_LABEL_PX }}>
          {d.label}
        </p>
        <p className={`text-[#9D2235] ${TOOLTIP_VALUE_CLASS} font-black leading-none`}>
          {(d.value || 0).toFixed(3)}
        </p>
        <p className="text-zinc-500 font-bold mt-2"
           style={{ fontSize: TOOLTIP_N_PX }}>
          SAMPLE N = {d.n || 0}
        </p>
      </div>
    );
  }
  return null;
};

const Dashboard = () => {
  const [view, setView] = useState<'city' | 'msa'>('city');
  const [cityData, setCityData] = useState<BaseData[]>([]);
  const [msaData, setMsaData] = useState<BaseData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<BaseData | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);

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
      setSelectedItem(cData.find((c: any) => c.name.includes("Philadelphia")) || cData[0]);
      setLoading(false);
    });
  }, []);

  const sortedCityMarkers = useMemo(() => [...cityData].sort((a, b) => b.sample_size - a.sample_size), [cityData]);
  const maxMsaN = useMemo(() => Math.max(...msaData.map(d => d.sample_size), 1), [msaData]);

  const searchRecommendations = useMemo(() => {
    const list = view === 'city' ? cityData : msaData;
    if (!searchTerm) return list.filter(i => i.hasLaw).sort((a, b) => b.sample_size - a.sample_size).slice(0, 10);
    return list.filter(i => i.name.toLowerCase().includes(searchTerm.toLowerCase())).slice(0, 10);
  }, [searchTerm, view, cityData, msaData]);

  if (loading) return <div className="h-screen flex items-center justify-center bg-black text-white font-black italic">PS-SAT Tool Loading...</div>;

  return (
    <div className="flex flex-col h-screen bg-[#050505] text-zinc-100 overflow-hidden font-sans">
      <header className="flex items-center justify-between px-8 py-3 bg-white border-b-4 border-[#9D2235] z-40 shadow-2xl font-sans">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-[#9D2235] flex items-center justify-center rounded-sm text-white font-black text-2xl">T</div>
            <div>
              <h1 className="text-[#9D2235] font-black tracking-tighter uppercase leading-none"
                  style={{ fontSize: HEADER_TITLE_PX }}>
                PS-SAT
              </h1>
              <p className="text-zinc-600 font-bold mt-1" style={{ fontSize: META_LABEL_PX }}>
                Developed by Dr. Yang Yang, Temple University, dryangyang.com
              </p>
            </div>
          </div>
          <nav className="flex gap-1 bg-zinc-100 p-1 rounded-lg">
            <button
              onClick={() => setView('city')}
              className={`px-4 py-2 rounded-md font-black transition-all ${view === 'city' ? 'bg-white text-[#9D2235] shadow-sm' : 'text-zinc-400'}`}
              style={{ fontSize: CARD_TITLE_PX }}
            >
              CITY LEVEL
            </button>
            <button
              onClick={() => setView('msa')}
              className={`px-4 py-2 rounded-md font-black transition-all ${view === 'msa' ? 'bg-white text-[#9D2235] shadow-sm' : 'text-zinc-400'}`}
              style={{ fontSize: CARD_TITLE_PX }}
            >
              MSA LEVEL
            </button>
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <div
            className="relative w-[520px]"
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
          >
            <Search className="absolute left-4 top-3.5 text-zinc-400" size={24} />
            <input
              className="bg-zinc-100 rounded-full py-3 pl-12 pr-5 w-full text-zinc-800 outline-none focus:ring-2 focus:ring-[#9D2235]"
              style={{ fontSize: CARD_TITLE_PX }}
              placeholder={view === 'city' ? "Search city..." : "Search MSA..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {isSearchFocused && searchRecommendations.length > 0 && (
              <div className="absolute top-full mt-2 w-full bg-white border border-zinc-200 rounded-xl shadow-2xl z-50 max-h-80 overflow-y-auto text-zinc-800">
                {searchRecommendations.map(item => (
                  <button
                    key={item.id}
                    onClick={() => { setSelectedItem(item); setSearchTerm(""); }}
                    className="w-full p-4 text-left hover:bg-zinc-50 border-b border-zinc-50 flex justify-between items-center font-bold"
                    style={{ fontSize: CARD_TITLE_PX }}
                  >
                    <span className="flex items-center gap-2 uppercase">
                      {item.name} {item.hasLaw && <ShieldCheck size={24} className="text-[#9D2235]" />}
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
            className="bg-[#9D2235] text-white px-5 py-3 rounded font-black flex items-center gap-3 shadow-lg"
            style={{ fontSize: CARD_TITLE_PX }}
          >
            <Download size={24} /> MANUAL
          </a>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden p-6 gap-6">
        <div className="flex-[1.4] bg-[#0d0d0d] rounded-3xl border border-zinc-800 relative overflow-hidden shadow-inner">
          <ComposableMap projection="geoAlbersUsa" className="w-full h-full">
            <ZoomableGroup zoom={1}>
              {view === 'msa' ? (
                <Geographies geography={msaGeoUrl}>
                  {({ geographies }: { geographies: any[] }) =>
                    geographies?.map((geo) => {
                      const msaId = String(geo.properties?.GEOID || geo.properties?.geoid || geo.id || "").replace(/^0+/, "").trim();
                      const msaMatch = msaData.find(m => String(m.id).replace(/^0+/, "").trim() === msaId);
                      const isSelected = selectedItem?.id && String(selectedItem.id).replace(/^0+/, "").trim() === msaId;
                      const opacity = msaMatch ? (0.15 + (msaMatch.sample_size / maxMsaN) * 0.85) : 0.05;
                      return (
                        <Geography
                          key={geo.rsmKey}
                          geography={geo}
                          onClick={() => msaMatch && setSelectedItem(msaMatch)}
                          fill={msaMatch ? (isSelected ? "#fff" : TEMPLE_CHERRY) : "#0f0f0f"}
                          fillOpacity={msaMatch ? (isSelected ? 1 : opacity) : 1}
                          stroke={isSelected ? "#fff" : "#333"}
                          strokeWidth={isSelected ? 1.5 : 0.2}
                          style={{
                            default: { outline: "none" },
                            hover: {
                              fillOpacity: 1,
                              fill: msaMatch ? TEMPLE_CHERRY : "#111",
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
                        <Geography key={geo.rsmKey} geography={geo} fill="#0a0a0a" stroke="#222" strokeWidth={0.5} />
                      ))
                    }
                  </Geographies>
                  {sortedCityMarkers.map((city) => {
                    const hasValidCoords = typeof city.lng === 'number' && typeof city.lat === 'number' && !isNaN(city.lng) && !isNaN(city.lat);
                    if (!hasValidCoords) return null;
                    return (
                      <Marker key={city.id} coordinates={[city.lng as number, city.lat as number]}>
                        <circle
                          r={Math.max(2.5, Math.sqrt(city.sample_size) / 2.2)}
                          fill={selectedItem?.id === city.id ? "#fff" : TEMPLE_CHERRY}
                          fillOpacity={selectedItem?.id === city.id ? 1 : 0.6}
                          stroke={selectedItem?.id === city.id ? TEMPLE_CHERRY : "none"}
                          strokeWidth={2}
                          className="cursor-pointer transition-all hover:scale-125 shadow-2xl"
                          onClick={() => setSelectedItem(city)}
                        />
                      </Marker>
                    );
                  })}
                </>
              )}
            </ZoomableGroup>
          </ComposableMap>

          {selectedItem && (
            <div className="absolute top-6 right-6 pointer-events-none">
              <div className="bg-white/95 backdrop-blur px-6 py-5 rounded-2xl shadow-2xl border-r-8 border-[#9D2235] text-zinc-900 text-right">
                <h3 className="font-black uppercase flex items-center justify-end gap-2"
                    style={{ fontSize: CARD_TITLE_PX }}>
                  {selectedItem.hasLaw && <ShieldCheck size={ICON_SIZE_SM} className="text-[#9D2235]" />} {selectedItem.name}
                </h3>

                <div className="flex gap-10 mt-3 justify-end">
                  <div className="border-r border-zinc-200 pr-10">
                    <p className="text-zinc-400 font-black uppercase tracking-widest text-right"
                       style={{ fontSize: META_LABEL_PX }}>
                      Avg Satisfaction
                    </p>
                    <p className="font-black text-[#9D2235] leading-none mt-2 text-5xl">
                      {(selectedItem.avg_rating || 0).toFixed(3)}
                    </p>
                  </div>
                  <div>
                    <p className="text-zinc-400 font-black uppercase tracking-widest text-right"
                       style={{ fontSize: META_LABEL_PX }}>
                      Population (N)
                    </p>
                    <p className="font-black leading-none mt-2 text-5xl">
                      {selectedItem.sample_size || 0}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-6">
          {selectedItem && (
            <>
              {selectedItem.hasLaw && (
                <div className="bg-white p-6 rounded-3xl shadow-xl">
                  <h3
                    className="font-black mb-6 text-[#9D2235] uppercase tracking-widest flex items-center justify-between"
                    style={{ fontSize: CARD_TITLE_PX }}
                  >
                    <span className="flex items-center gap-3 font-black">
                      <Calendar size={ICON_SIZE_SM} /> Legislative Effect Comparison
                    </span>
                    {selectedItem.year && (
                      <span className="bg-zinc-100 px-3 py-1 rounded italic font-bold"
                            style={{ fontSize: META_LABEL_PX }}>
                        Policy: {selectedItem.year}-{selectedItem.month}
                      </span>
                    )}
                  </h3>

                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={selectedItem.law_comparison}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                        <XAxis dataKey="period" tick={{ fill: '#888', fontSize: CHART_TICK_FONT }} axisLine={false} />
                        <YAxis domain={[0, 5]} hide />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="rating" fill="#9D2235" radius={[8, 8, 0, 0]} barSize={52}>
                          <LabelList
                            dataKey="n"
                            position="top"
                            style={{ fontSize: LABEL_FONT, fill: '#9D2235', fontWeight: 900 }}
                            formatter={(v: any) => `N=${v}`}
                          />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Tenure */}
              <div className="bg-[#111] border border-zinc-800 rounded-3xl p-6 shadow-2xl">
                <h3
                  className="font-black mb-6 text-zinc-500 uppercase tracking-widest flex items-center gap-3"
                  style={{ fontSize: CARD_TITLE_PX }}
                >
                  <Clock size={ICON_SIZE_SM} className="text-[#9D2235]" /> Satisfaction By Tenure
                </h3>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={selectedItem.job_means}>
                      <XAxis dataKey="label" tick={{ fill: '#666', fontSize: CHART_TICK_FONT }} axisLine={false} />
                      <YAxis domain={[0, 5]} hide />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="value" fill="#9D2235" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Business model */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-xl">
                <h3
                  className="font-black mb-6 text-zinc-400 uppercase tracking-widest flex items-center gap-3"
                  style={{ fontSize: CARD_TITLE_PX }}
                >
                  <Building2 size={ICON_SIZE_SM} className="text-[#a855f7]" /> Satisfaction By Business Model
                </h3>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={selectedItem.biz_means}>
                      <XAxis dataKey="label" tick={{ fill: '#666', fontSize: CHART_TICK_FONT }} axisLine={false} />
                      <YAxis domain={[0, 5]} hide />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="value" fill="#a855f7" radius={[8, 8, 0, 0]}>
                        <LabelList
                          dataKey="n"
                          position="top"
                          style={{ fontSize: LABEL_FONT, fill: '#a855f7', fontWeight: 700 }}
                          formatter={(v: any) => `N=${v}`}
                        />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Skill level (NEW) */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-xl">
                <h3
                  className="font-black mb-6 text-zinc-400 uppercase tracking-widest flex items-center gap-3"
                  style={{ fontSize: CARD_TITLE_PX }}
                >
                  <Users size={ICON_SIZE_SM} className="text-[#22c55e]" /> Satisfaction By Skill Level
                </h3>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={selectedItem.skill_means}>
                      <XAxis dataKey="label" tick={{ fill: '#666', fontSize: CHART_TICK_FONT }} axisLine={false} />
                      <YAxis domain={[0, 5]} hide />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="value" fill="#22c55e" radius={[8, 8, 0, 0]}>
                        <LabelList
                          dataKey="n"
                          position="top"
                          style={{ fontSize: LABEL_FONT, fill: '#22c55e', fontWeight: 700 }}
                          formatter={(v: any) => `N=${v}`}
                        />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* FOH / BOH */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 mb-12 shadow-xl">
                <h4
                  className="font-black mb-6 text-zinc-400 uppercase tracking-widest flex items-center gap-3"
                  style={{ fontSize: CARD_TITLE_PX }}
                >
                  <Users size={ICON_SIZE_SM} className="text-[#f59e0b]" /> Front vs Back-of-House Analysis
                </h4>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={selectedItem.fohboh_means}>
                      <XAxis dataKey="label" tick={{ fill: '#666', fontSize: CHART_TICK_FONT }} axisLine={false} />
                      <YAxis domain={[0, 5]} hide />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="value" fill="#f59e0b" radius={[8, 8, 0, 0]}>
                        <LabelList
                          dataKey="n"
                          position="top"
                          style={{ fontSize: LABEL_FONT, fill: '#f59e0b', fontWeight: 700 }}
                          formatter={(v: any) => `N=${v}`}
                        />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </>
          )}
        </div>
      </main>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 8px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #333; border-radius: 10px; }
        @import url('https://fonts.googleapis.com/css2?family=Public+Sans:wght@400;700;900&display=swap');
        body { font-family: 'Public Sans', sans-serif; }
      `}</style>
    </div>
  );
};

export default Dashboard;
