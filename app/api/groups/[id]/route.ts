import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Fetch the group with all its members
  const { data: group, error } = await supabase
    .from("groups")
    .select(`
      *,
      members:group_members(
        id,
        user_id,
        role,
        joined_at
      )
    `)
    .eq("id", id)
    .single()

  if (error) {
    console.error("Error fetching group:", error)
    return NextResponse.json({ error: "Failed to fetch group" }, { status: 500 })
  }

  // Check if the user is a member of the group
  const isMember = group.members.some((member: any) => member.user_id === user.id)
  if (!isMember && group.is_private) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }

  // Get all user_ids from group members
  const memberUserIds = group.members.map((member: any) => member.user_id)

  // Fetch profiles data for all group members
  const { data: profilesData, error: profilesError } = await supabase
    .from("profiles")
    .select(`
      id,
      full_name,
      first_name,
      last_name,
      xp,
      streak,
      learning_style
    `)
    .in("id", memberUserIds)

  if (profilesError) {
    console.error("Error fetching profiles:", profilesError)
    return NextResponse.json({ error: "Failed to fetch profiles" }, { status: 500 })
  }

  // Create a map of user_id to profile data for easier access
  const profilesMap: Record<string, any> = {}
  profilesData.forEach((profile) => {
    profilesMap[profile.id] = profile
  })

  // Fetch completed lessons count for each user
  const { data: lessonsData, error: lessonsError } = await supabase
    .from("lesson_progress")
    .select("user_id, lesson_id")
    .in("user_id", memberUserIds)
    .eq("completed", true)

  if (lessonsError) {
    console.error("Error fetching lessons data:", lessonsError)
  }

  // Create a map of user_id to lessons completed
  const lessonsCompletedMap: Record<string, number> = {}
  if (lessonsData) {
    lessonsData.forEach((item: any) => {
      if (!lessonsCompletedMap[item.user_id]) {
        lessonsCompletedMap[item.user_id] = 0
      }
      lessonsCompletedMap[item.user_id]++
    })
  }

  // Fetch group posts if they exist
  const { data: postsData, error: postsError } = await supabase
    .from("group_posts")
    .select(`
      id,
      content,
      created_at,
      user_id,
      likes,
      comments
    `)
    .eq("group_id", id)
    .order("created_at", { ascending: false })

  if (postsError) {
    console.error("Error fetching group posts:", postsError)
  }

  // Enhance members data with profile information
  const membersWithProfiles = group.members.map((member: any) => {
    const profile = profilesMap[member.user_id] || {}
    return {
      ...member,
      profile: {
        full_name: profile.full_name || `Utilizator ${member.user_id.substring(0, 4)}`,
        first_name: profile.first_name,
        last_name: profile.last_name,
        xp: profile.xp || 0,
        streak: profile.streak || 0,
        learning_style: profile.learning_style,
      },
    }
  })

  // Prepare leaderboard data
  const leaderboardData = memberUserIds.map((userId) => {
    const profile = profilesMap[userId] || {}
    return {
      userId,
      name: profile.full_name || `Utilizator ${userId.substring(0, 4)}`,
      full_name: profile.full_name,
      xp: profile.xp || 0,
      streak: profile.streak || 0,
      lessonsCompleted: lessonsCompletedMap[userId] || 0,
    }
  })

  // Enhance posts with author information
  const postsWithAuthors = postsData
    ? postsData.map((post: any) => {
        const profile = profilesMap[post.user_id] || {}
        return {
          ...post,
          author: {
            id: post.user_id,
            name: profile.full_name || `Utilizator ${post.user_id.substring(0, 4)}`,
            learning_style: profile.learning_style,
          },
        }
      })
    : []

  return NextResponse.json({
    group: {
      ...group,
      members: membersWithProfiles,
    },
    leaderboard: leaderboardData,
    posts: postsWithAuthors,
    isMember,
  })
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { name, description, isPrivate } = await request.json()

    // Verifică dacă utilizatorul este admin
    const { data: membership, error: membershipError } = await supabase
      .from("group_members")
      .select("role")
      .eq("group_id", id)
      .eq("user_id", user.id)
      .single()

    if (membershipError || membership.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const { data: group, error } = await supabase
      .from("groups")
      .update({
        name,
        description,
        is_private: isPrivate,
      })
      .eq("id", id)
      .select()
      .single()

    if (error) {
      console.error("Error updating group:", error)
      return NextResponse.json({ error: "Failed to update group" }, { status: 500 })
    }

    return NextResponse.json({ group })
  } catch (error) {
    console.error("Error processing request:", error)
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Verifică dacă utilizatorul este creatorul grupului
  const { data: group, error: groupError } = await supabase
    .from("groups")
    .select("created_by")
    .eq("id", id)
    .single()

  if (groupError) {
    console.error("Error fetching group:", groupError)
    return NextResponse.json({ error: "Failed to fetch group" }, { status: 500 })
  }

  if (group.created_by !== user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }

  const { error } = await supabase.from("groups").delete().eq("id", id)

  if (error) {
    console.error("Error deleting group:", error)
    return NextResponse.json({ error: "Failed to delete group" }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
