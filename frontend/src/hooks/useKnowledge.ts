import { useState, useCallback, useEffect } from 'react';
import type { FileInfo } from '../types';
import { fetchFiles, uploadFiles as apiUploadFiles, deleteFile as apiDeleteFile, reprocessKnowledgeBase } from '../utils/api';

export function useKnowledge() {
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [reprocessing, setReprocessing] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchFiles();
      setFiles(data.files);
    } catch {
      // silently fail, show empty state
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const uploadFiles = useCallback(
    async (fileList: File[]) => {
      setUploading(true);
      try {
        const result = await apiUploadFiles(fileList);
        await refresh();
        return result;
      } finally {
        setUploading(false);
      }
    },
    [refresh]
  );

  const deleteFile = useCallback(
    async (fileId: string) => {
      await apiDeleteFile(fileId);
      setFiles((prev) => prev.filter((f) => f.id !== fileId));
    },
    []
  );

  const reprocess = useCallback(async () => {
    setReprocessing(true);
    try {
      const result = await reprocessKnowledgeBase();
      await refresh();
      return result;
    } finally {
      setReprocessing(false);
    }
  }, [refresh]);

  return { files, loading, uploading, reprocessing, uploadFiles, deleteFile, reprocess, refresh };
}
