"use client"

import { Badge } from "@/components/ui/badge"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Layout from "@/components/layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { createClient } from "@/lib/supabase/client"
import { toast } from "@/components/ui/use-toast"
import { format, parseISO } from "date-fns"
import { ro } from "date-fns/locale"
import { PenLine, Target, CheckCircle, Plus, Calendar, BookOpen, Trash2, Edit, Star, Trophy } from "lucide-react"
import { useLoading } from "@/components/loading-provider"
import { motion } from "framer-motion"
import { Slider } from "@/components/ui/slider"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
  DrawerClose,
} from "@/components/ui/drawer"
import { useMediaQuery } from "@/hooks/use-media-query"

interface Goal {
  id: string
  user_id: string
  title: string
  description: string
  xp_reward: number
  completed: boolean
  created_at: string
}

interface JournalEntry {
  id: string
  user_id: string
  title: string
  content: string
  mood: number
  study_method: string
  created_at: string
}

export default function AgendaPage() {
  const [goals, setGoals] = useState<Goal[]>([])
  const [entries, setEntries] = useState<JournalEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("goals")
  const router = useRouter()
  const supabase = createClient()
  const { setIsLoading } = useLoading()
  const isDesktop = useMediaQuery("(min-width: 768px)")

  // New goal form state
  const [newGoalTitle, setNewGoalTitle] = useState("")
  const [newGoalDescription, setNewGoalDescription] = useState("")
  const [newGoalXpReward, setNewGoalXpReward] = useState(10)

  // New entry form state
  const [newEntryTitle, setNewEntryTitle] = useState("")
  const [newEntryContent, setNewEntryContent] = useState("")
  const [newEntryMood, setNewEntryMood] = useState(3)
  const [newEntryMethod, setNewEntryMethod] = useState("")

  // Edit states
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null)
  const [editingEntry, setEditingEntry] = useState<JournalEntry | null>(null)

  // Dialog states
  const [goalDialogOpen, setGoalDialogOpen] = useState(false)
  const [entryDialogOpen, setEntryDialogOpen] = useState(false)
  const [goalDrawerOpen, setGoalDrawerOpen] = useState(false)
  const [entryDrawerOpen, setEntryDrawerOpen] = useState(false)

  // Fetch data on component mount
  useEffect(() => {
    fetchGoals()
    fetchEntries()
  }, [])

  const fetchGoals = async () => {
    setLoading(true)
    try {
      const { data: user } = await supabase.auth.getUser()
      if (!user.user) {
        router.push("/login")
        return
      }

      // Fetch goals from Supabase
      const { data, error } = await supabase
        .from("goals")
        .select("*")
        .eq("user_id", user.user.id)
        .order("created_at", { ascending: false })

      if (error) throw error

      setGoals(data || [])
    } catch (error) {
      console.error("Error fetching goals:", error)
      toast({
        title: "Eroare",
        description: "Nu s-au putut încărca obiectivele.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchEntries = async () => {
    setLoading(true)
    try {
      const { data: user } = await supabase.auth.getUser()
      if (!user.user) {
        router.push("/login")
        return
      }

      // Fetch journal entries from Supabase
      const { data, error } = await supabase
        .from("journal_entries")
        .select("*")
        .eq("user_id", user.user.id)
        .order("created_at", { ascending: false })

      if (error) throw error

      setEntries(data || [])
    } catch (error) {
      console.error("Error fetching entries:", error)
      toast({
        title: "Eroare",
        description: "Nu s-au putut încărca intrările din jurnal.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleAddGoal = async () => {
    setIsLoading(true)
    try {
      if (!newGoalTitle.trim()) {
        toast({
          title: "Eroare",
          description: "Titlul obiectivului este obligatoriu.",
          variant: "destructive",
        })
        setIsLoading(false)
        return
      }

      const { data: user } = await supabase.auth.getUser()
      if (!user.user) {
        router.push("/login")
        return
      }

      const newGoal = {
        user_id: user.user.id,
        title: newGoalTitle,
        description: newGoalDescription,
        xp_reward: newGoalXpReward,
        completed: false,
        created_at: new Date().toISOString(),
      }

      const { data, error } = await supabase.from("goals").insert([newGoal]).select()

      if (error) throw error

      setGoals([data[0], ...goals])
      setNewGoalTitle("")
      setNewGoalDescription("")
      setNewGoalXpReward(10)
      setGoalDialogOpen(false)
      setGoalDrawerOpen(false)

      toast({
        title: "Obiectiv adăugat",
        description: "Obiectivul tău a fost adăugat cu succes.",
      })
    } catch (error) {
      console.error("Error adding goal:", error)
      toast({
        title: "Eroare",
        description: "Nu s-a putut adăuga obiectivul.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddEntry = async () => {
    setIsLoading(true)
    try {
      if (!newEntryTitle.trim() || !newEntryContent.trim()) {
        toast({
          title: "Eroare",
          description: "Titlul și conținutul sunt obligatorii.",
          variant: "destructive",
        })
        setIsLoading(false)
        return
      }

      const { data: user } = await supabase.auth.getUser()
      if (!user.user) {
        router.push("/login")
        return
      }

      const newEntry = {
        user_id: user.user.id,
        title: newEntryTitle,
        content: newEntryContent,
        mood: newEntryMood,
        study_method: newEntryMethod,
        created_at: new Date().toISOString(),
      }

      const { data, error } = await supabase.from("journal_entries").insert([newEntry]).select()

      if (error) throw error

      setEntries([data[0], ...entries])
      setNewEntryTitle("")
      setNewEntryContent("")
      setNewEntryMood(3)
      setNewEntryMethod("")
      setEntryDialogOpen(false)
      setEntryDrawerOpen(false)

      toast({
        title: "Intrare adăugată",
        description: "Intrarea ta în jurnal a fost adăugată cu succes.",
      })
    } catch (error) {
      console.error("Error adding entry:", error)
      toast({
        title: "Eroare",
        description: "Nu s-a putut adăuga intrarea în jurnal.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleToggleGoalCompletion = async (id: string) => {
    setIsLoading(true)
    try {
      const goalToUpdate = goals.find((goal) => goal.id === id)
      if (!goalToUpdate) return

      const { error } = await supabase.from("goals").update({ completed: !goalToUpdate.completed }).eq("id", id)

      if (error) throw error

      // If marking as completed, award XP
      if (!goalToUpdate.completed) {
        const { data: user } = await supabase.auth.getUser()
        if (user.user) {
          // Record activity in activity_log
          await supabase.from("activity_log").insert({
            user_id: user.user.id,
            activity_type: "goal_completion",
            details: JSON.stringify({
              goal_id: goalToUpdate.id,
              goal_title: goalToUpdate.title,
              xp_earned: goalToUpdate.xp_reward,
            }),
            created_at: new Date().toISOString(),
          })

          // Update user's total XP in profiles
          const { data: profileData } = await supabase.from("profiles").select("xp").eq("id", user.user.id).single()

          let currentXP = 0
          if (profileData) {
            currentXP = profileData.xp || 0
          }

          const newXP = currentXP + goalToUpdate.xp_reward

          // Update user profile with new XP
          await supabase.from("profiles").upsert({
            id: user.user.id,
            xp: newXP,
            last_activity_date: new Date().toISOString().split("T")[0],
          })

          // Show toast with XP reward
          toast({
            title: "Obiectiv completat!",
            description: `Ai primit ${goalToUpdate.xp_reward} XP pentru finalizarea obiectivului.`,
          })
        }
      }

      setGoals(
        goals.map((goal) => {
          if (goal.id === id) {
            return { ...goal, completed: !goal.completed }
          }
          return goal
        }),
      )
    } catch (error) {
      console.error("Error toggling goal completion:", error)
      toast({
        title: "Eroare",
        description: "Nu s-a putut actualiza starea obiectivului.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteGoal = async (id: string) => {
    if (!confirm("Sigur doriți să ștergeți acest obiectiv?")) {
      return
    }

    setIsLoading(true)
    try {
      const { error } = await supabase.from("goals").delete().eq("id", id)

      if (error) throw error

      setGoals(goals.filter((goal) => goal.id !== id))
      toast({
        title: "Obiectiv șters",
        description: "Obiectivul a fost șters cu succes.",
      })
    } catch (error) {
      console.error("Error deleting goal:", error)
      toast({
        title: "Eroare",
        description: "Nu s-a putut șterge obiectivul.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteEntry = async (id: string) => {
    if (!confirm("Sigur doriți să ștergeți această intrare din jurnal?")) {
      return
    }

    setIsLoading(true)
    try {
      const { error } = await supabase.from("journal_entries").delete().eq("id", id)

      if (error) throw error

      setEntries(entries.filter((entry) => entry.id !== id))
      toast({
        title: "Intrare ștearsă",
        description: "Intrarea din jurnal a fost ștearsă cu succes.",
      })
    } catch (error) {
      console.error("Error deleting entry:", error)
      toast({
        title: "Eroare",
        description: "Nu s-a putut șterge intrarea din jurnal.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleEditGoal = (goal: Goal) => {
    setEditingGoal(goal)
    setNewGoalTitle(goal.title)
    setNewGoalDescription(goal.description || "")
    setNewGoalXpReward(goal.xp_reward || 10)
    if (isDesktop) {
      setGoalDialogOpen(true)
    } else {
      setGoalDrawerOpen(true)
    }
  }

  const handleEditEntry = (entry: JournalEntry) => {
    setEditingEntry(entry)
    setNewEntryTitle(entry.title)
    setNewEntryContent(entry.content)
    setNewEntryMood(entry.mood)
    setNewEntryMethod(entry.study_method)
    if (isDesktop) {
      setEntryDialogOpen(true)
    } else {
      setEntryDrawerOpen(true)
    }
  }

  const handleUpdateGoal = async () => {
    if (!editingGoal) return

    setIsLoading(true)
    try {
      const updatedGoal = {
        title: newGoalTitle,
        description: newGoalDescription,
        xp_reward: newGoalXpReward,
      }

      const { error } = await supabase.from("goals").update(updatedGoal).eq("id", editingGoal.id)

      if (error) throw error

      setGoals(
        goals.map((goal) => {
          if (goal.id === editingGoal.id) {
            return {
              ...goal,
              ...updatedGoal,
            }
          }
          return goal
        }),
      )

      setEditingGoal(null)
      setNewGoalTitle("")
      setNewGoalDescription("")
      setNewGoalXpReward(10)
      setGoalDialogOpen(false)
      setGoalDrawerOpen(false)

      toast({
        title: "Obiectiv actualizat",
        description: "Obiectivul tău a fost actualizat cu succes.",
      })
    } catch (error) {
      console.error("Error updating goal:", error)
      toast({
        title: "Eroare",
        description: "Nu s-a putut actualiza obiectivul.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpdateEntry = async () => {
    if (!editingEntry) return

    setIsLoading(true)
    try {
      const updatedEntry = {
        title: newEntryTitle,
        content: newEntryContent,
        mood: newEntryMood,
        study_method: newEntryMethod,
      }

      const { error } = await supabase.from("journal_entries").update(updatedEntry).eq("id", editingEntry.id)

      if (error) throw error

      setEntries(
        entries.map((entry) => {
          if (entry.id === editingEntry.id) {
            return {
              ...entry,
              ...updatedEntry,
            }
          }
          return entry
        }),
      )

      setEditingEntry(null)
      setNewEntryTitle("")
      setNewEntryContent("")
      setNewEntryMood(3)
      setNewEntryMethod("")
      setEntryDialogOpen(false)
      setEntryDrawerOpen(false)

      toast({
        title: "Intrare actualizată",
        description: "Intrarea ta în jurnal a fost actualizată cu succes.",
      })
    } catch (error) {
      console.error("Error updating entry:", error)
      toast({
        title: "Eroare",
        description: "Nu s-a putut actualiza intrarea în jurnal.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const renderMoodEmoji = (mood: number) => {
    switch (mood) {
      case 1:
        return "😞"
      case 2:
        return "😐"
      case 3:
        return "🙂"
      case 4:
        return "😊"
      case 5:
        return "😄"
      default:
        return "🙂"
    }
  }

  const renderGoalForm = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="goalTitle">Titlu</Label>
        <Input
          id="goalTitle"
          placeholder="Ex: Finalizează cursul de matematică"
          value={newGoalTitle}
          onChange={(e) => setNewGoalTitle(e.target.value)}
          className="transition-all focus:ring-accent"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="goalDescription">Descriere (opțional)</Label>
        <Textarea
          id="goalDescription"
          placeholder="Descrie obiectivul tău în detaliu..."
          value={newGoalDescription}
          onChange={(e) => setNewGoalDescription(e.target.value)}
          className="transition-all focus:ring-accent"
        />
      </div>
      <div className="space-y-2">
        <div className="flex justify-between">
          <Label htmlFor="goalXpReward">Recompensă XP</Label>
          <span className="text-sm font-medium">{newGoalXpReward} XP</span>
        </div>
        <Slider
          id="goalXpReward"
          min={5}
          max={50}
          step={5}
          value={[newGoalXpReward]}
          onValueChange={(value) => setNewGoalXpReward(value[0])}
          className="py-4"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Ușor (5 XP)</span>
          <span>Mediu (25 XP)</span>
          <span>Dificil (50 XP)</span>
        </div>
      </div>
    </div>
  )

  const renderEntryForm = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="entryTitle">Titlu</Label>
        <Input
          id="entryTitle"
          placeholder="Ex: Sesiune de studiu pentru examenul de matematică"
          value={newEntryTitle}
          onChange={(e) => setNewEntryTitle(e.target.value)}
          className="transition-all focus:ring-accent"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="entryContent">Conținut</Label>
        <Textarea
          id="entryContent"
          placeholder="Descrie ce ai învățat, ce provocări ai întâmpinat și ce ai realizat..."
          value={newEntryContent}
          onChange={(e) => setNewEntryContent(e.target.value)}
          className="min-h-[150px] transition-all focus:ring-accent"
        />
      </div>
      <div className="space-y-2">
        <Label>Starea ta</Label>
        <div className="flex justify-between items-center">
          {[1, 2, 3, 4, 5].map((mood) => (
            <motion.div key={mood} whileTap={{ scale: 0.95 }}>
              <Button
                type="button"
                variant={newEntryMood === mood ? "default" : "outline"}
                className={`text-2xl h-12 w-12 transition-all ${newEntryMood === mood ? "bg-accent text-accent-foreground" : "hover:border-accent"}`}
                onClick={() => setNewEntryMood(mood)}
              >
                {renderMoodEmoji(mood)}
              </Button>
            </motion.div>
          ))}
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="entryMethod">Metodă de studiu folosită (opțional)</Label>
        <select
          id="entryMethod"
          className="w-full p-2 rounded-md border border-input bg-background transition-all hover:border-accent focus:ring-accent"
          value={newEntryMethod}
          onChange={(e) => setNewEntryMethod(e.target.value)}
        >
          <option value="">Selectează o metodă</option>
          <option value="Pomodoro">Pomodoro</option>
          <option value="Feynman">Tehnica Feynman</option>
          <option value="Spaced Repetition">Repetiția Spațiată</option>
          <option value="SQ3R">Metoda SQ3R</option>
          <option value="Other">Altă metodă</option>
        </select>
      </div>
    </div>
  )

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Agenda de studiu</h1>
            <p className="text-muted-foreground">
              Setează-ți obiective de învățare și ține un jurnal al progresului tău
            </p>
          </div>
        </div>

        {/* Bauhaus-inspired decorative elements */}
        <div className="fixed -z-10 top-40 left-20 w-40 h-40 bg-primary/10 rounded-full opacity-30 animate-pulse"></div>
        <div className="fixed -z-10 bottom-20 right-40 w-60 h-60 bg-accent/10 rounded-full opacity-30 animate-pulse"></div>
        <div className="fixed -z-10 top-1/3 right-1/4 w-20 h-20 bg-primary/10 rotate-45 opacity-30"></div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList>
            <TabsTrigger
              value="goals"
              className="flex items-center gap-2 transition-all hover:bg-accent/20 data-[state=active]:bg-accent data-[state=active]:text-accent-foreground"
            >
              <Target className="h-4 w-4" />
              <span>Obiective</span>
            </TabsTrigger>
            <TabsTrigger
              value="journal"
              className="flex items-center gap-2 transition-all hover:bg-accent/20 data-[state=active]:bg-accent data-[state=active]:text-accent-foreground"
            >
              <PenLine className="h-4 w-4" />
              <span>Jurnal</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="goals">
            <div className="flex justify-end mb-4">
              {isDesktop ? (
                <Button
                  className="bg-accent hover:bg-accent/90 text-accent-foreground transition-all"
                  onClick={() => {
                    setEditingGoal(null)
                    setNewGoalTitle("")
                    setNewGoalDescription("")
                    setNewGoalXpReward(10)
                    setGoalDialogOpen(true)
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Adaugă obiectiv
                </Button>
              ) : (
                <Button
                  className="bg-accent hover:bg-accent/90 text-accent-foreground transition-all"
                  onClick={() => {
                    setEditingGoal(null)
                    setNewGoalTitle("")
                    setNewGoalDescription("")
                    setNewGoalXpReward(10)
                    setGoalDrawerOpen(true)
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Adaugă obiectiv
                </Button>
              )}
            </div>

            {isDesktop && (
              <Dialog open={goalDialogOpen} onOpenChange={setGoalDialogOpen}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{editingGoal ? "Editează obiectivul" : "Adaugă un obiectiv nou"}</DialogTitle>
                    <DialogDescription>
                      {editingGoal
                        ? "Modifică detaliile obiectivului tău."
                        : "Completează detaliile pentru noul tău obiectiv de învățare."}
                    </DialogDescription>
                  </DialogHeader>
                  {renderGoalForm()}
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setGoalDialogOpen(false)}
                      className="transition-all hover:bg-muted"
                    >
                      Anulează
                    </Button>
                    <Button
                      onClick={editingGoal ? handleUpdateGoal : handleAddGoal}
                      className="bg-accent hover:bg-accent/90 text-accent-foreground transition-all"
                    >
                      {editingGoal ? "Actualizează" : "Adaugă"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}

            {!isDesktop && (
              <Drawer open={goalDrawerOpen} onOpenChange={setGoalDrawerOpen}>
                <DrawerContent>
                  <DrawerHeader className="text-left">
                    <DrawerTitle>{editingGoal ? "Editează obiectivul" : "Adaugă un obiectiv nou"}</DrawerTitle>
                    <DrawerDescription>
                      {editingGoal
                        ? "Modifică detaliile obiectivului tău."
                        : "Completează detaliile pentru noul tău obiectiv de învățare."}
                    </DrawerDescription>
                  </DrawerHeader>
                  <div className="px-4">{renderGoalForm()}</div>
                  <DrawerFooter className="pt-2">
                    <Button
                      onClick={editingGoal ? handleUpdateGoal : handleAddGoal}
                      className="bg-accent hover:bg-accent/90 text-accent-foreground transition-all"
                    >
                      {editingGoal ? "Actualizează" : "Adaugă"}
                    </Button>
                    <DrawerClose asChild>
                      <Button variant="outline">Anulează</Button>
                    </DrawerClose>
                  </DrawerFooter>
                </DrawerContent>
              </Drawer>
            )}

            <div className="space-y-4">
              {goals.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <Card className="border-2 dark:border-zinc-800">
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <Target className="h-12 w-12 text-muted-foreground mb-4" />
                      <p className="text-muted-foreground text-center">
                        Nu ai niciun obiectiv setat. Adaugă primul tău obiectiv de învățare!
                      </p>
                      <Button
                        className="mt-4 bg-accent hover:bg-accent/90 text-accent-foreground transition-all"
                        onClick={() => (isDesktop ? setGoalDialogOpen(true) : setGoalDrawerOpen(true))}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Adaugă obiectiv
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {goals.map((goal, index) => (
                    <motion.div
                      key={goal.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                    >
                      <Card
                        className={`border-2 ${goal.completed ? "border-green-500/50" : "dark:border-zinc-800"} transition-all hover:shadow-md`}
                      >
                        <CardHeader className="pb-2">
                          <div className="flex justify-between items-start">
                            <CardTitle className="flex items-center gap-2">
                              <motion.div whileTap={{ scale: 0.95 }}>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className={`h-6 w-6 ${
                                    goal.completed
                                      ? "bg-green-500 text-white hover:bg-green-600"
                                      : "border transition-all hover:border-accent"
                                  }`}
                                  onClick={() => handleToggleGoalCompletion(goal.id)}
                                >
                                  {goal.completed && <CheckCircle className="h-4 w-4" />}
                                </Button>
                              </motion.div>
                              <span className={goal.completed ? "line-through text-muted-foreground" : ""}>
                                {goal.title}
                              </span>
                            </CardTitle>
                            <div className="flex gap-1">
                              <motion.div whileTap={{ scale: 0.95 }}>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 transition-all hover:bg-accent/10"
                                  onClick={() => handleEditGoal(goal)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </motion.div>
                              <motion.div whileTap={{ scale: 0.95 }}>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive transition-all hover:bg-red-100 dark:hover:bg-red-900/20"
                                  onClick={() => handleDeleteGoal(goal.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </motion.div>
                            </div>
                          </div>
                          <CardDescription className="flex items-center gap-1 mt-1">
                            <Trophy className="h-3 w-3" />
                            <span>Recompensă: {goal.xp_reward} XP</span>
                          </CardDescription>
                        </CardHeader>
                        {goal.description && (
                          <CardContent className="py-2">
                            <p className={goal.completed ? "text-muted-foreground" : ""}>{goal.description}</p>
                          </CardContent>
                        )}
                      </Card>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="journal">
            <div className="flex justify-end mb-4">
              {isDesktop ? (
                <Button
                  className="bg-accent hover:bg-accent/90 text-accent-foreground transition-all"
                  onClick={() => {
                    setEditingEntry(null)
                    setNewEntryTitle("")
                    setNewEntryContent("")
                    setNewEntryMood(3)
                    setNewEntryMethod("")
                    setEntryDialogOpen(true)
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Adaugă în jurnal
                </Button>
              ) : (
                <Button
                  className="bg-accent hover:bg-accent/90 text-accent-foreground transition-all"
                  onClick={() => {
                    setEditingEntry(null)
                    setNewEntryTitle("")
                    setNewEntryContent("")
                    setNewEntryMood(3)
                    setNewEntryMethod("")
                    setEntryDrawerOpen(true)
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Adaugă în jurnal
                </Button>
              )}
            </div>

            {isDesktop && (
              <Dialog open={entryDialogOpen} onOpenChange={setEntryDialogOpen}>
                <DialogContent className="sm:max-w-[550px]">
                  <DialogHeader>
                    <DialogTitle>{editingEntry ? "Editează intrarea" : "Adaugă o intrare nouă"}</DialogTitle>
                    <DialogDescription>
                      {editingEntry
                        ? "Modifică detaliile intrării tale."
                        : "Notează-ți gândurile și reflecțiile despre sesiunea ta de învățare."}
                    </DialogDescription>
                  </DialogHeader>
                  {renderEntryForm()}
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setEntryDialogOpen(false)}
                      className="transition-all hover:bg-muted"
                    >
                      Anulează
                    </Button>
                    <Button
                      onClick={editingEntry ? handleUpdateEntry : handleAddEntry}
                      className="bg-accent hover:bg-accent/90 text-accent-foreground transition-all"
                    >
                      {editingEntry ? "Actualizează" : "Adaugă"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}

            {!isDesktop && (
              <Drawer open={entryDrawerOpen} onOpenChange={setEntryDrawerOpen}>
                <DrawerContent>
                  <DrawerHeader className="text-left">
                    <DrawerTitle>{editingEntry ? "Editează intrarea" : "Adaugă o intrare nouă"}</DrawerTitle>
                    <DrawerDescription>
                      {editingEntry
                        ? "Modifică detaliile intrării tale."
                        : "Notează-ți gândurile și reflecțiile despre sesiunea ta de învățare."}
                    </DrawerDescription>
                  </DrawerHeader>
                  <div className="px-4">{renderEntryForm()}</div>
                  <DrawerFooter className="pt-2">
                    <Button
                      onClick={editingEntry ? handleUpdateEntry : handleAddEntry}
                      className="bg-accent hover:bg-accent/90 text-accent-foreground transition-all"
                    >
                      {editingEntry ? "Actualizează" : "Adaugă"}
                    </Button>
                    <DrawerClose asChild>
                      <Button variant="outline">Anulează</Button>
                    </DrawerClose>
                  </DrawerFooter>
                </DrawerContent>
              </Drawer>
            )}

            <div className="space-y-4">
              {entries.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <Card className="border-2 dark:border-zinc-800">
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
                      <p className="text-muted-foreground text-center">
                        Nu ai nicio intrare în jurnal. Adaugă prima ta reflecție despre învățare!
                      </p>
                      <Button
                        className="mt-4 bg-accent hover:bg-accent/90 text-accent-foreground transition-all"
                        onClick={() => (isDesktop ? setEntryDialogOpen(true) : setEntryDrawerOpen(true))}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Adaugă în jurnal
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              ) : (
                <div className="space-y-4">
                  {entries.map((entry, index) => (
                    <motion.div
                      key={entry.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                    >
                      <Card className="border-2 dark:border-zinc-800 transition-all hover:shadow-md">
                        <CardHeader className="pb-2">
                          <div className="flex justify-between items-start">
                            <div>
                              <CardTitle>{entry.title}</CardTitle>
                              <CardDescription className="flex items-center gap-2 mt-1">
                                <Calendar className="h-3 w-3" />
                                <span>{format(parseISO(entry.created_at), "PPP", { locale: ro })}</span>
                                <span className="text-xl ml-2">{renderMoodEmoji(entry.mood)}</span>
                              </CardDescription>
                            </div>
                            <div className="flex gap-1">
                              <motion.div whileTap={{ scale: 0.95 }}>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 transition-all hover:bg-accent/10"
                                  onClick={() => handleEditEntry(entry)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </motion.div>
                              <motion.div whileTap={{ scale: 0.95 }}>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive transition-all hover:bg-red-100 dark:hover:bg-red-900/20"
                                  onClick={() => handleDeleteEntry(entry.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </motion.div>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="py-2">
                          <p className="whitespace-pre-line">{entry.content}</p>
                          {entry.study_method && (
                            <div className="flex items-center gap-2 mt-4">
                              <Badge
                                variant="outline"
                                className="flex items-center gap-1 transition-all hover:bg-accent/10"
                              >
                                <Star className="h-3 w-3" />
                                <span>Metodă: {entry.study_method}</span>
                              </Badge>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  )
}
