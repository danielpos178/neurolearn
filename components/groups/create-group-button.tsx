"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/components/ui/use-toast"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { Plus } from "lucide-react"

export function CreateGroupButton() {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [isPrivate, setIsPrivate] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()
  const router = useRouter()
  const supabase = createClient()

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim()) {
      toast({
        title: "Eroare",
        description: "Numele grupului este obligatoriu.",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        toast({
          title: "Eroare",
          description: "Trebuie să fii autentificat pentru a crea un grup.",
          variant: "destructive",
        })
        return
      }

      // Generăm un cod de invitație aleatoriu
      const inviteCode = Math.random().toString(36).substring(2, 10).toUpperCase()

      // Creăm grupul
      const { data: group, error } = await supabase
        .from("groups")
        .insert({
          name,
          description,
          is_private: isPrivate,
          invite_code: inviteCode,
          created_by: user.id,
        })
        .select()
        .single()

      if (error) {
        throw new Error(error.message)
      }

      toast({
        title: "Succes!",
        description: "Grupul a fost creat cu succes.",
      })

      setOpen(false)
      router.refresh()
      router.push(`/grupuri/${group.id}`)
    } catch (error: any) {
      console.error("Error creating group:", error)
      toast({
        title: "Eroare",
        description: error.message || "A apărut o eroare la crearea grupului.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        className="bg-accent hover:bg-accent/90 text-accent-foreground transition-all"
      >
        <Plus className="mr-2 h-4 w-4" />
        Creează grup
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Creează un grup nou</DialogTitle>
            <DialogDescription>
              Creează un grup pentru a învăța împreună cu prietenii și a urmări progresul vostru.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="name">Nume grup</Label>
              <Input
                id="name"
                placeholder="Ex: Grupa 12B Matematică"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descriere (opțional)</Label>
              <Textarea
                id="description"
                placeholder="Descriere despre scopul grupului..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Label htmlFor="is-private">Grup privat</Label>
              <Switch id="is-private" checked={isPrivate} onCheckedChange={setIsPrivate} />
            </div>
            <p className="text-sm text-muted-foreground">
              {isPrivate
                ? "Grupurile private sunt accesibile doar prin cod de invitație."
                : "Grupurile publice sunt vizibile pentru toți utilizatorii și oricine se poate alătura."}
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Anulează
            </Button>
            <Button
              onClick={handleCreateGroup}
              className="bg-accent hover:bg-accent/90 text-accent-foreground transition-all"
            >
              Creează
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
