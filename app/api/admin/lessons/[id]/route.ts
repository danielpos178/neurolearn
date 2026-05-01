import { createClient, createAdminClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    const supabase = await createClient()

    // Get the current user to verify admin status
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user is admin
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    if (profileError) {
      console.error("Error fetching profile:", profileError)
      return NextResponse.json({ error: "Error fetching user profile" }, { status: 500 })
    }

    if (!profile || profile.role !== "admin") {
      console.error("User is not admin:", profile)
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 })
    }

    // Get the lesson data from the request body
    const lessonData = await request.json()

    // Update the lesson using admin client
    const supabaseAdmin = createAdminClient()
    const { data, error } = await supabaseAdmin.from("lessons").update(lessonData).eq("id", id).select()

    if (error) {
      console.error("Error updating lesson:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error: any) {
    console.error("Error in lessons PUT route:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    const supabase = await createClient()

    // Get the current user to verify admin status
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user is admin
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    if (profileError) {
      console.error("Error fetching profile:", profileError)
      return NextResponse.json({ error: "Error fetching user profile" }, { status: 500 })
    }

    if (!profile || profile.role !== "admin") {
      console.error("User is not admin:", profile)
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 })
    }

    // Delete the lesson using admin client
    const supabaseAdmin = createAdminClient()
    const { error } = await supabaseAdmin.from("lessons").delete().eq("id", id)

    if (error) {
      console.error("Error deleting lesson:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Error in lessons DELETE route:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
