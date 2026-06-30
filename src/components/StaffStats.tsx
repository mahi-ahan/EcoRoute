import { useState, useMemo } from "react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts";
import { Calendar, AlertCircle, BarChart3, PieChartIcon, CheckCircle2 } from "lucide-react";
import { WasteReport, SeverityType } from "../types";

interface StaffStatsProps {
  reports: WasteReport[];
}

export default function StaffStats({ reports }: StaffStatsProps) {
  const [timePeriod, setTimePeriod] = useState<"7days" | "30days" | "all">("all");

  // Colors for charts
  const COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#64748b"];
  const SEVERITY_COLORS = {
    Low: "#10b981",
    Medium: "#eab308",
    High: "#f97316",
    Critical: "#ef4444",
  };

  // Filter reports by selected time period
  const filteredReports = useMemo(() => {
    const now = new Date();
    return reports.filter((report) => {
      const reportDate = new Date(report.createdAt);
      if (timePeriod === "7days") {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(now.getDate() - 7);
        return reportDate >= sevenDaysAgo;
      } else if (timePeriod === "30days") {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(now.getDate() - 30);
        return reportDate >= thirtyDaysAgo;
      }
      return true; // All time
    });
  }, [reports, timePeriod]);

  // Aggregate waste type data
  const wasteTypeData = useMemo(() => {
    const counts: { [type: string]: number } = {};
    filteredReports.forEach((report) => {
      const type = report.wasteType || "Unclassified";
      counts[type] = (counts[type] || 0) + 1;
    });

    return Object.entries(counts)
      .map(([name, value]) => ({ name, count: value }))
      .sort((a, b) => b.count - a.count);
  }, [filteredReports]);

  // Aggregate severity data
  const severityData = useMemo(() => {
    const counts: { [key in SeverityType]?: number } = {
      Low: 0,
      Medium: 0,
      High: 0,
      Critical: 0,
    };

    filteredReports.forEach((report) => {
      const sev = report.severity as SeverityType;
      if (counts[sev] !== undefined) {
        counts[sev]! += 1;
      }
    });

    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .filter((item) => item.value > 0);
  }, [filteredReports]);

  // Resolution rate stats
  const stats = useMemo(() => {
    const total = filteredReports.length;
    if (total === 0) return { total: 0, resolved: 0, active: 0, rate: 0 };
    const resolved = filteredReports.filter((r) => r.status === "Resolved").length;
    const active = total - resolved;
    const rate = Math.round((resolved / total) * 100);
    return { total, resolved, active, rate };
  }, [filteredReports]);

  return (
    <div className="space-y-6">
      {/* Filters Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
        <div>
          <h4 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
            <Calendar className="h-4 w-4 text-emerald-500" />
            Statistical Analysis Filter
          </h4>
          <p className="text-[11px] text-slate-400">Filter datasets dynamically across periods</p>
        </div>
        <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-xl border border-slate-200">
          <button
            onClick={() => setTimePeriod("7days")}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              timePeriod === "7days"
                ? "bg-white text-slate-800 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Last 7 Days
          </button>
          <button
            onClick={() => setTimePeriod("30days")}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              timePeriod === "30days"
                ? "bg-white text-slate-800 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Last 30 Days
          </button>
          <button
            onClick={() => setTimePeriod("all")}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              timePeriod === "all"
                ? "bg-emerald-600 text-white shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            All Time
          </button>
        </div>
      </div>

      {/* Metrics breakdown */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Period Reports</div>
          <div className="text-2xl font-black text-slate-800">{stats.total}</div>
          <p className="text-[11px] text-slate-400 mt-1">Total submitted community files</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Active Cases</div>
          <div className="text-2xl font-black text-amber-600">{stats.active}</div>
          <p className="text-[11px] text-slate-400 mt-1">Pending and In-Progress issues</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Resolution Rate</div>
          <div className="flex items-baseline gap-2">
            <div className="text-2xl font-black text-emerald-600">{stats.rate}%</div>
            <span className="text-[10px] text-slate-400">({stats.resolved} of {stats.total})</span>
          </div>
          {/* Progress bar */}
          <div className="w-full bg-slate-100 h-2 rounded-full mt-2.5 overflow-hidden">
            <div 
              className="bg-emerald-500 h-full transition-all duration-500" 
              style={{ width: `${stats.rate}%` }}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Waste Type Chart */}
        <div className="lg:col-span-7 bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex flex-col h-[400px]">
          <h5 className="text-xs font-bold text-slate-700 mb-4 flex items-center gap-1.5">
            <BarChart3 className="h-4 w-4 text-emerald-500" />
            Waste Classification Frequency
          </h5>
          <div className="flex-1 w-full text-xs font-mono">
            {wasteTypeData.length === 0 ? (
              <div className="flex items-center justify-center h-full text-slate-400">
                No data available for this period.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={wasteTypeData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: "#ffffff", borderRadius: "8px", borderColor: "#f1f5f9" }}
                    labelClassName="font-sans font-bold text-xs"
                  />
                  <Bar dataKey="count" name="Report Count" fill="#10b981" radius={[4, 4, 0, 0]}>
                    {wasteTypeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Severity Pie Chart */}
        <div className="lg:col-span-5 bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex flex-col h-[400px]">
          <h5 className="text-xs font-bold text-slate-700 mb-4 flex items-center gap-1.5">
            <PieChartIcon className="h-4 w-4 text-emerald-500" />
            Severity Level Distribution
          </h5>
          <div className="flex-1 w-full text-xs font-mono relative flex items-center justify-center">
            {severityData.length === 0 ? (
              <div className="text-slate-400">No data available for this period.</div>
            ) : (
              <div className="w-full h-full flex flex-col sm:flex-row items-center justify-center gap-4">
                <div className="w-1/2 h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={severityData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {severityData.map((entry) => (
                          <Cell 
                            key={`cell-${entry.name}`} 
                            fill={SEVERITY_COLORS[entry.name as SeverityType] || "#64748b"} 
                          />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                {/* Custom Legend for Severity Colors */}
                <div className="flex flex-col gap-2 shrink-0 text-left font-sans">
                  {severityData.map((entry) => (
                    <div key={entry.name} className="flex items-center gap-2">
                      <span 
                        className="w-3 h-3 rounded-full shrink-0" 
                        style={{ backgroundColor: SEVERITY_COLORS[entry.name as SeverityType] || "#64748b" }}
                      />
                      <span className="text-slate-700 font-medium text-xs capitalize">{entry.name}:</span>
                      <span className="text-slate-900 font-bold text-xs">{entry.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
