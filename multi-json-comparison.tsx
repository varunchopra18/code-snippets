import { useState, useRef } from "react";

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

interface DiffResult {
  added: string[];
  removed: string[];
  changed: string[];
  same: string[];
  fa: Record<string, JsonPrimitive>;
  fb: Record<string, JsonPrimitive>;
}

interface TagColor {
  bg: string;
  border: string;
  text: string;
  dot: string;
  label: string;
}

interface DiffRowProps {
  label: string;
  type: DiffType;
  valA: JsonPrimitive | undefined;
  valB: JsonPrimitive | undefined;
}

interface VersionCardProps {
  v: VersionEntry;
  isLeft?: boolean;
  isRight?: boolean;
}

interface StatItem {
  label: string;
  count: number;
  color: string;
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const versions: VersionEntry[] = [
  {
    version: "v1.0",
    label: "Initial",
    timestamp: "2024-01-01",
    data: {
      id: 1,
      name: "Alice Johnson",
      role: "developer",
      email: "alice@example.com",
      active: true,
      score: 42,
      tags: ["js", "react"],
      address: { city: "New York", zip: "10001" },
    },
  },
  {
    version: "v1.1",
    label: "Patch",
    timestamp: "2024-01-15",
    data: {
      id: 1,
      name: "Alice Johnson",
      role: "senior developer",
      email: "alice@example.com",
      active: true,
      score: 55,
      tags: ["js", "react", "typescript"],
      address: { city: "New York", zip: "10001" },
    },
  },
  {
    version: "v1.2",
    label: "Update",
    timestamp: "2024-02-01",
    data: {
      id: 1,
      name: "Alice Johnson",
      role: "senior developer",
      email: "alice.j@company.com",
      active: true,
      score: 55,
      tags: ["js", "react", "typescript"],
      address: { city: "Brooklyn", zip: "11201" },
      department: "Engineering",
    },
  },
  {
    version: "v2.0",
    label: "Major",
    timestamp: "2024-03-01",
    data: {
      id: 1,
      name: "Alice Johnson",
      role: "tech lead",
      email: "alice.j@company.com",
      active: true,
      score: 78,
      tags: ["js", "react", "typescript", "node"],
      address: { city: "Brooklyn", zip: "11201" },
      department: "Engineering",
      reports: 3,
    },
  },
  {
    version: "v2.1",
    label: "Fix",
    timestamp: "2024-03-20",
    data: {
      id: 1,
      name: "Alice Johnson",
      role: "tech lead",
      email: "alice.j@company.com",
      active: false,
      score: 78,
      tags: ["js", "react", "typescript", "node"],
      address: { city: "Brooklyn", zip: "11201" },
      department: "Engineering",
      reports: 3,
      onLeave: true,
    },
  },
  {
    version: "v2.2",
    label: "Restore",
    timestamp: "2024-04-05",
    data: {
      id: 1,
      name: "Alice Johnson",
      role: "tech lead",
      email: "alice.j@company.com",
      active: true,
      score: 82,
      tags: ["js", "react", "typescript", "node"],
      address: { city: "Brooklyn", zip: "11201" },
      department: "Engineering",
      reports: 4,
    },
  },
  {
    version: "v3.0",
    label: "Refactor",
    timestamp: "2024-05-01",
    data: {
      id: 1,
      fullName: "Alice Johnson",
      jobTitle: "tech lead",
      contactEmail: "alice.j@company.com",
      isActive: true,
      performanceScore: 82,
      skills: ["js", "react", "typescript", "node", "python"],
      location: { city: "Brooklyn", zip: "11201", country: "US" },
      department: "Engineering",
      directReports: 4,
    },
  },
  {
    version: "v3.1",
    label: "Extend",
    timestamp: "2024-06-10",
    data: {
      id: 1,
      fullName: "Alice Johnson",
      jobTitle: "principal engineer",
      contactEmail: "alice.j@company.com",
      isActive: true,
      performanceScore: 91,
      skills: ["js", "react", "typescript", "node", "python", "rust"],
      location: { city: "San Francisco", zip: "94105", country: "US" },
      department: "Platform",
      directReports: 7,
      budget: 500000,
    },
  },
  {
    version: "v3.2",
    label: "Audit",
    timestamp: "2024-07-22",
    data: {
      id: 1,
      fullName: "Alice Johnson",
      jobTitle: "principal engineer",
      contactEmail: "alice.j@company.com",
      isActive: true,
      performanceScore: 91,
      skills: ["js", "react", "typescript", "node", "python", "rust"],
      location: { city: "San Francisco", zip: "94105", country: "US" },
      department: "Platform",
      directReports: 7,
      budget: 500000,
      lastAudit: "2024-07-22",
      complianceScore: 99,
    },
  },
  {
    version: "v4.0",
    label: "Current",
    timestamp: "2024-08-01",
    data: {
      id: 1,
      fullName: "Alice M. Johnson",
      jobTitle: "VP of Engineering",
      contactEmail: "alice@company.com",
      isActive: true,
      performanceScore: 97,
      skills: ["js", "react", "typescript", "node", "python", "rust", "go"],
      location: { city: "San Francisco", zip: "94105", country: "US" },
      department: "Engineering",
      directReports: 22,
      budget: 2000000,
      lastAudit: "2024-07-22",
      complianceScore: 100,
    },
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function flattenObject(
  obj: JsonRecord,
  prefix: string = ""
): Record<string, JsonPrimitive> {
  const result: Record<string, JsonPrimitive> = {};
  for (const key in obj) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    const val = obj[key];
    if (
      typeof val === "object" &&
      val !== null &&
      !Array.isArray(val)
    ) {
      Object.assign(result, flattenObject(val as JsonRecord, fullKey));
    } else {
      result[fullKey] = Array.isArray(val) ? JSON.stringify(val) : (val as JsonPrimitive);
    }
  }
  return result;
}

function getDiffKeys(a: JsonRecord, b: JsonRecord): DiffResult {
  const fa = flattenObject(a);
  const fb = flattenObject(b);
  const allKeys = new Set<string>([...Object.keys(fa), ...Object.keys(fb)]);
  const added: string[] = [];
  const removed: string[] = [];
  const changed: string[] = [];
  const same: string[] = [];

  allKeys.forEach((k) => {
    if (!(k in fa)) added.push(k);
    else if (!(k in fb)) removed.push(k);
    else if (String(fa[k]) !== String(fb[k])) changed.push(k);
    else same.push(k);
  });

  return { added, removed, changed, same, fa, fb };
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TAG_COLORS: Record<DiffType, TagColor> = {
  added:   { bg: "#0d2b1a", border: "#16a34a", text: "#4ade80", dot: "#22c55e", label: "ADDED" },
  removed: { bg: "#2b0d0d", border: "#dc2626", text: "#f87171", dot: "#ef4444", label: "REMOVED" },
  changed: { bg: "#1a1a00", border: "#ca8a04", text: "#fbbf24", dot: "#f59e0b", label: "CHANGED" },
  same:    { bg: "#111827", border: "#374151", text: "#9ca3af", dot: "#6b7280", label: "SAME" },
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function DiffRow({ label, type, valA, valB }: DiffRowProps): JSX.Element {
  const c = TAG_COLORS[type];
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "200px 1fr 1fr",
      borderBottom: "1px solid #1f2937",
      background: type !== "same" ? c.bg : "transparent",
    }}>
      {/* Key */}
      <div style={{
        padding: "7px 12px",
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: "11px",
        color: c.text,
        display: "flex",
        alignItems: "center",
        gap: 6,
        borderRight: "1px solid #1f2937",
      }}>
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: c.dot, flexShrink: 0 }} />
        {label}
      </div>

      {/* Value A */}
      <div style={{
        padding: "7px 12px",
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: "11px",
        color: type === "removed" ? "#f87171" : type === "changed" ? "#fbbf24" : "#6b7280",
        borderRight: "1px solid #1f2937",
        wordBreak: "break-all",
        textDecoration: type === "removed" ? "line-through" : "none",
        opacity: type === "added" ? 0.3 : 1,
      }}>
        {valA !== undefined ? String(valA) : <span style={{ opacity: 0.3 }}>—</span>}
      </div>

      {/* Value B */}
      <div style={{
        padding: "7px 12px",
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: "11px",
        color: type === "added" ? "#4ade80" : type === "changed" ? "#4ade80" : "#6b7280",
        wordBreak: "break-all",
        opacity: type === "removed" ? 0.3 : 1,
      }}>
        {valB !== undefined ? String(valB) : <span style={{ opacity: 0.3 }}>—</span>}
      </div>
    </div>
  );
}

function VersionCard({ v, isLeft = false, isRight = false }: VersionCardProps): JSX.Element {
  return (
    <div style={{
      background: "#0f172a",
      border: `1px solid ${isLeft ? "#3b82f6" : isRight ? "#8b5cf6" : "#1e293b"}`,
      borderRadius: 10,
      padding: "14px 16px",
      minWidth: 0,
      flex: 1,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
        <div>
          <div style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontWeight: 700,
            fontSize: 18,
            color: isLeft ? "#60a5fa" : "#a78bfa",
          }}>{v.version}</div>
          <div style={{ color: "#475569", fontSize: 11, marginTop: 2 }}>{v.timestamp}</div>
        </div>
        <span style={{
          background: isLeft ? "#1e3a5f" : "#2d1b69",
          color: isLeft ? "#93c5fd" : "#c4b5fd",
          padding: "3px 10px",
          borderRadius: 20,
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: "0.05em",
        }}>{v.label}</span>
      </div>
      <pre style={{
        margin: 0,
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 10,
        color: "#64748b",
        background: "#070e1a",
        borderRadius: 6,
        padding: "10px",
        overflow: "auto",
        maxHeight: 120,
        lineHeight: 1.6,
      }}>{JSON.stringify(v.data, null, 2)}</pre>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function App(): JSX.Element {
  const [sliderIdx, setSliderIdx] = useState<number>(0);
  const [showSame, setShowSame] = useState<boolean>(false);
  const _isDragging = useRef<boolean>(false);

  const leftV: VersionEntry = versions[sliderIdx];
  const rightV: VersionEntry = versions[sliderIdx + 1];
  const { added, removed, changed, same, fa, fb } = getDiffKeys(leftV.data, rightV.data);

  const allKeys: string[] = [
    ...removed,
    ...changed,
    ...added,
    ...(showSame ? same : []),
  ];

  const getType = (k: string): DiffType => {
    if (added.includes(k)) return "added";
    if (removed.includes(k)) return "removed";
    if (changed.includes(k)) return "changed";
    return "same";
  };

  const stats: StatItem[] = [
    { label: "Added",   count: added.length,   color: "#22c55e" },
    { label: "Removed", count: removed.length,  color: "#ef4444" },
    { label: "Changed", count: changed.length,  color: "#f59e0b" },
    { label: "Same",    count: same.length,     color: "#6b7280" },
  ];

  return (
    <div style={{
      minHeight: "100vh",
      background: "#020817",
      color: "#e2e8f0",
      fontFamily: "'Space Grotesk', sans-serif",
      padding: "32px 24px",
    }}>
      <link
        href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;600;700&family=JetBrains+Mono:wght@400;600&display=swap"
        rel="stylesheet"
      />

      <div style={{ maxWidth: 1100, margin: "0 auto" }}>

        {/* ── Header ── */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
            <div style={{
              width: 10, height: 10, borderRadius: "50%",
              background: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
              boxShadow: "0 0 12px #3b82f6aa",
            }} />
            <span style={{ fontSize: 11, letterSpacing: "0.15em", color: "#475569", fontWeight: 600 }}>
              JSON VERSION DIFF
            </span>
          </div>
          <h1 style={{
            margin: 0, fontSize: 32, fontWeight: 700,
            background: "linear-gradient(90deg, #60a5fa, #a78bfa)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}>Version Comparator</h1>
          <p style={{ margin: "6px 0 0", color: "#475569", fontSize: 14 }}>
            Drag the slider to compare across {versions.length} message versions
          </p>
        </div>

        {/* ── Timeline Slider ── */}
        <div style={{
          background: "#0f172a",
          border: "1px solid #1e293b",
          borderRadius: 14,
          padding: "24px 28px",
          marginBottom: 24,
        }}>
          {/* Version Dots */}
          <div style={{ position: "relative", marginBottom: 20 }}>
            <div style={{
              position: "absolute", top: "50%", left: 0, right: 0,
              height: 2, background: "#1e293b", transform: "translateY(-50%)",
            }} />
            <div style={{
              position: "absolute", top: "50%", left: 0, height: 2,
              background: "linear-gradient(90deg, #3b82f6, #8b5cf6)",
              transform: "translateY(-50%)",
              width: `${(sliderIdx / (versions.length - 2)) * 100}%`,
              transition: "width 0.2s",
            }} />
            <div style={{ display: "flex", justifyContent: "space-between", position: "relative", zIndex: 1 }}>
              {versions.map((v, i) => (
                <button
                  key={i}
                  onClick={() => setSliderIdx(Math.min(i, versions.length - 2))}
                  style={{
                    width: 32, height: 32, borderRadius: "50%",
                    border: `2px solid ${
                      i === sliderIdx       ? "#3b82f6"
                      : i === sliderIdx + 1 ? "#8b5cf6"
                      : i < sliderIdx       ? "#3b82f655"
                      : "#1e293b"
                    }`,
                    background: i === sliderIdx ? "#1e3a5f" : i === sliderIdx + 1 ? "#2d1b69" : "#0f172a",
                    color: i <= sliderIdx + 1 ? "#e2e8f0" : "#475569",
                    cursor: "pointer",
                    fontSize: 9,
                    fontWeight: 700,
                    fontFamily: "'JetBrains Mono', monospace",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    transition: "all 0.2s",
                    boxShadow:
                      i === sliderIdx       ? "0 0 12px #3b82f688"
                      : i === sliderIdx + 1 ? "0 0 12px #8b5cf688"
                      : "none",
                  }}
                >
                  {v.version.replace("v", "")}
                </button>
              ))}
            </div>
          </div>

          {/* Range Slider */}
          <div style={{ position: "relative" }}>
            <input
              type="range"
              min={0}
              max={versions.length - 2}
              value={sliderIdx}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setSliderIdx(Number(e.target.value))
              }
              style={{
                width: "100%",
                appearance: "none",
                height: 4,
                borderRadius: 2,
                background: "transparent",
                cursor: "pointer",
                outline: "none",
              }}
            />
            <style>{`
              input[type=range]::-webkit-slider-thumb {
                appearance: none;
                width: 22px; height: 22px; border-radius: 50%;
                background: linear-gradient(135deg, #3b82f6, #8b5cf6);
                cursor: pointer;
                box-shadow: 0 0 16px #3b82f6aa;
                border: 2px solid #020817;
              }
              input[type=range]::-moz-range-thumb {
                width: 22px; height: 22px; border-radius: 50%;
                background: linear-gradient(135deg, #3b82f6, #8b5cf6);
                cursor: pointer;
              }
            `}</style>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
            <span style={{ fontSize: 11, color: "#60a5fa" }}>← {leftV.version} · {leftV.label}</span>
            <span style={{ fontSize: 11, color: "#a78bfa" }}>{rightV.version} · {rightV.label} →</span>
          </div>
        </div>

        {/* ── Stats Bar ── */}
        <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
          {stats.map((s: StatItem) => (
            <div key={s.label} style={{
              display: "flex", alignItems: "center", gap: 8,
              background: "#0f172a", border: "1px solid #1e293b",
              borderRadius: 8, padding: "8px 16px",
            }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: s.color, boxShadow: `0 0 6px ${s.color}88` }} />
              <span style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.count}</span>
              <span style={{ fontSize: 12, color: "#475569" }}>{s.label}</span>
            </div>
          ))}

          <label style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, color: "#64748b" }}>
            <div
              onClick={() => setShowSame((prev) => !prev)}
              style={{
                width: 36, height: 20, borderRadius: 10,
                background: showSame ? "#3b82f6" : "#1e293b",
                position: "relative", cursor: "pointer", transition: "background 0.2s",
              }}
            >
              <div style={{
                position: "absolute", top: 3,
                left: showSame ? 18 : 3,
                width: 14, height: 14, borderRadius: "50%",
                background: "#fff", transition: "left 0.2s",
              }} />
            </div>
            Show unchanged fields
          </label>
        </div>

        {/* ── Version Cards ── */}
        <div style={{ display: "flex", gap: 16, marginBottom: 20 }}>
          <VersionCard v={leftV} isLeft />
          <VersionCard v={rightV} isRight />
        </div>

        {/* ── Diff Table ── */}
        <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 12, overflow: "hidden" }}>
          {/* Header Row */}
          <div style={{ display: "grid", gridTemplateColumns: "200px 1fr 1fr", background: "#070e1a", borderBottom: "2px solid #1e293b" }}>
            {(["Field", `${leftV.version} (Before)`, `${rightV.version} (After)`] as string[]).map((h, i) => (
              <div key={i} style={{
                padding: "10px 12px", fontSize: 11, fontWeight: 700,
                letterSpacing: "0.1em",
                color: i === 1 ? "#60a5fa" : i === 2 ? "#a78bfa" : "#475569",
                borderRight: i < 2 ? "1px solid #1e293b" : "none",
                textTransform: "uppercase" as const,
              }}>{h}</div>
            ))}
          </div>

          {/* Data Rows */}
          {allKeys.length === 0 ? (
            <div style={{ padding: 32, textAlign: "center", color: "#475569", fontSize: 14 }}>
              No differences found between these versions.
            </div>
          ) : (
            allKeys.map((k: string) => {
              const type = getType(k);
              return (
                <DiffRow
                  key={k}
                  label={k}
                  type={type}
                  valA={fa[k]}
                  valB={fb[k]}
                />
              );
            })
          )}
        </div>

        {!showSame && same.length > 0 && (
          <p style={{ textAlign: "center", marginTop: 12, fontSize: 12, color: "#334155" }}>
            {same.length} unchanged fields hidden · toggle above to show
          </p>
        )}
      </div>
    </div>
  );
}
