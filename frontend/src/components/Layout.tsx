import { NavLink, useNavigate } from "react-router-dom";
import { ReactNode } from "react";
import { useAuth } from "../context/AuthContext";

const NAV_ITEMS = [
  { to: "/", label: "Dashboard", roles: ["ADMIN", "SALES", "WAREHOUSE", "ACCOUNTS"] },
  { to: "/customers", label: "Customers", roles: ["ADMIN", "SALES", "WAREHOUSE", "ACCOUNTS"] },
  { to: "/products", label: "Products & Stock", roles: ["ADMIN", "SALES", "WAREHOUSE", "ACCOUNTS"] },
  { to: "/challans", label: "Sales Challans", roles: ["ADMIN", "SALES", "WAREHOUSE", "ACCOUNTS"] },
] as const;

export function Layout({ title, children }: { title: string; children: ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <span className="mark">LEDGER</span>
          <span className="tag">ERP · CRM</span>
        </div>

        <div className="sidebar-section-label">Workspace</div>
        {NAV_ITEMS.filter((item) => !user || item.roles.includes(user.role)).map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) => "nav-link" + (isActive ? " active" : "")}
          >
            {item.label}
          </NavLink>
        ))}

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <span className="name">{user?.name}</span>
            <span className="role">{user?.role}</span>
          </div>
          <button className="logout-btn" onClick={handleLogout}>
            Sign out
          </button>
        </div>
      </aside>

      <div className="main-area">
        <div className="topbar">
          <h1>{title}</h1>
        </div>
        <div className="content">{children}</div>
      </div>
    </div>
  );
}
