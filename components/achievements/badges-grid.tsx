"use client"

import React, { useState, useEffect } from "react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { motion } from "framer-motion"
import {
  Award,
  BookOpen,
  Calendar,
  Flame,
  Star,
  Zap,
  Brain,
  Timer,
  Music,
  Lightbulb,
  Repeat,
  List,
  Target,
  Trophy,
  Sparkles,
  CheckCircle,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { BadgeUnlockPopup } from "./badge-unlock-popup"

interface BadgesGridProps {
  completedLessons: number
  streak: number
  highestStreak: number
  level: number
  totalXP: number
}

// Update the AchievementBadge interface to match our database schema
interface AchievementBadge {
  id: string
  name: string
  description: string
  icon: React.ReactNode
  unlocked: boolean
  progress?: number
  maxProgress?: number
  color: string
  difficulty?: "easy" | "medium" | "hard"
}

export function BadgesGrid({ completedLessons, streak, highestStreak, level, totalXP }: BadgesGridProps) {
  const [methodUsage, setMethodUsage] = useState<Record<string, number>>({})
  const [showBadgePopup, setShowBadgePopup] = useState(false)
  const [unlockedBadgeId, setUnlockedBadgeId] = useState("")
  const supabase = createClient()

  // Update the useEffect hook to fetch badges from the database
  useEffect(() => {
    async function fetchBadgesAndProgress() {
      try {
        const { data: user } = await supabase.auth.getUser()
        if (!user.user) return

        // Fetch method usage data
        const { data: methodUsageData } = await supabase
          .from("method_usage")
          .select("method, count")
          .eq("user_id", user.user.id)

        if (methodUsageData) {
          const usageMap: Record<string, number> = {}
          methodUsageData.forEach((item) => {
            usageMap[item.method] = item.count
          })
          setMethodUsage(usageMap)
        }

        // Fetch all badge definitions
        const { data: badgeDefinitions } = await supabase.from("badges").select("*")

        // Fetch user's earned badges
        const { data: userBadges } = await supabase.from("user_badges").select("badge_id").eq("user_id", user.user.id)

        // Create a set of earned badge IDs for quick lookup
        const earnedBadgeIds = new Set(userBadges?.map((badge) => badge.badge_id) || [])

        // We'll update the achievements array later with this data
      } catch (error) {
        console.error("Error fetching badges data:", error)
      }
    }

    fetchBadgesAndProgress()
  }, [supabase])

  // Define achievements
  const achievements: AchievementBadge[] = [
    // Learning progress badges
    {
      id: "first_lesson",
      name: "Prima lecție",
      description: "Ai finalizat prima ta lecție",
      icon: <BookOpen className="h-6 w-6" />,
      unlocked: completedLessons >= 1,
      color: "bg-green-500",
      difficulty: "easy",
    },
    {
      id: "five_lessons",
      name: "Învățăcel",
      description: "Ai finalizat 5 lecții",
      icon: <BookOpen className="h-6 w-6" />,
      unlocked: completedLessons >= 5,
      progress: Math.min(completedLessons, 5),
      maxProgress: 5,
      color: "bg-blue-500",
      difficulty: "easy",
    },
    {
      id: "ten_lessons",
      name: "Student dedicat",
      description: "Ai finalizat 10 lecții",
      icon: <BookOpen className="h-6 w-6" />,
      unlocked: completedLessons >= 10,
      progress: Math.min(completedLessons, 10),
      maxProgress: 10,
      color: "bg-purple-500",
      difficulty: "medium",
    },

    // Streak badges
    {
      id: "streak_3",
      name: "Consecvență",
      description: "Ai menținut o serie de studiu de 3 zile",
      icon: <Flame className="h-6 w-6" />,
      unlocked: streak >= 3 || highestStreak >= 3,
      progress: Math.min(Math.max(streak, highestStreak), 3),
      maxProgress: 3,
      color: "bg-orange-500",
      difficulty: "easy",
    },
    {
      id: "streak_7",
      name: "Săptămâna perfectă",
      description: "Ai menținut o serie de studiu de 7 zile",
      icon: <Calendar className="h-6 w-6" />,
      unlocked: streak >= 7 || highestStreak >= 7,
      progress: Math.min(Math.max(streak, highestStreak), 7),
      maxProgress: 7,
      color: "bg-red-500",
      difficulty: "medium",
    },
    {
      id: "streak_30",
      name: "Maestru al consecvenței",
      description: "Ai menținut o serie de studiu de 30 zile",
      icon: <Trophy className="h-6 w-6" />,
      unlocked: streak >= 30 || highestStreak >= 30,
      progress: Math.min(Math.max(streak, highestStreak), 30),
      maxProgress: 30,
      color: "bg-amber-500",
      difficulty: "hard",
    },

    // Level badges
    {
      id: "level_5",
      name: "Nivel 5",
      description: "Ai atins nivelul 5",
      icon: <Star className="h-6 w-6" />,
      unlocked: level >= 5,
      progress: Math.min(level, 5),
      maxProgress: 5,
      color: "bg-yellow-500",
      difficulty: "medium",
    },
    {
      id: "xp_1000",
      name: "1000 XP",
      description: "Ai acumulat 1000 de puncte de experiență",
      icon: <Zap className="h-6 w-6" />,
      unlocked: totalXP >= 1000,
      progress: Math.min(totalXP, 1000),
      maxProgress: 1000,
      color: "bg-indigo-500",
      difficulty: "medium",
    },

    // Learning techniques badges
    {
      id: "pomodoro_master",
      name: "Maestru Pomodoro",
      description: "Ai folosit tehnica Pomodoro de 10 ori",
      icon: <Timer className="h-6 w-6" />,
      unlocked: (methodUsage["pomodoro"] || 0) >= 10,
      progress: Math.min(methodUsage["pomodoro"] || 0, 10),
      maxProgress: 10,
      color: "bg-red-400",
      difficulty: "medium",
    },
    {
      id: "sound_explorer",
      name: "Explorator de sunete",
      description: "Ai folosit toate tipurile de sunete ambientale",
      icon: <Music className="h-6 w-6" />,
      unlocked: (methodUsage["ambient_sounds"] || 0) >= 3,
      progress: Math.min(methodUsage["ambient_sounds"] || 0, 3),
      maxProgress: 3,
      color: "bg-blue-400",
      difficulty: "easy",
    },
    {
      id: "feynman_technique",
      name: "Tehnica Feynman",
      description: "Ai aplicat tehnica Feynman pentru a înțelege un concept complex",
      icon: <Lightbulb className="h-6 w-6" />,
      unlocked: (methodUsage["feynman"] || 0) >= 1,
      progress: Math.min(methodUsage["feynman"] || 0, 1),
      maxProgress: 1,
      color: "bg-yellow-400",
      difficulty: "medium",
    },
    {
      id: "spaced_repetition",
      name: "Repetiție spațiată",
      description: "Ai folosit tehnica de repetiție spațiată pentru 5 lecții",
      icon: <Repeat className="h-6 w-6" />,
      unlocked: (methodUsage["spaced_repetition"] || 0) >= 5,
      progress: Math.min(methodUsage["spaced_repetition"] || 0, 5),
      maxProgress: 5,
      color: "bg-emerald-500",
      difficulty: "medium",
    },
    {
      id: "sq3r_method",
      name: "Metoda SQ3R",
      description: "Ai aplicat metoda SQ3R pentru a studia eficient",
      icon: <List className="h-6 w-6" />,
      unlocked: (methodUsage["sq3r"] || 0) >= 1,
      progress: Math.min(methodUsage["sq3r"] || 0, 1),
      maxProgress: 1,
      color: "bg-cyan-500",
      difficulty: "hard",
    },
    {
      id: "task_master",
      name: "Organizator Eficient",
      description: "Ai finalizat 10 sarcini",
      icon: <CheckCircle className="h-6 w-6" />,
      unlocked: (methodUsage["task_completion"] || 0) >= 10,
      progress: Math.min(methodUsage["task_completion"] || 0, 10),
      maxProgress: 10,
      color: "bg-blue-500",
      difficulty: "medium",
    },

    // Special achievements
    {
      id: "learning_style_master",
      name: "Maestru al stilului de învățare",
      description: "Ai finalizat 5 lecții adaptate stilului tău de învățare",
      icon: <Brain className="h-6 w-6" />,
      unlocked: (methodUsage["style_specific_lessons"] || 0) >= 5,
      progress: Math.min(methodUsage["style_specific_lessons"] || 0, 5),
      maxProgress: 5,
      color: "bg-teal-500",
      difficulty: "medium",
    },
    {
      id: "goal_achiever",
      name: "Realizator de obiective",
      description: "Ți-ai stabilit și atins 3 obiective de învățare",
      icon: <Target className="h-6 w-6" />,
      unlocked: (methodUsage["completed_goals"] || 0) >= 3,
      progress: Math.min(methodUsage["completed_goals"] || 0, 3),
      maxProgress: 3,
      color: "bg-pink-500",
      difficulty: "hard",
    },
    {
      id: "knowledge_explorer",
      name: "Explorator al cunoașterii",
      description: "Ai finalizat lecții din toate categoriile disponibile",
      icon: <Sparkles className="h-6 w-6" />,
      unlocked: (methodUsage["diverse_lessons"] || 0) >= 3,
      progress: Math.min(methodUsage["diverse_lessons"] || 0, 3),
      maxProgress: 3,
      color: "bg-amber-400",
      difficulty: "hard",
    },
  ]

  const unlockedCount = achievements.filter((badge) => badge.unlocked).length
  const totalCount = achievements.length
  const achievementProgress = Math.round((unlockedCount / totalCount) * 100)

  // Group badges by difficulty
  const easyBadges = achievements.filter((badge) => badge.difficulty === "easy")
  const mediumBadges = achievements.filter((badge) => badge.difficulty === "medium")
  const hardBadges = achievements.filter((badge) => badge.difficulty === "hard")

  const handleBadgeClick = (badge: AchievementBadge) => {
    if (badge.unlocked) {
      setUnlockedBadgeId(badge.id)
      setShowBadgePopup(true)
    }
  }

  return (
    <>
      <Card className="border-2 dark:border-zinc-800">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Realizări și Insigne</CardTitle>
              <CardDescription>Colecționează insigne pe măsură ce progresezi</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Award className="h-5 w-5 text-yellow-500" />
              <span className="font-medium">
                {unlockedCount}/{totalCount}
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="flex justify-between text-sm mb-1">
              <span>Progres realizări</span>
              <span>{achievementProgress}%</span>
            </div>
            <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-yellow-500 to-amber-500 transition-all duration-500"
                style={{ width: `${achievementProgress}%` }}
              />
            </div>
          </div>

          {/* Easy Badges */}
          <div className="mb-6">
            <h3 className="text-lg font-medium mb-3 flex items-center">
              <Badge variant="outline" className="mr-2">
                Începător
              </Badge>
              Insigne de bază
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {easyBadges.map((badge, index) => (
                <BadgeCard key={badge.id} badge={badge} index={index} onClick={() => handleBadgeClick(badge)} />
              ))}
            </div>
          </div>

          {/* Medium Badges */}
          <div className="mb-6">
            <h3 className="text-lg font-medium mb-3 flex items-center">
              <Badge variant="outline" className="mr-2">
                Intermediar
              </Badge>
              Insigne avansate
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {mediumBadges.map((badge, index) => (
                <BadgeCard key={badge.id} badge={badge} index={index} onClick={() => handleBadgeClick(badge)} />
              ))}
            </div>
          </div>

          {/* Hard Badges */}
          <div>
            <h3 className="text-lg font-medium mb-3 flex items-center">
              <Badge variant="outline" className="mr-2">
                Expert
              </Badge>
              Insigne de expert
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {hardBadges.map((badge, index) => (
                <BadgeCard key={badge.id} badge={badge} index={index} onClick={() => handleBadgeClick(badge)} />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <BadgeUnlockPopup badgeId={unlockedBadgeId} open={showBadgePopup} onOpenChange={setShowBadgePopup} />
    </>
  )
}

// Badge card component for individual badges
function BadgeCard({
  badge,
  index,
  onClick,
}: {
  badge: AchievementBadge
  index: number
  onClick: () => void
}) {
  return (
    <motion.div
      key={badge.id}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.1 }}
      onClick={onClick}
      className={badge.unlocked ? "cursor-pointer" : ""}
    >
      <Card
        className={`border ${badge.unlocked ? "border-2 border-yellow-500/50" : "border-muted opacity-70"} h-full transition-all ${badge.unlocked ? "hover:shadow-md" : ""}`}
      >
        <CardContent className="p-4 flex flex-col items-center text-center">
          <div
            className={`w-12 h-12 rounded-full ${
              badge.unlocked ? badge.color : "bg-muted"
            } flex items-center justify-center mb-3 mt-2`}
          >
            {React.cloneElement(badge.icon as React.ReactElement, {
              className: `h-6 w-6 ${badge.unlocked ? "text-white" : "text-muted-foreground"}`,
            })}
          </div>

          <h3 className="font-medium mb-1">{badge.name}</h3>
          <p className="text-xs text-muted-foreground mb-2">{badge.description}</p>

          {badge.progress !== undefined && badge.maxProgress !== undefined && (
            <div className="w-full mt-2">
              <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full ${badge.unlocked ? badge.color : "bg-muted-foreground/30"} transition-all duration-500`}
                  style={{ width: `${(badge.progress / badge.maxProgress) * 100}%` }}
                />
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {badge.progress}/{badge.maxProgress}
              </div>
            </div>
          )}

          <Badge variant={badge.unlocked ? "success" : "outline"} className="mt-auto">
            {badge.unlocked ? "Deblocat" : "Blocat"}
          </Badge>
        </CardContent>
      </Card>
    </motion.div>
  )
}
