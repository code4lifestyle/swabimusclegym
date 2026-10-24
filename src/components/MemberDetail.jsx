import { useEffect, useRef, useState } from 'react'
import {
  deleteDoc,
  doc,
  getDocs,
  limit,
  query,
  collection,
  updateDoc,
  where,
} from 'firebase/firestore'
import { db } from '../firebase-data'
import {
  cleanName,
  digitsOnly,
  formatCnic,
  formatPhone,
  formatWhen,
  initials,
  isValidCnic,
  isValidName,
  isValidPhone,
  normalizePhone,
  saveErrorMessage,
} from '../lib/format'
import { blobToDataUrl } from '../lib/image'
import PhotoPicker from './PhotoPicker'

function validateEdit(values, hasPhoto) {
  const errors = {}
  if (!isValidName(values.name)) errors.name = 'Enter the member name.'
  if (!isValidName(values.fatherName)) errors.fatherName = 'Enter the father name.'
  if (!isValidCnic(values.cnic)) errors.cnic = 'Enter a 13-digit CNIC.'
  if (!isValidPhone(values.phoneNumber)) errors.phoneNumber = 'Enter a mobile number like 0300 1234567.'
  if (!hasPhoto) errors.photo = 'Keep the current picture, or add a new one.'
  return errors
}

export default function MemberDetail({ member, onClose, onUpdated, onDeleted, onToast }) {
  const closeRef = useRef(null)
  const [mode, setMode] = useState('view')
  const [photoFailed, setPhotoFailed] = useState(false)
  const [values, setValues] = useState({
    name: member.name || '',
    fatherName: member.fatherName || '',
    cnic: formatCnic(member.cnic),
    phoneNumber: formatPhone(member.phoneNumber),
  })
  const [photoBlob, setPhotoBlob] = useState(null)
  const [keepPhoto, setKeepPhoto] = useState(true)
  const [photoKey, setPhotoKey] = useState(0)
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [busy, setBusy] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [panelState, setPanelState] = useState('')

  useEffect(() => {
    closeRef.current?.focus()
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    function onKey(event) {
      if (event.key !== 'Escape' || busy) return
      if (confirmDelete) setConfirmDelete(false)
      else if (mode === 'edit') {
        setMode('view')
        setFormError('')
        setErrors({})
        setPhotoBlob(null)
        setKeepPhoto(true)
      } else onClose()
    }

    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKey)
    }
  }, [onClose, mode, confirmDelete, busy])

  useEffect(() => {
    setPhotoFailed(false)
    setValues({
      name: member.name || '',
      fatherName: member.fatherName || '',
      cnic: formatCnic(member.cnic),
      phoneNumber: formatPhone(member.phoneNumber),
    })
  }, [member])

  const phone = normalizePhone(member.phoneNumber)

  function updateField(field, value) {
    setValues((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: undefined }))
    setFormError('')
  }

  function startEdit() {
    setMode('edit')
    setConfirmDelete(false)
    setFormError('')
    setErrors({})
    setPhotoBlob(null)
    setKeepPhoto(true)
    setPhotoKey((key) => key + 1)
  }

  function cancelEdit() {
    setMode('view')
    setConfirmDelete(false)
    setFormError('')
    setErrors({})
    setPhotoBlob(null)
    setKeepPhoto(true)
    setValues({
      name: member.name || '',
      fatherName: member.fatherName || '',
      cnic: formatCnic(member.cnic),
      phoneNumber: formatPhone(member.phoneNumber),
    })
  }

  async function handleSave(event) {
    event.preventDefault()
    const hasPhoto = Boolean(photoBlob) || (keepPhoto && Boolean(member.photoUrl))
    const nextErrors = validateEdit(values, hasPhoto)
    setErrors(nextErrors)
    setFormError('')
    if (Object.keys(nextErrors).length > 0) {
      setFormError('Fix the highlighted fields before saving.')
      return
    }

    const nextMember = {
      name: cleanName(values.name),
      fatherName: cleanName(values.fatherName),
      cnic: digitsOnly(values.cnic),
      phoneNumber: normalizePhone(values.phoneNumber),
    }

    setBusy(true)
    setPanelState('is-saving')
    try {
      if (nextMember.cnic !== digitsOnly(member.cnic)) {
        try {
          const existing = await getDocs(
            query(collection(db, 'customers'), where('cnic', '==', nextMember.cnic), limit(1)),
          )
          if (!existing.empty && existing.docs[0].id !== member.id) {
            const error = new Error('duplicate')
            error.code = 'app/duplicate-cnic'
            throw error
          }
        } catch (lookupError) {
          if (lookupError?.code === 'app/duplicate-cnic') throw lookupError
        }
      }

      const photoUrl = photoBlob ? await blobToDataUrl(photoBlob) : member.photoUrl
      await updateDoc(doc(db, 'customers', member.id), {
        ...nextMember,
        photoUrl,
      })

      const updated = { ...member, ...nextMember, photoUrl }
      setPanelState('is-success')
      onToast?.(`${nextMember.name} was updated.`, 'edit')
      onUpdated?.(updated)
      window.setTimeout(() => {
        setMode('view')
        setPanelState('')
        setPhotoBlob(null)
        setKeepPhoto(true)
      }, 420)
    } catch (error) {
      console.error('Update member failed:', error)
      setFormError(saveErrorMessage(error))
      setPanelState('')
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete() {
    setBusy(true)
    setFormError('')
    setPanelState('is-leaving')
    try {
      await deleteDoc(doc(db, 'customers', member.id))
      onToast?.(`${member.name} was removed from the ledger.`, 'delete')
      window.setTimeout(() => onDeleted?.(member.id), 380)
    } catch (error) {
      console.error('Delete member failed:', error)
      setFormError(saveErrorMessage(error))
      setPanelState('')
      setConfirmDelete(false)
      setBusy(false)
    }
  }

  return (
    <div className="detail-backdrop" onClick={busy ? undefined : onClose}>
      <aside
        className={`gate detail-gate ${panelState}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="member-detail-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="detail-gate-top">
          <p className="gate-kicker">Swabi Muscle Gym</p>
          <button
            ref={closeRef}
            className="gate-link"
            type="button"
            onClick={onClose}
            disabled={busy}
          >
            Close
          </button>
        </div>

        {mode === 'view' ? (
          <>
            <h1 id="member-detail-title">{member.name}</h1>
            <p className="gate-note">Member record on the desk ledger.</p>

            <div className="gate-field">
              <span>Name</span>
              <p className="gate-value">{member.name}</p>
            </div>
            <div className="gate-field">
              <span>Father name</span>
              <p className="gate-value">{member.fatherName}</p>
            </div>
            <div className="gate-field">
              <span>CNIC</span>
              <p className="gate-value num">{formatCnic(member.cnic)}</p>
            </div>
            <div className="gate-field">
              <span>Phone number</span>
              <p className="gate-value num">
                <a href={`tel:${phone}`}>{formatPhone(member.phoneNumber)}</a>
              </p>
            </div>
            <div className="gate-field">
              <span>Registered</span>
              <p className="gate-value">{formatWhen(member.createdAt, true)}</p>
            </div>

            <div className="gate-photo">
              <p className="gate-kicker">Picture</p>
              <p className="gate-note">Saved with this member record.</p>
              {member.photoUrl && !photoFailed ? (
                <div className="photo-frame">
                  <img
                    src={member.photoUrl}
                    alt={member.name}
                    onError={() => setPhotoFailed(true)}
                  />
                </div>
              ) : (
                <div className="photo-empty detail-photo-fallback">{initials(member.name)}</div>
              )}
            </div>

            {formError ? <p className="gate-alert">{formError}</p> : null}

            {confirmDelete ? (
              <div className="detail-confirm">
                <p className="gate-note">Delete {member.name} permanently from the ledger?</p>
                <div className="detail-actions">
                  <button className="action-btn action-btn-delete" type="button" onClick={handleDelete} disabled={busy}>
                    {busy ? 'Deleting…' : 'Yes, delete'}
                  </button>
                  <button
                    className="gate-link"
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    disabled={busy}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="detail-actions">
                <button className="action-btn action-btn-edit" type="button" onClick={startEdit} disabled={busy}>
                  Edit
                </button>
                <button
                  className="action-btn action-btn-delete"
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  disabled={busy}
                >
                  Delete
                </button>
              </div>
            )}
          </>
        ) : (
          <form className="detail-edit" onSubmit={handleSave} noValidate>
            <h1 id="member-detail-title">Edit member</h1>
            <p className="gate-note">Update the record, then save.</p>

            <label className="gate-field" htmlFor="edit-name">
              <span>Name</span>
              <input
                id="edit-name"
                value={values.name}
                maxLength={80}
                disabled={busy}
                aria-invalid={Boolean(errors.name)}
                onChange={(event) => updateField('name', event.target.value)}
              />
            </label>
            {errors.name ? <p className="gate-alert">{errors.name}</p> : null}

            <label className="gate-field" htmlFor="edit-father">
              <span>Father name</span>
              <input
                id="edit-father"
                value={values.fatherName}
                maxLength={80}
                disabled={busy}
                aria-invalid={Boolean(errors.fatherName)}
                onChange={(event) => updateField('fatherName', event.target.value)}
              />
            </label>
            {errors.fatherName ? <p className="gate-alert">{errors.fatherName}</p> : null}

            <label className="gate-field" htmlFor="edit-cnic">
              <span>CNIC</span>
              <input
                id="edit-cnic"
                inputMode="numeric"
                maxLength={15}
                value={values.cnic}
                disabled={busy}
                aria-invalid={Boolean(errors.cnic)}
                onChange={(event) => updateField('cnic', formatCnic(event.target.value))}
              />
            </label>
            {errors.cnic ? <p className="gate-alert">{errors.cnic}</p> : null}

            <label className="gate-field" htmlFor="edit-phone">
              <span>Phone number</span>
              <input
                id="edit-phone"
                type="tel"
                inputMode="tel"
                maxLength={18}
                value={values.phoneNumber}
                disabled={busy}
                aria-invalid={Boolean(errors.phoneNumber)}
                onChange={(event) => updateField('phoneNumber', formatPhone(event.target.value))}
              />
            </label>
            {errors.phoneNumber ? <p className="gate-alert">{errors.phoneNumber}</p> : null}

            <div className="gate-photo" aria-disabled={busy}>
              <p className="gate-kicker">Picture</p>
              <p className="gate-note">Keep the current picture, or replace it.</p>
              <PhotoPicker
                key={photoKey}
                disabled={busy}
                initialUrl={member.photoUrl}
                onBlob={(blob) => {
                  setPhotoBlob(blob)
                  setKeepPhoto(Boolean(blob))
                  setErrors((current) => ({ ...current, photo: undefined }))
                }}
              />
              {errors.photo ? <p className="gate-alert">{errors.photo}</p> : null}
            </div>

            {formError ? <p className="gate-alert">{formError}</p> : null}

            <div className="detail-actions">
              <button className="action-btn action-btn-edit" type="submit" disabled={busy}>
                {busy ? 'Saving…' : 'Save changes'}
              </button>
              <button className="gate-link" type="button" onClick={cancelEdit} disabled={busy}>
                Cancel
              </button>
            </div>
          </form>
        )}
      </aside>
    </div>
  )
}
