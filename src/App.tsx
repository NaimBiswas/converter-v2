import React, { useState, useEffect, lazy, Suspense } from 'react';
import { Analytics } from '@vercel/analytics/react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { applyPageMeta, PAGE_META } from './utils/meta';
import { Header } from './components/Header';
import { HeroDropzone } from './components/HeroDropzone';
import { ActiveConverter } from './components/ActiveConverter';
import { HowItWorks } from './components/HowItWorks';
import { PopularTools } from './components/PopularTools';
import { ToolsModal } from './components/ToolsModal';
import { PricingModal } from './components/PricingModal';
import { ApiModal } from './components/ApiModal';
import { AuthModal } from './components/AuthModal';
import { Footer } from './components/Footer';
import { FooterAd } from './components/FooterAd';
import { SideAds } from './components/SideAds';
import { WhyDataConverter } from './components/WhyDataConverter';

// Pages
const ToolsPage = lazy(() => import('./components/pages/ToolsPage').then((m) => ({ default: m.ToolsPage })));
const ApiPage = lazy(() => import('./components/pages/ApiPage').then((m) => ({ default: m.ApiPage })));
const PricingPage = lazy(() => import('./components/pages/PricingPage').then((m) => ({ default: m.PricingPage })));
const DocsPage = lazy(() => import('./components/pages/DocsPage').then((m) => ({ default: m.DocsPage })));
const PrivacyPage = lazy(() => import('./components/pages/PrivacyPage').then((m) => ({ default: m.PrivacyPage })));
const TermsPage = lazy(() => import('./components/pages/TermsPage').then((m) => ({ default: m.TermsPage })));
const HelpPage = lazy(() => import('./components/pages/HelpPage').then((m) => ({ default: m.HelpPage })));
const ContactPage = lazy(() => import('./components/pages/ContactPage').then((m) => ({ default: m.ContactPage })));
const NotFoundPage = lazy(() => import('./components/pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage })));

import { POPULAR_TOOLS } from './data/tools';
import { ConversionTool, UploadedFileItem } from './types';
import { convertSingleFile, getAvailableTargetFormats } from './utils/converter';
import * as XLSX from 'xlsx';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <span className="material-symbols-outlined animate-spin text-3xl text-[#0058be] dark:text-[#38bdf8]">
        progress_activity
      </span>
    </div>
  );
}

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark' || saved === 'light') return saved;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  const [files, setFiles] = useState<UploadedFileItem[]>([]);
  const [isToolsOpen, setIsToolsOpen] = useState(false);
  const [isPricingOpen, setIsPricingOpen] = useState(false);
  const [isApiOpen, setIsApiOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem('theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  useEffect(() => {
    const normalized =
      location.pathname.length > 1 && location.pathname.endsWith('/')
        ? location.pathname.slice(0, -1)
        : location.pathname;
    applyPageMeta(PAGE_META[normalized] ?? PAGE_META['/']);
  }, [location.pathname]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Handles adding files from dropzone or file picker
  const handleFilesAdded = (inputFiles: FileList | File[]) => {
    const newItems: UploadedFileItem[] = Array.from(inputFiles).map((file) => {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'txt';
      const available = getAvailableTargetFormats(file);
      const target = available[0] || 'PDF';

      let previewUrl: string | undefined;
      if (file.type.startsWith('image/')) {
        previewUrl = URL.createObjectURL(file);
      }

      return {
        id: 'file_' + Math.random().toString(36).substring(2, 9),
        file,
        name: file.name,
        size: file.size,
        type: file.type || 'application/octet-stream',
        extension: ext,
        previewUrl,
        targetFormat: target,
        availableFormats: available,
        status: 'idle',
        progress: 0,
      };
    });

    setFiles((prev) => [...prev, ...newItems]);
    showToast(`Added ${newItems.length} file(s) to workplace`);
    navigate('/');

    // Smooth scroll down to workspace
    setTimeout(() => {
      const el = document.getElementById('conversion-workplace');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  // Update target output format for a single file item
  const handleUpdateTargetFormat = (id: string, format: string) => {
    setFiles((prev) =>
      prev.map((item) => (item.id === id ? { ...item, targetFormat: format, status: 'idle' } : item))
    );
  };

  // Convert a single file item
  const handleConvertFile = async (id: string) => {
    const item = files.find((f) => f.id === id);
    if (!item) return;

    const startTime = Date.now();

    setFiles((prev) =>
      prev.map((f) =>
        f.id === id ? { ...f, status: 'converting', progress: 10, conversionStartTime: startTime } : f
      )
    );

    let currentProgress = 10;
    // Step speed based on file size: smaller files tick faster, larger files tick steadily
    const stepInterval = Math.max(120, Math.min(600, Math.floor(item.size / 5000)));
    const progressTimer = setInterval(() => {
      setFiles((prev) =>
        prev.map((f) => {
          if (f.id === id && f.status === 'converting' && f.progress < 90) {
            currentProgress = Math.min(90, f.progress + Math.floor(Math.random() * 8) + 4);
            return { ...f, progress: currentProgress };
          }
          return f;
        })
      );
    }, stepInterval);

    try {
      const result = await convertSingleFile(
        item,
        (p) => {
          setFiles((prev) =>
            prev.map((f) => (f.id === id ? { ...f, progress: Math.max(currentProgress, p) } : f))
          );
        },
        files
      );

      clearInterval(progressTimer);

      // Brief finalization state at 95%
      setFiles((prev) =>
        prev.map((f) => (f.id === id ? { ...f, progress: 95 } : f))
      );
      await new Promise((res) => setTimeout(res, 200));

      setFiles((prev) =>
        prev.map((f) =>
          f.id === id
            ? {
                ...f,
                status: 'completed',
                progress: 100,
                convertedBlob: result.blob,
                convertedUrl: result.url,
                convertedSize: result.size,
                convertedName: result.filename,
                convertedContentText: result.textContent,
              }
            : f
        )
      );

      if (item.targetFormat.toUpperCase() === 'MERGE' && item.extension.toLowerCase() === 'pdf') {
        const pdfCount = files.filter((f) => f.extension.toLowerCase() === 'pdf').length;
        showToast(
          pdfCount > 1
            ? `Merged ${pdfCount} PDF files into one document!`
            : `Successfully converted ${item.name} to ${item.targetFormat}!`
        );
      } else {
        showToast(`Successfully converted ${item.name} to ${item.targetFormat}!`);
      }
    } catch (err: any) {
      clearInterval(progressTimer);
      setFiles((prev) =>
        prev.map((f) =>
          f.id === id
            ? { ...f, status: 'error', errorMessage: err.message || 'Conversion failed' }
            : f
        )
      );
      showToast(`Failed to convert ${item.name}`);
    }
  };

  // Convert all files in list
  const handleConvertAll = async () => {
    const pending = files.filter((f) => f.status !== 'completed');
    if (pending.length === 0) return;

    for (const f of pending) {
      await handleConvertFile(f.id);
    }
  };

  const handleRemoveFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const handleClearAll = () => {
    setFiles([]);
    showToast('Cleared workplace');
  };

  // Launch popular tool preset with sample file if no file uploaded
  const handleSelectTool = (tool: ConversionTool) => {
    let filename = `sample_dataset.${tool.fromFormat.toLowerCase()}`;
    let content = 'name,role,department\nAlice,Engineer,Development\nBob,Designer,Design';
    let type = 'text/csv';

    if (tool.fromFormat === 'XML') {
      filename = 'data_export.xml';
      content = '<?xml version="1.0" encoding="UTF-8"?>\n<records>\n  <item>\n    <name>Alice</name>\n    <role>Engineer</role>\n  </item>\n</records>';
      type = 'application/xml';
    } else if (tool.fromFormat === 'YAML') {
      filename = 'config.yaml';
      content = 'app:\n  name: Data Converter\n  version: 2.0\nfeatures:\n  - csv\n  - json\n  - excel';
      type = 'text/yaml';
    } else if (tool.fromFormat === 'Excel') {
      filename = 'workbook.xlsx';
      const ws = XLSX.utils.aoa_to_sheet([
        ['Name', 'Role', 'Department'],
        ['Alice', 'Engineer', 'Dev'],
        ['Bob', 'Designer', 'UX'],
      ]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const sampleFile = new File([excelBuffer], filename, {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      handleFilesAdded([sampleFile]);
      return;
    } else if (tool.fromFormat === 'Base64') {
      filename = 'token.txt';
      content = 'SGVsbG8gRGF0YSBDb252ZXJ0ZXIh';
      type = 'text/plain';
    } else if (tool.fromFormat === 'PDF' || tool.toFormat === 'PDF') {
      filename = 'sample_document.pdf';
      content = 'Sample PDF document content for Data Converter transformation.';
      type = 'application/pdf';
    } else if (tool.fromFormat === 'JSON') {
      filename = 'data_export.json';
      content = JSON.stringify([{ id: 1, name: 'Alice', role: 'Engineer' }], null, 2);
      type = 'application/json';
    } else if (tool.category === 'images') {
      filename = `sample_photo.jpg`;
      const canvas = document.createElement('canvas');
      canvas.width = 300;
      canvas.height = 300;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#0058be';
        ctx.fillRect(0, 0, 300, 300);
        ctx.fillStyle = '#ffffff';
        ctx.font = '22px sans-serif';
        ctx.fillText('Data Converter', 70, 150);
      }
      canvas.toBlob((blob) => {
        if (blob) {
          const sampleFile = new File([blob], filename, { type: 'image/jpeg' });
          handleFilesAdded([sampleFile]);
        }
      });
      return;
    }

    const blob = new Blob([content], { type });
    const sampleFile = new File([blob], filename, { type });
    handleFilesAdded([sampleFile]);
  };

  return (
    <div className="min-h-screen relative bg-[#f8f9fa] dark:bg-[#0b0e14] text-[#191c1d] dark:text-[#e1e3e4] flex flex-col font-sans antialiased transition-colors duration-200">
      <ScrollToTop />

      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed top-24 right-6 z-50 bg-[#191c1d] dark:bg-[#1e293b] text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 border border-transparent dark:border-[#334155]">
          <span className="material-symbols-outlined text-[#6cf8bb]">check_circle</span>
          <span className="text-xs font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <Header
        theme={theme}
        onToggleTheme={toggleTheme}
        onOpenAuthModal={() => setIsAuthOpen(true)}
      />

      {/* Main Content Area handled by Router */}
      <main className="flex-1">
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route
              path="/"
              element={
                <>
                  {/* Hero & Upload Dropzone */}
                  <HeroDropzone onFilesSelected={handleFilesAdded} />

                  {/* Active Conversion Workplace */}
                  <div id="conversion-workplace">
                    <ActiveConverter
                      files={files}
                      onUpdateTargetFormat={handleUpdateTargetFormat}
                      onConvertFile={handleConvertFile}
                      onConvertAll={handleConvertAll}
                      onRemoveFile={handleRemoveFile}
                      onAddMore={() => {
                        const input = document.createElement('input');
                        input.type = 'file';
                        input.multiple = true;
                        input.onchange = (e: any) => {
                          if (e.target.files) handleFilesAdded(e.target.files);
                        };
                        input.click();
                      }}
                      onClearAll={handleClearAll}
                    />
                  </div>

                  {/* How It Works Section */}
                  <HowItWorks />

                  {/* Popular Tools Section */}
                  <PopularTools
                    tools={POPULAR_TOOLS}
                    onSelectTool={handleSelectTool}
                  />
                </>
              }
            />

            <Route path="/tools" element={<ToolsPage onSelectTool={handleSelectTool} />} />
            <Route path="/api" element={<ApiPage />} />
            <Route path="/pricing" element={<PricingPage />} />
            <Route path="/docs" element={<DocsPage />} />
            <Route path="/privacy" element={<PrivacyPage onNavigateToContact={() => navigate('/contact')} />} />
            <Route path="/terms" element={<TermsPage onNavigateToContact={() => navigate('/contact')} />} />
            <Route
              path="/help"
              element={
                <HelpPage
                  onNavigateToContact={() => navigate('/contact')}
                  onNavigateToApi={() => navigate('/api')}
                />
              }
            />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </main>

      {/* Quick Modals */}
      <ToolsModal
        isOpen={isToolsOpen}
        onClose={() => setIsToolsOpen(false)}
        onSelectTool={handleSelectTool}
      />

      <PricingModal
        isOpen={isPricingOpen}
        onClose={() => setIsPricingOpen(false)}
        onSelectPlan={(plan) => showToast(`Selected plan: ${plan}`)}
      />

      <ApiModal
        isOpen={isApiOpen}
        onClose={() => setIsApiOpen(false)}
      />

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onSuccess={(email) => showToast(`Signed in as ${email}`)}
      />

      {/* Side Ads */}
      <SideAds />

      {/* Why Data Converter Section */}
      <WhyDataConverter />

      {/* Footer Ad */}
      <FooterAd />

      {/* Footer */}
      <Footer />

      <Analytics />
    </div>
  );
}

