import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Layout from "@/components/layout"
import { Card } from "@/components/ui/card"
import { Clock, BookOpen, CheckCircle, Brain } from "lucide-react"
import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { MarkLessonComplete } from "@/components/lessons/mark-complete"
import { LessonContent } from "@/components/lessons/lesson-content"
import { Badge } from "@/components/ui/badge"

interface LessonPageProps {
  params: Promise<{
    id: string
  }>
}

export async function generateMetadata({ params }: LessonPageProps): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()

  const { data: lesson } = await supabase.from("lessons").select("title, description").eq("id", id).single()

  if (!lesson) {
    return {
      title: "Lecție negăsită",
    }
  }

  return {
    title: `${lesson.title} | NeuroLearn`,
    description: lesson.description,
  }
}

export default async function LessonPage({ params }: LessonPageProps) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    redirect("/login")
  }

  // Get lesson details with better error handling
  const { data: lesson, error: lessonError } = await supabase.from("lessons").select("*").eq("id", id).single()

  if (lessonError) {
    console.error("Error fetching lesson:", lessonError)
    notFound()
  }

  if (!lesson) {
    notFound()
  }

  // Get user's progress for this lesson
  const { data: progress } = await supabase
    .from("lesson_progress")
    .select("*")
    .eq("user_id", user.id)
    .eq("lesson_id", id)
    .single()

  const isCompleted = progress?.completed || false

  // Get user profile to determine learning style
  const { data: profile } = await supabase.from("profiles").select("learning_style").eq("id", user.id).single()

  const userLearningStyle = profile?.learning_style || "visual"
  const isMatchingStyle = lesson.learning_style === userLearningStyle || lesson.learning_style === "all"

  // Helper function to get learning style display name
  const getLearningStyleName = (style: string) => {
    switch (style) {
      case "visual":
        return "Vizual"
      case "auditory":
        return "Auditiv"
      case "kinesthetic":
        return "Kinestezic"
      case "all":
        return "Universal"
      default:
        return "Universal"
    }
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground mb-2">
              <Clock className="h-4 w-4" />
              <span>{lesson.estimated_duration} minute</span>
              <span className="mx-2">•</span>
              <BookOpen className="h-4 w-4" />
              <span className="capitalize">{lesson.difficulty}</span>
              <span className="mx-2">•</span>
              <Brain className="h-4 w-4" />
              <Badge variant={isMatchingStyle ? "default" : "outline"} className="ml-1">
                {getLearningStyleName(lesson.category)}
              </Badge>
              {isCompleted && (
                <>
                  <span className="mx-2">•</span>
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-green-500 font-medium">Finalizat</span>
                </>
              )}
            </div>

            <h1 className="text-3xl font-bold mb-4 text-foreground">{lesson.title}</h1>
            <p className="text-muted-foreground text-lg leading-relaxed">{lesson.description}</p>
          </div>

          <Card className="p-6 mb-8 bg-card/50 backdrop-blur-sm border-border/50">
            <LessonContent contentPath={lesson.content_path} learningStyle={userLearningStyle} lessonId={lesson.id} />
          </Card>

          <div className="flex justify-between items-center">
            <div className="text-sm text-muted-foreground">
              {isCompleted ? (
                <span className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  Lecție finalizată
                </span>
              ) : (
                <span>Marchează ca finalizată pentru a primi XP</span>
              )}
            </div>
            <MarkLessonComplete lessonId={id} userId={user.id} isCompleted={isCompleted} />
          </div>
        </div>
      </div>
    </Layout>
  )
}
