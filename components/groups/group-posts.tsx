"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Send, Trash2 } from "lucide-react" // Removed ThumbsUp, MessageSquare
import { useToast } from "@/components/ui/use-toast"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { formatDistanceToNow } from "date-fns"
import { ro } from "date-fns/locale"

interface GroupPostsProps {
  posts: any[]
  groupId: string
  isMember: boolean
  currentUserId: string
}

export function GroupPosts({ posts = [], groupId, isMember, currentUserId }: GroupPostsProps) {
  const [newPostContent, setNewPostContent] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()
  const router = useRouter()
  const supabase = createClient()

  const handleSubmitPost = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newPostContent.trim()) return

    setIsSubmitting(true)
    try {
      const { error } = await supabase.from("group_posts").insert({
        group_id: groupId,
        user_id: currentUserId,
        content: newPostContent.trim(),
        // Removed likes and comments from initial insert as they are no longer used
      })

      if (error) throw error

      toast({
        title: "Succes",
        description: "Postarea a fost adăugată cu succes",
      })

      setNewPostContent("")
      router.refresh()
    } catch (error: any) {
      toast({
        title: "Eroare",
        description: error.message || "A apărut o eroare la adăugarea postării",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeletePost = async (postId: string) => {
    try {
      const { error } = await supabase.from("group_posts").delete().eq("id", postId).eq("user_id", currentUserId)

      if (error) throw error

      toast({
        title: "Succes",
        description: "Postarea a fost ștearsă cu succes",
      })

      router.refresh()
    } catch (error: any) {
      toast({
        title: "Eroare",
        description: error.message || "A apărut o eroare la ștergerea postării",
        variant: "destructive",
      })
    }
  }

  // Removed handleLikePost function as it's no longer needed

  // Helper function to get learning style color
  const getLearningStyleColor = (style: string | null) => {
    switch (style) {
      case "visual":
        return "bg-blue-100 text-blue-800"
      case "auditiv":
        return "bg-green-100 text-green-800"
      case "kinestezic":
        return "bg-purple-100 text-purple-800"
      case "citire/scriere":
        return "bg-amber-100 text-amber-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <div className="space-y-6">
      {isMember && (
        <Card>
          <CardHeader>
            <CardTitle>Adaugă o postare</CardTitle>
          </CardHeader>
          <form onSubmit={handleSubmitPost}>
            <CardContent>
              <Textarea
                placeholder="Ce ai vrea să împărtășești cu grupul?"
                value={newPostContent}
                onChange={(e) => setNewPostContent(e.target.value)}
                rows={3}
                className="resize-none"
              />
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button type="submit" disabled={isSubmitting || !newPostContent.trim()}>
                {isSubmitting ? "Se postează..." : "Postează"}
                <Send className="ml-2 h-4 w-4" />
              </Button>
            </CardFooter>
          </form>
        </Card>
      )}

      {posts.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground">
          {isMember
            ? "Nu există postări în acest grup. Fii primul care postează ceva!"
            : "Nu există postări în acest grup."}
        </div>
      ) : (
        posts.map((post) => (
          <Card key={post.id} className="overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback>{post.author.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium">{post.author.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: ro })}
                    </div>
                  </div>
                </div>
                {post.author.learning_style && (
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${getLearningStyleColor(post.author.learning_style)}`}
                  >
                    {post.author.learning_style}
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent className="pb-3">
              <p className="whitespace-pre-wrap">{post.content}</p>
            </CardContent>
            <CardFooter className="border-t pt-3 flex justify-end">
              {" "}
              {/* Changed justify-between to justify-end */}
              {post.user_id === currentUserId && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-500 hover:text-red-700"
                  onClick={() => handleDeletePost(post.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </CardFooter>
          </Card>
        ))
      )}
    </div>
  )
}
