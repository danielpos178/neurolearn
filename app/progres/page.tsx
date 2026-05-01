import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Layout from "@/components/layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { BadgesGrid } from "@/components/achievements/badges-grid"
import { calculateUserLevel } from "@/lib/utils/level-calculator"
import { getUserStreak, getHighestStreak, getActivityData } from "@/lib/utils/streak-calculator"
import { StreakDisplay } from "@/components/progress/streak-display"
import { ActivityChart } from "@/components/progress/activity-chart"
import { CompletedLessons } from "@/components/progress/completed-lessons"
import { format, subDays } from "date-fns"
import { ro } from "date-fns/locale"

export default async function ProgresPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    redirect("/login")
  }

  // Get all lessons
  const { data: lessons } = await supabase.from("lessons").select("*").order("created_at", { ascending: true })

  // Get user's lesson progress
  const { data: progress } = await supabase
    .from("lesson_progress")
    .select("lesson_id, completed, completed_at")
    .eq("user_id", user.id)

  // Get user profile to get XP
  const { data: profile } = await supabase.from("profiles").select("xp").eq("id", user.id).single()

  // Create a map of lesson progress for easy lookup
  const progressMap = new Map()
  progress?.forEach((item) => {
    progressMap.set(item.lesson_id, {
      completed: item.completed,
      completed_at: item.completed_at,
    })
  })

  // Calculate overall progress
  const totalLessons = lessons?.length || 0
  const completedLessons = progress?.filter((p) => p.completed).length || 0
  const totalProgress = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0

  // Calculate XP and level
  const totalXP = profile?.xp || completedLessons * 100 // Use profile XP or fallback to calculation
  const { level } = calculateUserLevel(totalXP)

  // Calculate streaks
  const currentStreak = await getUserStreak(supabase, user.id)
  const highestStreak = await getHighestStreak(supabase, user.id)

  // Get activity data for the last 7 days
  const activityData = await getActivityData(supabase, user.id, 7)

  // Format the activity data for the chart
  const chartData = Array.from({ length: 7 }, (_, i) => {
    const date = subDays(new Date(), 6 - i)
    const dateStr = format(date, "yyyy-MM-dd")
    const count = activityData[dateStr] || 0
    return {
      date: format(date, "EEE", { locale: ro }),
      count,
    }
  })

  // Get completed lessons with details
  const { data: completedLessonsDetails } = await supabase
    .from("lesson_progress")
    .select(`
      completed_at,
      lessons (
        id,
        title,
        description,
        duration,
        level,
        learning_style
      )
    `)
    .eq("user_id", user.id)
    .eq("completed", true)
    .order("completed_at", { ascending: false })

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        {/* Bauhaus-inspired decorative elements */}
        <div className="fixed -z-10 top-40 left-20 w-40 h-40 bg-primary/10 rounded-full opacity-30 animate-pulse"></div>
        <div className="fixed -z-10 bottom-20 right-40 w-60 h-60 bg-accent/10 rounded-full opacity-30 animate-pulse"></div>
        <div className="fixed -z-10 top-1/3 right-1/4 w-20 h-20 bg-primary/10 rotate-45 opacity-30"></div>
        <h1 className="text-3xl font-bold mb-2">Progresul tău</h1>
        <p className="text-muted-foreground mb-8">Urmărește-ți evoluția și vezi ce mai ai de învățat</p>

        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Overall Progress Card */}
            <Card className="border-2 dark:border-zinc-800">
              <CardHeader>
                <CardTitle>Progres general</CardTitle>
                <CardDescription>Progresul tău în toate cursurile</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Completat: {totalProgress}%</span>
                    <span className="text-sm font-medium">
                      {completedLessons}/{totalLessons} lecții
                    </span>
                  </div>
                  <Progress value={totalProgress} className="h-2" />
                </div>
              </CardContent>
            </Card>

            {/* Streak Card */}
            <StreakDisplay currentStreak={currentStreak} highestStreak={highestStreak} />
          </div>

          {/* Activity Chart */}
          <ActivityChart data={chartData} />

          {/* Badges */}
          <BadgesGrid
            completedLessons={completedLessons}
            streak={currentStreak}
            highestStreak={highestStreak}
            level={level}
            totalXP={totalXP}
          />

          {/* Completed Lessons */}
          <CompletedLessons lessons={completedLessonsDetails || []} />
        </div>
      </div>
    </Layout>
  )
}
