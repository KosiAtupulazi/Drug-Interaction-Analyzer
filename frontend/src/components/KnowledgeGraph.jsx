import { useRef, useEffect, useCallback, useState } from "react"
import ForceGraph2D from "react-force-graph-2d"

const SEVERITY_COLORS = {
  contraindicated: "#ef4444",
  major: "#f97316",
  moderate: "#eab308",
  minor: "#22c55e",
  unknown: "#475569"
}

export default function KnowledgeGraph({ nodes, edges, onNodeClick, graphWidth, graphHeight }) {
  const graphRef = useRef()

  const graphData = {
    nodes: nodes.map(n => ({
      id: n.id,
      name: n.id,
      hasBoxedWarning: n.has_boxed_warning,
      val: 8
    })),
    links: edges.map(e => ({
      source: e.source,
      target: e.target,
      severity: e.severity,
      confirmed: e.confirmed
    }))
  }

  useEffect(() => {
    if (graphRef.current && nodes.length > 0) {
      setTimeout(() => {
        graphRef.current.zoomToFit(400, 40)
      }, 600)
    }
  }, [nodes, edges, graphWidth, graphHeight])

  const nodeCanvasObject = useCallback((node, ctx, globalScale) => {
    const radius = 12
    const label = node.name.charAt(0).toUpperCase() + node.name.slice(1)

    if (node.hasBoxedWarning) {
      ctx.beginPath()
      ctx.arc(node.x, node.y, radius + 4, 0, 2 * Math.PI)
      ctx.fillStyle = "rgba(239, 68, 68, 0.15)"
      ctx.fill()
    }

    ctx.beginPath()
    ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI)
    ctx.fillStyle = node.hasBoxedWarning ? "#1a0a0a" : "#0d1117"
    ctx.fill()
    ctx.strokeStyle = node.hasBoxedWarning ? "#ef4444" : "#38bdf8"
    ctx.lineWidth = node.hasBoxedWarning ? 2 : 1.5
    ctx.stroke()

    ctx.font = `500 ${Math.max(10 / globalScale, 4)}px IBM Plex Sans`
    ctx.fillStyle = "#e2e8f0"
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"
    ctx.fillText(label, node.x, node.y)

    if (node.hasBoxedWarning) {
      ctx.beginPath()
      ctx.arc(node.x + radius - 3, node.y - radius + 3, 4, 0, 2 * Math.PI)
      ctx.fillStyle = "#ef4444"
      ctx.fill()
    }
  }, [])

  const linkColor = useCallback((link) => {
    return SEVERITY_COLORS[link.severity] || SEVERITY_COLORS.unknown
  }, [])

  const linkWidth = useCallback((link) => {
    if (link.severity === "contraindicated") return 3
    if (link.severity === "major") return 2.5
    if (link.severity === "moderate") return 2
    return 1.5
  }, [])

  const linkDashArray = useCallback((link) => {
    return link.confirmed ? null : [4, 4]
  }, [])

  if (nodes.length === 0) {
    return (
      <div style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        gap: 12,
        background: "#0a0a0f"
      }}>
        <div style={{
          width: 48, height: 48,
          border: "1px solid #1e293b",
          borderRadius: "50%",
          display: "flex", alignItems: "center", justifyContent: "center"
        }}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <circle cx="5" cy="10" r="2.5" stroke="#334155" strokeWidth="1.5"/>
            <circle cx="15" cy="5" r="2.5" stroke="#334155" strokeWidth="1.5"/>
            <circle cx="15" cy="15" r="2.5" stroke="#334155" strokeWidth="1.5"/>
            <line x1="7.5" y1="10" x2="12.5" y2="5" stroke="#334155" strokeWidth="1.5"/>
            <line x1="7.5" y1="10" x2="12.5" y2="15" stroke="#334155" strokeWidth="1.5"/>
          </svg>
        </div>
        <div style={{ fontSize: 12, color: "#334155", fontFamily: "IBM Plex Mono, monospace" }}>
          Graph will appear here
        </div>
      </div>
    )
  }

  return (
    <div style={{ width: "100%", height: "100%", position: "relative", background: "#0a0a0f", overflow: "hidden" }}>
      <div style={{
        position: "absolute", top: 16, left: 16, zIndex: 10,
        background: "rgba(13, 17, 23, 0.9)", border: "1px solid #1e293b",
        borderRadius: 6, padding: "10px 14px",
        display: "flex", flexDirection: "column", gap: 6
      }}>
        {Object.entries(SEVERITY_COLORS).map(([severity, color]) => (
          <div key={severity} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, fontFamily: "IBM Plex Mono, monospace", color: "#94a3b8" }}>
            <div style={{ width: 20, height: 2, background: color, borderRadius: 1 }} />
            {severity}
          </div>
        ))}
        <div style={{ borderTop: "1px solid #1e293b", marginTop: 4, paddingTop: 6, fontSize: 11, fontFamily: "IBM Plex Mono, monospace", color: "#475569", display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#ef4444" }} />
          boxed warning
        </div>
      </div>

      <ForceGraph2D
        ref={graphRef}
        width={graphWidth || 400}
        height={graphHeight || 300}
        graphData={graphData}
        nodeCanvasObject={nodeCanvasObject}
        nodeCanvasObjectMode={() => "replace"}
        linkColor={linkColor}
        linkWidth={linkWidth}
        linkLineDash={linkDashArray}
        linkCanvasObjectMode={() => "after"}
        linkCanvasObject={(link, ctx) => {
          if (!link.source.x) return
          ctx.beginPath()
          ctx.moveTo(link.source.x, link.source.y)
          ctx.lineTo(link.target.x, link.target.y)
          ctx.strokeStyle = (SEVERITY_COLORS[link.severity] || SEVERITY_COLORS.unknown) + "44"
          ctx.lineWidth = 6
          ctx.stroke()
        }}
        onNodeClick={(node) => onNodeClick && onNodeClick(node)}
        backgroundColor="#0a0a0f"
        linkDirectionalParticles={2}
        linkDirectionalParticleWidth={link =>
          link.severity === "contraindicated" ? 3 :
          link.severity === "major" ? 2.5 : 0
        }
        linkDirectionalParticleColor={linkColor}
        cooldownTicks={100}
        nodeRelSize={6}
      />
    </div>
  )
}