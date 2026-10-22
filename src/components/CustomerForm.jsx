import { useState } from 'react'
import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage'
import { addDoc, collection, getDocs, limit, query, serverTimestamp, where } from 'firebase/firestore'
import { useAuth } from '../hooks/useAuth'
import { db, storage } from '../firebase-data'
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

export default function CustomerForm({ onSaved }) {
  const { user } = useAuth()
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
    if (Object.keys(nextErrors).length > 0) return

    const member = {
      name: cleanName(values.name),
      fatherName: cleanName(values.fatherName),
      cnic: digitsOnly(values.cnic),
      phoneNumber: normalizePhone(values.phoneNumber),
    }

    setSaving(true)
    let photoPath = ''
    try {
      const existing = await getDocs(
        query(collection(db, 'customers'), where('cnic', '==', member.cnic), limit(1)),
      )
      if (!existing.empty) {
        const error = new Error('duplicate')
        error.code = 'app/duplicate-cnic'
        throw error
      }

      photoPath = `customers/${user.uid}/${Date.now()}.jpg`
      const photoRef = ref(storage, photoPath)
      await uploadBytes(photoRef, photoBlob, { contentType: 'image/jpeg' })
      const photoUrl = await getDownloadURL(photoRef)

      const docRef = await addDoc(collection(db, 'customers'), {
        ...member,
        photoUrl,
        photoPath,
        createdAt: serverTimestamp(),
      })

      setValues(emptyForm)
      setPhotoBlob(null)
      setPhotoKey((key) => key + 1)
      setSuccess(`${member.name} is on the ledger.`)
      onSaved?.({ id: docRef.id, ...member, photoUrl, photoPath, createdAt: null })
    } catch (error) {
      if (photoPath) {
        await deleteObject(ref(storage, photoPath)).catch(() => {})
      }
      setFormError(saveErrorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="sheet form-sheet" onSubmit={handleSubmit} noValidate>
      <div className="sheet-head">
        <h2>New member</h2>
        <p>All fields are required.</p>
      </div>

      <label className="field" htmlFor="member-name">
        <span>Name</span>
        <input
          id="member-name"
          name="name"
          autoComplete="name"
          maxLength={80}
          value={values.name}
          disabled={saving}
          aria-invalid={Boolean(errors.name)}
          onChange={(event) => updateField('name', event.target.value)}
        />
        {errors.name ? <small className="field-error">{errors.name}</small> : null}
      </label>

      <label className="field" htmlFor="father-name">
        <span>Father name</span>
        <input
          id="father-name"
          name="fatherName"
          autoComplete="off"
          maxLength={80}
          value={values.fatherName}
          disabled={saving}
          aria-invalid={Boolean(errors.fatherName)}
          onChange={(event) => updateField('fatherName', event.target.value)}
        />
        {errors.fatherName ? <small className="field-error">{errors.fatherName}</small> : null}
      </label>

      <label className="field" htmlFor="cnic">
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
        {errors.cnic ? <small className="field-error">{errors.cnic}</small> : null}
      </label>

      <label className="field" htmlFor="phone-number">
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
        {errors.phoneNumber ? <small className="field-error">{errors.phoneNumber}</small> : null}
      </label>

      <fieldset className="field" disabled={saving}>
        <legend>Picture</legend>
        <p className="field-hint">Use the camera, or attach a picture from this device.</p>
        <PhotoPicker
          key={photoKey}
          disabled={saving}
          onBlob={(blob) => {
            setPhotoBlob(blob)
            setErrors((current) => ({ ...current, photo: undefined }))
            setSuccess('')
          }}
        />
        {errors.photo ? <small className="field-error">{errors.photo}</small> : null}
      </fieldset>

      {formError ? <p className="banner banner-error">{formError}</p> : null}
      {success ? <p className="banner banner-success">{success}</p> : null}

      <button className="btn btn-primary btn-block" type="submit" disabled={saving}>
        {saving ? 'Saving…' : 'Save member'}
      </button>
    </form>
  )
}
