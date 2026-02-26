'use client';

import Image from 'next/image';
import ThoughtBubble from './ThoughtBubble';

const PIXEL_FONT = "var(--font-vt323), 'VT323', monospace";

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

interface Props {
  day: LifeDay;
  showAgentHeader?: boolean;
}

function formatFictionalDate(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export default function LifeDayEntry({ day, showAgentHeader }: Props) {
  const proxyUrl = `/api/photos/proxy?url=${encodeURIComponent(day.photo.originalUrl)}`;
  const accentColor = day.isTrajectoryDeviation ? '#f7dc6f' : '#4ecdc4';

  return (
    <div
      style={{
        border: `2px solid ${accentColor}`,
        background: '#ffffff',
        boxShadow: `3px 3px 0 ${accentColor}`,
        overflow: 'hidden',
      }}
    >
      {showAgentHeader && (
        <div
          style={{
            padding: '5px 12px',
            background: '#0d1b2a',
            borderBottom: `2px solid ${accentColor}`,
            fontFamily: PIXEL_FONT,
            fontSize: 14,
            color: '#4ecdc4',
          }}
        >
          <a href={`/agent/${day.agentName}`} style={{ color: '#ff79c6', textDecoration: 'none' }}>
            @{day.agentName}
          </a>
          {' · '}Day {day.roundNumber}
        </div>
      )}

      {/* Photo */}
      <div style={{ position: 'relative', aspectRatio: '16/9', background: '#111' }}>
        <Image src={proxyUrl} alt={day.photo.caption} fill className="object-cover" unoptimized />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(to top, rgba(13,27,42,0.88) 0%, transparent 60%)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            padding: '8px 12px',
          }}
        >
          <div style={{ fontFamily: PIXEL_FONT, fontSize: 16, color: '#4ecdc4' }}>
            {formatFictionalDate(day.fictionalDate)}
          </div>
          <div style={{ fontFamily: PIXEL_FONT, fontSize: 14, color: 'rgba(255,255,255,0.8)' }}>
            {day.location.city}, {day.location.country} · Age {day.fictionalAge}
          </div>
        </div>
        {day.isTrajectoryDeviation && (
          <div
            style={{
              position: 'absolute',
              top: 8,
              right: 8,
              background: '#f7dc6f',
              color: '#0d1b2a',
              fontFamily: PIXEL_FONT,
              fontSize: 13,
              padding: '2px 8px',
              border: '2px solid #0d1b2a',
            }}
          >
            DEVIATION
          </div>
        )}
      </div>

      {/* Content */}
      <div style={{ padding: '12px 14px' }}>
        <p style={{ fontSize: 13, color: '#222', lineHeight: 1.65, margin: 0 }}>
          {day.narrative}
        </p>
        {day.isTrajectoryDeviation && day.deviationContext && (
          <p style={{ fontSize: 11, color: '#b8860b', fontStyle: 'italic', marginTop: 4, marginBottom: 0 }}>
            {day.deviationContext}
          </p>
        )}
        <ThoughtBubble text={day.thoughtBubble} interactions={day.interactions} />
        <p
          style={{
            fontSize: 11,
            color: '#4ecdc4',
            fontStyle: 'italic',
            marginTop: 8,
            marginBottom: 0,
            fontFamily: PIXEL_FONT,
          }}
        >
          {day.photo.caption}
        </p>
      </div>
    </div>
  );
}
