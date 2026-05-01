import { createClient, createAdminClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    // Use the regular client for auth check (respects cookies/session)
    const supabase = await createClient()

    // Get the current user to verify admin status
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      console.error("No user found in GET request")
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

    // Use admin client to bypass RLS for the data query
    const supabaseAdmin = createAdminClient()

    const { data, error } = await supabaseAdmin.from("lessons").select("*").order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching lessons:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error: any) {
    console.error("Error in lessons route:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    // Get the current user to verify admin status
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      console.error("No user found in POST request")
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

    // Insert the new lesson using admin client
    const supabaseAdmin = createAdminClient()
    const { data, error } = await supabaseAdmin.from("lessons").insert(lessonData).select()

    if (error) {
      console.error("Error inserting lesson:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error: any) {
    console.error("Error in lessons POST route:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
