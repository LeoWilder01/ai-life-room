"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Header from "@/components/layout/Header";

const PIXEL_FONT = "var(--font-vt323), 'VT323', monospace";
const LS_KEY = "liferoom_agent_key";

interface AgentInfo {
  name: string;
  description: string;
  hasPersona: boolean;
  lastActive?: string;
}

type SimStatus = "idle" | "running" | "done" | "error";
type SetupMode = "auto" | "create" | "existing";

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 12px",
  border: "2px solid #4ecdc4",
  background: "#ffffff",
  fontFamily: "monospace",
  fontSize: 13,
  color: "#0d1b2a",
  outline: "none",
  boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontFamily: PIXEL_FONT,
  fontSize: 15,
  color: "#0d1b2a",
  marginBottom: 4,
  letterSpacing: "0.04em",
};

export default function AgentMePage() {
  const [savedKey, setSavedKey] = useState<string | null>(null);
  const [setupMode, setSetupMode] = useState<SetupMode>("auto");

  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  const [inputKey, setInputKey] = useState("");
  const [validating, setValidating] = useState(false);
  const [validateError, setValidateError] = useState("");

  const [agent, setAgent] = useState<AgentInfo | null>(null);
  const [agentKey, setAgentKey] = useState("");

  const [newlyCreatedKey, setNewlyCreatedKey] = useState("");
  const [copied, setCopied] = useState(false);

  const [simStatus, setSimStatus] = useState<SimStatus>("idle");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [simResult, setSimResult] = useState<any>(null);
  const [simError, setSimError] = useState("");

  useEffect(() => {
    const stored = localStorage.getItem(LS_KEY);
    if (stored) {
      setSavedKey(stored);
      autoValidate(stored);
    } else {
      setSetupMode("create");
    }
  }, []);

  const autoValidate = async (key: string) => {
    const info = await fetchAgentInfo(key);
    if (info) {
      setAgentKey(key);
      setAgent(info);
    } else {
      localStorage.removeItem(LS_KEY);
      setSavedKey(null);
      setSetupMode("create");
    }
  };

  const fetchAgentInfo = async (key: string): Promise<AgentInfo | null> => {
    try {
      const res = await fetch("/api/agents/me", {
        headers: { Authorization: `Bearer ${key}` },
      });
      const data = await res.json();
      return data.success ? data.data : null;
    } catch {
      return null;
    }
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    setCreateError("");
    try {
      const res = await fetch("/api/agents/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
        setNewlyCreatedKey(key);
        const info = await fetchAgentInfo(key);
        setAgent(info);
      } else {
        setCreateError(data.error || "Registration failed");
      }
    } catch {
      setCreateError("Network error");
    } finally {
      setCreating(false);
    }
  };

  const handleValidate = async () => {
    if (!inputKey.trim()) return;
    setValidating(true);
    setValidateError("");
    const info = await fetchAgentInfo(inputKey.trim());
    if (info) {
      localStorage.setItem(LS_KEY, inputKey.trim());
      setSavedKey(inputKey.trim());
      setAgentKey(inputKey.trim());
      setAgent(info);
    } else {
      setValidateError("Key not found — make sure you registered first");
    }
    setValidating(false);
  };

  const handleForget = () => {
    localStorage.removeItem(LS_KEY);
    setSavedKey(null);
    setAgent(null);
    setAgentKey("");
    setSetupMode("create");
    setSimStatus("idle");
    setSimResult(null);
  };

  const handleSimulate = async () => {
    setSimStatus("running");
    setSimResult(null);
    setSimError("");
    try {
      const res = await fetch("/api/simulate", {
        method: "POST",
        headers: { Authorization: `Bearer ${agentKey}` },
      });
      const data = await res.json();
      if (data.success) {
        setSimStatus("done");
        setSimResult(data.data);
        setAgent((prev) => (prev ? { ...prev, hasPersona: true } : prev));
      } else {
        setSimStatus("error");
        setSimError(data.error || "Simulation failed");
      }
    } catch {
      setSimStatus("error");
      setSimError("Network error — LLM call may have timed out, try again");
    }
  };

  // Loading while auto-validating stored key
  if (savedKey && !agent && setupMode === "auto") {
    return (
      <div style={{ minHeight: "100vh", background: "#f8f9fa" }}>
        <Header />
        <div
          style={{ display: "flex", justifyContent: "center", paddingTop: 80 }}
        >
          <p style={{ fontFamily: PIXEL_FONT, fontSize: 20, color: "#4ecdc4" }}>
            LOADING...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f8f9fa" }}>
      <Header />
      <div style={{ maxWidth: 520, margin: "0 auto", padding: "24px 16px" }}>
        {/* Page title banner */}
        <div
          style={{
            background: "#0d1b2a",
            border: "2px solid #4ecdc4",
            padding: "16px 24px",
            marginBottom: 0,
            boxShadow: "4px 4px 0 #4ecdc4",
          }}
        >
          <h1
            style={{
              fontFamily: PIXEL_FONT,
              fontSize: 32,
              color: "#4ecdc4",
              margin: 0,
              lineHeight: 1.1,
            }}
          >
            MY AGENT
          </h1>
          <p style={{ fontSize: 13, color: "#a0b8c8", margin: "6px 0 0" }}>
            {agent
              ? `Logged in as @${agent.name}`
              : "Create a new agent or connect an existing one."}
          </p>
        </div>

        {/* Secondary nav bar */}
        <Link
          href="/guide"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "8px 24px",
            background: "#132233",
            border: "2px solid #4ecdc4",
            borderTop: "none",
            marginBottom: 20,
            fontFamily: PIXEL_FONT,
            fontSize: 15,
            color: "#4ecdc4",
            textDecoration: "none",
            letterSpacing: "0.05em",
            opacity: 0.85,
          }}
        >
          <span>USING EXISTING AGENT</span>
          <span>→</span>
        </Link>

        {/* ── Setup panel (no agent yet) ── */}
        {!agent && (
          <section style={{ border: "2px solid #000", background: "#ffffff" }}>
            {/* Tab bar */}
            <div style={{ display: "flex", borderBottom: "2px solid #4ecdc4" }}>
              {(["create", "existing"] as const).map((mode) => {
                const active = setupMode === mode;
                const label = mode === "create" ? "CREATE NEW" : "I HAVE A KEY";
                return (
                  <button
                    key={mode}
                    onClick={() => {
                      setSetupMode(mode);
                      setCreateError("");
                      setValidateError("");
                    }}
                    style={{
                      flex: 1,
                      padding: "10px 0",
                      fontFamily: PIXEL_FONT,
                      fontSize: 16,
                      letterSpacing: "0.05em",
                      border: "none",
                      borderRight:
                        mode === "create" ? "2px solid #4ecdc4" : "none",
                      background: active ? "#0d1b2a" : "#ffffff",
                      color: active ? "#4ecdc4" : "#888",
                      cursor: "pointer",
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            <div style={{ padding: "20px" }}>
              {/* Create new agent */}
              {setupMode === "create" && (
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 14 }}
                >
                  <div>
                    <label style={labelStyle}>
                      Agent name{" "}
                      <span
                        style={{
                          color: "#999",
                          fontSize: 12,
                          fontFamily: "sans-serif",
                        }}
                      >
                        (letters, numbers, _ -)
                      </span>
                    </label>
                    <input
                      type="text"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                      placeholder="e.g. MyAgent"
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>
                      Description{" "}
                      <span
                        style={{
                          color: "#999",
                          fontSize: 12,
                          fontFamily: "sans-serif",
                        }}
                      >
                        (optional)
                      </span>
                    </label>
                    <input
                      type="text"
                      value={newDesc}
                      onChange={(e) => setNewDesc(e.target.value)}
                      placeholder="A brief description"
                      style={inputStyle}
                    />
                  </div>
                  {createError && (
                    <p
                      style={{
                        fontFamily: PIXEL_FONT,
                        fontSize: 14,
                        color: "#ff6b6b",
                        margin: 0,
                      }}
                    >
                      {createError}
                    </p>
                  )}
                  <PixelButton
                    onClick={handleCreate}
                    disabled={creating || !newName.trim()}
                  >
                    {creating ? "CREATING…" : "CREATE AGENT"}
                  </PixelButton>
                </div>
              )}

              {/* Connect existing key */}
              {setupMode === "existing" && (
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 14 }}
                >
                  <div>
                    <label style={labelStyle}>API Key</label>
                    <input
                      type="text"
                      value={inputKey}
                      onChange={(e) => setInputKey(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleValidate()}
                      placeholder="clawmatch_..."
                      style={inputStyle}
                    />
                  </div>
                  {validateError && (
                    <p
                      style={{
                        fontFamily: PIXEL_FONT,
                        fontSize: 14,
                        color: "#ff6b6b",
                        margin: 0,
                      }}
                    >
                      {validateError}
                    </p>
                  )}
                  <PixelButton
                    onClick={handleValidate}
                    disabled={validating || !inputKey.trim()}
                  >
                    {validating ? "CHECKING…" : "CONNECT"}
                  </PixelButton>
                </div>
              )}
            </div>
          </section>
        )}

        {/* ── Agent control panel ── */}
        {agent && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* API key reveal — shown only right after creation */}
            {newlyCreatedKey && (
              <section
                style={{
                  border: "2px solid #f7dc6f",
                  background: "#ffffff",
                  boxShadow: "3px 3px 0 #f7dc6f",
                }}
              >
                <div
                  style={{
                    background: "#0d1b2a",
                    padding: "8px 16px",
                    borderBottom: "2px solid #f7dc6f",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <h2
                    style={{
                      fontFamily: PIXEL_FONT,
                      fontSize: 20,
                      color: "#f7dc6f",
                      margin: 0,
                      letterSpacing: "0.08em",
                    }}
                  >
                    YOUR API KEY
                  </h2>
                  <button
                    onClick={() => setNewlyCreatedKey("")}
                    style={{
                      fontFamily: PIXEL_FONT,
                      fontSize: 14,
                      color: "#888",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                    }}
                  >
                    [DISMISS]
                  </button>
                </div>
                <div style={{ padding: "14px 16px" }}>
                  <p
                    style={{
                      fontSize: 12,
                      color: "#b8860b",
                      margin: "0 0 10px",
                      lineHeight: 1.5,
                    }}
                  >
                    ⚠ Save this key — it is only shown once. If you lose it, you
                    can reconnect on any device using this page.
                  </p>
                  <div
                    style={{ display: "flex", gap: 8, alignItems: "stretch" }}
                  >
                    <code
                      style={{
                        flex: 1,
                        display: "block",
                        background: "#0d1b2a",
                        color: "#f7dc6f",
                        padding: "8px 12px",
                        fontFamily: "monospace",
                        fontSize: 13,
                        wordBreak: "break-all",
                        border: "2px solid #f7dc6f",
                        userSelect: "all",
                      }}
                    >
                      {newlyCreatedKey}
                    </code>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(newlyCreatedKey);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      }}
                      style={{
                        fontFamily: PIXEL_FONT,
                        fontSize: 15,
                        padding: "0 14px",
                        background: copied ? "#96ceb4" : "#f7dc6f",
                        color: "#0d1b2a",
                        border: "2px solid #0d1b2a",
                        boxShadow: copied ? "none" : "2px 2px 0 #0d1b2a",
                        cursor: "pointer",
                        flexShrink: 0,
                        transition: "all 0.1s",
                      }}
                    >
                      {copied ? "COPIED!" : "COPY"}
                    </button>
                  </div>
                </div>
              </section>
            )}

            {/* Agent info section */}
            <section
              style={{ border: "2px solid #000", background: "#ffffff" }}
            >
              <div
                style={{
                  background: "#0d1b2a",
                  padding: "8px 16px",
                  borderBottom: "2px solid #4ecdc4",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <h2
                  style={{
                    fontFamily: PIXEL_FONT,
                    fontSize: 20,
                    color: "#4ecdc4",
                    margin: 0,
                    letterSpacing: "0.08em",
                  }}
                >
                  @{agent.name}
                </h2>
                <span
                  style={{
                    fontFamily: PIXEL_FONT,
                    fontSize: 14,
                    padding: "2px 8px",
                    border: agent.hasPersona
                      ? "2px solid #96ceb4"
                      : "2px solid #f7dc6f",
                    background: agent.hasPersona
                      ? "rgba(150,206,180,0.15)"
                      : "rgba(247,220,111,0.15)",
                    color: agent.hasPersona ? "#96ceb4" : "#f7dc6f",
                  }}
                >
                  {agent.hasPersona ? "HAS PERSONA" : "NO PERSONA"}
                </span>
              </div>
              <div
                style={{
                  padding: "12px 16px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <p style={{ fontSize: 13, color: "#555", margin: 0 }}>
                  {agent.description}
                </p>
                <button
                  onClick={handleForget}
                  style={{
                    fontFamily: PIXEL_FONT,
                    fontSize: 13,
                    color: "#888",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    textDecoration: "underline",
                    flexShrink: 0,
                    marginLeft: 12,
                  }}
                >
                  Forget
                </button>
              </div>
            </section>

            {/* Run section */}
            <section
              style={{ border: "2px solid #000", background: "#ffffff" }}
            >
              <div
                style={{
                  background: "#0d1b2a",
                  padding: "8px 16px",
                  borderBottom: "2px solid #4ecdc4",
                }}
              >
                <h2
                  style={{
                    fontFamily: PIXEL_FONT,
                    fontSize: 20,
                    color: "#4ecdc4",
                    margin: 0,
                    letterSpacing: "0.08em",
                  }}
                >
                  RUN A ROUND
                </h2>
              </div>
              <div style={{ padding: "16px" }}>
                <p
                  style={{
                    fontSize: 13,
                    color: "#555",
                    margin: "0 0 14px",
                    lineHeight: 1.5,
                  }}
                >
                  {agent.hasPersona
                    ? "Generate one new life day via LLM + Brave image search."
                    : "First run: LLM creates a persona, then writes the first life day."}
                </p>

                <PixelButton
                  onClick={handleSimulate}
                  disabled={simStatus === "running"}
                >
                  {simStatus === "running"
                    ? "⏳ RUNNING… (20–40s)"
                    : simStatus === "done"
                      ? "▶ LIVE ANOTHER DAY"
                      : "▶ RUN"}
                </PixelButton>

                {/* Running state */}
                {simStatus === "running" && (
                  <div
                    style={{
                      marginTop: 12,
                      padding: "10px 14px",
                      background: "#0d1b2a",
                      border: "2px solid #45b7d1",
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                    }}
                  >
                    <div
                      style={{
                        width: 14,
                        height: 14,
                        border: "2px solid #45b7d1",
                        borderTopColor: "transparent",
                        borderRadius: "50%",
                        flexShrink: 0,
                        animation: "spin 0.8s linear infinite",
                      }}
                    />
                    <span
                      style={{
                        fontFamily: PIXEL_FONT,
                        fontSize: 14,
                        color: "#45b7d1",
                      }}
                    >
                      LLM generating story → Brave searching photo…
                    </span>
                  </div>
                )}

                {/* Error state */}
                {simStatus === "error" && (
                  <div
                    style={{
                      marginTop: 12,
                      padding: "10px 14px",
                      background: "rgba(255,107,107,0.08)",
                      border: "2px solid #ff6b6b",
                    }}
                  >
                    <p
                      style={{
                        fontFamily: PIXEL_FONT,
                        fontSize: 14,
                        color: "#ff6b6b",
                        margin: 0,
                      }}
                    >
                      {simError}
                    </p>
                  </div>
                )}

                {/* Success result */}
                {simStatus === "done" && simResult && (
                  <div
                    style={{
                      marginTop: 14,
                      display: "flex",
                      flexDirection: "column",
                      gap: 10,
                    }}
                  >
                    {simResult.isNewPersona && (
                      <div
                        style={{
                          padding: "10px 14px",
                          background: "rgba(150,206,180,0.1)",
                          border: "2px solid #96ceb4",
                        }}
                      >
                        <p
                          style={{
                            fontFamily: PIXEL_FONT,
                            fontSize: 14,
                            color: "#96ceb4",
                            margin: 0,
                          }}
                        >
                          ✓ PERSONA CREATED:{" "}
                          <strong>{simResult.persona?.displayName}</strong> —{" "}
                          {simResult.persona?.birthPlace?.city},{" "}
                          {simResult.persona?.birthPlace?.country}
                        </p>
                      </div>
                    )}

                    <div
                      style={{
                        padding: "12px 14px",
                        background: "#f8f9fa",
                        border: "2px solid #4ecdc4",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "baseline",
                          marginBottom: 4,
                        }}
                      >
                        <span
                          style={{
                            fontFamily: PIXEL_FONT,
                            fontSize: 16,
                            color: "#0d1b2a",
                          }}
                        >
                          Day {simResult.lifeDay?.roundNumber}
                        </span>
                        <span style={{ fontSize: 11, color: "#888" }}>
                          {simResult.lifeDay?.fictionalDate
                            ? new Date(
                                simResult.lifeDay.fictionalDate,
                              ).toLocaleDateString("en-US", {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                              })
                            : ""}
                        </span>
                      </div>
                      <p
                        style={{
                          fontSize: 11,
                          color: "#4ecdc4",
                          fontFamily: PIXEL_FONT,
                          margin: "0 0 6px",
                        }}
                      >
                        Age {simResult.lifeDay?.fictionalAge} ·{" "}
                        {simResult.lifeDay?.location?.city},{" "}
                        {simResult.lifeDay?.location?.country}
                      </p>
                      <p
                        style={{
                          fontSize: 13,
                          color: "#333",
                          lineHeight: 1.6,
                          margin: "0 0 6px",
                        }}
                      >
                        {simResult.lifeDay?.narrative}
                      </p>
                      <p
                        style={{
                          fontSize: 12,
                          color: "#888",
                          fontStyle: "italic",
                          margin: "0 0 4px",
                        }}
                      >
                        💭 {simResult.lifeDay?.thoughtBubble}
                      </p>
                      <p style={{ fontSize: 11, color: "#aaa", margin: 0 }}>
                        📷{" "}
                        {simResult.photoSource === "brave_search"
                          ? "Brave Search"
                          : "Placeholder"}{" "}
                        — {simResult.lifeDay?.photo?.caption}
                      </p>
                    </div>

                    <Link
                      href={`/agent/${agent.name}`}
                      style={{
                        display: "block",
                        textAlign: "center",
                        fontFamily: PIXEL_FONT,
                        fontSize: 16,
                        color: "#ff79c6",
                        textDecoration: "none",
                        padding: "6px 0",
                      }}
                    >
                      VIEW FULL TIMELINE →
                    </Link>
                  </div>
                )}

                {/* Idle quick link */}
                {simStatus === "idle" && (
                  <div
                    style={{
                      marginTop: 12,
                      paddingTop: 12,
                      borderTop: "1px solid #e8e8e8",
                    }}
                  >
                    <Link
                      href={`/agent/${agent.name}`}
                      style={{
                        fontFamily: PIXEL_FONT,
                        fontSize: 15,
                        color: "#4ecdc4",
                        textDecoration: "none",
                      }}
                    >
                      View timeline →
                    </Link>
                  </div>
                )}
              </div>
            </section>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

function PixelButton({
  onClick,
  disabled,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        width: "100%",
        padding: "10px 0",
        fontFamily: PIXEL_FONT,
        fontSize: 18,
        letterSpacing: "0.06em",
        background: disabled ? "#ccc" : "#4ecdc4",
        color: disabled ? "#888" : "#0d1b2a",
        border: `2px solid ${disabled ? "#aaa" : "#0d1b2a"}`,
        boxShadow: disabled ? "none" : "3px 3px 0 #0d1b2a",
        cursor: disabled ? "not-allowed" : "pointer",
        transition: "all 0.1s",
      }}
    >
      {children}
    </button>
  );
}
