/**
 * Format file size in bytes to human-readable string.
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const size = (bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0);
  return `${size} ${units[i]}`;
}

/**
 * Format ISO date string to localized display string.
 */
export function formatDate(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Get file type icon/label for display.
 */
export function getFileTypeLabel(fileType: string): string {
  const labels: Record<string, string> = {
    '.pdf': 'PDF',
    '.docx': 'Word',
    '.doc': 'Word',
    '.txt': 'TXT',
    '.md': 'MD',
    '.csv': 'CSV',
    '.xlsx': 'Excel',
    '.xls': 'Excel',
    '.pptx': 'PPT',
  };
  return labels[fileType] || fileType.toUpperCase().replace('.', '');
}

/**
 * Generate a unique ID for messages.
 */
export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
}

/**
 * Get file type color class.
 */
export function getFileTypeColor(fileType: string): string {
  const colors: Record<string, string> = {
    '.pdf': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    '.docx': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    '.doc': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    '.txt': 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
    '.md': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    '.csv': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    '.xlsx': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    '.xls': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    '.pptx': 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  };
  return colors[fileType] || 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400';
}
