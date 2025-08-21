"use client"

import { useState } from "react"

export default function RoastReport() {
  const [username, setUsername] = useState("")
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState(null)
  const [error, setError] = useState("")

  const handleAnalyze = async () => {
    if (!username.trim()) return

    setLoading(true)
    setError("")
    setData(null)

    try {
      console.log("Fetching data for username:", username.trim())

      const response = await fetch("/api/github", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username: username.trim() }),
      })

      console.log("API response status:", response.status)

      if (!response.ok) {
        const errorData = await response.json()
        console.log("API error:", errorData)
        throw new Error(errorData.error || "Failed to fetch data")
      }

      const githubData = await response.json()
      console.log("Received GitHub data:", githubData)
      setData(githubData)
    } catch (error) {
      console.error("Error fetching GitHub data:", error)
      setError(error.message || "Failed to analyze GitHub profile")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="hero">
        <h1 className="hero-title">How Bad Is Your Code?</h1>
        <p className="hero-subtitle">Our sophisticated analytics judges your GitHub activity.</p>
        <p className="hero-updated">reminder: case sensitive, enter your username only</p>
      </div>

      <div className="input-section">
        <input
          type="text"
          placeholder="Enter GitHub username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && handleAnalyze()}
          className="github-input"
        />
        <button onClick={handleAnalyze} disabled={loading || !username.trim()} className="find-out-button">
          {loading ? "Analyzing..." : "Find Out"}
        </button>
      </div>

      {error && (
        <div className="error-section">
          <p className="error-text">❌ {error}</p>
          <p className="error-hint">Make sure the username exists and try again.</p>
        </div>
      )}

      {data && (
        <>
          <div className="stats-section">
            <div className="stats-grid">
              <div className="stat-card">
                <span className="stat-value">{data.totalCommits}</span>
                <span className="stat-label">Total Commits</span>
              </div>
              <div className="stat-card">
                <span className="stat-value">{data.publicRepos}</span>
                <span className="stat-label">Public Repos</span>
              </div>
              <div className="stat-card">
                <span className="stat-value">{Math.round(data.weekendRatio * 100)}%</span>
                <span className="stat-label">Weekend Work</span>
              </div>
              <div className="stat-card">
                <span className="stat-value">{data.followers}</span>
                <span className="stat-label">Followers</span>
              </div>
            </div>
          </div>

          <div className="roast-section">
            <h2 className="roast-title">The Verdict</h2>
            <p className="roast-text">
              {data.roast ? (
                data.roast
              ) : (
                <>
                  {/* 💡 Add OPENAI_API_KEY environment variable for personalized roasts! */}
                  Well, well, well... {data.totalCommits} commits across {data.publicRepos} repos with {data.followers}{" "}
                  followers.
                  {data.weekendRatio > 0.3
                    ? ` And ${Math.round(data.weekendRatio * 100)}% weekend coding? Someone needs a social life!`
                    : ` Only ${Math.round(data.weekendRatio * 100)}% weekend work - you might actually touch grass occasionally.`}
                  {data.abandonedProjects > 10 &&
                    ` Those ${data.abandonedProjects} abandoned projects though... commitment issues much?`}
                </>
              )}
            </p>
          </div>

          <div className="viz-section">
            <div className="viz-grid">
              <div className="viz-card">
                <div className="viz-header">
                  <h3 className="viz-title">Commit Patterns</h3>
                  <p className="viz-subtitle">Your coding rhythm revealed</p>
                </div>
                <div className="viz-content">
                  <div className="chart-container">
                    <h4 className="chart-title">Hourly Activity</h4>
                    <div className="bar-chart">
                      {data.chartData?.hourly?.map((item, i) => (
                        <div key={i} className="bar-item">
                          <div
                            className="bar"
                            style={{
                              height: `${Math.max(item.commits * 3, 2)}px`,
                              backgroundColor: item.commits > 0 ? "#ff6b9d" : "#f0f0f0",
                            }}
                          ></div>
                          <span className="bar-label">{item.hour.split(":")[0]}</span>
                        </div>
                      )) || <p>No hourly data available</p>}
                    </div>
                  </div>

                  <div className="chart-container">
                    <h4 className="chart-title">Time Distribution</h4>
                    <div className="pie-chart">
                      {data.chartData?.timeSlots?.map((slot, i) => (
                        <div key={i} className="pie-item">
                          <div
                            className="pie-bar"
                            style={{
                              width: `${slot.percentage}%`,
                              backgroundColor: ["#ff6b9d", "#4ecdc4", "#45b7d1", "#96ceb4"][i],
                            }}
                          ></div>
                          <span className="pie-label">
                            {slot.slot}: {slot.percentage}%
                          </span>
                        </div>
                      )) || <p>No time slot data available</p>}
                    </div>
                  </div>

                  <ul className="insights-list">
                    <li>
                      <strong>Peak hours:</strong> {data.peakHour}:00-{data.peakHour + 1}:00
                      {data.peakHour < 9
                        ? " (early bird)"
                        : data.peakHour > 22
                          ? " (night owl)"
                          : " (classic procrastination)"}
                    </li>
                    <li>
                      <strong>Favorite day:</strong> {data.favoriteDay}{" "}
                      {data.favoriteDay === "Saturday" || data.favoriteDay === "Sunday"
                        ? "(weekend warrior)"
                        : "(weekday grinder)"}
                    </li>
                    <li>
                      <strong>Commit style:</strong> {data.commitStyle}
                    </li>
                    <li>
                      <strong>Most active time:</strong> {data.mostActiveTimeSlot}
                      {data.mostActiveTimeSlot === "lateNight"
                        ? " (vampire coder)"
                        : data.mostActiveTimeSlot === "morning"
                          ? " (early achiever)"
                          : data.mostActiveTimeSlot === "evening"
                            ? " (after-hours warrior)"
                            : " (standard schedule)"}
                    </li>
                    <li>
                      <strong>Late night coding:</strong> {data.lateNightPercentage}%
                      {data.lateNightPercentage > 30
                        ? " (sleep is overrated)"
                        : data.lateNightPercentage > 15
                          ? " (occasional night owl)"
                          : " (healthy sleeper)"}
                    </li>
                    <li>
                      <strong>Consistency:</strong> {data.commitConsistency}%
                      {data.commitConsistency > 70
                        ? " (machine-like)"
                        : data.commitConsistency > 40
                          ? " (fairly regular)"
                          : " (chaotic energy)"}
                    </li>
                    <li>
                      <strong>Message style:</strong> {data.commitMessageStyle}
                      {data.commitMessageStyle === "WIP enthusiast"
                        ? " (commit early, commit often)"
                        : data.commitMessageStyle === "Bug squasher"
                          ? " (fixing all the things)"
                          : data.commitMessageStyle === "Typo fixer"
                            ? " (oops, again?)"
                            : " (professional approach)"}
                    </li>
                    <li>
                      <strong>Productivity trend:</strong> {data.productivityTrend}
                      {data.productivityTrend === "increasing"
                        ? " (on fire!)"
                        : data.productivityTrend === "decreasing"
                          ? " (burning out?)"
                          : " (steady as she goes)"}
                    </li>
                  </ul>
                </div>
              </div>

              <div className="viz-card">
                <div className="viz-header">
                  <h3 className="viz-title">Language Breakdown</h3>
                  <p className="viz-subtitle">Your polyglot status</p>
                </div>
                <div className="viz-content">
                  <div className="chart-container">
                    <div className="language-chart">
                      {data.chartData?.languages?.map((lang, i) => (
                        <div key={i} className="language-item">
                          <div className="language-bar-container">
                            <span className="language-name">{lang.language}</span>
                            <div className="language-bar-bg">
                              <div
                                className="language-bar"
                                style={{
                                  width: `${lang.percentage}%`,
                                  backgroundColor: ["#ff6b9d", "#4ecdc4", "#45b7d1", "#96ceb4", "#feca57"][i % 5],
                                }}
                              ></div>
                            </div>
                            <span className="language-percentage">{lang.percentage}%</span>
                          </div>
                        </div>
                      )) || <p>No language data available</p>}
                    </div>
                  </div>
                </div>
              </div>

              <div className="viz-card">
                <div className="viz-header">
                  <h3 className="viz-title">Repository Focus</h3>
                  <p className="viz-subtitle">Where you spend your time</p>
                </div>
                <div className="viz-content">
                  <div className="chart-container">
                    <h4 className="chart-title">Code Habits Analysis</h4>
                    <div className="habits-grid">
                      <div className="habit-item">
                        <span className="habit-label">Work-Life Balance</span>
                        <div className="habit-bar">
                          <div
                            className="habit-fill"
                            style={{
                              width: `${data.codeHabits ? (data.codeHabits.workLifeBalance.businessHours / (data.codeHabits.workLifeBalance.businessHours + data.codeHabits.workLifeBalance.afterHours)) * 100 : 50}%`,
                              backgroundColor: "#4ecdc4",
                            }}
                          ></div>
                        </div>
                        <span className="habit-value">
                          {data.codeHabits
                            ? Math.round(
                                (data.codeHabits.workLifeBalance.businessHours /
                                  (data.codeHabits.workLifeBalance.businessHours +
                                    data.codeHabits.workLifeBalance.afterHours)) *
                                  100,
                              )
                            : 50}
                          % business hours
                        </span>
                      </div>

                      <div className="habit-item">
                        <span className="habit-label">Project Focus</span>
                        <div className="habit-bar">
                          <div
                            className="habit-fill"
                            style={{
                              width: `${data.codeHabits ? Math.min((data.codeHabits.projectDiversity.activeProjects / data.publicRepos) * 100, 100) : 50}%`,
                              backgroundColor: "#45b7d1",
                            }}
                          ></div>
                        </div>
                        <span className="habit-value">
                          {data.codeHabits ? data.codeHabits.projectDiversity.activeProjects : 0} active projects
                        </span>
                      </div>

                      <div className="habit-item">
                        <span className="habit-label">Language Diversity</span>
                        <div className="habit-bar">
                          <div
                            className="habit-fill"
                            style={{
                              width: `${data.codeHabits ? Math.min(data.codeHabits.projectDiversity.languageDiversity * 10, 100) : 50}%`,
                              backgroundColor: "#96ceb4",
                            }}
                          ></div>
                        </div>
                        <span className="habit-value">
                          {data.codeHabits ? data.codeHabits.projectDiversity.languageDiversity : 0} languages
                        </span>
                      </div>
                    </div>
                  </div>

                  <ul className="insights-list">
                    <li>
                      <strong>Top repo:</strong> {data.topRepo}
                    </li>
                    <li>
                      <strong>Total repos:</strong> {data.publicRepos}{" "}
                      {data.publicRepos > 100 ? "(collector much?)" : ""}
                    </li>
                    <li>
                      <strong>Abandoned projects:</strong> {data.abandonedProjects}{" "}
                      {data.abandonedProjects > 10
                        ? "(commitment issues)"
                        : data.abandonedProjects > 5
                          ? "(some unfinished business)"
                          : "(good follow-through!)"}
                    </li>
                    <li>
                      <strong>Project abandonment criteria:</strong> No updates in 6+ months, no commits in 3+ months,
                      and has actual code
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
