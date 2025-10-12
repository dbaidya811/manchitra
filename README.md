# 🗺️ Manchitra - Your Hoping Partner

[![Next.js](https://img.shields.io/badge/Next.js-14.2-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38bdf8?logo=tailwind-css)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)

A modern, intelligent navigation and location-sharing platform with real-time routing, smart history tracking, and social features. Built with Next.js, featuring advanced map integration, voice guidance, and collaborative exploration.

## ✨ Overview

Manchitra is a comprehensive location-based platform that enables users to:

### 🎯 Core Features
- 📍 **Smart Navigation** - Real-time routing with voice guidance and turn-by-turn directions
- 🗺️ **Interactive Maps** - Powered by Leaflet and OpenStreetMap with smooth animations
- 📊 **Location History** - Intelligent tracking with auto-status updates (Not Visited → On Routing → Visited)
- 🤝 **Social Feed** - Share experiences, photos, and polls with the community
- 🎨 **Modern UI** - Beautiful gradients, animations, and glassmorphism effects
- 🔐 **Secure Auth** - Google OAuth and email/OTP authentication via NextAuth
- 📱 **PWA Ready** - Offline support and installable as a mobile app
- 🎤 **Voice Navigation** - Female voice guidance with pre-alerts and turn notifications

### 🚀 Advanced Features
- **Point-to-Point Routing** - Filter locations within 10km radius and create optimal routes
- **Nearest-First Algorithm** - Greedy nearest-neighbor routing for multi-stop journeys
- **Swipe to Delete** - Intuitive gesture controls for history management
- **Auto-Status Updates** - Background location tracking with 175m visit detection
- **Color-Coded Routes** - Visual distinction between active and completed segments
- **Emoji Picker** - Rich emoji support in posts with search functionality
- **Poll System** - Create and vote on polls with real-time updates
- **Data Export** - Backup and restore your data anytime

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

## 🛠️ Tech Stack

### Frontend
- **Framework:** [Next.js 14.2](https://nextjs.org/) - React framework with App Router
- **Language:** [TypeScript 5.0](https://www.typescriptlang.org/) - Type-safe development
- **Styling:** [Tailwind CSS 3.4](https://tailwindcss.com/) - Utility-first CSS
- **UI Components:** [ShadCN/UI](https://ui.shadcn.com/) - Accessible component library
- **Maps:** [React Leaflet](https://react-leaflet.js.org/) - Interactive map components
- **Icons:** [Lucide React](https://lucide.dev/) - Beautiful icon set

### Backend & Services
- **Authentication:** [NextAuth.js](https://next-auth.js.org/) - OAuth & credential auth
- **Database:** [MongoDB](https://www.mongodb.com/) - NoSQL database
- **Email:** [Nodemailer](https://nodemailer.com/) - Email notifications
- **AI:** [Google Genkit](https://firebase.google.com/docs/genkit) - AI-powered features
- **Routing:** [OSRM](https://project-osrm.org/) - Open-source routing engine

### Additional Tools
- **State Management:** React Hooks (useState, useEffect, useCallback, useMemo)
- **Audio:** Web Speech API - Voice guidance
- **Geolocation:** Navigator API - Real-time location tracking
- **Storage:** LocalStorage & SessionStorage - Client-side persistence

## 🎨 Animations & UX

### Modern Animations
- ✨ **Fade-in-up** - Smooth entrance animations
- 💫 **Shimmer** - Loading state effects
- 🎈 **Float** - Floating marker animations
- 🌊 **Ripple** - User location pulse effect
- 🎯 **Bounce-in** - Modal entrance animations
- 📊 **Scale-pulse** - Interactive element feedback
- 🌈 **Gradient-shift** - Animated button backgrounds

### User Experience
- **Dashboard Audio** - Welcome tone plays once per session
- **Voice Guidance** - Turn-by-turn navigation with female voice
- **Swipe Gestures** - Right-to-left swipe to delete history items
- **Auto-redirect** - Logged-in users skip login page
- **Smooth Zoom** - Enhanced map zoom with 0.5 increments
- **Corner Accents** - Modern emerald borders on map container
- **Status Tags** - Color-coded badges (Not Visited, On Routing, Visited)
- **Glassmorphism** - Frosted glass effects on UI elements

## 📖 Feature Guide

### 🗺️ Navigation & Routing
- **Smart Routing** - Point-to-point navigation with real-time updates
- **Voice Guidance** - Female voice with 100m pre-alerts and 25m final alerts
- **Multi-Stop Planning** - Nearest-first algorithm for optimal routes
- **Color-Coded Routes** - Red (active), Green (completed), Blue (on-routing)
- **Off-Route Detection** - Auto-alerts when 30m+ off planned path
- **Smooth Zoom** - 0.5 increment zoom with animations

### 📊 History Tracking
- **Auto-Status Updates** - Background location monitoring
- **Three States**: Not Visited → On Routing → Visited
- **175m Detection** - Auto-marks as visited within range
- **Swipe to Delete** - Right-to-left gesture on cards
- **Search & Filter** - Find locations by name

### 🤝 Social Features
- **Feed Posts** - Share photos, text, and polls
- **Emoji Picker** - 220+ emojis with search
- **Poll System** - Create polls with multiple options
- **Like & Comment** - Engage with community posts
- **Real-time Updates** - 500ms auto-refresh

### 🔐 Authentication
- **Google OAuth** - One-click sign in
- **Email/OTP** - Secure email authentication
- **30-Day Session** - Stay logged in for a month
- **Auto-Redirect** - Skip login if already authenticated

## 💾 Data Storage

### LocalStorage
- `visit-history` - Location visit records with status
- `search-history` - Search query history
- `seen-places` - Favorited location IDs
- `user-places` - User-contributed places
- `anon_id` - Anonymous user identifier

### SessionStorage
- `welcome_shown_[email]` - Welcome screen display flag
- `dashboard_audio_played` - Audio playback flag
- `welcome_after_login_shown` - Login welcome flag

### Database (MongoDB)
- `users` - User profiles and authentication
- `places` - All contributed locations
- `feed` - Social feed posts
- `reports` - User-submitted reports

## Troubleshooting

- **Animations not visible**
  - Ensure no custom extensions are blocking overlays.
  - For Love animation, it’s rendered above the content; it disappears after 1s.

- **Location search not moving the map**
  - Press Enter in the Location box or click Go to resolve to coordinates.

- **What I've Seen is empty**
  - Love a card first; it stores the place ID in `seen-places`.

## 🚀 Scripts

```bash
npm install       # Install dependencies
npm run dev       # Start development server (port 9002)
npm run build     # Create production build
npm run start     # Run production server
npm run lint      # Run ESLint
```

## 📄 License

This project is licensed under the [Apache License 2.0](LICENSE).

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

## 🔐 Security Features

### Implemented
- ✅ Input validation and sanitization (`src/lib/validation.ts`)
- ✅ Rate limiting helpers - 100 requests/second (`src/lib/auth-check.ts`)
- ✅ Error logging system (`src/lib/logger.ts`)
- ✅ Performance monitoring (`src/lib/performance.ts`)
- ✅ Data export/backup (`src/lib/data-export.ts`)
- ✅ Session management (30-day JWT)
- ✅ HTTPS-only in production

### Recommended
- 🔧 Add CSP headers (see `SECURITY_RECOMMENDATIONS.md`)
- 🔧 Enable rate limiting on API routes
- 🔧 Implement 2FA for sensitive operations
- 🔧 Add CORS configuration
- 🔧 Regular security audits

## 📱 PWA Support

- ✅ Manifest file configured (`public/manifest.json`)
- ✅ Offline-ready architecture
- ✅ Installable on mobile devices
- ✅ App shortcuts for quick access
- 🔧 Service worker (TODO)

## 📚 Documentation

- `SECURITY_RECOMMENDATIONS.md` - Complete security guide
- `IMPLEMENTATION_GUIDE.md` - Quick start implementation
- `README.md` - This file

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- [OpenStreetMap](https://www.openstreetmap.org/) - Map data
- [OSRM](https://project-osrm.org/) - Routing engine
- [Leaflet](https://leafletjs.com/) - Map library
- [ShadCN/UI](https://ui.shadcn.com/) - UI components
- [Vercel](https://vercel.com/) - Hosting platform

## 📞 Support

For issues and questions:
- Open an issue on GitHub
- Check existing documentation
- Review security recommendations

---

**Built with ❤️ using Next.js and TypeScript**
