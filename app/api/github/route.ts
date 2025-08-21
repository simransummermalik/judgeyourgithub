export async function POST(request: Request) {
  try {
    const { username } = await request.json()

    if (!username) {
      return Response.json({ error: "Username is required" }, { status: 400 })
    }

    const headers: Record<string, string> = {
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "GitHub-Analytics-App",
    }

    // Add token if available (optional but recommended)
    if (process.env.GITHUB_TOKEN) {
      headers["Authorization"] = `token ${process.env.GITHUB_TOKEN}`
    }

    // Fetch user profile
    const userResponse = await fetch(`https://api.github.com/users/${username}`, { headers })
    if (!userResponse.ok) {
      if (userResponse.status === 404) {
        return Response.json({ error: "User not found" }, { status: 404 })
      }
      throw new Error(`GitHub API error: ${userResponse.status}`)
    }
    const user = await userResponse.json()

    // Fetch user's repositories (get ALL repositories, not just recent ones)
    const reposResponse = await fetch(
      `https://api.github.com/users/${username}/repos?per_page=100&sort=created&type=owner`,
      {
        headers,
      },
    )
    const repos = await reposResponse.json()

    console.log("[v0] Fetching commits from", repos.length, "repositories...")

    const allCommits: any[] = []
    let totalCommits = 0
    const commitTimes: Date[] = []
    const commitMessages: string[] = []
    const repoCommits: Record<string, number> = {}

    const activeRepos = repos.filter((repo: any) => !repo.fork && repo.size > 0)
    console.log("[v0] Processing", activeRepos.length, "non-fork repositories...")

    for (const repo of activeRepos) {
      try {
        let page = 1
        let hasMoreCommits = true
        let repoCommitCount = 0

        while (hasMoreCommits && page <= 10) {
          // Limit to 10 pages per repo (1000 commits) to avoid rate limits
          const commitsResponse = await fetch(
            `https://api.github.com/repos/${repo.full_name}/commits?author=${username}&per_page=100&page=${page}`,
            { headers },
          )

          if (commitsResponse.ok) {
            const repoCommitsData = await commitsResponse.json()

            if (repoCommitsData.length === 0) {
              hasMoreCommits = false
              break
            }

            repoCommitsData.forEach((commit: any) => {
              if (commit.author?.login === username || commit.commit?.author?.email?.includes(username)) {
                allCommits.push({
                  ...commit,
                  repo_name: repo.name,
                  created_at: commit.commit.author.date,
                })

                const commitDate = new Date(commit.commit.author.date)
                commitTimes.push(commitDate)
                commitMessages.push(commit.commit.message.toLowerCase())

                repoCommitCount++
                totalCommits++
              }
            })

            page++

            await new Promise((resolve) => setTimeout(resolve, 50))
          } else {
            console.log(`[v0] Error response for ${repo.name}:`, commitsResponse.status)
            hasMoreCommits = false
          }
        }

        if (repoCommitCount > 0) {
          repoCommits[repo.name] = repoCommitCount
          console.log(`[v0] Found ${repoCommitCount} commits in ${repo.name}`)
        }

        await new Promise((resolve) => setTimeout(resolve, 200))
      } catch (error) {
        console.log(`[v0] Error fetching commits for ${repo.name}:`, error)
      }
    }

    console.log("[v0] Total commits found:", totalCommits)
    console.log("[v0] Commit times:", commitTimes.length)
    console.log(
      "[v0] Date range:",
      commitTimes.length > 0
        ? {
            earliest: new Date(Math.min(...commitTimes.map((d) => d.getTime()))).toDateString(),
            latest: new Date(Math.max(...commitTimes.map((d) => d.getTime()))).toDateString(),
          }
        : "No commits",
    )

    const hourCounts: Record<number, number> = {}
    const dayCounts: Record<number, number> = {}
    const timeSlotCounts = { morning: 0, afternoon: 0, evening: 0, lateNight: 0 }
    const dailyCommitCounts: Record<string, number> = {}

    commitTimes.forEach((date) => {
      const hour = date.getHours()
      const day = date.getDay()
      const dateStr = date.toDateString()

      hourCounts[hour] = (hourCounts[hour] || 0) + 1
      dayCounts[day] = (dayCounts[day] || 0) + 1
      dailyCommitCounts[dateStr] = (dailyCommitCounts[dateStr] || 0) + 1

      // Categorize time slots
      if (hour >= 6 && hour < 12) timeSlotCounts.morning++
      else if (hour >= 12 && hour < 18) timeSlotCounts.afternoon++
      else if (hour >= 18 && hour < 24) timeSlotCounts.evening++
      else timeSlotCounts.lateNight++
    })

    const peakHour = Object.entries(hourCounts).sort(([, a], [, b]) => b - a)[0]?.[0] || 14
    const favoriteDay = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][
      Number.parseInt(Object.entries(dayCounts).sort(([, a], [, b]) => b - a)[0]?.[0] || "2")
    ]

    const mostActiveTimeSlot = Object.entries(timeSlotCounts).sort(([, a], [, b]) => b - a)[0]?.[0] || "afternoon"
    const lateNightPercentage =
      commitTimes.length > 0 ? Math.round((timeSlotCounts.lateNight / commitTimes.length) * 100) : 0

    // Analyze commit consistency
    const commitDaysArray = Object.values(dailyCommitCounts)
    const avgCommitsPerDay =
      commitDaysArray.length > 0 ? commitDaysArray.reduce((a, b) => a + b, 0) / commitDaysArray.length : 0
    const commitConsistency =
      commitDaysArray.length > 5
        ? Math.round(
            (commitDaysArray.filter((count) => Math.abs(count - avgCommitsPerDay) <= avgCommitsPerDay * 0.5).length /
              commitDaysArray.length) *
              100,
          )
        : commitDaysArray.length > 0
          ? Math.round((commitDaysArray.length / 30) * 100)
          : 0

    // Analyze commit message patterns
    const hasFixCommits = commitMessages.filter((msg) => msg.includes("fix") || msg.includes("bug")).length
    const hasWipCommits = commitMessages.filter((msg) => msg.includes("wip") || msg.includes("work in progress")).length
    const hasTypoCommits = commitMessages.filter((msg) => msg.includes("typo") || msg.includes("oops")).length
    const commitMessageStyle =
      hasWipCommits > totalCommits * 0.2
        ? "WIP enthusiast"
        : hasFixCommits > totalCommits * 0.3
          ? "Bug squasher"
          : hasTypoCommits > totalCommits * 0.1
            ? "Typo fixer"
            : "Clean committer"

    // Calculate productivity streaks and patterns
    const last30Days = commitTimes.filter((date) => Date.now() - date.getTime() < 30 * 24 * 60 * 60 * 1000)
    const productivityTrend =
      last30Days.length > commitTimes.length * 0.5
        ? "increasing"
        : last30Days.length < commitTimes.length * 0.2
          ? "decreasing"
          : "stable"

    const languageStats: Record<string, number> = {}
    let totalRepoCount = 0

    repos.forEach((repo: any) => {
      if (repo.language) {
        languageStats[repo.language] = (languageStats[repo.language] || 0) + 1
        totalRepoCount++
      }
    })

    const languageBreakdown = Object.entries(languageStats)
      .sort(([, a], [, b]) => (b as number) - (a as number))
      .slice(0, 5)
      .map(([lang, count]) => ({
        lang,
        percentage: Math.round((count / totalRepoCount) * 100),
      }))

    const topLanguages = languageBreakdown.map((item) => item.lang)

    const commitDates = commitTimes.map((date) => new Date(date).toDateString())
    const uniqueDates = [...new Set(commitDates)].sort()
    let currentStreak = 0
    let maxStreak = 0
    let tempStreak = 1

    for (let i = 1; i < uniqueDates.length; i++) {
      const prevDate = new Date(uniqueDates[i - 1])
      const currDate = new Date(uniqueDates[i])
      const dayDiff = Math.floor((currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24))

      if (dayDiff === 1) {
        tempStreak++
      } else {
        maxStreak = Math.max(maxStreak, tempStreak)
        tempStreak = 1
      }
    }
    maxStreak = Math.max(maxStreak, tempStreak)

    // Check if still active (committed in last 2 days)
    const lastCommitDate = uniqueDates.length > 0 ? new Date(uniqueDates[uniqueDates.length - 1]) : new Date(0)
    const daysSinceLastCommit = Math.floor((Date.now() - lastCommitDate.getTime()) / (1000 * 60 * 60 * 24))
    currentStreak = daysSinceLastCommit <= 2 ? maxStreak : 0

    // Calculate streak and weekend activity
    const weekendCommits = commitTimes.filter((date) => date.getDay() === 0 || date.getDay() === 6).length
    const weekendRatio = commitTimes.length > 0 ? weekendCommits / commitTimes.length : 0

    // Find most active repo
    const topRepo =
      Object.entries(repoCommits).sort(([, a], [, b]) => (b as number) - (a as number))[0]?.[0] || "No recent activity"

    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
    const threeMonthsAgo = new Date()
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)

    const abandonedProjects = repos.filter((repo: any) => {
      const lastUpdate = new Date(repo.updated_at)
      const hasRecentCommits = allCommits.some(
        (commit: any) => commit.repo_name === repo.name && new Date(commit.created_at) > threeMonthsAgo,
      )

      // Consider abandoned if: no updates in 6 months AND no commits in 3 months AND has more than 1 commit
      return lastUpdate < sixMonthsAgo && !hasRecentCommits && repo.size > 0
    }).length

    const codeHabits = {
      commitFrequency: {
        daily: commitTimes.filter((date) => Date.now() - date.getTime() < 24 * 60 * 60 * 1000).length,
        weekly: commitTimes.filter((date) => Date.now() - date.getTime() < 7 * 24 * 60 * 60 * 1000).length,
        monthly: commitTimes.filter((date) => Date.now() - date.getTime() < 30 * 24 * 60 * 60 * 1000).length,
      },
      workLifeBalance: {
        weekdayCommits: commitTimes.filter((date) => date.getDay() >= 1 && date.getDay() <= 5).length,
        weekendCommits: commitTimes.filter((date) => date.getDay() === 0 || date.getDay() === 6).length,
        businessHours: commitTimes.filter((date) => date.getHours() >= 9 && date.getHours() <= 17).length,
        afterHours: commitTimes.filter((date) => date.getHours() < 9 || date.getHours() > 17).length,
      },
      projectDiversity: {
        activeProjects: repos.filter((repo: any) => new Date(repo.updated_at) > threeMonthsAgo).length,
        languageDiversity: Object.keys(languageStats).length,
        avgRepoSize: repos.reduce((sum: number, repo: any) => sum + repo.size, 0) / repos.length || 0,
      },
    }

    const hourlyData = Array.from({ length: 24 }, (_, hour) => ({
      hour: `${hour}:00`,
      commits: hourCounts[hour] || 0,
    }))

    const dailyData = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day, index) => ({
      day,
      commits: dayCounts[index] || 0,
    }))

    const timeSlotData = [
      {
        slot: "Morning\n(6-12)",
        commits: timeSlotCounts.morning,
        percentage: commitTimes.length > 0 ? Math.round((timeSlotCounts.morning / commitTimes.length) * 100) : 0,
      },
      {
        slot: "Afternoon\n(12-18)",
        commits: timeSlotCounts.afternoon,
        percentage: commitTimes.length > 0 ? Math.round((timeSlotCounts.afternoon / commitTimes.length) * 100) : 0,
      },
      {
        slot: "Evening\n(18-24)",
        commits: timeSlotCounts.evening,
        percentage: commitTimes.length > 0 ? Math.round((timeSlotCounts.evening / commitTimes.length) * 100) : 0,
      },
      {
        slot: "Late Night\n(0-6)",
        commits: timeSlotCounts.lateNight,
        percentage: commitTimes.length > 0 ? Math.round((timeSlotCounts.lateNight / commitTimes.length) * 100) : 0,
      },
    ]

    let roast = ""
    console.log("[v0] OpenAI API Key present:", !!process.env.OPENAI_API_KEY)
    console.log("[v0] Environment check:", process.env.OPENAI_API_KEY ? "Key found" : "Key missing")

    const avgCommitSize = totalCommits > 0 ? commitMessages.length / totalCommits : 0
    const commitStyle =
      avgCommitSize > 3
        ? "Large feature drops"
        : avgCommitSize > 1.5
          ? "Moderate changes"
          : totalCommits > 50
            ? "Frequent small changes"
            : totalCommits > 10
              ? "Occasional commits"
              : "Rare contributor"

    if (process.env.OPENAI_API_KEY) {
      try {
        const roastResponse = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "gpt-3.5-turbo",
            messages: [
              {
                role: "system",
                content:
                  "You are a sarcastic code reviewer who roasts developers based on their GitHub activity and coding patterns. Be funny but not too mean-spirited. Keep it at most 150 words and dont be corny. Talk about there top languages and kind of tease them, especially with coding patterns",
              },
              {
                role: "user",
                content: `Roast this developer: ${totalCommits} commits, ${user.public_repos} repos, ${user.followers} followers, ${Math.round(weekendRatio * 100)}% weekend coding, peak coding at ${peakHour}:00, favorite day is ${favoriteDay}, ${abandonedProjects} abandoned projects, commit style: ${commitStyle}, top languages: ${topLanguages.join(", ")}`,
              },
            ],
            max_tokens: 200,
            temperature: 0.8,
          }),
        })

        if (roastResponse.ok) {
          const roastData = await roastResponse.json()
          roast = roastData.choices[0]?.message?.content || ""
        }
      } catch (error) {
        console.error("OpenAI API error:", error)
      }
    }

    console.log("[v0] Debug - Total commits found:", totalCommits)
    console.log("[v0] Debug - Push events:", allCommits.length)
    console.log("[v0] Debug - Commit times:", commitTimes.length)
    console.log("[v0] Debug - Language stats:", languageStats)

    return Response.json({
      totalCommits: totalCommits,
      streak: currentStreak,
      weekendRatio,
      topRepo,
      languages: topLanguages,
      languageBreakdown,
      publicRepos: user.public_repos,
      followers: user.followers,
      following: user.following,
      createdAt: user.created_at,
      bio: user.bio,
      location: user.location,
      peakHour: Number.parseInt(peakHour),
      favoriteDay,
      commitStyle,
      abandonedProjects,
      roast,
      mostActiveTimeSlot,
      lateNightPercentage,
      commitConsistency,
      commitMessageStyle,
      productivityTrend,
      chartData: {
        hourly: hourlyData,
        daily: dailyData,
        timeSlots: timeSlotData,
        languages: languageBreakdown.map((item) => ({
          language: item.lang,
          percentage: item.percentage,
          repos: languageStats[item.lang],
        })),
      },
    })
  } catch (error) {
    console.error("GitHub API error:", error)
    return Response.json({ error: "Failed to fetch GitHub data" }, { status: 500 })
  }
}
