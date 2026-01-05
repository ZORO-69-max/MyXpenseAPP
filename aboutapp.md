# MyXpense - Smart Expense Tracker

## Overview

MyXpense is a Progressive Web App (PWA) built with React.js for smart expense and income tracking. It provides users with a robust financial management tool featuring offline-first storage with optional Firebase cloud backup, AI-powered insights, a secure Secret Vault for savings, and comprehensive financial tracking capabilities. Its business vision is to offer a comprehensive, user-friendly, and secure platform for personal financial management, targeting users who seek both advanced features and an intuitive interface.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
The application features a mobile-first PWA design with a blue-teal primary theme, Inter font with system font fallbacks, and Lucide React icons. It incorporates enhanced shadows, gradients, and smooth transitions and animations using Framer Motion. Skeleton loaders provide a better user experience during data loading, and interactions are optimized for touch devices. Dark mode is supported. Navigation and modals are designed for consistent user experience, with specific z-index values to ensure visibility and proper content scrolling. The "Total Worth" display is confined to the Secret Vault dashboard for privacy.

### Recent Changes (November 2024)
- **Income Icon Feature**: Income transactions now automatically display with a Money/Banknote icon for easy visual identification in trip expenses.
- **Transfer Filter & Color**: Added filter buttons to toggle between Expense (red), Income (green), and Transfer (purple) transactions. Transfers now display with purple color to distinguish from income and expenses.
- **Transfer Settlement Fix**: Corrected inverted balance logic for transfers - when someone transfers money (settles debt), their balance increases while the receiver's balance decreases. Example: If you owe ₹200 and transfer ₹300, you overpaid by ₹100, so they now owe you.
- **Trip Income Feature**: Trip income (pocket money) is now personal-only with no splits, and automatically adds to main balance when trip ends as a separate income transaction.
- **Secret Vault Cloud Sync**: Returning users on new devices now properly restore vault from cloud - checks for cloud vault before showing setup, creates placeholder for PIN entry.
- **Data Import Enhancement**: Now supports importing trips and trip expenses with proper date conversion and shows detailed import summary.
- **Settlement Breakdown Modal**: Shows transfers in the expense breakdown with proper debt narrative and 💸 icon.
- **Multi-Device Sync**: Always fetches from cloud on load, not just when local data is empty.
- **Mobile Responsiveness**: Enhanced BottomNav with flex layout, proper safe-area handling, and xs: breakpoint for small screens. No button overlaps on any screen size.
- **PWA Install Prompt**: Improved professional modal with iOS Safari instructions, session-based dismissal on login page, localStorage with 3-day cooldown on other pages. Single global instance with route-aware behavior.
- **Toast Notifications**: Added 'notification' variant with different sound frequencies, progress bar animation, title/message support, and click handlers.
- **Secret Vault Redesign**: Modern professional dark theme with indigo/violet/purple gradients, glassmorphism effects, and proper mobile responsive sizing. Same functionality preserved.
- **Global CSS**: Professional Inter font with system font fallbacks, antialiased rendering, xs: custom breakpoint (375px), smooth scrolling, and safe-area utility classes.

### Technical Implementations
- **Frontend**: Developed with React.js and TypeScript, using Vite as a build tool. Styling is managed with Tailwind CSS.
- **Authentication**: Dual-mode authentication system supporting Firebase Auth (email/password, Google sign-in) and a local fallback with SHA-256 hashed passwords in localStorage. Seamless switching is based on Firebase configuration status.
- **Data Storage**: Hybrid IndexedDB + Firebase Firestore architecture provides instant local storage (primary) and optional cloud backup. All operations are local-first for responsiveness.
- **Sync Service**: A comprehensive data sync system with IndexedDB as primary and Firebase as backup. It features a four-tier priority sync engine (CRITICAL, HIGH, NORMAL, LOW) with rate limiting, intelligent retry scheduling, and end-to-end AES-256-GCM encryption for vault data. It also includes data compression, soft delete with 30-day retention, and audit logging. Background sync queue processes operations every 3 seconds, with periodic full backups.
- **State Management**: React Context API handles global state, while the `idb` library manages data persistence via IndexedDB.
- **Offline Support**: Fully offline-capable with Service Worker and IndexedDB, ensuring functionality without Firebase.
- **Notifications**: Browser-native notifications for reminders and alerts.

### Feature Specifications
- **AI Chat Assistant**: Provides smart insights, goal management, and app usage guidance.
- **Secret Vault**: Offers secure, PIN-protected storage for funds with encryption and transaction history.
- **Trip Expense Splitting**: Tracks travel expenses with participant management, balance calculations, and settlement tracking.
- **Expense & Income Tracking**: Detailed logging, categorization, and filtering of transactions.
- **Budgeting & Goals**: Functionality for setting and tracking financial goals and budgets, including personalized recommendations.
- **Notifications**: Push notifications for alerts (e.g., low balance, budget reminders) and daily summaries.
- **Receipt/UPI Scanning**: Image upload with compression for transaction evidence.
- **Data Management**: Includes import/export capabilities (JSON and CSV) with flexible CSV field mapping, and user profile settings.

### System Design Choices
The architecture uses a **local-first, offline-ready** approach with IndexedDB as the primary data store for instant UI responsiveness. Firebase Firestore provides optional cloud backup. The authentication model supports both Firebase Auth and a local fallback. Cloud sync requires Firebase Auth and includes security rules for nested user data structures. The app gracefully falls back to local-only mode if Firebase sync fails.

## External Dependencies

- **React + TypeScript**: UI framework and type safety.
- **Vite**: Build tool and development server.
- **Tailwind CSS**: Utility-first CSS framework.
- **Framer Motion**: Animation library for smooth transitions.
- **Recharts**: Charting library for financial visualizations.
- **React Router v6**: Client-side routing.
- **idb**: IndexedDB wrapper for local data persistence.
- **Firebase**: Optional cloud backup (Firestore) and authentication.
- **Lucide React**: Icon library.
- **OpenAI API**: (Optional) For AI-powered insights and natural language processing.
- **PWA**: Progressive Web App capabilities with Service Worker.