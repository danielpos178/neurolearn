import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import path from "path"
import fs from "fs/promises"

// Change the CONTENT_DIR constant to point to public/lessons instead
const CONTENT_DIR = path.join(process.cwd(), "public", "lessons")

// Update the getLessonFilePath function to use .md extension
function getLessonFilePath(contentPath: string) {
  return path.join(CONTENT_DIR, `${contentPath}.md`)
}

// Ensure the content directory exists
async function ensureContentDir() {
  try {
    await fs.mkdir(CONTENT_DIR, { recursive: true })
  } catch (error) {
    console.error("Error creating content directory:", error)
    throw error // Re-throw the error to be caught by the caller
  }
}

// GET handler to retrieve lesson content
export async function GET(request: NextRequest) {
  const supabase = await createClient()

  // Check authentication
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Get the content path from query params
  const contentPath = request.nextUrl.searchParams.get("path")
  if (!contentPath) {
    return NextResponse.json({ error: "Content path is required" }, { status: 400 })
  }

  try {
    // Get the file path
    const filePath = getLessonFilePath(contentPath)

    // Check if the file exists
    try {
      await fs.access(filePath)
    } catch (error) {
      // If file doesn't exist, return empty content
      return NextResponse.json({ content: "" })
    }

    // Read the file content
    const content = await fs.readFile(filePath, "utf-8")
    return NextResponse.json({ content })
  } catch (error) {
    console.error("Error reading lesson content:", error)
    return NextResponse.json({ error: "Failed to read lesson content" }, { status: 500 })
  }
}

// POST handler to save lesson content
export async function POST(request: NextRequest) {
  const supabase = await createClient()

  // Check authentication
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Check if user is admin
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (profileError || !profile || profile.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized - Admin access required" }, { status: 403 })
  }

  try {
    // Parse the request body
    const { path: contentPath, content } = await request.json()

    if (!contentPath || !content) {
      return NextResponse.json({ error: "Path and content are required" }, { status: 400 })
    }

    // Ensure the content directory exists
    await ensureContentDir()

    // Write the content to a file
    const filePath = getLessonFilePath(contentPath)
    await fs.writeFile(filePath, content, "utf-8")

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error saving lesson content:", error)
    return NextResponse.json({ error: "Failed to save lesson content" }, { status: 500 })
  }
}

// DELETE handler to remove lesson content
export async function DELETE(request: NextRequest) {
  const supabase = await createClient()

  // Check authentication
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Check if user is admin
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (profileError || !profile || profile.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized - Admin access required" }, { status: 403 })
  }

  // Get the content path from query params
  const contentPath = request.nextUrl.searchParams.get("path")
  if (!contentPath) {
    return NextResponse.json({ error: "Content path is required" }, { status: 400 })
  }

  try {
    // Get the file path
    const filePath = getLessonFilePath(contentPath)

    // Check if the file exists
    try {
      await fs.access(filePath)
    } catch (error) {
      // If file doesn't exist, return success
      return NextResponse.json({ success: true })
    }

    // Delete the file
    await fs.unlink(filePath)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting lesson content:", error)
    return NextResponse.json({ error: "Failed to delete lesson content" }, { status: 500 })
  }
}
