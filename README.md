# Swabi Muscle Gym

Admin desk for registering gym members. One admin signs in, adds a member (name, father name, CNIC, phone, and a photo from the camera or a file), and the record is stored in Firebase. The same desk lists every member and opens the full details.

## Firebase setup

1. Create a Firebase project and add a Web app.
2. Enable **Authentication → Email/Password**.
3. Add one admin user under **Authentication → Users**.
4. Create a **Cloud Firestore** database.
5. Create a **Storage** bucket.
6. Publish `firestore.rules` and `storage.rules` (Firebase console or `firebase deploy --only firestore:rules,storage`).
7. Copy `.env.example` to `.env.local` and paste the web app config. Set `VITE_ADMIN_EMAIL` to that admin user so no other account can open the desk.

```bash
npm install
npm run dev
```

Restart the dev server after changing `.env.local`.

## Scripts

- `npm run dev` — local desk
- `npm run build` — production build into `dist`
- `npm run preview` — serve the production build
- `npm run lint` — oxlint

Firebase Hosting is configured in `firebase.json` to serve `dist` and route every path back to `index.html`. Build with the env values present, then deploy hosting.
# swabimusclegym
