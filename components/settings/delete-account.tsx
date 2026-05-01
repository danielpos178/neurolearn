"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/use-toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { AlertTriangle, Loader2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

export function DeleteAccount() {
  const [open, setOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleDeleteAccount = async () => {
    setDeleting(true)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        throw new Error("Utilizator neautentificat.")
      }

      /* POST userId to the API */
      const res = await fetch("/api/delete-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id }),
      })

      /* Detect content-type safely */
      const isJson = res.headers.get("content-type")?.includes("application/json")

      const payload = isJson ? await res.json() : { error: await res.text() }

      if (!res.ok) {
        throw new Error(payload.error || "Eroare la ștergerea contului")
      }

      toast({
        title: "Cont șters",
        description: "Contul și toate datele au fost șterse.",
      })

      // Semnează-te din client (în caz că sesiunea mai există)
      await supabase.auth.signOut()
      router.push("/login")
    } catch (err: any) {
      console.error("Error deleting account:", err)
      toast({
        title: "Eroare",
        description: err.message || "A apărut o eroare la ștergerea contului. Încearcă din nou.",
        variant: "destructive",
      })
    } finally {
      setDeleting(false)
      setOpen(false)
    }
  }

  return (
    <>
      <Button variant="destructive" onClick={() => setOpen(true)}>
        Șterge contul
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Șterge contul
            </DialogTitle>
            <DialogDescription>
              Această acțiune este permanentă și nu poate fi anulată. Toate datele tale vor fi șterse definitiv.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="rounded-md bg-destructive/10 p-4 text-sm text-destructive">
              <ul className="list-disc pl-4 space-y-2">
                <li>Toate datele personale vor fi șterse</li>
                <li>Progresul va fi pierdut</li>
                <li>Sarcinile și notele vor fi șterse</li>
                <li>Postările din grupuri vor fi eliminate</li>
                <li>Nu vei mai putea accesa contul</li>
              </ul>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={deleting}>
              Anulează
            </Button>
            <Button variant="destructive" onClick={handleDeleteAccount} disabled={deleting}>
              {deleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Se procesează...
                </>
              ) : (
                "Șterge definitiv contul"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
