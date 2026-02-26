'use client';

const PIXEL_FONT = "var(--font-vt323), 'VT323', monospace";

// Colors drawn from the world map's AGENT_COLORS palette
const BAND_COLORS = [
  '#ff6b6b',
  '#4ecdc4',
  '#45b7d1',
  '#96ceb4',
  '#ffeaa7',
  '#dda0dd',
  '#98d8c8',
  '#f7dc6f',
];

interface FrameworkBand {
  ageStart: number;
  ageEnd: number;
  location: string;
  keyEvents: string[];
}

interface FrameworkHistory {
  version: number;
  changedAt: string;
  reason: string;
  attractedToAgent: string;
}

interface Props {
  framework: FrameworkBand[];
  history?: FrameworkHistory[];
}

export default function LifeFramework({ framework, history }: Props) {
  const maxAge = 30;

  return (
    <div>
      {/* Visual age bar — pixelated blocks */}
      <div style={{ display: 'flex', height: 28, marginBottom: 12, gap: 2 }}>
        {framework.map((band, i) => {
          const width = ((band.ageEnd - band.ageStart) / maxAge) * 100;
          const color = BAND_COLORS[i % BAND_COLORS.length];
          return (
            <div
              key={i}
              style={{
                width: `${width}%`,
                background: color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: PIXEL_FONT,
                fontSize: 12,
                color: '#0d1b2a',
                cursor: 'default',
                border: '1px solid rgba(0,0,0,0.25)',
                flexShrink: 0,
              }}
              title={`Age ${band.ageStart}–${band.ageEnd}: ${band.location}`}
            >
              {band.ageEnd - band.ageStart >= 4 && `${band.ageStart}–${band.ageEnd}`}
            </div>
          );
        })}
      </div>

      {/* Band detail cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {framework.map((band, i) => {
          const color = BAND_COLORS[i % BAND_COLORS.length];
          return (
            <div
              key={i}
              style={{
                border: `2px solid ${color}`,
                padding: '8px 10px',
                background: '#ffffff',
              }}
            >
              <div style={{ marginBottom: 4 }}>
                <span
                  style={{
                    fontFamily: PIXEL_FONT,
                    fontSize: 13,
                    color: color,
                    letterSpacing: '0.05em',
                  }}
                >
                  AGE {band.ageStart}–{band.ageEnd}
                </span>
                <p
                  style={{
                    fontFamily: PIXEL_FONT,
                    fontSize: 16,
                    color: '#0d1b2a',
                    margin: '2px 0 0',
                  }}
                >
                  {band.location}
                </p>
              </div>
              <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                {band.keyEvents.map((event, j) => (
                  <li
                    key={j}
                    style={{
                      fontSize: 12,
                      color: '#333',
                      display: 'flex',
                      gap: 6,
                      marginTop: 2,
                    }}
                  >
                    <span style={{ color, flexShrink: 0 }}>›</span>
                    {event}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      {/* Framework change history */}
      {history && history.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <h4
            style={{
              fontFamily: PIXEL_FONT,
              fontSize: 16,
              color: '#f7dc6f',
              letterSpacing: '0.08em',
              marginBottom: 8,
            }}
          >
            FRAMEWORK CHANGES
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {history.map((entry, i) => (
              <div
                key={i}
                style={{
                  border: '2px solid #f7dc6f',
                  padding: '8px 10px',
                  background: 'rgba(247,220,111,0.06)',
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
                  <span style={{ fontFamily: PIXEL_FONT, fontSize: 14, color: '#f7dc6f' }}>
                    v{entry.version}
                  </span>
                  <span style={{ fontSize: 11, color: '#888' }}>
                    {new Date(entry.changedAt).toLocaleDateString()}
                  </span>
                  <span style={{ fontSize: 11, color: '#888' }}>attracted to</span>
                  <a
                    href={`/agent/${entry.attractedToAgent}`}
                    style={{
                      fontFamily: PIXEL_FONT,
                      fontSize: 14,
                      color: '#ff79c6',
                      textDecoration: 'none',
                    }}
                  >
                    @{entry.attractedToAgent}
                  </a>
                </div>
                <p style={{ fontSize: 11, color: '#555', fontStyle: 'italic', margin: 0 }}>
                  {entry.reason}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
