import { useState } from "react"

const SEVERITY_COLORS = {
  contraindicated: "#ef4444",
  major: "#f97316",
  moderate: "#eab308",
  minor: "#22c55e",
  unknown: "#475569"
}

const SEVERITY_BG = {
  contraindicated: "rgba(239, 68, 68, 0.08)",
  major: "rgba(249, 115, 22, 0.08)",
  moderate: "rgba(234, 179, 8, 0.08)",
  minor: "rgba(34, 197, 94, 0.08)",
  unknown: "rgba(71, 85, 105, 0.08)"
}

const SEVERITY_ORDER = ["contraindicated", "major", "moderate", "minor", "unknown"]

function CitationCard({ citation }) {
  return (
    <div
      onClick={() => window.open(citation.url, "_blank")}
      style={{
        background: "#0d1117",
        border: "1px solid #1e293b",
        borderRadius: 4,
        padding: "10px 12px",
        cursor: "pointer",
        marginBottom: 6
      }}
    >
      <div style={{ fontSize: 12, color: "#38bdf8", lineHeight: 1.5, marginBottom: 4 }}>
        {citation.title}
      </div>
      <div style={{ fontSize: 11, color: "#334155", fontFamily: "IBM Plex Mono, monospace" }}>
        PubMed {citation.pmid} · {citation.year}
      </div>
    </div>
  )
}

function InteractionCard({ interaction }) {
  const [expanded, setExpanded] = useState(false)
  const color = SEVERITY_COLORS[interaction.severity] || SEVERITY_COLORS.unknown
  const bg = SEVERITY_BG[interaction.severity] || SEVERITY_BG.unknown

  return (
    <div style={{ border: "1px solid " + color + "33", borderRadius: 6, overflow: "hidden", marginBottom: 8 }}>
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          padding: "12px 16px",
          background: bg,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: color, flexShrink: 0 }} />
          <div style={{ fontSize: 13, color: "#e2e8f0", fontWeight: 500 }}>
            {interaction.drug_a.charAt(0).toUpperCase() + interaction.drug_a.slice(1)}
            {" + "}
            {interaction.drug_b.charAt(0).toUpperCase() + interaction.drug_b.slice(1)}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ fontSize: 10, color: color, fontFamily: "IBM Plex Mono, monospace", letterSpacing: "0.1em", textTransform: "uppercase" }}>
            {interaction.severity}
          </div>
          <div style={{ color: "#475569", fontSize: 12, transform: expanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>
            v
          </div>
        </div>
      </div>

      {expanded && (
        <div style={{ padding: "16px", background: "#0a0a0f", borderTop: "1px solid " + color + "22", display: "flex", flexDirection: "column", gap: 14 }}>

          {interaction.mechanism && (
            <div>
              <div style={{ fontSize: 10, color: "#475569", fontFamily: "IBM Plex Mono, monospace", letterSpacing: "0.12em", marginBottom: 6 }}>
                MECHANISM
              </div>
              <div style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.7 }}>
                {interaction.mechanism}
              </div>
            </div>
          )}

          {interaction.clinical_significance && (
            <div>
              <div style={{ fontSize: 10, color: "#475569", fontFamily: "IBM Plex Mono, monospace", letterSpacing: "0.12em", marginBottom: 6 }}>
                CLINICAL SIGNIFICANCE
              </div>
              <div style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.7 }}>
                {interaction.clinical_significance}
              </div>
            </div>
          )}

          {interaction.monitoring && (
            <div>
              <div style={{ fontSize: 10, color: "#475569", fontFamily: "IBM Plex Mono, monospace", letterSpacing: "0.12em", marginBottom: 6 }}>
                MONITORING
              </div>
              <div style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.7 }}>
                {interaction.monitoring}
              </div>
            </div>
          )}

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ fontSize: 10, color: "#475569", fontFamily: "IBM Plex Mono, monospace", letterSpacing: "0.12em" }}>
              CONFIDENCE
            </div>
            <div style={{
              fontSize: 10,
              fontFamily: "IBM Plex Mono, monospace",
              textTransform: "uppercase",
              color: interaction.confidence === "high" ? "#22c55e" : interaction.confidence === "medium" ? "#eab308" : "#64748b"
            }}>
              {interaction.confidence}
            </div>
          </div>

          {interaction.citations && interaction.citations.length > 0 && (
            <div>
              <div style={{ fontSize: 10, color: "#475569", fontFamily: "IBM Plex Mono, monospace", letterSpacing: "0.12em", marginBottom: 8 }}>
                CITATIONS
              </div>
              {interaction.citations.map(citation => (
                <CitationCard key={citation.pmid} citation={citation} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function SafetyReport({ report, isLoading }) {
  if (isLoading) {
    return (
      <div style={{ width: 340, minWidth: 340, background: "#0d1117", borderLeft: "1px solid #1e293b", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16, height: "100vh" }}>
        <div style={{ width: 32, height: 32, border: "2px solid #1e293b", borderTopColor: "#38bdf8", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        <style>{"@keyframes spin { to { transform: rotate(360deg); } }"}</style>
        <div style={{ fontSize: 11, color: "#475569", fontFamily: "IBM Plex Mono, monospace" }}>
          ANALYZING INTERACTIONS...
        </div>
      </div>
    )
  }

  if (!report) {
    return (
      <div style={{ width: 340, minWidth: 340, background: "#0d1117", borderLeft: "1px solid #1e293b", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12, height: "100vh" }}>
        <div style={{ fontSize: 12, color: "#334155", fontFamily: "IBM Plex Mono, monospace", textAlign: "center", padding: "0 24px", lineHeight: 1.8 }}>
          Safety report will appear here after analysis
        </div>
      </div>
    )
  }

  const hasInteractions = report.total_interactions > 0

  return (
    <div style={{ width: 340, minWidth: 340, background: "#0d1117", borderLeft: "1px solid #1e293b", display: "flex", flexDirection: "column", height: "100vh", overflowY: "auto" }}>
      <div style={{ padding: "24px 20px 16px", borderBottom: "1px solid #1e293b", flexShrink: 0 }}>
        <div style={{ fontSize: 10, color: "#38bdf8", fontFamily: "IBM Plex Mono, monospace", letterSpacing: "0.2em", marginBottom: 6 }}>
          SAFETY REPORT
        </div>
        <div style={{ fontSize: 16, fontWeight: 600, color: "#f1f5f9", marginBottom: 12 }}>
          {report.drugs.map(d => d.charAt(0).toUpperCase() + d.slice(1)).join(", ")}
        </div>

        <div style={{ display: "flex", gap: 16, marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 600, color: hasInteractions ? "#f97316" : "#22c55e", fontFamily: "IBM Plex Mono, monospace" }}>
              {report.total_interactions}
            </div>
            <div style={{ fontSize: 10, color: "#475569", fontFamily: "IBM Plex Mono, monospace" }}>INTERACTIONS</div>
          </div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 600, color: "#e2e8f0", fontFamily: "IBM Plex Mono, monospace" }}>
              {report.drug_count}
            </div>
            <div style={{ fontSize: 10, color: "#475569", fontFamily: "IBM Plex Mono, monospace" }}>DRUGS</div>
          </div>
        </div>

        {report.summary && (
          <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.7, padding: "12px", background: "#0a0a0f", borderRadius: 6, border: "1px solid #1e293b" }}>
            {report.summary}
          </div>
        )}
      </div>

      <div style={{ padding: "16px 20px", flex: 1 }}>
        {SEVERITY_ORDER.map(severity => {
          const interactions = report.interactions_by_severity[severity] || []
          if (interactions.length === 0) return null
          return (
            <div key={severity} style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 10, color: SEVERITY_COLORS[severity], fontFamily: "IBM Plex Mono, monospace", letterSpacing: "0.15em", marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 16, height: 1.5, background: SEVERITY_COLORS[severity] }} />
                {severity.toUpperCase()} ({interactions.length})
              </div>
              {interactions.map((interaction, i) => (
                <InteractionCard key={i} interaction={interaction} />
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}