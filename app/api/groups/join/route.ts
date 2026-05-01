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

    // Parse JSON body
    let requestData
    try {
      requestData = await request.json()
    } catch (e) {
      console.error("Error parsing request body:", e)
      return NextResponse.json({ error: "Invalid request format" }, { status: 400 })
    }

    const { inviteCode } = requestData

    if (!inviteCode) {
      return NextResponse.json({ error: "Invite code is required" }, { status: 400 })
    }

    // Find group by invite code
    const { data: group, error: groupError } = await supabase
      .from("groups")
      .select("id")
      .eq("invite_code", inviteCode)
      .single()

    if (groupError) {
      console.error("Error finding group:", groupError)
      return NextResponse.json({ error: "Invalid invite code" }, { status: 404 })
    }

    // Check if user is already a member
    const { data: existingMember, error: memberError } = await supabase
      .from("group_members")
      .select("id")
      .eq("group_id", group.id)
      .eq("user_id", user.id)
      .maybeSingle()

    if (existingMember) {
      return NextResponse.json({
        success: true,
        message: "You are already a member of this group",
        groupId: group.id,
        alreadyMember: true,
      })
    }

    // Add user to group
    const { data: membership, error } = await supabase
      .from("group_members")
      .insert({
        group_id: group.id,
        user_id: user.id,
        role: "member",
      })
      .select()
      .single()

    if (error) {
      console.error("Error joining group:", error)
      return NextResponse.json({ error: "Failed to join group" }, { status: 500 })
    }

    return NextResponse.json({ success: true, groupId: group.id })
  } catch (error) {
    console.error("Error processing request:", error)
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }
}
