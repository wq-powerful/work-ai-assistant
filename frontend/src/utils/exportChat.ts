import type { ChatMessage } from '../types';

/**
 * 导出聊天记录为 Markdown 文件并下载
 */
export function exportAsMarkdown(messages: ChatMessage[], title?: string) {
  const filename = `${title || '聊天记录'}_${new Date().toLocaleDateString('zh-CN')}.md`;

  const lines: string[] = [
    `# ${title || '聊天记录'}`,
    `> 导出时间：${new Date().toLocaleString('zh-CN')}`,
    '',
  ];

  for (const msg of messages) {
    const role = msg.role === 'user' ? '🧑 用户' : '🤖 AI';
    lines.push(`## ${role}`);
    lines.push('');
    lines.push(msg.content);
    lines.push('');
  }

  const blob = new Blob([lines.join('\n')], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * 导出聊天记录为 PDF（利用浏览器打印功能，零依赖）
 */
export function exportAsPDF(messages: ChatMessage[], title?: string) {
  const docTitle = title || '聊天记录';

  const messagesHtml = messages
    .map((msg) => {
      const isUser = msg.role === 'user';
      const label = isUser ? '🧑 用户' : '🤖 AI';
      const bgColor = isUser ? '#fff7ed' : '#f0f9ff';
      const borderColor = isUser ? '#f97316' : '#3b82f6';
      // 对 AI 消息做简单的 markdown 转换（加粗、代码块、换行）
      const content = msg.content
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/```[\s\S]*?```/g, (m) => `<pre style="background:#1e293b;color:#e2e8f0;padding:12px;border-radius:8px;overflow-x:auto;font-size:13px">${m.slice(3, -3)}</pre>`)
        .replace(/`([^`]+)`/g, '<code style="background:#e2e8f0;padding:2px 6px;border-radius:4px;font-size:13px">$1</code>')
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\n/g, '<br>');

      return `
        <div style="margin-bottom:16px;padding:16px;border-left:4px solid ${borderColor};background:${bgColor};border-radius:8px">
          <div style="font-weight:bold;margin-bottom:8px;color:${borderColor}">${label}</div>
          <div style="line-height:1.7;font-size:14px">${content}</div>
        </div>`;
    })
    .join('');

  const html = `<!DOCTYPE html>
<html><head>
<meta charset="utf-8">
<title>${docTitle}</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px 20px; color: #1e293b; }
  h1 { text-align: center; margin-bottom: 8px; }
  .meta { text-align: center; color: #64748b; font-size: 13px; margin-bottom: 32px; }
  @media print { body { padding: 0; } }
</style>
</head><body>
<h1>${docTitle}</h1>
<div class="meta">导出时间：${new Date().toLocaleString('zh-CN')}</div>
${messagesHtml}
</body></html>`;

  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.onload = () => printWindow.print();
  }
}
