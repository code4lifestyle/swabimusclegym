export function digitsOnly(value) {
  return String(value || '').replace(/\D/g, '')
}

export function cleanName(value) {
  return String(value || '').trim().replace(/\s+/g, ' ')
}

export function isValidName(value) {
  const name = cleanName(value)
  return name.length >= 2 && name.length <= 80
}

export function formatCnic(value) {
  const digits = digitsOnly(value).slice(0, 13)
  const parts = [digits.slice(0, 5), digits.slice(5, 12), digits.slice(12, 13)].filter(Boolean)
  return parts.join('-')
}

export function isValidCnic(value) {
  return digitsOnly(value).length === 13
}

export function normalizePhone(value) {
  let digits = digitsOnly(value)
  if (digits.startsWith('0092')) digits = `0${digits.slice(4)}`
  else if (digits.startsWith('92')) digits = `0${digits.slice(2)}`
  return digits.slice(0, 11)
}

export function formatPhone(value) {
  const digits = normalizePhone(value)
  if (digits.length <= 4) return digits
  return `${digits.slice(0, 4)} ${digits.slice(4)}`
}

export function isValidPhone(value) {
  return /^03\d{9}$/.test(normalizePhone(value))
}

export function formatWhen(timestamp, withTime = false) {
  const date = timestamp?.toDate?.()
  if (!date) return 'Just now'
  return date.toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    ...(withTime ? { hour: 'numeric', minute: '2-digit' } : {}),
  })
}

export function memberMatches(member, search) {
  const query = search.trim().toLowerCase()
  if (!query) return true

  const text = [member.name, member.fatherName, formatCnic(member.cnic), formatPhone(member.phoneNumber)]
    .join(' ')
    .toLowerCase()

  if (text.includes(query)) return true

  const queryDigits = digitsOnly(query)
  if (queryDigits.length < 3) return false
  return digitsOnly(`${member.cnic || ''}${member.phoneNumber || ''}`).includes(queryDigits)
}

export function initials(name) {
  return cleanName(name)
    .split(' ')
    .slice(0, 2)
    .map((part) => part[0] || '')
    .join('')
    .toUpperCase()
}

export function loginErrorMessage(error) {
  switch (error?.code) {
    case 'auth/invalid-email':
      return 'Enter the admin email address.'
    case 'auth/missing-password':
      return 'Enter the admin password.'
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'That email or password does not match the admin account.'
    case 'auth/too-many-requests':
      return 'Too many attempts. Wait a few minutes and try again.'
    case 'auth/network-request-failed':
      return 'Network problem. Check the connection and try again.'
    case 'auth/not-admin':
      return 'This account is not the gym admin.'
    default:
      return 'Sign in failed. Check the email, password, and Firebase setup.'
  }
}

export function saveErrorMessage(error) {
  if (error?.code === 'app/duplicate-cnic') {
    return 'A member with this CNIC is already registered.'
  }

  const code = String(error?.code || '')
  if (code.includes('permission-denied') || code.includes('unauthorized')) {
    return 'Firebase blocked the save. Publish the Firestore and Storage rules, then try again.'
  }
  if (code.includes('network') || code.includes('unavailable')) {
    return 'Network problem. Check the connection and try again.'
  }
  return 'Could not save this member. Try again.'
}
