import { useKnowledge } from '../../hooks/useKnowledge';
import FileUploader from './FileUploader';
import FileList from './FileList';
import LoadingSpinner from '../common/LoadingSpinner';
import { showToast } from '../common/Toast';

export default function KnowledgeView() {
  const { files, loading, uploading, reprocessing, uploadFiles, deleteFile, reprocess } = useKnowledge();

  const handleUpload = async (fileList: File[]) => {
    try {
      const result = await uploadFiles(fileList);
      if (result.uploaded.length > 0) {
        showToast('success', `成功上传 ${result.uploaded.length} 个文件`);
      }
      if (result.errors.length > 0) {
        result.errors.forEach((err) => {
          showToast('error', `${err.filename}: ${err.error}`);
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : '上传失败';
      showToast('error', message);
    }
  };

  const handleReprocess = async () => {
    try {
      const result = await reprocess();
      if (result) {
        showToast('success', `重新索引完成：处理 ${result.reprocessed} 个文件，共 ${result.total_chunks} 个分块`);
        if (result.errors.length > 0) {
          result.errors.forEach((err) => {
            showToast('error', `${err.filename}: ${err.error}`);
          });
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : '重新索引失败';
      showToast('error', message);
    }
  };

  const handleDelete = async (fileId: string) => {
    try {
      await deleteFile(fileId);
      showToast('success', '文件已删除');
    } catch (err) {
      const message = err instanceof Error ? err.message : '删除失败';
      showToast('error', message);
    }
  };

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Upload area */}
        <FileUploader onUpload={handleUpload} uploading={uploading} />

        {/* File list */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading text-base font-semibold">
              已上传文件
              {files.length > 0 && (
                <span className="ml-2 text-sm font-normal text-[var(--text-tertiary)]">
                  ({files.length} 个)
                </span>
              )}
            </h3>
            {files.length > 0 && (
              <button
                onClick={handleReprocess}
                disabled={reprocessing}
                className="px-3 py-1.5 text-sm rounded-xl bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-brand-orange hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {reprocessing ? '重新索引中...' : '重新索引'}
              </button>
            )}
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner />
            </div>
          ) : (
            <FileList files={files} onDelete={handleDelete} />
          )}
        </div>
      </div>
    </div>
  );
}
