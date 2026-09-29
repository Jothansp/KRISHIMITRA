import { useEffect, useState, type ComponentType, type ReactNode } from "react";
import { NavLink, Link } from "react-router-dom";
import {
  Leaf, LayoutDashboard, Sprout, CloudSun, PawPrint, Landmark,
  Tractor, Users, Newspaper, ShieldAlert, Bell, UserRound, Menu, X,
  type LucideProps,
} from "lucide-react";
import { api } from "../services/api";
import type { Dashboard } from "../types";

const links: [string, string, ComponentType<LucideProps>][] = [
  ["/", "Dashboard", LayoutDashboard],
  ["/advisory", "Plantation Advisory", Sprout],
  ["/weather", "Weather & Risk", CloudSun],
  ["/risk", "Farm Risk", ShieldAlert],
  ["/wildlife", "Wildlife Detection", PawPrint],
  ["/schemes", "Government Schemes", Landmark],
  ["/equipment", "Equipment Rental", Tractor],
  ["/community", "Community", Users],
  ["/news", "News & Alerts", Newspaper],
  ["/profile", "My Farm", UserRound],
];

export default function Layout({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    api.get<Dashboard>("/dashboard")
      .then((d) => setUnread(d.stats?.unread_alerts ?? 0))
      .catch(() => { /* sidebar badge is optional */ });
  }, []);

  return (
    <div className="app-shell">
      <button className="mobile-menu" onClick={() => setOpen(!open)} aria-label="Toggle menu">
        {open ? <X /> : <Menu />}
      </button>

      <aside className={`sidebar ${open ? "open" : ""}`}>
        <Link className="brand" to="/" onClick={() => setOpen(false)}>
          <div className="brand-mark"><Leaf size={22} /></div>
          <div>
            <b>KRISHIMITRA</b>
            <small>Plantation Intelligence</small>
          </div>
        </Link>

        <nav>
          {links.map(([path, label, Icon]) => (
            <NavLink
              key={path}
              to={path}
              end={path === "/"}
              onClick={() => setOpen(false)}
              className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}
            >
              <Icon size={18} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <Link to="/alerts" className="nav-link" onClick={() => setOpen(false)}>
            <Bell size={18} /><span>Alerts {unread > 0 && <em>{unread}</em>}</span>
          </Link>
          <div className="sidebar-note">AI • Risk • Community<br /><span>Built for Kerala plantations</span></div>
        </div>
      </aside>

      <main className="main-content">{children}</main>
    </div>
  );
}
