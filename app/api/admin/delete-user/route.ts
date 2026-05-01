import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const requestData = await request.json()
    const { userId } = requestData

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    // Get the current user to verify they're deleting their own account
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Verify the user is deleting their own account
    if (user.id !== userId) {
      return NextResponse.json({ error: "You can only delete your own account" }, { status: 403 })
    }

    // Create an admin client with the service role key
    const supabaseAdmin = createAdminClient()

    // Delete the user from auth.users
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId)

    if (error) {
      console.error("Error deleting auth user:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Error in delete-user route:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
