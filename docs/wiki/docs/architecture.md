# Spresso Application Context & Architecture Report

## Overview
**Spresso AI Personal Shopper** (also featuring **Chef AI**) is a highly interactive, generative AI-powered web application. It acts as a comprehensive shopping concierge and cooking assistant. The app offers real-time multimodal (voice and video) chat interactions, virtual try-ons, location-based local store shopping, and automated order tracking.

> [!NOTE]
> The `/android-cli describe` command was run against this repository as requested, but it returned `Error: gradlew not found` because this is a **web application** (React + Firebase / Agent Engine), not an Android native app.

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
The backend is fundamentally serverless, heavily utilizing **Firebase Cloud Functions** and **Vertex AI Agent Engine**. There is no monolithic Express server required.

- **Database**: Uses **PostgreSQL** with **Drizzle ORM** (`src/db/schema.ts`) and **Cloud Spanner** for global catalog data.
- **WebSockets (Real-time)**: The "Chef AI" utilizes the **Vertex AI Agent Engine** with **Python ADK agents** to connect directly to the Gemini Multimodal Live API via WebSockets, eliminating the need for a custom Node.js Express middle-tier.
- **AI Integrations**: Heavy use of `@genkit-ai/ai`, Python ADK, and MCP (Model Context Protocol) toolboxes to orchestrate multiple AI pipelines (Vision parsing, personalized feeds, GenMedia kit generation).
- **Web Scraping/Actors**: Integrates with Apify (`apifyService.ts`) to fetch product feeds, scrape marketplaces (Amazon, Walmart, Etsy), and run Google Lens visual searches.

## API Wiring
The frontend communicates with the backend via several REST endpoints and WebSockets defined in `server/routes.ts`:

- **Inventory & Orders**: 
  - `GET /api/inventory`
  - `GET /api/orders`
  - `POST /api/purchase/authorize` & `POST /api/purchase/confirm` (Simulates human-in-the-loop purchases)
- **Streaming Chat**:
  - `POST /api/chat/stream`: Uses Server-Sent Events (SSE) to stream Gemini text/thought responses and Google Search/Maps grounding metadata.
- **WebSockets (Agent Engine)**:
  - `wss://[region]-aiplatform.googleapis.com/...`: Real-time bidirectional streaming of PCM audio and JPEG video frames directly to the Python ADK Chef agent.
- **Vision & Try-On Pipeline**:
  - `POST /api/vision/identify` (Identifies objects using Gemini Vision)
  - `POST /api/vitpose/extract-keypoints` (ViTPose human body keypoint extraction)
  - `POST /api/genkit/try-on-flow` (Genkit flow orchestrating garment try-on)
- **Specialized Agents**:
  - `POST /api/recipe/chef`
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
