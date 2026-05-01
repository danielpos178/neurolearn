"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { MoreHorizontal, Crown, Shield, User, UserMinus } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useState } from "react"
import { calculateUserLevel } from "@/lib/utils/level-calculator"

interface GroupMembersProps {
  members: any[]
  groupId: string
  userRole: string | null
  currentUserId: string
}

export function GroupMembers({ members, groupId, userRole, currentUserId }: GroupMembersProps) {
  const { toast } = useToast()
  const router = useRouter()
  const supabase = createClient()
  const [removingMember, setRemovingMember] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleRemoveMember = async () => {
    if (!removingMember) return

    setIsLoading(true)
    try {
      const { error } = await supabase
        .from("group_members")
        .delete()
        .eq("group_id", groupId)
        .eq("user_id", removingMember.user_id)

      if (error) throw error

      toast({
        title: "Succes",
        description: "Membrul a fost eliminat din grup",
      })

      router.refresh()
    } catch (error: any) {
      toast({
        title: "Eroare",
        description: error.message || "A apărut o eroare la eliminarea membrului",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
      setRemovingMember(null)
    }
  }

  const handleChangeRole = async (memberId: string, newRole: string) => {
    try {
      const { error } = await supabase
        .from("group_members")
        .update({ role: newRole })
        .eq("group_id", groupId)
        .eq("user_id", memberId)

      if (error) throw error

      toast({
        title: "Succes",
        description: `Rolul membrului a fost schimbat în ${newRole === "admin" ? "administrator" : "membru"}`,
      })

      router.refresh()
    } catch (error: any) {
      toast({
        title: "Eroare",
        description: error.message || "A apărut o eroare la schimbarea rolului",
        variant: "destructive",
      })
    }
  }

  const isAdmin = userRole === "admin"

  return (
    <Card>
      <CardHeader>
        <CardTitle>Membri ({members.length})</CardTitle>
      </CardHeader>
      <CardContent>
        {members.length === 0 ? (
          <p className="text-center py-8 text-muted-foreground">Nu există membri în acest grup.</p>
        ) : (
          <div className="space-y-4">
            {members.map((member) => {
              // Calculate level from XP
              const { level } = calculateUserLevel(member.profile?.xp || 0)

              return (
                <div key={member.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback>{member.profile?.full_name?.charAt(0) || "U"}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{member.profile?.full_name || "Utilizator necunoscut"}</p>
                        {member.role === "admin" && (
                          <Badge variant="outline" className="flex items-center gap-1">
                            <Crown className="h-3 w-3" />
                            Admin
                          </Badge>
                        )}
                        {member.user_id === currentUserId && (
                          <Badge variant="secondary" className="text-xs">
                            Tu
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Nivel: {level} • XP: {member.profile?.xp || 0}
                      </p>
                    </div>
                  </div>

                  {isAdmin && member.user_id !== currentUserId && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {member.role !== "admin" ? (
                          <DropdownMenuItem onClick={() => handleChangeRole(member.user_id, "admin")}>
                            <Shield className="h-4 w-4 mr-2" />
                            Promovează la admin
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem onClick={() => handleChangeRole(member.user_id, "member")}>
                            <User className="h-4 w-4 mr-2" />
                            Retrogradează la membru
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => setRemovingMember(member)}>
                          <UserMinus className="h-4 w-4 mr-2" />
                          Elimină din grup
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </CardContent>

      {/* Dialog pentru confirmarea eliminării unui membru */}
      <Dialog open={!!removingMember} onOpenChange={(open) => !open && setRemovingMember(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Elimină membrul</DialogTitle>
            <DialogDescription>
              Ești sigur că vrei să elimini acest membru din grup? Această acțiune nu poate fi anulată.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemovingMember(null)}>
              Anulează
            </Button>
            <Button variant="destructive" onClick={handleRemoveMember} disabled={isLoading}>
              {isLoading ? "Se procesează..." : "Elimină membrul"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
