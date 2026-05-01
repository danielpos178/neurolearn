"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Trash2, Edit, FileText, Shield, Save, X } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

interface Lesson {
  id: string
  title: string
  description: string | null
  content: string | null
  content_path: string | null
  xp_reward: number
  difficulty: string | null
  estimated_duration: number
  category: string | null
  tags: string[] | null
  is_published: boolean
  created_at: string
  updated_at: string
}

// Helper functions for display names
function getDifficultyDisplayName(difficulty: string | null): string {
  switch (difficulty) {
    case "beginner":
      return "Începător"
    case "intermediate":
      return "Intermediar"
    case "advanced":
      return "Avansat"
    default:
      return "Necunoscut"
  }
}

function getCategoryDisplayName(category: string | null): string {
  switch (category) {
    case "all":
      return "Universal"
    case "visual":
      return "Vizual"
    case "auditory":
      return "Auditiv"
    case "kinesthetic":
      return "Kinestezic"
    default:
      return "Necunoscut"
  }
}

function getDifficultyColor(difficulty: string | null): string {
  switch (difficulty) {
    case "beginner":
      return "bg-green-100 text-green-800 border-green-200"
    case "intermediate":
      return "bg-yellow-100 text-yellow-800 border-yellow-200"
    case "advanced":
      return "bg-red-100 text-red-800 border-red-200"
    default:
      return "bg-gray-100 text-gray-800 border-gray-200"
  }
}

function getCategoryColor(category: string | null): string {
  switch (category) {
    case "all":
      return "bg-blue-100 text-blue-800 border-blue-200"
    case "visual":
      return "bg-purple-100 text-purple-800 border-purple-200"
    case "auditory":
      return "bg-orange-100 text-orange-800 border-orange-200"
    case "kinesthetic":
      return "bg-teal-100 text-teal-800 border-teal-200"
    default:
      return "bg-gray-100 text-gray-800 border-gray-200"
  }
}

export default function AdminDashboard() {
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null)
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    content: "",
    content_path: "",
    xp_reward: 10,
    difficulty: "beginner",
    estimated_duration: 15,
    category: "all",
    tags: "",
    is_published: false,
  })

  const { toast } = useToast()
  const supabase = createClient()

  useEffect(() => {
    fetchLessons()
  }, [])

  const fetchLessons = async () => {
    try {
      const { data, error } = await supabase.from("lessons").select("*").order("created_at", { ascending: false })

      if (error) throw error
      setLessons(data || [])
    } catch (error) {
      console.error("Error fetching lessons:", error)
      toast({
        title: "Eroare",
        description: "Nu s-au putut încărca lecțiile",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      // Parse tags from comma-separated string to array
      const tagsArray = formData.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0)

      const lessonData = {
        title: formData.title,
        description: formData.description || null,
        content: formData.content || null,
        content_path: formData.content_path || null,
        xp_reward: formData.xp_reward,
        difficulty: formData.difficulty,
        estimated_duration: formData.estimated_duration,
        category: formData.category,
        tags: tagsArray.length > 0 ? tagsArray : null,
        is_published: formData.is_published,
      }

      if (editingLesson) {
        // Update existing lesson
        const { error } = await supabase.from("lessons").update(lessonData).eq("id", editingLesson.id)

        if (error) throw error

        toast({
          title: "Succes",
          description: "Lecția a fost actualizată cu succes",
        })
      } else {
        // Create new lesson
        const { error } = await supabase.from("lessons").insert([lessonData])

        if (error) throw error

        toast({
          title: "Succes",
          description: "Lecția a fost creată cu succes",
        })
      }

      // Reset form and refresh lessons
      resetForm()
      fetchLessons()
    } catch (error: any) {
      console.error("Error saving lesson:", error)
      toast({
        title: "Eroare",
        description: error.message || "Nu s-a putut salva lecția",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = (lesson: Lesson) => {
    setEditingLesson(lesson)
    setFormData({
      title: lesson.title,
      description: lesson.description || "",
      content: lesson.content || "",
      content_path: lesson.content_path || "",
      xp_reward: lesson.xp_reward,
      difficulty: lesson.difficulty || "beginner",
      estimated_duration: lesson.estimated_duration,
      category: lesson.category || "all",
      tags: lesson.tags ? lesson.tags.join(", ") : "",
      is_published: lesson.is_published,
    })
  }

  const handleDelete = async (lessonId: string) => {
    if (!confirm("Ești sigur că vrei să ștergi această lecție?")) return

    try {
      const { error } = await supabase.from("lessons").delete().eq("id", lessonId)

      if (error) throw error

      toast({
        title: "Succes",
        description: "Lecția a fost ștearsă cu succes",
      })

      fetchLessons()
    } catch (error: any) {
      console.error("Error deleting lesson:", error)
      toast({
        title: "Eroare",
        description: error.message || "Nu s-a putut șterge lecția",
        variant: "destructive",
      })
    }
  }

  const resetForm = () => {
    setEditingLesson(null)
    setFormData({
      title: "",
      description: "",
      content: "",
      content_path: "",
      xp_reward: 10,
      difficulty: "beginner",
      estimated_duration: 15,
      category: "all",
      tags: "",
      is_published: false,
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Panou de Administrare</h1>
          <p className="text-muted-foreground">Gestionează lecțiile platformei</p>
        </div>
        <Badge variant="outline" className="flex items-center gap-2">
          <Shield className="h-4 w-4" />
          Administrator
        </Badge>
      </div>

      {/* Lessons Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {editingLesson ? "Editează Lecția" : "Adaugă Lecție Nouă"}
          </CardTitle>
          <CardDescription>
            {editingLesson
              ? "Modifică detaliile lecției existente"
              : "Completează toate câmpurile pentru a crea o lecție nouă"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Lesson Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Title and Description */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Titlu *</Label>
                <Input
                  id="title"
                  placeholder="Titlul lecției..."
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="content_path">Calea către conținut</Label>
                <Input
                  id="content_path"
                  placeholder="ex: numele-primei-lectii"
                  value={formData.content_path}
                  onChange={(e) => setFormData({ ...formData, content_path: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descriere</Label>
              <Textarea
                id="description"
                placeholder="Descrierea lecției..."
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            {/* Difficulty, Category, XP, Duration */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="difficulty">Dificultate</Label>
                <Select
                  value={formData.difficulty}
                  onValueChange={(value) => setFormData({ ...formData, difficulty: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginner">Începător</SelectItem>
                    <SelectItem value="intermediate">Intermediar</SelectItem>
                    <SelectItem value="advanced">Avansat</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Categorie</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Universal</SelectItem>
                    <SelectItem value="visual">Vizual</SelectItem>
                    <SelectItem value="auditory">Auditiv</SelectItem>
                    <SelectItem value="kinesthetic">Kinestezic</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="xp_reward">Recompensă XP</Label>
                <Input
                  id="xp_reward"
                  type="number"
                  min="1"
                  max="1000"
                  value={formData.xp_reward}
                  onChange={(e) => setFormData({ ...formData, xp_reward: Number.parseInt(e.target.value) || 10 })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="estimated_duration">Durată (minute)</Label>
                <Input
                  id="estimated_duration"
                  type="number"
                  min="1"
                  max="300"
                  value={formData.estimated_duration}
                  onChange={(e) =>
                    setFormData({ ...formData, estimated_duration: Number.parseInt(e.target.value) || 15 })
                  }
                />
              </div>
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <Label htmlFor="tags">Tag-uri (separate prin virgulă)</Label>
              <Input
                id="tags"
                placeholder="concentrare, memorie, tehnici de studiu"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Introduceți tag-urile separate prin virgulă. Exemplu: concentrare, memorie, tehnici de studiu
              </p>
            </div>

            {/* Content */}
            <div className="space-y-2">
              <Label htmlFor="content">Conținut (Markdown)</Label>
              <Textarea
                id="content"
                placeholder="Scrie conținutul lecției în format Markdown..."
                className="min-h-[300px] font-mono"
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Poți folosi Markdown pentru formatare. Dacă ai specificat o cale către conținut, aceasta va avea
                prioritate.
              </p>
            </div>

            {/* Published Toggle */}
            <div className="flex items-center space-x-2">
              <Switch
                id="is_published"
                checked={formData.is_published}
                onCheckedChange={(checked) => setFormData({ ...formData, is_published: checked })}
              />
              <Label htmlFor="is_published">Publică lecția</Label>
            </div>

            {/* Form Actions */}
            <div className="flex gap-4">
              <Button type="submit" disabled={isSubmitting} className="flex items-center gap-2">
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    {editingLesson ? "Se actualizează..." : "Se salvează..."}
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    {editingLesson ? "Actualizează Lecția" : "Creează Lecția"}
                  </>
                )}
              </Button>
              {editingLesson && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={resetForm}
                  className="flex items-center gap-2 bg-transparent"
                >
                  <X className="h-4 w-4" />
                  Anulează
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Lessons List */}
      <Card>
        <CardHeader>
          <CardTitle>Lecții Existente</CardTitle>
          <CardDescription>
            Gestionează lecțiile existente din platformă ({lessons?.length || 0} lecții)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {lessons && lessons.length > 0 ? (
            <div className="space-y-4">
              {lessons.map((lesson) => (
                <div
                  key={lesson.id}
                  className="flex items-start justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-3">
                      <h4 className="font-semibold">{lesson.title}</h4>
                      <div className="flex gap-2">
                        <Badge variant="outline" className={getDifficultyColor(lesson.difficulty)}>
                          {getDifficultyDisplayName(lesson.difficulty)}
                        </Badge>
                        <Badge variant="outline" className={getCategoryColor(lesson.category)}>
                          {getCategoryDisplayName(lesson.category)}
                        </Badge>
                        <Badge variant={lesson.is_published ? "default" : "secondary"}>
                          {lesson.is_published ? "Publicată" : "Draft"}
                        </Badge>
                      </div>
                    </div>

                    {lesson.description && <p className="text-sm text-muted-foreground">{lesson.description}</p>}

                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>XP: {lesson.xp_reward}</span>
                      <span>Durată: {lesson.estimated_duration} min</span>
                      {lesson.content_path && <span>Cale: {lesson.content_path}</span>}
                      {lesson.tags && lesson.tags.length > 0 && <span>Tag-uri: {lesson.tags.join(", ")}</span>}
                    </div>

                    <p className="text-xs text-muted-foreground">
                      Creată: {new Date(lesson.created_at).toLocaleDateString("ro-RO")}
                      {lesson.updated_at !== lesson.created_at && (
                        <span> • Actualizată: {new Date(lesson.updated_at).toLocaleDateString("ro-RO")}</span>
                      )}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    <Button variant="outline" size="sm" onClick={() => handleEdit(lesson)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-600 hover:text-red-700 bg-transparent"
                      onClick={() => handleDelete(lesson.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">Nu există lecții create încă</p>
              <p className="text-sm">Creează prima lecție folosind formularul de mai sus.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  )
}
