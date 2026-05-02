import { useEffect, useMemo, useRef, useState } from "react";

type PanelState = "idle" | "connecting" | "streaming" | "done" | "error";

interface OutputLine {
  kind: "agent" | "user";
  text: string;
}

interface Props {
  jobId: string | null;
  onDone: () => void;
  onRetry?: () => void;
}

/** Extract the first OAuth authorization URL from agent output lines. */
function detectAuthUrl(lines: OutputLine[]): string | null {
  const text = lines.map((l) => l.text).join("\n");
  const mdMatch = text.match(/\[.*?\]\((https?:\/\/[^\s)]+(?:authorize|oauth|auth)[^\s)]*)\)/i);
  if (mdMatch) return mdMatch[1];
  const bareMatch = text.match(/(https?:\/\/\S*(?:authorize|oauth)[^\s)>\]]*)/i);
  return bareMatch ? bareMatch[1] : null;
}

export default function OutputPanel({ jobId, onDone, onRetry }: Props) {
  const [lines, setLines] = useState<OutputLine[]>([]);
  const [state, setPanelState] = useState<PanelState>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [isAwaitingReply, setIsAwaitingReply] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const replyRef = useRef<HTMLTextAreaElement>(null);
  const sendAbortRef = useRef<AbortController | null>(null);

  const authUrl = useMemo(() => detectAuthUrl(lines), [lines]);
  const needsAuth = authUrl !== null && !isAwaitingReply;

  useEffect(() => {
    if (!jobId) return;

    // Reset for new job
    setLines([]);
    setErrorMsg("");
    setReplyText("");
    setIsAwaitingReply(false);
    setPanelState("connecting");

    const es = new EventSource(`/api/stream/${jobId}`);

    es.onopen = () => {
      setPanelState("streaming");
    };

    es.onmessage = (event: MessageEvent<string>) => {
      try {
        const parsed = JSON.parse(event.data) as { type: string; content?: string };
        if (parsed.type === "text" && parsed.content !== undefined) {
          setLines((prev) => [...prev, { kind: "agent", text: parsed.content! }]);
          setIsAwaitingReply(false);
        } else if (parsed.type === "user_message" && parsed.content !== undefined) {
          setLines((prev) => [...prev, { kind: "user", text: parsed.content! }]);
        } else if (parsed.type === "await_reply") {
          setIsAwaitingReply(true);
          setPanelState("streaming"); // keep panel in streaming state
          setTimeout(() => replyRef.current?.focus(), 50);
        } else if (parsed.type === "done") {
          setIsAwaitingReply(false);
          setPanelState("done");
          onDone();
          es.close();
        } else if (parsed.type === "error") {
          setErrorMsg(parsed.content ?? "Unknown error");
          setIsAwaitingReply(false);
          setPanelState("error");
          onDone();
          es.close();
        }
      } catch {
        // ignore malformed events
      }
    };

    es.onerror = () => {
      if (state !== "done" && state !== "error") {
        setErrorMsg("Connection to server lost.");
        setPanelState("error");
        onDone();
      }
      es.close();
    };

    return () => {
      es.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId]);

  // Auto-scroll to bottom when new lines arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [lines, isAwaitingReply]);

  const copyOutput = () => {
    void navigator.clipboard.writeText(
      lines.map((l) => (l.kind === "user" ? `> ${l.text}` : l.text)).join("\n")
    );
  };

  const sendReply = async () => {
    if (!replyText.trim() || !jobId || isSending) return;
    const controller = new AbortController();
    sendAbortRef.current = controller;
    setIsSending(true);
    try {
      await fetch(`/api/jobs/${jobId}/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: replyText.trim() }),
        signal: controller.signal,
      });
      setReplyText("");
      setIsAwaitingReply(false);
    } catch {
      // ignore — server will surface errors via SSE; AbortError means user cancelled
    } finally {
      sendAbortRef.current = null;
      setIsSending(false);
    }
  };

  const cancelReply = () => {
    sendAbortRef.current?.abort();
    sendAbortRef.current = null;
    setIsSending(false);
    setReplyText("");
    setTimeout(() => replyRef.current?.focus(), 50);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Ctrl+Enter or Cmd+Enter to send
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      void sendReply();
    }
  };

  return (
    <div style={containerStyle}>
      {/* Header bar */}
      <div style={headerStyle}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ display: "flex", gap: 6 }}>
            <div style={{ ...dot, background: "#f87171" }} />
            <div style={{ ...dot, background: "#fbbf24" }} />
            <div style={{ ...dot, background: "#34d399" }} />
          </div>
          <span style={headerTitle}>Agent Output</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {state === "streaming" && !isAwaitingReply && (
            <span style={badge("streaming")}>
              <span style={spinnerDot} />
              Running
            </span>
          )}
          {isAwaitingReply && (
            <span style={badge("awaiting")}>
              <span style={spinnerDot} />
              Waiting for your reply
            </span>
          )}
          {needsAuth && !isAwaitingReply && (
            <span style={badge("auth")}>Auth Required</span>
          )}
          {state === "done" && !isAwaitingReply && !needsAuth && (
            <span style={badge("done")}>Complete</span>
          )}
          {state === "error" && <span style={badge("error")}>Error</span>}
          {state === "connecting" && <span style={badge("connecting")}>Connecting…</span>}
          {lines.length > 0 && (
            <button style={copyBtn} onClick={copyOutput} title="Copy all output">
              Copy
            </button>
          )}
        </div>
      </div>

      {/* Output area */}
      <div style={outputArea}>
        {state === "idle" && (
          <div style={emptyState}>
            Fill in the form and click <strong>Generate Stories</strong> to start.
          </div>
        )}
        {state === "connecting" && (
          <div style={emptyState}>Connecting to agent…</div>
        )}
        {(state === "streaming" || state === "done" || state === "error") && (
          <div style={pre}>
            {lines.map((line, i) =>
              line.kind === "user" ? (
                <div key={i} style={userMessageRow}>
                  <span style={userMessageLabel}>You</span>
                  <span style={userMessageText}>{line.text}</span>
                </div>
              ) : (
                <span key={i} style={{ display: "block", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                  {line.text}
                  {"\n"}
                </span>
              )
            )}
            {state === "error" && errorMsg && (
              <span style={{ color: "#f87171", display: "block" }}>
                {"\n"}Error: {errorMsg}
              </span>
            )}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Auth banner — shown when OAuth is needed (not during active await_reply) */}
      {needsAuth && (
        <div style={authBanner}>
          <div style={authBannerIcon}>🔐</div>
          <div style={authBannerBody}>
            <p style={authBannerTitle}>Atlassian authorization required</p>
            <p style={authBannerDesc}>
              Complete the OAuth flow in your browser, then click <strong>Continue</strong>.
            </p>
            <div style={authBannerActions}>
              <a href={authUrl!} target="_blank" rel="noreferrer" style={authLinkBtn}>
                Open Authorization Page ↗
              </a>
              {onRetry && (
                <button style={continueBtn} onClick={onRetry}>
                  I've Authorized — Continue
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Reply input — shown when agent is waiting for user response */}
      {isAwaitingReply && (
        <div style={replyArea}>
          <div style={replyHeader}>
            <span style={replyHeaderText}>Your reply</span>
            <span style={replyHint}>Ctrl+Enter to send</span>
          </div>
          <textarea
            ref={replyRef}
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your response to the agent…"
            style={replyTextarea}
            rows={3}
            disabled={isSending}
          />
          <div style={{ ...replyFooter, justifyContent: isSending ? "space-between" : "flex-end" }}>
            {isSending && (
              <button style={cancelBtn} onClick={cancelReply}>
                Cancel
              </button>
            )}
            <button
              style={{
                ...sendBtn,
                ...(isSending || !replyText.trim() ? sendBtnDisabled : {}),
              }}
              onClick={() => void sendReply()}
              disabled={isSending || !replyText.trim()}
            >
              {isSending ? "Sending…" : "Send Reply"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const containerStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  background: "#0d1117",
  border: "1px solid #21262d",
  borderRadius: 12,
  overflow: "hidden",
  height: "100%",
  minHeight: 400,
};

const headerStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  background: "#161b22",
  borderBottom: "1px solid #21262d",
  padding: "10px 16px",
};

const headerTitle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  color: "#8b949e",
  fontFamily: "monospace",
};

const dot: React.CSSProperties = {
  width: 12,
  height: 12,
  borderRadius: "50%",
};

const outputArea: React.CSSProperties = {
  flex: 1,
  overflow: "auto",
  padding: "16px",
};

const pre: React.CSSProperties = {
  margin: 0,
  fontSize: 13,
  lineHeight: 1.6,
  color: "#c9d1d9",
  fontFamily: '"Cascadia Code", "Fira Code", "Consolas", monospace',
};

const userMessageRow: React.CSSProperties = {
  display: "flex",
  alignItems: "baseline",
  gap: 10,
  margin: "12px 0",
  padding: "10px 14px",
  background: "rgba(99,102,241,0.08)",
  borderLeft: "3px solid #6366f1",
  borderRadius: "0 6px 6px 0",
};

const userMessageLabel: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  color: "#818cf8",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  flexShrink: 0,
};

const userMessageText: React.CSSProperties = {
  color: "#c9d1d9",
  fontSize: 13,
  whiteSpace: "pre-wrap",
  wordBreak: "break-word",
};

const emptyState: React.CSSProperties = {
  color: "#484f58",
  fontSize: 14,
  textAlign: "center",
  marginTop: 80,
  lineHeight: 1.6,
};

const copyBtn: React.CSSProperties = {
  background: "#21262d",
  border: "1px solid #30363d",
  borderRadius: 6,
  color: "#8b949e",
  cursor: "pointer",
  fontSize: 12,
  padding: "4px 10px",
};

function badge(
  type: "streaming" | "done" | "error" | "connecting" | "auth" | "awaiting"
): React.CSSProperties {
  const colors: Record<string, { bg: string; color: string }> = {
    streaming: { bg: "rgba(56,189,248,0.1)", color: "#38bdf8" },
    done: { bg: "rgba(52,211,153,0.1)", color: "#34d399" },
    error: { bg: "rgba(248,113,113,0.1)", color: "#f87171" },
    connecting: { bg: "rgba(148,163,184,0.1)", color: "#94a3b8" },
    auth: { bg: "rgba(251,191,36,0.1)", color: "#fbbf24" },
    awaiting: { bg: "rgba(99,102,241,0.15)", color: "#818cf8" },
  };
  const c = colors[type] ?? colors.connecting;
  return {
    alignItems: "center",
    background: c.bg,
    borderRadius: 12,
    color: c.color,
    display: "inline-flex",
    fontSize: 12,
    fontWeight: 600,
    gap: 6,
    padding: "3px 10px",
  };
}

const spinnerDot: React.CSSProperties = {
  animation: "pulse 1.4s ease-in-out infinite",
  background: "currentColor",
  borderRadius: "50%",
  display: "inline-block",
  height: 7,
  width: 7,
};

// ─── Auth banner ──────────────────────────────────────────────────────────────

const authBanner: React.CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  gap: 14,
  background: "rgba(251,191,36,0.07)",
  borderTop: "1px solid rgba(251,191,36,0.2)",
  padding: "16px 18px",
};

const authBannerIcon: React.CSSProperties = {
  fontSize: 20,
  lineHeight: 1,
  paddingTop: 2,
  flexShrink: 0,
};

const authBannerBody: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
};

const authBannerTitle: React.CSSProperties = {
  color: "#fbbf24",
  fontSize: 13,
  fontWeight: 700,
  margin: 0,
};

const authBannerDesc: React.CSSProperties = {
  color: "#94a3b8",
  fontSize: 12,
  lineHeight: 1.5,
  margin: 0,
};

const authBannerActions: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  flexWrap: "wrap",
  gap: 10,
  marginTop: 4,
};

const authLinkBtn: React.CSSProperties = {
  background: "transparent",
  border: "1px solid rgba(251,191,36,0.4)",
  borderRadius: 6,
  color: "#fbbf24",
  cursor: "pointer",
  fontSize: 12,
  fontWeight: 600,
  padding: "6px 12px",
  textDecoration: "none",
};

const continueBtn: React.CSSProperties = {
  background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
  border: "none",
  borderRadius: 6,
  color: "#fff",
  cursor: "pointer",
  fontSize: 12,
  fontWeight: 700,
  padding: "6px 14px",
};

// ─── Reply input ──────────────────────────────────────────────────────────────

const replyArea: React.CSSProperties = {
  borderTop: "1px solid #21262d",
  background: "#0d1117",
  padding: "12px 16px",
  display: "flex",
  flexDirection: "column",
  gap: 8,
};

const replyHeader: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
};

const replyHeaderText: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 700,
  color: "#818cf8",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
};

const replyHint: React.CSSProperties = {
  fontSize: 11,
  color: "#484f58",
};

const replyTextarea: React.CSSProperties = {
  background: "#161b22",
  border: "1px solid #30363d",
  borderRadius: 8,
  color: "#e2e8f0",
  fontFamily: "inherit",
  fontSize: 13,
  lineHeight: 1.5,
  outline: "none",
  padding: "10px 12px",
  resize: "vertical",
  width: "100%",
  transition: "border-color 0.15s",
};

const replyFooter: React.CSSProperties = {
  display: "flex",
  justifyContent: "flex-end",
};

const sendBtn: React.CSSProperties = {
  background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
  border: "none",
  borderRadius: 7,
  color: "#fff",
  cursor: "pointer",
  fontSize: 13,
  fontWeight: 700,
  padding: "8px 20px",
  transition: "opacity 0.15s",
};

const sendBtnDisabled: React.CSSProperties = {
  background: "#21262d",
  color: "#484f58",
  cursor: "not-allowed",
};

const cancelBtn: React.CSSProperties = {
  background: "transparent",
  border: "1px solid #f87171",
  borderRadius: 7,
  color: "#f87171",
  cursor: "pointer",
  fontSize: 13,
  fontWeight: 600,
  padding: "8px 20px",
  transition: "opacity 0.15s",
};
