import { useState, useEffect, useCallback } from "react";
import StoryForm, { type FormValues } from "./components/StoryForm.tsx";
import OutputPanel from "./components/OutputPanel.tsx";

type AtlassianStatus = "loading" | "ok" | "needs-auth";

export default function App() {
  const [jobId, setJobId] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [lastValues, setLastValues] = useState<FormValues | null>(null);

  const [atlassianStatus, setAtlassianStatus] = useState<AtlassianStatus>("loading");
  const [isAuthorizing, setIsAuthorizing] = useState(false);

  const checkAtlassianStatus = useCallback(() => {
    fetch("/api/atlassian/status")
      .then((r) => r.json() as Promise<{ authenticated: boolean }>)
      .then((d) => setAtlassianStatus(d.authenticated ? "ok" : "needs-auth"))
      .catch(() => setAtlassianStatus("needs-auth"));
  }, []);

  useEffect(() => {
    checkAtlassianStatus();
    const handler = (event: MessageEvent<{ type?: string }>) => {
      if (event.data?.type === "atlassian-auth-success") {
        setIsAuthorizing(false);
        checkAtlassianStatus();
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [checkAtlassianStatus]);

  const handleAuthorize = async () => {
    setIsAuthorizing(true);
    try {
      const res = await fetch("/api/atlassian/auth-url");
      const data = await res.json() as { url?: string; error?: string };
      if (!data.url) throw new Error(data.error ?? "No auth URL returned");
      window.open(data.url, "atlassian-auth", "width=620,height=720,left=200,top=100");
    } catch (err) {
      setIsAuthorizing(false);
      console.error("Failed to start Atlassian auth:", err);
    }
  };

  const handleSubmit = async (values: FormValues) => {
    setSubmitError("");
    setIsRunning(true);
    setLastValues(values);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? `Server error ${res.status}`);
      }

      const data = (await res.json()) as { jobId: string };
      setJobId(data.jobId);
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : "Failed to start job.");
      setIsRunning(false);
    }
  };

  const handleDone = () => {
    setIsRunning(false);
  };

  const handleRetry = () => {
    if (lastValues) {
      void handleSubmit(lastValues);
    }
  };

  return (
    <div style={appShell}>
      {/* Header */}
      <header style={header}>
        <div style={logoArea}>
          <span style={logoIcon}>◆</span>
          <span style={logoText}>User Story Creator</span>
        </div>
        <span style={tagline}>Powered by Claude · Jira · Figma</span>
      </header>

      {/* Atlassian auth banner */}
      {atlassianStatus === "needs-auth" && (
        <div style={authBannerStyle}>
          <span style={authBannerIcon}>🔐</span>
          <span style={authBannerText}>
            Atlassian is not authorized — stories cannot be pushed to Jira until you connect.
          </span>
          <button
            style={{ ...authBannerBtn, ...(isAuthorizing ? authBannerBtnDisabled : {}) }}
            onClick={() => void handleAuthorize()}
            disabled={isAuthorizing}
          >
            {isAuthorizing ? "Opening…" : "Authorize with Atlassian"}
          </button>
        </div>
      )}
      {atlassianStatus === "ok" && (
        <div style={{ ...authBannerStyle, background: "rgba(52,211,153,0.06)", borderColor: "rgba(52,211,153,0.2)" }}>
          <span style={authBannerIcon}>✓</span>
          <span style={{ ...authBannerText, color: "#34d399" }}>Atlassian connected</span>
        </div>
      )}

      {/* Main layout */}
      <main style={main}>
        {/* Left panel — form */}
        <section style={formPanel}>
          <h2 style={sectionTitle}>Generate Stories</h2>
          <p style={sectionSubtitle}>
            Provide your EPIC link and any supporting context. The agent will analyse the
            EPIC, cross-reference Figma designs and docs, and produce structured, ready-to-dev
            user stories.
          </p>
          <StoryForm onSubmit={handleSubmit} isRunning={isRunning} />
          {submitError && <p style={errorMsg}>{submitError}</p>}
        </section>

        {/* Right panel — output */}
        <section style={outputPanel}>
          <h2 style={sectionTitle}>Live Output</h2>
          <OutputPanel jobId={jobId} onDone={handleDone} onRetry={handleRetry} />
        </section>
      </main>

      {/* Keyframe CSS injected inline */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.4; transform: scale(0.75); }
        }
        input:focus, textarea:focus {
          border-color: #6366f1 !important;
          box-shadow: 0 0 0 3px rgba(99,102,241,0.15);
        }
        button:hover:not(:disabled) {
          opacity: 0.85;
        }
      `}</style>
    </div>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const appShell: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  minHeight: "100vh",
};

const header: React.CSSProperties = {
  alignItems: "center",
  background: "#161b22",
  borderBottom: "1px solid #21262d",
  display: "flex",
  justifyContent: "space-between",
  padding: "14px 32px",
};

const logoArea: React.CSSProperties = {
  alignItems: "center",
  display: "flex",
  gap: 10,
};

const logoIcon: React.CSSProperties = {
  color: "#818cf8",
  fontSize: 20,
};

const logoText: React.CSSProperties = {
  color: "#e2e8f0",
  fontSize: 16,
  fontWeight: 700,
};

const tagline: React.CSSProperties = {
  color: "#484f58",
  fontSize: 12,
};

const main: React.CSSProperties = {
  display: "grid",
  flex: 1,
  gap: 32,
  gridTemplateColumns: "minmax(340px, 420px) 1fr",
  padding: "32px",
};

const formPanel: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 12,
};

const outputPanel: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 12,
  minHeight: 0,
};

const sectionTitle: React.CSSProperties = {
  color: "#e2e8f0",
  fontSize: 18,
  fontWeight: 700,
  margin: 0,
};

const sectionSubtitle: React.CSSProperties = {
  color: "#64748b",
  fontSize: 13,
  lineHeight: 1.6,
  margin: 0,
};

const errorMsg: React.CSSProperties = {
  color: "#f87171",
  fontSize: 13,
  marginTop: 8,
};

const authBannerStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  padding: "10px 32px",
  background: "rgba(251,191,36,0.07)",
  borderBottom: "1px solid rgba(251,191,36,0.2)",
};

const authBannerIcon: React.CSSProperties = {
  fontSize: 16,
  flexShrink: 0,
};

const authBannerText: React.CSSProperties = {
  fontSize: 13,
  color: "#94a3b8",
  flex: 1,
};

const authBannerBtn: React.CSSProperties = {
  background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
  border: "none",
  borderRadius: 6,
  color: "#fff",
  cursor: "pointer",
  fontSize: 13,
  fontWeight: 700,
  padding: "7px 16px",
  flexShrink: 0,
  transition: "opacity 0.15s",
};

const authBannerBtnDisabled: React.CSSProperties = {
  background: "#2d3348",
  color: "#475569",
  cursor: "not-allowed",
};
