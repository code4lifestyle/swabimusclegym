import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'
import { app } from './firebase'

export const db = app ? getFirestore(app) : null
export const storage = app ? getStorage(app) : null
