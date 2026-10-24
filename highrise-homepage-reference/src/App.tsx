import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { Navbar } from './components/Navbar.tsx';
import { Footer } from './components/Footer.tsx';
import { ToolModals } from './components/ToolModals.tsx';
import { AuthModal } from './components/AuthModal.tsx';
import { ListPropertyModal } from './components/ListPropertyModal.tsx';
import { HomePage } from './pages/HomePage.tsx';
import { PropertiesPage } from './pages/PropertiesPage.tsx';
import { PropertyDetailPage } from './pages/PropertyDetailPage.tsx';
import { ProjectsPage } from './pages/ProjectsPage.tsx';
import { ProjectDetailPage } from './pages/ProjectDetailPage.tsx';

import { ValuationPage } from './pages/ValuationPage.tsx';

// Scroll to top helper component on route change
function ScrollToTop() {
  const { pathname, search, hash } = useLocation();

  useEffect(() => {
    if (hash) {
      const el = document.querySelector(hash);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
        return;
      }
    }
    window.scrollTo(0, 0);
  }, [pathname, search, hash]);

  return null;
}

import { PropertyResearchTool } from './types/index.ts';

export default function App() {
  const [activeTool, setActiveTool] = useState<PropertyResearchTool | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [listModalOpen, setListModalOpen] = useState(false);

  return (
    <BrowserRouter>
      <ScrollToTop />
      <div className="min-h-screen flex flex-col bg-[#f8fafc] text-slate-800 font-sans selection:bg-[#029bba]/20 selection:text-[#004063]">
        {/* Shared Navbar */}
        <Navbar
          onOpenTool={(tool) => setActiveTool(tool)}
          onOpenAuth={() => setAuthModalOpen(true)}
          onOpenListProperty={() => setListModalOpen(true)}
        />

        {/* Page Content */}
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<HomePage onOpenTool={(tool) => setActiveTool(tool)} />} />
            <Route path="/properties" element={<PropertiesPage />} />
            <Route path="/properties/:slug" element={<PropertyDetailPage />} />
            <Route path="/properties/sample-property" element={<PropertyDetailPage />} />
            <Route path="/projects" element={<ProjectsPage />} />
            <Route path="/projects/:slug" element={<ProjectDetailPage />} />
            <Route path="/projects/sample-project" element={<ProjectDetailPage />} />
            <Route path="/valuation" element={<ValuationPage />} />
            {/* Catch-all route fallback */}
            <Route path="*" element={<HomePage onOpenTool={(tool) => setActiveTool(tool)} />} />
          </Routes>
        </main>

        {/* Shared Footer */}
        <Footer onOpenTool={(tool) => setActiveTool(tool)} />

        {/* Interactive Modals */}
        <ToolModals tool={activeTool} onClose={() => setActiveTool(null)} />
        <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
        <ListPropertyModal isOpen={listModalOpen} onClose={() => setListModalOpen(false)} />
      </div>
    </BrowserRouter>
  );
}
