"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Layout from "@/components/layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/client"
import { MotivationalQuote } from "@/components/dashboard/motivational-quote"
import { StatsGrid } from "@/components/dashboard/stats-grid"
import { UpcomingTasks } from "@/components/dashboard/upcoming-tasks"
import { useLoading } from "@/components/loading-provider"
import { motion } from "framer-motion"
import { Activity, Award, BookOpen, CheckCircle, Target, Clock, PenLine } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { ro } from "date-fns/locale"
// Import the level calculator at the top of the file
import { calculateUserLevel } from "@/lib/utils/level-calculator"
import { getUserStreak } from "@/lib/utils/streak-calculator"

interface UserProfile {
  id: string
  learning_style: string
  xp: number
  streak: number
}

interface Badge {
  id: string
  user_id: string
  badge_id: string
  earned_at: string
  badges: {
    id: string
    name: string
    description: string
    icon: string
    category: string
  }
}

interface ActivityLog {
  id: string
  user_id: string
  activity_type: string
  details: string
  created_at: string
}

export default function DashboardPage() {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [userName, setUserName] = useState("")
  const [recentBadges, setRecentBadges] = useState<Badge[] | null>(null)
  const [activityLog, setActivityLog] = useState<ActivityLog[] | null>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()
  const { setIsLoading } = useLoading()

  useEffect(() => {
    fetchUserData()
  }, [])

  const createActivityLogTable = async () => {
    try {
      // Creăm tabelul activity_log direct cu SQL
      await supabase.rpc("exec_sql", {
        sql_query: `
          CREATE TABLE IF NOT EXISTS activity_log (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
            activity_type VARCHAR(50) NOT NULL,
            details JSONB,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );
          
          CREATE INDEX IF NOT EXISTS activity_log_user_id_idx ON activity_log(user_id);
          CREATE INDEX IF NOT EXISTS activity_log_created_at_idx ON activity_log(created_at);
        `,
      })

      console.log("Activity log table created successfully")
      return true
    } catch (error) {
      console.error("Error creating activity_log table:", error)
      return false
    }
  }

  const fetchUserData = async () => {
    setIsLoading(true)
    try {
      const { data: user } = await supabase.auth.getUser()
      if (!user.user) {
        router.push("/login")
        return
      }

      // Fetch user profile
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*, xp, streak, learning_style, role")
        .eq("id", user.user.id)
        .single()

      // In the fetchUserData function, update the userProfile setting:
      if (profileError) {
        console.error("Error fetching profile:", profileError)
      } else {
        // Calculate level from XP
        const xp = profileData.xp || 0
        const { level } = calculateUserLevel(xp)

        // Calculate current streak
        const currentStreak = await getUserStreak(supabase, user.user.id)

        // Update the userProfile state with calculated streak
        setUserProfile({
          id: profileData.id,
          xp: xp,
          streak: currentStreak, // Use calculated streak instead of database value
          learning_style: profileData.learning_style || "",
        })

        // Update the database with the current streak
        await supabase.from("profiles").upsert({
          id: user.user.id,
          streak: currentStreak,
          last_activity_date: new Date().toISOString().split("T")[0],
        })

        setUserName(profileData.full_name || "")
      }

      // Fetch recent badges
      const { data: badgesData, error: badgesError } = await supabase
        .from("user_badges")
        .select("*, badges(*)")
        .eq("user_id", user.user.id)
        .order("earned_at", { ascending: false })
        .limit(3)

      if (!badgesError) {
        setRecentBadges(badgesData)
      }

      // Verificăm dacă există tabelul activity_log
      const { error: activityCheckError } = await supabase.from("activity_log").select("id").limit(1)

      // Dacă tabelul nu există, încercăm să-l creăm
      if (activityCheckError && activityCheckError.message.includes("does not exist")) {
        console.log("activity_log table doesn't exist, attempting to create it")
        const tableCreated = await createActivityLogTable()

        if (!tableCreated) {
          // Dacă nu putem crea tabelul, folosim date de exemplu
          setActivityLog([
            {
              id: "1",
              user_id: user.user.id,
              activity_type: "lesson_completion",
              details: JSON.stringify({ lesson_title: "Introducere în învățare", xp_earned: 50 }),
              created_at: new Date().toISOString(),
            },
            {
              id: "2",
              user_id: user.user.id,
              activity_type: "task_completion",
              details: JSON.stringify({ task_title: "Citește capitolul 1", xp_earned: 20 }),
              created_at: new Date(Date.now() - 86400000).toISOString(), // ieri
            },
          ])
          return
        }
      }

      // Încercăm să obținem activitățile din tabel
      try {
        const { data: logData, error: logError } = await supabase
          .from("activity_log")
          .select("*")
          .eq("user_id", user.user.id)
          .order("created_at", { ascending: false })
          .limit(10)

        if (logError) {
          console.error("Error fetching activity log after table check:", logError)
          // Folosim date de exemplu în caz de eroare
          setActivityLog([
            {
              id: "1",
              user_id: user.user.id,
              activity_type: "lesson_completion",
              details: JSON.stringify({ lesson_title: "Introducere în învățare", xp_earned: 50 }),
              created_at: new Date().toISOString(),
            },
          ])
        } else {
          setActivityLog(logData || [])
        }
      } catch (error) {
        console.error("Error in activity log fetch:", error)
        // Folosim date de exemplu în caz de excepție
        setActivityLog([
          {
            id: "1",
            user_id: user.user.id,
            activity_type: "lesson_completion",
            details: JSON.stringify({ lesson_title: "Introducere în învățare", xp_earned: 50 }),
            created_at: new Date().toISOString(),
          },
        ])
      }

      // Update last activity date for streak calculation
      try {
        await supabase
          .from("profiles")
          .upsert({
            id: user.user.id,
            last_activity_date: new Date().toISOString().split("T")[0],
          })
          .eq("id", user.user.id)
      } catch (error) {
        console.error("Error updating last activity date:", error)
      }
    } catch (error) {
      console.error("Error fetching user data:", error)
    } finally {
      setIsLoading(false)
      setLoading(false)
    }
  }

  // Function to get activity details with lesson title lookup
  const getActivityDetails = async (activity: ActivityLog) => {
    try {
      if (!activity.details) return { title: "Activitate", subtitle: "Activitate:", xp: 0 }

      const details = typeof activity.details === "string" ? JSON.parse(activity.details) : activity.details

      switch (activity.activity_type) {
        case "lesson_completion":
          // If we have lesson_id, fetch the lesson title from database
          if (details.lesson_id) {
            try {
              const { data: lessonData, error: lessonError } = await supabase
                .from("lessons")
                .select("title")
                .eq("id", details.lesson_id)
                .single()

              if (!lessonError && lessonData) {
                return {
                  title: lessonData.title,
                  subtitle: "Lecție finalizată:",
                  xp: details.xp_earned || details.xp_reward || 0,
                }
              }
            } catch (error) {
              console.error("Error fetching lesson title:", error)
            }
          }

          // Fallback to lesson_title from details or default
          return {
            title: details.lesson_title || "Lecție necunoscută",
            subtitle: "Lecție finalizată:",
            xp: details.xp_earned || details.xp_reward || 0,
          }
        case "task_completion":
          return {
            title: details.task_title || "Sarcină necunoscută",
            subtitle: "Sarcină finalizată:",
            xp: details.xp_earned || 0,
          }
        case "goal_completion":
          return {
            title: details.goal_title || "Obiectiv necunoscut",
            subtitle: "Obiectiv finalizat:",
            xp: details.xp_earned || 0,
          }
        case "badge_earned":
          return {
            title: details.badge_name || "Insignă necunoscută",
            subtitle: "Insignă obținută:",
            xp: details.xp_earned || 0,
          }
        default:
          return {
            title: "Activitate necunoscută",
            subtitle: "Activitate:",
            xp: details.xp_earned || 0,
          }
      }
    } catch (e) {
      console.error("Error parsing activity details:", e)
      return { title: "Activitate", subtitle: "Activitate:", xp: 0 }
    }
  }

  // Function to get activity icon
  const getActivityIcon = (activityType: string) => {
    switch (activityType) {
      case "lesson_completion":
        return <BookOpen className="h-4 w-4" />
      case "task_completion":
        return <CheckCircle className="h-4 w-4" />
      case "goal_completion":
        return <Target className="h-4 w-4" />
      case "badge_earned":
        return <Award className="h-4 w-4" />
      case "journal_entry":
        return <PenLine className="h-4 w-4" />
      default:
        return <Activity className="h-4 w-4" />
    }
  }

  // Component for activity item that handles async lesson title fetching
  const ActivityItem = ({ activity, index }: { activity: ActivityLog; index: number }) => {
    const [activityDetails, setActivityDetails] = useState<{
      title: string
      subtitle: string
      xp: number
    } | null>(null)

    useEffect(() => {
      const fetchDetails = async () => {
        const details = await getActivityDetails(activity)
        setActivityDetails(details)
      }
      fetchDetails()
    }, [activity])

    if (!activityDetails) {
      return (
        <motion.div
          className="flex items-start gap-4"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: index * 0.1 }}
        >
          <div className="mt-1 h-8 w-8 rounded-full bg-muted flex items-center justify-center">
            {getActivityIcon(activity.activity_type)}
          </div>
          <div className="flex-1 space-y-1">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <div className="h-4 w-32 bg-muted animate-pulse rounded"></div>
                <div className="h-4 w-48 bg-muted animate-pulse rounded mt-1"></div>
              </div>
            </div>
          </div>
        </motion.div>
      )
    }

    return (
      <motion.div
        className="flex items-start gap-4"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: index * 0.1 }}
      >
        <div className="mt-1 h-8 w-8 rounded-full bg-muted flex items-center justify-center">
          {getActivityIcon(activity.activity_type)}
        </div>
        <div className="flex-1 space-y-1">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <p className="text-sm text-muted-foreground">{activityDetails.subtitle}</p>
              <p className="font-medium">{activityDetails.title}</p>
            </div>
            {activityDetails.xp > 0 && (
              <span className="text-xs text-primary font-semibold">+{activityDetails.xp} XP</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-3 w-3 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true, locale: ro })}
            </p>
          </div>
        </div>
      </motion.div>
    )
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 min-h-[calc(100vh-200px)]">
        {/* Bauhaus-inspired decorative elements */}
        <div className="fixed -z-10 top-40 left-20 w-40 h-40 bg-primary/10 rounded-full opacity-30 animate-pulse"></div>
        <div className="fixed -z-10 bottom-20 right-40 w-60 h-60 bg-accent/10 rounded-full opacity-30 animate-pulse"></div>
        <div className="fixed -z-10 top-1/3 right-1/4 w-20 h-20 bg-primary/10 rotate-45 opacity-30"></div>
        <div className="mb-8">
          <h1 className="text-3xl font-bold">{userName ? `Bună, ${userName.split(" ")[0]}!` : "Bună!"}</h1>
          <p className="text-muted-foreground">Bine ai revenit! Iată progresul tău de astăzi.</p>

          {/* Quote added to dashboard */}
          <div className="mt-4 p-4 bg-primary/10 rounded-lg border border-primary/20">
            <p className="text-center italic">
              "Nu există un singur mod corect de a învăța - există doar modul care ți se potrivește!"
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            <StatsGrid userProfile={userProfile} />

            {/* Recent Activity */}
            <Card className="border-2 dark:border-zinc-800">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Activitate recentă
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {activityLog && activityLog.length > 0 ? (
                    activityLog
                      .slice(0, 5)
                      .map((activity, index) => (
                        <ActivityItem key={activity.id || index} activity={activity} index={index} />
                      ))
                  ) : (
                    <p className="text-center text-muted-foreground py-8">
                      Nu ai nicio activitate recentă. Începe să înveți!
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Recent Badges */}
            {recentBadges && recentBadges.length > 0 && (
              <Card className="border-2 dark:border-zinc-800">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2">
                    <Award className="h-5 w-5" />
                    Insigne recente
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {recentBadges.map((badge, index) => (
                      <motion.div
                        key={badge.id}
                        className="flex items-start gap-4"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.1 }}
                      >
                        <div className="mt-1 h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <Award className="h-4 w-4" />
                        </div>
                        <div className="flex-1 space-y-1">
                          <p className="font-medium">{badge.badges.name}</p>
                          <p className="text-sm text-muted-foreground">{badge.badges.description}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(badge.earned_at), { addSuffix: true, locale: ro })}
                          </p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="space-y-6">
            {/* Motivational Quote */}
            <MotivationalQuote />

            {/* Upcoming Tasks - Let the component fetch its own data */}
            <UpcomingTasks />
          </div>
        </div>
      </div>
    </Layout>
  )
}
