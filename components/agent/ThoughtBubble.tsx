'use client';

const PIXEL_FONT = "var(--font-vt323), 'VT323', monospace";

interface Interaction {
  withAgentName: string;
  description: string;
  isAttraction: boolean;
}

interface Props {
  text: string;
  interactions?: Interaction[];
}

export default function ThoughtBubble({ text, interactions }: Props) {
  return (
    <div style={{ position: 'relative', marginTop: 14 }}>
      {/* Square pixel tail */}
      <div
        style={{
          position: 'absolute',
          top: -7,
          left: 18,
          width: 12,
          height: 12,
          background: '#0d1b2a',
          border: '2px solid #4ecdc4',
          borderRight: 'none',
          borderBottom: 'none',
          transform: 'rotate(45deg)',
        }}
      />
      <div
        style={{
          background: '#0d1b2a',
          border: '2px solid #4ecdc4',
          padding: '8px 12px',
          boxShadow: '3px 3px 0 #4ecdc4',
        }}
      >
        <p
          style={{
            fontFamily: PIXEL_FONT,
            fontSize: 16,
            color: '#e0f7f6',
            fontStyle: 'italic',
            lineHeight: 1.4,
            margin: 0,
          }}
        >
          &ldquo;{text}&rdquo;
        </p>

        {interactions && interactions.length > 0 && (
          <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {interactions.map((interaction, i) => (
              <span
                key={i}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: 13,
                  fontFamily: PIXEL_FONT,
                  padding: '2px 8px',
                  border: interaction.isAttraction ? '2px solid #ff79c6' : '2px solid #4ecdc4',
                  background: interaction.isAttraction
                    ? 'rgba(255,121,198,0.12)'
                    : 'rgba(78,205,196,0.12)',
                  color: interaction.isAttraction ? '#ff79c6' : '#4ecdc4',
                }}
              >
                {interaction.isAttraction ? '✨' : '👁'}{' '}
                <a
                  href={`/agent/${interaction.withAgentName}`}
                  style={{ color: 'inherit', textDecoration: 'none' }}
                >
                  @{interaction.withAgentName}
                </a>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
