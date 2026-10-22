import { useEffect, useRef, useState } from 'react'
import { formatCnic, formatPhone, formatWhen, initials, normalizePhone } from '../lib/format'

export default function MemberDetail({ member, onClose }) {
  const closeRef = useRef(null)
  const [photoFailed, setPhotoFailed] = useState(false)

  useEffect(() => {
    closeRef.current?.focus()
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    function onKey(event) {
      if (event.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  const phone = normalizePhone(member.phoneNumber)

  return (
    <div className="detail-backdrop" onClick={onClose}>
      <aside
        className="detail"
        role="dialog"
        aria-modal="true"
        aria-labelledby="member-detail-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="detail-bar">
          <p>Member details</p>
          <button ref={closeRef} className="btn btn-line btn-light" type="button" onClick={onClose}>
            Close
          </button>
        </div>

        {member.photoUrl && !photoFailed ? (
          <img
            className="detail-photo"
            src={member.photoUrl}
            alt={member.name}
            onError={() => setPhotoFailed(true)}
          />
        ) : (
          <div className="detail-photo detail-photo-fallback">{initials(member.name)}</div>
        )}

        <div className="detail-body">
          <h2 id="member-detail-title">{member.name}</h2>
          <p className="detail-father">Father: {member.fatherName}</p>

          <dl className="detail-list">
            <div>
              <dt>CNIC</dt>
              <dd className="num">{formatCnic(member.cnic)}</dd>
            </div>
            <div>
              <dt>Phone number</dt>
              <dd className="num">
                <a href={`tel:${phone}`}>{formatPhone(member.phoneNumber)}</a>
              </dd>
            </div>
            <div>
              <dt>Registered</dt>
              <dd>{formatWhen(member.createdAt, true)}</dd>
            </div>
          </dl>

          {member.photoUrl && !photoFailed ? (
            <a className="text-link" href={member.photoUrl} target="_blank" rel="noreferrer">
              Open photo
            </a>
          ) : null}
        </div>
      </aside>
    </div>
  )
}
