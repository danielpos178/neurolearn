"use client"

import { useEffect, useState } from "react"
import { format } from "date-fns"
import { ro } from "date-fns/locale"
import { CalendarClock, CheckCircle2 } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { createClient } from "@/lib/supabase/client"

interface Task {
  id: string
  title: string
  due_date: string | null
  status: string
  task_priority: string
}

export function UpcomingTasks({ tasks: propTasks }: { tasks?: Task[] | null }) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    // If tasks are passed as props, use them
    if (propTasks !== undefined) {
      setTasks(propTasks || [])
      setLoading(false)
      return
    }

    // Otherwise fetch tasks directly
    fetchTasks()
  }, [propTasks, supabase])

  const fetchTasks = async () => {
    setLoading(true)
    try {
      const { data: userData } = await supabase.auth.getUser()

      if (!userData.user) {
        setLoading(false)
        return
      }

      // Get current date in ISO format for comparison
      const currentDate = new Date().toISOString()

      const { data, error } = await supabase
        .from("tasks")
        .select("id, title, due_date, status, task_priority")
        .eq("user_id", userData.user.id)
        .neq("status", "done") // Exclude completed tasks
        .not("due_date", "is", null) // Only tasks with due dates
        .gte("due_date", currentDate) // Only future tasks
        .order("due_date", { ascending: true })
        .limit(5)

      if (error) {
        console.error("Error fetching upcoming tasks:", error)
        setTasks([])
      } else {
        setTasks(data || [])
      }
    } catch (error) {
      console.error("Error in fetchTasks:", error)
      setTasks([])
    } finally {
      setLoading(false)
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case "high":
        return "bg-red-500 hover:bg-red-600 text-white"
      case "medium":
        return "bg-yellow-500 hover:bg-yellow-600 text-white"
      case "low":
        return "bg-green-500 hover:bg-green-600 text-white"
      default:
        return "bg-blue-500 hover:bg-blue-600 text-white"
    }
  }

  const getPriorityLabel = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case "high":
        return "Ridicată"
      case "medium":
        return "Medie"
      case "low":
        return "Scăzută"
      default:
        return "Normal"
    }
  }

  const handleMarkComplete = async (taskId: string) => {
    try {
      const { error } = await supabase.from("tasks").update({ status: "done" }).eq("id", taskId)

      if (!error) {
        setTasks(tasks.filter((task) => task.id !== taskId))
      }
    } catch (error) {
      console.error("Error marking task as complete:", error)
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <CalendarClock className="h-5 w-5" />
          Taskuri apropiate
        </CardTitle>
        <CardDescription>
          {loading ? "Se încarcă..." : `Următoarele ${tasks.length} taskuri care trebuie finalizate`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between p-3 border rounded-lg animate-pulse">
                <div className="space-y-2">
                  <div className="h-4 w-48 bg-gray-300 rounded"></div>
                  <div className="h-3 w-24 bg-gray-300 rounded"></div>
                </div>
                <div className="h-6 w-16 bg-gray-300 rounded"></div>
              </div>
            ))}
          </div>
        ) : tasks.length > 0 ? (
          <div className="space-y-3">
            {tasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1">
                  <h4 className="font-medium">{task.title}</h4>
                  <p className="text-sm text-muted-foreground">
                    {task.due_date ? format(new Date(task.due_date), "d MMMM yyyy", { locale: ro }) : "Fără dată"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={getPriorityColor(task.task_priority)}>{getPriorityLabel(task.task_priority)}</Badge>
                  <button
                    onClick={() => handleMarkComplete(task.id)}
                    className="text-muted-foreground hover:text-green-500 transition-colors"
                    aria-label="Marchează ca finalizat"
                  >
                    <CheckCircle2 className="h-5 w-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6">
            <p className="text-muted-foreground">Nu ai taskuri apropiate</p>
            <p className="text-sm text-muted-foreground">Adaugă taskuri cu termene limită din pagina Todo</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
