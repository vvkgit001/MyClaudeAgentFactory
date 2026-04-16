import { useState } from "react";
import StoryForm, { type FormValues } from "./components/StoryForm.tsx";
import OutputPanel from "./components/OutputPanel.tsx";

export default function App() {
  const [jobId, setJobId] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [lastValues, setLastValues] = useState<FormValues | null>(null);

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
