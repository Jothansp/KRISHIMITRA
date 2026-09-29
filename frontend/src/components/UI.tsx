import type { ReactNode } from "react";
import { LoaderCircle } from "lucide-react";

export function PageHeader({ eyebrow, title, description, action }: {
  eyebrow: string; title: string; description: string; action?: ReactNode;
}) {
  return (
    <header className="page-header">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </header>
  );
}

export function Card({ title, icon, children, className = "" }: {
  title?: string; icon?: ReactNode; children: ReactNode; className?: string;
}) {
  return (
    <section className={`card ${className}`}>
      {title && (
        <div className="card-heading">
          {icon && <span className="heading-icon">{icon}</span>}
          <h2>{title}</h2>
        </div>
      )}
      {children}
    </section>
  );
}

export function Loading() {
  return <div className="loading"><LoaderCircle className="spin" size={22} /> Loading...</div>;
}

export function ErrorNote({ message }: { message: string }) {
  return message ? <div className="warning-box" role="alert">{message}</div> : null;
}

export function Empty({ children = "No data available." }: { children?: ReactNode }) {
  return <div className="empty">{children}</div>;
}

export function Pill({ children, tone = "" }: { children: ReactNode; tone?: string }) {
  return <span className={`pill ${tone}`}>{children}</span>;
}

export function Metric({ label, value, sub, icon }: {
  label: string; value: ReactNode; sub?: string; icon: ReactNode;
}) {
  return (
    <div className="metric">
      <div className="metric-icon">{icon}</div>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        {sub && <small>{sub}</small>}
      </div>
    </div>
  );
}
