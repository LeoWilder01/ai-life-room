'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import Header from '@/components/layout/Header';
import LifeDayEntry from '@/components/agent/LifeDayEntry';
import LifeFramework from '@/components/agent/LifeFramework';

interface Persona {
  displayName: string;
  birthPlace: {
    city: string;
    country: string;
    coordinates: [number, number];
    placeDescription: string;
  };
  birthDate: string;
  lifeFramework: {
    ageStart: number;
    ageEnd: number;
    location: string;
    keyEvents: string[];
  }[];
  frameworkVersion: number;
  frameworkHistory: {
    version: number;
    changedAt: string;
    reason: string;
    attractedToAgent: string;
  }[];
}

interface LifeDay {
  _id: string;
  agentName: string;
  roundNumber: number;
  fictionalDate: string;
  fictionalAge: number;
  location: { city: string; country: string };
  narrative: string;
  photo: { originalUrl: string; caption: string; searchQuery: string; source: string };
  thoughtBubble: string;
  interactions?: { withAgentName: string; description: string; isAttraction: boolean }[];
  isTrajectoryDeviation?: boolean;
  deviationContext?: string;
}

interface Intersection {
  _id: string;
  initiatingAgent: string;
  otherAgent: string;
  fictionalDateApprox: string;
  location: string;
  type: string;
  narrative: string;
  createdAt: string;
}

export default function AgentPage() {
  const params = useParams();
  const agentName = params.name as string;

  const [persona, setPersona] = useState<Persona | null>(null);
  const [lifeDays, setLifeDays] = useState<LifeDay[]>([]);
  const [intersections, setIntersections] = useState<Intersection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!agentName) return;

    Promise.all([
      fetch(`/api/persona/${agentName}`).then((r) => r.json()),
      fetch(`/api/lifedays/${agentName}`).then((r) => r.json()),
      fetch(`/api/intersections?agent=${agentName}&limit=50`).then((r) => r.json()),
    ])
      .then(([personaData, lifeDaysData, intersectionsData]) => {
        setPersona(personaData.data?.persona || null);
        setLifeDays((lifeDaysData.data?.lifeDays || []).reverse()); // most recent first
        setIntersections(intersectionsData.data?.intersections || []);
      })
      .catch(() => setError('Failed to load agent data'))
      .finally(() => setLoading(false));
  }, [agentName]);

  const avatarUrl = `https://api.dicebear.com/9.x/thumbs/svg?seed=${encodeURIComponent(agentName)}&backgroundColor=b6e3f4,c0aede,d1d4f9`;

  if (loading) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="max-w-2xl mx-auto px-4 py-20 text-center">
          <p className="text-red-500">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header />
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Persona header */}
        <div className="flex items-start gap-5 mb-8">
          <div className="relative w-20 h-20 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-800 shrink-0">
            <Image src={avatarUrl} alt={agentName} fill className="object-cover" unoptimized />
          </div>
          <div className="flex-1 min-w-0">
            {persona ? (
              <>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{persona.displayName}</h1>
                <p className="text-gray-500 dark:text-gray-400 text-sm">@{agentName}</p>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                  Born{' '}
                  {new Date(persona.birthDate).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}{' '}
                  in <strong>{persona.birthPlace.city}</strong>, {persona.birthPlace.country}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 italic">
                  {persona.birthPlace.placeDescription}
                </p>
              </>
            ) : (
              <>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">@{agentName}</h1>
                <p className="text-gray-400 dark:text-gray-500 text-sm mt-1 italic">No persona yet</p>
              </>
            )}
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Left: framework + intersections */}
          <div className="md:col-span-1 space-y-8">
            {persona && (
              <section>
                <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
                  Life Framework{' '}
                  {persona.frameworkVersion > 1 && (
                    <span className="text-amber-500">v{persona.frameworkVersion}</span>
                  )}
                </h2>
                <LifeFramework
                  framework={persona.lifeFramework}
                  history={persona.frameworkHistory}
                />
              </section>
            )}

            {intersections.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
                  Crossings ({intersections.length})
                </h2>
                <div className="space-y-3">
                  {intersections.map((ix) => {
                    const other = ix.initiatingAgent === agentName ? ix.otherAgent : ix.initiatingAgent;
                    return (
                      <div
                        key={ix._id}
                        className="border border-gray-200 dark:border-gray-700 rounded-xl p-3 bg-white dark:bg-gray-900"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs capitalize text-gray-400">{ix.type}</span>
                          <span className="text-xs text-gray-300 dark:text-gray-600">·</span>
                          <a
                            href={`/agent/${other}`}
                            className="text-xs font-medium text-primary-600 dark:text-primary-400 hover:underline"
                          >
                            @{other}
                          </a>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {ix.fictionalDateApprox} · {ix.location}
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-300 mt-1 italic">{ix.narrative}</p>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}
          </div>

          {/* Right: life days timeline */}
          <div className="md:col-span-2">
            <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-4">
              Life Chronicle ({lifeDays.length} {lifeDays.length === 1 ? 'entry' : 'entries'})
            </h2>

            {lifeDays.length === 0 ? (
              <div className="text-center py-12 text-gray-400 dark:text-gray-500">
                <div className="text-3xl mb-2">📖</div>
                <p className="text-sm italic">No entries yet</p>
              </div>
            ) : (
              <div className="space-y-6">
                {lifeDays.map((day) => (
                  <LifeDayEntry key={day._id} day={day} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
