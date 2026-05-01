import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { data: userGroups, error: userGroupsError } = await supabase
    .from("group_members")
    .select("group_id")
    .eq("user_id", user.id)

  if (userGroupsError) {
    console.error("Error fetching user groups:", userGroupsError)
    return NextResponse.json({ error: "Failed to fetch user groups" }, { status: 500 })
  }

  const groupIds = userGroups.map((group) => group.group_id)

  if (groupIds.length === 0) {
    return NextResponse.json({ groups: [] })
  }

  const { data: groups, error: groupsError } = await supabase
    .from("groups")
    .select(`
      *,
      members:group_members(
        user_id,
        role,
        profiles:user_id(
          full_name
        )
      )
    `)
    .in("id", groupIds)

  if (groupsError) {
    console.error("Error fetching groups:", groupsError)
    return NextResponse.json({ error: "Failed to fetch groups" }, { status: 500 })
  }

  return NextResponse.json({ groups })
}

export async function POST(request: Request) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { name, description, isPrivate } = await request.json()

    if (!name) {
      return NextResponse.json({ error: "Group name is required" }, { status: 400 })
    }

    const { data: group, error } = await supabase
      .from("groups")
      .insert({
        name,
        description,
        created_by: user.id,
        is_private: isPrivate || false,
      })
      .select()
      .single()

    if (error) {
      console.error("Error creating group:", error)
      return NextResponse.json({ error: "Failed to create group" }, { status: 500 })
    }

    return NextResponse.json({ group })
  } catch (error) {
    console.error("Error processing request:", error)
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }
}
