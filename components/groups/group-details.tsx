"use client"

import type React from "react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { Copy, Users, Lock, Globe, UserMinus, Settings, Trash } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"

interface GroupDetailsProps {
  group: any
  isMember: boolean
  userRole: string | null
  memberCount?: number // Adăugăm această proprietate
}

export function GroupDetails({ group, isMember, userRole, memberCount = 0 }: GroupDetailsProps) {
  const { toast } = useToast()
  const router = useRouter()
  const supabase = createClient()
  const [isEditing, setIsEditing] = useState(false)
  const [isLeaving, setIsLeaving] = useState(false)
  const [name, setName] = useState(group.name)
  const [description, setDescription] = useState(group.description || "")
  const [isPrivate, setIsPrivate] = useState(group.is_private)
  const [isLoading, setIsLoading] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const copyInviteCode = () => {
    navigator.clipboard.writeText(group.invite_code)
    toast({
      title: "Cod copiat",
      description: "Codul de invitație a fost copiat în clipboard",
    })
  }

  const handleLeaveGroup = async () => {
    setIsLoading(true)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        toast({
          title: "Eroare",
          description: "Trebuie să fii autentificat",
          variant: "destructive",
        })
        return
      }

      const { error } = await supabase.from("group_members").delete().eq("group_id", group.id).eq("user_id", user.id)

      if (error) throw error

      toast({
        title: "Succes",
        description: "Ai părăsit grupul cu succes",
      })

      router.refresh()
      router.push("/grupuri")
    } catch (error: any) {
      toast({
        title: "Eroare",
        description: error.message || "A apărut o eroare la părăsirea grupului",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
      setIsLeaving(false)
    }
  }

  const handleUpdateGroup = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const { error } = await supabase
        .from("groups")
        .update({
          name,
          description,
          is_private: isPrivate,
        })
        .eq("id", group.id)

      if (error) throw error

      toast({
        title: "Succes",
        description: "Grupul a fost actualizat cu succes",
      })

      router.refresh()
      setIsEditing(false)
    } catch (error: any) {
      toast({
        title: "Eroare",
        description: error.message || "A apărut o eroare la actualizarea grupului",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteGroup = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/groups/${group.id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "A apărut o eroare la ștergerea grupului")
      }

      toast({
        title: "Succes",
        description: "Grupul a fost șters cu succes",
      })

      router.refresh()
      router.push("/grupuri")
    } catch (error: any) {
      toast({
        title: "Eroare",
        description: error.message || "A apărut o eroare la ștergerea grupului",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
      setIsDeleting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className="text-2xl">{group.name}</CardTitle>
              {group.is_private ? (
                <Badge variant="outline" className="flex items-center gap-1">
                  <Lock className="h-3 w-3" />
                  Privat
                </Badge>
              ) : (
                <Badge variant="outline" className="flex items-center gap-1">
                  <Globe className="h-3 w-3" />
                  Public
                </Badge>
              )}
            </div>
            <CardDescription className="mt-2">{group.description || "Fără descriere"}</CardDescription>
          </div>
          {isMember && userRole === "admin" && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                <Settings className="h-4 w-4 mr-2" />
                Editează
              </Button>
              <Button variant="destructive" size="sm" onClick={() => setIsDeleting(true)}>
                <Trash className="h-4 w-4 mr-2" />
                Șterge grupul
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-muted-foreground" />
              <span>
                {memberCount} {memberCount === 1 ? "membru" : "membri"}
              </span>
            </div>
            {isMember && (
              <Button variant="outline" size="sm" onClick={() => setIsLeaving(true)}>
                <UserMinus className="h-4 w-4 mr-2" />
                Părăsește grupul
              </Button>
            )}
          </div>

          {isMember && (
            <div className="mt-2 p-3 bg-muted rounded-md flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Cod de invitație</p>
                <p className="text-lg font-mono tracking-wider">{group.invite_code}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={copyInviteCode}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </CardContent>

      {/* Dialog pentru editarea grupului */}
      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent>
          <form onSubmit={handleUpdateGroup}>
            <DialogHeader>
              <DialogTitle>Editează grupul</DialogTitle>
              <DialogDescription>Modifică detaliile grupului tău.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Nume grup</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Numele grupului"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Descriere</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Descrierea grupului"
                  rows={3}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="private">Grup privat</Label>
                <Switch id="private" checked={isPrivate} onCheckedChange={setIsPrivate} />
              </div>
              {isPrivate && (
                <p className="text-sm text-muted-foreground">
                  Grupurile private sunt vizibile doar pentru membrii invitați.
                </p>
              )}
            </div>
            <DialogFooter>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Se salvează..." : "Salvează modificările"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog pentru părăsirea grupului */}
      <Dialog open={isLeaving} onOpenChange={setIsLeaving}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Părăsește grupul</DialogTitle>
            <DialogDescription>
              Ești sigur că vrei să părăsești grupul "{group.name}"? Vei pierde accesul la toate resursele grupului.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsLeaving(false)}>
              Anulează
            </Button>
            <Button variant="destructive" onClick={handleLeaveGroup} disabled={isLoading}>
              {isLoading ? "Se procesează..." : "Părăsește grupul"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog pentru ��tergerea grupului */}
      <Dialog open={isDeleting} onOpenChange={setIsDeleting}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Șterge grupul</DialogTitle>
            <DialogDescription>
              Ești sigur că vrei să ștergi grupul "{group.name}"? Această acțiune nu poate fi anulată și toate datele
              grupului vor fi pierdute.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleting(false)}>
              Anulează
            </Button>
            <Button variant="destructive" onClick={handleDeleteGroup} disabled={isLoading}>
              {isLoading ? "Se procesează..." : "Șterge grupul"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
