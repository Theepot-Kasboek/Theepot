'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabase } from '@/lib/supabase'
import { Eye, EyeOff, LogIn } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [wachtwoord, setWachtwoord] = useState('')
  const [toonWachtwoord, setToonWachtwoord] = useState(false)
  const [laden, setLaden] = useState(false)
  const [fout, setFout] = useState('')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLaden(true)
    setFout('')

    const supabase = getSupabase()
    const { error } = await supabase.auth.signInWithPassword({ email, password: wachtwoord })

    if (error) {
      setFout('Verkeerde inloggegevens. Probeer het opnieuw.')
      setLaden(false)
    } else {
      router.push('/')
      router.refresh()
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg)',
        padding: 20,
      }}
    >
      <div style={{ width: '100%', maxWidth: 380 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div
            style={{
              width: 52,
              height: 52,
              background: 'var(--primary)',
              borderRadius: 14,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 12px',
              fontFamily: 'Sora, sans-serif',
              fontSize: 20,
              fontWeight: 700,
              color: '#fff',
            }}
          >
            DM
          </div>
          <h1
            style={{
              fontFamily: 'Sora, sans-serif',
              fontSize: 20,
              fontWeight: 700,
              marginBottom: 4,
            }}
          >
            De Molen
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            Log in om verder te gaan
          </p>
        </div>

        {/* Formulier */}
        <div className="card">
          <div className="card-body">
            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label className="form-label">E-mailadres</label>
                <input
                  type="email"
                  className="form-input"
                  placeholder="naam@demolen.nl"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="form-label">Wachtwoord</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={toonWachtwoord ? 'text' : 'password'}
                    className="form-input"
                    placeholder="••••••••"
                    value={wachtwoord}
                    onChange={(e) => setWachtwoord(e.target.value)}
                    required
                    style={{ paddingRight: 40 }}
                  />
                  <button
                    type="button"
                    onClick={() => setToonWachtwoord(!toonWachtwoord)}
                    style={{
                      position: 'absolute',
                      right: 10,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--text-muted)',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    {toonWachtwoord ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {fout && (
                <p
                  style={{
                    fontSize: 12,
                    color: 'var(--danger)',
                    background: '#FCEBEB',
                    padding: '8px 12px',
                    borderRadius: 7,
                    margin: 0,
                  }}
                >
                  {fout}
                </p>
              )}

              <button
                type="submit"
                className="btn btn-primary"
                disabled={laden}
                style={{ justifyContent: 'center', marginTop: 4 }}
              >
                <LogIn size={15} />
                {laden ? 'Inloggen...' : 'Inloggen'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
