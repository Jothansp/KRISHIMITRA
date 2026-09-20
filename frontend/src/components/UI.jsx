import React from "react";
import { LoaderCircle } from "lucide-react";

export function PageHeader({eyebrow, title, description, action}) {
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

export function Card({title, icon, children, className=""}) {
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
  return <div className="loading"><LoaderCircle className="spin" size={22}/> Loading...</div>;
}

export function Empty({children="No data available."}) {
  return <div className="empty">{children}</div>;
}

export function Pill({children, tone=""}) {
  return <span className={`pill ${tone}`}>{children}</span>;
}

export function Metric({label, value, sub, icon}) {
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
