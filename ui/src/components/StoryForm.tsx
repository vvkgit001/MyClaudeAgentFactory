import { useState } from "react";

export interface FormValues {
  epicLink: string;
  figmaUrl: string;
  confluenceUrls: string[];
  jiraProject: string;
  customInstructions: string;
}

interface Props {
  onSubmit: (values: FormValues) => void;
  isRunning: boolean;
}

const s: Record<string, React.CSSProperties> = {
  form: {
    display: "flex",
    flexDirection: "column",
    gap: 20,
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: 600,
    color: "#94a3b8",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  required: {
    color: "#f87171",
    marginLeft: 4,
  },
  input: {
    background: "#1e2130",
    border: "1px solid #2d3348",
    borderRadius: 8,
    color: "#e2e8f0",
    fontSize: 14,
    padding: "10px 12px",
    outline: "none",
    width: "100%",
    transition: "border-color 0.15s",
  },
  textarea: {
    background: "#1e2130",
    border: "1px solid #2d3348",
    borderRadius: 8,
    color: "#e2e8f0",
    fontSize: 14,
    padding: "10px 12px",
    outline: "none",
    width: "100%",
    resize: "vertical",
    minHeight: 80,
    fontFamily: "inherit",
    transition: "border-color 0.15s",
  },
  urlRow: {
    display: "flex",
    gap: 8,
    alignItems: "center",
  },
  removeBtn: {
    background: "transparent",
    border: "1px solid #3d4460",
    borderRadius: 6,
    color: "#94a3b8",
    cursor: "pointer",
    fontSize: 16,
    lineHeight: 1,
    padding: "6px 10px",
    flexShrink: 0,
  },
  addBtn: {
    background: "transparent",
    border: "1px dashed #3d4460",
    borderRadius: 6,
    color: "#64748b",
    cursor: "pointer",
    fontSize: 13,
    padding: "8px 12px",
    textAlign: "left",
    width: "100%",
    transition: "border-color 0.15s, color 0.15s",
  },
  hint: {
    fontSize: 12,
    color: "#475569",
    marginTop: 2,
  },
  submitBtn: {
    background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
    border: "none",
    borderRadius: 8,
    color: "#fff",
    cursor: "pointer",
    fontSize: 15,
    fontWeight: 600,
    padding: "12px 24px",
    transition: "opacity 0.15s",
    marginTop: 4,
  },
  submitBtnDisabled: {
    background: "#2d3348",
    color: "#475569",
    cursor: "not-allowed",
  },
  errorMsg: {
    color: "#f87171",
    fontSize: 13,
    marginTop: 4,
  },
};

export default function StoryForm({ onSubmit, isRunning }: Props) {
  const [epicLink, setEpicLink] = useState("");
  const [figmaUrl, setFigmaUrl] = useState("");
  const [confluenceUrls, setConfluenceUrls] = useState<string[]>([""]);
  const [jiraProject, setJiraProject] = useState("");
  const [customInstructions, setCustomInstructions] = useState("");
  const [epicError, setEpicError] = useState("");

  const handleConfluenceChange = (index: number, value: string) => {
    setConfluenceUrls((prev) => prev.map((u, i) => (i === index ? value : u)));
  };

  const addConfluenceUrl = () => setConfluenceUrls((prev) => [...prev, ""]);

  const removeConfluenceUrl = (index: number) => {
    setConfluenceUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const validate = (): boolean => {
    if (!epicLink.trim()) {
      setEpicError("EPIC link is required.");
      return false;
    }
    try {
      new URL(epicLink.trim());
    } catch {
      setEpicError("Please enter a valid URL.");
      return false;
    }
    setEpicError("");
    return true;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    onSubmit({
      epicLink: epicLink.trim(),
      figmaUrl: figmaUrl.trim(),
      confluenceUrls: confluenceUrls.filter((u) => u.trim()),
      jiraProject: jiraProject.trim(),
      customInstructions: customInstructions.trim(),
    });
  };

  const focusStyle = {
    borderColor: "#6366f1",
  };

  return (
    <form onSubmit={handleSubmit} style={s.form} noValidate>
      {/* EPIC Link */}
      <div style={s.field}>
        <label style={s.label}>
          EPIC Link <span style={s.required}>*</span>
        </label>
        <input
          type="url"
          placeholder="https://yourcompany.atlassian.net/browse/EPIC-123"
          value={epicLink}
          onChange={(e) => {
            setEpicLink(e.target.value);
            if (epicError) setEpicError("");
          }}
          style={{
            ...s.input,
            ...(epicError ? { borderColor: "#f87171" } : {}),
          }}
          onFocus={(e) => Object.assign(e.currentTarget.style, focusStyle)}
          onBlur={(e) => Object.assign(e.currentTarget.style, { borderColor: epicError ? "#f87171" : "#2d3348" })}
          disabled={isRunning}
        />
        {epicError && <span style={s.errorMsg}>{epicError}</span>}
      </div>

      {/* Figma URL */}
      <div style={s.field}>
        <label style={s.label}>Figma URL</label>
        <input
          type="url"
          placeholder="https://figma.com/file/..."
          value={figmaUrl}
          onChange={(e) => setFigmaUrl(e.target.value)}
          style={s.input}
          onFocus={(e) => Object.assign(e.currentTarget.style, focusStyle)}
          onBlur={(e) => Object.assign(e.currentTarget.style, { borderColor: "#2d3348" })}
          disabled={isRunning}
        />
      </div>

      {/* Confluence / Doc URLs */}
      <div style={s.field}>
        <label style={s.label}>Confluence / Doc URLs</label>
        <p style={s.hint}>BRD, PRD, architecture docs, meeting notes, etc.</p>
        {confluenceUrls.map((url, i) => (
          <div key={i} style={s.urlRow}>
            <input
              type="url"
              placeholder="https://yourcompany.atlassian.net/wiki/..."
              value={url}
              onChange={(e) => handleConfluenceChange(i, e.target.value)}
              style={s.input}
              onFocus={(e) => Object.assign(e.currentTarget.style, focusStyle)}
              onBlur={(e) => Object.assign(e.currentTarget.style, { borderColor: "#2d3348" })}
              disabled={isRunning}
            />
            {confluenceUrls.length > 1 && (
              <button
                type="button"
                style={s.removeBtn}
                onClick={() => removeConfluenceUrl(i)}
                disabled={isRunning}
                title="Remove"
              >
                ×
              </button>
            )}
          </div>
        ))}
        <button
          type="button"
          style={s.addBtn}
          onClick={addConfluenceUrl}
          disabled={isRunning}
        >
          + Add another URL
        </button>
      </div>

      {/* Target Jira Project */}
      <div style={s.field}>
        <label style={s.label}>Target Jira Project</label>
        <p style={s.hint}>Skips the project selection step.</p>
        <select
          value={jiraProject}
          onChange={(e) => setJiraProject(e.target.value)}
          style={s.input}
          onFocus={(e) => Object.assign(e.currentTarget.style, focusStyle)}
          onBlur={(e) => Object.assign(e.currentTarget.style, { borderColor: "#2d3348" })}
          disabled={isRunning}
        >
          <option value="">— Select a project —</option>
          <option value="WAT">WAT</option>
          <option value="HIM">HIM</option>
        </select>
      </div>

      {/* Custom Instructions */}
      <div style={s.field}>
        <label style={s.label}>Custom Instructions</label>
        <p style={s.hint}>Additional guidance for the agent (e.g. "focus on mobile", "max 5 stories").</p>
        <textarea
          placeholder="Any specific instructions or constraints..."
          value={customInstructions}
          onChange={(e) => setCustomInstructions(e.target.value)}
          style={s.textarea}
          onFocus={(e) => Object.assign(e.currentTarget.style, focusStyle)}
          onBlur={(e) => Object.assign(e.currentTarget.style, { borderColor: "#2d3348" })}
          disabled={isRunning}
        />
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={isRunning}
        style={{
          ...s.submitBtn,
          ...(isRunning ? s.submitBtnDisabled : {}),
        }}
      >
        {isRunning ? "Generating…" : "Generate Stories"}
      </button>
    </form>
  );
}
