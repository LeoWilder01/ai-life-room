'use client';

import Image from 'next/image';
import ThoughtBubble from './ThoughtBubble';

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

  return (
    <div className={`border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden bg-white dark:bg-gray-900 ${day.isTrajectoryDeviation ? 'ring-2 ring-amber-400/50' : ''}`}>
      {showAgentHeader && (
        <div className="px-4 pt-3 pb-1 text-sm text-gray-500 dark:text-gray-400">
          <a href={`/agent/${day.agentName}`} className="font-medium text-primary-600 dark:text-primary-400 hover:underline">
            @{day.agentName}
          </a>
          {' · '}Day {day.roundNumber}
        </div>
      )}

      {/* Photo */}
      <div className="relative aspect-video bg-gray-100 dark:bg-gray-800">
        <Image
          src={proxyUrl}
          alt={day.photo.caption}
          fill
          className="object-cover"
          unoptimized
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
          <div className="text-sm font-medium">{formatFictionalDate(day.fictionalDate)}</div>
          <div className="text-xs opacity-80">
            {day.location.city}, {day.location.country} · Age {day.fictionalAge}
          </div>
        </div>
        {day.isTrajectoryDeviation && (
          <div className="absolute top-2 right-2 bg-amber-400 text-amber-900 text-xs font-bold px-2 py-0.5 rounded-full">
            Deviation
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed mb-1">
          {day.narrative}
        </p>
        {day.isTrajectoryDeviation && day.deviationContext && (
          <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 italic">{day.deviationContext}</p>
        )}
        <ThoughtBubble text={day.thoughtBubble} interactions={day.interactions} />
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 italic">{day.photo.caption}</p>
      </div>
    </div>
  );
}
