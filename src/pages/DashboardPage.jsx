import { useCallback, useEffect, useMemo, useState } from 'react'
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore'
import { useAuth } from '../hooks/useAuth'
import { db } from '../firebase-data'
import { formatCnic, formatPhone, formatWhen, initials, memberMatches } from '../lib/format'
import CustomerForm from '../components/CustomerForm'
import MemberDetail from '../components/MemberDetail'

export default function DashboardPage() {
  const { user, logout } = useAuth()
  const [members, setMembers] = useState([])
  const [status, setStatus] = useState('loading')
  const [listError, setListError] = useState('')
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState(null)
  const [draftMember, setDraftMember] = useState(null)
  const closeDetail = useCallback(() => {
    setSelectedId(null)
    setDraftMember(null)
  }, [])
  const selected =
    members.find((member) => member.id === selectedId) ||
    (draftMember?.id === selectedId ? draftMember : null)

  function openMember(member) {
    setDraftMember(member)
    setSelectedId(member.id)
  }

  useEffect(() => {
    document.title = 'Desk · Swabi Muscle Gym'
  }, [])

  useEffect(() => {
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

  return (
    <div className="desk">
      <header className="topbar">
        <div className="topbar-inner">
          <div className="brand-lockup">
            <span className="mark">SM</span>
            <div>
              <strong>Swabi Muscle Gym</strong>
              <span>Front desk</span>
            </div>
          </div>
          <div className="topbar-actions">
            <p>{user?.email}</p>
            <button className="btn btn-line btn-light" type="button" onClick={logout}>
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="desk-body">
        <CustomerForm onSaved={openMember} />

        <section className="sheet list-sheet">
          <div className="sheet-head list-head">
            <div>
              <h2>Members</h2>
              <p>
                {status === 'ready'
                  ? search
                    ? `${visibleMembers.length} of ${members.length} shown`
                    : `${members.length} on the ledger`
                  : 'Loading records'}
              </p>
            </div>
            <label className="search" htmlFor="member-search">
              <span className="sr-only">Search members</span>
              <input
                id="member-search"
                type="search"
                placeholder="Search name, CNIC, phone"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>
          </div>

          {listError ? <p className="banner banner-error">{listError}</p> : null}

          {status === 'loading' ? (
            <div className="skeleton-list" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
          ) : null}

          {status === 'ready' && visibleMembers.length === 0 ? (
            <p className="empty">
              {members.length === 0
                ? 'The ledger is empty. Register the first member.'
                : 'No member matches that search.'}
            </p>
          ) : null}

          {status === 'ready' && visibleMembers.length > 0 ? (
            <div className="member-list">
              {visibleMembers.map((member) => (
                <button
                  key={member.id}
                  className="member-row"
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
      </main>

      {selected ? <MemberDetail key={selected.id} member={selected} onClose={closeDetail} /> : null}
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
