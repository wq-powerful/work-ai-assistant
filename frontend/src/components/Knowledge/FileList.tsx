import { useState } from 'react';
import type { FileInfo } from '../../types';
import { formatFileSize, formatDate, getFileTypeLabel, getFileTypeColor } from '../../utils/helpers';
import Button from '../common/Button';
import Modal from '../common/Modal';

interface FileListProps {
  files: FileInfo[];
  onDelete: (fileId: string) => Promise<void>;
}

export default function FileList({ files, onDelete }: FileListProps) {
  const [deleteTarget, setDeleteTarget] = useState<FileInfo | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await onDelete(deleteTarget.id);
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  if (files.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[var(--bg-tertiary)] flex items-center justify-center animate-gentle-float">
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>
        </div>
        <p className="text-sm text-[var(--text-secondary)]">还没有上传任何文件</p>
        <p className="text-xs text-[var(--text-tertiary)] mt-1">上传工作文档后，AI 将基于文档内容回答你的问题</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-2">
        {files.map((file) => (
          <div
            key={file.id}
            className="relative flex items-center gap-4 p-4 rounded-xl border border-[var(--border-color)] bg-[var(--card-bg)] hover:border-brand-blue/30 hover:shadow-sm transition-all duration-200 group overflow-hidden"
          >
            {/* Left blue bar on hover */}
            <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-brand-blue/60 origin-top scale-y-0 group-hover:scale-y-100 transition-transform duration-200" />
            {/* File type badge */}
            <div
              className={`flex-shrink-0 px-2.5 py-1 rounded-lg text-xs font-bold ${getFileTypeColor(file.file_type)}`}
            >
              {getFileTypeLabel(file.file_type)}
            </div>

            {/* File info */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{file.filename}</p>
              <div className="flex items-center gap-3 mt-0.5 text-xs text-[var(--text-tertiary)]">
                <span>{formatFileSize(file.file_size)}</span>
                <span>·</span>
                <span>{file.chunk_count} 个分片</span>
                <span>·</span>
                <span>{formatDate(file.upload_time)}</span>
              </div>
            </div>

            {/* Delete button */}
            <button
              onClick={() => setDeleteTarget(file)}
              className="flex-shrink-0 p-2 rounded-lg text-[var(--text-tertiary)] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 hover:scale-110 active:scale-90 opacity-0 group-hover:opacity-100 transition-all duration-200"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            </button>
          </div>
        ))}
      </div>

      {/* Delete confirmation modal */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="确认删除"
      >
        <p className="text-sm text-[var(--text-secondary)] mb-4">
          确定要删除文件 <span className="font-medium text-[var(--text-primary)]">{deleteTarget?.filename}</span> 吗？
          该操作不可恢复，文件的所有分片也将被删除。
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setDeleteTarget(null)}>
            取消
          </Button>
          <Button variant="danger" onClick={handleDelete} disabled={deleting}>
            {deleting ? '删除中...' : '确认删除'}
          </Button>
        </div>
      </Modal>
    </>
  );
}
