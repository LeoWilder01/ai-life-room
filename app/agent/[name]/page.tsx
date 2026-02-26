'use client';

import { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import Header from '@/components/layout/Header';
import LifeDayEntry from '@/components/agent/LifeDayEntry';
import LifeFramework from '@/components/agent/LifeFramework';

const PIXEL_FONT = "var(--font-vt323), 'VT323', monospace";

function Section({ title, children }: { title: ReactNode; children: ReactNode }) {
  return (
    <section style={{ border: '2px solid #000', background: '#ffffff' }}>
      <div
        style={{
          background: '#0d1b2a',
          padding: '8px 16px',
          borderBottom: '2px solid #4ecdc4',
        }}
      >
        <h2
          style={{
            fontFamily: PIXEL_FONT,
            fontSize: 20,
            color: '#4ecdc4',
            margin: 0,
            letterSpacing: '0.08em',
          }}
        >
          {title}
        </h2>
      </div>
      <div style={{ padding: '16px' }}>{children}</div>
    </section>
  );
}

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
        setLifeDays((lifeDaysData.data?.lifeDays || []).reverse());
        setIntersections(intersectionsData.data?.intersections || []);
      })
      .catch(() => setError('Failed to load agent data'))
      .finally(() => setLoading(false));
  }, [agentName]);

  const avatarUrl = `https://api.dicebear.com/9.x/thumbs/svg?seed=${encodeURIComponent(agentName)}&backgroundColor=b6e3f4,c0aede,d1d4f9`;

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#f8f9fa' }}>
        <Header />
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}>
          <p style={{ fontFamily: PIXEL_FONT, fontSize: 20, color: '#4ecdc4' }}>LOADING...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: '100vh', background: '#f8f9fa' }}>
        <Header />
        <div style={{ maxWidth: 600, margin: '0 auto', padding: '80px 16px', textAlign: 'center' }}>
          <p style={{ fontFamily: PIXEL_FONT, fontSize: 18, color: '#ff6b6b' }}>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8f9fa' }}>
      <Header />
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 16px' }}>

        {/* Persona banner — same style as guide's title banner */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 20,
            marginBottom: 20,
            background: '#0d1b2a',
            border: '2px solid #4ecdc4',
            padding: '16px 20px',
            boxShadow: '4px 4px 0 #4ecdc4',
          }}
        >
          {/* Avatar */}
          <div
            style={{
              width: 72,
              height: 72,
              border: '3px solid #4ecdc4',
              flexShrink: 0,
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <Image src={avatarUrl} alt={agentName} fill className="object-cover" unoptimized />
          </div>

          {/* Info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {persona ? (
              <>
                <h1
                  style={{
                    fontFamily: PIXEL_FONT,
                    fontSize: 28,
                    color: '#4ecdc4',
                    margin: 0,
                    lineHeight: 1.1,
                  }}
                >
                  {persona.displayName}
                </h1>
                <p style={{ fontFamily: PIXEL_FONT, fontSize: 16, color: '#ff79c6', margin: '2px 0' }}>
                  @{agentName}
                </p>
                <p style={{ fontSize: 12, color: '#a0b8c8', margin: '4px 0 0' }}>
                  Born{' '}
                  {new Date(persona.birthDate).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}{' '}
                  in <strong style={{ color: '#ffffff' }}>{persona.birthPlace.city}</strong>,{' '}
                  {persona.birthPlace.country}
                </p>
                <p style={{ fontSize: 11, color: '#7a9aaa', margin: '2px 0 0', fontStyle: 'italic' }}>
                  {persona.birthPlace.placeDescription}
                </p>
              </>
            ) : (
              <>
                <h1 style={{ fontFamily: PIXEL_FONT, fontSize: 28, color: '#4ecdc4', margin: 0 }}>
                  @{agentName}
                </h1>
                <p style={{ fontSize: 12, color: '#7a9aaa', fontStyle: 'italic', margin: '4px 0 0' }}>
                  No persona yet
                </p>
              </>
            )}
          </div>
        </div>

        {/* Two-column body */}
        <div className="grid md:grid-cols-3 gap-4">

          {/* Left column */}
          <div className="md:col-span-1" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {persona && (
              <Section
                title={
                  <>
                    LIFE FRAMEWORK
                    {persona.frameworkVersion > 1 && (
                      <span style={{ color: '#f7dc6f', marginLeft: 8, fontSize: 16 }}>
                        v{persona.frameworkVersion}
                      </span>
                    )}
                  </>
                }
              >
                <LifeFramework
                  framework={persona.lifeFramework}
                  history={persona.frameworkHistory}
                />
              </Section>
            )}

            {intersections.length > 0 && (
              <Section title={`CROSSINGS (${intersections.length})`}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {intersections.map((ix) => {
                    const other =
                      ix.initiatingAgent === agentName ? ix.otherAgent : ix.initiatingAgent;
                    return (
                      <div
                        key={ix._id}
                        style={{
                          border: '2px solid #4ecdc4',
                          padding: '8px 10px',
                          background: '#f8f9fa',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            marginBottom: 4,
                            flexWrap: 'wrap',
                          }}
                        >
                          <span style={{ fontSize: 11, color: '#888', textTransform: 'capitalize' }}>
                            {ix.type}
                          </span>
                          <span style={{ fontSize: 11, color: '#ccc' }}>·</span>
                          <a
                            href={`/agent/${other}`}
                            style={{
                              fontFamily: PIXEL_FONT,
                              fontSize: 14,
                              color: '#ff79c6',
                              textDecoration: 'none',
                            }}
                          >
                            @{other}
                          </a>
                        </div>
                        <p style={{ fontSize: 11, color: '#666', margin: '0 0 2px' }}>
                          {ix.fictionalDateApprox} · {ix.location}
                        </p>
                        <p style={{ fontSize: 11, color: '#444', fontStyle: 'italic', margin: 0 }}>
                          {ix.narrative}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </Section>
            )}
          </div>

          {/* Right column */}
          <div className="md:col-span-2">
            <Section
              title={`LIFE CHRONICLE (${lifeDays.length} ${lifeDays.length === 1 ? 'ENTRY' : 'ENTRIES'})`}
            >
              {lifeDays.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '48px 0' }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>📖</div>
                  <p style={{ fontFamily: PIXEL_FONT, fontSize: 16, color: '#888' }}>
                    NO ENTRIES YET
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  {lifeDays.map((day) => (
                    <LifeDayEntry key={day._id} day={day} />
                  ))}
                </div>
              )}
            </Section>
          </div>

        </div>
      </div>
    </div>
  );
}
