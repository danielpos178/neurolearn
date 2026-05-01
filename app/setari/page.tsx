"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Layout from "@/components/layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/client"
import { useLoading } from "@/components/loading-provider"
import { DeleteAccount } from "@/components/settings/delete-account"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "@/components/ui/use-toast"
import { Loader2, Save } from "lucide-react"
import { Textarea } from "@/components/ui/textarea"

interface UserProfile {
  id: string
  full_name: string
  first_name: string
  last_name: string
  email: string
  bio: string | null
  role: string
}

export default function SettingsPage() {
  const router = useRouter()
  const supabase = createClient()
  const { setIsLoading } = useLoading()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [userEmail, setUserEmail] = useState("")

  // Form states
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [bio, setBio] = useState("")

  useEffect(() => {
    async function checkAuth() {
      setIsLoading(true)
      setLoading(true)

      try {
        const { data: userData } = await supabase.auth.getUser()

        if (!userData.user) {
          router.push("/login")
          return
        }

        setUserEmail(userData.user.email || "")

        // Fetch user profile
        const { data: profileData, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", userData.user.id)
          .single()

        if (error) {
          console.error("Error fetching profile:", error)
          // If profile doesn't exist, create one
          if (error.code === "PGRST116") {
            const newProfile = {
              id: userData.user.id,
              first_name: userData.user.user_metadata?.first_name || "",
              last_name: userData.user.user_metadata?.last_name || "",
              full_name: userData.user.user_metadata?.full_name || userData.user.user_metadata?.name || "",
              email: userData.user.email,
              bio: "",
              role: "user",
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }

            const { error: insertError } = await supabase.from("profiles").insert(newProfile)

            if (insertError) {
              console.error("Error creating profile:", insertError)
              toast({
                title: "Eroare",
                description: "Nu s-a putut crea profilul. Încearcă din nou.",
                variant: "destructive",
              })
              return
            }

            setUserProfile(newProfile)
            setFirstName(newProfile.first_name)
            setLastName(newProfile.last_name)
            setBio(newProfile.bio || "")
          } else {
            toast({
              title: "Eroare",
              description: "Nu s-a putut încărca profilul. Încearcă din nou.",
              variant: "destructive",
            })
            return
          }
        } else {
          // Profile exists, set the data
          setUserProfile(profileData)
          setFirstName(profileData.first_name || "")
          setLastName(profileData.last_name || "")
          setBio(profileData.bio || "")
        }
      } catch (error) {
        console.error("Error in checkAuth:", error)
        toast({
          title: "Eroare",
          description: "A apărut o eroare la încărcarea datelor. Încearcă din nou.",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
        setIsLoading(false)
      }
    }

    checkAuth()
  }, [router, supabase, setIsLoading])

  const handleSaveProfile = async () => {
    if (!userProfile) return

    setSaving(true)
    try {
      const fullName = `${firstName} ${lastName}`.trim()

      const updatedProfile = {
        first_name: firstName,
        last_name: lastName,
        full_name: fullName,
        bio,
        updated_at: new Date().toISOString(),
      }

      const { error } = await supabase.from("profiles").update(updatedProfile).eq("id", userProfile.id)

      if (error) throw error

      // Update auth metadata
      await supabase.auth.updateUser({
        data: {
          first_name: firstName,
          last_name: lastName,
          full_name: fullName,
        },
      })

      toast({
        title: "Profil actualizat",
        description: "Informațiile tale au fost salvate cu succes.",
      })

      // Update local state
      setUserProfile({
        ...userProfile,
        first_name: firstName,
        last_name: lastName,
        full_name: fullName,
        bio,
      })
    } catch (error) {
      console.error("Error updating profile:", error)
      toast({
        title: "Eroare",
        description: "Nu s-a putut actualiza profilul. Încearcă din nou.",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Layout>
        <div className="container py-8 flex items-center justify-center min-h-[60vh]">
          <div className="flex flex-col items-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="mt-2 text-muted-foreground">Se încarcă setările...</p>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="container py-8 min-h-[calc(100vh-200px)]">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Setări</h1>
          <p className="text-muted-foreground">Personalizează experiența ta de învățare</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Profil</CardTitle>
            <CardDescription>
              Gestionează informațiile tale personale. Aceste informații vor fi afișate public.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex-1 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">Prenume</Label>
                  <Input
                    id="firstName"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Prenumele tău"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Nume</Label>
                  <Input
                    id="lastName"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Numele tău"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" value={userEmail} disabled />
                <p className="text-xs text-muted-foreground mt-1">Adresa de email nu poate fi modificată.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="bio">Biografie</Label>
                <Textarea
                  id="bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Spune-ne câteva cuvinte despre tine..."
                  rows={4}
                />
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-end">
            <Button
              onClick={handleSaveProfile}
              disabled={saving}
              className="bg-accent hover:bg-accent/90 text-accent-foreground"
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Se salvează...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Salvează modificările
                </>
              )}
            </Button>
          </CardFooter>
        </Card>

        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-destructive">Zona de pericol</CardTitle>
              <CardDescription>
                Odată ce contul tău este șters, toate resursele și datele asociate vor fi șterse permanent. Această
                acțiune nu poate fi anulată.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DeleteAccount />
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  )
}
