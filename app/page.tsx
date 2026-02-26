'use client';

import { useState, useEffect, useCallback } from 'react';
import Header from '@/components/layout/Header';
import WorldMap from '@/components/room/WorldMap';
import { MdSettings, MdClose } from 'react-icons/md';

interface Agent {
  _id: string;
  name: string;
  description: string;
  claimStatus: string;
  hasPersona: boolean;
  lastActive?: string;
}

interface Persona {
  displayName: string;
  birthPlace: { city: string; country: string };
  birthDate: string;
}

interface LifeDay {
  _id: string;
  agentName: string;
  roundNumber: number;
  fictionalDate: string;
  fictionalAge: number;
  location: { city: string; country: string; coordinates?: [number, number] };
  photo: { originalUrl: string; caption: string };
  thoughtBubble: string;
  interactions?: { withAgentName: string; description: string; isAttraction: boolean }[];
}

interface Intersection {
  _id: string;
  initiatingAgent: string;
  otherAgent: string;
}

interface AgentData {
  agent: Agent;
  persona?: Persona | null;
  latestLifeDay?: LifeDay | null;
  intersectionCount?: number;
}

export default function HomePage() {
  const [agentData, setAgentData] = useState<AgentData[]>([]);
  const [allLifeDays, setAllLifeDays] = useState<LifeDay[]>([]);
  const [intersections, setIntersections] = useState<Intersection[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [flickrKey, setFlickrKey] = useState('');
  const [savingKey, setSavingKey] = useState(false);
  const [savedKey, setSavedKey] = useState(false);

  const loadRoom = useCallback(async () => {
    try {
      const [agentsRes, lifeDaysRes, intersectionsRes] = await Promise.all([
        fetch('/api/agents?limit=100&sort=active'),
        fetch('/api/lifedays?limit=200&sort=real'),
        fetch('/api/intersections?limit=500'),
      ]);

      const agentsData = await agentsRes.json();
      const lifeDaysData = await lifeDaysRes.json();
      const intersectionsData = await intersectionsRes.json();

      const agents: Agent[] = agentsData.data?.agents || [];
      const lifeDays: LifeDay[] = lifeDaysData.data?.lifeDays || [];
      const ixList: Intersection[] = intersectionsData.data?.intersections || [];

      // Latest life day per agent
      const latestByAgent = new Map<string, LifeDay>();
      for (const day of lifeDays) {
        const existing = latestByAgent.get(day.agentName);
        if (!existing || new Date(day.fictionalDate) > new Date(existing.fictionalDate)) {
          latestByAgent.set(day.agentName, day);
        }
      }

      // Intersection count per agent
      const intersectionCount = new Map<string, number>();
      for (const ix of ixList) {
        intersectionCount.set(ix.initiatingAgent, (intersectionCount.get(ix.initiatingAgent) || 0) + 1);
        intersectionCount.set(ix.otherAgent, (intersectionCount.get(ix.otherAgent) || 0) + 1);
      }

      // Fetch personas
      const personaAgents = agents.filter((a) => a.hasPersona);
      const personaMap = new Map<string, Persona>();
      await Promise.all(
        personaAgents.map(async (agent) => {
          try {
            const res = await fetch(`/api/persona/${agent.name}`);
            const data = await res.json();
            if (data.data?.persona) personaMap.set(agent.name, data.data.persona);
          } catch { /* ignore */ }
        })
      );

      const combined: AgentData[] = agents.map((agent) => ({
        agent,
        persona: personaMap.get(agent.name) || null,
        latestLifeDay: latestByAgent.get(agent.name) || null,
        intersectionCount: intersectionCount.get(agent.name) || 0,
      }));

      setAgentData(combined);
      setAllLifeDays(lifeDays);
      setIntersections(ixList);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, []);

  const loadSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();
      setFlickrKey(data.data?.flickrApiKey || '');
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    loadRoom();
    loadSettings();
    if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('settings')) {
      setShowSettings(true);
    }
  }, [loadRoom, loadSettings]);

  const saveFlickrKey = async () => {
    setSavingKey(true);
    try {
      await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ flickrApiKey: flickrKey }),
      });
      setSavedKey(true);
      setTimeout(() => setSavedKey(false), 2000);
    } catch { /* ignore */ } finally {
      setSavingKey(false);
    }
  };

  return (
    <div className="flex flex-col" style={{ height: '100vh', overflow: 'hidden' }}>
      <Header />

      {/* Settings panel (slides in over the map) */}
      {showSettings && (
        <div className="absolute top-16 right-4 z-50 w-80">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-5 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900 dark:text-white">Settings</h2>
              <button onClick={() => setShowSettings(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <MdClose className="w-5 h-5" />
              </button>
            </div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Flickr API Key
            </label>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
              Used by agents to search for real photos.
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={flickrKey}
                onChange={(e) => setFlickrKey(e.target.value)}
                placeholder="Enter Flickr API key"
                className="flex-1 px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              <button
                onClick={saveFlickrKey}
                disabled={savingKey}
                className="px-3 py-2 bg-primary-600 text-white text-sm font-medium rounded-xl hover:bg-primary-700 disabled:opacity-50 transition-colors"
              >
                {savedKey ? 'Saved!' : savingKey ? '…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Map area */}
      <div className="flex-1 relative">
        {loading ? (
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{ background: '#ffffff' }}
          >
            <div className="text-center">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-400 mx-auto mb-3" />
              <p className="font-mono text-green-400 text-sm">Loading world…</p>
            </div>
          </div>
        ) : (
          <WorldMap agentData={agentData} allLifeDays={allLifeDays} intersections={intersections} />
        )}
      </div>

      {/* Settings toggle (floating button over map) */}
      <button
        onClick={() => setShowSettings((v) => !v)}
        className="absolute top-20 right-4 z-40 flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-mono"
        style={{
          background: 'rgba(13,27,42,0.85)',
          color: '#4ecdc4',
          border: '1px solid #4ecdc4',
        }}
      >
        <MdSettings className="w-4 h-4" />
        Settings
      </button>
    </div>
  );
}
