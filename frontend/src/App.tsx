import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { LoginPage } from "./pages/LoginPage";
import { DashboardPage } from "./pages/DashboardPage";
import { CustomersListPage } from "./pages/customers/CustomersListPage";
import { CustomerDetailPage } from "./pages/customers/CustomerDetailPage";
import { CustomerFormPage } from "./pages/customers/CustomerFormPage";
import { ProductsListPage } from "./pages/products/ProductsListPage";
import { ProductDetailPage } from "./pages/products/ProductDetailPage";
import { ProductFormPage } from "./pages/products/ProductFormPage";
import { ChallansListPage } from "./pages/challans/ChallansListPage";
import { ChallanFormPage } from "./pages/challans/ChallanFormPage";
import { ChallanDetailPage } from "./pages/challans/ChallanDetailPage";

function LoginRoute() {
  const { user } = useAuth();
  if (user) return <Navigate to="/" replace />;
  return <LoginPage />;
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginRoute />} />

        <Route path="/" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />

        <Route path="/customers" element={<ProtectedRoute><CustomersListPage /></ProtectedRoute>} />
        <Route
          path="/customers/new"
          element={
            <ProtectedRoute allow={["ADMIN", "SALES"]}>
              <CustomerFormPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/customers/:id/edit"
          element={
            <ProtectedRoute allow={["ADMIN", "SALES"]}>
              <CustomerFormPage />
            </ProtectedRoute>
          }
        />
        <Route path="/customers/:id" element={<ProtectedRoute><CustomerDetailPage /></ProtectedRoute>} />

        <Route path="/products" element={<ProtectedRoute><ProductsListPage /></ProtectedRoute>} />
        <Route
          path="/products/new"
          element={
            <ProtectedRoute allow={["ADMIN", "WAREHOUSE"]}>
              <ProductFormPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/products/:id/edit"
          element={
            <ProtectedRoute allow={["ADMIN", "WAREHOUSE"]}>
              <ProductFormPage />
            </ProtectedRoute>
          }
        />
        <Route path="/products/:id" element={<ProtectedRoute><ProductDetailPage /></ProtectedRoute>} />

        <Route path="/challans" element={<ProtectedRoute><ChallansListPage /></ProtectedRoute>} />
        <Route
          path="/challans/new"
          element={
            <ProtectedRoute allow={["ADMIN", "SALES"]}>
              <ChallanFormPage />
            </ProtectedRoute>
          }
        />
        <Route path="/challans/:id" element={<ProtectedRoute><ChallanDetailPage /></ProtectedRoute>} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
