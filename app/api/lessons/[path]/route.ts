import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import path from "path"
import fs from "fs/promises"

// Define the directory where markdown files will be stored
const CONTENT_DIR = path.join(process.cwd(), "content", "lessons")

// Ensure the content directory exists
async function ensureContentDir() {
  try {
    await fs.mkdir(CONTENT_DIR, { recursive: true })
  } catch (error) {
    console.error("Error creating content directory:", error)
  }
}

// Helper to get the file path for a lesson
function getLessonFilePath(contentPath: string) {
  return path.join(CONTENT_DIR, `${contentPath}.md`)
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ path: string }> }) {
  const { path: contentPath } = await params
  const supabase = await createClient()

  // Check authentication
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Get learning style from query params or user profile
  const searchParams = request.nextUrl.searchParams
  let style = searchParams.get("style") || "visual"

  if (!style || style === "null") {
    // Fallback to user profile if not specified
    const { data: profile } = await supabase.from("profiles").select("learning_style").eq("id", user.id).single()

    style = profile?.learning_style || "visual"
  }

  try {
    // Ensure content directory exists
    await ensureContentDir()

    // Try to get the lesson content from the file system first
    const filePath = getLessonFilePath(contentPath)

    try {
      const fileContent = await fs.readFile(filePath, "utf-8")
      return NextResponse.json({ content: fileContent })
    } catch (fileError) {
      // If file doesn't exist, try to get from database
      const { data: lesson, error } = await supabase
        .from("lessons")
        .select("content")
        .eq("content_path", contentPath)
        .single()

      if (!error && lesson && lesson.content) {
        // Return the content from the database
        return NextResponse.json({ content: lesson.content })
      }

      // If not found in database or no content, fall back to the mock function
      const content = getLessonContent(contentPath, style)
      return NextResponse.json({ content })
    }
  } catch (error) {
    console.error("Error fetching lesson content:", error)
    return NextResponse.json({ error: "Failed to fetch lesson content" }, { status: 500 })
  }
}

// This is a mock function that would normally fetch content from a CMS or file storage
function getLessonContent(path: string, style: string) {
  // In a real app, this would fetch from a database or file system
  // For this example, we'll return mock content based on learning style

  const baseContent = `
# ${path.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}

This is the main content of the lesson that applies to all learning styles.

## Key Concepts

- Important point 1
- Important point 2
- Important point 3

## Summary

This is a summary of what we've learned.
  `

  let styleSpecificContent = ""

  switch (style) {
    case "visual":
      styleSpecificContent = `
## Visual Learning Resources

Here are some diagrams and visual aids to help you understand the concepts:

![Diagram](/placeholder.svg?height=300&width=500)

**Color-coded concept map:**

- <span style="color: blue;">First concept</span>
- <span style="color: green;">Second concept</span>
- <span style="color: red;">Third concept</span>
      `
      break
    case "auditory":
      styleSpecificContent = `
## Auditory Learning Resources

Consider these verbal explanations and discussions:

- Try reading these points out loud
- Explain the concepts to someone else
- Record yourself summarizing the key points and listen back

**Discussion questions:**

1. How would you explain this concept in your own words?
2. What questions would you ask to clarify your understanding?
3. How does this relate to concepts you already know?
      `
      break
    case "kinesthetic":
      styleSpecificContent = `
## Kinesthetic Learning Resources

Here are some hands-on activities to reinforce your learning:

1. Create a physical model representing the main concept
2. Act out the process or concept
3. Apply the concept to a real-world problem

**Practice exercises:**

- Exercise 1: [Description of a hands-on activity]
- Exercise 2: [Description of another hands-on activity]
- Exercise 3: [Description of a real-world application]
      `
      break
    default:
      styleSpecificContent = `
## Additional Resources

Here are some general resources to help you understand the concepts:

- Resource 1
- Resource 2
- Resource 3
      `
  }

  return baseContent + styleSpecificContent
}
