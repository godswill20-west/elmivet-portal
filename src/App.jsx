import React from 'react';
import { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';

// 5 Page Components
import Home from './pages/Home';
import About from './pages/About';          // Page 2: China Office Hub
import Services from './pages/Services';    // Page 3: Services & Global Logistics
import GlobalInsight from './pages/GlobalInsight'; // Page 4: Global Insight and News Hub
import Contact from './pages/Contact';      // Page 5: Contact & Support Hub

export default function App() {
  return (
    <div className="min-h-screen flex flex-col bg-bg-main text-text-body font-sans">
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

/*
import { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import './index.css';

function App() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main>
        {/* Your main content goes here }
      </main>
    </div>
  );
}

export default App;
*/
