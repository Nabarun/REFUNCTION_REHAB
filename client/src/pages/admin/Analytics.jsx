import { useEffect, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { BarChart3, Users, Eye, Globe, Smartphone, Monitor, Tablet, RefreshCw } from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import AdminLayout from '../../components/admin/AdminLayout'
import {
  getAnalyticsSummary, getAnalyticsDaily, getAnalyticsPages, getAnalyticsReferrers,
} from '../../lib/api'

const COLORS = ['#1A7F8E', '#1B2F5E', '#F5A623', '#E8630A', '#7C3AED', '#059669', '#BE185D', '#2563EB']

function fmt(n) {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n || 0)
}

function formatDate(d) {
  return new Date(d).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })
}

function getDefaultRange() {
  const to = new Date()
  const from = new Date()
  from.setDate(from.getDate() - 30)
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  }
}

export default function Analytics() {
  const [range, setRange] = useState(getDefaultRange)
  const [summary, setSummary] = useState(null)
  const [daily, setDaily] = useState([])
  const [pages, setPages] = useState([])
  const [referrers, setReferrers] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchAll = useCallback(async (showRefresh) => {
    if (showRefresh) setRefreshing(true)
    else setLoading(true)

    try {
      const [sumRes, dailyRes, pagesRes, refRes] = await Promise.all([
        getAnalyticsSummary(),
        getAnalyticsDaily({ from: range.from, to: range.to }),
        getAnalyticsPages({ from: range.from, to: range.to }),
        getAnalyticsReferrers({ from: range.from, to: range.to }),
      ])
      setSummary(sumRes.data)
      setDaily(dailyRes.data)
      setPages(pagesRes.data)
      setReferrers(refRes.data)
    } catch (err) {
      console.error('Failed to load analytics', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [range])

  useEffect(() => { fetchAll(false) }, [fetchAll])

  // Device breakdown aggregation from daily stats
  const deviceData = daily.reduce((acc, d) => {
    const breakdown = d.deviceBreakdown || {}
    for (const [device, count] of Object.entries(breakdown)) {
      acc[device] = (acc[device] || 0) + count
    }
    return acc
  }, {})
  const deviceChartData = Object.entries(deviceData).map(([name, value]) => ({ name, value }))

  // Totals from daily
  const totalVisitors = daily.reduce((sum, d) => sum + (d.uniqueVisitors || 0), 0)
  const totalPageViews = daily.reduce((sum, d) => sum + (d.totalPageViews || 0), 0)

  const deviceIcon = (name) => {
    if (name === 'mobile') return <Smartphone size={14} />
    if (name === 'tablet') return <Tablet size={14} />
    return <Monitor size={14} />
  }

  if (loading) return (
    <AdminLayout>
      <div className="flex items-center justify-center h-64 text-muted">Loading analytics...</div>
    </AdminLayout>
  )

  return (
    <AdminLayout>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="font-display font-bold text-2xl text-navy flex items-center gap-2">
            <BarChart3 size={24} className="text-indigo-500" /> Analytics
          </h1>
          <p className="text-muted text-sm mt-1">Website visitor analytics &mdash; privacy-friendly, no cookies</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Date range picker */}
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-1.5 shadow-sm">
            <input
              type="date"
              value={range.from}
              onChange={(e) => setRange(r => ({ ...r, from: e.target.value }))}
              className="text-sm text-navy bg-transparent outline-none"
            />
            <span className="text-muted text-xs">to</span>
            <input
              type="date"
              value={range.to}
              onChange={(e) => setRange(r => ({ ...r, to: e.target.value }))}
              className="text-sm text-navy bg-transparent outline-none"
            />
          </div>
          <button
            onClick={() => fetchAll(true)}
            disabled={refreshing}
            className="p-2 rounded-xl bg-white border border-gray-200 shadow-sm hover:bg-light transition-colors disabled:opacity-50"
          >
            <RefreshCw size={16} className={`text-navy ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="card p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-teal/10">
              <Users size={20} className="text-teal" />
            </div>
          </div>
          <div className="font-accent font-bold text-3xl text-navy">{fmt(summary?.today?.uniqueVisitors)}</div>
          <div className="text-muted text-sm mt-0.5">Visitors Today</div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="card p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-indigo-500/10">
              <Eye size={20} className="text-indigo-500" />
            </div>
          </div>
          <div className="font-accent font-bold text-3xl text-navy">{fmt(summary?.today?.pageViews)}</div>
          <div className="text-muted text-sm mt-0.5">Page Views Today</div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="card p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-navy/10">
              <Users size={20} className="text-navy" />
            </div>
          </div>
          <div className="font-accent font-bold text-3xl text-navy">{fmt(totalVisitors)}</div>
          <div className="text-muted text-sm mt-0.5">Visitors (Range)</div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="card p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-amber-500/10">
              <Eye size={20} className="text-amber-500" />
            </div>
          </div>
          <div className="font-accent font-bold text-3xl text-navy">{fmt(totalPageViews)}</div>
          <div className="text-muted text-sm mt-0.5">Page Views (Range)</div>
        </motion.div>
      </div>

      {/* Line chart — visitors & page views over time */}
      <div className="card p-6 mb-6">
        <h2 className="font-display font-semibold text-navy mb-4">Traffic Over Time</h2>
        {daily.length === 0 ? (
          <p className="text-muted text-sm text-center py-12">No data for the selected range</p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={daily.map(d => ({
              ...d,
              date: formatDate(d.date),
            }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#9CA3AF" />
              <YAxis tick={{ fontSize: 12 }} stroke="#9CA3AF" allowDecimals={false} />
              <Tooltip
                contentStyle={{ borderRadius: '12px', border: '1px solid #E5E7EB', fontSize: '13px' }}
              />
              <Line
                type="monotone"
                dataKey="uniqueVisitors"
                name="Visitors"
                stroke="#1A7F8E"
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
              <Line
                type="monotone"
                dataKey="totalPageViews"
                name="Page Views"
                stroke="#6366F1"
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        {/* Top pages table */}
        <div className="card p-6">
          <h2 className="font-display font-semibold text-navy mb-4 flex items-center gap-2">
            <Globe size={18} className="text-teal" /> Top Pages
          </h2>
          {pages.length === 0 ? (
            <p className="text-muted text-sm text-center py-8">No page data yet</p>
          ) : (
            <div className="space-y-2">
              {pages.map((p, i) => (
                <div key={p.path} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-muted w-5">{i + 1}.</span>
                    <span className="text-sm text-navy font-medium truncate max-w-[200px]">{p.path}</span>
                  </div>
                  <span className="text-sm font-semibold text-navy">{fmt(p.count)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Referrer pie chart */}
        <div className="card p-6">
          <h2 className="font-display font-semibold text-navy mb-4 flex items-center gap-2">
            <Globe size={18} className="text-indigo-500" /> Top Referrers
          </h2>
          {referrers.length === 0 ? (
            <p className="text-muted text-sm text-center py-8">No referrer data yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={referrers.map(r => ({ name: r.source, value: r.count }))}
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  innerRadius={0}
                  dataKey="value"
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  labelLine={false}
                  style={{ fontSize: '11px' }}
                >
                  {referrers.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Device donut chart */}
      <div className="card p-6">
        <h2 className="font-display font-semibold text-navy mb-4 flex items-center gap-2">
          <Smartphone size={18} className="text-purple-500" /> Device Breakdown
        </h2>
        {deviceChartData.length === 0 ? (
          <p className="text-muted text-sm text-center py-8">No device data yet</p>
        ) : (
          <div className="flex flex-col lg:flex-row items-center gap-8">
            <ResponsiveContainer width="100%" height={250} className="max-w-xs">
              <PieChart>
                <Pie
                  data={deviceChartData}
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  innerRadius={55}
                  dataKey="value"
                  paddingAngle={3}
                >
                  {deviceChartData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-3 w-full">
              {deviceChartData.map((d, i) => {
                const total = deviceChartData.reduce((s, x) => s + x.value, 0)
                const pct = total ? ((d.value / total) * 100).toFixed(1) : 0
                return (
                  <div key={d.name} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: COLORS[i % COLORS.length] + '20' }}>
                      {deviceIcon(d.name)}
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium text-navy capitalize">{d.name}</span>
                        <span className="text-muted">{fmt(d.value)} ({pct}%)</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <div
                          className="h-2 rounded-full transition-all"
                          style={{ width: `${pct}%`, background: COLORS[i % COLORS.length] }}
                        />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
