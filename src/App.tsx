// src/App.tsx
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createBrowserRouter, RouterProvider, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import DashboardLayout from "@/components/DashboardLayout";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import Trips from "@/pages/Trips";
import TripDetail from "@/pages/TripDetail";
import CreateTrip from "@/pages/CreateTrip";
import Masters from "@/pages/Masters";
import Reports from "@/pages/Reports";
import Settings from "@/pages/Settings";
import NotFound from "@/pages/NotFound";
import UserManagement from "./pages/UserManagement";

const queryClient = new QueryClient();

// Router configuration - ONLY uses DashboardLayout
const router = createBrowserRouter([
  // Public routes
  {
    path: "/login",
    element: <Login />
  },

  // Redirect root to dashboard
  {
    path: "/",
    element: <Navigate to="/dashboard" replace />
  },

  // Protected routes - All use DashboardLayout
  {
    element: (
      <ProtectedRoute>
        <DashboardLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        path: "/dashboard",
        element: <Dashboard />
      },
      {
        path: "/trips",
        element: <Trips />
      },
      {
        path: "/trips/create",
        element: <CreateTrip />
      },
      {
        path: "/trips/:id",
        element: <TripDetail />
      },
      {
        path: "/masters",
        element: <Masters />
      },
      {
        path: "/users",
        element: (
          <ProtectedRoute requireAdmin>
            <UserManagement />
          </ProtectedRoute>
        )
      },
      {
        path: "/reports",
        element: (
          <ProtectedRoute requireAdmin>
            <Reports />
          </ProtectedRoute>
        )
      },
      {
        path: "/settings",
        element: <Settings />
      },
    ],
  },

  // 404
  {
    path: "*",
    element: <NotFound />
  },
]);

const App = () => (
  <AuthProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <RouterProvider router={router} />
        <Toaster />
        <Sonner />
      </TooltipProvider>
    </QueryClientProvider>
  </AuthProvider>
);

export default App;