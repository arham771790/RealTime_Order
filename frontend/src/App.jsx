import { useState } from "react";

import Dashboard from "./pages/Dashboard.jsx";
import DemoControls from "./pages/DemoControls.jsx";

const pages = {
  dashboard: Dashboard,
  demo: DemoControls
};

export default function App() {
  const [activePage, setActivePage] = useState("dashboard");
  const ActivePage = pages[activePage] ?? Dashboard;

  return <ActivePage activePage={activePage} onNavigate={setActivePage} />;
}
