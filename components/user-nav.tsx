"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { useLoading } from "@/components/loading-provider"
import { Users, Settings, LogOut, Shield } from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"

export function UserNav({ user }: { user: any }) {
  const router = useRouter()
  const supabase = createClient()
  const { setIsLoading } = useLoading()
  const [isAdmin, setIsAdmin] = useState(false)
  const [userProfile, setUserProfile] = useState<any>(null)

  useEffect(() => {
    // Check if user has admin role and get profile data
    const fetchUserProfile = async () => {
      if (!user) return

      const { data, error } = await supabase.from("profiles").select("*").eq("id", user.id).single()

      if (!error && data) {
        setUserProfile(data)
        if (data.role === "admin") {
          setIsAdmin(true)
        }
      }
    }

    fetchUserProfile()
  }, [user, supabase])

  const handleSignOut = async () => {
    setIsLoading(true)
    await supabase.auth.signOut()
    router.push("/")
    router.refresh()
    setIsLoading(false)
  }

  const getInitials = () => {
    // First try to get the first letter of the first name from the profile
    if (userProfile?.first_name) {
      return userProfile.first_name.charAt(0).toUpperCase()
    }

    // Then try from user metadata
    if (user?.user_metadata?.first_name) {
      return user.user_metadata.first_name.charAt(0).toUpperCase()
    }

    // Fallback to email
    if (user?.email) {
      return user.email.charAt(0).toUpperCase()
    }

    // Ultimate fallback
    return "U"
  }

  const displayName =
    userProfile?.full_name ||
    `${user?.user_metadata?.first_name || ""} ${user?.user_metadata?.last_name || ""}`.trim() ||
    user?.email ||
    "Utilizator"

  const initials = getInitials()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-8 w-8">
            <AvatarImage src={user?.user_metadata?.avatar_url || ""} alt={displayName} />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">
              {userProfile?.first_name || user?.user_metadata?.first_name || ""}{" "}
              {userProfile?.last_name || user?.user_metadata?.last_name || ""}
            </p>
            <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link href="/grupuri" className="cursor-pointer">
              <Users className="mr-2 h-4 w-4" />
              <span>Grupuri</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => router.push("/setari")}>
            <Settings className="mr-2 h-4 w-4" />
            <span>Setări</span>
          </DropdownMenuItem>
          {isAdmin && (
            <DropdownMenuItem asChild>
              <Link href="/admin" className="cursor-pointer">
                <Shield className="mr-2 h-4 w-4" />
                <span>Admin</span>
              </Link>
            </DropdownMenuItem>
          )}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>Deconectare</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
