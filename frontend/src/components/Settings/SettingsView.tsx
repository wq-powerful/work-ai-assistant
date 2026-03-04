import { useState, useEffect } from 'react';
import { useSettings } from '../../hooks/useSettings';
import { useTheme } from '../../contexts/ThemeContext';
import Button from '../common/Button';
import { showToast } from '../common/Toast';
import { getModelMaxTokens } from '../../utils/modelConfig';
import type { AppSettings } from '../../types';

function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min;
  return Math.min(max, Math.max(min, value));
}

export default function SettingsView() {
  const { settings, updateSettings, availableModels, modelsLoading, refreshModels } = useSettings();
  const { theme, setTheme } = useTheme();
  const [form, setForm] = useState<AppSettings>(settings);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(settings);
    setApiKeyInput('');
  }, [settings]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updates: Partial<AppSettings> = { ...form };
      // Only send api_key if user actually typed a new one
      if (apiKeyInput) {
        updates.api_key = apiKeyInput;
      } else {
        delete updates.api_key;
      }
      delete updates.api_key_masked;
      delete updates.effective_knowledge_base_path;
      await updateSettings(updates);
      if (form.theme !== theme) {
        setTheme(form.theme);
      }
      setApiKeyInput('');
      showToast('success', '设置已保存');
    } catch {
      showToast('error', '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const updateField = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      // 模型变更时自动更新 max_tokens
      if (key === 'model' && typeof value === 'string') {
        next.max_tokens = getModelMaxTokens(value);
      }
      return next;
    });
  };

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-2xl mx-auto space-y-8">
        {/* API Settings */}
        <section>
          <h3 className="font-heading text-base font-semibold mb-4 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            API 配置
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">API 地址</label>
              <input
                type="text"
                value={form.api_base_url}
                onChange={(e) => updateField('api_base_url', e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--input-bg)] text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/50 focus:border-brand-blue transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">API 密钥</label>
              <input
                type="password"
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                placeholder={form.api_key_masked || '输入 API 密钥'}
                className="w-full px-4 py-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--input-bg)] text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/50 focus:border-brand-blue transition-all"
              />
              {form.api_key_masked && !apiKeyInput && (
                <p className="text-xs text-[var(--text-tertiary)] mt-1">
                  当前密钥: {form.api_key_masked}（留空则保持不变）
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">模型名称</label>
              <div className="flex gap-2">
                {availableModels.length > 0 ? (
                  <select
                    value={form.model}
                    onChange={(e) => updateField('model', e.target.value)}
                    className="flex-1 px-4 py-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--input-bg)] text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/50 focus:border-brand-blue transition-all"
                  >
                    {!availableModels.some((m) => m.id === form.model) && (
                      <option value={form.model}>{form.model}</option>
                    )}
                    {availableModels.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.id}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={form.model}
                    onChange={(e) => updateField('model', e.target.value)}
                    placeholder="输入模型名称，如 gpt-4o"
                    className="flex-1 px-4 py-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--input-bg)] text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/50 focus:border-brand-blue transition-all"
                  />
                )}
                <button
                  type="button"
                  onClick={() => refreshModels()}
                  disabled={modelsLoading}
                  title="刷新模型列表"
                  className="px-3 py-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--input-bg)] text-sm hover:bg-[var(--bg-tertiary)] transition-all disabled:opacity-50"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={modelsLoading ? 'animate-spin' : ''}
                  >
                    <polyline points="23 4 23 10 17 10" />
                    <polyline points="1 20 1 14 7 14" />
                    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                  </svg>
                </button>
              </div>
              {modelsLoading && (
                <p className="text-xs text-[var(--text-tertiary)] mt-1">正在加载模型列表...</p>
              )}
            </div>
          </div>
        </section>

        {/* Model Parameters */}
        <section>
          <h3 className="font-heading text-base font-semibold mb-4 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/></svg>
            模型参数
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">
                温度 (Temperature): {form.temperature.toFixed(1)}
              </label>
              <input
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={form.temperature}
                onChange={(e) => updateField('temperature', parseFloat(e.target.value))}
                className="w-full h-2 rounded-full bg-[var(--bg-tertiary)] appearance-none cursor-pointer accent-brand-orange"
              />
              <div className="flex justify-between text-xs text-[var(--text-tertiary)] mt-1">
                <span>精确 (0.0)</span>
                <span>创造 (2.0)</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">最大 Tokens</label>
                <input
                  type="number"
                  min="1"
                  max={getModelMaxTokens(form.model)}
                  value={form.max_tokens}
                  onChange={(e) =>
                    updateField(
                      'max_tokens',
                      clamp(parseInt(e.target.value), 1, getModelMaxTokens(form.model))
                    )
                  }
                  className="w-full px-4 py-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--input-bg)] text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/50 focus:border-brand-blue transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">检索条数 (Top-K)</label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={form.top_k}
                  onChange={(e) => updateField('top_k', clamp(parseInt(e.target.value), 1, 20))}
                  className="w-full px-4 py-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--input-bg)] text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/50 focus:border-brand-blue transition-all"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Storage Path */}
        <section>
          <h3 className="font-heading text-base font-semibold mb-4 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="7.5 4.21 12 6.81 16.5 4.21"/><polyline points="7.5 19.79 7.5 14.6 3 12"/><polyline points="21 12 16.5 14.6 16.5 19.79"/><polyline points="12 22.08 12 16.89 7.5 14.29"/><polyline points="12 16.89 16.5 14.29"/></svg>
            知识库存储路径
          </h3>
          <div className="space-y-2">
            <input
              type="text"
              value={form.knowledge_base_path}
              onChange={(e) => updateField('knowledge_base_path', e.target.value)}
              placeholder="留空使用默认路径（推荐）"
              className="w-full px-4 py-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--input-bg)] text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/50 focus:border-brand-blue transition-all"
            />
            <p className="text-xs text-[var(--text-tertiary)]">
              当前生效路径：{form.effective_knowledge_base_path || '读取中...'}
            </p>
            <p className="text-xs text-[var(--text-tertiary)]">
              自定义后，系统会在该目录下自动管理 <code>uploads</code> 与 <code>knowledge_store</code> 子目录。
            </p>
          </div>
        </section>

        {/* System Prompt */}
        <section>
          <h3 className="font-heading text-base font-semibold mb-4 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            系统提示词
          </h3>
          <textarea
            rows={8}
            value={form.system_prompt}
            onChange={(e) => updateField('system_prompt', e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-[var(--border-color)] bg-[var(--input-bg)] text-sm leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-brand-blue/50 focus:border-brand-blue transition-all"
          />
        </section>

        {/* Theme */}
        <section>
          <h3 className="font-heading text-base font-semibold mb-4 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/></svg>
            主题外观
          </h3>
          <div className="flex gap-3">
            <button
              onClick={() => updateField('theme', 'light')}
              className={`relative flex-1 p-4 rounded-xl border-2 transition-all duration-200 ${
                form.theme === 'light'
                  ? 'border-brand-orange bg-orange-50 dark:bg-orange-900/10'
                  : 'border-[var(--border-color)] hover:border-[var(--text-tertiary)]'
              }`}
            >
              {form.theme === 'light' && (
                <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-brand-orange flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
              )}
              <div className="flex items-center gap-3">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
                <div className="text-left">
                  <p className="text-sm font-medium">浅色模式</p>
                  <p className="text-xs text-[var(--text-tertiary)]">明亮清爽</p>
                </div>
              </div>
            </button>
            <button
              onClick={() => updateField('theme', 'dark')}
              className={`relative flex-1 p-4 rounded-xl border-2 transition-all duration-200 ${
                form.theme === 'dark'
                  ? 'border-brand-orange bg-orange-50 dark:bg-orange-900/10'
                  : 'border-[var(--border-color)] hover:border-[var(--text-tertiary)]'
              }`}
            >
              {form.theme === 'dark' && (
                <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-brand-orange flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
              )}
              <div className="flex items-center gap-3">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
                <div className="text-left">
                  <p className="text-sm font-medium">深色模式</p>
                  <p className="text-xs text-[var(--text-tertiary)]">护眼舒适</p>
                </div>
              </div>
            </button>
          </div>
        </section>

        {/* Save Button */}
        <div className="flex justify-end pb-6">
          <Button onClick={handleSave} disabled={saving} size="lg">
            {saving ? '保存中...' : '保存设置'}
          </Button>
        </div>
      </div>
    </div>
  );
}
