"use client"

import { useState, useEffect } from "react"
import { Loader2 } from "lucide-react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import rehypeRaw from "rehype-raw"
import { createClient } from "@/lib/supabase/client"

interface LessonContentProps {
  contentPath: string
  learningStyle: string
  lessonId: string
}

export function LessonContent({ contentPath, learningStyle, lessonId }: LessonContentProps) {
  const [content, setContent] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    async function fetchContent() {
      try {
        setLoading(true)
        setError(null)

        console.log("Fetching content for lesson:", lessonId, "with path:", contentPath)

        // First, try to fetch the content directly from the database using lesson ID
        const { data: lessonData, error: lessonError } = await supabase
          .from("lessons")
          .select("content, title")
          .eq("id", lessonId)
          .single()

        console.log("Database query result:", { lessonData, lessonError })

        if (lessonError) {
          console.error("Database error:", lessonError)
          throw new Error(`Database error: ${lessonError.message}`)
        }

        if (lessonData && lessonData.content && lessonData.content.trim() !== "") {
          // If content is found in the database and is not empty, use it
          console.log("Using content from database")
          setContent(lessonData.content)
        } else {
          console.log("No content in database, trying fallback methods")

          // If not found in database or content is empty, try the API fallback
          try {
            const fallbackResponse = await fetch(`/api/lessons/${contentPath}?style=${learningStyle}`)

            if (!fallbackResponse.ok) {
              throw new Error(`API error: ${fallbackResponse.status} ${fallbackResponse.statusText}`)
            }

            const fallbackData = await fallbackResponse.json()
            console.log("Using fallback content from API")
            setContent(fallbackData.content || "Conținutul lecției nu este disponibil momentan.")
          } catch (apiError) {
            console.error("API fallback error:", apiError)

            // Final fallback - show a message that content is not available
            setContent(`
# ${lessonData?.title || "Lecție"}

Conținutul acestei lecții nu este disponibil momentan. Vă rugăm să contactați administratorul pentru mai multe informații.

## Ce puteți face:

1. Verificați conexiunea la internet
2. Reîncărcați pagina
3. Contactați suportul tehnic

---

*Cod eroare: CONTENT_NOT_FOUND*
            `)
          }
        }
      } catch (err) {
        console.error("Error loading lesson content:", err)
        setError("Nu s-a putut încărca conținutul lecției. Vă rugăm să încercați din nou mai târziu.")

        // Set a fallback error content
        setContent(`
# Eroare la încărcarea conținutului

Ne pare rău, dar conținutul acestei lecții nu poate fi încărcat momentan.

## Pași pentru rezolvare:

1. **Reîncărcați pagina** - Apăsați F5 sau butonul de refresh
2. **Verificați conexiunea** - Asigurați-vă că aveți conexiune la internet
3. **Încercați mai târziu** - Serverul poate fi temporar indisponibil

Dacă problema persistă, vă rugăm să contactați suportul tehnic.

---

*Eroare tehnică: ${err instanceof Error ? err.message : "Eroare necunoscută"}*
        `)
      } finally {
        setLoading(false)
      }
    }

    if (lessonId) {
      fetchContent()
    }
  }, [contentPath, learningStyle, lessonId, supabase])

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center py-12 space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Se încarcă conținutul lecției...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
          <p className="text-red-600 dark:text-red-400 font-medium mb-2">Eroare la încărcare</p>
          <p className="text-red-500 dark:text-red-300 text-sm">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="prose prose-lg dark:prose-invert max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        components={{
          // Custom components for better styling
          h1: ({ children }) => (
            <h1 className="text-3xl font-bold text-foreground mb-6 border-b border-border pb-2">{children}</h1>
          ),
          h2: ({ children }) => <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">{children}</h2>,
          h3: ({ children }) => <h3 className="text-xl font-medium text-foreground mt-6 mb-3">{children}</h3>,
          p: ({ children }) => <p className="text-foreground leading-relaxed mb-4">{children}</p>,
          ul: ({ children }) => <ul className="list-disc list-inside space-y-2 mb-4 text-foreground">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal list-inside space-y-2 mb-4 text-foreground">{children}</ol>,
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-primary pl-4 italic text-muted-foreground bg-muted/50 py-2 my-4 rounded-r">
              {children}
            </blockquote>
          ),
          code: ({ children, className }) => {
            const isInline = !className
            if (isInline) {
              return (
                <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono text-foreground">{children}</code>
              )
            }
            return (
              <code className={`${className} block bg-muted p-4 rounded-lg overflow-x-auto text-sm font-mono`}>
                {children}
              </code>
            )
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
