import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Layout from "@/components/layout"
import { LessonCard } from "@/components/lessons/lesson-card"
import { DecorativeElements } from "@/components/lessons/decorative-elements"

export default async function LectiiPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  // Get user profile to determine learning style
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("learning_style")
    .eq("id", user.id)
    .single()

  const userLearningStyle = profile?.learning_style || "visual"

  // Get all published lessons
  const { data: lessons, error: lessonsError } = await supabase
    .from("lessons")
    .select("*")
    .eq("is_published", true)
    .order("created_at", { ascending: true })

  // If is_published column doesn't exist, try without it
  let finalLessons = lessons
  if (lessonsError && lessonsError.message?.includes("is_published")) {
    const { data: fallback } = await supabase.from("lessons").select("*").order("created_at", { ascending: true })
    finalLessons = fallback
  }

  // Get user's lesson progress
  const { data: progress } = await supabase
    .from("lesson_progress")
    .select("lesson_id, completed")
    .eq("user_id", user.id)

  // Create a map of lesson progress for easy lookup
  const progressMap = new Map()
  progress?.forEach((item) => {
    progressMap.set(item.lesson_id, item.completed)
  })

  // Helper function to get the learning style from lesson
  const getLessonStyle = (lesson: any) => {
    const style = lesson.learning_style || lesson.category || "unknown"
    return style
  }

  // Group lessons by learning style
  const userStyleLessons = []
  const universalLessons = []
  const visualLessons = []
  const auditoryLessons = []
  const kinestheticLessons = []

  if (finalLessons && Array.isArray(finalLessons)) {
    finalLessons.forEach((lesson) => {
      const style = getLessonStyle(lesson)

      if (style === userLearningStyle) {
        userStyleLessons.push(lesson)
      } else if (style === "all" || style === "universal") {
        universalLessons.push(lesson)
      } else if (style === "visual" && userLearningStyle !== "visual") {
        visualLessons.push(lesson)
      } else if (style === "auditory" && userLearningStyle !== "auditory") {
        auditoryLessons.push(lesson)
      } else if (style === "kinesthetic" && userLearningStyle !== "kinesthetic") {
        kinestheticLessons.push(lesson)
      }
    })
  }

  const getStyleDisplayName = (style: string) => {
    switch (style) {
      case "visual":
        return "Vizual"
      case "auditory":
        return "Auditiv"
      case "kinesthetic":
        return "Kinestezic"
      default:
        return "Necunoscut"
    }
  }

  return (
    <Layout>
      <div className="relative min-h-screen">
        {/* Decorative background elements */}
        <DecorativeElements />

        <div className="container mx-auto px-4 py-8 relative z-10">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Lecții disponibile
            </h1>
            <p className="text-muted-foreground">
              Explorează lecțiile adaptate stilului tău de învățare:{" "}
              <span className="text-accent font-medium">{getStyleDisplayName(userLearningStyle)}</span>
            </p>
          </div>

          {/* 1. Lessons for user's current learning style */}
          {userStyleLessons.length > 0 && (
            <div className="mb-12">
              <div className="flex items-center gap-3 mb-6">
                <h2 className="text-2xl font-bold text-foreground">Recomandate pentru tine</h2>
                <span className="px-3 py-1 bg-accent/20 text-accent rounded-full text-sm font-medium border border-accent/30">
                  {getStyleDisplayName(userLearningStyle)}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {userStyleLessons.map((lesson, index) => {
                  const isCompleted = progressMap.get(lesson.id) || false
                  return <LessonCard key={lesson.id} lesson={lesson} isCompleted={isCompleted} index={index} />
                })}
              </div>
            </div>
          )}

          {/* 2. Universal lessons */}
          {universalLessons.length > 0 && (
            <div className="mb-12">
              <div className="flex items-center gap-3 mb-6">
                <h2 className="text-2xl font-bold text-foreground">Lecții pentru toți</h2>
                <span className="px-3 py-1 bg-primary/20 text-primary rounded-full text-sm font-medium border border-primary/30">
                  Universal
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {universalLessons.map((lesson, index) => {
                  const isCompleted = progressMap.get(lesson.id) || false
                  return <LessonCard key={lesson.id} lesson={lesson} isCompleted={isCompleted} index={index} />
                })}
              </div>
            </div>
          )}

          {/* 3. Visual lessons (if user is not visual) */}
          {visualLessons.length > 0 && (
            <div className="mb-12">
              <div className="flex items-center gap-3 mb-6">
                <h2 className="text-2xl font-bold text-foreground">Lecții pentru stil Vizual</h2>
                <span className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-sm font-medium border border-blue-500/30">
                  Vizual
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {visualLessons.map((lesson, index) => {
                  const isCompleted = progressMap.get(lesson.id) || false
                  return <LessonCard key={lesson.id} lesson={lesson} isCompleted={isCompleted} index={index} />
                })}
              </div>
            </div>
          )}

          {/* 4. Auditory lessons (if user is not auditory) */}
          {auditoryLessons.length > 0 && (
            <div className="mb-12">
              <div className="flex items-center gap-3 mb-6">
                <h2 className="text-2xl font-bold text-foreground">Lecții pentru stil Auditiv</h2>
                <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm font-medium border border-green-500/30">
                  Auditiv
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {auditoryLessons.map((lesson, index) => {
                  const isCompleted = progressMap.get(lesson.id) || false
                  return <LessonCard key={lesson.id} lesson={lesson} isCompleted={isCompleted} index={index} />
                })}
              </div>
            </div>
          )}

          {/* 5. Kinesthetic lessons (if user is not kinesthetic) */}
          {kinestheticLessons.length > 0 && (
            <div className="mb-12">
              <div className="flex items-center gap-3 mb-6">
                <h2 className="text-2xl font-bold text-foreground">Lecții pentru stil Kinestezic</h2>
                <span className="px-3 py-1 bg-orange-500/20 text-orange-400 rounded-full text-sm font-medium border border-orange-500/30">
                  Kinestezic
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {kinestheticLessons.map((lesson, index) => {
                  const isCompleted = progressMap.get(lesson.id) || false
                  return <LessonCard key={lesson.id} lesson={lesson} isCompleted={isCompleted} index={index} />
                })}
              </div>
            </div>
          )}

          {/* Show all lessons for debugging if none are categorized */}
          {finalLessons &&
            finalLessons.length > 0 &&
            userStyleLessons.length === 0 &&
            universalLessons.length === 0 &&
            visualLessons.length === 0 &&
            auditoryLessons.length === 0 &&
            kinestheticLessons.length === 0 && (
              <div className="mb-12">
                <h2 className="text-2xl font-bold text-foreground mb-6">Toate lecțiile</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {finalLessons.map((lesson, index) => {
                    const isCompleted = progressMap.get(lesson.id) || false
                    return <LessonCard key={lesson.id} lesson={lesson} isCompleted={isCompleted} index={index} />
                  })}
                </div>
              </div>
            )}

          {/* Show message if no lessons */}
          {(!finalLessons || finalLessons.length === 0) && (
            <div className="text-center py-12">
              <div className="bg-card/50 backdrop-blur-sm border border-border rounded-lg p-8">
                <p className="text-muted-foreground mb-4">Nu există lecții disponibile momentan.</p>
                <p className="text-sm text-muted-foreground">
                  Verifică din nou mai târziu sau contactează administratorul.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}
