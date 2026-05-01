import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Layout from "@/components/layout"
import { GroupDetails } from "@/components/groups/group-details"
import { GroupLeaderboard } from "@/components/groups/group-leaderboard"
import { GroupMembers } from "@/components/groups/group-members"
import { GroupPosts } from "@/components/groups/group-posts"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default async function GroupPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    redirect("/login")
  }

  // Fetch group data directly from Supabase instead of using the API
  const { data: group, error: groupError } = await supabase
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

  if (groupError) {
    console.error("Error fetching group:", groupError)
    redirect("/grupuri")
  }

  // Check if the user is a member of the group
  const memberRecord = group.members.find((member: any) => member.user_id === user.id)
  const isMember = !!memberRecord
  const userRole = memberRecord?.role || null

  // If the group is private and the user is not a member, redirect
  if (group.is_private && !isMember) {
    redirect("/grupuri")
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
  }

  // Create a map of user_id to profile data for easier access
  const profilesMap: Record<string, any> = {}
  if (profilesData) {
    profilesData.forEach((profile) => {
      profilesMap[profile.id] = profile
    })
  }

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

  return (
    <Layout>
      <div className="container mx-auto py-8 min-h-[calc(100vh-200px)]">
        <GroupDetails group={group} isMember={isMember} userRole={userRole} memberCount={group.members.length} />

        <Tabs defaultValue="leaderboard" className="mt-8">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="leaderboard">Clasament</TabsTrigger>
            <TabsTrigger value="members">Membri ({group.members.length})</TabsTrigger>
            <TabsTrigger value="posts">Postări ({postsWithAuthors?.length || 0})</TabsTrigger>
          </TabsList>
          <TabsContent value="leaderboard" className="mt-4">
            <GroupLeaderboard leaderboard={leaderboardData} groupId={id} />
          </TabsContent>
          <TabsContent value="members" className="mt-4">
            <GroupMembers
              members={membersWithProfiles}
              groupId={id}
              userRole={userRole}
              currentUserId={user.id}
            />
          </TabsContent>
          <TabsContent value="posts" className="mt-4">
            <GroupPosts
              posts={postsWithAuthors}
              groupId={id}
              isMember={isMember}
              currentUserId={user.id}
            />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  )
}
