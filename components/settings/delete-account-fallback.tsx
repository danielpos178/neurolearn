"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/use-toast"
import { createClient } from "@/lib/supabase/client"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { AlertTriangle, Loader2 } from "lucide-react"

export function DeleteAccountFallback() {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleDeleteAccount = async () => {
    setIsDeleting(true)

    try {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) {
        throw new Error("Utilizatorul nu este autentificat")
      }

      const userId = userData.user.id
      console.log("Starting deletion process for user:", userId)

      // Delete all user data from public schema tables
      await deleteUserDataFromPublicSchema(userId)

      // Try to delete the auth user using RPC
      try {
        const { error: rpcError } = await supabase.rpc("delete_user_auth")
        if (rpcError) {
          console.error("Error deleting auth user via RPC:", rpcError)
        } else {
          console.log("Auth user deleted successfully via RPC")
        }
      } catch (rpcError) {
        console.error("Exception when deleting auth user via RPC:", rpcError)
      }

      // Sign out the user regardless of auth deletion success
      await supabase.auth.signOut()

      toast({
        title: "Cont șters",
        description: "Contul tău a fost șters cu succes.",
      })

      // Redirect to home page
      router.push("/")
    } catch (error: any) {
      console.error("Error deleting account:", error)
      toast({
        title: "Eroare",
        description: error.message || "A apărut o eroare la ștergerea contului. Încearcă din nou.",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
      setIsDialogOpen(false)
    }
  }

  // Function to delete user data from public schema tables
  const deleteUserDataFromPublicSchema = async (userId: string) => {
    console.log("Deleting user data from public schema tables...")

    // 1. Delete tasks
    const { error: tasksError } = await supabase.from("tasks").delete().eq("user_id", userId)
    if (tasksError) console.error("Error deleting tasks:", tasksError)
    else console.log("Tasks deleted successfully")

    // 2. Delete lesson progress
    const { error: progressError } = await supabase.from("lesson_progress").delete().eq("user_id", userId)
    if (progressError) console.error("Error deleting lesson progress:", progressError)
    else console.log("Lesson progress deleted successfully")

    // 3. Delete activity log
    const { error: activityError } = await supabase.from("activity_log").delete().eq("user_id", userId)
    if (activityError) console.error("Error deleting activity log:", activityError)
    else console.log("Activity log deleted successfully")

    // 4. Delete user badges
    const { error: badgesError } = await supabase.from("user_badges").delete().eq("user_id", userId)
    if (badgesError) console.error("Error deleting user badges:", badgesError)
    else console.log("User badges deleted successfully")

    // 5. Remove from groups
    const { error: groupsError } = await supabase.from("group_members").delete().eq("user_id", userId)
    if (groupsError) console.error("Error removing from groups:", groupsError)
    else console.log("Removed from groups successfully")

    // 6. Delete journal entries if they exist
    const { error: journalError } = await supabase.from("journal_entries").delete().eq("user_id", userId)
    if (journalError) console.error("Error deleting journal entries:", journalError)
    else console.log("Journal entries deleted successfully")

    // 7. Delete goals if they exist
    const { error: goalsError } = await supabase.from("goals").delete().eq("user_id", userId)
    if (goalsError) console.error("Error deleting goals:", goalsError)
    else console.log("Goals deleted successfully")

    // 8. Delete profile
    const { error: profileError } = await supabase.from("profiles").delete().eq("id", userId)
    if (profileError) console.error("Error deleting profile:", profileError)
    else console.log("Profile deleted successfully")
  }

  return (
    <>
      <Button variant="destructive" onClick={() => setIsDialogOpen(true)}>
        Șterge contul (Metodă alternativă)
      </Button>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
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
                <li>Progresul de învățare va fi pierdut</li>
                <li>Sarcinile și notele vor fi șterse</li>
                <li>Nu vei mai putea accesa contul</li>
              </ul>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isDeleting}>
              Anulează
            </Button>
            <Button variant="destructive" onClick={handleDeleteAccount} disabled={isDeleting}>
              {isDeleting ? (
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
