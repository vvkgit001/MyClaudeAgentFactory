import PptxGenJS from 'pptxgenjs';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const NAVY      = '000048';
const BLUE      = '2E308E';
const BRIGHT_BLUE = '2F78C4';
const TEAL      = '06C7CC';
const LIGHT_BLUE = '92BBE6';
const WHITE     = 'FFFFFF';
const DARK_GREY = '222222';
const MID_GREY  = '666666';
const FOOTER_GREY = 'AAAAAA';

const pptx = new PptxGenJS();
pptx.layout = 'LAYOUT_WIDE'; // 13.33" x 7.5"
pptx.author  = 'PO Copilot';
pptx.subject = 'AI-Powered User Story Creator';
pptx.title   = 'PO Copilot Presentation';

const W = 13.33;
const H = 7.5;

function addHeader(slide, title) {
  slide.addShape('rect', { x: 0, y: 0, w: W, h: 1.15, fill: { color: NAVY } });
  slide.addShape('rect', { x: 0, y: 1.15, w: W, h: 0.07, fill: { color: TEAL } });
  slide.addText(title, {
    x: 0.5, y: 0.22, w: W - 1, h: 0.72,
    fontSize: 28, bold: true, color: WHITE, fontFace: 'Calibri Light', valign: 'middle'
  });
}

function addFooter(slide) {
  slide.addShape('rect', { x: 0, y: H - 0.35, w: W, h: 0.35, fill: { color: NAVY } });
  slide.addText('PO Copilot  ·  Powered by Claude · Jira · Figma · Confluence', {
    x: 0.4, y: H - 0.3, w: W - 0.8, h: 0.25,
    fontSize: 8, color: LIGHT_BLUE, fontFace: 'Calibri', align: 'center'
  });
}

// ─────────────────────────────────────────────────────────────────
// SLIDE 1  —  Title
// ─────────────────────────────────────────────────────────────────
{
  const s = pptx.addSlide();

  // Full background
  s.addShape('rect', { x: 0, y: 0, w: W, h: H, fill: { color: NAVY } });

  // Left accent stripe
  s.addShape('rect', { x: 0, y: 0, w: 0.18, h: H, fill: { color: TEAL } });

  // Bottom accent line
  s.addShape('rect', { x: 0, y: H - 0.12, w: W, h: 0.12, fill: { color: TEAL } });

  // Diamond logo mark
  s.addText('◆', {
    x: 0.4, y: 0.55, w: 0.7, h: 0.7,
    fontSize: 28, color: TEAL, fontFace: 'Calibri', bold: true
  });
  s.addText('PO Copilot', {
    x: 1.05, y: 0.6, w: 5, h: 0.6,
    fontSize: 16, color: WHITE, fontFace: 'Calibri Light'
  });

  // Main title
  s.addText('AI-Powered\nUser Story Creator', {
    x: 0.55, y: 1.7, w: 11, h: 2.5,
    fontSize: 52, bold: true, color: WHITE, fontFace: 'Calibri Light',
    lineSpacingMultiple: 1.1
  });

  // Teal divider
  s.addShape('rect', { x: 0.55, y: 4.35, w: 3.5, h: 0.06, fill: { color: TEAL } });

  // Tagline
  s.addText('From EPIC to Developer-Ready Stories in Minutes', {
    x: 0.55, y: 4.55, w: 11, h: 0.6,
    fontSize: 20, color: LIGHT_BLUE, fontFace: 'Calibri Light'
  });

  // Integration badges
  const badges = ['Claude AI', 'Jira', 'Figma', 'Confluence'];
  badges.forEach((b, i) => {
    const bx = 0.55 + i * 2.3;
    s.addShape('rect', { x: bx, y: 5.4, w: 2.0, h: 0.45, fill: { color: BLUE }, line: { color: TEAL, pt: 1 } });
    s.addText(b, { x: bx, y: 5.4, w: 2.0, h: 0.45, fontSize: 11, bold: true, color: WHITE, align: 'center', fontFace: 'Calibri', valign: 'middle' });
  });

  // Date
  s.addText('April 2026', {
    x: 0.55, y: 6.5, w: 5, h: 0.4,
    fontSize: 12, color: MID_GREY, fontFace: 'Calibri'
  });
}

// ─────────────────────────────────────────────────────────────────
// SLIDE 2  —  What is PO Copilot?
// ─────────────────────────────────────────────────────────────────
{
  const s = pptx.addSlide();
  s.addShape('rect', { x: 0, y: 0, w: W, h: H, fill: { color: WHITE } });
  addHeader(s, 'What is PO Copilot?');
  addFooter(s);

  // Description
  s.addText(
    'PO Copilot is an AI agent that converts rough requirements into developer-ready Agile User Stories — ' +
    'fully structured, estimation-ready, and pushed directly to Jira.',
    {
      x: 0.5, y: 1.35, w: W - 1, h: 0.72,
      fontSize: 14, color: DARK_GREY, fontFace: 'Calibri', italic: true
    }
  );

  // Integration blocks
  const integrations = [
    { label: 'Claude AI',   sub: 'Story generation & AI reasoning',  color: NAVY },
    { label: 'Jira',        sub: 'EPIC analysis & story publishing',  color: BLUE },
    { label: 'Figma',       sub: 'UI design cross-referencing',       color: BRIGHT_BLUE },
    { label: 'Confluence',  sub: 'BRD / PRD / doc ingestion',         color: TEAL },
  ];
  integrations.forEach(({ label, sub, color }, i) => {
    const bx = 0.5 + i * 3.08;
    s.addShape('rect', { x: bx, y: 2.2, w: 2.8, h: 1.25, fill: { color }, line: { color, pt: 0 } });
    s.addText(label, { x: bx, y: 2.28, w: 2.8, h: 0.48, fontSize: 15, bold: true, color: WHITE, align: 'center', fontFace: 'Calibri', valign: 'middle' });
    s.addText(sub,   { x: bx, y: 2.76, w: 2.8, h: 0.6,  fontSize: 10, color: 'DDDDDD', align: 'center', fontFace: 'Calibri', wrap: true });
  });

  // Workflow
  s.addText('How it works', {
    x: 0.5, y: 3.65, w: 5, h: 0.4,
    fontSize: 14, bold: true, color: NAVY, fontFace: 'Calibri'
  });
  const steps = ['Input\n(EPIC / Brief)', 'AI Analysis\n(Jira + Figma + Docs)', 'DoR Gate\n(Quality Check)', 'PO Review\n& Approval', 'Jira Push\n(Auto-filed)'];
  steps.forEach((step, i) => {
    const bx = 0.5 + i * 2.5;
    const bcolor = [NAVY, BLUE, BRIGHT_BLUE, TEAL, '05A0A5'][i];
    s.addShape('rect', { x: bx, y: 4.12, w: 2.2, h: 1.0, fill: { color: bcolor } });
    s.addText(step, { x: bx, y: 4.12, w: 2.2, h: 1.0, fontSize: 11, bold: true, color: WHITE, align: 'center', fontFace: 'Calibri', valign: 'middle' });
    if (i < steps.length - 1) {
      s.addText('▶', { x: bx + 2.2, y: 4.37, w: 0.3, h: 0.5, fontSize: 14, color: TEAL, align: 'center', fontFace: 'Calibri' });
    }
  });

  // Two modes
  s.addText('Two Modes of Operation', {
    x: 0.5, y: 5.35, w: 6, h: 0.4,
    fontSize: 14, bold: true, color: NAVY, fontFace: 'Calibri'
  });

  // Epic mode card
  s.addShape('rect', { x: 0.5, y: 5.82, w: 5.9, h: 1.2, fill: { color: 'EEF2FF' }, line: { color: BLUE, pt: 1 } });
  s.addText('📋  Epic Stories Mode', { x: 0.65, y: 5.88, w: 5.6, h: 0.4, fontSize: 12, bold: true, color: NAVY, fontFace: 'Calibri' });
  s.addText('Provide a Jira EPIC → agent generates a full sprint backlog with story points', {
    x: 0.65, y: 6.28, w: 5.6, h: 0.6, fontSize: 11, color: DARK_GREY, fontFace: 'Calibri', wrap: true
  });

  // Single story card
  s.addShape('rect', { x: 6.93, y: 5.82, w: 5.9, h: 1.2, fill: { color: 'EDFFFE' }, line: { color: TEAL, pt: 1 } });
  s.addText('✏️  Single Story Mode', { x: 7.08, y: 5.88, w: 5.6, h: 0.4, fontSize: 12, bold: true, color: NAVY, fontFace: 'Calibri' });
  s.addText('Describe a story in plain language → agent clarifies, generates, and pushes one DoR-ready story', {
    x: 7.08, y: 6.28, w: 5.6, h: 0.6, fontSize: 11, color: DARK_GREY, fontFace: 'Calibri', wrap: true
  });
}

// ─────────────────────────────────────────────────────────────────
// SLIDE 3  —  Epic Stories Mode
// ─────────────────────────────────────────────────────────────────
{
  const s = pptx.addSlide();
  s.addShape('rect', { x: 0, y: 0, w: W, h: H, fill: { color: WHITE } });
  addHeader(s, '📋  Epic Stories Mode — Generating a Full Sprint Backlog');
  addFooter(s);

  // Screenshot (left)
  s.addImage({ path: resolve(__dirname, 'slide_home.png'), x: 0.35, y: 1.35, w: 6.3, h: 4.85 });

  // Right-side content
  const rx = 7.0;
  const rw = 5.9;

  s.addText('What you provide:', { x: rx, y: 1.38, w: rw, h: 0.38, fontSize: 13, bold: true, color: NAVY, fontFace: 'Calibri' });
  const inputs = [
    'Jira EPIC link (required)',
    'Figma design URL (optional)',
    'Confluence / BRD / PRD URLs (optional)',
    'Custom instructions, e.g. "focus on mobile"',
  ];
  inputs.forEach((line, i) => {
    s.addText(`• ${line}`, { x: rx + 0.1, y: 1.82 + i * 0.35, w: rw - 0.1, h: 0.33, fontSize: 11, color: DARK_GREY, fontFace: 'Calibri' });
  });

  s.addShape('rect', { x: rx, y: 3.26, w: rw, h: 0.04, fill: { color: LIGHT_BLUE } });

  s.addText('What the agent does:', { x: rx, y: 3.38, w: rw, h: 0.38, fontSize: 13, bold: true, color: NAVY, fontFace: 'Calibri' });
  const steps = [
    'Selects target sprint → reads EPIC & all linked docs',
    'Reviews existing stories to avoid duplication',
    'Generates story outline → writes full stories',
    'Runs Definition of Ready (DoR) gate check',
    'PO reviews: approve all [AA], individual [A] or reject [R]',
    'Approved stories pushed to Jira with story points',
  ];
  steps.forEach((line, i) => {
    s.addText(`${i + 1}.  ${line}`, { x: rx + 0.1, y: 3.82 + i * 0.37, w: rw - 0.1, h: 0.35, fontSize: 11, color: DARK_GREY, fontFace: 'Calibri' });
  });

  s.addShape('rect', { x: rx, y: 6.0, w: rw, h: 0.6, fill: { color: 'EEF2FF' }, line: { color: BLUE, pt: 1 } });
  s.addText('📊  Story points estimated via 4-factor Fibonacci rubric: effort × complexity × risk × AC count', {
    x: rx + 0.1, y: 6.02, w: rw - 0.2, h: 0.56, fontSize: 10, color: BLUE, fontFace: 'Calibri', wrap: true, valign: 'middle'
  });
}

// ─────────────────────────────────────────────────────────────────
// SLIDE 4  —  Single Story Mode
// ─────────────────────────────────────────────────────────────────
{
  const s = pptx.addSlide();
  s.addShape('rect', { x: 0, y: 0, w: W, h: H, fill: { color: WHITE } });
  addHeader(s, '✏️  Single Story Mode — One Story from Plain Language');
  addFooter(s);

  // Screenshot (left)
  s.addImage({ path: resolve(__dirname, 'slide_single_story.png'), x: 0.35, y: 1.35, w: 6.3, h: 4.85 });

  // Right-side content
  const rx = 7.0;
  const rw = 5.9;

  s.addText('What you provide:', { x: rx, y: 1.38, w: rw, h: 0.38, fontSize: 13, bold: true, color: NAVY, fontFace: 'Calibri' });
  const inputs = [
    'Story brief in plain language (required)',
    'Optional parent EPIC key or URL',
    'Figma URL, Confluence / BRD / PRD docs',
    'Any raw notes or meeting outputs',
  ];
  inputs.forEach((line, i) => {
    s.addText(`• ${line}`, { x: rx + 0.1, y: 1.82 + i * 0.35, w: rw - 0.1, h: 0.33, fontSize: 11, color: DARK_GREY, fontFace: 'Calibri' });
  });

  s.addShape('rect', { x: rx, y: 3.26, w: rw, h: 0.04, fill: { color: LIGHT_BLUE } });

  s.addText('What the agent does:', { x: rx, y: 3.38, w: rw, h: 0.38, fontSize: 13, bold: true, color: NAVY, fontFace: 'Calibri' });
  const steps = [
    'Asks 2–3 targeted clarifying questions',
    '  (skipped when brief + Figma + BRD all provided)',
    'Writes a structured User Story (As a… I want… So that…)',
    'Generates full Acceptance Criteria in Gherkin format',
    'Estimates story points with inline rationale',
    'PO approves → story pushed directly to Jira',
  ];
  steps.forEach((line, i) => {
    const isNote = line.startsWith('  (');
    s.addText(isNote ? line.trim() : `${i < 2 ? i + 1 : i}.  ${line}`, {
      x: rx + (isNote ? 0.4 : 0.1), y: 3.82 + i * 0.37, w: rw - 0.2, h: 0.35,
      fontSize: isNote ? 10 : 11, color: isNote ? MID_GREY : DARK_GREY,
      fontFace: 'Calibri', italic: isNote
    });
  });

  s.addShape('rect', { x: rx, y: 6.0, w: rw, h: 0.6, fill: { color: 'EDFFFE' }, line: { color: TEAL, pt: 1 } });
  s.addText('💡  Ideal for one-off stories raised outside a sprint cycle, bug-adjacent work, or ad-hoc requests', {
    x: rx + 0.1, y: 6.02, w: rw - 0.2, h: 0.56, fontSize: 10, color: '05807A', fontFace: 'Calibri', wrap: true, valign: 'middle'
  });
}

// ─────────────────────────────────────────────────────────────────
// SLIDE 5  —  Key Benefits & Summary
// ─────────────────────────────────────────────────────────────────
{
  const s = pptx.addSlide();
  s.addShape('rect', { x: 0, y: 0, w: W, h: H, fill: { color: NAVY } });
  s.addShape('rect', { x: 0, y: 0, w: 0.18, h: H, fill: { color: TEAL } });
  s.addShape('rect', { x: 0, y: H - 0.1, w: W, h: 0.1, fill: { color: TEAL } });

  s.addText('Key Benefits & Summary', {
    x: 0.5, y: 0.3, w: W - 1, h: 0.75,
    fontSize: 32, bold: true, color: WHITE, fontFace: 'Calibri Light'
  });
  s.addShape('rect', { x: 0.5, y: 1.1, w: 3.5, h: 0.06, fill: { color: TEAL } });

  const benefits = [
    { icon: '⚡', title: 'Speed',          body: 'Full sprint backlog from a Jira EPIC in minutes, not days' },
    { icon: '✅', title: 'Quality Gate',   body: 'Built-in DoR check — no story reaches Jira without meeting standards' },
    { icon: '🎯', title: 'Story Points',   body: 'Fibonacci estimate with 4-factor rationale: effort × complexity × risk × AC count' },
    { icon: '🔐', title: 'PO Control',     body: 'Nothing pushed to Jira without explicit PO approval' },
    { icon: '🔗', title: 'Deep Context',   body: 'Reads EPIC, Figma, Confluence docs, and prior sprint stories for full context' },
    { icon: '🧩', title: 'Flexible',       body: 'EPIC backlog generation or one-off standalone stories — same quality gate' },
  ];

  benefits.forEach(({ icon, title, body }, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const bx = 0.5 + col * 4.25;
    const by = 1.35 + row * 2.5;
    const bcolor = row === 0 ? BLUE : '1A1A6A';

    s.addShape('rect', { x: bx, y: by, w: 3.9, h: 2.2, fill: { color: bcolor }, line: { color: TEAL, pt: 1 } });
    s.addText(`${icon}  ${title}`, {
      x: bx + 0.18, y: by + 0.15, w: 3.55, h: 0.55,
      fontSize: 15, bold: true, color: TEAL, fontFace: 'Calibri'
    });
    s.addShape('rect', { x: bx + 0.18, y: by + 0.7, w: 3.3, h: 0.04, fill: { color: '3A3A8A' } });
    s.addText(body, {
      x: bx + 0.18, y: by + 0.82, w: 3.55, h: 1.25,
      fontSize: 12, color: 'CCCCFF', fontFace: 'Calibri', wrap: true, valign: 'top'
    });
  });

  // Bottom tagline
  s.addText('PO Copilot  ·  Powered by Claude · Jira · Figma · Confluence', {
    x: 0.5, y: H - 0.45, w: W - 1, h: 0.3,
    fontSize: 9, color: LIGHT_BLUE, align: 'center', fontFace: 'Calibri'
  });
}

// ─────────────────────────────────────────────────────────────────
// Write file
// ─────────────────────────────────────────────────────────────────
pptx.writeFile({ fileName: resolve(__dirname, 'PO_Copilot_Presentation.pptx') })
  .then(() => console.log('Done → PO_Copilot_Presentation.pptx'))
  .catch(err => { console.error(err); process.exit(1); });
