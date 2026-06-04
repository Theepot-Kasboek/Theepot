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
          <img
            src="data:image/jpeg;base64,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"
            alt="De Theepot"
            style={{ width: 160, height: 160, objectFit: 'contain', display: 'block', margin: '0 auto 14px' }}
          />
          <h1
            style={{
              fontFamily: 'Sora, sans-serif',
              fontSize: 20,
              fontWeight: 700,
              marginBottom: 4,
            }}
          >
            Kinderopvang de Theepot
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
                  placeholder="naam@bsodetheepot.nl"
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
