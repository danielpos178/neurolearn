import Layout from "@/components/layout"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { GroupsList } from "@/components/groups/groups-list"
import { CreateGroupButton } from "@/components/groups/create-group-button"
import { JoinGroupButton } from "@/components/groups/join-group-button"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Globe } from "lucide-react"
import type { Tables } from "@/types/supabase" // Import type for Supabase tables

export default async function GroupsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    redirect("/login")
  }

  // Step 1 – get the user's group IDs
  const { data: membershipRows, error: membershipsError } = await supabase
    .from("group_members")
    .select("group_id")
    .eq("user_id", user.id)

  if (membershipsError) {
    console.error("Error fetching group memberships:", membershipsError)
    return (
      <Layout>
        <div className="container mx-auto py-8">
          <h1 className="text-3xl font-bold mb-6">Grupurile mele</h1>
          <p className="text-red-500">A apărut o eroare la încărcarea membrilor: {membershipsError.message}</p>
          <div className="mt-4">
            <p className="text-sm text-muted-foreground mb-2">
              Această eroare poate fi cauzată de politicile RLS. Încearcă să rulezi fix-ul din panoul de administrare.
            </p>
            <Link href="/admin">
              <Button variant="outline">Mergi la Admin</Button>
            </Link>
          </div>
        </div>
      </Layout>
    )
  }

  const groupIds = (membershipRows ?? []).map((row) => row.group_id)

  if (groupIds.length === 0) {
    return (
      <Layout>
        <div className="container mx-auto py-8">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold">Grupurile mele</h1>
            <div className="flex gap-2">
              <Link href="/grupuri/publice">
                <Button variant="outline" className="flex items-center gap-2 bg-transparent">
                  <Globe className="h-4 w-4" />
                  Grupuri publice
                </Button>
              </Link>
              <JoinGroupButton />
              <CreateGroupButton />
            </div>
          </div>
          <div className="text-center py-12">
            <h3 className="text-xl font-medium mb-2">Nu ești membru în niciun grup</h3>
            <p className="text-muted-foreground mb-6">
              Creează un grup nou, alătură-te unui grup existent folosind un cod de invitație sau descoperă grupuri
              publice.
            </p>
          </div>
        </div>
      </Layout>
    )
  }

  // Step 2 – fetch the actual groups and their member counts
  // We select the group details and then use a subquery to count members
  const { data: groupsData, error: groupsError } = await supabase
    .from("groups")
    .select("*, group_members(count)") // Select group details and count from related group_members
    .in("id", groupIds)

  if (groupsError) {
    console.error("Error fetching user groups:", groupsError)
    return (
      <Layout>
        <div className="container mx-auto py-8">
          <h1 className="text-3xl font-bold mb-6">Grupurile mele</h1>
          <p className="text-red-500">A apărut o eroare la încărcarea grupurilor: {groupsError.message}</p>
        </div>
      </Layout>
    )
  }

  // Map the fetched data to include memberCount directly in the group object
  const groupsWithMemberCount = (groupsData ?? []).map((group) => ({
    ...group,
    memberCount: group.group_members?.[0]?.count ?? 0, // Access the count from the nested array
  })) as (Tables<"groups"> & { memberCount: number })[]

  return (
    <Layout>
      <div className="container mx-auto py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Grupurile mele</h1>
          <div className="flex gap-2">
            <Link href="/grupuri/publice">
              <Button variant="outline" className="flex items-center gap-2 bg-transparent">
                <Globe className="h-4 w-4" />
                Grupuri publice
              </Button>
            </Link>
            <JoinGroupButton />
            <CreateGroupButton />
          </div>
        </div>

        <GroupsList groups={groupsWithMemberCount} />
      </div>
    </Layout>
  )
}
