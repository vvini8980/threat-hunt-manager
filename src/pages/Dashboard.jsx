import { useState, useEffect } from 'react'
import { Activity, AlertTriangle, Calendar, CheckCircle, List, Shield, ArrowRight, Users, Building, Clock, Share2 } from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import StatCard from '../components/Dashboard/StatCard'
import { getMonthlyStats } from '../services/storage'
import { useHypotheses } from '../hooks/useHypotheses'
import { useNavigate } from 'react-router-dom'
import Spinner from '../components/Common/Spinner'

const RESULT_COLORS = {
  TP: '#10b981',
  FP: '#e11d48',
  Undetermined: '#f59e0b',
}

// Tactic → semantic color map (bar fill + badge)
const TACTIC_COLORS = {
  'C2': { bar: '#e11d48', badge: 'bg-rose-500/20 text-rose-400' },
  'Command and Control': { bar: '#e11d48', badge: 'bg-rose-500/20 text-rose-400' },
  'Defense Evasion': { bar: '#f59e0b', badge: 'bg-amber-500/20 text-amber-400' },
  'Initial Access': { bar: '#8b5cf6', badge: 'bg-violet-500/20 text-violet-400' },
  'Execution': { bar: '#6366f1', badge: 'bg-indigo-500/20 text-indigo-400' },
  'Persistence': { bar: '#06b6d4', badge: 'bg-cyan-500/20 text-cyan-400' },
  'Privilege Escalation': { bar: '#f97316', badge: 'bg-orange-500/20 text-orange-400' },
  'Credential Access': { bar: '#ec4899', badge: 'bg-pink-500/20 text-pink-400' },
  'Discovery': { bar: '#3b82f6', badge: 'bg-blue-500/20 text-blue-400' },
  'Lateral Movement': { bar: '#14b8a6', badge: 'bg-teal-500/20 text-teal-400' },
  'Collection': { bar: '#84cc16', badge: 'bg-lime-500/20 text-lime-400' },
  'Exfiltration': { bar: '#fb923c', badge: 'bg-orange-500/20 text-orange-400' },
  'Impact': { bar: '#dc2626', badge: 'bg-red-500/20 text-red-400' },
  'Reconnaissance': { bar: '#a855f7', badge: 'bg-purple-500/20 text-purple-400' },
}

const DEFAULT_TACTIC = { bar: '#6366f1', badge: 'bg-indigo-500/20 text-indigo-400' }

function getTacticColor(tactic) {
  if (!tactic) return DEFAULT_TACTIC
  // exact match
  if (TACTIC_COLORS[tactic]) return TACTIC_COLORS[tactic]
  // substring match
  const key = Object.keys(TACTIC_COLORS).find(k => tactic.toLowerCase().includes(k.toLowerCase()))
  return key ? TACTIC_COLORS[key] : DEFAULT_TACTIC
}

const renderLabel = ({ percent }) => {
  if (!percent) return ''
  return `${Math.round(percent * 100)}%`
}

function DarkTooltip({ active, payload }) {
  if (!active || !payload?.length) return null

  const item = payload[0]

  return (
    <div className="rounded-lg border border-[#2a2d3e] bg-[#0f1117] px-3 py-2 shadow-xl">
      <p className="text-sm font-semibold text-white">{item.name}</p>
      <p className="text-xs text-gray-400">Count: {item.value}</p>
    </div>
  )
}

const formatMonthLabel = (month) => {
  if (!month) return ''

  try {
    const parts = month.split('-')
    if (parts.length !== 2) return month

    const year = Number(parts[0])
    const monthIndex = Number(parts[1])
    
    if (isNaN(year) || isNaN(monthIndex)) return month

    const date = new Date(year, monthIndex - 1, 1)

    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      year: '2-digit',
    }).format(date)
  } catch (error) {
    console.error('Error formatting month:', month, error)
    return month
  }
}

function timeAgo(dateString) {
  if (!dateString) return 'Just now'
  const date = new Date(dateString)
  const now = new Date()
  const seconds = Math.floor((now - date) / 1000)
  
  let interval = seconds / 31536000
  if (interval > 1) return Math.floor(interval) + " years ago"
  interval = seconds / 2592000
  if (interval > 1) return Math.floor(interval) + " months ago"
  interval = seconds / 86400
  if (interval > 1) return Math.floor(interval) + " days ago"
  interval = seconds / 3600
  if (interval > 1) return Math.floor(interval) + " hours ago"
  interval = seconds / 60
  if (interval > 1) return Math.floor(interval) + " minutes ago"
  return Math.floor(seconds) + " seconds ago"
}

const STATUS_COLORS = {
  Active: 'bg-blue-500',
  Planned: 'bg-yellow-500',
  Completed: 'bg-green-500',
}

function Dashboard() {
  const navigate = useNavigate()
  const { hypotheses, assignments, stats, loading } = useHypotheses()
  
  const [monthlyData, setMonthlyData] = useState([])
  const [tacticData, setTacticData] = useState([])
  const [maxTacticCount, setMaxTacticCount] = useState(0)
  const [analystWorkload, setAnalystWorkload] = useState([])
  const [resultData, setResultData] = useState([])
  const [hasResults, setHasResults] = useState(false)

  useEffect(() => {
    if (loading) return;

    const rawMonthly = getMonthlyStats(hypotheses).map(item => ({
      ...item,
      label: formatMonthLabel(item.month),
    }))
    setMonthlyData(rawMonthly)

    const tacticCounts = hypotheses.reduce((acc, hyp) => {
      if (hyp.tactic) {
        acc[hyp.tactic] = (acc[hyp.tactic] || 0) + 1
      }
      return acc
    }, {})
    
    const tData = Object.entries(tacticCounts)
      .map(([tactic, count]) => ({ tactic, count }))
      .sort((a, b) => b.count - a.count)
    setTacticData(tData)
    setMaxTacticCount(tData.length > 0 ? Math.max(...tData.map(d => d.count)) : 0)

    const workload = assignments.reduce((acc, a) => {
      const analyst = a.assignedAnalyst || 'Unassigned';
      if (!acc[analyst]) acc[analyst] = { Planned: 0, Active: 0, Completed: 0, Total: 0 };
      
      if (a.status === 'Completed' || a.status === 'Closed') {
        acc[analyst].Completed += 1;
      } else if (a.status === 'Active') {
        acc[analyst].Active += 1;
      } else {
        acc[analyst].Planned += 1;
      }
      acc[analyst].Total += 1;
      return acc;
    }, {});

    const workloadArray = Object.entries(workload)
      .map(([name, counts]) => ({ name, ...counts }))
      .sort((a, b) => b.Total - a.Total)
      .slice(0, 6);
    
    setAnalystWorkload(workloadArray);

    const rData = [
      { name: 'TP', value: stats.tp || 0 },
      { name: 'FP', value: stats.fp || 0 },
      { name: 'Undetermined', value: stats.undetermined || 0 },
    ]
    setResultData(rData)
    setHasResults(rData.some(item => item.value > 0))
  }, [hypotheses, stats, loading])

  if (loading && hypotheses.length === 0) {
    return <Spinner size="lg" text="Calculating dashboard statistics..." />
  }

  const currentDate = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(new Date())

  const currentMonth = new Date().toISOString().slice(0, 7);
  const monthHypoCount = hypotheses.filter(h => {
    if (!h.month) return false;
    const parts = h.month.split('-');
    if (parts.length >= 2) return `${parts[0]}-${parts[1].padStart(2, '0')}` === currentMonth;
    return false;
  }).length;

  const cards = [
    {
      title: 'Total Hypotheses',
      value: hypotheses.length,
      icon: List,
      color: 'indigo',
    },
    {
      title: 'Month Hypotheses',
      value: monthHypoCount,
      icon: Calendar,
      color: 'blue',
    },
    {
      title: 'Total Clients',
      value: new Set(assignments.map(a => a.clientName).filter(Boolean)).size,
      icon: Building,
      color: 'teal',
    },
    {
      title: 'Total Analysts',
      value: new Set(assignments.map(a => a.assignedAnalyst).filter(Boolean)).size,
      icon: Users,
      color: 'purple',
    },
    {
      title: 'Pending',
      value: assignments.filter(a => a.status === 'Pending').length,
      icon: Clock,
      color: 'yellow',
    },
    {
      title: 'Shared',
      value: assignments.filter(a => a.status === 'Shared').length,
      icon: Share2,
      color: 'blue',
    },
    {
      title: 'Completed',
      value: assignments.filter(a => a.status === 'Completed' || a.status === 'Closed').length,
      icon: CheckCircle,
      color: 'green',
    },
    {
      title: 'Active',
      value: assignments.filter(a => a.status === 'Active').length,
      icon: Activity,
      color: 'indigo',
    },
  ]

  return (
    <section className="min-h-full bg-bg-primary text-textprimary space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            🛡️ Threat Hunt Dashboard
          </h2>
          <p className="text-sm text-gray-400 mt-1">MITRE ATT&CK Coverage Overview</p>
        </div>
        <div className="text-sm font-medium text-gray-400 bg-[#1a1d27] px-4 py-2 rounded-lg border border-[#2a2d3e]">
          {currentDate}
        </div>
      </div>

      {/* Row 1: 8 stat cards */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4 lg:grid-cols-8">
        {cards.map(card => (
          <StatCard
            key={card.title}
            title={card.title}
            value={card.value}
            icon={card.icon}
            color={card.color}
          />
        ))}
      </div>

      {/* Row 2: Bar Chart (60%) and Pie Chart (40%) */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 rounded-xl border border-[#2a2d3e] bg-[#151A24] p-5">
          <h3 className="mb-4 text-lg font-bold text-white">
            Hypotheses per Month
          </h3>
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData} margin={{ top: 12, right: 16, left: 0, bottom: 8 }}>
                <CartesianGrid stroke="#1e2435" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fill: '#94a3b8', fontSize: 12 }}
                  axisLine={{ stroke: '#1e2435' }}
                  tickLine={{ stroke: '#1e2435' }}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fill: '#94a3b8', fontSize: 12 }}
                  axisLine={{ stroke: '#1e2435' }}
                  tickLine={{ stroke: '#1e2435' }}
                />
                <Tooltip content={<DarkTooltip />} cursor={{ fill: '#1e2435' }} />
                <Bar
                  dataKey="total"
                  name="Hypotheses"
                  radius={[6, 6, 0, 0]}
                >
                  {monthlyData.map((entry, index) => {
                    const maxVal = Math.max(...monthlyData.map(d => d.total), 1)
                    const intensity = 0.4 + 0.6 * (entry.total / maxVal)
                    const r = Math.round(99 * intensity)
                    const g = Math.round(102 * intensity)
                    const b = Math.round(241 * intensity)
                    return <Cell key={`cell-${index}`} fill={`rgb(${r},${g},${b})`} />
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-2 rounded-xl border border-[#2a2d3e] bg-[#151A24] p-5">
          <h3 className="mb-4 text-lg font-bold text-white">Hunt Results</h3>
          <div className="flex h-[280px] items-center justify-center">
            {hasResults ? (
              <PieChart width={420} height={260}>
                <Pie
                  data={resultData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={86}
                  label={renderLabel}
                  labelLine={false}
                >
                  {resultData.map(item => (
                    <Cell
                      key={item.name}
                      fill={RESULT_COLORS[item.name]}
                    />
                  ))}
                </Pie>
                <Tooltip content={<DarkTooltip />} />
                <Legend
                  wrapperStyle={{ color: '#cbd5e1', fontSize: 12 }}
                  iconType="circle"
                />
              </PieChart>
            ) : (
              <p className="text-sm font-medium text-gray-500">No results yet</p>
            )}
          </div>
        </div>
      </div>

      {/* Row 3: Tactic Coverage (60%) and Recent Activity (40%) */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 rounded-xl border border-[#2a2d3e] bg-[#151A24] p-5">
          <h3 className="mb-4 text-lg font-bold text-white">Coverage by Tactic</h3>
          <div className="flex max-h-[300px] flex-col space-y-4 overflow-y-auto pr-2">
            {tacticData.length > 0 ? (
              tacticData.map((item) => {
                const tc = getTacticColor(item.tactic)
                return (
                  <div key={item.tactic} className="flex items-center gap-4">
                    <span className="w-32 truncate text-sm text-gray-200 font-medium" title={item.tactic}>
                      {item.tactic}
                    </span>
                    <div className="relative flex-1 h-2.5 w-full overflow-hidden rounded-full bg-[#1e2435]">
                      <div
                        className="absolute left-0 top-0 h-full rounded-full transition-all duration-700"
                        style={{ width: `${(item.count / maxTacticCount) * 100}%`, backgroundColor: tc.bar }}
                      />
                    </div>
                    <span className={`flex h-6 min-w-[24px] items-center justify-center rounded-full px-2 text-xs font-bold ${tc.badge}`}>
                      {item.count}
                    </span>
                  </div>
                )
              })
            ) : (
              <p className="text-sm font-medium text-gray-500">No tactic data available</p>
            )}
          </div>
        </div>

        <div className="lg:col-span-2 rounded-xl border border-[#2a2d3e] bg-[#151A24] p-5 flex flex-col">
          <div className="mb-4 flex items-center justify-between shrink-0">
            <h3 className="text-lg font-bold text-white">Analyst Workload</h3>
            <button
              onClick={() => navigate('/campaigns')}
              className="flex items-center text-sm font-medium text-[#6366f1] transition-colors hover:text-violet-400"
            >
              View Campaigns
              <ArrowRight className="ml-1 h-4 w-4" />
            </button>
          </div>
          <div className="flex flex-col flex-1 overflow-y-auto pr-2 max-h-[300px]">
            {analystWorkload.length > 0 ? (
              <div className="flex flex-col gap-3">
                {analystWorkload.map((analyst, index) => (
                  <div key={index} className="flex flex-col gap-1.5 p-3 rounded-lg bg-[#0B0E14] border border-[#1e2435]">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-gray-100">{analyst.name}</span>
                      <span className="text-xs font-bold bg-[#6366f1]/20 text-[#818cf8] px-2 py-0.5 rounded-md">
                        {analyst.Total} Total
                      </span>
                    </div>
                    <div className="flex gap-4 text-xs font-medium">
                      <span className="text-gray-500"><span className="text-amber-400 font-bold">{analyst.Planned}</span> Planned</span>
                      <span className="text-gray-500"><span className="text-[#6366f1] font-bold">{analyst.Active}</span> Active</span>
                      <span className="text-gray-500"><span className="text-emerald-400 font-bold">{analyst.Completed}</span> Done</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex h-full items-center justify-center">
                <p className="text-sm font-medium text-gray-500">No assignments active right now</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

export default Dashboard
