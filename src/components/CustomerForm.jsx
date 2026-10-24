import { useState } from 'react'
import { addDoc, collection, getDocs, limit, query, serverTimestamp, where } from 'firebase/firestore'
import { db } from '../firebase-data'
import {
  cleanName,
  digitsOnly,
  formatCnic,
  formatPhone,
  isValidCnic,
  isValidName,
  isValidPhone,
  normalizePhone,
  saveErrorMessage,
} from '../lib/format'
import { blobToDataUrl } from '../lib/image'
import PhotoPicker from './PhotoPicker'

const emptyForm = {
  name: '',
  fatherName: '',
  cnic: '',
  phoneNumber: '',
}

function validate(values, photoBlob) {
  const errors = {}
  if (!isValidName(values.name)) errors.name = 'Enter the member name.'
  if (!isValidName(values.fatherName)) errors.fatherName = 'Enter the father name.'
  if (!isValidCnic(values.cnic)) errors.cnic = 'Enter a 13-digit CNIC.'
  if (!isValidPhone(values.phoneNumber)) errors.phoneNumber = 'Enter a mobile number like 0300 1234567.'
  if (!photoBlob) errors.photo = 'Take a photo or attach a picture.'
  return errors
}

export default function CustomerForm({ onSaved, onToast }) {
  const [values, setValues] = useState(emptyForm)
  const [photoBlob, setPhotoBlob] = useState(null)
  const [photoKey, setPhotoKey] = useState(0)
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [success, setSuccess] = useState('')
  const [saving, setSaving] = useState(false)

  function updateField(field, value) {
    setValues((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: undefined }))
    setSuccess('')
  }

  async function handleSubmit(event) {
    event.preventDefault()
    const nextErrors = validate(values, photoBlob)
    setErrors(nextErrors)
    setFormError('')
    setSuccess('')
    if (Object.keys(nextErrors).length > 0) {
      setFormError('Fill every field and add a picture before saving.')
      return
    }

    const member = {
      name: cleanName(values.name),
      fatherName: cleanName(values.fatherName),
      cnic: digitsOnly(values.cnic),
      phoneNumber: normalizePhone(values.phoneNumber),
    }

    setSaving(true)
    try {
      try {
        const existing = await getDocs(
          query(collection(db, 'customers'), where('cnic', '==', member.cnic), limit(1)),
        )
        if (!existing.empty) {
          const error = new Error('duplicate')
          error.code = 'app/duplicate-cnic'
          throw error
        }
      } catch (lookupError) {
        if (lookupError?.code === 'app/duplicate-cnic') throw lookupError
        // Continue to save if the uniqueness check is blocked by rules/index.
      }

      const photoUrl = await blobToDataUrl(photoBlob)
      const docRef = await addDoc(collection(db, 'customers'), {
        ...member,
        photoUrl,
        createdAt: serverTimestamp(),
      })

      setValues(emptyForm)
      setPhotoBlob(null)
      setPhotoKey((key) => key + 1)
      setSuccess(`${member.name} is on the ledger.`)
      onToast?.(`${member.name} was added to the ledger.`, 'add')
      onSaved?.({ id: docRef.id, ...member, photoUrl, createdAt: null })
    } catch (error) {
      console.error('Save member failed:', error)
      setFormError(saveErrorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="gate member-gate" onSubmit={handleSubmit} noValidate>
      <p className="gate-kicker">Swabi Muscle Gym</p>
      <h1>
        Add new
        <br />
        member
      </h1>

      <label className="gate-field" htmlFor="member-name">
        <span>Name</span>
        <input
          id="member-name"
          name="name"
          autoComplete="name"
          placeholder="Member name"
          maxLength={80}
          value={values.name}
          disabled={saving}
          aria-invalid={Boolean(errors.name)}
          onChange={(event) => updateField('name', event.target.value)}
        />
      </label>
      {errors.name ? <p className="gate-alert">{errors.name}</p> : null}

      <label className="gate-field" htmlFor="father-name">
        <span>Father name</span>
        <input
          id="father-name"
          name="fatherName"
          autoComplete="off"
          placeholder="Father name"
          maxLength={80}
          value={values.fatherName}
          disabled={saving}
          aria-invalid={Boolean(errors.fatherName)}
          onChange={(event) => updateField('fatherName', event.target.value)}
        />
      </label>
      {errors.fatherName ? <p className="gate-alert">{errors.fatherName}</p> : null}

      <label className="gate-field" htmlFor="cnic">
        <span>CNIC</span>
        <input
          id="cnic"
          name="cnic"
          inputMode="numeric"
          autoComplete="off"
          placeholder="12345-1234567-1"
          maxLength={15}
          value={values.cnic}
          disabled={saving}
          aria-invalid={Boolean(errors.cnic)}
          onChange={(event) => updateField('cnic', formatCnic(event.target.value))}
        />
      </label>
      {errors.cnic ? <p className="gate-alert">{errors.cnic}</p> : null}

      <label className="gate-field" htmlFor="phone-number">
        <span>Phone number</span>
        <input
          id="phone-number"
          name="phoneNumber"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="0300 1234567"
          maxLength={18}
          value={values.phoneNumber}
          disabled={saving}
          aria-invalid={Boolean(errors.phoneNumber)}
          onChange={(event) => updateField('phoneNumber', formatPhone(event.target.value))}
        />
      </label>
      {errors.phoneNumber ? <p className="gate-alert">{errors.phoneNumber}</p> : null}

      <div className="gate-photo" aria-disabled={saving}>
        <p className="gate-kicker">Picture</p>
        <p className="gate-note">Use the camera, or attach a picture.</p>
        <PhotoPicker
          key={photoKey}
          disabled={saving}
          onBlob={(blob) => {
            setPhotoBlob(blob)
            setErrors((current) => ({ ...current, photo: undefined }))
            setSuccess('')
          }}
        />
        {errors.photo ? <p className="gate-alert">{errors.photo}</p> : null}
      </div>

      {formError ? <p className="gate-alert">{formError}</p> : null}
      {success ? <p className="gate-success">{success}</p> : null}

      <button
        className={`action-btn action-btn-add ${saving ? 'is-busy' : ''} ${success ? 'is-done' : ''}`}
        type="submit"
        disabled={saving}
      >
        {saving ? 'Saving…' : success ? 'Saved' : 'Save member'}
      </button>
    </form>
  )
}
