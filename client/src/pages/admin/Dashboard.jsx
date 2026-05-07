import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Users, IndianRupee, TrendingUp, Clock, UserPlus, AlertCircle, Package, CalendarCheck, CalendarDays, ChevronLeft, ChevronRight, Eye, EyeOff, BarChart3 } from 'lucide-react'
import AdminLayout from '../../components/admin/AdminLayout'
import { getDashboard } from '../../lib/api'

function StatCard({ icon: Icon, label, value, sub, color, to }) {
  const content = (
    <>
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center`} style={{ background: color + '18' }}>
          <Icon size={20} style={{ color }} />
        </div>
        {sub && <span className="text-xs text-muted">{sub}</span>}
      </div>
      <div className="font-accent font-bold text-3xl text-navy">{value}</div>
      <div className="text-muted text-sm mt-0.5">{label}</div>
    </>
  )
  return to ? (
    <Link to={to}>
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="card p-5 hover:shadow-md hover:border-teal/30 transition-all cursor-pointer">
        {content}
      </motion.div>
    </Link>
  ) : (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="card p-5">
      {content}
    </motion.div>
  )
}

function fmt(n) {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n || 0)
}

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December']

export default function Dashboard() {
  const now = new Date()
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')
  const [month, setMonth]     = useState(now.getMonth())   // 0-indexed
  const [year, setYear]       = useState(now.getFullYear())
  const [showRevenue, setShowRevenue] = useState(false)

  const isCurrentMonth = month === now.getMonth() && year === now.getFullYear()

  const fetchDashboard = useCallback(() => {
    if (!data) setLoading(true) // only show full loading on first load
    getDashboard({ month, year })
      .then((res) => setData(res.data))
      .catch(() => setError('Failed to load dashboard data.'))
      .finally(() => setLoading(false))
  }, [month, year]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchDashboard() }, [fetchDashboard])

  const goToPrevMonth = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }

  const goToNextMonth = () => {
    if (isCurrentMonth) return
    if (month === 11) { setMonth(0); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }

  const monthLabel = isCurrentMonth ? 'This Month' : `${MONTH_NAMES[month]} ${year}`

  if (loading) return (
    <AdminLayout>
      <div className="flex items-center justify-center h-64 text-muted">Loading dashboard…</div>
    </AdminLayout>
  )

  if (error) return (
    <AdminLayout>
      <div className="flex items-center justify-center h-64 gap-2 text-red-500">
        <AlertCircle size={20} /> {error}
      </div>
    </AdminLayout>
  )

  return (
    <AdminLayout>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="font-display font-bold text-2xl text-navy">Dashboard</h1>
          <p className="text-muted text-sm mt-1">Overview of ReFunction Rehab patient & payment data</p>
        </div>
        {/* Month Picker */}
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-2 py-1.5 shadow-sm">
          <button onClick={goToPrevMonth} className="p-1.5 rounded-lg hover:bg-light transition-colors">
            <ChevronLeft size={16} className="text-navy" />
          </button>
          <span className="text-sm font-semibold text-navy min-w-[140px] text-center">
            {MONTH_NAMES[month]} {year}
          </span>
          <button
            onClick={goToNextMonth}
            disabled={isCurrentMonth}
            className="p-1.5 rounded-lg hover:bg-light disabled:opacity-30 transition-colors"
          >
            <ChevronRight size={16} className="text-navy" />
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={Users}        color="#1B2F5E" label="Total Patients"        value={fmt(data.totalPatients)}         to="/admin/patients" />
        <StatCard icon={UserPlus}     color="#1A7F8E" label="New Today"             value={fmt(data.newPatientsToday)}       to="/admin/patients" />
        <StatCard icon={TrendingUp}   color="#059669" label={`Patients — ${monthLabel}`} value={fmt(data.newPatientsThisMonth)} to="/admin/patients" />
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          className="card p-5 cursor-pointer hover:shadow-md hover:border-teal/30 transition-all"
          onClick={() => setShowRevenue(v => !v)}
        >
          <div className="flex items-start justify-between mb-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#E8630A18' }}>
              <IndianRupee size={20} style={{ color: '#E8630A' }} />
            </div>
            {showRevenue
              ? <EyeOff size={16} className="text-muted mt-1" />
              : <Eye size={16} className="text-muted mt-1" />}
          </div>
          <div className="font-accent font-bold text-3xl text-navy">
            {showRevenue ? `₹${fmt(data.totalRevenue)}` : '₹•••••'}
          </div>
          <div className="text-muted text-sm mt-0.5">Total Revenue</div>
        </motion.div>
        <StatCard icon={IndianRupee}  color="#F5A623" label="Revenue Today"         value={`₹${fmt(data.revenueToday)}`}     to="/admin/payments" />
        <StatCard icon={TrendingUp}   color="#10B981" label={`Revenue — ${monthLabel}`} value={`₹${fmt(data.revenueThisMonth)}`} to="/admin/payments" />
        <StatCard icon={Clock}        color="#BE185D" label="Pending Payments"      value={fmt(data.pendingPaymentsCount)}  sub={data.patientsWithNoPayments ? `₹${fmt(data.pendingPaymentsValue)} · ${data.patientsWithNoPayments} unpaid` : `₹${fmt(data.pendingPaymentsValue)}`} to="/admin/payments" />
        <StatCard icon={Package}      color="#7C3AED" label="Active Packages"       value={fmt(data.activePackages)}        to="/admin/patients" />
        <StatCard icon={CalendarCheck} color="#0891B2" label="Visits Today"          value={fmt(data.visitsToday)}           to="/admin/patients" />
        <StatCard icon={CalendarDays}  color="#2563EB" label="Appointments Today"   value={fmt(data.appointmentsToday)}     to="/admin/appointments" />
        <StatCard icon={BarChart3}     color="#6366F1" label="Visitors Today"       value={fmt(data.visitorsToday)}        to="/admin/analytics" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Enrollments */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-semibold text-navy">Recent Enrollments</h2>
            <Link to="/admin/patients" className="text-teal text-sm hover:underline">View all</Link>
          </div>
          {data.recentEnrollments.length === 0 ? (
            <p className="text-muted text-sm text-center py-8">No enrollments yet</p>
          ) : (
            <div className="space-y-3">
              {data.recentEnrollments.map((p) => (
                <div key={p.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <div>
                    <div className="font-medium text-navy text-sm">{p.fullName}</div>
                    <div className="text-muted text-xs">{p.mobile} · {p.program?.[0] || '—'}</div>
                  </div>
                  <div className="text-xs text-muted text-right">
                    {new Date(p.enrolledAt).toLocaleDateString('en-IN')}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Payments */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-semibold text-navy">Recent Payments</h2>
            <Link to="/admin/payments" className="text-teal text-sm hover:underline">View all</Link>
          </div>
          {data.recentPayments.length === 0 ? (
            <p className="text-muted text-sm text-center py-8">No payments yet</p>
          ) : (
            <div className="space-y-3">
              {data.recentPayments.map((p) => (
                <div key={p.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <div>
                    <div className="font-medium text-navy text-sm">{p.patient?.fullName || '—'}</div>
                    <div className="text-muted text-xs">{p.receiptNo} · {p.paymentMode}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-navy">₹{fmt(p.amountPaid)}</div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      p.status === 'paid' ? 'bg-green-100 text-green-700' :
                      p.status === 'partial' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-700'
                    }`}>{p.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Today's Schedule */}
      {data.todaysSchedule?.length > 0 && (
        <div className="card p-6 mt-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-semibold text-navy flex items-center gap-2">
              <CalendarDays size={18} className="text-blue-500" /> Today's Schedule
            </h2>
            <Link to="/admin/appointments" className="text-teal text-sm hover:underline">View all</Link>
          </div>
          <div className="space-y-3">
            {data.todaysSchedule.map((a) => (
              <div key={a.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <div className="flex items-center gap-3">
                  <div className="text-sm font-mono font-semibold text-teal w-24">{a.startTime} - {a.endTime}</div>
                  <div>
                    <div className="font-medium text-navy text-sm">{a.patient?.fullName || '—'}</div>
                    <div className="text-muted text-xs">{a.serviceType} · {a.sessionType}</div>
                  </div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${
                  a.status === 'booked' ? 'bg-blue-100 text-blue-700' :
                  a.status === 'completed' ? 'bg-green-100 text-green-700' :
                  a.status === 'no-show' ? 'bg-amber-100 text-amber-700' :
                  'bg-gray-100 text-gray-600'
                }`}>{a.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Packages Needing Attention */}
      {data.attentionPackages?.length > 0 && (
        <div className="card p-6 mt-6">
          <h2 className="font-display font-semibold text-navy mb-4 flex items-center gap-2">
            <AlertCircle size={18} className="text-amber-500" /> Packages Needing Attention
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-light">
                <tr>
                  {['Patient', 'Package', 'Sessions Used', 'Remaining', 'Action'].map(h => (
                    <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-muted uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.attentionPackages.map((p) => (
                  <tr key={p.id} className="border-b border-gray-100">
                    <td className="px-4 py-2.5 font-medium text-navy">{p.patientName}</td>
                    <td className="px-4 py-2.5 text-muted">{p.packageName}</td>
                    <td className="px-4 py-2.5 text-muted">{p.sessionsUsed} / {p.totalSessions}</td>
                    <td className="px-4 py-2.5">
                      <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                        {p.remaining} left
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <Link to={`/admin/patients/${p.patientId}/edit`} className="text-teal text-xs font-medium hover:underline">
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Payment Mode Breakdown */}
      {data.paymentModeBreakdown?.length > 0 && (
        <div className="card p-6 mt-6">
          <h2 className="font-display font-semibold text-navy mb-4">Payment Mode Breakdown</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {data.paymentModeBreakdown.map((m) => (
              <div key={m.paymentMode} className="bg-light rounded-xl p-4 text-center">
                <div className="font-accent font-bold text-xl text-navy">₹{fmt(m._sum.amountPaid)}</div>
                <div className="text-muted text-xs mt-1 capitalize">{m.paymentMode}</div>
                <div className="text-teal text-xs font-medium">{m._count.id} txn{m._count.id !== 1 ? 's' : ''}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
