import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { groupId, userId, role = "member" } = await request.json()

    // Verificăm dacă utilizatorul curent este admin în grup
    const { data: adminCheck } = await supabase
      .from("group_members")
      .select("*")
      .eq("group_id", groupId)
      .eq("user_id", user.id)
      .eq("role", "admin")
      .single()

    if (!adminCheck) {
      return NextResponse.json({ error: "Forbidden: Only group admins can add members" }, { status: 403 })
    }

    // Adăugăm membrul nou
    const { data, error } = await supabase
      .from("group_members")
      .insert([{ group_id: groupId, user_id: userId, role }])
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ data })
  } catch (error: any) {
    console.error("Error adding group member:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  const supabase = await createClient()

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { groupId, userId, role } = await request.json()

    // Verificăm dacă utilizatorul curent este admin în grup
    const { data: adminCheck } = await supabase
      .from("group_members")
      .select("*")
      .eq("group_id", groupId)
      .eq("user_id", user.id)
      .eq("role", "admin")
      .single()

    if (!adminCheck) {
      return NextResponse.json({ error: "Forbidden: Only group admins can update member roles" }, { status: 403 })
    }

    // Actualizăm rolul membrului
    const { data, error } = await supabase
      .from("group_members")
      .update({ role })
      .eq("group_id", groupId)
      .eq("user_id", userId)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ data })
  } catch (error: any) {
    console.error("Error updating group member:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient()
  const url = new URL(request.url)
  const groupId = url.searchParams.get("groupId")
  const userId = url.searchParams.get("userId")

  if (!groupId || !userId) {
    return NextResponse.json({ error: "Missing required parameters" }, { status: 400 })
  }

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Dacă utilizatorul încearcă să se șteargă pe sine, permitem
    if (userId === user.id) {
      const { error } = await supabase.from("group_members").delete().eq("group_id", groupId).eq("user_id", userId)

      if (error) throw error

      return NextResponse.json({ success: true })
    }

    // Altfel, verificăm dacă utilizatorul curent este admin
    const { data: adminCheck } = await supabase
      .from("group_members")
      .select("*")
      .eq("group_id", groupId)
      .eq("user_id", user.id)
      .eq("role", "admin")
      .single()

    if (!adminCheck) {
      return NextResponse.json({ error: "Forbidden: Only group admins can remove members" }, { status: 403 })
    }

    // Ștergem membrul
    const { error } = await supabase.from("group_members").delete().eq("group_id", groupId).eq("user_id", userId)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Error removing group member:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
