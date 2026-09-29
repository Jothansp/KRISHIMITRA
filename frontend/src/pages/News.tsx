import { useEffect, useState } from "react";
import { api, errorMessage } from "../services/api";
import { PageHeader, Card, Pill, Empty, ErrorNote } from "../components/UI";
import type { NewsItem } from "../types";

export default function News() {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [error, setError] = useState("");
  useEffect(() => { api.get<NewsItem[]>("/news").then(setItems).catch((e) => setError(errorMessage(e))); }, []);

  return (
    <>
      <PageHeader eyebrow="AGRICULTURAL INFORMATION" title="News & Alerts"
        description="Agricultural updates and plantation-related information." />
      <ErrorNote message={error} />
      {items.length === 0 ? <Empty /> : (
        <div className="cards-grid">{items.map((n) => (
          <Card key={n.id}>
            <Pill>{n.category}</Pill><h2>{n.title}</h2><p>{n.summary}</p>
            <small>{n.source} • {new Date(n.published_at).toLocaleDateString()}</small>
          </Card>
        ))}</div>
      )}
    </>
  );
}
