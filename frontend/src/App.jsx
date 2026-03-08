import { useState, useRef, useEffect, Component } from "react"
import axios from "axios"
import DrugSearch from "./components/DrugSearch"
import KnowledgeGraph from "./components/KnowledgeGraph"
import SafetyReport from "./components/SafetyReport"

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000"
const GRAPH_HEIGHT = 300

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener("resize", handler)
    return () => window.removeEventListener("resize", handler)
  }, [])
  return isMobile
}

class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }
  componentDidCatch(error, info) {
    console.error("SafetyReport crashed:", error, info)
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ background: "#0d1117", display: "flex", alignItems: "center", justifyContent: "center", color: "#ef4444", fontSize: 12, fontFamily: "IBM Plex Mono, monospace", padding: 24, textAlign: "center" }}>
          Render error: {this.state.error?.message}
        </div>
      )
    }
    return this.props.children
  }
}

export default function App() {
  const [report, setReport] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [selectedNode, setSelectedNode] = useState(null)
  const [graphWidth, setGraphWidth] = useState(0)
  const isMobile = useIsMobile()

  const graphSectionRef = useRef(null)
  const graphWrapperRef = useRef(null)
  const reportAnchorRef = useRef(null)
  const mobileContainerRef = useRef(null)

  // Measure graph wrapper width after mount
  useEffect(() => {
    if (!graphWrapperRef.current) return
    const measure = () => setGraphWidth(graphWrapperRef.current.offsetWidth)
    measure()
    window.addEventListener("resize", measure)
    return () => window.removeEventListener("resize", measure)
  }, [])

  const scrollToGraph = () => {
    if (!graphSectionRef.current) return
    const container = isMobile ? mobileContainerRef.current : window
    const top = graphSectionRef.current.getBoundingClientRect().top + (isMobile ? mobileContainerRef.current.scrollTop : window.scrollY)
    if (isMobile && mobileContainerRef.current) {
      mobileContainerRef.current.scrollTo({ top, behavior: "smooth" })
    } else {
      window.scrollTo({ top, behavior: "smooth" })
    }
  }

  const scrollToReport = () => {
    if (!reportAnchorRef.current) return
    const top = reportAnchorRef.current.getBoundingClientRect().top + (isMobile && mobileContainerRef.current ? mobileContainerRef.current.scrollTop : window.scrollY)
    if (isMobile && mobileContainerRef.current) {
      mobileContainerRef.current.scrollTo({ top, behavior: "smooth" })
    } else {
      window.scrollTo({ top, behavior: "smooth" })
    }
  }

  const handleAnalyze = async (selectedDrugs) => {
    setIsLoading(true)
    setError(null)
    setReport(null)
    setSelectedNode(null)

    if (isMobile) {
      setTimeout(scrollToGraph, 300)
    }

    try {
      const drugNames = selectedDrugs.map(d => d.name.toLowerCase()).join(",")
      const response = await axios.get(`${API_BASE}/api/graph/build`, {
        params: { drugs: drugNames }
      })
      setReport(response.data)
    } catch (err) {
      setError(
        err.response?.data?.detail ||
        "Something went wrong. Make sure the backend is running."
      )
    } finally {
      setIsLoading(false)
    }
  }

  const handleNodeClick = (node) => setSelectedNode(node)

  // ── DESKTOP LAYOUT ──────────────────────────────────────────────────
  if (!isMobile) {
    return (
      <div style={{ display: "flex", height: "100vh", width: "100vw", overflow: "hidden", background: "#0a0a0f" }}>
        <DrugSearch onAnalyze={handleAnalyze} isLoading={isLoading} />

        <div style={{ flex: 1, position: "relative", display: "flex", flexDirection: "column", minWidth: 0 }}>
          <div style={{ height: 48, borderBottom: "1px solid #1e293b", display: "flex", alignItems: "center", padding: "0 20px", justifyContent: "space-between", flexShrink: 0 }}>
            <div style={{ fontSize: 11, color: "#334155", fontFamily: "'IBM Plex Mono'" }}>INTERACTION GRAPH</div>
            {report && <div style={{ fontSize: 11, color: "#475569", fontFamily: "'IBM Plex Mono'" }}>{report.nodes.length} nodes · {report.edges.length} edges</div>}
          </div>

          {error && (
            <div style={{ position: "absolute", top: 64, left: "50%", transform: "translateX(-50%)", background: "rgba(239, 68, 68, 0.1)", border: "1px solid #ef444433", borderRadius: 6, padding: "10px 16px", fontSize: 12, color: "#ef4444", fontFamily: "'IBM Plex Mono'", zIndex: 20, maxWidth: 400, textAlign: "center" }}>
              {error}
            </div>
          )}

          {selectedNode && (
            <div style={{ position: "absolute", bottom: 20, left: "50%", transform: "translateX(-50%)", background: "#0d1117", border: "1px solid #1e293b", borderRadius: 6, padding: "12px 16px", zIndex: 20, display: "flex", alignItems: "center", gap: 12 }}>
              <div>
                <div style={{ fontSize: 13, color: "#e2e8f0", fontWeight: 500 }}>{selectedNode.name.charAt(0).toUpperCase() + selectedNode.name.slice(1)}</div>
                {selectedNode.hasBoxedWarning && <div style={{ fontSize: 10, color: "#ef4444", fontFamily: "'IBM Plex Mono'", marginTop: 3 }}>FDA BOXED WARNING</div>}
              </div>
              <button onClick={() => setSelectedNode(null)} style={{ background: "none", border: "none", color: "#475569", cursor: "pointer", fontSize: 14 }}>x</button>
            </div>
          )}

          <KnowledgeGraph nodes={report?.nodes || []} edges={report?.edges || []} onNodeClick={handleNodeClick} />
        </div>

        <ErrorBoundary>
          <SafetyReport report={report} isLoading={isLoading} />
        </ErrorBoundary>
      </div>
    )
  }

  // ── MOBILE LAYOUT ───────────────────────────────────────────────────
  return (
    <div
      ref={mobileContainerRef}
      style={{ display: "flex", flexDirection: "column", minHeight: "100vh", background: "#0a0a0f", overflowX: "hidden", overflowY: "scroll" }}
    >
      {/* Section 1 — Drug Search */}
      <div style={{ width: "100%", borderBottom: "1px solid #1e293b" }}>
        <DrugSearch onAnalyze={handleAnalyze} isLoading={isLoading} isMobile={true} />
      </div>

      {/* Section 2 — Graph */}
      <div ref={graphSectionRef} style={{ width: "100%", background: "#0a0a0f" }}>
        <div style={{ height: 40, borderBottom: "1px solid #1e293b", borderTop: "1px solid #1e293b", display: "flex", alignItems: "center", padding: "0 16px", justifyContent: "space-between" }}>
          <div style={{ fontSize: 11, color: "#334155", fontFamily: "'IBM Plex Mono'" }}>INTERACTION GRAPH</div>
          {report && <div style={{ fontSize: 11, color: "#475569", fontFamily: "'IBM Plex Mono'" }}>{report.nodes.length} nodes · {report.edges.length} edges</div>}
        </div>

        {error && (
          <div style={{ margin: 16, background: "rgba(239, 68, 68, 0.1)", border: "1px solid #ef444433", borderRadius: 6, padding: "10px 16px", fontSize: 12, color: "#ef4444", fontFamily: "'IBM Plex Mono'", textAlign: "center" }}>
            {error}
          </div>
        )}

        {/* Graph wrapper — explicit pixel dimensions fed directly to ForceGraph */}
        <div ref={graphWrapperRef} style={{ width: "100%", height: GRAPH_HEIGHT, position: "relative", overflow: "hidden", pointerEvents: "none", touchAction: "pan-y" }}>
          <KnowledgeGraph
            nodes={report?.nodes || []}
            edges={report?.edges || []}
            onNodeClick={handleNodeClick}
            graphWidth={graphWidth || window.innerWidth}
            graphHeight={GRAPH_HEIGHT}
          />
        </div>

        {/* Arrow below graph */}
        {(isLoading || report) && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "14px 0", gap: 8, borderTop: "1px solid #1e293b", borderBottom: "1px solid #1e293b", background: "#0a0a0f" }}>
            <div style={{ fontSize: 10, color: "#475569", fontFamily: "'IBM Plex Mono'", letterSpacing: "0.12em" }}>SAFETY REPORT BELOW</div>
            <button
              onClick={scrollToReport}
              style={{ background: "#0d1117", border: "1px solid #38bdf8", borderRadius: "50%", width: 44, height: 44, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#38bdf8", fontSize: 20, boxShadow: "0 0 16px rgba(56,189,248,0.2)" }}
            >
              ↓
            </button>
          </div>
        )}
      </div>

      {/* Anchor at top of safety report */}
      <div ref={reportAnchorRef} style={{ height: 0 }} />

      {/* Section 3 — Safety Report */}
      <div style={{ width: "100%", background: "#0d1117" }}>
        <ErrorBoundary>
          <SafetyReport report={report} isLoading={isLoading} isMobile={true} />
        </ErrorBoundary>
      </div>
    </div>
  )
}