import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Search, Download, ChevronLeft, ChevronRight, CreditCard, Pencil, X, Package, Plus, Trash2, ChevronDown, ChevronUp, AlertTriangle, CalendarPlus, FileText } from 'lucide-react'
import AdminLayout from '../../components/admin/AdminLayout'
import { getAdminPatients, exportPatients, getPatientPackages, recordVisit, deleteVisit, recordPayment } from '../../lib/api'

const PROGRAMS = ['', 'Physiotherapy', 'General Health & Fitness', 'Kids Exercise',
  'Post-Surgery Rehab', 'Sports Injury', 'Elderly Care']

const PACKAGE_PRESETS = [
  { label: '5-Session Package',  sessions: 5 },
  { label: '10-Session Package', sessions: 10 },
  { label: '15-Session Package', sessions: 15 },
  { label: 'Monthly Unlimited',  sessions: 30 },
  { label: 'Custom',             sessions: 0 },
]

const SERVICES_LIST = [
  'Physiotherapy Session', 'Initial Consultation', 'Follow-up Session',
  'Exercise Training', 'Kids Exercise', 'Post-Surgery Rehab',
  'Sports Injury Session', 'Elderly Care Session',
  'Group Session', 'Online Session', 'Other',
]

const PER_SESSION_COST = 600

const PAYMENT_MODES = ['Cash', 'UPI', 'Card', 'Bank Transfer', 'Cheque']

export default function AdminPatients() {
  const [data, setData]       = useState({ patients: [], total: 0, pages: 1 })
  const [loading, setLoading] = useState(true)
  const [page, setPage]       = useState(1)
  const [search, setSearch]   = useState('')
  const [program, setProgram] = useState('')
  const [from, setFrom]       = useState('')
  const [to, setTo]           = useState('')

  const fetchPatients = useCallback(async () => {
    setLoading(true)
    try {
      const res = await getAdminPatients({
        page, limit: 20,
        ...(search  && { search }),
        ...(program && { program }),
        ...(from    && { from }),
        ...(to      && { to }),
      })
      setData(res.data)
    } catch {
      // keep previous data
    } finally {
      setLoading(false)
    }
  }, [page, search, program, from, to])

  useEffect(() => { fetchPatients() }, [fetchPatients])

  // Reset to page 1 when filters change
  useEffect(() => { setPage(1) }, [search, program, from, to])

  // Package modal state
  const [modalPatient, setModalPatient]  = useState(null)  // { id, fullName }
  const [packages, setPackages]          = useState([])
  const [pkgLoading, setPkgLoading]      = useState(false)
  const [expandedPkg, setExpandedPkg]    = useState(null)
  const [visitForm, setVisitForm]        = useState(null)
  const [visitDate, setVisitDate]        = useState(new Date().toISOString().split('T')[0])
  const [visitNotes, setVisitNotes]      = useState('')
  const [visitSaving, setVisitSaving]    = useState(false)

  // New Package form state
  const [showNewPkg, setShowNewPkg]         = useState(false)
  const [newPkgSaving, setNewPkgSaving]     = useState(false)
  const [serviceType, setServiceType]       = useState('Physiotherapy Session')
  const [packageName, setPackageName]       = useState('10-Session Package')
  const [totalSessions, setTotalSessions]   = useState(10)
  const [startDate, setStartDate]           = useState(new Date().toISOString().split('T')[0])
  const [expiryDate, setExpiryDate]         = useState('')
  const [packageNotes, setPackageNotes]     = useState('')
  const [discount, setDiscount]             = useState('')
  const [paymentMode, setPaymentMode]       = useState('Cash')
  const [paymentRemarks, setPaymentRemarks] = useState('')

  // Auto-calculated pricing
  const subTotal    = Number(totalSessions) * PER_SESSION_COST
  const discountAmt = Number(discount) || 0
  const finalAmount = Math.max(subTotal - discountAmt, 0)

  const resetNewPkgForm = () => {
    setShowNewPkg(false)
    setNewPkgSaving(false)
    setServiceType('Physiotherapy Session')
    setPackageName('10-Session Package')
    setTotalSessions(10)
    setStartDate(new Date().toISOString().split('T')[0])
    setExpiryDate('')
    setPackageNotes('')
    setDiscount('')
    setPaymentMode('Cash')
    setPaymentRemarks('')
  }

  const openPkgModal = async (patient) => {
    setModalPatient({ id: patient.id, fullName: patient.fullName })
    setExpandedPkg(null)
    setVisitForm(null)
    setPkgLoading(true)
    try {
      const res = await getPatientPackages(patient.id)
      const order = { active: 0, completed: 1, expired: 2 }
      setPackages([...res.data].sort((a, b) => (order[a.status] ?? 3) - (order[b.status] ?? 3)))
    } catch { setPackages([]) }
    finally { setPkgLoading(false) }
  }

  const closePkgModal = () => {
    setModalPatient(null)
    setPackages([])
    setExpandedPkg(null)
    setVisitForm(null)
    resetNewPkgForm()
  }

  const handleMarkVisit = async (pkgId) => {
    setVisitSaving(true)
    try {
      await recordVisit(pkgId, { visitDate, treatmentNotes: visitNotes })
      setVisitForm(null)
      setVisitNotes('')
      setVisitDate(new Date().toISOString().split('T')[0])
      // Refresh packages in modal
      const res = await getPatientPackages(modalPatient.id)
      const order = { active: 0, completed: 1, expired: 2 }
      setPackages([...res.data].sort((a, b) => (order[a.status] ?? 3) - (order[b.status] ?? 3)))
      // Refresh patient list to update badge
      fetchPatients()
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to record visit')
    } finally { setVisitSaving(false) }
  }

  const handleDeleteVisit = async (pkgId, visitId) => {
    if (!window.confirm('Delete this visit?')) return
    try {
      await deleteVisit(pkgId, visitId)
      const res = await getPatientPackages(modalPatient.id)
      const order = { active: 0, completed: 1, expired: 2 }
      setPackages([...res.data].sort((a, b) => (order[a.status] ?? 3) - (order[b.status] ?? 3)))
      fetchPatients()
    } catch { alert('Failed to delete visit') }
  }

  const handleCreatePackage = async () => {
    if (!totalSessions || Number(totalSessions) <= 0) { alert('Please enter total sessions'); return }
    if (finalAmount <= 0) { alert('Final amount must be greater than zero'); return }
    if (discountAmt > subTotal) { alert('Discount cannot exceed the subtotal'); return }
    setNewPkgSaving(true)
    try {
      const remarks = [
        paymentRemarks,
        discountAmt > 0 ? `Discount: ₹${discountAmt.toLocaleString('en-IN')} on ₹${subTotal.toLocaleString('en-IN')}` : '',
      ].filter(Boolean).join(' | ')
      await recordPayment({
        patientId: modalPatient.id,
        totalAmount: finalAmount,
        subTotal: subTotal,
        gst: 0,
        amountPaid: finalAmount,
        balanceDue: 0,
        advancePaid: 0,
        paymentMode,
        paymentDate: startDate,
        status: 'paid',
        services: [{
          description: serviceType,
          qty: Number(totalSessions),
          unitRate: PER_SESSION_COST,
          discount: discountAmt,
          amount: finalAmount,
        }],
        collectedBy: 'Staff',
        remarks,
        isPackage: true,
        packageName,
        totalSessions: Number(totalSessions),
        expiryDate: expiryDate || null,
        packageNotes,
      })
      resetNewPkgForm()
      // Refresh packages in modal
      const res = await getPatientPackages(modalPatient.id)
      const order = { active: 0, completed: 1, expired: 2 }
      setPackages([...res.data].sort((a, b) => (order[a.status] ?? 3) - (order[b.status] ?? 3)))
      // Refresh patient list to update badge
      fetchPatients()
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to create package')
    } finally { setNewPkgSaving(false) }
  }

  const handleExport = async () => {
    try {
      const res = await exportPatients()
      const url = URL.createObjectURL(res.data)
      const a = document.createElement('a')
      a.href = url
      a.download = 'patients.csv'
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      // handled by axios interceptor
    }
  }

  return (
    <AdminLayout>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="font-display font-bold text-2xl text-navy">Patients</h1>
          <p className="text-muted text-sm mt-0.5">{data.total} total enrolled</p>
        </div>
        <button
          onClick={handleExport}
          className="btn-teal text-sm py-2.5 px-4"
        >
          <Download size={15} /> Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="card p-4 mb-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              className="input-field pl-8 text-sm py-2.5"
              placeholder="Name, phone, or ID…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select className="input-field text-sm py-2.5" value={program} onChange={(e) => setProgram(e.target.value)}>
            <option value="">All Programs</option>
            {PROGRAMS.filter(Boolean).map((p) => <option key={p}>{p}</option>)}
          </select>
          <input type="date" className="input-field text-sm py-2.5" value={from} onChange={(e) => setFrom(e.target.value)} placeholder="From date" />
          <input type="date" className="input-field text-sm py-2.5" value={to}   onChange={(e) => setTo(e.target.value)}   placeholder="To date" />
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-light border-b border-gray-100">
              <tr>
                {['Patient ID', 'Name', 'Age/Gender', 'Mobile', 'Program', 'Session', 'City', 'Enrolled', 'Payments', 'Pkg Status', 'Actions'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wide whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={11} className="text-center py-16 text-muted">Loading…</td></tr>
              ) : data.patients.length === 0 ? (
                <tr><td colSpan={11} className="text-center py-16 text-muted">No patients found</td></tr>
              ) : data.patients.map((p) => (
                <tr key={p.id} className="border-b border-gray-50 hover:bg-light transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-muted">{p.id}</td>
                  <td className="px-4 py-3 font-medium text-navy whitespace-nowrap">
                    {p.fullName}
                    {p.registrationStatus === 'quick' && (
                      <span className="ml-1.5 text-xs bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded-full font-medium">Quick</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted whitespace-nowrap">{p.age} / {p.gender}</td>
                  <td className="px-4 py-3 text-muted">{p.mobile}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {p.program?.slice(0, 2).map((pr) => (
                        <span key={pr} className="text-xs bg-teal/10 text-teal px-2 py-0.5 rounded-full">{pr}</span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted">{p.sessionType}</td>
                  <td className="px-4 py-3 text-muted">{p.city}</td>
                  <td className="px-4 py-3 text-muted whitespace-nowrap">
                    {new Date(p.enrolledAt).toLocaleDateString('en-IN')}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {(p._count?.payments || 0) > 0 ? (
                      <span className="inline-flex items-center gap-1 text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full font-medium">
                        {p._count.payments} paid
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                        No payment
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      type="button"
                      onClick={() => openPkgModal(p)}
                      className="cursor-pointer hover:opacity-80 transition-opacity"
                    >
                      {(() => {
                        const activePkg = p.packages?.[0]
                        if (!activePkg) return (
                          <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-medium">No package</span>
                        )
                        const done = activePkg._count?.visits ?? 0
                        return (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                            Active ({done}/{activePkg.totalSessions})
                          </span>
                        )
                      })()}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Link
                        to={`/admin/patients/${p.id}/edit`}
                        className="inline-flex items-center gap-1 text-xs text-navy hover:underline font-medium whitespace-nowrap"
                      >
                        <Pencil size={13} /> Edit
                      </Link>
                      <Link
                        to={`/book?patientId=${p.id}&admin=1`}
                        className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline font-medium whitespace-nowrap"
                      >
                        <CalendarPlus size={13} /> Book
                      </Link>
                      <Link
                        to={`/admin/payment?patientId=${p.id}`}
                        className="inline-flex items-center gap-1 text-xs text-teal hover:underline font-medium whitespace-nowrap"
                      >
                        <CreditCard size={13} /> Payment
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between text-sm text-muted">
          <span>Page {data.page || page} of {data.pages}</span>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="p-1.5 rounded-lg hover:bg-light disabled:opacity-40 transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              disabled={page >= data.pages}
              onClick={() => setPage((p) => p + 1)}
              className="p-1.5 rounded-lg hover:bg-light disabled:opacity-40 transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Packages & Visits Modal */}
      {modalPatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/40" onClick={closePkgModal} />
          {/* Modal */}
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <Package size={22} className="text-teal" />
                <div>
                  <h2 className="font-display font-bold text-lg text-navy">Packages & Visits</h2>
                  <p className="text-muted text-xs">{modalPatient.fullName} &middot; {modalPatient.id}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewPkg(true)}
                  className="btn-teal text-xs py-2 px-3"
                  disabled={showNewPkg}
                >
                  <Plus size={14} /> New Package
                </button>
                <button onClick={closePkgModal} className="p-2 rounded-lg hover:bg-light transition-colors">
                  <X size={18} className="text-muted" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="overflow-y-auto p-5">
              {/* Inline New Package Form */}
              {showNewPkg && (
                <div className="bg-light border border-gray-200 rounded-xl p-4 mb-5">
                  <h3 className="font-semibold text-navy text-sm mb-3">New Package</h3>

                  {/* Service Details */}
                  <div className="mb-3">
                    <label className="form-label text-xs">Service / Treatment</label>
                    <select
                      className="input-field text-sm"
                      value={serviceType}
                      onChange={(e) => setServiceType(e.target.value)}
                    >
                      {SERVICES_LIST.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>

                  {/* Package Details */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                    <div>
                      <label className="form-label text-xs">Package Type</label>
                      <select
                        className="input-field text-sm"
                        value={packageName}
                        onChange={(e) => {
                          const preset = PACKAGE_PRESETS.find((p) => p.label === e.target.value)
                          setPackageName(e.target.value)
                          if (preset && preset.sessions > 0) setTotalSessions(preset.sessions)
                        }}
                      >
                        {PACKAGE_PRESETS.map((p) => (
                          <option key={p.label} value={p.label}>{p.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="form-label text-xs">Total Sessions</label>
                      <input
                        type="number"
                        min="1"
                        className="input-field text-sm"
                        value={totalSessions}
                        onChange={(e) => setTotalSessions(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="form-label text-xs">Enrollment Date</label>
                      <input
                        type="date"
                        className="input-field text-sm"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="form-label text-xs">Expiry Date <span className="text-muted">(optional)</span></label>
                      <input
                        type="date"
                        className="input-field text-sm"
                        value={expiryDate}
                        onChange={(e) => setExpiryDate(e.target.value)}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="form-label text-xs">Package Notes <span className="text-muted">(optional)</span></label>
                      <input
                        className="input-field text-sm"
                        placeholder="Any notes about this package..."
                        value={packageNotes}
                        onChange={(e) => setPackageNotes(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Payment Details */}
                  <h3 className="font-semibold text-navy text-sm mb-3 mt-4 pt-3 border-t border-gray-200">Payment Details</h3>

                  {/* Price Breakdown */}
                  <div className="bg-white rounded-lg border border-gray-200 p-3 mb-3 text-sm">
                    <div className="flex justify-between text-muted">
                      <span>{totalSessions} sessions × ₹{PER_SESSION_COST.toLocaleString('en-IN')}</span>
                      <span>₹{subTotal.toLocaleString('en-IN')}</span>
                    </div>
                    {discountAmt > 0 && (
                      <div className="flex justify-between text-green-600 mt-1">
                        <span>Discount</span>
                        <span>− ₹{discountAmt.toLocaleString('en-IN')}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-semibold text-navy mt-1 pt-1 border-t border-gray-100">
                      <span>Total</span>
                      <span>₹{finalAmount.toLocaleString('en-IN')}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                    <div>
                      <label className="form-label text-xs">Discount (₹) <span className="text-muted">(optional)</span></label>
                      <input
                        type="number"
                        min="0"
                        max={subTotal}
                        className="input-field text-sm"
                        placeholder="0"
                        value={discount}
                        onChange={(e) => setDiscount(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="form-label text-xs">Payment Mode</label>
                      <select
                        className="input-field text-sm"
                        value={paymentMode}
                        onChange={(e) => setPaymentMode(e.target.value)}
                      >
                        {PAYMENT_MODES.map((m) => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="form-label text-xs">Remarks <span className="text-muted">(optional)</span></label>
                      <input
                        className="input-field text-sm"
                        placeholder="Payment remarks..."
                        value={paymentRemarks}
                        onChange={(e) => setPaymentRemarks(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={newPkgSaving}
                      onClick={handleCreatePackage}
                      className="btn-teal text-xs py-2 px-4 disabled:opacity-60"
                    >
                      {newPkgSaving ? 'Saving...' : 'Save Package'}
                    </button>
                    <button
                      type="button"
                      onClick={resetNewPkgForm}
                      className="btn-outline text-xs py-2 px-4"
                      disabled={newPkgSaving}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {pkgLoading ? (
                <p className="text-muted text-sm text-center py-12">Loading packages...</p>
              ) : packages.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted text-sm mb-3">No treatment packages yet.</p>
                  <button
                    type="button"
                    onClick={() => setShowNewPkg(true)}
                    className="text-teal text-sm font-medium hover:underline"
                  >
                    + Create a new package
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {packages.map((pkg) => {
                    const visitsDone = pkg._count?.visits ?? pkg.visits?.length ?? 0
                    const remaining  = pkg.totalSessions - visitsDone
                    const pct        = pkg.totalSessions > 0 ? Math.round((visitsDone / pkg.totalSessions) * 100) : 0
                    const isExpanded = expandedPkg === pkg.id
                    const statusColor = pkg.status === 'active' ? 'bg-green-100 text-green-700'
                      : pkg.status === 'completed' ? 'bg-blue-100 text-blue-700'
                      : 'bg-red-100 text-red-700'

                    return (
                      <div key={pkg.id} className="border border-gray-200 rounded-xl overflow-hidden">
                        {/* Package header */}
                        <div
                          className="flex items-center justify-between p-4 cursor-pointer hover:bg-light transition-colors"
                          onClick={() => setExpandedPkg(isExpanded ? null : pkg.id)}
                        >
                          <div>
                            <div className="font-semibold text-navy text-sm flex items-center gap-2">
                              {pkg.packageName}
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor}`}>
                                {pkg.status}
                              </span>
                            </div>
                            <div className="text-xs text-muted mt-0.5">
                              {visitsDone} / {pkg.totalSessions} sessions
                              {pkg.payment?.receiptNo && <> &middot; {pkg.payment.receiptNo}</>}
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            {pkg.status === 'active' && remaining <= 2 && remaining > 0 && (
                              <span className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-full">
                                <AlertTriangle size={12} /> {remaining} left
                              </span>
                            )}
                            <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  pkg.status === 'completed' ? 'bg-blue-500' :
                                  pkg.status === 'expired' ? 'bg-red-400' : 'bg-teal'
                                }`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            {isExpanded ? <ChevronUp size={16} className="text-muted" /> : <ChevronDown size={16} className="text-muted" />}
                          </div>
                        </div>

                        {/* Expanded detail */}
                        {isExpanded && (
                          <div className="border-t border-gray-100 p-4 bg-light/50">
                            {/* Service / Treatment */}
                            {pkg.payment?.services?.length > 0 && (
                              <div className="mb-3">
                                <span className="text-xs bg-teal/10 text-teal px-2 py-0.5 rounded-full font-medium">
                                  {pkg.payment.services[0].description}
                                </span>
                              </div>
                            )}

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm mb-4">
                              <div>
                                <span className="text-muted text-xs">Start Date</span>
                                <div className="font-medium text-navy">{new Date(pkg.startDate).toLocaleDateString('en-IN')}</div>
                              </div>
                              <div>
                                <span className="text-muted text-xs">Expiry</span>
                                <div className="font-medium text-navy">{pkg.expiryDate ? new Date(pkg.expiryDate).toLocaleDateString('en-IN') : 'None'}</div>
                              </div>
                              <div>
                                <span className="text-muted text-xs">Remaining</span>
                                <div className="font-medium text-navy">{remaining} sessions</div>
                              </div>
                              <div>
                                <span className="text-muted text-xs">Receipt</span>
                                <div className="font-medium text-navy">{pkg.payment?.receiptNo || '—'}</div>
                              </div>
                            </div>

                            {/* Generate Receipt */}
                            {pkg.payment && (
                              <div className="mb-4">
                                <a
                                  href={`/admin/package-receipt/${pkg.id}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 text-xs text-teal font-medium hover:underline"
                                >
                                  <FileText size={14} /> Generate Receipt
                                </a>
                              </div>
                            )}

                            {/* Mark Visit (active only) */}
                            {pkg.status === 'active' && (
                              <div className="mb-4">
                                {visitForm === pkg.id ? (
                                  <div className="bg-white rounded-lg p-3 border border-gray-200 space-y-3">
                                    <div className="grid sm:grid-cols-2 gap-3">
                                      <div>
                                        <label className="form-label text-xs">Visit Date</label>
                                        <input type="date" className="input-field text-sm" value={visitDate} onChange={(e) => setVisitDate(e.target.value)} />
                                      </div>
                                      <div>
                                        <label className="form-label text-xs">Treatment Notes</label>
                                        <input className="input-field text-sm" placeholder="Notes..." value={visitNotes} onChange={(e) => setVisitNotes(e.target.value)} />
                                      </div>
                                    </div>
                                    <div className="flex gap-2">
                                      <button
                                        type="button"
                                        disabled={visitSaving}
                                        onClick={() => handleMarkVisit(pkg.id)}
                                        className="btn-teal text-xs py-2 px-3 disabled:opacity-60"
                                      >
                                        {visitSaving ? 'Saving...' : 'Confirm Visit'}
                                      </button>
                                      <button type="button" onClick={() => setVisitForm(null)} className="btn-outline text-xs py-2 px-3">
                                        Cancel
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => setVisitForm(pkg.id)}
                                    className="btn-teal text-xs py-2 px-3"
                                  >
                                    <Plus size={14} /> Mark Visit
                                  </button>
                                )}
                              </div>
                            )}

                            {/* Visit log */}
                            {pkg.visits && pkg.visits.length > 0 ? (
                              <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                  <thead>
                                    <tr className="text-xs text-muted uppercase border-b border-gray-200">
                                      <th className="text-left py-2 pr-3">Visit #</th>
                                      <th className="text-left py-2 pr-3">Date</th>
                                      <th className="text-left py-2 pr-3">Notes</th>
                                      <th className="text-left py-2 pr-3">Marked By</th>
                                      <th className="py-2 w-10"></th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {pkg.visits.map((v) => (
                                      <tr key={v.id} className="border-b border-gray-100">
                                        <td className="py-2 pr-3 font-medium text-navy">{v.visitNumber}</td>
                                        <td className="py-2 pr-3 text-muted">{new Date(v.visitDate).toLocaleDateString('en-IN')}</td>
                                        <td className="py-2 pr-3 text-muted">{v.treatmentNotes || '—'}</td>
                                        <td className="py-2 pr-3 text-muted">{v.markedBy || '—'}</td>
                                        <td className="py-2">
                                          <button
                                            type="button"
                                            onClick={() => handleDeleteVisit(pkg.id, v.id)}
                                            className="text-red-400 hover:text-red-600 transition-colors"
                                          >
                                            <Trash2 size={14} />
                                          </button>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            ) : (
                              <p className="text-muted text-xs text-center py-4">No visits recorded yet</p>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
