import { Outlet, NavLink, Link } from 'react-router-dom'
import { 
  LayoutDashboard, 
  Coins, 
  Bell, 
  TrendingUp,
  Github 
} from 'lucide-react'
import clsx from 'clsx'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/cryptos', icon: Coins, label: 'Criptomoedas' },
  { to: '/alerts', icon: Bell, label: 'Alertas' },
]

export default function Layout() {
  return (
    <div className="min-h-screen bg-crypto-darker">
      <header className="bg-crypto-dark border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <div className="p-2 rounded-lg gradient-primary">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold text-white">
                Crypto Monitor
              </span>
            </Link>

            <nav className="hidden md:flex items-center gap-1">
              {navItems.map(({ to, icon: Icon, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    clsx(
                      'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-crypto-primary text-white'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    )
                  }
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </NavLink>
              ))}
            </nav>

            <a
              href="https://github.com/bruno-lindquist/crypto_monitor"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <Github className="w-5 h-5" />
            </a>
          </div>
        </div>
      </header>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-crypto-dark border-t border-slate-800 z-50">
        <div className="flex items-center justify-around">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                clsx(
                  'flex flex-col items-center gap-1 px-4 py-3 text-xs font-medium transition-colors',
                  isActive
                    ? 'text-crypto-primary'
                    : 'text-slate-400'
                )
              }
            >
              <Icon className="w-5 h-5" />
              {label}
            </NavLink>
          ))}
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24 md:pb-8">
        <Outlet />
      </main>
    </div>
  )
}
