import { useEffect, useMemo, useState } from 'react'
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth'
import { AuthContext } from './auth-context'
import { adminEmail, auth, isFirebaseConfigured } from '../firebase'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [ready, setReady] = useState(!isFirebaseConfigured)

  useEffect(() => {
    if (!auth) return undefined

    return onAuthStateChanged(auth, (next) => {
      if (next && adminEmail && next.email?.toLowerCase() !== adminEmail) {
        signOut(auth)
        setUser(null)
        setReady(true)
        return
      }
      setUser(next)
      setReady(true)
    })
  }, [])

  const value = useMemo(
    () => ({
      user,
      ready,
      async login(email, password) {
        const credential = await signInWithEmailAndPassword(auth, email.trim(), password)
        if (adminEmail && credential.user.email?.toLowerCase() !== adminEmail) {
          await signOut(auth)
          const error = new Error('not admin')
          error.code = 'auth/not-admin'
          throw error
        }
      },
      logout() {
        return signOut(auth)
      },
    }),
    [user, ready],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
