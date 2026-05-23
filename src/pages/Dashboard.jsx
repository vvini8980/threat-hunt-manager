import { useState, useEffect } from 'react'
import { Activity, AlertTriangle, Calendar, CheckCircle, List, Shield, ArrowRight } from 'lucide-react'
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
import { getMonthlyStats, getStats, getAllHypotheses } from '../services/storage'
import { useNavigate } from 'react-router-dom'
import Spinner from '../components/Common/Spinner'

const RESULT_COLORS = {
  TP: '#10b981',
  FP: '#ef4444',
  Undetermined: '#f59e0b',
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
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    total: 0, active: 0, planned: 0, completed: 0, tp: 0, fp: 0, undetermined: 0
  })
  const [monthlyData, setMonthlyData] = useState([])
  const [tacticData, setTacticData] = useState([])
  const [maxTacticCount, setMaxTacticCount] = useState(0)
  const [recentActivity, setRecentActivity] = useState([])
  const [resultData, setResultData] = useState([])
  const [hasResults, setHasResults] = useState(false)

  useEffect(() => {
    const rawStats = getStats()
    setStats(rawStats)

    const rawMonthly = getMonthlyStats().map(item => ({
      ...item,
      label: formatMonthLabel(item.month),
    }))
    setMonthlyData(rawMonthly)

    const allHypotheses = getAllHypotheses()
    const tacticCounts = allHypotheses.reduce((acc, hyp) => {
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

    const recent = [...allHypotheses]
      .sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0))
      .slice(0, 5)
    setRecentActivity(recent)

    const rData = [
      { name: 'TP', value: rawStats.tp },
      { name: 'FP', value: rawStats.fp },
      { name: 'Undetermined', value: rawStats.undetermined },
    ]
    setResultData(rData)
    setHasResults(rData.some(item => item.value > 0))
    setLoading(false)
  }, [])

  if (loading) {
    return <Spinner size="lg" text="Calculating dashboard statistics..." />
  }

  const currentDate = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(new Date())

  const cards = [
    {
      title: 'Total Hypotheses',
      value: stats.total,
      icon: List,
      color: 'indigo',
    },
    {
      title: 'Active',
      value: stats.active,
      icon: Activity,
      color: 'blue',
    },
    {
      title: 'Planned',
      value: stats.planned,
      icon: Calendar,
      color: 'yellow',
    },
    {
      title: 'Completed',
      value: stats.completed,
      icon: CheckCircle,
      color: 'green',
    },
    {
      title: 'True Positives',
      value: stats.tp,
      icon: Shield,
      color: 'green',
    },
    {
      title: 'False Positives',
      value: stats.fp,
      icon: AlertTriangle,
      color: 'red',
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

      {/* Row 1: 6 stat cards */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
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
        <div className="lg:col-span-3 rounded-xl border border-[#2a2d3e] bg-[#1a1d27] p-5">
          <h3 className="mb-4 text-lg font-bold text-white">
            Hypotheses per Month
          </h3>
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData} margin={{ top: 12, right: 16, left: 0, bottom: 8 }}>
                <CartesianGrid stroke="#2a2d3e" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fill: '#94a3b8', fontSize: 12 }}
                  axisLine={{ stroke: '#2a2d3e' }}
                  tickLine={{ stroke: '#2a2d3e' }}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fill: '#94a3b8', fontSize: 12 }}
                  axisLine={{ stroke: '#2a2d3e' }}
                  tickLine={{ stroke: '#2a2d3e' }}
                />
                <Tooltip content={<DarkTooltip />} cursor={{ fill: '#252840' }} />
                <Bar
                  dataKey="total"
                  name="Hypotheses"
                  fill="#6366f1"
                  activeBar={{ fill: '#818cf8' }}
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-2 rounded-xl border border-[#2a2d3e] bg-[#1a1d27] p-5">
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
                  wrapperStyle={{ color: '#94a3b8', fontSize: 12 }}
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
        <div className="lg:col-span-3 rounded-xl border border-[#2a2d3e] bg-[#1a1d27] p-5">
          <h3 className="mb-4 text-lg font-bold text-white">Coverage by Tactic</h3>
          <div className="flex max-h-[300px] flex-col space-y-4 overflow-y-auto pr-2">
            {tacticData.length > 0 ? (
              tacticData.map((item) => (
                <div key={item.tactic} className="flex items-center gap-4">
                  <span className="w-32 truncate text-sm text-white" title={item.tactic}>
                    {item.tactic}
                  </span>
                  <div className="relative flex-1 h-2 w-full overflow-hidden rounded-full bg-[#2a2d3e]">
                    <div
                      className="absolute left-0 top-0 h-full bg-indigo-500 rounded-full"
                      style={{ width: `${(item.count / maxTacticCount) * 100}%` }}
                    />
                  </div>
                  <span className="flex h-6 min-w-[24px] items-center justify-center rounded-full bg-indigo-500/20 px-2 text-xs font-medium text-indigo-400">
                    {item.count}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-sm font-medium text-gray-500">No tactic data available</p>
            )}
          </div>
        </div>

        <div className="lg:col-span-2 rounded-xl border border-[#2a2d3e] bg-[#1a1d27] p-5 flex flex-col">
          <div className="mb-4 flex items-center justify-between shrink-0">
            <h3 className="text-lg font-bold text-white">Recent Activity</h3>
            <button
              onClick={() => navigate('/hypotheses')}
              className="flex items-center text-sm font-medium text-indigo-400 transition-colors hover:text-indigo-300"
            >
              View All
              <ArrowRight className="ml-1 h-4 w-4" />
            </button>
          </div>
          <div className="flex flex-col flex-1 overflow-y-auto pr-2 max-h-[300px]">
            {recentActivity.length > 0 ? (
              recentActivity.map((hyp, index) => (
                <div
                  key={hyp.id || index}
                  onClick={() => navigate('/hypotheses')}
                  className={`flex cursor-pointer items-center justify-between py-3 transition-colors hover:bg-[#252836] rounded-lg px-2 ${
                    index !== recentActivity.length - 1 ? 'border-b border-[#2a2d3e]' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`h-2.5 w-2.5 rounded-full ${STATUS_COLORS[hyp.status] || 'bg-gray-500'}`} />
                    <div>
                      <p className="text-sm font-medium text-white">{hyp.name}</p>
                      <p className="text-xs text-gray-400">{hyp.mitreId || 'No MITRE ID'}</p>
                    </div>
                  </div>
                  <span className="text-xs text-gray-500 whitespace-nowrap ml-2">
                    {timeAgo(hyp.updatedAt || hyp.createdAt)}
                  </span>
                </div>
              ))
            ) : (
              <p className="py-2 text-sm font-medium text-gray-500">No recent activity</p>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

export default Dashboard
