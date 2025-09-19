# Manchitra - Collaborative Map

Welcome to Manchitra, a collaborative mapping application that allows users to discover and contribute points of interest. This application is built with Next.js and Tailwind CSS, providing a modern and responsive user experience.

## Overview

Manchitra is a platform where users can:
- Add new places (points of interest) with names, descriptions, locations, and photos.
- View all contributed places on an interactive map.
- See contributions from other users.
- Report issues or provide feedback.

## Getting Started

To run this project locally, follow these steps:

1.  **Install Dependencies:**
    Open your terminal and run the following command to install the necessary packages.
    ```bash
    npm install
    ```

2.  **Run the Development Server:**
    After the installation is complete, start the development server.
    ```bash
    npm run dev
    ```

3.  **Open in Browser:**
    The application will be available at [http://localhost:9002](http://localhost:9002).

## Tech Stack

- **Framework:** [Next.js](https://nextjs.org/)
- **UI Components:** [ShadCN/UI](https://ui.shadcn.com/)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/)
- **AI Features:** [Genkit](https://firebase.google.com/docs/genkit)
- **Maps:** [Leaflet](https://leafletjs.com/) & [OpenStreetMap](https://www.openstreetmap.org/)

## Animations & UX

- **Welcome Animation (Login Only)**
  - Shown immediately after a successful login, once per browser session.
  - Controlled via `sessionStorage.welcome_after_login_shown`.

- **Love (Heart) Animation**
  - Clicking the Love button on any place card shows a 1s full-screen heart pulse.
  - The card is added to "What I've Seen" (`localStorage.seen-places`).

- **Card Created Animation**
  - After adding a new place, a 1s success pulse appears.
  - The place is saved to `localStorage.user-places`.

## Core Features & How To Use

- **Add Place**
  - Open the Add Place dialog from the profile menu.
  - Fill in: `Name`, `Description`, `Area (required)`, and set `Location` by search, map click, or "Use my location".
  - Optional single photo upload with preview and remove.
  - The dialog is scrollable when content exceeds the viewport.

- **Location Search & Map**
  - Suggestions show under the Location search (not under Name) to avoid overlap.
  - Press Enter or click Go to jump the mini-map marker to the first result.
  - Drag the marker or click the map to fine tune coordinates.

- **Love a Place**
  - Click the heart on any card to save its ID to `seen-places`.
  - The heart turns red for loved items.
  - A quick animation confirms the action.

- **What I've Seen**
  - Page shows only the loved places.
  - You can "Unlove" (remove) any place; it updates immediately.

- **Map Page**
  - Opens centered to a small bounding box if `?lat&lon` are present.
  - Supports searching via the header search box to move the view.
  - All contributed places (from `user-places`) are visible.

## Data Storage (Client-side)

- `localStorage.user-places`: Array of contributed places.
- `localStorage.seen-places`: Array of loved place IDs.
- `sessionStorage.welcome_after_login_shown`: Prevents repeat welcome in same session.

## Troubleshooting

- **Animations not visible**
  - Ensure no custom extensions are blocking overlays.
  - For Love animation, it’s rendered above the content; it disappears after 1s.

- **Location search not moving the map**
  - Press Enter in the Location box or click Go to resolve to coordinates.

- **What I've Seen is empty**
  - Love a card first; it stores the place ID in `seen-places`.

## Scripts

```bash
npm run dev       # start development server (default port 9002)
npm run build     # production build
npm run start     # run production server
```

## Email Reports & Notifications

When a user submits the form at `src/app/dashboard/report-issue/page.tsx`, the app sends:
- An email to the admin inbox (`EMAIL_ADMIN`).
- A confirmation email to the reporting user.

This is powered by a server route at `src/app/api/report/route.ts` using Nodemailer.
To enable email delivery, configure SMTP in your environment:

Create a `.env.local` file in the project root with:

```env
# SMTP transport settings
SMTP_HOST=smtp.yourprovider.com
SMTP_PORT=587
SMTP_SECURE=false           # true if you use port 465
SMTP_USER=your_smtp_username
SMTP_PASS=your_smtp_password

# From address and admin recipient
EMAIL_FROM=Manchitra <no-reply@yourdomain.com>
EMAIL_ADMIN=you@yourdomain.com
```

Restart the dev server after adding environment variables.

### Testing
- Open `http://localhost:9002/dashboard/report-issue`.
- Submit the form; you should receive an admin email and the user should receive a confirmation.
- Check server logs for `/api/report` if delivery fails.

## Notes

- The app uses client-side storage to prototype contributions and favorites. If you clear browser storage, lists will reset.
- You can fine-tune the animation duration by changing the `setTimeout(..., 1000)` calls in relevant components.

## MongoDB Setup

To store submitted reports, the app connects to MongoDB using `src/lib/mongodb.ts` and persists to the `reports` collection from the API route `src/app/api/report/route.ts`.

1. Add the following to `.env.local`:

```env
# MongoDB
MONGODB_URI=mongodb+srv://<USERNAME>:<PASSWORD>@cluster0.ldgilhn.mongodb.net/?retryWrites=true&w=majority
MONGODB_DB=manchitra
```

Important: If your password contains special characters like `@`, `:` or `/`, URL‑encode them. For example, replace `@` with `%40`.

Example with the provided credentials (password contains `@`):

```
MONGODB_URI=mongodb+srv://dbaidya811:dbaidya811%402006@cluster0.ldgilhn.mongodb.net/?retryWrites=true&w=majority
```

2. Install the MongoDB Node.js driver:

```bash
npm install mongodb
```

3. Restart the dev server.

Now, every report submission will be saved in the `reports` collection of the `manchitra` database.
