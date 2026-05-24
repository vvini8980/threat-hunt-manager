import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useHypotheses } from '../hooks/useHypotheses';
import { getMonthlyStats, updateHypothesis, addComment } from '../services/storage';
import { exportToExcel } from '../utils/excel';
import QuickImport from '../components/Common/QuickImport';
import HypoDetail from '../components/Hypotheses/HypoDetail';
import { 
  ChevronLeft, ChevronRight, Calendar, 
  Target, CheckCircle, Activity, 
  ShieldCheck, AlertTriangle,
  FileSpreadsheet, Edit, Check, X
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useToastContext } from '../context/ToastContext';
import { ResultCell } from '../components/Common/StatusBadge';

const getStatusColor = (status) => {
  switch (status) {
    case 'Active': return 'bg-blue-500';
    case 'Planned': return 'bg-yellow-500';
    case 'Completed': return 'bg-green-500';
    case 'Closed': return 'bg-gray-500';
    case 'Pending': return 'bg-purple-500';
    case 'Shared': return 'bg-teal-500';
    case 'ETA': return 'bg-orange-500';
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
    Shared: 'bg-teal-500/20 text-teal-400 border-teal-500/30',
    ETA: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  };
  const cls = colors[status] || colors.Closed;
  return <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${cls}`}>{status}</span>;
};

const getDropdownStyle = (status) => {
  switch (status) {
    case 'Completed':
      return 'bg-green-500/10 text-green-400 border-green-500/30 hover:bg-green-500/20';
    case 'Shared':
      return 'bg-teal-500/10 text-teal-400 border-teal-500/30 hover:bg-teal-500/20';
    case 'ETA':
      return 'bg-orange-500/10 text-orange-400 border-orange-500/30 hover:bg-orange-500/20';
    case 'Pending':
      return 'bg-purple-500/10 text-purple-400 border-purple-500/30 hover:bg-purple-500/20';
    case 'Active':
      return 'bg-blue-500/10 text-blue-400 border-blue-500/30 hover:bg-blue-500/20';
    case 'Planned':
      return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30 hover:bg-yellow-500/20';
    default:
      return 'bg-gray-500/10 text-gray-400 border-gray-500/30 hover:bg-gray-500/20';
  }
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
  const { hypotheses, assignments, refresh, updateAssignment } = useHypotheses();
  const { showToast } = useToastContext();
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [monthsData, setMonthsData] = useState([]);
  
  // Inline edit state removed - direct dropdown & date picker are used instead

  // Side panel state
  const [selectedHypo, setSelectedHypo] = useState(null);

  // Month status state (Drafted vs Production)
  const [monthStatus, setMonthStatus] = useState('Drafted');

  useEffect(() => {
    setMonthStatus(localStorage.getItem(`campaign_status_${selectedMonth}`) || 'Drafted');
  }, [selectedMonth]);

  const toggleMonthStatus = (newStatus) => {
    setMonthStatus(newStatus);
    localStorage.setItem(`campaign_status_${selectedMonth}`, newStatus);
    showToast(`Campaign set to ${newStatus}`, 'success');
  };

  useEffect(() => {
    const data = getMonthlyStats(assignments);
    setMonthsData(data);
  }, [assignments]);

  useEffect(() => {
    if (selectedHypo) {
      const updated = assignments.find(a => a.id === selectedHypo.id);
      if (updated) setSelectedHypo(updated);
    }
  }, [assignments, selectedHypo]);

  const currentMonthKey = new Date().toISOString().slice(0, 7);
  const isCurrentMonth = selectedMonth === currentMonthKey;

  const editCampaignHref = (row) => {
    const hypoId = row.hypothesis_id || row.id;
    return `/edit/${hypoId}?month=${selectedMonth}&from=campaigns`;
  };



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

  const handleDateChange = async (id, newDate) => {
    try {
      await updateHypothesis(id, { planned: newDate });
      refresh();
      showToast('Date updated successfully', 'success');
    } catch (error) {
      showToast('Failed to update date', 'error');
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      await updateAssignment(id, { status: newStatus });
      refresh();
      showToast('Status updated', 'success');
    } catch (error) {
      showToast('Failed to update status', 'error');
    }
  };

  const handleAddComment = async (id, text, analyst) => {
    try {
      const target = assignments.find(a => a.id === id);
      const hypoId = target?.hypothesis_id || id;
      await addComment(hypoId, text, analyst);
      refresh();
    } catch (error) {
      showToast('Failed to add comment', 'error');
    }
  };

  // Derive stats based on selectedMonth filtering
  const monthHypotheses = assignments.filter(h => h.month === selectedMonth);

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
      
      {/* Header & Month Selector */}
      <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-[#2a2d3e] pb-6">
        <div>
          <h2 className="text-3xl font-bold text-white mb-2">Monthly Campaigns</h2>
          <p className="text-sm text-gray-400 mb-4 max-w-xl">
            Current month hunting plan — lead uploads assignments here. The Hypothesis Library holds all hunt definitions.
          </p>
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 flex-wrap">
            {!isCurrentMonth && (
              <button
                type="button"
                onClick={() => setSelectedMonth(currentMonthKey)}
                className="px-3 py-2 text-xs font-semibold rounded-lg border border-indigo-500/50 text-indigo-300 hover:bg-indigo-500/10"
              >
                Jump to current month
              </button>
            )}
            {isCurrentMonth && (
              <span className="px-3 py-1 text-xs font-bold rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                Viewing current month
              </span>
            )}
            <div className="flex items-center gap-4 bg-[#1a1d27] border border-[#2a2d3e] rounded-xl p-2 shadow-lg">
              <button 
                onClick={handlePrevious}
                disabled={!hasPrevious}
                className={`p-2 rounded-lg transition-colors ${!hasPrevious ? 'text-gray-600 cursor-not-allowed' : 'text-gray-300 hover:text-white hover:bg-[#252840]'}`}
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
                className={`p-2 rounded-lg transition-colors ${!hasNext ? 'text-gray-600 cursor-not-allowed' : 'text-gray-300 hover:text-white hover:bg-[#252840]'}`}
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            {/* Drafted / Production Toggle */}
            <div className="flex items-center rounded-lg bg-[#1a1d27] p-1 border border-[#2a2d3e] shadow-sm">
              <button
                onClick={() => toggleMonthStatus('Drafted')}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-bold transition-colors ${monthStatus === 'Drafted' ? 'bg-amber-500/20 text-amber-500 border border-amber-500/30' : 'text-gray-500 hover:text-white'}`}
              >
                <AlertTriangle className="w-4 h-4" /> Drafted
              </button>
              <button
                onClick={() => toggleMonthStatus('Production')}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-bold transition-colors ${monthStatus === 'Production' ? 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/30' : 'text-gray-500 hover:text-white'}`}
              >
                <CheckCircle className="w-4 h-4" /> Production
              </button>
            </div>
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
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(`/add?type=general&month=${selectedMonth}&from=campaigns`)}
              className="hidden sm:flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition-colors shadow-lg"
            >
              + Add Item
            </button>
            <span className="px-3 py-1 bg-indigo-500/20 text-indigo-300 text-xs font-bold rounded-full border border-indigo-500/30">
              {generalHunts.length} Items
            </span>
          </div>
        </div>
        {generalHunts.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-[#0f1117] text-xs uppercase tracking-wide text-gray-400 border-b border-[#2a2d3e]">
                <tr>
                  <th className="px-4 py-3 font-semibold">Hypothesis Name</th>
                  <th className="px-4 py-3 font-semibold">MITRE Name</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2a2d3e]">
                {generalHunts.map((hypo, index) => (
                  <tr 
                    key={hypo.id}
                    onClick={() => setSelectedHypo(hypo)}
                    className={`transition-colors hover:bg-[#252840] cursor-pointer ${index % 2 === 0 ? 'bg-[#1a1d27]' : 'bg-[#1e2130]/45'}`}
                  >
                    <td className="px-4 py-3 text-white font-medium">
                      {hypo.hypoName}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 rounded text-xs font-mono">
                        {hypo.mitreId || '--'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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

      {/* Full monthly assignment roster */}
      <div className="mb-10">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              📊 {formatMonth(selectedMonth)} — Hunt Assignments
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              All hunts scheduled this month (general + individual). Use Lead Import to bulk upload.
            </p>
          </div>
          <span className="px-3 py-1 bg-[#252840] text-gray-300 text-xs font-bold rounded-full border border-[#2a2d3e]">
            {monthHypotheses.length} total
          </span>
        </div>

        {monthHypotheses.length > 0 ? (
          <div className="overflow-hidden rounded-xl border border-[#2a2d3e] bg-[#1a1d27] shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-[#0f1117] text-xs uppercase tracking-wide text-gray-400 border-b border-[#2a2d3e]">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Hypothesis</th>
                    <th className="px-4 py-3 font-semibold">MITRE</th>
                    <th className="px-4 py-3 font-semibold">Type</th>
                    <th className="px-4 py-3 font-semibold">Client</th>
                    <th className="px-4 py-3 font-semibold">Analyst</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Result</th>
                    <th className="px-4 py-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2a2d3e]">
                  {monthHypotheses.map((row, index) => (
                    <tr
                      key={row.id}
                      className={`transition-colors hover:bg-[#252840] ${index % 2 === 0 ? 'bg-[#1a1d27]' : 'bg-[#1e2130]/45'}`}
                    >
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => setSelectedHypo(row)}
                          className="text-left font-medium text-white hover:text-indigo-300 max-w-[220px] truncate block"
                          title={row.hypoName}
                        >
                          {row.hypoName || 'Untitled'}
                        </button>
                      </td>
                      <td className="px-4 py-3 font-mono text-indigo-400 text-xs">{row.mitreId || '--'}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${row.isGeneral ? 'border-indigo-500/40 text-indigo-300 bg-indigo-500/10' : 'border-teal-500/40 text-teal-300 bg-teal-500/10'}`}>
                          {row.isGeneral ? 'General' : 'Individual'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-300">{row.clientName || '—'}</td>
                      <td className="px-4 py-3 text-indigo-300">{row.assignedAnalyst || '—'}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={row.status || 'Pending'} />
                      </td>
                      <td className="px-4 py-3">
                        <ResultCell result={row.result} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => navigate(editCampaignHref(row))}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg border border-indigo-500/40 text-indigo-300 hover:bg-indigo-500/10"
                        >
                          <Edit className="w-3.5 h-3.5" /> Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-[#2a2d3e] bg-[#1a1d27]/50 p-10 text-center">
            <p className="text-gray-500 text-sm">No hunts for {formatMonth(selectedMonth)} yet.</p>
            <p className="text-gray-600 text-xs mt-2">Use Lead Import above to upload this month&apos;s plan.</p>
          </div>
        )}
      </div>

      {/* Individual Hunts Table */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">👤 Individual Assignments</h3>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                exportToExcel(individualHunts, `Individual_Assignments_${formatMonth(selectedMonth).replace(/\s+/g, '')}`);
                showToast("Individual assignments exported to Excel", "success");
              }}
              disabled={individualHunts.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-green-500/50 text-green-400 hover:bg-green-500/10 text-xs font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Export Table</span>
            </button>
            <button
              onClick={() => navigate(`/add?type=individual&month=${selectedMonth}&from=campaigns`)}
              className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition-colors shadow-lg"
            >
              + Add Assignment
            </button>
          </div>
        </div>
        {individualHunts.length > 0 ? (
          <div className="overflow-hidden rounded-xl border border-[#2a2d3e] bg-[#1a1d27] shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-[#0f1117] text-xs uppercase tracking-wide text-gray-400 border-b border-[#2a2d3e]">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Hypothesis</th>
                    <th className="px-4 py-3 font-semibold">MITRE</th>
                    <th className="px-4 py-3 font-semibold">Client</th>
                    <th className="px-4 py-3 font-semibold">Analyst</th>
                    <th className="px-4 py-3 font-semibold">Status / Date</th>
                    <th className="px-4 py-3 font-semibold text-right">Edit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2a2d3e]">
                  {individualHunts.map((hypo, index) => (
                    <tr 
                      key={hypo.id}
                      className={`transition-colors ${index % 2 === 0 ? 'bg-[#1a1d27]' : 'bg-[#1e2130]/45'}`}
                    >
                      <td className="px-4 py-3 text-white font-medium max-w-[200px] truncate" title={hypo.hypoName}>
                        {hypo.hypoName || '--'}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-indigo-400">{hypo.mitreId || '--'}</td>
                      <td className="px-4 py-3 text-gray-300 font-bold">
                        {hypo.clientName ? (
                          <span className="flex items-center gap-2">🏢 {hypo.clientName}</span>
                        ) : '--'}
                      </td>
                      <td className="px-4 py-3 text-indigo-300 font-medium">
                        {hypo.assignedAnalyst || 'Unassigned'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 max-w-xs">
                          <div className="relative flex items-center">
                            <select
                              value={hypo.status || 'Pending'}
                              onChange={(e) => handleStatusChange(hypo.id, e.target.value)}
                              className={`appearance-none font-semibold text-xs rounded-full border pl-3 pr-6 py-1 outline-none cursor-pointer transition-colors ${getDropdownStyle(hypo.status)}`}
                            >
                              <option value="Pending" className="bg-[#1a1d27] text-purple-400 font-semibold">Pending</option>
                              <option value="Completed" className="bg-[#1a1d27] text-green-400 font-semibold">Completed</option>
                              <option value="Shared" className="bg-[#1a1d27] text-teal-400 font-semibold">Shared</option>
                              <option value="ETA" className="bg-[#1a1d27] text-orange-400 font-semibold">ETA</option>
                              <option value="Planned" className="bg-[#1a1d27] text-yellow-400 font-semibold">Planned</option>
                              <option value="Active" className="bg-[#1a1d27] text-blue-400 font-semibold">Active</option>
                              <option value="Closed" className="bg-[#1a1d27] text-gray-400 font-semibold">Closed</option>
                            </select>
                            <div className="pointer-events-none absolute right-2 flex items-center">
                              <svg className="h-3 w-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7"></path></svg>
                            </div>
                          </div>
                          {hypo.status === 'ETA' && (
                            <input
                              type="date"
                              value={hypo.planned ? hypo.planned.slice(0, 10) : ''}
                              onChange={(e) => handleDateChange(hypo.id, e.target.value)}
                              className="bg-[#1e1a17] border border-orange-500/30 hover:border-orange-500/60 rounded-lg px-2.5 py-1 text-xs text-orange-300 font-semibold outline-none focus:border-orange-500 transition-colors w-[135px]"
                              title="ETA Date for client report"
                            />
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => navigate(editCampaignHref(hypo))}
                          className="p-2 rounded-md text-gray-400 hover:text-indigo-300 hover:bg-indigo-500/10"
                          title="Edit full details"
                        >
                          <Edit className="w-4 h-4" />
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

      <HypoDetail
        hypothesis={selectedHypo}
        onClose={() => setSelectedHypo(null)}
        onEdit={() => selectedHypo && navigate(editCampaignHref(selectedHypo))}
        currentStatus={selectedHypo?.status}
        onStatusChange={handleStatusChange}
        comments={selectedHypo?.comments}
        onAddComment={handleAddComment}
      />

    </section>
  );
}

export default Campaigns;
