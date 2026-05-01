"use client"

import type React from "react"

import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import Layout from "@/components/layout"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { createClient } from "@/lib/supabase/client"
import { toast } from "@/components/ui/use-toast"
import { format, addDays, startOfWeek, endOfWeek, eachDayOfInterval, isToday, isSameDay } from "date-fns"
import { ro } from "date-fns/locale"
import {
  Plus,
  CalendarIcon,
  CheckCircle,
  Clock,
  Trash2,
  Edit,
  LayoutGrid,
  ArrowRight,
  ArrowLeft,
  MoreHorizontal,
  Flag,
  CheckCircle2,
} from "lucide-react"
import { useLoading } from "@/components/loading-provider"
import { motion, AnimatePresence } from "framer-motion"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card"
import { useBadgeNotification } from "@/components/badge-notification-provider"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

interface Task {
  id: string
  user_id: string
  title: string
  description: string
  status: "todo" | "in-progress" | "done"
  task_priority: "low" | "medium" | "high"
  due_date: string | null
  created_at: string
}

const statusOptions = [
  { value: "todo", label: "De făcut", color: "bg-blue-500" },
  { value: "in-progress", label: "În progres", color: "bg-yellow-500" },
  { value: "done", label: "Finalizat", color: "bg-green-500" },
]

const priorityOptions = [
  {
    value: "low",
    label: "Scăzută",
    color: "bg-blue-200 text-blue-800",
    borderColor: "border-blue-500",
    bgColor: "bg-blue-50 dark:bg-blue-950/30",
  },
  {
    value: "medium",
    label: "Medie",
    color: "bg-yellow-200 text-yellow-800",
    borderColor: "border-yellow-500",
    bgColor: "bg-yellow-50 dark:bg-yellow-950/30",
  },
  {
    value: "high",
    label: "Ridicată",
    color: "bg-red-200 text-red-800",
    borderColor: "border-red-500",
    bgColor: "bg-red-50 dark:bg-red-950/30",
  },
]

export default function TodoPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("kanban")
  const [currentWeek, setCurrentWeek] = useState(new Date())
  const router = useRouter()
  const supabase = createClient()
  const { setIsLoading } = useLoading()
  const isDesktop = useMediaQuery("(min-width: 768px)")
  const badgeNotification = useBadgeNotification()

  // Form state
  const [formState, setFormState] = useState({
    title: "",
    description: "",
    status: "todo" as Task["status"],
    priority: "medium" as Task["task_priority"],
    dueDate: undefined as Date | undefined,
  })

  // Dialog states
  const [taskDialogOpen, setTaskDialogOpen] = useState(false)
  const [taskDrawerOpen, setTaskDrawerOpen] = useState(false)
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [selectedMonth, setSelectedMonth] = useState(new Date())

  // Refs for DOM elements
  const titleInputRef = useRef<HTMLInputElement>(null)
  const descriptionInputRef = useRef<HTMLTextAreaElement>(null)
  const datePickerRef = useRef<HTMLDivElement>(null)
  const dateButtonRef = useRef<HTMLButtonElement>(null)
  const formContainerRef = useRef<HTMLDivElement>(null)

  // Fetch tasks on component mount
  useEffect(() => {
    fetchTasks()
  }, [])

  // Handle clicks outside the date picker
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        datePickerRef.current &&
        !datePickerRef.current.contains(e.target as Node) &&
        dateButtonRef.current &&
        !dateButtonRef.current.contains(e.target as Node)
      ) {
        setShowDatePicker(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  // Update form state when inputs change
  useEffect(() => {
    if (titleInputRef.current && descriptionInputRef.current) {
      const updateFormFromInputs = () => {
        setFormState((prev) => ({
          ...prev,
          title: titleInputRef.current?.value || "",
          description: descriptionInputRef.current?.value || "",
        }))
      }

      const titleInput = titleInputRef.current
      const descInput = descriptionInputRef.current

      titleInput.addEventListener("input", updateFormFromInputs)
      descInput.addEventListener("input", updateFormFromInputs)

      return () => {
        titleInput.removeEventListener("input", updateFormFromInputs)
        descInput.removeEventListener("input", updateFormFromInputs)
      }
    }
  }, [taskDialogOpen, taskDrawerOpen])

  const fetchTasks = async () => {
    setLoading(true)
    try {
      const { data: user } = await supabase.auth.getUser()
      if (!user.user) {
        router.push("/login")
        return
      }

      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("user_id", user.user.id)
        .order("created_at", { ascending: false })

      if (error) throw error

      setTasks(data || [])
    } catch (error) {
      console.error("Error fetching tasks:", error)
      toast({
        title: "Eroare",
        description: "Nu s-au putut încărca sarcinile.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const resetFormState = useCallback(() => {
    setFormState({
      title: "",
      description: "",
      status: "todo",
      priority: "medium",
      dueDate: undefined,
    })

    // Reset input values using refs
    if (titleInputRef.current) titleInputRef.current.value = ""
    if (descriptionInputRef.current) descriptionInputRef.current.value = ""

    setEditingTaskId(null)
    setShowDatePicker(false)
  }, [])

  const handleOpenAddTask = useCallback(() => {
    resetFormState()
    if (isDesktop) {
      setTaskDialogOpen(true)
    } else {
      setTaskDrawerOpen(true)
    }

    // Set focus after a short delay to ensure the dialog is rendered
    setTimeout(() => {
      if (titleInputRef.current) {
        titleInputRef.current.focus()
      }
    }, 100)
  }, [isDesktop, resetFormState])

  const handleOpenEditTask = useCallback(
    (task: Task) => {
      // Set form state
      setFormState({
        title: task.title,
        description: task.description || "",
        status: task.status,
        priority: task.task_priority,
        dueDate: task.due_date ? new Date(task.due_date) : undefined,
      })

      setEditingTaskId(task.id)

      // Open dialog first, then set input values
      if (isDesktop) {
        setTaskDialogOpen(true)
      } else {
        setTaskDrawerOpen(true)
      }

      // Set input values after a short delay to ensure the dialog is rendered
      setTimeout(() => {
        if (titleInputRef.current) {
          titleInputRef.current.value = task.title
          titleInputRef.current.focus()
        }
        if (descriptionInputRef.current) {
          descriptionInputRef.current.value = task.description || ""
        }
      }, 50)
    },
    [isDesktop],
  )

  const handleCloseDialog = useCallback(() => {
    setTaskDialogOpen(false)
    setTaskDrawerOpen(false)
    resetFormState()
  }, [resetFormState])

  const handleSaveTask = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    // Get values from refs and form state
    const title = titleInputRef.current?.value || ""
    const description = descriptionInputRef.current?.value || ""

    if (!title.trim()) {
      toast({
        title: "Eroare",
        description: "Titlul sarcinii este obligatoriu.",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    try {
      const { data: user } = await supabase.auth.getUser()
      if (!user.user) {
        router.push("/login")
        return
      }

      if (editingTaskId) {
        // Update existing task
        const updatedTask = {
          title,
          description,
          status: formState.status,
          task_priority: formState.priority,
          due_date: formState.dueDate ? formState.dueDate.toISOString() : null,
        }

        const { error } = await supabase.from("tasks").update(updatedTask).eq("id", editingTaskId)

        if (error) throw error

        setTasks(tasks.map((task) => (task.id === editingTaskId ? { ...task, ...updatedTask } : task)))

        toast({
          title: "Sarcină actualizată",
          description: "Sarcina ta a fost actualizată cu succes.",
        })
      } else {
        // Create new task
        const newTask = {
          user_id: user.user.id,
          title,
          description,
          status: formState.status,
          task_priority: formState.priority,
          due_date: formState.dueDate ? formState.dueDate.toISOString() : null,
          created_at: new Date().toISOString(),
        }

        const { data, error } = await supabase.from("tasks").insert([newTask]).select()

        if (error) throw error

        setTasks([data[0], ...tasks])

        toast({
          title: "Sarcină adăugată",
          description: "Sarcina ta a fost adăugată cu succes.",
        })
      }

      handleCloseDialog()
    } catch (error) {
      console.error("Error saving task:", error)
      toast({
        title: "Eroare",
        description: editingTaskId ? "Nu s-a putut actualiza sarcina." : "Nu s-a putut adăuga sarcina.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteTask = async (id: string) => {
    if (!confirm("Sigur doriți să ștergeți această sarcină?")) {
      return
    }

    setIsLoading(true)
    try {
      const { error } = await supabase.from("tasks").delete().eq("id", id)

      if (error) throw error

      setTasks(tasks.filter((task) => task.id !== id))

      toast({
        title: "Sarcină ștearsă",
        description: "Sarcina a fost ștearsă cu succes.",
      })
    } catch (error) {
      console.error("Error deleting task:", error)
      toast({
        title: "Eroare",
        description: "Nu s-a putut șterge sarcina.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpdateTaskStatus = async (taskId: string, newStatus: Task["status"]) => {
    // Find the task
    const taskToUpdate = tasks.find((task) => task.id === taskId)
    if (!taskToUpdate) return

    const oldStatus = taskToUpdate.status

    // Optimistically update UI
    setTasks(tasks.map((task) => (task.id === taskId ? { ...task, status: newStatus } : task)))

    try {
      const { error } = await supabase.from("tasks").update({ status: newStatus }).eq("id", taskId)

      if (error) throw error

      // Record task completion if moved to done
      if (newStatus === "done" && oldStatus !== "done") {
        await recordTaskCompletion(taskId, taskToUpdate)
      }
    } catch (error) {
      console.error("Error updating task status:", error)

      // Revert the optimistic update
      setTasks(tasks.map((task) => (task.id === taskId ? { ...task, status: oldStatus } : task)))

      toast({
        title: "Eroare",
        description: "Nu s-a putut actualiza statusul sarcinii.",
        variant: "destructive",
      })
    }
  }

  const recordTaskCompletion = async (taskId: string, taskToUpdate: Task) => {
    try {
      const { data: user } = await supabase.auth.getUser()
      if (!user?.user) return

      // Define XP for task completion
      const taskCompletionXP = 5

      // Record in activity log
      await supabase.from("activity_log").insert({
        user_id: user.user.id,
        activity_type: "task_completion",
        details: JSON.stringify({
          task_id: taskId,
          task_title: taskToUpdate?.title || "Sarcină",
          xp_earned: taskCompletionXP,
        }),
        created_at: new Date().toISOString(),
      })

      // Update user's total XP in profiles
      const { data: profileData } = await supabase.from("profiles").select("xp").eq("id", user.user.id).single()

      let currentXP = 0
      if (profileData) {
        currentXP = profileData.xp || 0
      }

      const newXP = currentXP + taskCompletionXP

      // Update user profile with new XP
      await supabase.from("profiles").upsert({
        id: user.user.id,
        xp: newXP,
        last_activity_date: new Date().toISOString().split("T")[0],
      })

      // Count completed tasks
      const { count } = await supabase
        .from("tasks")
        .select("id", { count: "exact" })
        .eq("user_id", user.user.id)
        .eq("status", "done")

      // Check if this completion unlocks a badge
      if (count === 10) {
        // Insert the badge into user_badges table to trigger the notification
        await supabase.from("user_badges").insert({
          user_id: user.user.id,
          badge_id: "task_master",
          earned_at: new Date().toISOString(),
        })

        // Show badge notification
        badgeNotification.showBadgeNotification("task_master")
      }
    } catch (error) {
      console.error("Error recording task completion:", error)
    }
  }

  const handleMarkComplete = async (taskId: string) => {
    await handleUpdateTaskStatus(taskId, "done")
  }

  const getTasksByStatus = (status: Task["status"]) => {
    return tasks.filter((task) => task.status === status)
  }

  const getTasksByDate = (date: Date) => {
    return tasks.filter((task) => {
      if (!task.due_date) return false
      return isSameDay(new Date(task.due_date), date)
    })
  }

  const getPriorityBadge = (priority: Task["task_priority"]) => {
    const priorityOption = priorityOptions.find((option) => option.value === priority)
    return <Badge className={`${priorityOption?.color} text-xs`}>{priorityOption?.label}</Badge>
  }

  const getPriorityColor = (priority: Task["task_priority"]) => {
    return priorityOptions.find((option) => option.value === priority)
  }

  const weekDays = eachDayOfInterval({
    start: startOfWeek(currentWeek, { weekStartsOn: 1 }),
    end: endOfWeek(currentWeek, { weekStartsOn: 1 }),
  })

  const previousWeek = () => {
    setCurrentWeek(addDays(currentWeek, -7))
  }

  const nextWeek = () => {
    setCurrentWeek(addDays(currentWeek, 7))
  }

  const resetToCurrentWeek = () => {
    setCurrentWeek(new Date())
  }

  // Custom date picker functions
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)

    // Get the day of the week for the first day (0 = Sunday, 1 = Monday, etc.)
    let firstDayOfWeek = firstDay.getDay()
    // Adjust for Monday as first day of week
    firstDayOfWeek = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1

    // Create array for days before the first day of month (padding)
    const daysBeforeMonth = Array.from({ length: firstDayOfWeek }, (_, i) => {
      const d = new Date(year, month, -firstDayOfWeek + i + 1)
      return { date: d, isCurrentMonth: false }
    })

    // Create array for days in the month
    const daysInMonth = Array.from({ length: lastDay.getDate() }, (_, i) => {
      const d = new Date(year, month, i + 1)
      return { date: d, isCurrentMonth: true }
    })

    // Calculate how many days to add after the month
    const totalCells = Math.ceil((firstDayOfWeek + lastDay.getDate()) / 7) * 7
    const daysAfterMonth = Array.from(
      { length: totalCells - (daysBeforeMonth.length + daysInMonth.length) },
      (_, i) => {
        const d = new Date(year, month + 1, i + 1)
        return { date: d, isCurrentMonth: false }
      },
    )

    return [...daysBeforeMonth, ...daysInMonth, ...daysAfterMonth]
  }

  const changeMonth = (increment: number) => {
    const newDate = new Date(selectedMonth)
    newDate.setMonth(newDate.getMonth() + increment)
    setSelectedMonth(newDate)
  }

  const handleSelectDate = (date: Date, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setFormState((prev) => ({ ...prev, dueDate: date }))
    setShowDatePicker(false)
  }

  const isSelectedDate = (date: Date) => {
    return formState.dueDate ? isSameDay(date, formState.dueDate) : false
  }

  const handleStatusChange = (value: string) => {
    setFormState((prev) => ({ ...prev, status: value as Task["status"] }))
  }

  const handlePriorityChange = (value: string) => {
    setFormState((prev) => ({ ...prev, priority: value as Task["task_priority"] }))
  }

  const handleDateButtonClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setShowDatePicker(!showDatePicker)
  }

  // Task form component with uncontrolled inputs
  const TaskForm = () => (
    <div className="space-y-4" ref={formContainerRef} onClick={(e) => e.stopPropagation()}>
      <div className="space-y-2">
        <Label htmlFor="taskTitle">Titlu</Label>
        <Input
          id="taskTitle"
          ref={titleInputRef}
          placeholder="Ex: Finalizează proiectul de matematică"
          className="transition-all focus:ring-accent"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
          defaultValue={formState.title}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="taskDescription">Descriere (opțional)</Label>
        <Textarea
          id="taskDescription"
          ref={descriptionInputRef}
          placeholder="Descrie sarcina ta în detaliu..."
          className="transition-all focus:ring-accent"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
          defaultValue={formState.description}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="taskStatus">Status</Label>
        <RadioGroup value={formState.status} onValueChange={handleStatusChange} className="flex space-x-2">
          {statusOptions.map((option) => (
            <div key={option.value} className="flex items-center space-x-2">
              <RadioGroupItem value={option.value} id={`status-${option.value}`} />
              <Label htmlFor={`status-${option.value}`} className="flex items-center">
                <div className={`w-2 h-2 rounded-full ${option.color} mr-1`}></div>
                {option.label}
              </Label>
            </div>
          ))}
        </RadioGroup>
      </div>
      <div className="space-y-2">
        <Label htmlFor="taskPriority">Prioritate</Label>
        <RadioGroup value={formState.priority} onValueChange={handlePriorityChange} className="flex space-x-2">
          {priorityOptions.map((option) => (
            <div key={option.value} className="flex items-center space-x-2">
              <RadioGroupItem value={option.value} id={`priority-${option.value}`} />
              <Label htmlFor={`priority-${option.value}`} className="flex items-center">
                <div className={`w-2 h-2 rounded-full ${option.color} mr-1`}></div>
                {option.label}
              </Label>
            </div>
          ))}
        </RadioGroup>
      </div>
      <div className="space-y-2">
        <Label htmlFor="taskDueDate">Termen limită (opțional)</Label>
        <div className="relative">
          <Button
            type="button"
            ref={dateButtonRef}
            variant="outline"
            className={cn("w-full justify-start text-left font-normal", !formState.dueDate && "text-muted-foreground")}
            onClick={handleDateButtonClick}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {formState.dueDate ? format(formState.dueDate, "PPP", { locale: ro }) : "Selectează data"}
          </Button>

          {/* Custom date picker - positioned ABOVE the button */}
          {showDatePicker && (
            <div
              ref={datePickerRef}
              className="absolute z-50 bottom-full mb-1 bg-background border rounded-md shadow-md p-3 w-[300px]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-4">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation()
                    changeMonth(-1)
                  }}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div className="font-medium">{format(selectedMonth, "MMMM yyyy", { locale: ro })}</div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation()
                    changeMonth(1)
                  }}
                >
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>

              <div className="grid grid-cols-7 gap-1 text-center mb-2">
                {["L", "M", "M", "J", "V", "S", "D"].map((day, i) => (
                  <div key={i} className="text-xs text-muted-foreground">
                    {day}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1">
                {getDaysInMonth(selectedMonth).map((day, i) => (
                  <Button
                    key={i}
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "h-8 w-8 p-0 text-sm",
                      !day.isCurrentMonth && "text-muted-foreground opacity-50",
                      isSelectedDate(day.date) && "bg-accent text-accent-foreground",
                      isToday(day.date) && !isSelectedDate(day.date) && "border border-accent",
                    )}
                    onClick={(e) => handleSelectDate(day.date, e)}
                  >
                    {format(day.date, "d")}
                  </Button>
                ))}
              </div>

              <div className="mt-4 flex justify-between">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleSelectDate(new Date(), e)
                  }}
                >
                  Astăzi
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    setFormState((prev) => ({ ...prev, dueDate: undefined }))
                    setShowDatePicker(false)
                  }}
                >
                  Șterge
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )

  // Render task card component
  const TaskCard = ({ task }: { task: Task }) => {
    const priorityColor = getPriorityColor(task.task_priority)

    return (
      <Card
        className={`border-2 ${priorityColor?.borderColor} ${priorityColor?.bgColor} transition-all hover:shadow-md`}
      >
        <CardHeader className="p-3 pb-0">
          <div className="flex justify-between items-start">
            <CardTitle className="text-base">{task.title}</CardTitle>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleOpenEditTask(task)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Editează
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleDeleteTask(task.id)} className="text-destructive">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Șterge
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent className="p-3 pt-2">
          {task.description && <p className="text-sm text-muted-foreground mb-2">{task.description}</p>}
          <div className="flex flex-wrap items-center gap-2">
            <HoverCard>
              <HoverCardTrigger asChild>
                <div className="cursor-help">{getPriorityBadge(task.task_priority)}</div>
              </HoverCardTrigger>
              <HoverCardContent className="w-auto">
                <div className="flex items-center gap-2">
                  <Flag className="h-4 w-4" />
                  <span>
                    Prioritate {priorityOptions.find((p) => p.value === task.task_priority)?.label.toLowerCase()}
                  </span>
                </div>
              </HoverCardContent>
            </HoverCard>
            {task.due_date && (
              <div className="flex items-center text-xs text-muted-foreground">
                <Clock className="h-3 w-3 mr-1" />
                {format(new Date(task.due_date), "PPP", { locale: ro })}
              </div>
            )}
          </div>
        </CardContent>

        {/* Quick action buttons moved to the bottom */}
        <CardFooter className="p-2 pt-0 flex justify-end gap-1">
          {task.status !== "done" && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 bg-green-500/10 hover:bg-green-500/20 text-green-500 rounded-full p-0"
              onClick={() => handleMarkComplete(task.id)}
              title="Marchează ca finalizat"
            >
              <CheckCircle2 className="h-4 w-4" />
            </Button>
          )}

          {/* Status change buttons */}
          {task.status !== "todo" && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 rounded-full p-0"
              onClick={() => handleUpdateTaskStatus(task.id, "todo")}
              title="Mută la De făcut"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}

          {task.status !== "in-progress" && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-500 rounded-full p-0"
              onClick={() => handleUpdateTaskStatus(task.id, "in-progress")}
              title="Mută la În progres"
            >
              <Clock className="h-4 w-4" />
            </Button>
          )}
        </CardFooter>
      </Card>
    )
  }

  // Render calendar task card
  const CalendarTaskCard = ({ task }: { task: Task }) => {
    const priorityColor = getPriorityColor(task.task_priority)

    return (
      <motion.div
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="p-1"
      >
        <Card
          className={`border-l-4 ${priorityColor?.borderColor} ${priorityColor?.bgColor} dark:border-zinc-800 transition-all hover:shadow-md`}
        >
          <CardContent className="p-2">
            <div className="flex justify-between items-start">
              <div>
                <div className="font-medium text-sm">{task.title}</div>
                <div className="flex items-center gap-1 mt-1">{getPriorityBadge(task.task_priority)}</div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-6 w-6">
                    <MoreHorizontal className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleOpenEditTask(task)}>
                    <Edit className="mr-2 h-4 w-4" />
                    Editează
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleDeleteTask(task.id)} className="text-destructive">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Șterge
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    )
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 min-h-[calc(100vh-200px)]">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Lista de sarcini</h1>
            <p className="text-muted-foreground">Organizează-ți sarcinile și urmărește progresul tău</p>
          </div>
          <Button
            className="mt-4 md:mt-0 bg-accent hover:bg-accent/90 text-accent-foreground transition-all"
            onClick={handleOpenAddTask}
          >
            <Plus className="mr-2 h-4 w-4" />
            Adaugă sarcină
          </Button>

          {/* Dialog for desktop */}
          {isDesktop && (
            <Dialog
              open={taskDialogOpen}
              onOpenChange={(open) => {
                setTaskDialogOpen(open)
                if (!open) resetFormState()
              }}
            >
              <DialogContent onClick={(e) => e.stopPropagation()}>
                <DialogHeader>
                  <DialogTitle>{editingTaskId ? "Editează sarcina" : "Adaugă o sarcină nouă"}</DialogTitle>
                  <DialogDescription>
                    {editingTaskId
                      ? "Modifică detaliile sarcinii tale."
                      : "Completează detaliile pentru noua ta sarcină."}
                  </DialogDescription>
                </DialogHeader>
                <TaskForm />
                <DialogFooter>
                  <Button variant="outline" onClick={handleCloseDialog} className="transition-all hover:bg-muted">
                    Anulează
                  </Button>
                  <Button
                    onClick={handleSaveTask}
                    className="bg-accent hover:bg-accent/90 text-accent-foreground transition-all"
                  >
                    {editingTaskId ? "Actualizează" : "Adaugă"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}

          {/* Drawer for mobile */}
          {!isDesktop && (
            <Drawer
              open={taskDrawerOpen}
              onOpenChange={(open) => {
                setTaskDrawerOpen(open)
                if (!open) resetFormState()
              }}
            >
              <DrawerContent>
                <DrawerHeader className="text-left">
                  <DrawerTitle>{editingTaskId ? "Editează sarcina" : "Adaugă o sarcină nouă"}</DrawerTitle>
                  <DrawerDescription>
                    {editingTaskId
                      ? "Modifică detaliile sarcinii tale."
                      : "Completează detaliile pentru noua ta sarcină."}
                  </DrawerDescription>
                </DrawerHeader>
                <div className="px-4">
                  <TaskForm />
                </div>
                <DrawerFooter className="pt-2">
                  <Button
                    onClick={handleSaveTask}
                    className="bg-accent hover:bg-accent/90 text-accent-foreground transition-all"
                  >
                    {editingTaskId ? "Actualizează" : "Adaugă"}
                  </Button>
                  <DrawerClose asChild>
                    <Button variant="outline" onClick={resetFormState}>
                      Anulează
                    </Button>
                  </DrawerClose>
                </DrawerFooter>
              </DrawerContent>
            </Drawer>
          )}
        </div>

        {/* Bauhaus-inspired decorative elements */}
        <div className="fixed -z-10 top-40 left-20 w-40 h-40 bg-primary/10 rounded-full opacity-30 animate-pulse"></div>
        <div className="fixed -z-10 bottom-20 right-40 w-60 h-60 bg-accent/10 rounded-full opacity-30 animate-pulse"></div>
        <div className="fixed -z-10 top-1/3 right-1/4 w-20 h-20 bg-primary/10 rotate-45 opacity-30"></div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList>
            <TabsTrigger
              value="kanban"
              className="flex items-center gap-2 transition-all hover:bg-accent/20 data-[state=active]:bg-accent data-[state=active]:text-accent-foreground"
            >
              <LayoutGrid className="h-4 w-4" />
              <span>Kanban</span>
            </TabsTrigger>
            <TabsTrigger
              value="calendar"
              className="flex items-center gap-2 transition-all hover:bg-accent/20 data-[state=active]:bg-accent data-[state=active]:text-accent-foreground"
            >
              <CalendarIcon className="h-4 w-4" />
              <span>Calendar</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="kanban">
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {statusOptions.map((status) => (
                  <div key={status.value} className="flex flex-col">
                    <div className="flex items-center mb-2">
                      <div className={`w-3 h-3 rounded-full ${status.color} mr-2`}></div>
                      <h3 className="font-medium">{status.label}</h3>
                      <span className="ml-2 text-xs text-muted-foreground">(0)</span>
                    </div>
                    <div className="min-h-[200px] p-2 rounded-md bg-muted/30 flex-grow">
                      {[1, 2].map((i) => (
                        <div key={i} className="mb-2">
                          <Card className="border-2 animate-pulse">
                            <CardHeader className="p-3 pb-0">
                              <div className="h-5 w-3/4 bg-muted rounded"></div>
                            </CardHeader>
                            <CardContent className="p-3 pt-2">
                              <div className="h-3 w-1/2 bg-muted rounded mb-2"></div>
                              <div className="h-3 w-1/4 bg-muted rounded"></div>
                            </CardContent>
                          </Card>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : tasks.length === 0 ? (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
                <Card className="border-2 dark:border-zinc-800">
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <CheckCircle className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground text-center">Nu ai nicio sarcină. Adaugă prima ta sarcină!</p>
                    <Button
                      className="mt-4 bg-accent hover:bg-accent/90 text-accent-foreground transition-all"
                      onClick={handleOpenAddTask}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Adaugă sarcină
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {statusOptions.map((status) => {
                  const statusTasks = getTasksByStatus(status.value as Task["status"])
                  return (
                    <div key={status.value} className="flex flex-col">
                      <div className="flex items-center mb-2">
                        <div className={`w-3 h-3 rounded-full ${status.color} mr-2`}></div>
                        <h3 className="font-medium">{status.label}</h3>
                        <span className="ml-2 text-xs text-muted-foreground">({statusTasks.length})</span>
                      </div>
                      <div className="min-h-[200px] p-2 rounded-md bg-muted/30 flex-grow">
                        <AnimatePresence>
                          {statusTasks.map((task) => (
                            <motion.div
                              key={task.id}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.2 }}
                              className="mb-2 relative group"
                            >
                              <TaskCard task={task} />
                            </motion.div>
                          ))}
                        </AnimatePresence>

                        {statusTasks.length === 0 && (
                          <div className="flex items-center justify-center h-full">
                            <p className="text-sm text-muted-foreground">Nicio sarcină</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="calendar">
            <Card className="border-2 dark:border-zinc-800">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-center">
                  <Button variant="outline" size="sm" onClick={previousWeek}>
                    <ArrowLeft className="h-4 w-4 mr-1" />
                    Săptămâna anterioară
                  </Button>
                  <div className="flex flex-col items-center">
                    <CardTitle className="text-lg">{format(weekDays[0], "MMMM yyyy", { locale: ro })}</CardTitle>
                    <Button variant="ghost" size="sm" onClick={resetToCurrentWeek}>
                      Săptămâna curentă
                    </Button>
                  </div>
                  <Button variant="outline" size="sm" onClick={nextWeek}>
                    Săptămâna următoare
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-7 gap-2">
                  {weekDays.map((day, i) => (
                    <div key={i} className="flex flex-col">
                      <div
                        className={`text-center p-2 mb-2 rounded-md ${
                          isToday(day) ? "bg-accent text-accent-foreground" : ""
                        }`}
                      >
                        <div className="text-xs text-muted-foreground uppercase">
                          {format(day, "EEEE", { locale: ro })}
                        </div>
                        <div className="text-xl font-bold">{format(day, "d", { locale: ro })}</div>
                      </div>
                      <div className="space-y-2 min-h-[150px]">
                        {loading ? (
                          <div className="space-y-2">
                            <div className="h-12 bg-muted/50 rounded animate-pulse"></div>
                            <div className="h-12 bg-muted/50 rounded animate-pulse"></div>
                          </div>
                        ) : (
                          <>
                            {getTasksByDate(day).map((task) => (
                              <CalendarTaskCard key={task.id} task={task} />
                            ))}

                            {getTasksByDate(day).length === 0 && (
                              <div className="flex items-center justify-center h-full">
                                <p className="text-xs text-muted-foreground">Nicio sarcină</p>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  )
}
