# Spresso19 Application Context & Architecture Report

## Overview
**Spresso AI Personal Shopper** (also featuring **Bargain Chef AI**) is a highly interactive, generative AI-powered web application. It acts as a comprehensive shopping concierge and cooking assistant. The app offers real-time multimodal (voice and video) chat interactions, virtual try-ons, location-based local store shopping, and automated order tracking.

> [!NOTE]
> The `/android-cli describe` command was run against this repository as requested, but it returned `Error: gradlew not found` because this is a **web application** (React + Express), not an Android native app.

## Frontend Architecture
The frontend is a **React 19** Single Page Application (SPA) built with **Vite** and styled using **Tailwind CSS v4**.

- **State Management & Data Fetching**: Standard React Hooks (`useState`, `useEffect`) are used for local state, cart management, and fetching data from the backend APIs.
- **Authentication**: Powered by **Firebase Auth** (supporting Google login and anonymous login). User profiles are synced to both Cloud SQL (via backend) and Firestore.
- **Styling & Theming**: Employs a custom "Dynamic Light/Dark Theme & Material You Seed State" using dynamic CSS variables for adaptive color palettes.

### Layout and Screens
The application layout centers around a persistent **Top AppBar** and a **Navigation Drawer Sidebar** (which acts as a drawer overlay on mobile). A floating "AI Personal Shopper" button is available globally on non-chat screens.

The main tabs/screens (`src/App.tsx`) are:
1. **Chat**: Multimodal real-time conversational interface (`PersonalAIShopperChat`).
2. **For You**: Product catalog and recommendations (`ProductCatalog`).
3. **Adaptive Layouts**: A master-detail navigable scaffold for exploring products (`NavigableListDetailPaneScaffold`).
4. **Wardrobe**: Virtual try-on and wardrobe management (`WardrobeView`).
5. **Order History**: Order tracking and post-purchase workflows (`OrdersTracker`).
6. **Grocery List**: Location-aware grocery planning (`GroceryListView`).
7. **Creator**: GenAI agents for creator campaigns (`CreatorGenAIAgentsChat`).
8. **Vision**: Smart vision search via image uploads/camera (`SmartVisionView`).

It also features numerous Modals for Virtual Try-On, Checkout (HITL - Human In The Loop), Google Lens, Location Permission, and Dynamic Theming.

## Backend Architecture
The backend is a **Node.js Express** server (`server.ts`) that serves both API endpoints and static assets. 
During development, it uses Vite's middleware to hot-reload the React app. In production, it serves the compiled React bundle from `dist`.

- **Database**: Uses **PostgreSQL** with **Drizzle ORM** (`src/db/schema.ts`).
- **WebSockets (Real-time)**: Exposes a `/api/live-chef` WebSocket server utilizing the `@google/genai` Live API. This enables the "Bargain Chef AI" to stream live audio/video and interact in real time.
- **AI Integrations**: Heavy use of `@genkit-ai/ai` and `@google/genai` to orchestrate multiple AI pipelines (Vision parsing, personalized feeds, GenMedia kit generation).
- **Web Scraping/Actors**: Integrates with Apify (`apifyService.ts`) to fetch product feeds, scrape marketplaces (Amazon, Walmart, Etsy), and run Google Lens visual searches.

## API Wiring
The frontend communicates with the backend via several REST endpoints and WebSockets defined in `server/routes.ts`:

- **Inventory & Orders**: 
  - `GET /api/inventory`
  - `GET /api/orders`
  - `POST /api/purchase/authorize` & `POST /api/purchase/confirm` (Simulates human-in-the-loop purchases)
- **Streaming Chat**:
  - `POST /api/chat/stream`: Uses Server-Sent Events (SSE) to stream Gemini text/thought responses and Google Search/Maps grounding metadata.
- **WebSockets**:
  - `ws://.../api/live-chef`: Real-time streaming of PCM audio and JPEG video frames for the voice cooking assistant.
- **Vision & Try-On Pipeline**:
  - `POST /api/vision/identify` (Identifies objects using Gemini Vision)
  - `POST /api/vitpose/extract-keypoints` (ViTPose human body keypoint extraction)
  - `POST /api/genkit/try-on-flow` (Genkit flow orchestrating garment try-on)
- **Specialized Agents**:
  - `POST /api/recipe/bargain-chef`
  - `POST /api/economic-research`
  - `POST /api/creator/generate-campaign`

## Android Accessibility screen search

The Android app retains a non-tool AccessibilityService for shopping only. Its policy-sensitive path is intentionally narrow:

- `isAccessibilityTool` is not set. The app shows a dedicated in-app disclosure before Android accessibility settings and stores versioned app consent separately from the exact system-enabled component state.
- Screen search is one-shot and user-triggered through the visible scan action or the system accessibility button. The service does not capture at startup, from accessibility events, widgets, timers, or background work.
- API 34+ uses the focused window screenshot API where available. The service rejects protected windows and platform-sensitive accessibility nodes, bounds JPEG dimensions/bytes, keeps raw pixels in memory only, and cancels its request scope on teardown.
- The authenticated `/api/accessibility/lens-search` route accepts only bounded JPEG data and returns truthful failure responses. It does not persist the raw capture; visual-search processor handling is disclosed in the in-app notice.
- Android service metadata is kept to screenshot access, focused-window inspection, and the user accessibility-button trigger. The service-specific settings activity provides a consent revocation path.

Play Console declarations, listing text, demo video, and any public privacy-policy publication remain external release artifacts; this repository does not claim those external states.

## UI Badge & Overstatement Elimination Standard
- **ONLY Product & Restaurant Star Ratings Allowed**: Standard customer star ratings (`★ 4.8`) are preserved on product/restaurant cards (FriendlyEats standard).
- **NO Artificial Telemetry Badges**: All percentage match badges (`98% Match`), elevation status labels, and grounding badges (`✓ Google Search Grounded`) have been permanently removed.
- **Principle**: Engineers often overstate system results with technical badges. In clean consumer UX (e.g. TikTok, Instagram, Amazon), users expect seamless content and animations without artificial telemetry chips.

## Official Spresso Brand Asset Standard
- **Primary Vector Logo**: `public/spresso_logo.svg` (`/spresso_logo.svg`)
- **Icon Mark Vector Logo**: `public/spresso_icon.svg` (`/spresso_icon.svg`)
- **PNG Asset**: `public/SpressoLogo.png` (`/SpressoLogo.png`)
- **React Component**: `src/components/SpressoLogo.tsx`
- **Compose Kotlin Atom**: `composeApp/src/commonMain/kotlin/components/atoms/SpressoLogo.kt`
- **Mandate**: Generic cart icons or auto-generated `regenerated_image_*.png` files must NEVER replace the official Spresso vector brand logo.
