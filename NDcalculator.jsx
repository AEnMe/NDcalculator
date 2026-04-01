import { useState, useCallback } from "react";

// ─── DATA ────────────────────────────────────────────────────────────────────

const SHUTTER_SPEEDS = [
  { label: "1/8000", value: 1/8000 },
  { label: "1/4000", value: 1/4000 },
  { label: "1/2000", value: 1/2000 },
  { label: "1/1000", value: 1/1000 },
  { label: "1/500",  value: 1/500  },
  { label: "1/250",  value: 1/250  },
  { label: "1/125",  value: 1/125  },
  { label: "1/60",   value: 1/60   },
  { label: "1/30",   value: 1/30   },
  { label: "1/15",   value: 1/15   },
  { label: "1/8",    value: 1/8    },
  { label: "1/4",    value: 1/4    },
  { label: "1/2",    value: 1/2    },
  { label: "1\"",    value: 1      },
  { label: "2\"",    value: 2      },
  { label: "4\"",    value: 4      },
  { label: "8\"",    value: 8      },
  { label: "15\"",   value: 15     },
  { label: "30\"",   value: 30     },
];

const ND_FILTERS = [
  { label: "ND2",    stops: 1   },
  { label: "ND4",    stops: 2   },
  { label: "ND8",    stops: 3   },
  { label: "ND16",   stops: 4   },
  { label: "ND32",   stops: 5   },
  { label: "ND64",   stops: 6   },
  { label: "ND400",  stops: 8.6 },
  { label: "ND1000", stops: 10  },
  { label: "ND4000", stops: 12  },
  { label: "ND6400", stops: 13  },
];

const RECIPROCITY = {
  none:     { label: "Off (digital)",     fn: t => t },
  hp5:      { label: "Ilford HP5+",      fn: t => t < 1 ? t : Math.pow(t, 1.31) },
  fp4:      { label: "Ilford FP4+",      fn: t => t < 1 ? t : Math.pow(t, 1.26) },
  delta400: { label: "Ilford Delta 400", fn: t => t < 1 ? t : Math.pow(t, 1.41) },
  portra:   { label: "Kodak Portra 400", fn: t => t < 1 ? t : t * Math.pow(t, 0.35) },
  ektar:    { label: "Kodak Ektar 100",  fn: t => t < 1 ? t : t * Math.pow(t, 0.40) },
};

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function formatTime(seconds) {
  if (seconds < 1) return `1/${Math.round(1 / seconds)}s`;
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  if (seconds < 3600) {
    const m = Math.floor(seconds / 60);
    const s = Math.round(seconds % 60);
    return s > 0 ? `${m}m ${s}s` : `${m}m`;
  }
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function calcTotalNDStops(filterCounts) {
  return Object.entries(filterCounts).reduce(
    (sum, [stops, count]) => sum + parseFloat(stops) * count, 0
  );
}

// ─── COMPONENTS ───────────────────────────────────────────────────────────────

function StopsBar({ stops }) {
  const pct = Math.min(100, (stops / 20) * 100);
  return (
    <div style={{ margin: "8px 0" }}>
      <div style={{ height: "6px", background: "#1a1a1a", borderRadius: "3px", overflow: "hidden", border: "1px solid #333" }}>
        <div style={{
          height: "100%", width: `${pct}%`,
          background: "linear-gradient(90deg, #c8832a, #e8a94a)",
          borderRadius: "3px", transition: "width 0.4s cubic-bezier(.4,0,.2,1)"
        }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: "4px", color: "#555", fontSize: "10px" }}>
        {[0, 5, 10, 15, 20].map(v => <span key={v}>{v}</span>)}
      </div>
    </div>
  );
}

function NDButton({ nd, count, onInc, onDec }) {
  const active = count > 0;
  const btnBase = {
    background: "#1a1a1a", border: "1px solid #333", color: "#c8832a",
    width: "20px", height: "20px", cursor: "pointer", fontFamily: "inherit",
    fontSize: "14px", borderRadius: "2px", padding: 0,
    display: "flex", alignItems: "center", justifyContent: "center",
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
      <button onClick={onInc} style={{
        width: "100%",
        background: active ? "#c8832a" : "#141414",
        border: active ? "1px solid #e8a94a" : "1px solid #2a2a2a",
        color: active ? "#0d0d0d" : "#888",
        fontFamily: "inherit", fontSize: "11px",
        padding: "8px 4px", cursor: "pointer", borderRadius: "2px",
        transition: "all 0.15s", fontWeight: active ? "bold" : "normal",
        display: "flex", flexDirection: "column", alignItems: "center", gap: "2px",
      }}>
        <span>{nd.label}</span>
        <span style={{ fontSize: "9px", opacity: 0.8 }}>{nd.stops}ev</span>
      </button>
      {active && (
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <button onClick={onDec} style={btnBase}>−</button>
          <span style={{ color: "#f0e6d3", fontSize: "12px", minWidth: "20px", textAlign: "center" }}>
            ×{count}
          </span>
          <button onClick={onInc} style={btnBase}>+</button>
        </div>
      )}
    </div>
  );
}

// ─── APP ──────────────────────────────────────────────────────────────────────

export default function ExposureCalc() {
  const [baseShutter, setBaseShutter]     = useState(1 / 100);
  const [filterCounts, setFilterCounts]   = useState({});
  const [reciprocityKey, setReciprocityKey] = useState("none");
  const [manualStops, setManualStops]     = useState("");

  const inc = useCallback((stops) =>
    setFilterCounts(p => ({ ...p, [stops]: (p[stops] || 0) + 1 })), []);

  const dec = useCallback((stops) =>
    setFilterCounts(p => {
      const n = { ...p };
      if ((n[stops] || 0) <= 1) delete n[stops]; else n[stops]--;
      return n;
    }), []);

  const totalNDStops = calcTotalNDStops(filterCounts);
  const manualNum    = parseFloat(manualStops) || 0;
  const totalStops   = totalNDStops + manualNum;
  const rawResult    = baseShutter * Math.pow(2, totalStops);
  const finalResult  = RECIPROCITY[reciprocityKey].fn(rawResult);
  const delta        = finalResult - rawResult;
  const activeNDs    = ND_FILTERS.filter(nd => (filterCounts[nd.stops] || 0) > 0);

  const sel = {
    width: "100%", background: "#141414", border: "1px solid #2a2a2a",
    color: "#f0e6d3", padding: "10px 12px", fontFamily: "inherit",
    fontSize: "13px", cursor: "pointer", outline: "none",
    appearance: "none", borderRadius: "2px",
  };

  return (
    <div style={{
      minHeight: "100vh", background: "#0d0d0d", color: "#d4c5a9",
      fontFamily: "'Courier New', Courier, monospace",
      display: "flex", alignItems: "flex-start", justifyContent: "center",
      padding: "32px 16px",
    }}>
      <div style={{ width: "100%", maxWidth: "520px" }}>

        {/* Header */}
        <div style={{ marginBottom: "32px" }}>
          <div style={{ color: "#c8832a", fontSize: "10px", letterSpacing: "4px", marginBottom: "6px" }}>
            ◈ LONG EXPOSURE
          </div>
          <h1 style={{ margin: 0, fontSize: "28px", fontWeight: 400, color: "#f0e6d3", letterSpacing: "1px" }}>
            CALCULATOR
          </h1>
          <div style={{ height: "1px", background: "linear-gradient(90deg, #c8832a44, transparent)", marginTop: "10px" }} />
        </div>

        {/* 01 Base shutter */}
        <section style={{ marginBottom: "28px" }}>
          <label style={{ fontSize: "10px", letterSpacing: "3px", color: "#888", display: "block", marginBottom: "10px" }}>
            01 — BASE SHUTTER SPEED
          </label>
          <select value={baseShutter} onChange={e => setBaseShutter(parseFloat(e.target.value))} style={sel}>
            {SHUTTER_SPEEDS.map(s => <option key={s.label} value={s.value}>{s.label}</option>)}
          </select>
        </section>

        {/* 02 ND Filters */}
        <section style={{ marginBottom: "28px" }}>
          <label style={{ fontSize: "10px", letterSpacing: "3px", color: "#888", display: "block", marginBottom: "10px" }}>
            02 — ND FILTERS
            <span style={{ color: "#555", marginLeft: "8px", fontSize: "9px" }}>TAP TO ADD · STACK WITH +/−</span>
          </label>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "6px" }}>
            {ND_FILTERS.map(nd => (
              <NDButton key={nd.label} nd={nd}
                count={filterCounts[nd.stops] || 0}
                onInc={() => inc(nd.stops)}
                onDec={() => dec(nd.stops)}
              />
            ))}
          </div>
          {activeNDs.length > 0 && (
            <div style={{ marginTop: "10px", fontSize: "11px", color: "#c8832a", lineHeight: 1.8 }}>
              {activeNDs.map(nd => {
                const c = filterCounts[nd.stops];
                return (
                  <span key={nd.label} style={{ marginRight: "10px" }}>
                    {c > 1 ? `${nd.label} ×${c}` : nd.label}
                    {" "}({(nd.stops * c).toFixed(1)} ev)
                  </span>
                );
              })}
              <span style={{ color: "#777" }}>= {totalNDStops.toFixed(1)} ev total</span>
            </div>
          )}
        </section>

        {/* 03 Manual stops */}
        <section style={{ marginBottom: "28px" }}>
          <label style={{ fontSize: "10px", letterSpacing: "3px", color: "#888", display: "block", marginBottom: "10px" }}>
            03 — ADDITIONAL STOPS (optional)
          </label>
          <input
            type="number" step="0.5" min="0" max="30"
            value={manualStops} onChange={e => setManualStops(e.target.value)}
            placeholder="e.g. 3.5"
            style={{
              width: "100%", boxSizing: "border-box", background: "#141414",
              border: "1px solid #2a2a2a", color: "#f0e6d3", padding: "10px 12px",
              fontFamily: "inherit", fontSize: "14px", outline: "none", borderRadius: "2px",
            }}
          />
          <div style={{ fontSize: "10px", color: "#555", marginTop: "4px" }}>
            Aperture / ISO adjustments or stops not covered by your filters
          </div>
        </section>

        {/* 04 Reciprocity */}
        <section style={{ marginBottom: "28px" }}>
          <label style={{ fontSize: "10px", letterSpacing: "3px", color: "#888", display: "block", marginBottom: "10px" }}>
            04 — FILM RECIPROCITY FAILURE
          </label>
          <select value={reciprocityKey} onChange={e => setReciprocityKey(e.target.value)}
            style={{ ...sel, color: reciprocityKey === "none" ? "#666" : "#f0e6d3" }}>
            {Object.entries(RECIPROCITY).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </section>

        <div style={{ height: "1px", background: "#1e1e1e", marginBottom: "24px" }} />

        {/* Result */}
        <section>
          <label style={{ fontSize: "10px", letterSpacing: "3px", color: "#888", display: "block", marginBottom: "14px" }}>
            — RESULT
          </label>

          <div style={{ marginBottom: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
              <span style={{ fontSize: "11px", color: "#666" }}>LIGHT REDUCTION</span>
              <span style={{ fontSize: "14px", color: "#c8832a" }}>{totalStops.toFixed(1)} stops</span>
            </div>
            <StopsBar stops={totalStops} />
          </div>

          <div style={{
            background: "#111", border: "1px solid #c8832a44",
            padding: "24px", borderRadius: "2px", textAlign: "center",
            position: "relative", overflow: "hidden",
          }}>
            <div style={{
              position: "absolute", top: 0, left: 0, right: 0, height: "1px",
              background: "linear-gradient(90deg, transparent, #c8832a88, transparent)"
            }} />
            <div style={{ fontSize: "11px", color: "#555", letterSpacing: "2px", marginBottom: "8px" }}>
              TARGET EXPOSURE
            </div>
            <div style={{
              fontSize: "52px", fontWeight: "bold",
              color: totalStops === 0 ? "#444" : "#f0e6d3",
              letterSpacing: "-1px", lineHeight: 1, marginBottom: "4px",
            }}>
              {totalStops === 0 ? "—" : formatTime(finalResult)}
            </div>
            {reciprocityKey !== "none" && Math.abs(delta) > 0.5 && (
              <div style={{ fontSize: "11px", color: "#888", marginTop: "10px" }}>
                Calculated: {formatTime(rawResult)}
                <span style={{ color: "#c8832a", marginLeft: "8px" }}>
                  +{formatTime(delta)} (reciprocity)
                </span>
              </div>
            )}
            <div style={{
              marginTop: "16px", paddingTop: "16px", borderTop: "1px solid #1e1e1e",
              display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px",
              fontSize: "11px", color: "#555",
            }}>
              <div>
                <div>BASE</div>
                <div style={{ color: "#888" }}>
                  {SHUTTER_SPEEDS.find(s => s.value === baseShutter)?.label || `${baseShutter}s`}
                </div>
              </div>
              <div>
                <div>ND STOPS</div>
                <div style={{ color: "#888" }}>{totalNDStops.toFixed(1)}</div>
              </div>
              <div>
                <div>ND FACTOR</div>
                <div style={{ color: "#888" }}>×{Math.round(Math.pow(2, totalStops))}</div>
              </div>
            </div>
          </div>

          {finalResult >= 60 && (
            <div style={{
              marginTop: "12px", padding: "10px 14px",
              background: "#1a1200", border: "1px solid #c8832a33",
              borderRadius: "2px", fontSize: "11px", color: "#c8832a",
              display: "flex", alignItems: "center", gap: "8px",
            }}>
              <span>⚠</span>
              <span>
                {finalResult >= 3600
                  ? "Exposure > 1h — check battery level and tripod stability."
                  : "Long exposure — use a remote shutter release and mirror lockup (BULB mode)."}
              </span>
            </div>
          )}
        </section>

        <div style={{ marginTop: "40px", fontSize: "10px", color: "#333", textAlign: "center", letterSpacing: "2px" }}>
          LONG EXPOSURE CALCULATOR
        </div>
      </div>
    </div>
  );
}
