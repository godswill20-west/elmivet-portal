import React, { useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';

// 5 Page Components
import Home from './pages/Home';
import About from './pages/About';                   // Page 2: China Office Hub
import Services from './pages/Services';             // Page 3: Services & Global Logistics
import GlobalInsight from './pages/GlobalInsight';   // Page 4: Global Insight and News Hub
import Contact from './pages/Contact';               // Page 5: Contact & Support Hub

function ScrollToHash() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash) {
      // Slight timeout ensures the new page has finished rendering before scrolling
      const timer = setTimeout(() => {
        const element = document.getElementById(hash.replace('#', ''));
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
      return () => clearTimeout(timer);
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [pathname, hash]);

  return null;
}

export default function App() {
  return (
    <div className="min-h-screen flex flex-col bg-bg-main text-text-body font-sans">
      <ScrollToHash />

      {/* Sticky Navigation Header */}
      <Navbar />

      {/* Dynamic Page Content Rendered Here Based on URL */}
      <main className="flex-grow">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/About" element={<About />} />
          <Route path="/Services" element={<Services />} />
          <Route path="/GlobalInsight" element={<GlobalInsight />} />
          <Route path="/contact" element={<Contact />} />
        </Routes>
      </main>

      {/* Global Footer */}
      <Footer />
    </div>
  );
}