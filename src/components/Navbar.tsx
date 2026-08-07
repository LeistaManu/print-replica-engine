// src/components/Navbar.tsx

import { useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'

import {
  isLoggedIn,
  subscribeSession,
  logout,
  login,
} from '@/lib/deriv-auth'
import { DERIV_SIGNUP_URL, SUPPORT_PHONE } from '@/lib/deriv'

export default function Navbar() {
  const [loggedIn, setLoggedIn] = useState(false)

  useEffect(() => {
    // initial state
    setLoggedIn(isLoggedIn())

    // update instantly on login/logout
    return subscribeSession(() => {
      setLoggedIn(isLoggedIn())
    })
  }, [])

  return (
    <header className="sticky top-0 z-50 border-b border-slate-800 bg-slate-950/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-pink-300" />
          <span className="text-lg font-bold text-white">
            DigitTool Deriv
          </span>
        </Link>

        {/* Navigation */}
        <nav className="hidden items-center gap-6 md:flex">
          <Link to="/" className="text-sm text-slate-300 hover:text-white">
            Home
          </Link>

          {loggedIn && (
            <Link
              to="/app/dashboard"
              className="text-sm text-slate-300 hover:text-white"
            >
              Dashboard
            </Link>
          )}

          <a
            href={`tel:${SUPPORT_PHONE}`}
            className="text-sm text-slate-300 hover:text-white"
          >
            Support
          </a>
        </nav>

        {/* Auth buttons */}
        <div className="flex items-center gap-3">
          {loggedIn ? (
            <button
              onClick={() => logout('/')}
              className="rounded-xl bg-slate-800 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
            >
              Logout
            </button>
          ) : (
            <>
              <button
                onClick={() => login('/app/dashboard')}
                className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-medium text-white transition hover:border-slate-500 hover:bg-slate-900"
              >
                Log in
              </button>

              <a
                href={DERIV_SIGNUP_URL}
                className="rounded-xl bg-pink-200 px-4 py-2 text-sm font-medium text-black transition hover:bg-pink-100"
              >
                Sign up
              </a>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
