import { useState } from "react"
import axios from "axios"
import DrugSearch from "./components/DrugSearch"
import KnowledgeGraph from "./components/KnowledgeGraph"
import SafetyReport from "./components/SafetyReport"

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000"

export default function App() {
  const [report, setReport] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [selectedNode, setSelectedNode] = useState(null)

  const handleAnalyze = async (selectedDrugs) => {
    setIsLoading(true)
    setError(null)
    setReport(null)
    setSelectedNode(null)

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

  const handleNodeClick = (node) => {
    setSelectedNode(node)
  }

  return (
    <div style={{
      display: "flex",
      height: "100vh",
      width: "100vw",
      overflow: "hidden",
      background: "#0a0a0f"
    }}>

      {/* Left panel — drug search */}
      <DrugSearch
        onAnalyze={handleAnalyze}
        isLoading={isLoading}
      />

      {/* Center panel — knowledge graph */}
      <div style={{ flex: 1, position: "relative", display: "flex", flexDirection: "column" }}>

        {/* Top bar */}
        <div style={{
          height: 48,
          borderBottom: "1px solid #1e293b",
          display: "flex",
          alignItems: "center",
          padding: "0 20px",
          justifyContent: "space-between",
          flexShrink: 0
        }}>
          <div style={{
            fontSize: 11,
            color: "#334155",
            fontFamily: "'IBM Plex Mono'"
          }}>
            INTERACTION GRAPH
          </div>
          {report && (
            <div style={{
              fontSize: 11,
              color: "#475569",
              fontFamily: "'IBM Plex Mono'"
            }}>
              {report.nodes.length} nodes · {report.edges.length} edges
            </div>
          )}
        </div>

        {/* Error message */}
        {error && (
          <div style={{
            position: "absolute",
            top: 64,
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(239, 68, 68, 0.1)",
            border: "1px solid #ef444433",
            borderRadius: 6,
            padding: "10px 16px",
            fontSize: 12,
            color: "#ef4444",
            fontFamily: "'IBM Plex Mono'",
            zIndex: 20,
            maxWidth: 400,
            textAlign: "center"
          }}>
            {error}
          </div>
        )}

        {/* Node detail tooltip */}
        {selectedNode && (
          <div style={{
            position: "absolute",
            bottom: 20,
            left: "50%",
            transform: "translateX(-50%)",
            background: "#0d1117",
            border: "1px solid #1e293b",
            borderRadius: 6,
            padding: "12px 16px",
            zIndex: 20,
            display: "flex",
            alignItems: "center",
            gap: 12
          }}>
            <div>
              <div style={{
                fontSize: 13,
                color: "#e2e8f0",
                fontWeight: 500
              }}>
                {selectedNode.name.charAt(0).toUpperCase() + selectedNode.name.slice(1)}
              </div>
              {selectedNode.hasBoxedWarning && (
                <div style={{
                  fontSize: 10,
                  color: "#ef4444",
                  fontFamily: "'IBM Plex Mono'",
                  marginTop: 3
                }}>
                  FDA BOXED WARNING
                </div>
              )}
            </div>
            <button
              onClick={() => setSelectedNode(null)}
              style={{
                background: "none",
                border: "none",
                color: "#475569",
                cursor: "pointer",
                fontSize: 14
              }}
            >
              x
            </button>
          </div>
        )}

        <KnowledgeGraph
          nodes={report?.nodes || []}
          edges={report?.edges || []}
          onNodeClick={handleNodeClick}
        />
      </div>

      {/* Right panel — safety report */}
      <SafetyReport
        report={report}
        isLoading={isLoading}
      />
    </div>
  )
}
