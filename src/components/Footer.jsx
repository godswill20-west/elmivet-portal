import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';

export default function Footer() {
  const currentYear = new Date().getFullYear();
  const [isTikTokDropdownOpen, setIsTikTokDropdownOpen] = useState(false);
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  return (
    <footer className="bg-[#0A2540] text-slate-200 font-sans border-t-4 border-[#D9232D]">
      {/* Top Editorial Banner Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-12 border-b border-slate-800">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          
          {/* Brand & Editorial Mission */}
          <div className="lg:col-span-5 space-y-6">
            <div className="flex items-center space-x-3">
              <div className="bg-[#D9232D] text-white font-serif text-2xl font-bold w-12 h-12 rounded-lg flex items-center justify-center shadow-md">
                E
              </div>
              <div>
                <span className="font-serif text-3xl font-extrabold tracking-tight text-white block leading-none">
                  ELMIVET
                </span>
                <span className="text-[11px] font-bold tracking-[0.2em] text-slate-400 uppercase mt-1.5 block">
                  INTERNATIONAL LIMITED
                </span>
              </div>
            </div>
            
            <p className="text-sm text-slate-300 leading-relaxed font-sans pr-4">
              Licensed Customs Bonded Terminal Operator and Licensed Customs Brokerage Company delivering elite global logistics, customs clearance, and integrated supply chain architecture.
            </p>

            <div className="inline-flex items-center space-x-3 bg-slate-900/90 border border-slate-700/80 px-4 py-2 rounded-md shadow-sm">
              <span className="text-xs text-[#D9232D] font-bold tracking-wide">RC 8809789</span>
              <span className="text-slate-400 text-xs">| Bonded Terminal & Logistics Authority</span>
            </div>
          </div>

          {/* Direct Communication & Dispatch Hub */}
          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-8 bg-slate-900/50 p-8 rounded-xl border border-slate-800">
            <div>
              <h4 className="font-serif text-base font-bold text-white uppercase tracking-wider mb-4 border-b border-slate-800 pb-2">
                Direct Dispatch & Quotes
              </h4>
              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-slate-400 block font-medium">Commercial Quotes:</span>
                  <a 
                    href="mailto:quotes@elmivet.com" 
                    className="text-white hover:text-[#D9232D] transition-colors font-mono text-sm font-semibold"
                  >
                    quotes@elmivet.com
                  </a>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">General Inquiries:</span>
                  <a href="mailto:info@elmivet.com" className="text-slate-200 hover:text-[#D9232D] transition-colors font-mono">
                    info@elmivet.com
                  </a>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">China Procurement Hub:</span>
                  <a href="mailto:china@elmivet.com" className="text-slate-200 hover:text-[#D9232D] transition-colors font-mono">
                    china@elmivet.com
                  </a>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-serif text-base font-bold text-white uppercase tracking-wider mb-4 border-b border-slate-800 pb-2">
                Direct WhatsApp Lines
              </h4>
              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-slate-400 block font-medium">WhatsApp Line 1:</span>
                  <a 
                    href="https://wa.me/2347076035180?text=Hello%20Elmivet%20International%20Limited%2C%20I%20would%20like%20to%20make%20an%20enquiry" 
                    target="_blank" 
                    rel="noreferrer"
                    className="text-emerald-400 hover:underline font-mono font-semibold text-sm flex items-center space-x-1 mt-0.5"
                  >
                    <span>+234 707 603 5180</span>
                    <span className="text-[10px] bg-emerald-950 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-800 ml-1">Chat / Call</span>
                  </a>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">WhatsApp Line 2:</span>
                  <a 
                    href="https://wa.me/2348128925190?text=Hello%20Elmivet%20International%20Limited%2C%20I%20would%20like%20to%20make%20an%20enquiry" 
                    target="_blank" 
                    rel="noreferrer"
                    className="text-emerald-400 hover:underline font-mono font-semibold text-sm flex items-center space-x-1 mt-0.5"
                  >
                    <span>+234 812 892 5190</span>
                    <span className="text-[10px] bg-emerald-950 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-800 ml-1">Chat / Call</span>
                  </a>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Middle Section: Navigation & Main Social Channels */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 border-b border-slate-800">
        
        {/* Quick Link Hub */}
        <div className="space-y-4">
          <h3 className="font-serif text-lg font-bold text-white tracking-wide border-l-2 border-[#D9232D] pl-3">
            Quick Links
          </h3>
          <ul className="space-y-2.5 text-sm text-slate-300">
            <li><NavLink to="/" className="hover:text-[#D9232D] transition-colors">Customer Support</NavLink></li>
            <li><NavLink to="/contact" className="hover:text-[#D9232D] transition-colors">Get a Quote</NavLink></li>
            <li><NavLink to="/services" className="hover:text-[#D9232D] transition-colors">Services & Global Freight</NavLink></li>
            <li><NavLink to="/tracking" className="hover:text-[#D9232D] transition-colors">Tracking & Forms Portal</NavLink></li>
            <li><NavLink to="/china-hub" className="hover:text-[#D9232D] transition-colors">China Office & Bonded Hub</NavLink></li>
          </ul>
        </div>

        {/* Our Divisions Hub */}
        <div className="space-y-4">
          <h3 className="font-serif text-lg font-bold text-white tracking-wide border-l-2 border-[#D9232D] pl-3">
            Our Divisions
          </h3>
          <div className="space-y-3 text-xs text-slate-300">
            <ul className="space-y-2.5 text-sm text-slate-300">
              <li><NavLink to="/" className="hover:text-[#D9232D] transition-colors">Global Trade</NavLink></li>
              <li><NavLink to="/china-hub" className="hover:text-[#D9232D] transition-colors">Logistics & Supply Chain</NavLink></li>
              <li><NavLink to="/services" className="hover:text-[#D9232D] transition-colors">Commercial</NavLink></li>
              <li><NavLink to="/tracking" className="hover:text-[#D9232D] transition-colors">Industrial</NavLink></li>
              <li><NavLink to="/contact" className="hover:text-[#D9232D] transition-colors">China Operations</NavLink></li>
            </ul>
          </div>
        </div>

        {/* Company Information Hub */}
        <div className="space-y-4">
          <h3 className="font-serif text-lg font-bold text-white tracking-wide border-l-2 border-[#D9232D] pl-3">
            Company Information
          </h3>
          <div className="space-y-3 text-xs text-slate-300">
            <ul className="space-y-2.5 text-sm text-slate-300">
              <li><NavLink to="/" className="hover:text-[#D9232D] transition-colors">About Elmivet</NavLink></li>
              <li><NavLink to="/china-hub" className="hover:text-[#D9232D] transition-colors">Leadership</NavLink></li>
              <li><NavLink to="/services" className="hover:text-[#D9232D] transition-colors">Delivered Jobs</NavLink></li>
              <li><NavLink to="/tracking" className="hover:text-[#D9232D] transition-colors">Brand Parternships</NavLink></li>
            </ul>
          </div>
        </div>

                {/* Operational Hubs Summary */}
        <div className="space-y-4">
          <h3 className="font-serif text-lg font-bold text-white tracking-wide border-l-2 border-[#D9232D] pl-3">
            Global Footprint
          </h3>
          <div className="space-y-3 text-xs text-slate-300">
            <div>
              <span className="text-[#D9232D] font-bold block uppercase tracking-wider text-[11px]">Headquarters</span>
              <p>Customs Bonded Terminal, Nigeria</p>
            </div>
            <div>
              <span className="text-[#D9232D] font-bold block uppercase tracking-wider text-[11px]">China Hub</span>
              <p>Guangdong Bonded Warehouse</p>
            </div>
            <div>
              <span className="text-[#D9232D] font-bold block uppercase tracking-wider text-[11px]">Corridor</span>
              <p>Benin Republic & Togo Ports</p>
            </div>
          </div>
        </div>

      </div>

      {/* Social Media & Split-Grid TikTok Popover Bar */}
      <div className="py-8">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 flex flex-col lg:flex-row items-center justify-between gap-6">
          
          <div className="text-center lg:text-left">
            <span className="font-serif text-sm font-bold tracking-wider uppercase text-white block">
              Official Corporate & Social Presence
            </span>
            <span className="text-xs text-slate-400">
              Connect with Elmivet across global trade and digital networks.
            </span>
          </div>

          {/* Professional Social Icon Bar */}
          <div className="flex flex-wrap items-center justify-center gap-4">
            
            {/* LinkedIn */}
            <a 
              href="https://www.linkedin.com/company/refiny-international-limited/" 
              target="_blank" 
              rel="noreferrer"
              aria-label="LinkedIn"
              className="w-10 h-10 rounded-sm bg-slate-800 hover:bg-[#D9232D] text-slate-200 hover:text-white flex items-center justify-center transition-all duration-200 shadow-xs"
            >
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
              </svg>
            </a>

            {/* Facebook */}
            <a 
              href="https://www.facebook.com/share/19dNBZ3bwa/" 
              target="_blank" 
              rel="noreferrer"
              aria-label="Facebook"
              className="w-10 h-10 rounded-sm bg-slate-800 hover:bg-[#D9232D] text-slate-200 hover:text-white flex items-center justify-center transition-all duration-200 shadow-xs"
            >
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z"/>
              </svg>
            </a>

            {/* X (Twitter) */}
            <a 
              href="https://x.com/Elmivet_int_ltd" 
              target="_blank" 
              rel="noreferrer"
              aria-label="X (Twitter)"
              className="w-10 h-10 rounded-sm bg-slate-800 hover:bg-[#D9232D] text-slate-200 hover:text-white flex items-center justify-center transition-all duration-200 shadow-xs"
            >
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
            </a>

            {/* Instagram */}
            <a 
              href="https://www.instagram.com/elmivet_international?stkn=YzhzeHFwNXhsY2p1" 
              target="_blank" 
              rel="noreferrer"
              aria-label="Instagram"
              className="w-10 h-10 rounded-sm bg-slate-800 hover:bg-[#D9232D] text-slate-200 hover:text-white flex items-center justify-center transition-all duration-200 shadow-xs"
            >
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
              </svg>
            </a>

            {/* YouTube */}
            <a 
              href="https://youtube.com/@elmivetinternationallimited?si=VT1Tvp-apbM5cAK8" 
              target="_blank" 
              rel="noreferrer"
              aria-label="YouTube"
              className="w-10 h-10 rounded-sm bg-slate-800 hover:bg-[#D9232D] text-slate-200 hover:text-white flex items-center justify-center transition-all duration-200 shadow-xs"
            >
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/>
              </svg>
            </a>

            {/* TikTok Dropdown Smart Popover Menu */}
            <div 
              className="relative"
              onMouseLeave={() => setIsTikTokDropdownOpen(false)}
            >
              <button
                onClick={() => setIsTikTokDropdownOpen(!isTikTokDropdownOpen)}
                onMouseEnter={() => setIsTikTokDropdownOpen(true)}
                className="px-4 h-10 rounded-sm bg-slate-800 hover:bg-[#D9232D] text-slate-200 hover:text-white flex items-center space-x-2 transition-all duration-200 text-xs font-semibold shadow-xs"
                aria-expanded={isTikTokDropdownOpen}
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"/>
                </svg>
                <span>TikTok Hub ({isTikTokDropdownOpen ? '▲' : '▼'})</span>
              </button>

              {/* Popover Split-Grid Content */}
              {isTikTokDropdownOpen && (
                <div 
                  className="absolute bottom-full left-1/2 -translate-x-1/2 sm:left-auto sm:right-0 sm:translate-x-0 mb-3 w-[calc(100vw-2rem)] max-w-sm sm:w-96 bg-slate-900 border border-slate-700 rounded-md shadow-2xl p-4 text-xs z-50 space-y-4"
                >
                  {/* Category 1: Corporate Operations */}
                  <div>
                    <span className="text-[10px] font-bold text-[#D9232D] uppercase tracking-wider block border-b border-slate-800 pb-1 mb-2">
                      Corporate Operations (Business & Logistics)
                    </span>
                    <div className="space-y-1.5 font-mono">
                      <a 
                        href="https://www.tiktok.com/@elmivet_int_ltd?_r=1&_t=ZS-9AEqhYIG8Ju" 
                        target="_blank" 
                        rel="noreferrer"
                        className="block px-2.5 py-1.5 rounded hover:bg-slate-800 text-slate-200 hover:text-white transition-colors"
                      >
                        • Main Brand: <span className="text-[#D9232D]">@elmivet_int_ltd</span>
                      </a>
                      <a 
                        href="https://www.tiktok.com/@elmivet_impex?_r=1&_t=ZS-9AEqlszZjVQ" 
                        target="_blank" 
                        rel="noreferrer"
                        className="block px-2.5 py-1.5 rounded hover:bg-slate-800 text-slate-200 hover:text-white transition-colors"
                      >
                        • Import/Export: <span className="text-[#D9232D]">@elmivet_impex</span>
                      </a>
                      <a 
                        href="https://www.tiktok.com/@clearing_forwarding?_r=1&_t=ZS-9AEqs29ADt1" 
                        target="_blank" 
                        rel="noreferrer"
                        className="block px-2.5 py-1.5 rounded hover:bg-slate-800 text-slate-200 hover:text-white transition-colors"
                      >
                        • Logistics & Clearing: <span className="text-[#D9232D]">@clearing_forwarding</span>
                      </a>
                    </div>
                  </div>

                  {/* Category 2: Creative Hub */}
                  <div>
                    <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block border-b border-slate-800 pb-1 mb-2">
                      Creative Hub (Entertainment Only)
                    </span>
                    <a 
                      href="https://www.tiktok.com/@elmivet_storyai?_r=1&_t=ZS-9AEqy2F1v68" 
                      target="_blank" 
                      rel="noreferrer"
                      className="block px-2.5 py-2 rounded hover:bg-slate-800 text-slate-200 hover:text-white transition-colors font-mono"
                    >
                      • AI Creative Stories: <span className="text-amber-400">@elmivet_storyai</span>
                      <span className="block text-[10px] text-slate-400 font-sans italic mt-0.5">
                        (Creative Space) Dedicated purely to AI storytelling and entertainment. No corporate logistics content.
                      </span>
                    </a>
                  </div>
                </div>
              )}
            </div>


          </div>

        </div>
      </div>


      {/* Lower Copyright & Legal Strip */}
      <div className="bg-slate-950 border-t border-slate-900 py-5">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 flex flex-col md:flex-row items-center justify-between text-xs text-slate-400 space-y-4 md:space-y-0">
          <p>© {currentYear} Elmivet International Limited. All Rights Reserved. (RC 8809789)</p>
          
          <div className="flex flex-wrap items-center justify-center gap-6 font-sans">
            <span className="hover:text-slate-200 cursor-pointer transition-colors">Bonded Terminal Compliance</span>
            <span className="hover:text-slate-200 cursor-pointer transition-colors">Customs Brokerage Terms</span>
            <span className="hover:text-slate-200 cursor-pointer transition-colors">Privacy Policy</span>
            
            {/* Back to Top Button */}
            <button
              onClick={scrollToTop}
              className="flex items-center space-x-1.5 text-xs text-[#D9232D] hover:text-white bg-slate-900 hover:bg-[#D9232D] px-3 py-1 rounded-sm border border-slate-800 transition-all duration-200 shadow-xs cursor-pointer font-semibold ml-0 md:ml-4"
              aria-label="Scroll to top of page"
            >
              <span>Back to Top</span>
              <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                <path d="M12 4l-8 8h5v8h6v-8h5z" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}