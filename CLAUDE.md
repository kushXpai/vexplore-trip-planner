# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Development Commands

- **Install dependencies**: `npm i`
- **Start development server**: `npm run dev` (uses Vite with hot‑module reloading)
- **Build for production**: `npm run build`
- **Preview production build**: `npm run preview`
- **Run linting**: `npm run lint`
- **Run a single test** (if a test framework is added, e.g., Vitest): `npm test -- <test-file>`

## High‑Level Architecture

- **Framework**: Vite + React (TypeScript) with Tailwind CSS for styling.
- **UI primitives**: `src/components/ui/*` – shadcn‑ui components built on Radix UI.
- **Routing**: `react-router-dom` is configured in `src/App.tsx` using a `createBrowserRouter`.
  - Public routes (e.g., `/login`).
  - Protected routes wrapped with `<ProtectedRoute>` and rendered inside `DashboardLayout`.
- **State Management**: `@tanstack/react-query` provides server‑state fetching/caching. The `QueryClientProvider` is set up at the root.
- **Authentication**: `src/contexts/AuthContext.tsx` uses Supabase auth. User data is persisted to `localStorage` and exposed via `useAuth` hook.
- **Data Layer**: `src/services/*.ts` (e.g., `tripService.ts`) contains all Supabase CRUD operations for trips, participants, extras, etc.
- **Domain Types**: Defined in `src/types/trip.ts` and used throughout the app for strong typing.
- **Utility Hooks**: `src/hooks/*` (e.g., `use-mobile.tsx`) for responsive behavior.
- **Layout Components**: `AppLayout`, `AppHeader`, `AppSidebar`, `DashboardLayout` compose the main UI shell.
- **Pages**: Each top‑level view lives under `src/pages/` (Dashboard, CreateTrip, TripDetail, Masters, Reports, Settings, UserManagement, NotFound, Login).

## Project Structure Overview

```
src/
├─ components/               # Reusable UI and layout components
│   ├─ ui/                    # shadcn‑ui wrappers (button, dialog, etc.)
│   ├─ layout/                # App layout (header, sidebar, dashboard shell)
│   ├─ shared/                # Small presentation components
│   └─ trip/                  # Trip‑specific components (PDF preview, expense entry)
├─ contexts/                 # React context providers (AuthContext)
├─ hooks/                    # Custom hooks (mobile detection, etc.)
├─ pages/                    # Route‑level pages
├─ services/                 # Supabase API wrappers (tripService, masterDataService)
├─ types/                    # TypeScript domain models
├─ utils/                    # Helper utilities (roomAllocation)
└─ main.tsx, App.tsx        # Entry points
```

## Interaction Patterns

- **Authentication Flow**: `AuthProvider` fetches Supabase session on mount, stores user profile, and provides `login`/`logout` functions.
- **Protected Routes**: `<ProtectedRoute>` checks `isAuthenticated` and optionally `requireAdmin` before rendering children; redirects to `/login` otherwise.
- **Trip CRUD**: `tripService.ts` exposes `createTrip`, `updateTrip`, `getTripById`, `deleteTrip`, and `getUserTrips`. All endpoints are wrapped with Supabase client calls and handle related tables (participants, extras, flights, etc.).
- **State Fetching**: Components use `useQuery`/`useMutation` from React Query to call these service functions, benefiting from caching and automatic refetching.
- **Styling**: Tailwind CSS utilities + `clsx` for conditional class composition, with `tailwind-merge` to deduplicate conflicting utilities.

## Tips for Claude Code

- When adding new functionality, consult the relevant service file (`src/services/...`) to follow existing patterns for Supabase interaction.
- Reuse existing UI primitives from `src/components/ui/` to keep a consistent look and feel.
- For new routes, add them to the router configuration in `src/App.tsx` following the existing protected route pattern.
- Use TypeScript types from `src/types/` to maintain type safety across the codebase.
- Run `npm run lint` after modifications to ensure code quality.
