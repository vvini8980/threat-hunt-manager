import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useHypotheses } from '../hooks/useHypotheses';
import { getMonthlyStats } from '../services/storage';
import { exportToExcel } from '../utils/excel';
import QuickImport from '../components/Common/QuickImport';
import { 
  ChevronLeft, ChevronRight, Calendar, 
  Target, CheckCircle, Activity, 
  ShieldCheck, AlertTriangle,
  FileSpreadsheet
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useToastContext } from '../context/ToastContext';
const getStatusColor = (status) => {
  switch (status) {
    case 'Active': return 'bg-blue-500';
    case 'Planned': return 'bg-yellow-500';
    case 'Completed': return 'bg-green-500';
    case 'Closed': return 'bg-gray-500';
    case 'Pending': return 'bg-purple-500';
    default: return 'bg-gray-500';
  }
};

const StatusBadge = ({ status }) => {
  const colors = {
    Active: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    Planned: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    Completed: 'bg-green-500/20 text-green-400 border-green-500/30',
    Closed: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    Pending: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  };
  const cls = colors[status] || colors.Closed;
  return <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${cls}`}>{status}</span>;
};

const ResultBadge = ({ result }) => {
  if (!result || result === 'Undetermined') return null;
  const isTP = result === 'TP';
  return (
    <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${isTP ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-red-500/20 text-red-400 border-red-500/30'}`}>
      {result}
    </span>
  );
};

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-[#1a1d27] border border-[#2a2d3e] p-3 rounded-lg shadow-xl">
        <p className="font-bold text-white mb-2">{data.fullName}</p>
        <p className="text-sm text-gray-300">Total: <span className="font-bold text-white">{data.total}</span></p>
        <p className="text-sm text-green-400">TP: <span className="font-bold">{data.tp}</span></p>
        <p className="text-sm text-red-400">FP: <span className="font-bold">{data.fp}</span></p>
        {data.tested > 0 && (
          <p className="text-xs text-gray-500 mt-2">TP Rate: {data.tpRate}%</p>
        )}
      </div>
    );
  }
  return null;
};

function Campaigns() {
  const navigate = useNavigate();
  const { hypotheses, refresh } = useHypotheses();
  const { showToast } = useToastContext();
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [monthsData, setMonthsData] = useState([]);

  useEffect(() => {
    const data = getMonthlyStats(hypotheses);
    setMonthsData(data);
  }, [hypotheses]);



  const allMonths = Array.from(
    new Set([...monthsData.map(d => d.month), selectedMonth].filter(Boolean))
  ).sort();
  
  const currentIndex = allMonths.indexOf(selectedMonth);
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex < allMonths.length - 1;

  const handlePrevious = () => {
    if (hasPrevious) setSelectedMonth(allMonths[currentIndex - 1]);
  };

  const handleNext = () => {
    if (hasNext) setSelectedMonth(allMonths[currentIndex + 1]);
  };

  const formatMonth = (monthValue) => {
    if (!monthValue) return 'Unknown Month';
    try {
      const parts = monthValue.split('-');
      if (parts.length === 2) {
        const year = Number(parts[0]);
        const monthIndex = Number(parts[1]);
        if (!isNaN(year) && !isNaN(monthIndex)) {
          const date = new Date(year, monthIndex - 1, 1);
          return new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(date);
        }
      }
      return monthValue;
    } catch (e) {
      return monthValue;
    }
  };

  const currentStats = monthsData.find(d => d.month === selectedMonth);
  const totalHypotheses = currentStats ? currentStats.total : 0;

  // Derive stats based on selectedMonth filtering
  const monthHypotheses = hypotheses.filter(h => h.month === selectedMonth);

  // Split into general pool vs individual assignments
  const generalHunts = monthHypotheses.filter(h => h.isGeneral);
  const individualHunts = monthHypotheses.filter(h => !h.isGeneral);

  // Group individual hunts by analyst
  const byAnalyst = individualHunts.reduce((acc, h) => {
    const key = h.assignedAnalyst || 'Unassigned';
    if (!acc[key]) acc[key] = [];
    acc[key].push(h);
    return acc;
  }, {});

  // Group by client
  const byClient = monthHypotheses.reduce((acc, h) => {
    const key = h.clientName || 'No Client';
    if (!acc[key]) acc[key] = [];
    acc[key].push(h);
    return acc;
  }, {});

  const stats = {
    total: monthHypotheses.length,
    completed: monthHypotheses.filter(h => h.status === 'Completed' || h.status === 'Closed').length,
    active: monthHypotheses.filter(h => h.status === 'Active').length,
    planned: monthHypotheses.filter(h => h.status === 'Planned').length,
    tp: monthHypotheses.filter(h => h.result === 'TP').length,
    fp: monthHypotheses.filter(h => h.result === 'FP').length,
  };

  const tpRate = (stats.tp + stats.fp) > 0 ? Math.round((stats.tp / (stats.tp + stats.fp)) * 100) : 0;
  const completionRate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

  const statCardClass = "flex flex-col gap-2 rounded-xl border border-[#2a2d3e] bg-[#1a1d27] p-5 shadow-lg";

  // Chart Data Preparation
  const chartData = monthsData.filter(d => d.month).map(d => {
    const tested = d.tp + d.fp;
    const monthTpRate = tested > 0 ? Math.round((d.tp / tested) * 100) : 0;
    
    let color = '#6366f1'; // indigo-500
    if (tested > 0) {
      if (monthTpRate > 60) color = '#22c55e'; // green-500
      else if (monthTpRate >= 30) color = '#eab308'; // yellow-500
      else color = '#ef4444'; // red-500
    }

    let monthName = '';
    let yearShort = '';
    try {
      const [year, month] = d.month.split('-');
      const date = new Date(year, parseInt(month) - 1);
      if (!isNaN(date.getTime())) {
        monthName = date.toLocaleString('default', { month: 'short' });
        yearShort = year.substring(2);
      } else {
        monthName = d.month;
      }
    } catch (e) {
      monthName = d.month;
    }

    return {
      ...d,
      tpRate: monthTpRate,
      tested,
      color,
      label: yearShort ? `${monthName} '${yearShort}` : monthName,
      fullName: formatMonth(d.month)
    };
  });

  return (
    <section className="min-h-full bg-bg-primary p-6 text-white max-w-6xl mx-auto pb-24">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row items-center justify-between mb-10 gap-6">
        
        {/* Left Side: Title & Selectors */}
        <div className="flex flex-col items-center md:items-start">
          <h2 className="text-3xl font-bold mb-4 flex items-center gap-2">
            📅 Monthly
          </h2>
          
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-4">
            {/* Month Selector */}
            <div className="flex items-center gap-4 bg-[#1a1d27] border border-[#2a2d3e] rounded-full p-2 shadow-lg">
              <button 
                onClick={handlePrevious}
                disabled={!hasPrevious}
                className={`p-2 rounded-full transition-colors ${!hasPrevious ? 'text-gray-600 cursor-not-allowed' : 'text-gray-300 hover:text-white hover:bg-[#2a2d3e]'}`}
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              
              <div className="relative flex items-center group">
                <Calendar className="w-4 h-4 text-indigo-400 absolute left-3 pointer-events-none" />
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="appearance-none bg-transparent text-white font-bold text-lg py-1 pl-10 pr-6 outline-none cursor-pointer hover:text-indigo-300 transition-colors"
                >
                  {allMonths.map(m => (
                    <option key={m} value={m} className="bg-[#1a1d27] text-white">
                      {formatMonth(m)}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-1">
                  <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>
              </div>

              <button 
                onClick={handleNext}
                disabled={!hasNext}
                className={`p-2 rounded-full transition-colors ${!hasNext ? 'text-gray-600 cursor-not-allowed' : 'text-gray-300 hover:text-white hover:bg-[#2a2d3e]'}`}
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
            
            <p className="text-sm font-medium text-gray-400 bg-[#1a1d27] px-4 py-1.5 rounded-full border border-[#2a2d3e]">
              {totalHypotheses} {totalHypotheses === 1 ? 'hypothesis' : 'hypotheses'} this month
            </p>
          </div>
        </div>

        {/* Right Side: Import + Export Buttons */}
        <div className="flex flex-wrap items-center gap-3 self-center md:self-end md:mb-2">
          <QuickImport
            mode="lead"
            defaultMonth={selectedMonth}
            onDone={refresh}
          />
          <div className="w-px h-6 bg-[#2a2d3e]" />
          <button
            onClick={() => {
              exportToExcel(monthHypotheses, `MonthlyHunts_${formatMonth(selectedMonth).replace(/\s+/g, '')}`);
              showToast("Excel file downloaded", "info");
            }}
            disabled={monthHypotheses.length === 0}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-green-500/50 text-green-400 hover:bg-green-500/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm shadow-lg"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export Excel</span>
          </button>
        </div>
      </div>

      {/* Stat Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        <div className={statCardClass}>
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-xs font-bold uppercase tracking-wider">Total</span>
            <Target className="h-4 w-4 text-indigo-400" />
          </div>
          <span className="text-3xl font-bold text-indigo-400">{stats.total}</span>
        </div>
        
        <div className={statCardClass}>
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-xs font-bold uppercase tracking-wider">Completed</span>
            <CheckCircle className="h-4 w-4 text-green-400" />
          </div>
          <span className="text-3xl font-bold text-green-400">{stats.completed}</span>
        </div>

        <div className={statCardClass}>
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-xs font-bold uppercase tracking-wider">Active</span>
            <Activity className="h-4 w-4 text-blue-400" />
          </div>
          <span className="text-3xl font-bold text-blue-400">{stats.active}</span>
        </div>

        <div className={statCardClass}>
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-xs font-bold uppercase tracking-wider">Planned</span>
            <Calendar className="h-4 w-4 text-yellow-400" />
          </div>
          <span className="text-3xl font-bold text-yellow-400">{stats.planned}</span>
        </div>

        <div className={statCardClass}>
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-xs font-bold uppercase tracking-wider text-green-500">TP</span>
            <ShieldCheck className="h-4 w-4 text-green-500" />
          </div>
          <span className="text-3xl font-bold text-green-500">{stats.tp}</span>
        </div>

        <div className={statCardClass}>
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-xs font-bold uppercase tracking-wider text-red-400">FP</span>
            <AlertTriangle className="h-4 w-4 text-red-400" />
          </div>
          <span className="text-3xl font-bold text-red-400">{stats.fp}</span>
        </div>
      </div>

      {/* Progress Bars */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
        {/* Completion Rate */}
        <div className="rounded-xl border border-[#2a2d3e] bg-[#1a1d27] p-5 shadow-lg">
          <div className="mb-2 flex items-center justify-between text-sm font-medium">
            <span className="text-white">Completion Rate: {stats.completed} of {stats.total} hypotheses complete</span>
            <span className="text-indigo-400 font-bold">{completionRate}%</span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-[#2a2d3e]">
            <div 
              className="h-full rounded-full bg-indigo-500 transition-all duration-700" 
              style={{ width: `${completionRate}%` }}
            />
          </div>
        </div>

        {/* TP Rate */}
        <div className="rounded-xl border border-[#2a2d3e] bg-[#1a1d27] p-5 shadow-lg">
          <div className="mb-2 flex items-center justify-between text-sm font-medium">
            <span className="text-white">TP Rate: {stats.tp} TP / {stats.tp + stats.fp} Tested</span>
            <span className="text-green-500 font-bold">{tpRate}% true positive rate</span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-[#2a2d3e]">
            <div 
              className="h-full rounded-full bg-green-500 transition-all duration-700" 
              style={{ width: `${tpRate}%` }}
            />
          </div>
        </div>
      </div>

      {/* General Pool */}
      <div className="rounded-xl border border-indigo-500/40 bg-indigo-500/5 overflow-hidden shadow-xl mb-8">
        <div className="p-5 border-b border-indigo-500/30 flex items-center justify-between bg-indigo-500/10">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              📋 General Pool — Mandatory Hunts
            </h3>
            <p className="text-xs text-indigo-300 mt-0.5">All analysts must complete these hunts this month</p>
          </div>
          <span className="px-3 py-1 bg-indigo-500/20 text-indigo-300 text-xs font-bold rounded-full border border-indigo-500/30">
            {generalHunts.length} Items
          </span>
        </div>
        {generalHunts.length > 0 ? (
          <div className="flex flex-col divide-y divide-indigo-500/20">
            {generalHunts.map((hypo) => (
              <div
                key={hypo.id}
                onClick={() => navigate(`/hypotheses?selected=${hypo.id}`)}
                className="flex flex-col md:flex-row md:items-center justify-between p-4 hover:bg-indigo-500/10 transition-colors cursor-pointer group gap-4"
              >
                <div className="flex items-center gap-4 flex-1">
                  <div className={`w-3 h-3 rounded-full flex-shrink-0 ${getStatusColor(hypo.status)}`} />
                  <div>
                    <h4 className="text-white font-bold mb-1 group-hover:text-indigo-300 transition-colors">
                      {hypo.hypoName}
                    </h4>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 rounded text-xs font-mono">
                        {hypo.mitreId}
                      </span>
                      {hypo.tactic && <span className="text-xs text-gray-500">{hypo.tactic}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 pl-7 md:pl-0">
                  <StatusBadge status={hypo.status} />
                  <ResultBadge result={hypo.result} />
                  <ChevronRight className="w-5 h-5 text-gray-500 group-hover:text-white transition-colors hidden md:block" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center">
            <p className="text-gray-500 text-sm">No general pool hunts for this month.</p>
            <button
              onClick={() => navigate('/add')}
              className="mt-3 text-indigo-400 text-sm hover:text-indigo-300 transition-colors"
            >
              + Add a General Hunt
            </button>
          </div>
        )}
      </div>

      {/* Individual Hunts Table */}
      <div className="mb-8">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">👤 Individual Assignments</h3>
        {individualHunts.length > 0 ? (
          <div className="overflow-hidden rounded-xl border border-[#2a2d3e] bg-[#1a1d27] shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-[#0f1117] text-xs uppercase tracking-wide text-gray-400 border-b border-[#2a2d3e]">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Planned Date/Month</th>
                    <th className="px-4 py-3 font-semibold">Client Name</th>
                    <th className="px-4 py-3 font-semibold">Assigned Analyst</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Hypothesis Name</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2a2d3e]">
                  {individualHunts.map((hypo, index) => (
                    <tr 
                      key={hypo.id} 
                      className={`transition-colors hover:bg-[#252840] ${index % 2 === 0 ? 'bg-[#1a1d27]' : 'bg-[#1e2130]/45'}`}
                    >
                      <td className="px-4 py-3 text-gray-400">
                        {hypo.month || '--'}
                      </td>
                      <td className="px-4 py-3 text-gray-300">
                        {hypo.clientName ? (
                          <span className="flex items-center gap-1">🏢 {hypo.clientName}</span>
                        ) : '--'}
                      </td>
                      <td className="px-4 py-3 text-indigo-300 font-medium">
                        {hypo.assignedAnalyst || 'Unassigned'}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={hypo.status} />
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => navigate(`/hypotheses?selected=${hypo.id}`)}
                          className="font-bold text-white hover:text-indigo-400 transition-colors text-left"
                        >
                          {hypo.hypoName || 'Untitled Hypothesis'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-[#2a2d3e] bg-[#1a1d27] p-8 text-center shadow-xl">
            <p className="text-gray-500 text-sm">No individual assignments for this month.</p>
            <button
              onClick={() => navigate('/add')}
              className="mt-3 text-indigo-400 text-sm hover:text-indigo-300 transition-colors"
            >
              + Assign a Hunt
            </button>
          </div>
        )}
      </div>

      {/* Campaign Timeline Chart */}
      {chartData.length > 0 && (
        <div className="rounded-xl border border-[#2a2d3e] bg-[#1a1d27] p-6 shadow-xl mt-8">
          <h3 className="text-xl font-bold text-white mb-6">Campaign Timeline</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis 
                  dataKey="label" 
                  tick={{ fill: '#9ca3af', fontSize: 12 }} 
                  axisLine={{ stroke: '#2a2d3e' }}
                  tickLine={false}
                />
                <YAxis 
                  tick={{ fill: '#9ca3af', fontSize: 12 }} 
                  axisLine={{ stroke: '#2a2d3e' }}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#252840' }} />
                <Bar 
                  dataKey="total" 
                  radius={[4, 4, 0, 0]} 
                  onClick={(data) => {
                    if (data && data.month) setSelectedMonth(data.month);
                  }}
                >
                  {chartData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.color} 
                      className="cursor-pointer transition-all duration-300 hover:brightness-125"
                      opacity={entry.month === selectedMonth ? 1 : 0.4}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

    </section>
  );
}

export default Campaigns;
