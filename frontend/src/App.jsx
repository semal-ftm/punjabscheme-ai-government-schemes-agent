import { Link, Navigate, Route, Routes } from "react-router-dom";
import { Compass } from "lucide-react";
import Layout from "./components/Layout.jsx";
import { EmptyState } from "./components/States.jsx";
import { UserProvider } from "./lib/UserContext.jsx";
import Chat from "./pages/Chat.jsx";
import Compare from "./pages/Compare.jsx";
import Eligibility from "./pages/Eligibility.jsx";
import Explore from "./pages/Explore.jsx";
import Home from "./pages/Home.jsx";
import Saved from "./pages/Saved.jsx";
import SchemeDetail from "./pages/SchemeDetail.jsx";
import Updates from "./pages/Updates.jsx";
import LiveSearch from "./pages/studio/LiveSearch.jsx";
import McpTools from "./pages/studio/McpTools.jsx";
import Memory from "./pages/studio/Memory.jsx";
import Overview from "./pages/studio/Overview.jsx";
import Prompts from "./pages/studio/Prompts.jsx";
import RagDocs from "./pages/studio/RagDocs.jsx";
import StudioLayout from "./pages/studio/StudioLayout.jsx";
import Testing from "./pages/studio/Testing.jsx";

function NotFound() {
  return (
    <EmptyState icon={Compass} title="Page not found" action={<Link to="/" className="btn-primary">Go home</Link>}>
      The page you are looking for does not exist.
    </EmptyState>
  );
}

export default function App() {
  return (
    <UserProvider>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="chat" element={<Chat />} />
          <Route path="schemes" element={<Explore />} />
          <Route path="schemes/:id" element={<SchemeDetail />} />
          <Route path="eligibility" element={<Eligibility />} />
          <Route path="compare" element={<Compare />} />
          <Route path="saved" element={<Saved />} />
          <Route path="updates" element={<Updates />} />
          <Route path="studio" element={<StudioLayout />}>
            <Route index element={<Overview />} />
            <Route path="rag" element={<RagDocs />} />
            <Route path="live" element={<LiveSearch />} />
            <Route path="mcp" element={<McpTools />} />
            <Route path="memory" element={<Memory />} />
            <Route path="prompts" element={<Prompts />} />
            <Route path="testing" element={<Testing />} />
          </Route>
          <Route path="dashboard" element={<Navigate to="/" replace />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </UserProvider>
  );
}
