"use client"

import { useEffect, useState } from "react"
import { Award, BookOpen, Flame, Zap } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { createClient } from "@/lib/supabase/client"
import { calculateUserLevel } from "@/lib/utils/level-calculator"
import { getUserStreak } from "@/lib/utils/streak-calculator"

interface StatsGridProps {
  userProfile?: {
    id: string
    learning_style: string
    xp: number
    streak: number
  } | null
  xp?: number
  level?: number
  completedLessons?: number
  streak?: number
}

export function StatsGrid({
  userProfile,
  xp: propXp,
  level: propLevel,
  completedLessons: propCompletedLessons,
  streak: propStreak,
}: StatsGridProps) {
  const [xp, setXp] = useState(propXp || userProfile?.xp || 0)
  const [level, setLevel] = useState(propLevel || 0)
  const [completedLessons, setCompletedLessons] = useState(propCompletedLessons || 0)
  const [streak, setStreak] = useState(propStreak || userProfile?.streak || 0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // If all props are provided, no need to fetch data
    if (propXp && propLevel && propCompletedLessons && propStreak) {
      setLoading(false)
      return
    }

    async function fetchStats() {
      setLoading(true)
      const supabase = createClient()

      // Get current user
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) {
        setLoading(false)
        return
      }

      // Get user profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("learning_style, xp, streak")
        .eq("id", userData.user.id)
        .single()

      // Get lesson progress - simplified approach to count all completed lessons
      const { data: lessonProgress } = await supabase
        .from("lesson_progress")
        .select("lesson_id, completed")
        .eq("user_id", userData.user.id)
        .eq("completed", true)

      // Count all completed lessons (simplified approach)
      let completedLessonsCount = 0
      if (lessonProgress) {
        completedLessonsCount = lessonProgress.length
      }

      // If we want to filter by learning style, we can do it as a secondary query
      if (profile && profile.learning_style && profile.learning_style !== "") {
        try {
          // Get lessons with their learning styles
          const { data: lessonsWithStyle } = await supabase
            .from("lesson_progress")
            .select(`
              lesson_id, 
              completed,
              lessons!inner(learning_style)
            `)
            .eq("user_id", userData.user.id)
            .eq("completed", true)

          if (lessonsWithStyle && lessonsWithStyle.length > 0) {
            // Filter by user's learning style or "all"
            const filteredLessons = lessonsWithStyle.filter((item) => {
              const lessonStyle = item.lessons?.learning_style
              return lessonStyle === profile.learning_style || lessonStyle === "all" || lessonStyle === "universal"
            })

            // Use filtered count if we have valid data, otherwise use total count
            if (filteredLessons.length > 0) {
              completedLessonsCount = filteredLessons.length
            }
          }
        } catch (error) {
          console.error("Error filtering lessons by learning style:", error)
          // Keep the total count as fallback
        }
      }

      // Get XP from profile or calculate it
      let totalXP = 0
      if (profile && profile.xp !== null) {
        totalXP = profile.xp
      } else {
        // Fallback: Calculate XP from activity_log
        const { data: activities } = await supabase
          .from("activity_log")
          .select("details")
          .eq("user_id", userData.user.id)

        if (activities && activities.length > 0) {
          activities.forEach((activity) => {
            try {
              const details = typeof activity.details === "string" ? JSON.parse(activity.details) : activity.details
              if (details && details.xp_earned) {
                totalXP += details.xp_earned
              }
            } catch (e) {
              console.error("Error parsing activity details:", e)
            }
          })
        }

        // If we calculated XP from activities, update the profile
        if (totalXP > 0) {
          await supabase.from("profiles").update({ xp: totalXP }).eq("id", userData.user.id)
        }
      }

      // Calculate level from XP using the new 150 XP per level logic
      const { level: userLevel } = calculateUserLevel(totalXP)

      // Get streak from profile or calculate it
      let userStreak = 0
      if (profile && profile.streak !== null) {
        userStreak = profile.streak
      } else {
        userStreak = await getUserStreak(supabase, userData.user.id)
        // Update the profile with calculated streak
        await supabase.from("profiles").update({ streak: userStreak }).eq("id", userData.user.id)
      }

      // Update state
      setXp(totalXP)
      setLevel(userLevel)
      setCompletedLessons(completedLessonsCount)
      setStreak(userStreak)
      setLoading(false)
    }

    fetchStats()
  }, [propXp, propLevel, propCompletedLessons, propStreak, userProfile])

  // Calculate level progress using the new 150 XP per level system
  const { currentLevelXP, nextLevelXP } = calculateUserLevel(xp)
  const progress = Math.min(100, (currentLevelXP / nextLevelXP) * 100)

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="overflow-hidden border-2 dark:border-zinc-800">
            <div className="h-1.5 bg-gradient-to-r from-gray-300 to-gray-400"></div>
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div className="animate-pulse">
                  <div className="h-4 w-20 bg-gray-300 rounded mb-2"></div>
                  <div className="h-6 w-16 bg-gray-300 rounded"></div>
                </div>
                <div className="h-10 w-10 rounded-full bg-gray-300 animate-pulse"></div>
              </div>
              <div className="mt-4">
                <div className="flex justify-between text-xs mb-1">
                  <span className="invisible">Placeholder</span>
                </div>
                <div className="h-2 bg-gray-300 rounded animate-pulse"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {/* XP Card */}
      <Card className="overflow-hidden border-2 dark:border-zinc-800">
        <div className="h-1.5 bg-gradient-to-r from-blue-500 to-purple-500"></div>
        <CardContent className="p-6">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total XP</p>
              <h3 className="text-2xl font-bold mt-1">{xp.toLocaleString()}</h3>
            </div>
            <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
              <Zap className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <div className="mt-4">
            <div className="flex justify-between text-xs mb-1">
              <span>Progres nivel</span>
              <span>
                {currentLevelXP}/{nextLevelXP} XP
              </span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Level Card */}
      <Card className="overflow-hidden border-2 dark:border-zinc-800">
        <div className="h-1.5 bg-gradient-to-r from-yellow-500 to-orange-500"></div>
        <CardContent className="p-6">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Nivel curent</p>
              <h3 className="text-2xl font-bold mt-1">{level}</h3>
            </div>
            <div className="h-10 w-10 rounded-full bg-yellow-100 dark:bg-yellow-900 flex items-center justify-center">
              <Award className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-1">
            <div className="h-2 w-2 rounded-full bg-yellow-500"></div>
            <span className="text-xs text-muted-foreground">
              {level < 5 ? "Începător" : level < 10 ? "Intermediar" : "Avansat"}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Completed Lessons Card */}
      <Card className="overflow-hidden border-2 dark:border-zinc-800">
        <div className="h-1.5 bg-gradient-to-r from-green-500 to-emerald-500"></div>
        <CardContent className="p-6">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Lecții finalizate</p>
              <h3 className="text-2xl font-bold mt-1">{completedLessons}</h3>
            </div>
            <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
              <BookOpen className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-1">
            <div className="h-2 w-2 rounded-full bg-green-500"></div>
            <span className="text-xs text-muted-foreground">Continuă să înveți!</span>
          </div>
        </CardContent>
      </Card>

      {/* Streak Card */}
      <Card className="overflow-hidden border-2 dark:border-zinc-800">
        <div className="h-1.5 bg-gradient-to-r from-red-500 to-pink-500"></div>
        <CardContent className="p-6">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Serie de studiu</p>
              <h3 className="text-2xl font-bold mt-1">{streak} zile</h3>
            </div>
            <div className="h-10 w-10 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center">
              <Flame className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
          </div>
          <div className="mt-4 flex gap-1">
            {[...Array(7)].map((_, i) => (
              <div key={i} className={`h-2 flex-1 rounded-full ${i < streak % 7 ? "bg-red-500" : "bg-muted"}`}></div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
