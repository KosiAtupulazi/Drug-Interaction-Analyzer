import { useState, useEffect, useRef } from "react"
import axios from "axios"

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000"

const PRESETS = [
  {
    id: "bleeding",
    label: "Bleeding Risk",
    tag: "ANTICOAGULANT",
    tagColor: "#ef4444",
    drugs: [
      { name: "Warfarin", rxcui: "11289" },
      { name: "Aspirin", rxcui: "1191" },
      { name: "Ibuprofen", rxcui: "5640" }
    ],
    description: "Additive anticoagulant effects"
  },
  {
    id: "serotonin",
    label: "Serotonin Syndrome",
    tag: "CNS",
    tagColor: "#f97316",
    drugs: [
      { name: "Sertraline", rxcui: "36437" },
      { name: "Tramadol", rxcui: "41493" },
      { name: "Linezolid", rxcui: "190376" }
    ],
    description: "Dangerous serotonergic excess"
  },
  {
    id: "cyp3a4",
    label: "CYP3A4 Inhibition",
    tag: "METABOLIC",
    tagColor: "#eab308",
    drugs: [
      { name: "Atorvastatin", rxcui: "83367" },
      { name: "Clarithromycin", rxcui: "21212" },
      { name: "Diltiazem", rxcui: "3443" }
    ],
    description: "Enzyme competition, statin toxicity"
  },
  {
    id: "diabetes",
    label: "Diabetic Imaging Risk",
    tag: "RENAL",
    tagColor: "#22c55e",
    drugs: [
      { name: "Metformin", rxcui: "6809" },
      { name: "Ibuprofen", rxcui: "5640" },
      { name: "Lisinopril", rxcui: "29046" }
    ],
    description: "Lactic acidosis & renal stress"
  },
  {
    id: "cardiac",
    label: "Cardiac Risk",
    tag: "CARDIOVASCULAR",
    tagColor: "#38bdf8",
    drugs: [
      { name: "Digoxin", rxcui: "3407" },
      { name: "Amiodarone", rxcui: "703" },
      { name: "Metoprolol", rxcui: "41134" }
    ],
    description: "Bradycardia & arrhythmia risk"
  },
  {
    id: "nsaid",
    label: "NSAID Overload",
    tag: "GI RISK",
    tagColor: "#a855f7",
    drugs: [
      { name: "Aspirin", rxcui: "1191" },
      { name: "Ibuprofen", rxcui: "5640" },
      { name: "Naproxen", rxcui: "7258" }
    ],
    description: "GI bleeding & renal toxicity"
  }
]

export default function DrugSearch({ onAnalyze, isLoading }) {
  const [query, setQuery] = useState("")
  const [suggestions, setSuggestions] = useState([])
  const [selectedDrugs, setSelectedDrugs] = useState([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [activePreset, setActivePreset] = useState(null)
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
    setActivePreset(null)
    setQuery("")
    setSuggestions([])
    setShowDropdown(false)
  }

  const handleRemove = (rxcui) => {
    setSelectedDrugs(prev => prev.filter(d => d.rxcui !== rxcui))
    setActivePreset(null)
  }

  const handlePresetClick = (preset) => {
    setSelectedDrugs(preset.drugs)
    setActivePreset(preset.id)
    setQuery("")
    setSuggestions([])
    setShowDropdown(false)
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
            outline: "none",
            boxSizing: "border-box"
          }}
          onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
          onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
        />

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
      {selectedDrugs.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {selectedDrugs.map(drug => (
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
          ))}
        </div>
      )}

      {/* Quick select section */}
      <div>
        <div style={{
          fontSize: 10,
          color: "#475569",
          fontFamily: "'IBM Plex Mono'",
          letterSpacing: "0.15em",
          marginBottom: 10,
          display: "flex",
          alignItems: "center",
          gap: 8
        }}>
          <div style={{ flex: 1, height: 1, background: "#1e293b" }} />
          QUICK SELECT
          <div style={{ flex: 1, height: 1, background: "#1e293b" }} />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {PRESETS.map(preset => (
            <div
              key={preset.id}
              onClick={() => handlePresetClick(preset)}
              style={{
                background: activePreset === preset.id ? "#0f172a" : "#0a0a0f",
                border: `1px solid ${activePreset === preset.id ? preset.tagColor + "55" : "#1e293b"}`,
                borderRadius: 6,
                padding: "10px 12px",
                cursor: "pointer",
                transition: "all 0.15s"
              }}
              onMouseEnter={e => {
                if (activePreset !== preset.id) {
                  e.currentTarget.style.borderColor = preset.tagColor + "33"
                  e.currentTarget.style.background = "#0d1117"
                }
              }}
              onMouseLeave={e => {
                if (activePreset !== preset.id) {
                  e.currentTarget.style.borderColor = "#1e293b"
                  e.currentTarget.style.background = "#0a0a0f"
                }
              }}
            >
              <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 4
              }}>
                <div style={{ fontSize: 12, color: "#e2e8f0", fontWeight: 500 }}>
                  {preset.label}
                </div>
                <div style={{
                  fontSize: 9,
                  color: preset.tagColor,
                  fontFamily: "'IBM Plex Mono'",
                  letterSpacing: "0.08em",
                  background: preset.tagColor + "15",
                  padding: "2px 6px",
                  borderRadius: 3
                }}>
                  {preset.tag}
                </div>
              </div>
              <div style={{ fontSize: 11, color: "#475569", marginBottom: 6 }}>
                {preset.description}
              </div>
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                {preset.drugs.map(drug => (
                  <div key={drug.rxcui} style={{
                    fontSize: 10,
                    color: "#64748b",
                    background: "#0f172a",
                    border: "1px solid #1e293b",
                    borderRadius: 3,
                    padding: "2px 6px",
                    fontFamily: "'IBM Plex Mono'"
                  }}>
                    {drug.name}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Analyze button */}
      <div style={{ marginTop: "auto", paddingTop: 12 }}>
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