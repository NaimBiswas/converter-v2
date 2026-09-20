import React, { useState } from 'react';
import { UploadedFileItem } from '../types';
import { formatBytes, getEstimatedTimeRemaining } from '../utils/converter';

interface ActiveConverterProps {
  files: UploadedFileItem[];
  onUpdateTargetFormat: (id: string, format: string) => void;
  onConvertFile: (id: string) => void;
  onConvertAll: () => void;
  onRemoveFile: (id: string) => void;
  onAddMore: () => void;
  onClearAll: () => void;
}

export const ActiveConverter: React.FC<ActiveConverterProps> = ({
  files,
  onUpdateTargetFormat,
  onConvertFile,
  onConvertAll,
  onRemoveFile,
  onAddMore,
  onClearAll,
}) => {
  const [previewContent, setPreviewContent] = useState<{ name: string; content: string; isImage?: boolean; isPdf?: boolean; url?: string } | null>(null);

  if (files.length === 0) return null;

  const isAnyConverting = files.some((f) => f.status === 'converting');
  const allCompleted = files.every((f) => f.status === 'completed');

  return (
    <section className="py-8 px-4 md:px-8 max-w-[1200px] mx-auto w-full">
      {/* Workspace Header Bar */}
      <div className="bg-white dark:bg-[#161f30] rounded-2xl p-6 soft-shadow border border-[#e1e3e4] dark:border-[#262c3a] mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-colors">
        <div>
          <h2 className="text-2xl font-bold text-[#191c1d] dark:text-white font-heading flex items-center gap-2">
            <span className="material-symbols-outlined text-[#0058be] dark:text-[#38bdf8]">published_with_changes</span>
            Conversion Workplace ({files.length} {files.length === 1 ? 'file' : 'files'})
          </h2>
          <p className="text-sm text-[#424754] dark:text-[#94a3b8]">Select your target formats and click convert to start process.</p>
        </div>

        <div className="flex items-center gap-3 flex-wrap w-full md:w-auto">
          <button
            onClick={onAddMore}
            className="text-xs md:text-sm font-semibold text-[#0058be] dark:text-[#38bdf8] bg-[#d8e2ff] dark:bg-[#1e293b] hover:bg-[#adc6ff] dark:hover:bg-[#334155] px-4 py-2 rounded-full transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <span className="material-symbols-outlined text-base">add</span>
            Add Files
          </button>
          
          <button
            onClick={onClearAll}
            className="text-xs md:text-sm font-semibold text-[#424754] dark:text-[#94a3b8] hover:text-[#ba1a1a] dark:hover:text-[#f87171] px-3 py-2 transition-colors cursor-pointer"
          >
            Clear All
          </button>

          <button
            onClick={onConvertAll}
            disabled={isAnyConverting}
            className={`text-xs md:text-sm font-semibold text-white px-6 py-2.5 rounded-full transition-all shadow-md flex items-center gap-2 cursor-pointer ${
              isAnyConverting
                ? 'bg-[#0058be]/60 dark:bg-[#0284c7]/60 cursor-not-allowed'
                : allCompleted
                ? 'bg-[#006c49] dark:bg-[#10b981] hover:bg-[#00714d] dark:hover:bg-[#059669]'
                : 'bg-[#0058be] dark:bg-[#0284c7] hover:bg-[#2170e4] dark:hover:bg-[#0369a1]'
            }`}
          >
            <span className="material-symbols-outlined text-base">
              {isAnyConverting ? 'autorenew' : allCompleted ? 'done_all' : 'bolt'}
            </span>
            {isAnyConverting ? 'Converting...' : allCompleted ? 'Convert Again' : 'Convert All Now'}
          </button>
        </div>
      </div>

      {/* File List Cards */}
      <div className="space-y-4">
        {files.map((item) => {
          const isConverting = item.status === 'converting';
          const isDone = item.status === 'completed';

          return (
            <div
              key={item.id}
              className={`bg-white dark:bg-[#161f30] rounded-2xl p-5 soft-shadow border transition-all duration-300 ${
                isDone
                  ? 'border-[#6cf8bb] dark:border-[#10b981]/50 bg-[#f0fdf4]/30 dark:bg-[#064e3b]/20'
                  : 'border-[#e1e3e4] dark:border-[#262c3a] hover:border-[#adc6ff] dark:hover:border-[#334155]'
              }`}
            >
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                {/* File Thumbnail & Meta */}
                <div className="flex items-center gap-4 min-w-0 flex-1">
                  <div className="w-12 h-12 rounded-xl bg-[#f3f4f5] dark:bg-[#1e293b] flex items-center justify-center shrink-0 text-[#0058be] dark:text-[#38bdf8]">
                    {item.extension === 'heic' || item.extension === 'heif' ? (
                      <span className="material-symbols-outlined text-2xl">photo_camera</span>
                    ) : item.type.startsWith('image/') ? (
                      item.previewUrl ? (
                        <img
                          src={item.previewUrl}
                          alt={item.name}
                          className="w-full h-full object-cover rounded-xl"
                        />
                      ) : (
                        <span className="material-symbols-outlined text-2xl">image</span>
                      )
                    ) : item.extension === 'pdf' ? (
                      <span className="material-symbols-outlined text-2xl text-[#ba1a1a] dark:text-[#f87171]">picture_as_pdf</span>
                    ) : item.extension === 'csv' || item.extension === 'json' ? (
                      <span className="material-symbols-outlined text-2xl text-[#006c49] dark:text-[#34d399]">table_view</span>
                    ) : (
                      <span className="material-symbols-outlined text-2xl text-[#0058be] dark:text-[#38bdf8]">description</span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 className="text-base font-semibold text-[#191c1d] dark:text-white truncate font-heading" title={item.name}>
                      {item.name}
                    </h3>
                    <p className="text-xs text-[#424754] dark:text-[#94a3b8] flex items-center gap-2 mt-0.5 flex-wrap">
                      <span>{formatBytes(item.size)}</span>
                      <span>•</span>
                      <span className="uppercase font-semibold text-[#0058be] dark:text-[#38bdf8]">{item.extension || 'FILE'}</span>
                      {isConverting && (
                        <>
                          <span>→</span>
                          <span className="text-[#0058be] dark:text-[#38bdf8] font-bold inline-flex items-center gap-1 bg-[#d8e2ff]/50 dark:bg-[#1e293b] px-2 py-0.5 rounded-md">
                            <span className="material-symbols-outlined text-xs animate-spin">sync</span>
                            ETA: {getEstimatedTimeRemaining(item.size, item.progress, item.conversionStartTime)}
                          </span>
                        </>
                      )}
                      {isDone && item.convertedSize && (
                        <>
                          <span>→</span>
                          <span className="text-[#006c49] dark:text-[#34d399] font-bold">
                            {formatBytes(item.convertedSize)} (Done)
                          </span>
                        </>
                      )}
                    </p>
                  </div>
                </div>

                {/* Target Format Selector & Actions */}
                <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end shrink-0 border-t md:border-t-0 pt-3 md:pt-0 border-[#e1e3e4] dark:border-[#262c3a]">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-[#424754] dark:text-[#94a3b8]">To:</span>
                    <select
                      value={item.targetFormat}
                      onChange={(e) => onUpdateTargetFormat(item.id, e.target.value)}
                      disabled={isConverting}
                      className="bg-[#f3f4f5] dark:bg-[#1e293b] text-[#191c1d] dark:text-white text-xs font-bold px-3 py-2 rounded-lg border border-[#c2c6d6] dark:border-[#334155] focus:border-[#0058be] dark:focus:border-[#38bdf8] focus:outline-none cursor-pointer"
                    >
                      {item.availableFormats.map((fmt) => (
                        <option key={fmt} value={fmt} className="bg-white dark:bg-[#1e293b] text-[#191c1d] dark:text-white">
                          {fmt}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* View Preview Button if Converted Text/Image available */}
                    {isDone && (item.convertedContentText || item.convertedUrl) && (
                      <button
                        onClick={async () => {
                          const isImage = /\.(jpe?g|png|webp|gif)$/i.test(item.convertedName || '');
                          let isPdf = false;
                          if (!isImage && /\.pdf$/i.test(item.convertedName || '') && item.convertedBlob) {
                            try {
                              const head = await item.convertedBlob.slice(0, 5).text();
                              isPdf = head === '%PDF-';
                            } catch {
                              isPdf = false;
                            }
                          }
                          setPreviewContent({
                            name: item.convertedName || item.name,
                            content: item.convertedContentText || '',
                            isImage,
                            isPdf,
                            url: item.convertedUrl
                          });
                        }}
                        className="p-2 text-[#0058be] dark:text-[#38bdf8] hover:bg-[#d8e2ff]/50 dark:hover:bg-[#1e293b] rounded-lg transition-colors cursor-pointer"
                        title="Quick Preview"
                      >
                        <span className="material-symbols-outlined text-lg">visibility</span>
                      </button>
                    )}

                    {/* Convert or Download Button */}
                    {isDone ? (
                      <a
                        href={item.convertedUrl}
                        download={item.convertedName}
                        className="bg-[#006c49] dark:bg-[#10b981] text-white text-xs font-bold px-4 py-2 rounded-full hover:bg-[#00714d] dark:hover:bg-[#059669] transition-colors flex items-center gap-1.5 shadow-sm"
                      >
                        <span className="material-symbols-outlined text-base">download</span>
                        Download
                      </a>
                    ) : (
                      <button
                        onClick={() => onConvertFile(item.id)}
                        disabled={isConverting}
                        className="bg-[#0058be] dark:bg-[#0284c7] text-white text-xs font-bold px-4 py-2 rounded-full hover:bg-[#2170e4] dark:hover:bg-[#0369a1] transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <span className="material-symbols-outlined text-base">
                          {isConverting ? 'sync' : 'play_arrow'}
                        </span>
                        {isConverting ? 'Converting...' : 'Convert'}
                      </button>
                    )}

                    {/* Remove File Button */}
                    <button
                      onClick={() => onRemoveFile(item.id)}
                      disabled={isConverting}
                      className="p-2 text-[#727785] dark:text-[#94a3b8] hover:text-[#ba1a1a] dark:hover:text-[#f87171] hover:bg-[#ffdad6]/50 dark:hover:bg-[#7f1d1d]/30 rounded-lg transition-colors cursor-pointer disabled:opacity-30"
                      title="Remove"
                    >
                      <span className="material-symbols-outlined text-lg">close</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Progress Bar during Conversion */}
              {isConverting && (
                <div className="mt-4 p-3.5 bg-[#f0f5ff] dark:bg-[#111927] rounded-xl border border-[#c1d3fe] dark:border-[#1e2d4a] transition-all">
                  <div className="flex flex-wrap justify-between items-center text-xs font-semibold text-[#0058be] dark:text-[#38bdf8] mb-2 gap-2">
                    <span className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-base animate-spin">sync</span>
                      Converting to <span className="font-bold underline">{item.targetFormat}</span>
                    </span>

                    <div className="flex items-center gap-2.5">
                      {/* Estimated Time Remaining Badge */}
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white dark:bg-[#1e293b] border border-[#d8e2ff] dark:border-[#334155] text-[11px] font-bold text-[#0058be] dark:text-[#38bdf8] shadow-2xs">
                        <span className="material-symbols-outlined text-xs">schedule</span>
                        Est. time remaining: {getEstimatedTimeRemaining(item.size, item.progress, item.conversionStartTime)}
                      </span>

                      <span className="font-extrabold text-[#0058be] dark:text-[#38bdf8]">{item.progress}%</span>
                    </div>
                  </div>

                  {/* Animated Progress Bar */}
                  <div className="w-full bg-[#d8e2ff]/60 dark:bg-[#1e293b] h-2.5 rounded-full overflow-hidden p-0.5 border border-[#c1d3fe]/60 dark:border-[#334155]">
                    <div
                      className="bg-gradient-to-r from-[#0058be] via-[#2170e4] to-[#38bdf8] dark:from-[#0284c7] dark:via-[#0ea5e9] dark:to-[#38bdf8] h-full transition-all duration-300 rounded-full shadow-xs"
                      style={{ width: `${item.progress}%` }}
                    ></div>
                  </div>

                  <div className="flex justify-between items-center text-[11px] text-[#424754] dark:text-[#94a3b8] mt-2 px-0.5">
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-xs">hard_drive</span>
                      File size: {formatBytes(item.size)}
                    </span>
                    <span className="flex items-center gap-1 text-[#00714d] dark:text-[#6ee7b7]">
                      <span className="material-symbols-outlined text-xs">bolt</span>
                      Local Browser Engine
                    </span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Preview Modal */}
      {previewContent && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#161f30] rounded-2xl p-6 max-w-2xl w-full max-h-[80vh] flex flex-col soft-shadow animate-in fade-in zoom-in-95 border border-[#e1e3e4] dark:border-[#262c3a]">
            <div className="flex justify-between items-center border-b border-[#e1e3e4] dark:border-[#262c3a] pb-4 mb-4">
              <h3 className="font-bold text-lg text-[#191c1d] dark:text-white font-heading truncate">
                Preview: {previewContent.name}
              </h3>
              <button
                onClick={() => setPreviewContent(null)}
                className="p-1 text-[#727785] dark:text-[#94a3b8] hover:text-[#191c1d] dark:hover:text-white rounded-lg cursor-pointer"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="flex-1 overflow-auto bg-[#f8f9fa] dark:bg-[#0f172a] p-4 rounded-xl font-mono text-xs text-[#191c1d] dark:text-[#e2e8f0] border border-[#e1e3e4] dark:border-[#1e293b]">
              {previewContent.isImage && previewContent.url ? (
                <div className="flex justify-center items-center p-4">
                  <img
                    src={previewContent.url}
                    alt="Converted output"
                    className="max-h-[50vh] object-contain rounded-lg border border-[#e1e3e4] dark:border-[#334155]"
                  />
                </div>
              ) : previewContent.isPdf && previewContent.url ? (
                <embed
                  src={previewContent.url}
                  type="application/pdf"
                  className="w-full h-[60vh] rounded-lg border border-[#e1e3e4] dark:border-[#334155]"
                />
              ) : (
                <pre className="whitespace-pre-wrap">{previewContent.content}</pre>
              )}
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setPreviewContent(null)}
                className="bg-[#0058be] dark:bg-[#0284c7] text-white px-5 py-2 rounded-full text-xs font-bold cursor-pointer hover:bg-[#2170e4] dark:hover:bg-[#0369a1]"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
