# Swabi Muscle Gym

Admin desk for registering gym members. One admin signs in, adds a member (name, father name, CNIC, phone, and a photo from the camera or a file), and the record is stored in Firebase. The same desk lists every member and supports view, edit, and delete. Gym workout tracks stream from the free Audius API.

Photos are saved inside Firestore with each member record, so Firebase Storage / Blaze billing is not required.

## Firebase setup

1. Create a Firebase project and add a Web app.
2. Enable **Authentication → Email/Password**.
3. Add one admin user under **Authentication → Users**.
4. Create a **Cloud Firestore** database.
5. Publish `firestore.rules` from this repo in the Firestore **Rules** tab.
   - Update the admin email inside `firestore.rules` so it matches `VITE_ADMIN_EMAIL`.
6. Copy `.env.example` to `.env.local` and paste the web app config. Set `VITE_ADMIN_EMAIL` to that admin user so no other account can open the desk.

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
- `npm run deploy:hosting` — build and deploy Firebase Hosting
- `npm run deploy:rules` — publish Firestore rules
- `npm run deploy` — build and deploy hosting + rules

## Production deploy

1. Confirm `.env.local` has the live Firebase keys and `VITE_ADMIN_EMAIL`.
2. Confirm `firestore.rules` uses the same admin email, then publish rules.
3. Build and deploy:

```bash
npm run build
npm run preview   # optional local check of dist
npm run deploy    # needs Firebase CLI: npm i -g firebase-tools && firebase login
```

Hosting serves `dist`, rewrites all routes to `index.html`, and sends basic security headers.
