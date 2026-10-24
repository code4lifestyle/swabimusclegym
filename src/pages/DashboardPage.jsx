import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore'
import { useAuth } from '../hooks/useAuth'
import { db } from '../firebase-data'
import { formatCnic, formatPhone, formatWhen, initials, memberMatches } from '../lib/format'
import ActionToast from '../components/ActionToast'
import CustomerForm from '../components/CustomerForm'
import GymMusicPlayer from '../components/GymMusicPlayer'
import MemberDetail from '../components/MemberDetail'

const SceneBackdrop = lazy(() => import('../components/SceneBackdrop'))

export default function DashboardPage() {
  const { user, logout } = useAuth()
  const [members, setMembers] = useState([])
  const [status, setStatus] = useState('loading')
  const [listError, setListError] = useState('')
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState(null)
  const [draftMember, setDraftMember] = useState(null)
  const [toast, setToast] = useState(null)
  const [flashId, setFlashId] = useState(null)
  const closeDetail = useCallback(() => {
    setSelectedId(null)
    setDraftMember(null)
  }, [])
  const clearToast = useCallback(() => setToast(null), [])
  const selected =
    members.find((member) => member.id === selectedId) ||
    (draftMember?.id === selectedId ? draftMember : null)

  function showToast(message, tone = 'success') {
    setToast({ id: Date.now(), message, tone })
  }

  function openMember(member) {
    setDraftMember(member)
    setSelectedId(member.id)
  }

  function handleSaved(member) {
    openMember(member)
    setFlashId(member.id)
    window.setTimeout(() => setFlashId(null), 1400)
  }

  function handleUpdated(member) {
    setDraftMember(member)
    setFlashId(member.id)
    window.setTimeout(() => setFlashId(null), 1400)
  }

  function handleDeleted(id) {
    if (selectedId === id) closeDetail()
    setFlashId(null)
  }

  useEffect(() => {
    document.title = 'Desk · Swabi Muscle Gym'
  }, [])

  useEffect(() => {
    if (!db) {
      setStatus('error')
      setListError('Firebase is not configured for this build.')
      return undefined
    }

    const membersQuery = query(collection(db, 'customers'), orderBy('createdAt', 'desc'))
    return onSnapshot(
      membersQuery,
      (snapshot) => {
        setMembers(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })))
        setStatus('ready')
        setListError('')
      },
      () => {
        setStatus('error')
        setListError('The member list could not be loaded. Check the Firestore rules and connection.')
      },
    )
  }, [])

  const visibleMembers = useMemo(
    () => members.filter((member) => memberMatches(member, search)),
    [members, search],
  )

  const countLabel =
    status === 'ready'
      ? search
        ? `${visibleMembers.length} of ${members.length}`
        : `${members.length} members`
      : 'Loading'

  return (
    <div className="desk">
      <Suspense fallback={null}>
        <SceneBackdrop variant="desk" />
      </Suspense>
      <header className="desk-top">
        <div className="brand-lockup">
          <span className="mark">SM</span>
          <div>
            <strong>Swabi Muscle Gym</strong>
            <span>Front desk</span>
          </div>
        </div>
        <div className="topbar-actions">
          <p>{user?.email}</p>
          <button className="gate-link" type="button" onClick={logout}>
            Sign out
          </button>
        </div>
      </header>

      <main className="desk-stage">
        <aside className="desk-copy">
          <p className="gate-kicker">Member desk</p>
          <h2 className="desk-title">
            Register
            <br />
            members
          </h2>
          <p className="gate-note">Add a member on the right. Open any record from the list below.</p>
        </aside>

        <section className="ledger">
          <div className="ledger-head">
            <div>
              <p className="gate-kicker">Ledger</p>
              <h3>Members</h3>
              <p className="gate-note">{countLabel}</p>
            </div>
            <label className="gate-field ledger-search" htmlFor="member-search">
              <span>Search</span>
              <input
                id="member-search"
                type="search"
                placeholder="Name, CNIC, phone"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>
          </div>

          {listError ? <p className="gate-alert">{listError}</p> : null}

          {status === 'loading' ? (
            <div className="skeleton-list" aria-hidden="true">
              <span />
              <span />
            </div>
          ) : null}

          {status === 'ready' && visibleMembers.length === 0 ? (
            <p className="empty">
              {members.length === 0
                ? 'No members yet. Use the form to register the first one.'
                : 'No member matches that search.'}
            </p>
          ) : null}

          {status === 'ready' && visibleMembers.length > 0 ? (
            <div className="member-list">
              {visibleMembers.map((member) => (
                <button
                  key={member.id}
                  className={`member-row ${flashId === member.id ? 'is-flash' : ''}`}
                  type="button"
                  onClick={() => openMember(member)}
                >
                  <MemberAvatar member={member} />
                  <span className="member-copy">
                    <strong>{member.name}</strong>
                    <span>{member.fatherName}</span>
                    <span className="num">
                      {formatCnic(member.cnic)} · {formatPhone(member.phoneNumber)}
                    </span>
                  </span>
                  <span className="member-when">{formatWhen(member.createdAt)}</span>
                </button>
              ))}
            </div>
          ) : null}
        </section>

        <GymMusicPlayer />
        <CustomerForm onSaved={handleSaved} onToast={showToast} />
      </main>

      {selected ? (
        <MemberDetail
          key={selected.id}
          member={selected}
          onClose={closeDetail}
          onUpdated={handleUpdated}
          onDeleted={handleDeleted}
          onToast={showToast}
        />
      ) : null}

      <ActionToast toast={toast} onDone={clearToast} />
    </div>
  )
}

function MemberAvatar({ member }) {
  const [failed, setFailed] = useState(false)
  if (!member.photoUrl || failed) {
    return <span className="avatar avatar-fallback">{initials(member.name)}</span>
  }
  return <img className="avatar" src={member.photoUrl} alt="" onError={() => setFailed(true)} />
}
