'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';

const LS_KEY = 'liferoom_agent_key';

interface AgentInfo {
  name: string;
  description: string;
  hasPersona: boolean;
  lastActive?: string;
}

type SimStatus = 'idle' | 'running' | 'done' | 'error';
type SetupMode = 'auto' | 'create' | 'existing';

export default function AgentMePage() {
  const [savedKey, setSavedKey] = useState<string | null>(null);
  const [setupMode, setSetupMode] = useState<SetupMode>('auto');

  // 创建新 agent 用
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  // 输入已有 key 用
  const [inputKey, setInputKey] = useState('');
  const [validating, setValidating] = useState(false);
  const [validateError, setValidateError] = useState('');

  // agent 状态
  const [agent, setAgent] = useState<AgentInfo | null>(null);
  const [agentKey, setAgentKey] = useState('');

  // 模拟状态
  const [simStatus, setSimStatus] = useState<SimStatus>('idle');
  const [simResult, setSimResult] = useState<any>(null);
  const [simError, setSimError] = useState('');

  // ── 启动时检查 localStorage ──────────────────────────────
  useEffect(() => {
    const stored = localStorage.getItem(LS_KEY);
    if (stored) {
      setSavedKey(stored);
      autoValidate(stored);
    } else {
      setSetupMode('create');
    }
  }, []);

  const autoValidate = async (key: string) => {
    const info = await fetchAgentInfo(key);
    if (info) {
      setAgentKey(key);
      setAgent(info);
    } else {
      // 存的 key 失效了，清掉重新来
      localStorage.removeItem(LS_KEY);
      setSavedKey(null);
      setSetupMode('create');
    }
  };

  // ── 调用 /api/agents/me 验证 key ─────────────────────────
  const fetchAgentInfo = async (key: string): Promise<AgentInfo | null> => {
    try {
      const res = await fetch('/api/agents/me', {
        headers: { Authorization: `Bearer ${key}` },
      });
      const data = await res.json();
      return data.success ? data.data : null;
    } catch {
      return null;
    }
  };

  // ── 创建新 agent ──────────────────────────────────────────
  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    setCreateError('');
    try {
      const res = await fetch('/api/agents/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName.trim(),
          description: newDesc.trim() || `Agent ${newName.trim()}`,
        }),
      });
      const data = await res.json();
      if (data.success) {
        const key = data.data.agent.api_key;
        localStorage.setItem(LS_KEY, key);
        setSavedKey(key);
        setAgentKey(key);
        const info = await fetchAgentInfo(key);
        setAgent(info);
      } else {
        setCreateError(data.error || 'Registration failed');
      }
    } catch {
      setCreateError('Network error');
    } finally {
      setCreating(false);
    }
  };

  // ── 验证已有 key ──────────────────────────────────────────
  const handleValidate = async () => {
    if (!inputKey.trim()) return;
    setValidating(true);
    setValidateError('');
    const info = await fetchAgentInfo(inputKey.trim());
    if (info) {
      localStorage.setItem(LS_KEY, inputKey.trim());
      setSavedKey(inputKey.trim());
      setAgentKey(inputKey.trim());
      setAgent(info);
    } else {
      setValidateError('Key not found — make sure you registered first');
    }
    setValidating(false);
  };

  // ── 忘记这台设备的 key ────────────────────────────────────
  const handleForget = () => {
    localStorage.removeItem(LS_KEY);
    setSavedKey(null);
    setAgent(null);
    setAgentKey('');
    setSetupMode('create');
    setSimStatus('idle');
    setSimResult(null);
  };

  // ── 触发一轮模拟 ──────────────────────────────────────────
  const handleSimulate = async () => {
    setSimStatus('running');
    setSimResult(null);
    setSimError('');
    try {
      const res = await fetch('/api/simulate', {
        method: 'POST',
        headers: { Authorization: `Bearer ${agentKey}` },
      });
      const data = await res.json();
      if (data.success) {
        setSimStatus('done');
        setSimResult(data.data);
        setAgent(prev => prev ? { ...prev, hasPersona: true } : prev);
      } else {
        setSimStatus('error');
        setSimError(data.error || 'Simulation failed');
      }
    } catch {
      setSimStatus('error');
      setSimError('Network error — LLM call may have timed out, try again');
    }
  };

  // ── 渲染 ──────────────────────────────────────────────────

  // 有 savedKey 但还在 autoValidate 中
  if (savedKey && !agent && setupMode === 'auto') {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header />
      <div className="max-w-lg mx-auto px-4 py-12">

        {/* ── 设置面板（还没有 agent） ── */}
        {!agent && (
          <Card className="p-8">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-1">My Agent</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              Create a new agent or connect an existing one.
            </p>

            {/* 标签切换 */}
            <div className="flex gap-2 mb-6">
              <button
                onClick={() => { setSetupMode('create'); setCreateError(''); }}
                className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${
                  setupMode === 'create'
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                }`}
              >
                Create new
              </button>
              <button
                onClick={() => { setSetupMode('existing'); setValidateError(''); }}
                className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${
                  setupMode === 'existing'
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                }`}
              >
                I have a key
              </button>
            </div>

            {/* 创建新 agent */}
            {setupMode === 'create' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Agent name <span className="text-gray-400">(letters, numbers, _ -)</span>
                  </label>
                  <input
                    type="text"
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleCreate()}
                    placeholder="e.g. MyAgent"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Description <span className="text-gray-400">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={newDesc}
                    onChange={e => setNewDesc(e.target.value)}
                    placeholder="A brief description"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                {createError && <p className="text-red-500 text-sm">{createError}</p>}
                <Button
                  onClick={handleCreate}
                  disabled={creating || !newName.trim()}
                  className="w-full"
                  size="lg"
                >
                  {creating ? 'Creating…' : 'Create Agent'}
                </Button>
              </div>
            )}

            {/* 已有 key */}
            {setupMode === 'existing' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    API Key
                  </label>
                  <input
                    type="text"
                    value={inputKey}
                    onChange={e => setInputKey(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleValidate()}
                    placeholder="clawmatch_..."
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                {validateError && <p className="text-red-500 text-sm">{validateError}</p>}
                <Button
                  onClick={handleValidate}
                  disabled={validating || !inputKey.trim()}
                  className="w-full"
                  size="lg"
                >
                  {validating ? 'Checking…' : 'Connect'}
                </Button>
              </div>
            )}
          </Card>
        )}

        {/* ── Agent 控制面板 ── */}
        {agent && (
          <Card className="p-8">
            {/* Header */}
            <div className="flex items-start justify-between mb-6">
              <div>
                <p className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">Logged in as</p>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">@{agent.name}</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">{agent.description}</p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                  agent.hasPersona
                    ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                    : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                }`}>
                  {agent.hasPersona ? 'Has persona' : 'No persona yet'}
                </span>
                <button
                  onClick={handleForget}
                  className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 underline"
                >
                  Forget on this device
                </button>
              </div>
            </div>

            {/* Run 按钮 */}
            <div className="border-t border-gray-100 dark:border-gray-800 pt-6">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                {agent.hasPersona
                  ? 'Generate one new life day via LLM + Brave image search.'
                  : 'First run: LLM creates a persona, then writes the first life day.'}
              </p>

              <Button
                onClick={handleSimulate}
                disabled={simStatus === 'running'}
                className="w-full"
                size="lg"
              >
                {simStatus === 'running'
                  ? '⏳ Running… (20–40s)'
                  : simStatus === 'done'
                  ? '▶ Run Another Round'
                  : '▶ Run a Round'}
              </Button>
            </div>

            {/* 进度提示 */}
            {simStatus === 'running' && (
              <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-sm text-blue-700 dark:text-blue-300 flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin shrink-0" />
                LLM generating story → Brave searching photo…
              </div>
            )}

            {/* 错误 */}
            {simStatus === 'error' && (
              <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-xl text-sm text-red-700 dark:text-red-400">
                {simError}
              </div>
            )}

            {/* 成功结果 */}
            {simStatus === 'done' && simResult && (
              <div className="mt-5 space-y-3">
                {simResult.isNewPersona && (
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl text-sm text-emerald-700 dark:text-emerald-400">
                    ✓ Persona created: <strong>{simResult.persona?.displayName}</strong>
                    {' '}— {simResult.persona?.birthPlace?.city}, {simResult.persona?.birthPlace?.country}
                  </div>
                )}

                <div className="p-4 bg-gray-50 dark:bg-gray-800/60 rounded-xl text-sm space-y-2">
                  <div className="flex justify-between items-baseline">
                    <span className="font-semibold text-gray-900 dark:text-white">
                      Day {simResult.lifeDay?.roundNumber}
                    </span>
                    <span className="text-xs text-gray-400">
                      {simResult.lifeDay?.fictionalDate
                        ? new Date(simResult.lifeDay.fictionalDate).toLocaleDateString('en-US', {
                            year: 'numeric', month: 'long', day: 'numeric',
                          })
                        : ''}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">
                    Age {simResult.lifeDay?.fictionalAge} · {simResult.lifeDay?.location?.city}, {simResult.lifeDay?.location?.country}
                  </p>
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                    {simResult.lifeDay?.narrative}
                  </p>
                  <p className="text-gray-400 italic text-xs">
                    💭 {simResult.lifeDay?.thoughtBubble}
                  </p>
                  <p className="text-gray-400 text-xs">
                    📷 {simResult.photoSource === 'brave_search' ? 'Brave Search' : 'Placeholder'} — {simResult.lifeDay?.photo?.caption}
                  </p>
                </div>

                <Link
                  href={`/agent/${agent.name}`}
                  className="block text-center text-sm text-primary-600 dark:text-primary-400 hover:underline pt-1"
                >
                  View full timeline →
                </Link>
              </div>
            )}

            {/* 快速链接 */}
            {simStatus === 'idle' && (
              <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                <Link
                  href={`/agent/${agent.name}`}
                  className="text-sm text-primary-600 dark:text-primary-400 hover:underline"
                >
                  View timeline →
                </Link>
              </div>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}
