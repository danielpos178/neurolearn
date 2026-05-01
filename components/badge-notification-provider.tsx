"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { BadgeUnlockPopup } from "@/components/achievements/badge-unlock-popup"
import { createClient } from "@/lib/supabase/client"

type BadgeNotificationContextType = {
  showBadgeNotification: (badgeId: string) => void
}

const BadgeNotificationContext = createContext<BadgeNotificationContextType | undefined>(undefined)

export function useBadgeNotification() {
  const context = useContext(BadgeNotificationContext)
  if (!context) {
    throw new Error("useBadgeNotification must be used within a BadgeNotificationProvider")
  }
  return context
}

export function BadgeNotificationProvider({ children }: { children: ReactNode }) {
  const [badgeId, setBadgeId] = useState<string | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const supabase = createClient()

  // Listen for badge unlock events from the server
  useEffect(() => {
    const setupRealtimeSubscription = async () => {
      const { data: user } = await supabase.auth.getUser()
      if (!user.user) return

      // Subscribe to badge_unlocks table for this user
      const channel = supabase
        .channel("badge-unlocks")
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "user_badges",
            filter: `user_id=eq.${user.user.id}`,
          },
          (payload) => {
            // When a new badge is unlocked, show the notification
            if (payload.new && payload.new.badge_id) {
              showBadgeNotification(payload.new.badge_id)
            }
          },
        )
        .subscribe()

      return () => {
        supabase.removeChannel(channel)
      }
    }

    setupRealtimeSubscription()
  }, [supabase])

  const showBadgeNotification = (id: string) => {
    setBadgeId(id)
    setIsOpen(true)
  }

  return (
    <BadgeNotificationContext.Provider value={{ showBadgeNotification }}>
      {children}
      {badgeId && <BadgeUnlockPopup badgeId={badgeId} open={isOpen} onOpenChange={setIsOpen} />}
    </BadgeNotificationContext.Provider>
  )
}
