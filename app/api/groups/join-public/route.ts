import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Parse JSON body instead of FormData
    let requestData
    try {
      requestData = await request.json()
    } catch (e) {
      console.error("Error parsing request body:", e)
      return NextResponse.json({ error: "Invalid request format" }, { status: 400 })
    }

    const { groupId } = requestData

    if (!groupId) {
      return NextResponse.json({ error: "Group ID is required" }, { status: 400 })
    }

    // Check if group exists and is public
    const { data: group, error: groupError } = await supabase
      .from("groups")
      .select("is_private")
      .eq("id", groupId)
      .single()

    if (groupError) {
      console.error("Error finding group:", groupError)
      return NextResponse.json({ error: "Group not found" }, { status: 404 })
    }

    if (group.is_private) {
      return NextResponse.json({ error: "Cannot join private group without invitation" }, { status: 403 })
    }

    // Check if user is already a member
    const { data: existingMember, error: memberError } = await supabase
      .from("group_members")
      .select("id")
      .eq("group_id", groupId)
      .eq("user_id", user.id)
      .maybeSingle()

    if (existingMember) {
      // Return success with info that user is already a member
      return NextResponse.json({
        success: true,
        message: "Already a member",
        groupId,
        alreadyMember: true,
      })
    }

    // Add user to group
    const { error } = await supabase.from("group_members").insert({
      group_id: groupId,
      user_id: user.id,
      role: "member",
    })

    if (error) {
      console.error("Error joining group:", error)
      return NextResponse.json({ error: "Failed to join group" }, { status: 500 })
    }

    // Return success response
    return NextResponse.json({
      success: true,
      message: "Successfully joined group",
      groupId,
    })
  } catch (error) {
    console.error("Error processing request:", error)
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }
}
