import { useState, useEffect } from "react";

export interface FormValues {
  mode: "epic" | "single";
  // Epic mode
  epicLink: string;
  // Single Story mode
  storyBrief: string;
  epicParent: string;
  additionalNotes: string;
  // Shared
  figmaUrl: string;
  confluenceUrls: string[];
  customInstructions: string;
  targetProject: string;
}

interface JiraProject {
  key: string;
  name: string;
}

interface Props {
  onSubmit: (values: FormValues) => void;
  isRunning: boolean;
  mode: "epic" | "single";
}

function parseProjectKey(epicLink: string): string {
  const fromUrl = epicLink.match(/\/browse\/([A-Z][A-Z0-9_-]*)-\d+/i);
  if (fromUrl) return fromUrl[1].toUpperCase();
  const bare = epicLink.trim().match(/^([A-Z][A-Z0-9_-]*)-\d+$/i);
  if (bare) return bare[1].toUpperCase();
  return "";
}

const s: Record<string, React.CSSProperties> = {
  form: { display: "flex", flexDirection: "column", gap: 20 },
  field: { display: "flex", flexDirection: "column", gap: 6 },
  label: {
    fontSize: 13,
    fontWeight: 600,
    color: "#94a3b8",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  required: { color: "#f87171", marginLeft: 4 },
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
  briefTextarea: {
    background: "#1e2130",
    border: "1px solid #2d3348",
    borderRadius: 8,
    color: "#e2e8f0",
    fontSize: 14,
    padding: "10px 12px",
    outline: "none",
    width: "100%",
    resize: "vertical",
    minHeight: 120,
    fontFamily: "inherit",
    transition: "border-color 0.15s",
  },
  urlRow: { display: "flex", gap: 8, alignItems: "center" },
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
  hint: { fontSize: 12, color: "#475569", marginTop: 2 },
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
  errorMsg: { color: "#f87171", fontSize: 13, marginTop: 4 },
  // Project-specific styles
  projectBadge: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    background: "#1e2130",
    border: "1px solid #2d3348",
    borderRadius: 8,
    padding: "9px 12px",
    fontSize: 14,
  },
  projectKey: {
    fontWeight: 700,
    color: "#818cf8",
    fontFamily: "monospace",
    fontSize: 14,
  },
  projectName: {
    color: "#94a3b8",
    fontSize: 13,
    flex: 1,
  },
  overrideBtn: {
    background: "transparent",
    border: "none",
    color: "#6366f1",
    cursor: "pointer",
    fontSize: 12,
    padding: 0,
    flexShrink: 0,
    textDecoration: "underline",
  },
  select: {
    background: "#1e2130",
    border: "1px solid #2d3348",
    borderRadius: 8,
    color: "#e2e8f0",
    fontSize: 14,
    padding: "10px 12px",
    outline: "none",
    width: "100%",
    cursor: "pointer",
    appearance: "none" as const,
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath fill='%2364748b' d='M6 8L0 0h12z'/%3E%3C/svg%3E")`,
    backgroundRepeat: "no-repeat",
    backgroundPosition: "right 12px center",
    paddingRight: 36,
  },
  selectDisabled: {
    opacity: 0.5,
    cursor: "not-allowed",
  },
  loadingText: { fontSize: 13, color: "#64748b", fontStyle: "italic" },
};

const focusStyle = { borderColor: "#6366f1" };
const blurStyle = { borderColor: "#2d3348" };
const errorBorderStyle = { borderColor: "#f87171" };

export default function StoryForm({ onSubmit, isRunning, mode }: Props) {
  // Epic mode fields
  const [epicLink, setEpicLink] = useState("");
  const [epicError, setEpicError] = useState("");

  // Single Story mode fields
  const [storyBrief, setStoryBrief] = useState("");
  const [briefError, setBriefError] = useState("");
  const [epicParent, setEpicParent] = useState("");
  const [additionalNotes, setAdditionalNotes] = useState("");

  // Shared fields
  const [figmaUrl, setFigmaUrl] = useState("");
  const [confluenceUrls, setConfluenceUrls] = useState<string[]>([""]);
  const [customInstructions, setCustomInstructions] = useState("");

  // Project selection
  const [projects, setProjects] = useState<JiraProject[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [projectsError, setProjectsError] = useState("");
  const [targetProject, setTargetProject] = useState("");
  const [projectOverride, setProjectOverride] = useState(false); // epic mode only
  const [projectError, setProjectError] = useState("");

  // Derived: auto-detected project from epic link
  const autoProject = parseProjectKey(epicLink);

  // Fetch project list when entering single mode, or when override is toggled on
  const fetchProjects = async () => {
    if (projects.length > 0 || projectsLoading) return;
    setProjectsLoading(true);
    setProjectsError("");
    try {
      const r = await fetch("/api/jira/projects");
      let d: { projects?: JiraProject[]; error?: string };
      try {
        d = await r.json() as { projects?: JiraProject[]; error?: string };
      } catch {
        throw new Error(
          r.status === 401
            ? "Not authenticated with Atlassian — please connect first."
            : "Server returned an unexpected response. Restart the server (npm run dev:full) and try again."
        );
      }
      if (!r.ok) throw new Error(d.error ?? `Server error ${r.status}`);
      if (d.error) throw new Error(d.error);
      setProjects(d.projects ?? []);
    } catch (err) {
      setProjectsError(err instanceof Error ? err.message : "Failed to load projects");
    } finally {
      setProjectsLoading(false);
    }
  };

  // Auto-fetch when switching to single mode
  useEffect(() => {
    if (mode === "single") fetchProjects();
    // Reset override state when switching modes
    setProjectOverride(false);
    setTargetProject("");
    setProjectError("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  // Auto-select project from epicParent in single mode
  useEffect(() => {
    if (mode !== "single") return;
    const key = parseProjectKey(epicParent);
    if (key && projects.some((p) => p.key === key)) {
      setTargetProject(key);
    }
  }, [epicParent, projects, mode]);

  const handleConfluenceChange = (index: number, value: string) =>
    setConfluenceUrls((prev) => prev.map((u, i) => (i === index ? value : u)));
  const addConfluenceUrl = () => setConfluenceUrls((prev) => [...prev, ""]);
  const removeConfluenceUrl = (index: number) =>
    setConfluenceUrls((prev) => prev.filter((_, i) => i !== index));

  const handleToggleOverride = () => {
    const next = !projectOverride;
    setProjectOverride(next);
    if (next) {
      fetchProjects();
      // Pre-select auto-detected project in the dropdown
      if (!targetProject && autoProject) setTargetProject(autoProject);
    }
  };

  const validate = (): boolean => {
    if (mode === "epic") {
      if (!epicLink.trim()) { setEpicError("EPIC link is required."); return false; }
      try { new URL(epicLink.trim()); } catch { setEpicError("Please enter a valid URL."); return false; }
      setEpicError("");
    } else {
      if (!storyBrief.trim()) { setBriefError("Story brief is required."); return false; }
      setBriefError("");
      if (projects.length > 0 && !targetProject) {
        setProjectError("Please select a target project.");
        return false;
      }
      setProjectError("");
    }
    return true;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const effectiveProject =
      mode === "single"
        ? targetProject
        : projectOverride
          ? targetProject
          : autoProject;

    onSubmit({
      mode,
      epicLink: epicLink.trim(),
      storyBrief: storyBrief.trim(),
      epicParent: epicParent.trim(),
      additionalNotes: additionalNotes.trim(),
      figmaUrl: figmaUrl.trim(),
      confluenceUrls: confluenceUrls.filter((u) => u.trim()),
      customInstructions: customInstructions.trim(),
      targetProject: effectiveProject,
    });
  };

  const projectForLabel = (key: string) => {
    const found = projects.find((p) => p.key === key);
    return found ? `${found.key} — ${found.name}` : key;
  };

  return (
    <form onSubmit={handleSubmit} style={s.form} noValidate>

      {/* ── EPIC STORIES MODE ───────────────────────────── */}
      {mode === "epic" && (
        <>
          <div style={s.field}>
            <label style={s.label}>
              EPIC Link <span style={s.required}>*</span>
            </label>
            <input
              type="url"
              placeholder="https://yourcompany.atlassian.net/browse/EPIC-123"
              value={epicLink}
              onChange={(e) => { setEpicLink(e.target.value); if (epicError) setEpicError(""); }}
              style={{ ...s.input, ...(epicError ? errorBorderStyle : {}) }}
              onFocus={(e) => Object.assign(e.currentTarget.style, focusStyle)}
              onBlur={(e) => Object.assign(e.currentTarget.style, epicError ? errorBorderStyle : blurStyle)}
              disabled={isRunning}
            />
            {epicError && <span style={s.errorMsg}>{epicError}</span>}
          </div>

          {/* Auto-detected project */}
          <div style={s.field}>
            <label style={s.label}>Target Jira Project</label>
            {!projectOverride ? (
              <div style={s.projectBadge}>
                {autoProject ? (
                  <>
                    <span style={s.projectKey}>{autoProject}</span>
                    <span style={s.projectName}>auto-detected from EPIC</span>
                    <button
                      type="button"
                      style={s.overrideBtn}
                      onClick={handleToggleOverride}
                      disabled={isRunning}
                    >
                      Override ▾
                    </button>
                  </>
                ) : (
                  <>
                    <span style={{ ...s.projectName, fontStyle: "italic" }}>
                      Detected automatically when you enter the EPIC link
                    </span>
                    <button
                      type="button"
                      style={s.overrideBtn}
                      onClick={handleToggleOverride}
                      disabled={isRunning}
                    >
                      Choose manually ▾
                    </button>
                  </>
                )}
              </div>
            ) : (
              <>
                {projectsLoading && <span style={s.loadingText}>Loading projects…</span>}
                {projectsError && <span style={s.errorMsg}>{projectsError}</span>}
                {!projectsLoading && !projectsError && (
                  <select
                    value={targetProject}
                    onChange={(e) => setTargetProject(e.target.value)}
                    style={s.select}
                    disabled={isRunning}
                    onFocus={(e) => Object.assign(e.currentTarget.style, focusStyle)}
                    onBlur={(e) => Object.assign(e.currentTarget.style, blurStyle)}
                  >
                    {autoProject && (
                      <option value={autoProject}>
                        {projectForLabel(autoProject)} (from EPIC)
                      </option>
                    )}
                    {projects
                      .filter((p) => p.key !== autoProject)
                      .map((p) => (
                        <option key={p.key} value={p.key}>
                          {p.key} — {p.name}
                        </option>
                      ))}
                  </select>
                )}
                <button
                  type="button"
                  style={{ ...s.overrideBtn, fontSize: 12, marginTop: 2, alignSelf: "flex-start" }}
                  onClick={handleToggleOverride}
                  disabled={isRunning}
                >
                  ← Use auto-detected{autoProject ? ` (${autoProject})` : ""}
                </button>
              </>
            )}
          </div>
        </>
      )}

      {/* ── SINGLE STORY MODE ───────────────────────────── */}
      {mode === "single" && (
        <>
          <div style={s.field}>
            <label style={s.label}>
              Story Brief <span style={s.required}>*</span>
            </label>
            <p style={s.hint}>
              Who needs this? What do they want? Why does it matter?
            </p>
            <textarea
              placeholder={
                "Example:\n" +
                "A procurement manager needs to export approved purchase orders as a PDF so they can share them with external vendors without giving Jira access."
              }
              value={storyBrief}
              onChange={(e) => { setStoryBrief(e.target.value); if (briefError) setBriefError(""); }}
              style={{ ...s.briefTextarea, ...(briefError ? errorBorderStyle : {}) }}
              onFocus={(e) => Object.assign(e.currentTarget.style, focusStyle)}
              onBlur={(e) => Object.assign(e.currentTarget.style, briefError ? errorBorderStyle : blurStyle)}
              disabled={isRunning}
            />
            {briefError && <span style={s.errorMsg}>{briefError}</span>}
          </div>

          {/* Target Project — required for single mode */}
          <div style={s.field}>
            <label style={s.label}>
              Target Jira Project <span style={s.required}>*</span>
            </label>
            <p style={s.hint}>Select the Jira project where this story will be created.</p>
            {projectsLoading && <span style={s.loadingText}>Loading projects…</span>}
            {projectsError && <span style={s.errorMsg}>{projectsError} — check your Atlassian connection.</span>}
            {!projectsLoading && !projectsError && (
              <select
                value={targetProject}
                onChange={(e) => { setTargetProject(e.target.value); if (projectError) setProjectError(""); }}
                style={{
                  ...s.select,
                  ...(projectError ? errorBorderStyle : {}),
                  ...(isRunning ? s.selectDisabled : {}),
                }}
                disabled={isRunning}
                onFocus={(e) => Object.assign(e.currentTarget.style, focusStyle)}
                onBlur={(e) => Object.assign(e.currentTarget.style, projectError ? errorBorderStyle : blurStyle)}
              >
                <option value="" disabled>Select a project…</option>
                {projects.map((p) => (
                  <option key={p.key} value={p.key}>
                    {p.key} — {p.name}
                  </option>
                ))}
              </select>
            )}
            {projectError && <span style={s.errorMsg}>{projectError}</span>}
          </div>

          <div style={s.field}>
            <label style={s.label}>Optional EPIC Parent</label>
            <p style={s.hint}>
              Jira EPIC key to link this story to (e.g. SCRUM-42). Leave blank for a standalone story.
            </p>
            <input
              type="text"
              placeholder="SCRUM-42  or  https://…/browse/SCRUM-42"
              value={epicParent}
              onChange={(e) => setEpicParent(e.target.value)}
              style={s.input}
              onFocus={(e) => Object.assign(e.currentTarget.style, focusStyle)}
              onBlur={(e) => Object.assign(e.currentTarget.style, blurStyle)}
              disabled={isRunning}
            />
          </div>
        </>
      )}

      {/* ── SHARED: Figma URL ───────────────────────────── */}
      <div style={s.field}>
        <label style={s.label}>Figma URL</label>
        <input
          type="url"
          placeholder="https://figma.com/file/..."
          value={figmaUrl}
          onChange={(e) => setFigmaUrl(e.target.value)}
          style={s.input}
          onFocus={(e) => Object.assign(e.currentTarget.style, focusStyle)}
          onBlur={(e) => Object.assign(e.currentTarget.style, blurStyle)}
          disabled={isRunning}
        />
      </div>

      {/* ── SHARED: Confluence / Doc URLs ──────────────── */}
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
              onBlur={(e) => Object.assign(e.currentTarget.style, blurStyle)}
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
        <button type="button" style={s.addBtn} onClick={addConfluenceUrl} disabled={isRunning}>
          + Add another URL
        </button>
      </div>

      {/* ── SINGLE STORY: Additional Notes ─────────────── */}
      {mode === "single" && (
        <div style={s.field}>
          <label style={s.label}>Additional Notes</label>
          <p style={s.hint}>
            Paste requirements, meeting outputs, user research findings, or any other raw text.
          </p>
          <textarea
            placeholder="Paste any relevant notes here…"
            value={additionalNotes}
            onChange={(e) => setAdditionalNotes(e.target.value)}
            style={s.textarea}
            onFocus={(e) => Object.assign(e.currentTarget.style, focusStyle)}
            onBlur={(e) => Object.assign(e.currentTarget.style, blurStyle)}
            disabled={isRunning}
          />
        </div>
      )}

      {/* ── SHARED: Custom Instructions ─────────────────── */}
      <div style={s.field}>
        <label style={s.label}>Custom Instructions</label>
        <p style={s.hint}>
          {mode === "epic"
            ? "Additional guidance (e.g. 'focus on mobile', 'max 5 stories')."
            : "Additional guidance (e.g. 'focus on error states', 'use Persona X')."}
        </p>
        <textarea
          placeholder="Any specific instructions or constraints…"
          value={customInstructions}
          onChange={(e) => setCustomInstructions(e.target.value)}
          style={s.textarea}
          onFocus={(e) => Object.assign(e.currentTarget.style, focusStyle)}
          onBlur={(e) => Object.assign(e.currentTarget.style, blurStyle)}
          disabled={isRunning}
        />
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={isRunning}
        style={{ ...s.submitBtn, ...(isRunning ? s.submitBtnDisabled : {}) }}
      >
        {isRunning
          ? mode === "epic" ? "Generating…" : "Creating…"
          : mode === "epic" ? "Generate Stories" : "Create Story"}
      </button>
    </form>
  );
}
