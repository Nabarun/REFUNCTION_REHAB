import { Link, NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Users, CreditCard, MessageSquareQuote, Clock, CalendarDays, BarChart3, LogOut, Menu, X } from 'lucide-react'
import { useState } from 'react'

const nav = [
  { to: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/admin/patients',  icon: Users,            label: 'Patients'  },
  { to: '/admin/payments',      icon: CreditCard,          label: 'Payments'      },
  { to: '/admin/testimonials',  icon: MessageSquareQuote,  label: 'Testimonials'  },
  { to: '/admin/availability',  icon: Clock,               label: 'Availability'  },
  { to: '/admin/appointments',  icon: CalendarDays,        label: 'Appointments'  },
  { to: '/admin/analytics',     icon: BarChart3,           label: 'Analytics'     },
]

export default function AdminLayout({ children }) {
  const navigate  = useNavigate()
  const staff     = JSON.parse(localStorage.getItem('rfr_staff') || '{}')
  const [open, setOpen] = useState(false)

  const logout = () => {
    localStorage.removeItem('rfr_token')
    localStorage.removeItem('rfr_staff')
    navigate('/admin/login')
  }

  return (
    <div className="min-h-screen flex bg-light">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-60 bg-navy text-white flex flex-col transition-transform duration-300
        ${open ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
        {/* Logo */}
        <div className="px-5 py-5 border-b border-white/10">
          <Link to="/admin/dashboard" className="flex items-center gap-2">
            <svg width="28" height="28" viewBox="0 0 36 36" fill="none">
              <circle cx="22" cy="6" r="4" fill="#1A7F8E"/>
              <path d="M14 14c2-3 5-5 8-4l4 2-3 6-4-2-5 8 6 4-2 4-8-5 4-13z" fill="white"/>
              <path d="M10 18l-4 10h4l3-7 3 3 2-4-4-4-4 2z" fill="#1A7F8E"/>
            </svg>
            <span className="font-display font-bold text-sm leading-tight">
              <span style={{color:'#1A7F8E'}}>Re</span>Function<br/>Rehab
            </span>
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {nav.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isActive ? 'bg-teal text-white' : 'text-white/70 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              <Icon size={18} /> {label}
            </NavLink>
          ))}
        </nav>

        {/* User + Logout */}
        <div className="px-3 py-4 border-t border-white/10">
          <div className="px-3 py-2 mb-2">
            <div className="text-xs text-white/50">Logged in as</div>
            <div className="text-sm font-medium text-white truncate">{staff.name || 'Staff'}</div>
          </div>
          <button onClick={logout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm text-white/70 hover:bg-white/10 hover:text-white transition-colors">
            <LogOut size={18} /> Sign Out
          </button>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {open && <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setOpen(false)} />}

      {/* Main */}
      <div className="flex-1 lg:ml-60 flex flex-col min-h-screen">
        {/* Top bar */}
        <header className="bg-white border-b border-gray-100 px-4 sm:px-6 h-14 flex items-center justify-between sticky top-0 z-20">
          <button className="lg:hidden text-navy" onClick={() => setOpen(!open)}>
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
          <div className="hidden lg:block">
            <span className="text-muted text-sm">ReFunction Rehab — Admin Portal</span>
          </div>
          <Link to="/" target="_blank" className="text-teal text-sm hover:underline">
            View Website ↗
          </Link>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  )
}
