
import React, { useEffect, Suspense, lazy } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';

// Keep Home as a normal import for immediate initial loading
import Home from './pages/Home';

// Lazy-load secondary pages
const About = lazy(() => import('./pages/About'));
const Services = lazy(() => import('./pages/Services'));
const GlobalInsight = lazy(() => import('./pages/GlobalInsight'));
const Contact = lazy(() => import('./pages/Contact'));

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
        <Suspense
          fallback={
            <div className="min-h-[50vh] flex items-center justify-center">
              Loading...
            </div>
          }
        >
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/About" element={<About />} />
            <Route path="/Services" element={<Services />} />
            <Route path="/GlobalInsight" element={<GlobalInsight />} />
            <Route path="/contact" element={<Contact />} />
          </Routes>
        </Suspense>
      </main>

      {/* Global Footer */}
      <Footer />
    </div>
  );
}
