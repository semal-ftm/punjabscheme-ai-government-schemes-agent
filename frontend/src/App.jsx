import { Link, Route, Routes } from "react-router-dom";
import { Compass } from "lucide-react";
import Layout from "./components/Layout.jsx";
import { EmptyState } from "./components/States.jsx";
import { UserProvider } from "./lib/UserContext.jsx";
import Chat from "./pages/Chat.jsx";
import Compare from "./pages/Compare.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Eligibility from "./pages/Eligibility.jsx";
import Explore from "./pages/Explore.jsx";
import Saved from "./pages/Saved.jsx";
import SchemeDetail from "./pages/SchemeDetail.jsx";
import Updates from "./pages/Updates.jsx";
import HowItWorks from "./pages/HowItWorks.jsx";

function NotFound() {
  return (
    <EmptyState icon={Compass} title="Page not found" action={<Link to="/" className="btn-primary">Go to dashboard</Link>}>
      The page you are looking for does not exist.
    </EmptyState>
  );
}

export default function App() {
  return (
    <UserProvider>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="chat" element={<Chat />} />
          <Route path="schemes" element={<Explore />} />
          <Route path="schemes/:id" element={<SchemeDetail />} />
          <Route path="eligibility" element={<Eligibility />} />
          <Route path="compare" element={<Compare />} />
          <Route path="saved" element={<Saved />} />
          <Route path="updates" element={<Updates />} />
          <Route path="how-it-works" element={<HowItWorks />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </UserProvider>
  );
}
