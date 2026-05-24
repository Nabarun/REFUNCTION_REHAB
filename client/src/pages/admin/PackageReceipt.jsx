import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { CheckCircle } from 'lucide-react'
import { getPackageDetails } from '../../lib/api'

// ─── Number to words (Indian Rupees) ────────────────────────────────────────
const ones = ['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine',
  'Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen']
const tens = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety']

function numberToWords(num) {
  if (num === 0) return 'Zero Rupees only'
  const n = Math.abs(Math.round(num))
  if (n === 0) return 'Zero Rupees only'

  function convert(n) {
    if (n < 20) return ones[n]
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '')
    if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + convert(n % 100) : '')
    if (n < 100000) return convert(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + convert(n % 1000) : '')
    if (n < 10000000) return convert(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 ? ' ' + convert(n % 100000) : '')
    return convert(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 ? ' ' + convert(n % 10000000) : '')
  }

  return convert(n) + ' Rupees only'
}

export default function PackageReceipt() {
  const { packageId } = useParams()
  const navigate = useNavigate()
  const [pkg, setPkg] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [referredBy, setReferredBy] = useState('')

  useEffect(() => {
    async function load() {
      try {
        const res = await getPackageDetails(packageId)
        setPkg(res.data)
        // Leave blank so doctor can fill in the referring doctor's name
        setReferredBy('')
      } catch {
        setError('Failed to load package details.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [packageId])

  if (loading) {
    return (
      <div className="min-h-screen bg-light flex items-center justify-center">
        <p className="text-muted text-sm">Loading receipt...</p>
      </div>
    )
  }

  if (error || !pkg) {
    return (
      <div className="min-h-screen bg-light flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 text-sm mb-3">{error || 'Package not found.'}</p>
          <button onClick={() => navigate('/admin/patients')} className="btn-outline text-sm py-2 px-4">
            Back to Patients
          </button>
        </div>
      </div>
    )
  }

  const { patient, payment } = pkg
  const services = payment?.services || []
  const totalAmount = Number(payment?.totalAmount ?? 0)
  const amountPaid = Number(payment?.amountPaid ?? 0)
  const balance = totalAmount - amountPaid
  const subTotal = services.reduce((sum, s) => sum + Number(s.amount || 0), 0)

  return (
    <div className="min-h-screen bg-light py-10">
      <div className="max-w-2xl mx-auto px-4">
        <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100">
          {/* Header */}
          <div className="bg-navy text-white p-8 text-center">
            <div className="font-display font-bold text-2xl mb-1">
              <span style={{ color: '#1A7F8E' }}>Re</span>Function Rehab
            </div>
            <div className="text-white/70 text-sm mt-1">3001, Wing 3, SDA, Panathur, Bengaluru</div>
            <div className="text-white/70 text-sm">Phone no.: 9900911795</div>
            <div className="mt-3 bg-white/10 rounded-xl p-2.5 inline-block">
              <CheckCircle size={28} className="text-green-400 mx-auto" />
            </div>
          </div>

          <div className="p-6 space-y-5 text-sm">
            {/* Tax Invoice Title */}
            <div className="text-center">
              <h2 className="font-display font-bold text-lg text-navy">Tax Invoice</h2>
            </div>

            {/* Invoice No & Date */}
            <div className="grid grid-cols-2 gap-4 pb-4 border-b border-gray-100">
              <div>
                <span className="text-muted text-xs">Invoice No.</span>
                <div className="font-semibold text-navy">{payment?.receiptNo || '—'}</div>
              </div>
              <div className="text-right">
                <span className="text-muted text-xs">Date</span>
                <div className="font-semibold text-navy">
                  {payment?.paymentDate
                    ? new Date(payment.paymentDate).toLocaleDateString('en-IN')
                    : new Date().toLocaleDateString('en-IN')}
                </div>
              </div>
            </div>

            {/* Bill To */}
            <div className="pb-4 border-b border-gray-100">
              <span className="text-muted text-xs font-semibold uppercase tracking-wide">Bill To:</span>
              <div className="font-semibold text-navy mt-1">{patient?.fullName || '—'}</div>
              <div className="text-muted">{patient?.mobile || '—'}</div>
            </div>

            {/* Services Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-light text-xs text-muted uppercase">
                    <th className="text-left py-2.5 px-3 rounded-l-lg">#</th>
                    <th className="text-left py-2.5 px-3">Service</th>
                    <th className="text-right py-2.5 px-3">Qty</th>
                    <th className="text-right py-2.5 px-3">Rate</th>
                    <th className="text-right py-2.5 px-3">GST</th>
                    <th className="text-right py-2.5 px-3 rounded-r-lg">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {services.map((s, i) => (
                    <tr key={i} className="border-b border-gray-100">
                      <td className="py-2.5 px-3 text-muted">{i + 1}</td>
                      <td className="py-2.5 px-3 text-navy">{s.description}</td>
                      <td className="py-2.5 px-3 text-right text-navy">{s.qty}</td>
                      <td className="py-2.5 px-3 text-right text-navy">₹{Number(s.unitRate).toLocaleString('en-IN')}</td>
                      <td className="py-2.5 px-3 text-right text-navy">0%</td>
                      <td className="py-2.5 px-3 text-right font-semibold text-navy">₹{Number(s.amount).toLocaleString('en-IN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals Breakdown */}
            <div className="flex justify-end">
              <div className="w-64 space-y-2 text-sm">
                <div className="flex justify-between text-muted">
                  <span>Sub Total</span>
                  <span>₹{subTotal.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-muted">
                  <span>SGST@0.0%</span>
                  <span>₹0</span>
                </div>
                <div className="flex justify-between text-muted">
                  <span>CGST@0.0%</span>
                  <span>₹0</span>
                </div>
                <div className="flex justify-between font-bold text-white bg-teal rounded-lg px-3 py-2 text-base">
                  <span>Total</span>
                  <span>₹{totalAmount.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-muted pt-1">
                  <span>Received</span>
                  <span>₹{amountPaid.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between font-semibold text-navy">
                  <span>Balance</span>
                  <span>₹{balance.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>

            {/* Invoice Amount In Words */}
            <div className="bg-light rounded-xl p-3 border border-gray-100">
              <span className="text-muted text-xs font-semibold uppercase tracking-wide">Invoice Amount In Words:</span>
              <div className="font-semibold text-navy mt-1">{numberToWords(totalAmount)}</div>
            </div>

            {/* Referred By */}
            <div className="pb-4 border-b border-gray-100">
              <span className="text-muted text-xs">Referred By</span>
              <input
                className="no-print input-field text-sm py-2 mt-1"
                value={referredBy}
                onChange={(e) => setReferredBy(e.target.value)}
                placeholder="Enter referral source..."
              />
              <div className="hidden print:block font-semibold text-navy mt-1">
                {referredBy || '—'}
              </div>
            </div>

            {/* Terms and Conditions */}
            <div className="border-t border-gray-100 pt-4">
              <span className="text-muted text-xs font-semibold uppercase tracking-wide">Terms And Conditions:</span>
              <p className="text-muted text-sm mt-1">Thank you for doing business with us.</p>
            </div>

            {/* Authorized Signatory */}
            <div className="text-right pt-6">
              <div className="text-sm font-semibold text-navy">For: ReFunction Rehab</div>
              <div className="mt-4 inline-block">
                <img src="/images/dr-neha-signature.png" alt="Dr. Neha Trivedi Signature" className="h-16 ml-auto" />
                <div className="border-t border-gray-300 w-48 mt-1">
                  <div className="text-xs text-muted mt-1">Authorized Signatory</div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="p-6 pt-0 flex gap-3 no-print">
            <button onClick={() => window.print()} className="btn-teal flex-1 justify-center text-sm py-2.5">
              Print Receipt
            </button>
            <button onClick={() => navigate('/admin/patients')} className="btn-outline flex-1 justify-center text-sm py-2.5">
              Back
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
