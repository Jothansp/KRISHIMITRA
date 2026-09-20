const API = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

async function request(path, options = {}) {
  const response = await fetch(API + path, options);
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed: ${response.status}`);
  }
  return response.json();
}

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify(body)
  }),
  put: (path, body) => request(path, {
    method: "PUT",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify(body)
  }),
  upload: (path, file) => {
    const form = new FormData();
    form.append("file", file);
    return request(path, {method: "POST", body: form});
  }
};
