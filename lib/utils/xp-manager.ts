import { createClient } from "@/lib/supabase/client"
import { calculateUserLevel } from "./level-calculator"

/**
 * Adds XP to a user and records the activity
 * @param userId The user's ID
 * @param amount The amount of XP to add
 * @param activityType The type of activity (e.g., 'lesson_completion')
 * @param details Additional details about the activity
 */
export async function addUserXP(
  userId: string,
  amount: number,
  activityType: string,
  details: Record<string, any> = {},
): Promise<boolean> {
  try {
    const supabase = createClient()

    // Get current XP
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("xp")
      .eq("id", userId)
      .single()

    if (profileError) {
      console.error("Error fetching user XP:", profileError)
      return false
    }

    // Calculate new XP
    const currentXP = profile?.xp || 0
    const newXP = currentXP + amount

    // Update XP in profiles table (removed level update)
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        xp: newXP,
        last_activity_date: new Date().toISOString().split("T")[0],
      })
      .eq("id", userId)

    if (updateError) {
      console.error("Error updating user XP:", updateError)
      return false
    }

    // Record in activity log
    const activityDetails = {
      ...details,
      xp_earned: amount,
    }

    const { error: activityError } = await supabase.from("activity_log").insert({
      user_id: userId,
      activity_type: activityType,
      details: activityDetails,
      created_at: new Date().toISOString(),
    })

    if (activityError) {
      console.error("Error recording activity:", activityError)
      // We don't return false here because the XP was already updated
    }

    return true
  } catch (error) {
    console.error("Error in addUserXP:", error)
    return false
  }
}

/**
 * Gets a user's current XP and calculated level
 * @param userId The user's ID
 */
export async function getUserXPAndLevel(userId: string): Promise<{ xp: number; level: number } | null> {
  try {
    const supabase = createClient()

    const { data: profile, error } = await supabase.from("profiles").select("xp").eq("id", userId).single()

    if (error) {
      console.error("Error fetching user XP:", error)
      return null
    }

    const xp = profile?.xp || 0
    const { level } = calculateUserLevel(xp)

    return { xp, level }
  } catch (error) {
    console.error("Error in getUserXPAndLevel:", error)
    return null
  }
}
