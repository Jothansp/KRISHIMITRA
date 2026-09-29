import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Advisory from "./pages/Advisory";
import Weather from "./pages/Weather";
import Risk from "./pages/Risk";
import Wildlife from "./pages/Wildlife";
import Schemes from "./pages/Schemes";
import Equipment from "./pages/Equipment";
import Community from "./pages/Community";
import News from "./pages/News";
import Alerts from "./pages/Alerts";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";
import "./style.css";

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/advisory" element={<Advisory />} />
        <Route path="/weather" element={<Weather />} />
        <Route path="/risk" element={<Risk />} />
        <Route path="/wildlife" element={<Wildlife />} />
        <Route path="/schemes" element={<Schemes />} />
        <Route path="/equipment" element={<Equipment />} />
        <Route path="/community" element={<Community />} />
        <Route path="/news" element={<News />} />
        <Route path="/alerts" element={<Alerts />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Layout>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode><BrowserRouter><App /></BrowserRouter></StrictMode>,
);
