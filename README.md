# MyXpense - Smart Expense Tracker

> **MyXpense**: A smart, offline-first personal finance PWA built with React, TypeScript, and Firebase. Features AI insights, secure vault, and real-time cloud sync.

![Netlify Status](https://api.netlify.com/api/v1/badges/YOUR_NETLIFY_SITE_ID/deploy-status)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Overview

MyXpense is a Progressive Web App (PWA) built for smart expense and income tracking. It provides users with a robust financial management tool featuring offline-first storage with optional Firebase cloud backup, AI-powered insights, a secure Secret Vault for savings, and comprehensive financial tracking capabilities.

Our vision is to offer a comprehensive, user-friendly, and secure platform for personal financial management, targeting users who seek both advanced features and an intuitive interface.

## Key Features

-   **Smart Tracking**: Detailed logging, categorization, and filtering of transactions (Income, Expense, Transfer).
-   **Offline-First**: Fully functional offline with IndexedDB. Automatically syncs with Firebase Cloud when online.
-   **Secret Vault**: Secure, PIN-protected storage for savings with end-to-end encryption.
-   **Trip Splitting**: Track travel expenses, manage participants, and calculate settlements effortlessly.
-   **AI Insights**: Integrated AI assistant for smart financial insights and goal management.
-   **Receipt Scanning**: Smart image scanning for quick transaction entry.
-   **Cross-Device Sync**: Real-time synchronization across all your devices.
-   **Modern UI/UX**: Beautiful, mobile-first design with Dark Mode support and smooth Framer Motion animations.
## Screenshots

|   |   |
|---|---|
| ![Dashboard Mockup](https://via.placeholder.com/300x600?text=Dashboard) | ![Analytics Mockup](https://via.placeholder.com/300x600?text=Analytics) |
| **Dashboard** | **Analytics** |

## Tech Stack

-   **Frontend**: React.js, TypeScript, Vite
-   **Styling**: Tailwind CSS
-   **Animations**: Framer Motion
-   **Charts**: Recharts
-   **Icons**: Lucide React
-   **State/Storage**: React Context, IndexedDB (idb)
-   **Backend/Cloud**: Firebase (Auth, Firestore)
-   **AI**: OpenAI API / Gemini

## Getting Started

### Prerequisites
-   Node.js (v18 or higher)
-   npm or yarn

### Installation

1.  Clone the repository:
    ```bash
    git clone https://github.com/ianshulyadav/MyXpenseAPP.git
    cd MyXpenseAPP
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```

3.  Configure Environment Variables:
    Create a `.env` file in the root directory and add your Firebase and AI API keys:
    ```env
    VITE_FIREBASE_API_KEY=your_key
    VITE_FIREBASE_AUTH_DOMAIN=your_domain
    VITE_FIREBASE_PROJECT_ID=your_id
    VITE_FIREBASE_STORAGE_BUCKET=your_bucket
    VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
    VITE_FIREBASE_APP_ID=your_app_id
    VITE_OPENAI_API_KEY=your_openai_key
    ```

4.  Run the development server:
    ```bash
    npm run dev
    ```

5.  Open [http://localhost:5173](http://localhost:5173) to view it in the browser.

## Deployment

This project is optimized for deployment on Netlify.
1.  Connect your GitHub repo to Netlify.
2.  Set Build Command: `npm run build`
3.  Set Publish Directory: `dist`
4.  Add your environment variables in Netlify Settings.

## License

[MIT](LICENSE)
