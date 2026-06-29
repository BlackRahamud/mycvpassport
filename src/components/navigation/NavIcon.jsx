import React from 'react';
import {
  Globe, ScanLine, LayoutGrid, ArrowLeftRight, Linkedin,
  FilePlus2, LayoutTemplate, FolderOpen,
  Sparkles, Briefcase, BookOpen, Tag, Circle,
} from 'lucide-react';

// Icon key → lucide-react glyph. Keys are set in config/navItems.js so the
// data file stays JSX-free. Colour comes from currentColor / existing --nav
// tokens only — no palette is introduced here.
const ICON_MAP = {
  globe: Globe,
  scan: ScanLine,
  grid: LayoutGrid,
  swap: ArrowLeftRight,
  linkedin: Linkedin,
  filePlus: FilePlus2,
  template: LayoutTemplate,
  folder: FolderOpen,
  sparkles: Sparkles,
  briefcase: Briefcase,
  book: BookOpen,
  tag: Tag,
};

// Renders the leading icon inside a rounded square. `muted` dims the chip for
// disabled (auth-gated) rows.
export default function NavIcon({ name, size = 18, muted = false }) {
  const Glyph = ICON_MAP[name] || Circle;
  return (
    <span
      aria-hidden="true"
      style={{
        flex: '0 0 auto',
        width: 36,
        height: 36,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 'var(--nav-radius-sm)',
        background: 'var(--nav-surface-elevated)',
        border: '1px solid var(--nav-border-hairline)',
        color: muted ? 'var(--nav-text-disabled)' : 'var(--nav-text-muted)',
      }}
    >
      <Glyph size={size} strokeWidth={2} />
    </span>
  );
}
