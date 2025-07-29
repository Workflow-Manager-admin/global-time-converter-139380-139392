/**
 * PUBLIC_INTERFACE
 * Global Time Converter React App
 *
 * - Features:
 *   - Select source and target time zones (powered by backend API /timezones).
 *   - Date and time input (24-hour, with date).
 *   - Real-time display of converted time (via backend /convert-time).
 *   - Handles and displays errors: invalid time, API errors, network errors.
 *   - Modern, responsive, accessible UI with theme toggle (light/dark).
 *   - API backend endpoint default: http://localhost:3001 (override using REACT_APP_BACKEND_API_URL in .env).
 * - Integration: Requires the backend FastAPI container for full functionality.
 */

import React, { useState, useEffect, useCallback } from "react";
import "./App.css";

// Helper: Format today's date as YYYY-MM-DD for default input
function getTodayDate() {
  const now = new Date();
  return now.toISOString().slice(0, 10);
}

// PUBLIC_INTERFACE
function App() {
  // THEME LOGIC
  const [theme, setTheme] = useState("light");
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);
  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  // STATE
  const [allTimezones, setAllTimezones] = useState([]);
  const [loadingTimezones, setLoadingTimezones] = useState(true);
  const [timezonesError, setTimezonesError] = useState("");

  const [sourceTz, setSourceTz] = useState("UTC");
  const [targetTz, setTargetTz] = useState("America/New_York");
  const [date, setDate] = useState(getTodayDate());
  const [time, setTime] = useState("12:00");

  const [converted, setConverted] = useState(null);
  const [convertError, setConvertError] = useState("");
  const [isConverting, setIsConverting] = useState(false);

  // API base - adjust to match backend port if needed.
  const API_URL = process.env.REACT_APP_BACKEND_API_URL || "http://localhost:3001";

  // Fetch all supported timezones from API
  useEffect(() => {
    async function fetchTimezones() {
      setLoadingTimezones(true);
      setTimezonesError("");
      try {
        const resp = await fetch(`${API_URL}/timezones`);
        if (!resp.ok) throw new Error("Failed to fetch timezones list");
        const data = await resp.json();
        setAllTimezones(data.timezones || []);
        // Set UTC/NY defaults only on initial load for better first UX
        setSourceTz((curr) =>
          data.timezones && data.timezones.includes(curr) ? curr : data.timezones[0] || "UTC"
        );
        setTargetTz((curr) =>
          data.timezones && data.timezones.includes(curr) ? curr : data.timezones[1] || "UTC"
        );
      } catch (err) {
        setTimezonesError("Could not load timezones. Please try again later.");
        setAllTimezones([]);
      } finally {
        setLoadingTimezones(false);
      }
    }
    fetchTimezones();
    // Only fetch timezones once on mount
    // eslint-disable-next-line
  }, []);

  // Conversion logic with debounce
  const makeConversionRequest = useCallback(async () => {
    setIsConverting(true);
    setConvertError("");
    setConverted(null);
    const inputTime = `${date} ${time}`;
    try {
      const response = await fetch(`${API_URL}/convert-time`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          time: inputTime,
          source_timezone: sourceTz,
          target_timezone: targetTz
        })
      });
      const respData = await response.json();
      if (response.ok) {
        setConverted({
          original_time: respData.original_time,
          converted_time: respData.converted_time,
          source_timezone: respData.source_timezone,
          target_timezone: respData.target_timezone
        });
      } else {
        setConvertError(
          respData && respData.detail && Array.isArray(respData.detail)
            ? respData.detail.map((e) => e.msg).join("; ")
            : "Invalid input or unsupported time zone."
        );
      }
    } catch (e) {
      setConvertError("Could not connect to backend server.");
    } finally {
      setIsConverting(false);
    }
  }, [date, time, sourceTz, targetTz, API_URL]);

  // Whenever input changes, perform conversion after debounce
  useEffect(() => {
    // Avoid request if timezones loading or missing input
    if (
      loadingTimezones ||
      !sourceTz ||
      !targetTz ||
      !time ||
      !date ||
      sourceTz === targetTz
    ) {
      setConverted(null);
      setConvertError("");
      return;
    }
    const timeout = setTimeout(() => {
      makeConversionRequest();
    }, 400); // Debounce for smooth UX
    return () => clearTimeout(timeout);
  }, [date, time, sourceTz, targetTz, loadingTimezones, makeConversionRequest]);

  // LAYOUT
  return (
    <div className="App" style={{ minHeight: "100vh" }}>
      <header className="App-header" style={{ minHeight: "auto" }}>
        <button
          className="theme-toggle"
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
        >
          {theme === "light" ? "🌙 Dark" : "☀️ Light"}
        </button>
        <h1
          style={{
            color: "var(--text-primary)",
            fontWeight: 800,
            marginBottom: "0.2em",
            fontSize: "clamp(2rem,4vw,2.5rem)"
          }}
        >
          Global Time Converter
        </h1>
        <p
          style={{
            color: "var(--text-secondary)",
            marginBottom: "1.5em"
          }}
        >
          Easily convert a time between different time zones, worldwide.
        </p>
      </header>
      <main>
        <section
          style={{
            margin: "0 auto",
            maxWidth: 420,
            minWidth: 0,
            padding: "2em",
            borderRadius: 14,
            boxShadow: "0 4px 28px rgba(30,65,173,0.06)",
            background: "var(--bg-secondary)",
            display: "flex",
            flexDirection: "column",
            gap: "1.5em"
          }}
        >
          {/* Timezone Selectors and Time Input */}
          {loadingTimezones ? (
            <div className="loading-msg" style={{ textAlign: "center" }}>
              <span role="status" aria-live="polite">
                🕑 Loading time zones...
              </span>
            </div>
          ) : timezonesError ? (
            <div className="error-msg" style={{ color: "#e53935", fontWeight: 600 }}>
              {timezonesError}
            </div>
          ) : (
            <>
              {/* Source TZ + Target TZ */}
              <div
                style={{
                  display: "flex",
                  gap: 20,
                  flexDirection: "row",
                  flexWrap: "wrap"
                }}
              >
                <div style={{ flex: "1 1 0" }}>
                  <label htmlFor="source-tz" style={{ fontWeight: 600 }}>
                    From Time Zone
                  </label>
                  <select
                    id="source-tz"
                    value={sourceTz}
                    onChange={(e) => setSourceTz(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "0.6em",
                      fontSize: "1em",
                      borderRadius: 8,
                      marginTop: 2,
                      borderColor: "var(--border-color)"
                    }}
                  >
                    {allTimezones.map((tz) => (
                      <option key={tz} value={tz}>
                        {tz}
                      </option>
                    ))}
                  </select>
                </div>
                <div style={{ flex: "1 1 0" }}>
                  <label htmlFor="target-tz" style={{ fontWeight: 600 }}>
                    To Time Zone
                  </label>
                  <select
                    id="target-tz"
                    value={targetTz}
                    onChange={(e) => setTargetTz(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "0.6em",
                      fontSize: "1em",
                      borderRadius: 8,
                      marginTop: 2,
                      borderColor: "var(--border-color)"
                    }}
                  >
                    {allTimezones.map((tz) => (
                      <option key={tz} value={tz}>
                        {tz}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              {/* Date and Time input */}
              <div
                style={{
                  display: "flex",
                  gap: 20,
                  flexDirection: "row",
                  flexWrap: "wrap"
                }}
              >
                <div style={{ flex: 1 }}>
                  <label htmlFor="input-date" style={{ fontWeight: 600 }}>
                    Date
                  </label>
                  <input
                    id="input-date"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "0.6em",
                      fontSize: "1em",
                      borderRadius: 8,
                      marginTop: 2,
                      borderColor: "var(--border-color)"
                    }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label htmlFor="input-time" style={{ fontWeight: 600 }}>
                    Time (24h)
                  </label>
                  <input
                    id="input-time"
                    type="time"
                    value={time}
                    step="60"
                    onChange={(e) => setTime(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "0.6em",
                      fontSize: "1em",
                      borderRadius: 8,
                      marginTop: 2,
                      borderColor: "var(--border-color)"
                    }}
                  />
                </div>
              </div>
              {/* Conversion output */}
              <div style={{ minHeight: "3em" }}>
                {sourceTz === targetTz ? (
                  <span
                    style={{
                      color: "#555",
                      fontSize: "0.97em"
                    }}
                  >
                    Please pick different source and target time zones.
                  </span>
                ) : convertError ? (
                  <span
                    className="error-msg"
                    style={{
                      color: "#e53935",
                      fontWeight: 600,
                      fontSize: "1.0em"
                    }}
                  >
                    Error: {convertError}
                  </span>
                ) : isConverting ? (
                  <span role="status" aria-live="polite">
                    🔄 Converting...
                  </span>
                ) : converted ? (
                  <div
                    style={{
                      padding: "0.8em 1em",
                      background: "var(--bg-primary)",
                      borderRadius: 10,
                      color: "var(--text-primary)",
                      fontWeight: 600,
                      boxShadow: "0 1px 4px rgba(60,90,140,0.05)"
                    }}
                  >
                    <span style={{ fontSize: "1.06em" }}>
                      {converted.original_time} ({converted.source_timezone})
                      <span style={{ margin: "0 0.5em" }}>→</span>
                      <span
                        style={{
                          color: "var(--text-secondary)",
                          fontSize: "1.1em",
                          fontWeight: 700
                        }}
                      >
                        {converted.converted_time} ({converted.target_timezone})
                      </span>
                    </span>
                  </div>
                ) : (
                  <span style={{ color: "#666", fontSize: "0.97em" }}>
                    Enter a valid time and select time zones to convert.
                  </span>
                )}
              </div>
            </>
          )}
        </section>
        <div style={{ height: "2em" }} />
      </main>
      <footer
        style={{
          textAlign: "center",
          color: "var(--text-secondary)",
          padding: "1em"
        }}
      >
        <span style={{ fontSize: "0.99em" }}>
          Built with <span style={{ color: "#E87A41" }}>KAVIA</span> · FastAPI + React ·
          <a
            className="App-link"
            href="https://www.iana.org/time-zones"
            target="_blank"
            rel="noopener noreferrer"
            style={{ marginLeft: 8 }}
          >
            IANA TZ DB 💡
          </a>
        </span>
      </footer>
    </div>
  );
}

export default App;
