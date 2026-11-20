
import React, { useEffect, Suspense, lazy } from 'react';
import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
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

function CanonicalPathRedirect() {
  const location = useLocation();

  // Article URLs (/global-insight/<slug>) keep the slug's original case, because the Sanity
  // lookup is case-sensitive. Everything else is lowercased as before.
  const articleMatch = location.pathname.match(/^\/global-?insight\/(.+)$/i);
  const lowerPath = articleMatch
    ? `/global-insight/${articleMatch[1]}`
    : location.pathname.toLowerCase();

  const canonicalPath =
    lowerPath === '/globalinsight'
      ? '/global-insight'
      : lowerPath;

  if (location.pathname !== canonicalPath) {
    return (
      <Navigate
        to={{
          pathname: canonicalPath,
          search: location.search,
          hash: location.hash,
        }}
        replace
      />
    );
  }

  return null;
}

export default function App() {
  return (
    <div className="min-h-screen flex flex-col bg-bg-main text-text-body font-sans">
      <ScrollToHash />
      <CanonicalPathRedirect />

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
            <Route path="/about" element={<About />} />
            <Route path="/services" element={<Services />} />
            <Route path="/global-insight" element={<GlobalInsight />} />
            <Route path="/global-insight/:slug" element={<GlobalInsight />} />
            <Route path="/contact" element={<Contact />} />
          </Routes>
        </Suspense>
      </main>

      {/* Global Footer */}
      <Footer />
    </div>
  );
}
