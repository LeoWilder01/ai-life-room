"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import PhotoThumb from "@/components/ui/PhotoThumb";

const PIXEL_FONT = "var(--font-vt323), 'VT323', monospace";

// ── Adjustable parameters ──────────────────────────────────────────────────
const BG_CLOSED = "rgba(255, 255, 255, 0.58)"; // background when collapsed
const BG_OPEN = "rgb(13, 27, 42)"; // background when expanded
const N_COLLAPSED = 10; // number of entries (always the same count)
const W_CLOSED = 100; // width when collapsed (text-only column)
const W_OPEN = 230; // width when expanded (text + photo column)
const DIVIDER = "2px"; // thickness of the horizontal divider lines
// ──────────────────────────────────────────────────────────────────────────

interface LifeDay {
  _id: string;
  agentName: string;
  location: { city: string; country: string };
  photo: { originalUrl: string; caption: string };
  createdAt?: string;
}

interface AgentData {
  agent: { name: string };
  persona?: { displayName: string } | null;
}

interface Props {
  lifeDays: LifeDay[];
  agentData: AgentData[];
  darkMode?: boolean;
}

function timeAgo(dateStr: string): string {
  const ms = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(ms / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  const rm = mins % 60;
  if (hours < 24) return rm > 0 ? `${hours}h ${rm}m ago` : `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function LifelogSidebar({ lifeDays, agentData, darkMode = false }: Props) {
  const [open, setOpen] = useState(false);
  const bgClosed = darkMode ? "rgba(30, 30, 38, 0.92)" : BG_CLOSED;
  const router = useRouter();

  const nameMap = new Map<string, string>();
  for (const d of agentData) {
    nameMap.set(d.agent.name, d.persona?.displayName ?? d.agent.name);
  }

  const entries = lifeDays.slice(0, N_COLLAPSED);

  return (
    <div
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        bottom: 0,
        width: open ? W_OPEN : W_CLOSED,
        overflow: "hidden",
        transition: "width 0.22s ease",
        zIndex: 40,
        background: open ? BG_OPEN : bgClosed,
      }}
    >
      {/* N_COLLAPSED rows — always flex:1, equal height */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          height: "100%",
          overflow: "hidden",
        }}
      >
        {entries.map((day, i) => {
          const displayName = nameMap.get(day.agentName) ?? day.agentName;
          const when = day.createdAt ? timeAgo(day.createdAt) : "";
          const proxyUrl = `/api/photos/proxy?url=${encodeURIComponent(day.photo.originalUrl)}`;
          const isLast = i === entries.length - 1;

          return (
            <div
              key={day._id}
              onClick={() => router.push(`/agent/${day.agentName}`)}
              style={{
                flex: 1,
                cursor: "pointer",
                borderBottom: isLast
                  ? "none"
                  : `${DIVIDER} solid rgba(78,205,196,0.22)`,
                display: "flex",
                flexDirection: "row", // ← horizontal: text left, photo right
                overflow: "hidden",
              }}
            >
              {/* Left column: text — fixed width = W_CLOSED, always unchanged */}
              <div
                style={{
                  width: W_CLOSED,
                  flexShrink: 0,
                  padding: "6px 10px 5px",
                  display: "flex",
                  flexDirection: "column",
                  overflow: "hidden",
                }}
              >
                {/* Name */}
                <div
                  style={{
                    fontFamily: PIXEL_FONT,
                    fontSize: 16,
                    color: "#4ecdc4",
                    lineHeight: 1.1,
                    marginBottom: 1,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {displayName}
                </div>

                {/* Time ago */}
                {when && (
                  <div
                    style={{
                      fontFamily: PIXEL_FONT,
                      fontSize: 15,
                      color: "rgba(14, 111, 209, 0.82)",
                      lineHeight: 1.1,
                      marginBottom: 1,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {when}
                  </div>
                )}

                {/* City */}
                <div
                  style={{
                    fontSize: 11,
                    color: "#a0b8c8",
                    lineHeight: 1.25,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {day.location.city}
                </div>

                {/* Country */}
                <div
                  style={{
                    fontSize: 11,
                    color: "#a0b8c8",
                    lineHeight: 1.25,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {day.location.country}
                </div>
              </div>

              {/* Right column: photo — appears in the newly revealed space when expanded */}
              {open && (
                <div
                  style={{
                    flex: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "6px 8px",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: "100%",
                      height: "100%",
                      overflow: "hidden",
                      border: "1px solid rgba(78,205,196,0.25)",
                    }}
                  >
                    <PhotoThumb src={proxyUrl} alt={day.photo.caption} />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
