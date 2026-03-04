import { useState, useRef, useCallback } from 'react';

const ACCEPTED_TYPES = [
  '.pdf', '.docx', '.txt', '.md', '.csv', '.xlsx', '.xls', '.pptx',
];

interface FileUploaderProps {
  onUpload: (files: File[]) => Promise<void>;
  uploading: boolean;
}

export default function FileUploader({ onUpload, uploading }: FileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const droppedFiles = Array.from(e.dataTransfer.files).filter((file) => {
        const ext = '.' + file.name.split('.').pop()?.toLowerCase();
        return ACCEPTED_TYPES.includes(ext);
      });
      if (droppedFiles.length > 0) {
        await onUpload(droppedFiles);
      }
    },
    [onUpload]
  );

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const selected = e.target.files ? Array.from(e.target.files) : [];
      if (selected.length > 0) {
        await onUpload(selected);
      }
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    [onUpload]
  );

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => fileInputRef.current?.click()}
      className={`group relative cursor-pointer border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-300 ${
        isDragging
          ? 'drop-zone-active border-brand-blue bg-blue-50/50 dark:bg-blue-900/10'
          : 'border-[var(--border-color)] hover:border-brand-blue/50 hover:bg-[var(--hover-bg)]'
      } ${uploading ? 'pointer-events-none opacity-60' : ''}`}
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={ACCEPTED_TYPES.join(',')}
        onChange={handleFileSelect}
        className="hidden"
      />

      <div className="flex flex-col items-center gap-3">
        {uploading ? (
          <>
            <div className="w-12 h-12 rounded-full border-4 border-[var(--border-color)] border-t-brand-orange animate-spin" />
            <p className="text-sm font-medium text-[var(--text-primary)]">正在上传并处理文件...</p>
          </>
        ) : (
          <>
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-blue/10 to-brand-orange/10 flex items-center justify-center transition-transform duration-200 group-hover:scale-110">
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="url(#grad)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <defs>
                  <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#FF6B35" />
                    <stop offset="100%" stopColor="#1A73E8" />
                  </linearGradient>
                </defs>
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-[var(--text-primary)]">
                拖拽文件到此处，或 <span className="text-brand-blue">点击选择文件</span>
              </p>
              <p className="text-xs text-[var(--text-tertiary)] mt-1">
                支持 PDF、Word(docx)、Excel、PPT、TXT、Markdown、CSV 格式
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
