import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Users, Search, Send, Heart } from "lucide-react";
import { api, errorMessage } from "../services/api";
import { PageHeader, Card, Empty, ErrorNote } from "../components/UI";
import type { Post } from "../types";

export default function Community() {
  const [query, setQuery] = useState("");
  const [posts, setPosts] = useState<Post[]>([]);
  const [form, setForm] = useState({ author: "Demo Farmer", title: "", body: "", tags: "" });
  const [error, setError] = useState("");

  const load = useCallback((q: string = query) => {
    api.get<Post[]>(`/community?q=${encodeURIComponent(q)}`).then(setPosts)
      .catch((e) => setError(errorMessage(e)));
  }, [query]);
  // Initial load only; later searches run from the Search button.
  useEffect(() => { load(""); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!form.title || !form.body) return;
    await api.post("/community", form);
    setForm({ ...form, title: "", body: "", tags: "" });
    load();
  }

  async function like(id: number) { await api.post(`/community/${id}/like`); load(); }

  return (
    <>
      <PageHeader eyebrow="FARMER COLLABORATION" title="Community Forum"
        description="Ask questions, share practical knowledge and search farmer discussions." />
      <div className="search-row community-search">
        <input value={query} onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && load()} placeholder="Search pepper, drainage, equipment..." />
        <span />
        <button className="primary-button" onClick={() => load()}><Search /> Search</button>
      </div>
      <ErrorNote message={error} />

      <div className="two-column">
        <Card title="Start a discussion" icon={<Users />}>
          <form className="form-grid" onSubmit={submit}>
            <input placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <textarea placeholder="Write your question or experience..." value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
            <input placeholder="Tags: pepper,monsoon" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} />
            <button className="primary-button"><Send size={16} /> Post</button>
          </form>
        </Card>

        <div>
          {posts.length === 0 ? <Empty>No discussions found.</Empty> : posts.map((p) => (
            <Card key={p.id}>
              <div className="post-author">
                <div className="avatar-small">{p.author?.[0] || "F"}</div>
                <div><b>{p.author}</b><small>{p.score ? ` • relevance ${p.score}` : ""}</small></div>
              </div>
              <h2>{p.title}</h2><p>{p.body}</p>
              <div className="tag-list">{p.tags?.split(",").filter(Boolean).map((t) => <span key={t}>#{t.trim()}</span>)}</div>
              <button className="like-button" onClick={() => like(p.id)}><Heart size={15} /> {p.likes}</button>
            </Card>
          ))}
        </div>
      </div>
    </>
  );
}
