import React from 'react';
import { Link } from 'react-router-dom';

export const Footer: React.FC = () => {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="bg-[#f3f4f5] dark:bg-[#0c0f14] w-full border-t border-[#e1e3e4] dark:border-[#262c3a] transition-colors duration-200 pt-16 pb-8">
      <div className="max-w-[1200px] mx-auto px-4 md:px-8">
        {/* Main Footer Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-12 border-b border-[#e1e3e4] dark:border-[#262c3a]">
          {/* Column 1: Brand & Bio (2 cols wide on lg) */}
          <div className="lg:col-span-2 space-y-4">
            <Link 
              to="/" 
              onClick={scrollToTop}
              className="inline-flex items-center gap-2.5 group cursor-pointer"
            >
              <div className="w-9 h-9 rounded-xl bg-[#d8e2ff] dark:bg-[#1e293b] flex items-center justify-center text-[#0058be] dark:text-[#38bdf8] group-hover:rotate-180 transition-transform duration-500 shadow-xs">
                <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                  transform
                </span>
              </div>
              <span className="text-xl font-extrabold text-[#0058be] dark:text-[#38bdf8] tracking-tight font-heading">
                Data Converter
              </span>
            </Link>

            <p className="text-xs md:text-sm text-[#424754] dark:text-[#94a3b8] leading-relaxed max-w-sm">
              The browser-native, client-side file conversion platform. Transform spreadsheets, JSON, PDFs, and images locally with total privacy and zero cloud uploads.
            </p>

            {/* Security Badges */}
            <div className="flex flex-wrap gap-2 pt-1">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white dark:bg-[#161f30] text-[11px] font-bold text-[#0058be] dark:text-[#38bdf8] border border-[#e1e3e4] dark:border-[#262c3a]">
                <span className="material-symbols-outlined text-sm">shield</span>
                100% Client-Side
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white dark:bg-[#161f30] text-[11px] font-bold text-[#00714d] dark:text-[#6ee7b7] border border-[#e1e3e4] dark:border-[#262c3a]">
                <span className="material-symbols-outlined text-sm">cloud_off</span>
                Zero Cloud Uploads
              </span>
            </div>

            {/* Social Links */}
            <div className="flex items-center gap-3 pt-2">
              <a
                href="https://github.com/NaimBiswas/converter-v2"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="GitHub Repository"
                className="w-8 h-8 rounded-full bg-white dark:bg-[#161f30] border border-[#e1e3e4] dark:border-[#262c3a] text-[#424754] dark:text-[#94a3b8] hover:text-[#0058be] dark:hover:text-[#38bdf8] flex items-center justify-center transition-all hover:scale-105"
              >
                <span className="material-symbols-outlined text-lg">code</span>
              </a>
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Twitter Page"
                className="w-8 h-8 rounded-full bg-white dark:bg-[#161f30] border border-[#e1e3e4] dark:border-[#262c3a] text-[#424754] dark:text-[#94a3b8] hover:text-[#0058be] dark:hover:text-[#38bdf8] flex items-center justify-center transition-all hover:scale-105"
              >
                <span className="material-symbols-outlined text-lg">tag</span>
              </a>
              <a
                href="mailto:nayeembiswas2@gmail.com"
                aria-label="Email Support"
                className="w-8 h-8 rounded-full bg-white dark:bg-[#161f30] border border-[#e1e3e4] dark:border-[#262c3a] text-[#424754] dark:text-[#94a3b8] hover:text-[#0058be] dark:hover:text-[#38bdf8] flex items-center justify-center transition-all hover:scale-105"
              >
                <span className="material-symbols-outlined text-lg">mail</span>
              </a>
            </div>
          </div>

          {/* Column 2: Products & Converters */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-[#191c1d] dark:text-white uppercase tracking-wider font-heading">
              Products
            </h4>
            <ul className="space-y-2 text-xs text-[#424754] dark:text-[#94a3b8]">
              <li>
                <Link to="/" onClick={scrollToTop} className="hover:text-[#0058be] dark:hover:text-[#38bdf8] transition-colors">
                  Converter Workspace
                </Link>
              </li>
              <li>
                <Link to="/tools" onClick={scrollToTop} className="hover:text-[#0058be] dark:hover:text-[#38bdf8] transition-colors">
                  Tools Directory
                </Link>
              </li>
              <li>
                <Link to="/tools" onClick={scrollToTop} className="hover:text-[#0058be] dark:hover:text-[#38bdf8] transition-colors">
                  Spreadsheet Converters
                </Link>
              </li>
              <li>
                <Link to="/tools" onClick={scrollToTop} className="hover:text-[#0058be] dark:hover:text-[#38bdf8] transition-colors">
                  JSON &amp; CSV Utilities
                </Link>
              </li>
              <li>
                <Link to="/tools" onClick={scrollToTop} className="hover:text-[#0058be] dark:hover:text-[#38bdf8] transition-colors">
                  PDF &amp; Document Tools
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Developer & API */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-[#191c1d] dark:text-white uppercase tracking-wider font-heading">
              Developers
            </h4>
            <ul className="space-y-2 text-xs text-[#424754] dark:text-[#94a3b8]">
              {/* <li>
                <Link to="/api" onClick={scrollToTop} className="hover:text-[#0058be] dark:hover:text-[#38bdf8] transition-colors">
                  Developer REST API
                </Link>
              </li> */}
              {/* <li>
                <Link to="/pricing" onClick={scrollToTop} className="hover:text-[#0058be] dark:hover:text-[#38bdf8] transition-colors">
                  API Plans &amp; Pricing
                </Link>
              </li> */}
              <li>
                <Link to="/docs" onClick={scrollToTop} className="hover:text-[#0058be] dark:hover:text-[#38bdf8] transition-colors">
                  Documentation &amp; Specs
                </Link>
              </li>
              <li>
                <div className="inline-flex items-center gap-1.5 text-[11px] text-[#00714d] dark:text-[#6ee7b7]">
                  <span className="w-2 h-2 rounded-full bg-[#6cf8bb] animate-pulse"></span>
                  Systems Operational
                </div>
              </li>
            </ul>
          </div>

          {/* Column 4: Legal & Support */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-[#191c1d] dark:text-white uppercase tracking-wider font-heading">
              Company &amp; Legal
            </h4>
            <ul className="space-y-2 text-xs text-[#424754] dark:text-[#94a3b8]">
              <li>
                <Link to="/privacy" onClick={scrollToTop} className="hover:text-[#0058be] dark:hover:text-[#38bdf8] transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/terms" onClick={scrollToTop} className="hover:text-[#0058be] dark:hover:text-[#38bdf8] transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link to="/help" onClick={scrollToTop} className="hover:text-[#0058be] dark:hover:text-[#38bdf8] transition-colors">
                  Help Center &amp; FAQs
                </Link>
              </li>
              <li>
                <Link to="/contact" onClick={scrollToTop} className="hover:text-[#0058be] dark:hover:text-[#38bdf8] transition-colors">
                  Contact Support
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Developer API CTA Ribbon */}
        {/* <div className="my-8 bg-gradient-to-r from-[#d8e2ff] to-[#e8f0fe] dark:from-[#162032] dark:to-[#1a263d] rounded-2xl p-5 border border-[#c1d3fe] dark:border-[#26354f] flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-2xl text-[#0058be] dark:text-[#38bdf8]">
              terminal
            </span>
            <div>
              <h5 className="text-xs md:text-sm font-bold text-[#191c1d] dark:text-white">
                Automate your data conversions programmatically
              </h5>
              <p className="text-[11px] text-[#424754] dark:text-[#94a3b8]">
                Get 1,000 free REST API conversion requests every month.
              </p>
            </div>
          </div>
          <Link
            to="/api"
            onClick={scrollToTop}
            className="bg-[#0058be] dark:bg-[#0284c7] text-white text-xs font-bold px-4 py-2 rounded-full hover:bg-[#2170e4] transition-all shrink-0 cursor-pointer flex items-center gap-1.5 shadow-xs"
          >
            Explore REST API
            <span className="material-symbols-outlined text-sm">arrow_forward</span>
          </Link>
        </div> */}

        {/* Bottom Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 text-xs text-[#424754] dark:text-[#94a3b8]">
          <p>© {new Date().getFullYear()} Data Converter. All rights reserved.</p>
          
          <button
            onClick={scrollToTop}
            className="inline-flex items-center gap-1 hover:text-[#0058be] dark:hover:text-[#38bdf8] transition-colors cursor-pointer text-xs font-bold"
          >
            Back to top
            <span className="material-symbols-outlined text-base">expand_less</span>
          </button>
        </div>
      </div>
    </footer>
  );
};


