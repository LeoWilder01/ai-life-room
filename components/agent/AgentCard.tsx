'use client';

import Image from 'next/image';
import Link from 'next/link';
import ThoughtBubble from './ThoughtBubble';

interface Persona {
  displayName: string;
  birthPlace: { city: string; country: string };
  birthDate: string;
}

interface LifeDay {
  _id: string;
  roundNumber: number;
  fictionalDate: string;
  fictionalAge: number;
  location: { city: string; country: string };
  photo: { originalUrl: string; caption: string };
  thoughtBubble: string;
  interactions?: { withAgentName: string; description: string; isAttraction: boolean }[];
}

interface Agent {
  _id: string;
  name: string;
  description: string;
  claimStatus: string;
  lastActive?: string;
}

interface Props {
  agent: Agent;
  persona?: Persona | null;
  latestLifeDay?: LifeDay | null;
  intersectionCount?: number;
}

function formatFictionalDate(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export default function AgentCard({ agent, persona, latestLifeDay, intersectionCount }: Props) {
  const avatarUrl = `https://api.dicebear.com/9.x/thumbs/svg?seed=${encodeURIComponent(agent.name)}&backgroundColor=b6e3f4,c0aede,d1d4f9`;
  const hasInteractions = latestLifeDay?.interactions && latestLifeDay.interactions.length > 0;
  const proxyUrl = latestLifeDay
    ? `/api/photos/proxy?url=${encodeURIComponent(latestLifeDay.photo.originalUrl)}`
    : null;

  return (
    <Link href={`/agent/${agent.name}`} className="block group">
      <div
        className={`rounded-2xl overflow-hidden border bg-white dark:bg-gray-900 shadow-sm hover:shadow-md transition-all duration-200 ${
          hasInteractions
            ? 'border-primary-300 dark:border-primary-700 ring-1 ring-primary-200 dark:ring-primary-800'
            : 'border-gray-200 dark:border-gray-700'
        }`}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-4 pt-4 pb-2">
          <div className="relative w-12 h-12 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-800 shrink-0">
            <Image src={avatarUrl} alt={agent.name} fill className="object-cover" unoptimized />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-gray-900 dark:text-white truncate text-base">
              {persona?.displayName || agent.name}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">@{agent.name}</p>
          </div>
          {hasInteractions && (
            <span className="ml-auto shrink-0 w-2 h-2 rounded-full bg-primary-500" title="Has interactions this round" />
          )}
          {intersectionCount && intersectionCount > 0 ? (
            <span className="ml-auto shrink-0 text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-full">
              {intersectionCount} crossing{intersectionCount !== 1 ? 's' : ''}
            </span>
          ) : null}
        </div>

        {/* Photo */}
        {proxyUrl ? (
          <div className="relative aspect-video bg-gray-100 dark:bg-gray-800 mx-3 rounded-xl overflow-hidden">
            <Image
              src={proxyUrl}
              alt={latestLifeDay!.photo.caption}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
              unoptimized
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-2.5 text-white">
              <div className="text-xs font-medium">{formatFictionalDate(latestLifeDay!.fictionalDate)}</div>
              <div className="text-xs opacity-75">
                {latestLifeDay!.location.city}, {latestLifeDay!.location.country}
              </div>
            </div>
          </div>
        ) : (
          <div className="mx-3 aspect-video bg-gray-100 dark:bg-gray-800 rounded-xl flex items-center justify-center">
            <span className="text-3xl opacity-30">📷</span>
          </div>
        )}

        {/* Thought bubble */}
        <div className="px-4 pb-4">
          {latestLifeDay ? (
            <ThoughtBubble
              text={latestLifeDay.thoughtBubble}
              interactions={latestLifeDay.interactions}
            />
          ) : (
            <div className="mt-3 text-xs text-gray-400 dark:text-gray-500 italic text-center py-2">
              {persona ? 'No entries yet' : 'No persona yet'}
            </div>
          )}

          {/* Footer */}
          <div className="mt-3 flex items-center justify-between text-xs text-gray-400 dark:text-gray-500">
            {latestLifeDay ? (
              <span>
                Day {latestLifeDay.roundNumber} · {latestLifeDay.fictionalAge}y ·{' '}
                {latestLifeDay.location.city}
              </span>
            ) : persona ? (
              <span>
                Born {persona.birthPlace.city}, {persona.birthPlace.country}
              </span>
            ) : (
              <span>No persona</span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
