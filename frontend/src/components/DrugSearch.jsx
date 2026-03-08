import { useState, useEffect, useRef } from "react"
import axios from "axios"

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000"

const SEVERITY_COLORS = {
  contraindicated: "#ef4444",
  major: "#f97316",
  moderate: "#eab308",
  minor: "#22c55e",
  unknown: "#64748b"
}

export default function DrugSearch({ onAnalyze, isLoading }) {
  const [query, setQuery] = useState("")
  const [suggestions, setSuggestions] = useState([])
  const [selectedDrugs, setSelectedDrugs] = useState([])
  const [showDropdown, setShowDropdown] = useState(false)
  const debounceRef = useRef(null)

  useEffect(() => {
    if (query.length < 4) {
      setSuggestions([])
      setShowDropdown(false)
      return
    }

    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await axios.get(`${API_BASE}/api/drugs/search`, {
          params: { query }
        })
        setSuggestions(res.data.results || [])
        setShowDropdown(true)
      } catch (err) {
        setSuggestions([])
      }
    }, 300)

    return () => clearTimeout(debounceRef.current)
  }, [query])

  const handleSelect = (drug) => {
    if (selectedDrugs.find(d => d.rxcui === drug.rxcui)) return
    if (selectedDrugs.length >= 6) return
    setSelectedDrugs(prev => [...prev, drug])
    setQuery("")
    setSuggestions([])
    setShowDropdown(false)
  }

  const handleRemove = (rxcui) => {
    setSelectedDrugs(prev => prev.filter(d => d.rxcui !== rxcui))
  }

  const handleAnalyze = () => {
    if (selectedDrugs.length < 2) return
    onAnalyze(selectedDrugs)
  }

  return (
    <div style={{
      width: 280,
      minWidth: 280,
      background: "#0d1117",
      borderRight: "1px solid #1e293b",
      display: "flex",
      flexDirection: "column",
      padding: 24,
      gap: 20,
      height: "100vh",
      overflowY: "auto"
    }}>
      {/* Header */}
      <div>
        <div style={{
          color: "#38bdf8",
          fontSize: 10,
          letterSpacing: "0.2em",
          marginBottom: 6,
          fontFamily: "'IBM Plex Mono'"
        }}>
          DRUG INTERACTION ANALYZER
        </div>
        <div style={{
          fontSize: 18,
          fontWeight: 600,
          color: "#f1f5f9",
          lineHeight: 1.3
        }}>
          Select Drugs to Analyze
        </div>
        <div style={{
          fontSize: 12,
          color: "#475569",
          marginTop: 6
        }}>
          Add 2 to 6 drugs to check for interactions
        </div>
      </div>

      {/* Search input */}
      <div style={{ position: "relative" }}>
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Type a drug name..."
          style={{
            width: "100%",
            background: "#0a0a0f",
            border: "1px solid #1e293b",
            borderRadius: 6,
            padding: "10px 14px",
            color: "#e2e8f0",
            fontSize: 13,
            fontFamily: "'IBM Plex Sans'",
            outline: "none"
          }}
          onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
          onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
        />

        {/* Dropdown */}
        {showDropdown && suggestions.length > 0 && (
          <div style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            background: "#0d1117",
            border: "1px solid #1e293b",
            borderRadius: 6,
            marginTop: 4,
            zIndex: 100,
            maxHeight: 200,
            overflowY: "auto"
          }}>
            {suggestions.map((drug, i) => (
              <div
                key={drug.rxcui}
                onMouseDown={() => handleSelect(drug)}
                style={{
                  padding: "10px 14px",
                  cursor: "pointer",
                  fontSize: 13,
                  borderBottom: i < suggestions.length - 1 ? "1px solid #0f172a" : "none",
                  color: "#cbd5e1"
                }}
                onMouseEnter={e => e.currentTarget.style.background = "#1e293b"}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}
              >
                {drug.name}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Selected drug tags */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {selectedDrugs.length === 0 ? (
          <div style={{
            fontSize: 12,
            color: "#334155",
            fontFamily: "'IBM Plex Mono'",
            padding: "12px 0"
          }}>
            No drugs selected yet
          </div>
        ) : (
          selectedDrugs.map(drug => (
            <div
              key={drug.rxcui}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                background: "#0a0a0f",
                border: "1px solid #1e293b",
                borderRadius: 6,
                padding: "8px 12px"
              }}
            >
              <div>
                <div style={{ fontSize: 13, color: "#e2e8f0" }}>{drug.name}</div>
                <div style={{
                  fontSize: 10,
                  color: "#475569",
                  fontFamily: "'IBM Plex Mono'",
                  marginTop: 2
                }}>
                  RxCUI: {drug.rxcui}
                </div>
              </div>
              <button
                onClick={() => handleRemove(drug.rxcui)}
                style={{
                  background: "none",
                  border: "none",
                  color: "#475569",
                  cursor: "pointer",
                  fontSize: 16,
                  padding: "0 4px",
                  lineHeight: 1
                }}
              >
                x
              </button>
            </div>
          ))
        )}
      </div>

      {/* Analyze button */}
      <div style={{ marginTop: "auto" }}>
        {selectedDrugs.length < 2 && (
          <div style={{
            fontSize: 11,
            color: "#475569",
            marginBottom: 10,
            fontFamily: "'IBM Plex Mono'"
          }}>
            Add at least 2 drugs to analyze
          </div>
        )}
        <button
          onClick={handleAnalyze}
          disabled={selectedDrugs.length < 2 || isLoading}
          style={{
            width: "100%",
            padding: "12px",
            background: selectedDrugs.length >= 2 && !isLoading ? "#0c4a6e" : "#0f172a",
            border: `1px solid ${selectedDrugs.length >= 2 && !isLoading ? "#38bdf8" : "#1e293b"}`,
            borderRadius: 6,
            color: selectedDrugs.length >= 2 && !isLoading ? "#38bdf8" : "#334155",
            fontSize: 13,
            fontFamily: "'IBM Plex Mono'",
            cursor: selectedDrugs.length >= 2 && !isLoading ? "pointer" : "not-allowed",
            letterSpacing: "0.1em",
            transition: "all 0.15s"
          }}
        >
          {isLoading ? "ANALYZING..." : "ANALYZE INTERACTIONS"}
        </button>
      </div>
    </div>
  )
}