import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/core/auth/AuthProvider";
import { AuthGuard } from "@/core/auth/AuthGuard";
import { AppShell } from "@/components/layout/AppShell";
import { PWAPrompt } from "@/components/layout/PWAPrompt";

import { Landing } from "@/pages/Landing";
import { Login } from "@/pages/auth/Login";
import { Register } from "@/pages/auth/Register";
import { Dashboard } from "@/pages/dashboard/Dashboard";
import { Projects } from "@/pages/projects/Projects";
import { Settings } from "@/pages/settings/Settings";
import { SuperAdmin } from "@/pages/admin/SuperAdmin";
import { TenantManager } from "@/pages/admin/TenantManager";
import { ProjectInspector } from "@/pages/admin/ProjectInspector";
import { SupportSession } from "@/pages/admin/SupportSession";
import { AuditLog } from "@/pages/admin/AuditLog";
import { AITerminal } from "@/pages/admin/AITerminal";
import { SystemCatalog } from "@/pages/admin/SystemCatalog";
import { SystemBuilder } from "@/pages/admin/SystemBuilder";
import { Checkout } from "@/pages/checkout/Checkout";
import { SystemDemo } from "@/pages/demo/SystemDemo";
import { AgentDemo } from "@/pages/demo/AgentDemo";
import { AgentsCatalog } from "@/pages/agents/AgentsCatalog";
import { PriceManager } from "@/pages/admin/PriceManager";
import { Franchise } from "@/pages/franchise/Franchise";
import { FranchiseManager } from "@/pages/admin/FranchiseManager";
import { ResellerDashboard } from "@/pages/reseller/ResellerDashboard";
import { Bookings } from "@/pages/bookings/Bookings";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<Landing />} />
          <Route path="/demo/agent/:agentId" element={<AgentDemo />} />
          <Route path="/demo/:systemId" element={<SystemDemo />} />
          <Route path="/agents" element={<AgentsCatalog />} />
          <Route path="/franchise" element={<Franchise />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/checkout/agent/:systemId" element={
            <AuthGuard>
              <Checkout />
            </AuthGuard>
          } />
          <Route path="/checkout/:systemId" element={
            <AuthGuard>
              <Checkout />
            </AuthGuard>
          } />
          <Route
            path="/admin/builder/:systemId"
            element={
              <AuthGuard requiredRole="super_admin">
                <SystemBuilder />
              </AuthGuard>
            }
          />

          {/* Protected routes */}
          <Route
            element={
              <AuthGuard>
                <AppShell />
              </AuthGuard>
            }
          >
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/bookings" element={<Bookings />} />

            {/* Super Admin routes */}
            <Route
              path="/admin"
              element={
                <AuthGuard requiredRole="super_admin">
                  <SuperAdmin />
                </AuthGuard>
              }
            />
            <Route
              path="/admin/tenants"
              element={
                <AuthGuard requiredRole="super_admin">
                  <TenantManager />
                </AuthGuard>
              }
            />
            <Route
              path="/admin/inspector"
              element={
                <AuthGuard requiredRole="super_admin">
                  <ProjectInspector />
                </AuthGuard>
              }
            />
            <Route
              path="/admin/support"
              element={
                <AuthGuard requiredRole="super_admin">
                  <SupportSession />
                </AuthGuard>
              }
            />
            <Route
              path="/admin/audit"
              element={
                <AuthGuard requiredRole="super_admin">
                  <AuditLog />
                </AuthGuard>
              }
            />
            <Route
              path="/admin/ai"
              element={
                <AuthGuard requiredRole="super_admin">
                  <AITerminal />
                </AuthGuard>
              }
            />
            <Route
              path="/admin/prices"
              element={
                <AuthGuard requiredRole="super_admin">
                  <PriceManager />
                </AuthGuard>
              }
            />
            <Route
              path="/admin/catalog"
              element={
                <AuthGuard requiredRole="super_admin">
                  <SystemCatalog />
                </AuthGuard>
              }
            />
            <Route
              path="/admin/franchises"
              element={
                <AuthGuard requiredRole="super_admin">
                  <FranchiseManager />
                </AuthGuard>
              }
            />
            <Route
              path="/reseller"
              element={
                <AuthGuard requiredRole="tenant_admin">
                  <ResellerDashboard />
                </AuthGuard>
              }
            />
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <PWAPrompt />
      </AuthProvider>
    </BrowserRouter>
  );
}
