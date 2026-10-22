import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { adminEmail, isFirebaseConfigured } from '../firebase'
import { loginErrorMessage } from '../lib/format'

export default function LoginPage() {
  const { user, ready, login } = useAuth()
  const [email, setEmail] = useState(adminEmail)
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    document.title = 'Sign in · Swabi Muscle Gym'
  }, [])

  if (!ready) return <div className="splash">Opening the desk…</div>
  if (user) return <Navigate to="/" replace />

  async function handleSubmit(event) {
    event.preventDefault()
    if (!isFirebaseConfigured) return
    setError('')
    setSubmitting(true)
    try {
      await login(email, password)
    } catch (loginError) {
      setError(loginErrorMessage(loginError))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="login">
      <form className="gate" onSubmit={handleSubmit}>
        <p className="gate-kicker">Swabi Muscle Gym</p>
        <h1>Sign in</h1>
        <p className="gate-note">Admin desk for member registration.</p>

        {!isFirebaseConfigured ? (
          <p className="gate-alert">
            Add the Firebase keys to <code>.env.local</code>, then restart the dev server.
          </p>
        ) : null}

        <label className="gate-field" htmlFor="admin-email">
          <span>Email</span>
          <input
            id="admin-email"
            type="email"
            autoComplete="username"
            placeholder="admin@gym.com"
            value={email}
            disabled={!isFirebaseConfigured || submitting}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </label>

        <div className="gate-field">
          <label htmlFor="admin-password">Password</label>
          <div className="gate-password">
            <input
              id="admin-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="Enter password"
              value={password}
              disabled={!isFirebaseConfigured || submitting}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((current) => !current)}
              disabled={!isFirebaseConfigured}
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
        </div>

        {error ? <p className="gate-alert">{error}</p> : null}

        <button className="gate-submit" type="submit" disabled={!isFirebaseConfigured || submitting}>
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </main>
  )
}
