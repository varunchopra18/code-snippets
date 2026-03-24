import { useState, useMemo, useRef } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };
type JsonRecord = { [key: string]: JsonValue };

interface VersionEntry {
  version: string;
  label: string;
  timestamp: string;
  data: JsonRecord;
}

type DiffType = "added" | "removed" | "changed" | "same";

interface FlatEntry {
  path: string;
  depth: number;
  type: DiffType;
  valA: JsonPrimitive | undefined;
  valB: JsonPrimitive | undefined;
  isSection: boolean;
}

interface StatItem {
  label: string;
  count: number;
  color: string;
}

// ─── Sample Data ──────────────────────────────────────────────────────────────

const versions: VersionEntry[] = [
  {
    version: "v1.0", label: "Initial", timestamp: "2024-01-01",
    data: {
      id: 1, name: "Alice Johnson", role: "developer",
      email: "alice@example.com", active: true, score: 42,
      tags: ["js", "react"],
      address: { city: "New York", zip: "10001" },
      meta: { createdBy: "system", source: "import" },
    },
  },
  {
    version: "v1.1", label: "Patch", timestamp: "2024-01-15",
    data: {
      id: 1, name: "Alice Johnson", role: "senior developer",
      email: "alice@example.com", active: true, score: 55,
      tags: ["js", "react", "typescript"],
      address: { city: "New York", zip: "10001" },
      meta: { createdBy: "system", source: "import", verified: true },
    },
  },
  {
    version: "v1.2", label: "Update", timestamp: "2024-02-01",
    data: {
      id: 1, name: "Alice Johnson", role: "senior developer",
      email: "alice.j@company.com", active: true, score: 55,
      tags: ["js", "react", "typescript"],
      address: { city: "Brooklyn", zip: "11201" },
      department: "Engineering",
      meta: { createdBy: "system", source: "import", verified: true },
    },
  },
  {
    version: "v2.0", label: "Major", timestamp: "2024-03-01",
    data: {
      id: 1, name: "Alice Johnson", role: "tech lead",
      email: "alice.j@company.com", active: true, score: 78,
      tags: ["js", "react", "typescript", "node"],
      address: { city: "Brooklyn", zip: "11201", country: "US" },
      department: "Engineering", reports: 3,
      meta: { createdBy: "admin", source: "import", verified: true, lastEdited: "2024-03-01" },
    },
  },
  {
    version: "v2.1", label: "Fix", timestamp: "2024-03-20",
    data: {
      id: 1, name: "Alice Johnson", role: "tech lead",
      email: "alice.j@company.com", active: false, score: 78,
      tags: ["js", "react", "typescript", "node"],
      address: { city: "Brooklyn", zip: "11201", country: "US" },
      department: "Engineering", reports: 3, onLeave: true,
      meta: { createdBy: "admin", source: "import", verified: true, lastEdited: "2024-03-20" },
    },
  },
  {
    version: "v2.2", label: "Restore", timestamp: "2024-04-05",
    data: {
      id: 1, name: "Alice Johnson", role: "tech lead",
      email: "alice.j@company.com", active: true, score: 82,
      tags: ["js", "react", "typescript", "node"],
      address: { city: "Brooklyn", zip: "11201", country: "US" },
      department: "Engineering", reports: 4,
      meta: { createdBy: "admin", source: "import", verified: true, lastEdited: "2024-04-05" },
    },
  },
  {
    version: "v3.0", label: "Refactor", timestamp: "2024-05-01",
    data: {
      id: 1, fullName: "Alice Johnson", jobTitle: "tech lead",
      contactEmail: "alice.j@company.com", isActive: true, performanceScore: 82,
      skills: ["js", "react", "typescript", "node", "python"],
      location: { city: "Brooklyn", zip: "11201", country: "US", timezone: "EST" },
      department: "Engineering", directReports: 4,
      audit: { createdBy: "admin", source: "import", verified: true, lastEdited: "2024-05-01", revision: 3 },
    },
  },
  {
    version: "v3.1", label: "Extend", timestamp: "2024-06-10",
    data: {
      id: 1, fullName: "Alice Johnson", jobTitle: "principal engineer",
      contactEmail: "alice.j@company.com", isActive: true, performanceScore: 91,
      skills: ["js", "react", "typescript", "node", "python", "rust"],
      location: { city: "San Francisco", zip: "94105", country: "US", timezone: "PST" },
      department: "Platform", directReports: 7, budget: 500000,
      audit: { createdBy: "admin", source: "import", verified: true, lastEdited: "2024-06-10", revision: 4 },
    },
  },
  {
    version: "v3.2", label: "Audit", timestamp: "2024-07-22",
    data: {
      id: 1, fullName: "Alice Johnson", jobTitle: "principal engineer",
      contactEmail: "alice.j@company.com", isActive: true, performanceScore: 91,
      skills: ["js", "react", "typescript", "node", "python", "rust"],
      location: { city: "San Francisco", zip: "94105", country: "US", timezone: "PST" },
      department: "Platform", directReports: 7, budget: 500000,
      lastAudit: "2024-07-22", complianceScore: 99,
      audit: { createdBy: "admin", source: "compliance-run", verified: true, lastEdited: "2024-07-22", revision: 5 },
    },
  },
  {
    version: "v4.0", label: "Current", timestamp: "2024-08-01",
    data: {
      id: 1, fullName: "Alice M. Johnson", jobTitle: "VP of Engineering",
      contactEmail: "alice@company.com", isActive: true, performanceScore: 97,
      skills: ["js", "react", "typescript", "node", "python", "rust", "go"],
      location: { city: "San Francisco", zip: "94105", country: "US", timezone: "PST", office: "HQ Tower" },
      department: "Engineering", directReports: 22, budget: 2000000,
      lastAudit: "2024-07-22", complianceScore: 100,
      audit: { createdBy: "admin", source: "compliance-run", verified: true, lastEdited: "2024-08-01", revision: 6, signedOff: true },
    },
  },
];

// ─── Core Helpers ─────────────────────────────────────────────────────────────

function isPlainObject(v: JsonValue): v is JsonRecord {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function flattenObject(obj: JsonRecord, prefix = ""): Record<string, JsonPrimitive> {
  const result: Record<string, JsonPrimitive> = {};
  for (const key in obj) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    const val = obj[key];
    if (isPlainObject(val)) {
      Object.assign(result, flattenObject(val as JsonRecord, fullKey));
    } else {
      result[fullKey] = Array.isArray(val) ? JSON.stringify(val) : (val as JsonPrimitive);
    }
  }
  return result;
}

function classifyPath(
  path: string,
  fa: Record<string, JsonPrimitive>,
  fb: Record<string, JsonPrimitive>
): DiffType {
  const inA = path in fa, inB = path in fb;
  if (!inA) return "added";
  if (!inB) return "removed";
  if (String(fa[path]) !== String(fb[path])) return "changed";
  return "same";
}

function buildFlatEntries(a: JsonRecord, b: JsonRecord, showSame: boolean): FlatEntry[] {
  const fa = flattenObject(a);
  const fb = flattenObject(b);
  const allPaths = Array.from(new Set([...Object.keys(fa), ...Object.keys(fb)]));

  const sectionPrefixes = new Set<string>();
  allPaths.forEach((p) => {
    const parts = p.split(".");
    for (let i = 1; i < parts.length; i++) sectionPrefixes.add(parts.slice(0, i).join("."));
  });

  const rows: FlatEntry[] = [];
  const emittedSections = new Set<string>();
  const sectionRowMap = new Map<string, FlatEntry>();

  const emitParentSections = (path: string) => {
    const parts = path.split(".");
    for (let i = 1; i < parts.length; i++) {
      const sp = parts.slice(0, i).join(".");
      if (!emittedSections.has(sp) && sectionPrefixes.has(sp)) {
        emittedSections.add(sp);
        const row: FlatEntry = { path: sp, depth: sp.split(".").length - 1, type: "same", valA: undefined, valB: undefined, isSection: true };
        rows.push(row);
        sectionRowMap.set(sp, row);
      }
    }
  };

  allPaths.forEach((path) => {
    const type = classifyPath(path, fa, fb);
    if (!showSame && type === "same") return;
    emitParentSections(path);
    rows.push({ path, depth: path.split(".").length - 1, type, valA: fa[path], valB: fb[path], isSection: false });
  });

  rows.forEach((r) => {
    if (!r.isSection && r.type !== "same") {
      r.path.split(".").forEach((_, i, arr) => {
        if (i === 0) return;
        const sp = arr.slice(0, i).join(".");
        const sec = sectionRowMap.get(sp);
        if (sec && sec.type === "same") sec.type = r.type;
      });
    }
  });

  return rows;
}

// ─── Search helpers ───────────────────────────────────────────────────────────

/** Check whether a FlatEntry matches the search query (key path or value) */
function entryMatchesSearch(entry: FlatEntry, query: string): boolean {
  if (!query) return true;
  const q = query.toLowerCase();
  // Match against full path and last key segment
  if (entry.path.toLowerCase().includes(q)) return true;
  // Match against section name
  if (entry.isSection) {
    const key = entry.path.split(".").pop() ?? "";
    return key.toLowerCase().includes(q);
  }
  // Match against values (both sides)
  const vA = entry.valA !== undefined ? String(entry.valA).toLowerCase() : "";
  const vB = entry.valB !== undefined ? String(entry.valB).toLowerCase() : "";
  return vA.includes(q) || vB.includes(q);
}

/** Highlight matching substrings inside a plain string */
function Highlight({ text, query }: { text: string; query: string }): JSX.Element {
  if (!query) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark style={{ background: "#fbbf2460", color: "#fde68a", borderRadius: 2, padding: "0 1px" }}>
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  );
}

// ─── Style Map ────────────────────────────────────────────────────────────────

const DIFF_STYLE: Record<DiffType, { bg: string; text: string; dot: string; valAColor: string; valBColor: string }> = {
  added:   { bg: "rgba(16,185,129,0.07)",  text: "#34d399", dot: "#10b981", valAColor: "#4b5563", valBColor: "#34d399" },
  removed: { bg: "rgba(239,68,68,0.07)",   text: "#f87171", dot: "#ef4444", valAColor: "#f87171", valBColor: "#4b5563" },
  changed: { bg: "rgba(245,158,11,0.07)",  text: "#fbbf24", dot: "#f59e0b", valAColor: "#fbbf24", valBColor: "#34d399" },
  same:    { bg: "transparent",            text: "#6b7280", dot: "#374151", valAColor: "#6b7280",  valBColor: "#6b7280" },
};

// ─── Value Renderer ───────────────────────────────────────────────────────────

function renderValue(
  v: JsonPrimitive | undefined,
  color: string,
  strikethrough = false,
  query = ""
): JSX.Element {
  if (v === undefined) return <span style={{ color: "#374151", opacity: 0.4 }}>—</span>;
  const str = String(v);

  if (typeof v === "boolean") {
    return (
      <span style={{
        color: v ? "#86efac" : "#fca5a5",
        background: v ? "rgba(134,239,172,0.1)" : "rgba(252,165,165,0.1)",
        padding: "1px 6px", borderRadius: 3, fontSize: 10, fontFamily: "monospace",
        textDecoration: strikethrough ? "line-through" : "none",
      }}>
        <Highlight text={str} query={query} />
      </span>
    );
  }

  if (typeof v === "number") {
    return (
      <span style={{ color: "#93c5fd", fontFamily: "monospace", textDecoration: strikethrough ? "line-through" : "none" }}>
        <Highlight text={str} query={query} />
      </span>
    );
  }

  if (str.startsWith("[")) {
    try {
      const arr = JSON.parse(str) as unknown[];
      return (
        <span style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
          {arr.map((item, i) => (
            <span key={i} style={{
              background: "rgba(99,102,241,0.15)", color: "#a5b4fc",
              padding: "1px 6px", borderRadius: 3, fontSize: 10, fontFamily: "monospace",
              textDecoration: strikethrough ? "line-through" : "none",
            }}>
              <Highlight text={String(item)} query={query} />
            </span>
          ))}
        </span>
      );
    } catch { /* fall through */ }
  }

  return (
    <span style={{ color, fontFamily: "monospace", textDecoration: strikethrough ? "line-through" : "none" }}>
      "<Highlight text={str} query={query} />"
    </span>
  );
}

// ─── Row Components ───────────────────────────────────────────────────────────

function SectionRow({ entry, query }: { entry: FlatEntry; query: string }): JSX.Element {
  const { path, depth, type } = entry;
  const s = DIFF_STYLE[type];
  const keyName = path.split(".").pop() ?? path;
  const indent = depth * 18;

  return (
    <div style={{
      display: "grid", gridTemplateColumns: "minmax(200px,300px) 1fr 1fr",
      borderBottom: "1px solid #1e293b", background: "rgba(15,23,42,0.85)",
    }}>
      <div style={{
        padding: "6px 12px", paddingLeft: 12 + indent,
        display: "flex", alignItems: "center", gap: 6,
        borderRight: "1px solid #1e293b",
      }}>
        <svg width="12" height="12" viewBox="0 0 12 12" style={{ flexShrink: 0 }}>
          <rect x="1" y="1" width="10" height="10" rx="2" fill="none" stroke={s.dot} strokeWidth="1.2" />
          <path d="M3.5 6h5M6 3.5v5" stroke={s.dot} strokeWidth="1.2" strokeLinecap="round" />
        </svg>
        <span style={{ fontFamily: "monospace", fontSize: 11, fontWeight: 600, color: s.text }}>
          <Highlight text={keyName} query={query} />
        </span>
        <span style={{ fontSize: 9, color: "#4b5563", background: "#0f172a", border: "1px solid #1e293b", padding: "1px 5px", borderRadius: 3 }}>
          &#123;&#125; object
        </span>
      </div>
      <div style={{ borderRight: "1px solid #1e293b", background: "rgba(0,0,0,0.15)" }} />
      <div style={{ background: "rgba(0,0,0,0.15)" }} />
    </div>
  );
}

function DataRow({ entry, query }: { entry: FlatEntry; query: string }): JSX.Element {
  const { path, depth, type, valA, valB } = entry;
  const s = DIFF_STYLE[type];
  const keyName = path.split(".").pop() ?? path;
  const indent = depth * 18;

  // Determine if this row is a search match (for subtle highlight ring)
  const isSearchMatch = query.length > 0 && entryMatchesSearch(entry, query);

  return (
    <div style={{
      display: "grid", gridTemplateColumns: "minmax(200px,300px) 1fr 1fr",
      borderBottom: "1px solid #131e2e",
      background: type !== "same" ? s.bg : "transparent",
      outline: isSearchMatch && query ? "1px solid rgba(251,191,36,0.2)" : "none",
      outlineOffset: "-1px",
    }}>
      {/* Key */}
      <div style={{
        padding: "6px 12px",
        paddingLeft: indent + (depth > 0 ? 24 : 12),
        display: "flex", alignItems: "center", gap: 5,
        borderRight: "1px solid #131e2e",
      }}>
        {depth > 0 && <span style={{ color: "#1e3a5f", fontSize: 11, lineHeight: 1, marginRight: 1 }}>╰</span>}
        <span style={{
          width: 5, height: 5, borderRadius: "50%", background: s.dot, flexShrink: 0,
          boxShadow: type !== "same" ? `0 0 4px ${s.dot}99` : "none",
        }} />
        <span style={{ fontFamily: "monospace", fontSize: 11, color: s.text, wordBreak: "break-all" }}>
          <Highlight text={keyName} query={query} />
        </span>
      </div>

      {/* Value A */}
      <div style={{
        padding: "6px 12px", borderRight: "1px solid #131e2e",
        wordBreak: "break-all", opacity: type === "added" ? 0.2 : 1,
        display: "flex", alignItems: "center", minHeight: 32,
      }}>
        {renderValue(valA, s.valAColor, type === "removed", query)}
      </div>

      {/* Value B */}
      <div style={{
        padding: "6px 12px", wordBreak: "break-all",
        opacity: type === "removed" ? 0.2 : 1,
        display: "flex", alignItems: "center", minHeight: 32,
      }}>
        {renderValue(valB, s.valBColor, false, query)}
      </div>
    </div>
  );
}

function VersionCard({ v, accentColor, accentBg, textColor }: {
  v: VersionEntry; accentColor: string; accentBg: string; textColor: string;
}): JSX.Element {
  return (
    <div style={{ background: "#0f172a", border: `1px solid ${accentColor}`, borderRadius: 10, padding: "14px 16px", minWidth: 0, flex: 1 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 18, color: textColor }}>{v.version}</div>
          <div style={{ color: "#475569", fontSize: 11, marginTop: 2 }}>{v.timestamp}</div>
        </div>
        <span style={{ background: accentBg, color: textColor, padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600 }}>{v.label}</span>
      </div>
      <pre style={{
        margin: 0, fontFamily: "monospace", fontSize: 10, color: "#64748b",
        background: "#070e1a", borderRadius: 6, padding: "10px",
        overflow: "auto", maxHeight: 140, lineHeight: 1.6,
      }}>{JSON.stringify(v.data, null, 2)}</pre>
    </div>
  );
}

// ─── Search Bar Component ─────────────────────────────────────────────────────

interface SearchBarProps {
  query: string;
  onChange: (v: string) => void;
  matchCount: number;
  totalCount: number;
}

function SearchBar({ query, onChange, matchCount, totalCount }: SearchBarProps): JSX.Element {
  const inputRef = useRef<HTMLInputElement>(null);
  const hasQuery = query.length > 0;

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10,
      background: "#0f172a",
      border: `1px solid ${hasQuery ? "#f59e0b" : "#1e293b"}`,
      borderRadius: 10, padding: "8px 14px",
      transition: "border-color 0.2s",
      flex: 1, minWidth: 200,
    }}>
      {/* Search icon */}
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
        <circle cx="6.5" cy="6.5" r="5" stroke={hasQuery ? "#f59e0b" : "#475569"} strokeWidth="1.5" />
        <path d="M10.5 10.5L14 14" stroke={hasQuery ? "#f59e0b" : "#475569"} strokeWidth="1.5" strokeLinecap="round" />
      </svg>

      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
        placeholder="Filter by field name or value…"
        style={{
          flex: 1, background: "transparent", border: "none", outline: "none",
          color: "#e2e8f0", fontSize: 12, fontFamily: "monospace",
          caretColor: "#f59e0b",
        }}
      />

      {/* Match badge */}
      {hasQuery && (
        <span style={{
          fontSize: 10, fontWeight: 600, whiteSpace: "nowrap",
          color: matchCount > 0 ? "#fbbf24" : "#ef4444",
          background: matchCount > 0 ? "rgba(251,191,36,0.1)" : "rgba(239,68,68,0.1)",
          padding: "2px 8px", borderRadius: 10,
          border: `1px solid ${matchCount > 0 ? "rgba(251,191,36,0.25)" : "rgba(239,68,68,0.25)"}`,
        }}>
          {matchCount > 0 ? `${matchCount} / ${totalCount} fields` : "no matches"}
        </span>
      )}

      {/* Clear button */}
      {hasQuery && (
        <button
          onClick={() => { onChange(""); inputRef.current?.focus(); }}
          style={{
            background: "none", border: "none", cursor: "pointer",
            color: "#475569", padding: 0, display: "flex", alignItems: "center",
            lineHeight: 1, fontSize: 14,
          }}
          title="Clear search"
        >
          ✕
        </button>
      )}
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function App(): JSX.Element {
  const [sliderIdx, setSliderIdx] = useState<number>(0);
  const [showSame, setShowSame] = useState<boolean>(false);
  const [activeFilter, setActiveFilter] = useState<DiffType | "all">("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const leftV = versions[sliderIdx];
  const rightV = versions[sliderIdx + 1];

  const fa = useMemo(() => flattenObject(leftV.data), [sliderIdx]);
  const fb = useMemo(() => flattenObject(rightV.data), [sliderIdx]);

  const stats = useMemo((): StatItem[] => {
    const allKeys = new Set([...Object.keys(fa), ...Object.keys(fb)]);
    let added = 0, removed = 0, changed = 0, same = 0;
    allKeys.forEach((k) => {
      const t = classifyPath(k, fa, fb);
      if (t === "added") added++;
      else if (t === "removed") removed++;
      else if (t === "changed") changed++;
      else same++;
    });
    return [
      { label: "Added",   count: added,   color: "#10b981" },
      { label: "Removed", count: removed, color: "#ef4444" },
      { label: "Changed", count: changed, color: "#f59e0b" },
      { label: "Same",    count: same,    color: "#4b5563" },
    ];
  }, [fa, fb]);

  const allEntries = useMemo(
    () => buildFlatEntries(leftV.data, rightV.data, showSame),
    [sliderIdx, showSame]
  );

  // ── Step 1: apply diff-type filter ──
  const typeFilteredEntries = useMemo((): FlatEntry[] => {
    if (activeFilter === "all") return allEntries;
    const matchingPaths = new Set(
      allEntries.filter(e => !e.isSection && e.type === activeFilter).map(e => e.path)
    );
    return allEntries.filter(e => {
      if (!e.isSection) return e.type === activeFilter;
      return [...matchingPaths].some(p => p.startsWith(e.path + ".") || p === e.path);
    });
  }, [allEntries, activeFilter]);

  // ── Step 2: apply search filter ──
  const visibleEntries = useMemo((): FlatEntry[] => {
    const q = searchQuery.trim();
    if (!q) return typeFilteredEntries;

    // Find all leaf rows whose path or value matches
    const matchingLeafPaths = new Set(
      typeFilteredEntries
        .filter(e => !e.isSection && entryMatchesSearch(e, q))
        .map(e => e.path)
    );

    // Also check section headers themselves by name
    return typeFilteredEntries.filter(e => {
      if (e.isSection) {
        // Show section if its own name matches OR any child path matches
        const sectionName = (e.path.split(".").pop() ?? "").toLowerCase();
        if (sectionName.includes(q.toLowerCase())) return true;
        return [...matchingLeafPaths].some(p => p.startsWith(e.path + "."));
      }
      return matchingLeafPaths.has(e.path);
    });
  }, [typeFilteredEntries, searchQuery]);

  const searchMatchCount = visibleEntries.filter(e => !e.isSection).length;
  const totalLeafCount = allEntries.filter(e => !e.isSection).length;

  const toggleFilter = (type: DiffType) =>
    setActiveFilter(prev => prev === type ? "all" : type);

  // Clear search when slider moves
  const handleSliderChange = (idx: number) => {
    setSliderIdx(idx);
    setSearchQuery("");
    setActiveFilter("all");
  };

  return (
    <div style={{ minHeight: "100vh", background: "#020817", color: "#e2e8f0", fontFamily: "system-ui, sans-serif", padding: "28px 18px" }}>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />

      <div style={{ maxWidth: 1200, margin: "0 auto" }}>

        {/* ── Header ── */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#3b82f6", boxShadow: "0 0 8px #3b82f6" }} />
            <span style={{ fontSize: 10, letterSpacing: "0.18em", color: "#334155", fontWeight: 600, textTransform: "uppercase" as const }}>
              JSON Version Diff
            </span>
          </div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, background: "linear-gradient(90deg, #60a5fa, #a78bfa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            Nested JSON Comparator
          </h1>
          <p style={{ margin: "4px 0 0", color: "#475569", fontSize: 12 }}>
            Nested objects expanded with dot-path keys · search across field names and values
          </p>
        </div>

        {/* ── Timeline Slider ── */}
        <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 12, padding: "18px 22px", marginBottom: 18 }}>
          <div style={{ position: "relative", marginBottom: 14 }}>
            <div style={{ position: "absolute", top: "50%", left: 0, right: 0, height: 2, background: "#0f1e34", transform: "translateY(-50%)" }} />
            <div style={{
              position: "absolute", top: "50%", left: 0, height: 2,
              background: "linear-gradient(90deg, #3b82f6, #8b5cf6)", transform: "translateY(-50%)",
              width: `${(sliderIdx / (versions.length - 2)) * 100}%`, transition: "width 0.2s",
            }} />
            <div style={{ display: "flex", justifyContent: "space-between", position: "relative", zIndex: 1 }}>
              {versions.map((v, i) => (
                <button key={i}
                  onClick={() => handleSliderChange(Math.min(i, versions.length - 2))}
                  title={`${v.version} — ${v.label}`}
                  style={{
                    width: 28, height: 28, borderRadius: "50%",
                    border: `2px solid ${i === sliderIdx ? "#3b82f6" : i === sliderIdx + 1 ? "#8b5cf6" : i < sliderIdx ? "#1d3a5f" : "#1e293b"}`,
                    background: i === sliderIdx ? "#1e3a5f" : i === sliderIdx + 1 ? "#2d1b69" : "#0a0f1e",
                    color: i <= sliderIdx + 1 ? "#cbd5e1" : "#334155",
                    cursor: "pointer", fontSize: 7.5, fontWeight: 700, fontFamily: "monospace",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    transition: "all 0.15s",
                    boxShadow: i === sliderIdx ? "0 0 8px #3b82f660" : i === sliderIdx + 1 ? "0 0 8px #8b5cf660" : "none",
                  }}
                >
                  {v.version.replace("v", "")}
                </button>
              ))}
            </div>
          </div>
          <input type="range" min={0} max={versions.length - 2} value={sliderIdx}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleSliderChange(Number(e.target.value))}
            style={{ width: "100%", accentColor: "#3b82f6", cursor: "pointer" }}
          />
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 5 }}>
            <span style={{ fontSize: 11, color: "#60a5fa" }}>← {leftV.version} · {leftV.label}</span>
            <span style={{ fontSize: 11, color: "#a78bfa" }}>{rightV.version} · {rightV.label} →</span>
          </div>
        </div>

        {/* ── Version Cards ── */}
        <div style={{ display: "flex", gap: 14, marginBottom: 18 }}>
          <VersionCard v={leftV} accentColor="#3b82f6" accentBg="#1e3a5f" textColor="#60a5fa" />
          <VersionCard v={rightV} accentColor="#8b5cf6" accentBg="#2d1b69" textColor="#a78bfa" />
        </div>

        {/* ── Controls Row: Stats + Search ── */}
        <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap", alignItems: "stretch" }}>

          {/* Diff type filter buttons */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            {stats.map((s) => {
              const isActive = activeFilter === s.label.toLowerCase();
              return (
                <button key={s.label}
                  onClick={() => toggleFilter(s.label.toLowerCase() as DiffType)}
                  style={{
                    display: "flex", alignItems: "center", gap: 6,
                    background: isActive ? `${s.color}18` : "#0f172a",
                    border: `1px solid ${isActive ? s.color : "#1e293b"}`,
                    borderRadius: 8, padding: "6px 12px", cursor: "pointer",
                    transition: "all 0.15s",
                  }}
                >
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: s.color }} />
                  <span style={{ fontSize: 18, fontWeight: 700, color: s.color, fontVariantNumeric: "tabular-nums" }}>{s.count}</span>
                  <span style={{ fontSize: 11, color: "#6b7280" }}>{s.label}</span>
                </button>
              );
            })}
          </div>

          {/* Search bar */}
          <SearchBar
            query={searchQuery}
            onChange={setSearchQuery}
            matchCount={searchMatchCount}
            totalCount={totalLeafCount}
          />

          {/* Show unchanged toggle */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#6b7280", flexShrink: 0 }}>
            <span style={{ whiteSpace: "nowrap" }}>Show unchanged</span>
            <div onClick={() => setShowSame(p => !p)} style={{
              width: 32, height: 17, borderRadius: 9,
              background: showSame ? "#3b82f6" : "#1e293b",
              position: "relative", cursor: "pointer", transition: "background 0.2s",
            }}>
              <div style={{
                position: "absolute", top: 2,
                left: showSame ? 15 : 2,
                width: 13, height: 13, borderRadius: "50%",
                background: "#fff", transition: "left 0.2s",
              }} />
            </div>
          </div>
        </div>

        {/* Active search indicator banner */}
        {searchQuery.trim() && (
          <div style={{
            display: "flex", alignItems: "center", gap: 10,
            background: "rgba(251,191,36,0.06)",
            border: "1px solid rgba(251,191,36,0.2)",
            borderRadius: 8, padding: "8px 14px", marginBottom: 12,
            fontSize: 12,
          }}>
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
              <circle cx="6.5" cy="6.5" r="5" stroke="#f59e0b" strokeWidth="1.5" />
              <path d="M10.5 10.5L14 14" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <span style={{ color: "#fbbf24" }}>
              Filtering by <code style={{ background: "rgba(251,191,36,0.15)", padding: "1px 6px", borderRadius: 3, fontSize: 11 }}>"{searchQuery}"</code>
            </span>
            <span style={{ color: "#64748b" }}>
              — matches in field names <em>and</em> values on both sides
            </span>
            <button onClick={() => setSearchQuery("")} style={{
              marginLeft: "auto", background: "none", border: "none",
              cursor: "pointer", color: "#64748b", fontSize: 11,
              padding: "2px 8px", borderRadius: 4,
            }}>
              Clear ✕
            </button>
          </div>
        )}

        {/* ── Diff Grid ── */}
        <div style={{ background: "#0a0f1e", border: "1px solid #1e293b", borderRadius: 12, overflow: "hidden" }}>

          {/* Column Headers */}
          <div style={{ display: "grid", gridTemplateColumns: "minmax(200px,300px) 1fr 1fr", background: "#050b17", borderBottom: "2px solid #1e293b" }}>
            {[
              { label: "Field path", sub: "dot-notation · indented nesting", color: "#475569" },
              { label: `${leftV.version} — Before`, sub: leftV.label, color: "#60a5fa" },
              { label: `${rightV.version} — After`, sub: rightV.label, color: "#a78bfa" },
            ].map((h, i) => (
              <div key={i} style={{ padding: "10px 12px", borderRight: i < 2 ? "1px solid #1e293b" : "none" }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: h.color, letterSpacing: "0.08em", textTransform: "uppercase" as const }}>{h.label}</div>
                <div style={{ fontSize: 9.5, color: "#334155", marginTop: 2 }}>{h.sub}</div>
              </div>
            ))}
          </div>

          {/* Legend bar */}
          <div style={{ display: "flex", gap: 14, padding: "5px 12px", background: "#050b17", borderBottom: "1px solid #1e293b", flexWrap: "wrap" }}>
            {(["added","removed","changed","same"] as DiffType[]).map(t => (
              <div key={t} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ width: 5, height: 5, borderRadius: "50%", background: DIFF_STYLE[t].dot }} />
                <span style={{ fontSize: 9.5, color: "#334155", textTransform: "capitalize" as const }}>{t}</span>
              </div>
            ))}
            <span style={{ fontSize: 9.5, color: "#1e3a5f", marginLeft: "auto" }}>╰ = nested · &#123;&#125; = object</span>
            <span style={{ fontSize: 9.5, color: "#334155" }}>
              {searchQuery ? `${searchMatchCount} matched` : `${visibleEntries.filter(e => !e.isSection).length} fields`}
            </span>
          </div>

          {/* Rows */}
          {visibleEntries.length === 0 ? (
            <div style={{ padding: 48, textAlign: "center" as const }}>
              {searchQuery ? (
                <>
                  <div style={{ fontSize: 28, marginBottom: 10 }}>🔍</div>
                  <div style={{ color: "#64748b", fontSize: 14, marginBottom: 6 }}>
                    No fields match <strong style={{ color: "#fbbf24" }}>"{searchQuery}"</strong>
                  </div>
                  <div style={{ color: "#334155", fontSize: 12 }}>
                    Try searching for a field name like <code style={{ color: "#a5b4fc" }}>address</code> or a value like <code style={{ color: "#a5b4fc" }}>Brooklyn</code>
                  </div>
                  <button onClick={() => setSearchQuery("")} style={{
                    marginTop: 14, background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.3)",
                    color: "#fbbf24", padding: "6px 16px", borderRadius: 6,
                    cursor: "pointer", fontSize: 12,
                  }}>
                    Clear search
                  </button>
                </>
              ) : (
                <div style={{ color: "#334155", fontSize: 13 }}>No fields match the current filter.</div>
              )}
            </div>
          ) : (
            visibleEntries.map((entry, i) =>
              entry.isSection
                ? <SectionRow key={`sec-${entry.path}-${i}`} entry={entry} query={searchQuery} />
                : <DataRow key={`row-${entry.path}-${i}`} entry={entry} query={searchQuery} />
            )
          )}
        </div>

        {!showSame && (stats.find(s => s.label === "Same")?.count ?? 0) > 0 && !searchQuery && (
          <p style={{ textAlign: "center" as const, marginTop: 10, fontSize: 11, color: "#1e293b" }}>
            {stats.find(s => s.label === "Same")?.count} unchanged fields hidden
          </p>
        )}
      </div>
    </div>
  );
}
