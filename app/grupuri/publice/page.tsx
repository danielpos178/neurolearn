import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Layout from "@/components/layout"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Users, ArrowRight, Globe } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import JoinPublicGroupButton from "@/components/groups/join-public-group-button"

export default async function PublicGroupsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    redirect("/login")
  }

  // Obținem toate grupurile publice
  const { data: publicGroups, error: groupsError } = await supabase.from("groups").select("*").eq("is_private", false)

  if (groupsError) {
    console.error("Error fetching public groups:", groupsError)
  }

  // Obținem numărul de membri pentru fiecare grup
  const groupsWithMemberCount = await Promise.all(
    (publicGroups || []).map(async (group) => {
      const { count } = await supabase
        .from("group_members")
        .select("*", { count: "exact", head: true })
        .eq("group_id", group.id)

      return {
        ...group,
        memberCount: count || 0,
      }
    }),
  )

  // Sortăm grupurile după numărul de membri (descrescător)
  const sortedGroups = groupsWithMemberCount.sort((a, b) => b.memberCount - a.memberCount)

  // Verificăm grupurile la care utilizatorul este deja membru
  const { data: userMemberships } = await supabase
    .from("group_members")
    .select("group_id")
    .eq("user_id", user.id)

  const userGroupIds = new Set(userMemberships?.map((m) => m.group_id) || [])

  return (
    <Layout>
      <div className="container mx-auto py-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">Grupuri publice</h1>
            <p className="text-muted-foreground mt-2">
              Descoperă grupuri publice și alătură-te comunității pentru a învăța împreună
            </p>
          </div>
          <Link href="/grupuri">
            <Button variant="outline">Grupurile mele</Button>
          </Link>
        </div>

        {sortedGroups.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sortedGroups.map((group) => (
              <Card key={group.id} className="h-full flex flex-col">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-xl">{group.name}</CardTitle>
                    <Badge variant="outline" className="flex items-center gap-1">
                      <Globe className="h-3 w-3" />
                      Public
                    </Badge>
                  </div>
                  <CardDescription className="line-clamp-2">{group.description || "Fără descriere"}</CardDescription>
                </CardHeader>
                <CardContent className="flex-grow">
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Users className="h-4 w-4 mr-1" />
                    <span>{group.memberCount} membri</span>
                  </div>
                </CardContent>
                <CardFooter>
                  {userGroupIds.has(group.id) ? (
                    <Button asChild className="w-full">
                      <Link href={`/grupuri/${group.id}`}>
                        <span className="mr-2">Vezi grupul</span>
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  ) : (
                    <JoinPublicGroupButton groupId={group.id} />
                  )}
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <h3 className="text-xl font-medium mb-2">Nu există grupuri publice</h3>
            <p className="text-muted-foreground mb-6">
              Fii primul care creează un grup public și invită alți utilizatori să se alăture.
            </p>
            <Link href="/grupuri">
              <Button>Înapoi la grupuri</Button>
            </Link>
          </div>
        )}
      </div>
    </Layout>
  )
}
