"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, Lock } from "lucide-react"

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function checkAuth() {
      const { data } = await supabase.auth.getUser()
      if (!data.user) {
        setIsAuthenticated(false)
      } else {
        setIsAuthenticated(true)
      }
    }

    checkAuth()
  }, [supabase.auth])

  if (isAuthenticated === null) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (isAuthenticated === false) {
    return (
      <div className="container flex items-center justify-center min-h-[80vh]">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-accent/10 flex items-center justify-center">
              <Lock className="h-6 w-6 text-accent" />
            </div>
            <CardTitle className="text-2xl">Acces restricționat</CardTitle>
            <CardDescription>Trebuie să fiți conectat pentru a accesa această pagină.</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground">Vă rugăm să vă conectați sau să vă înregistrați pentru a continua.</p>
          </CardContent>
          <CardFooter className="flex justify-center">
            <Button
              onClick={() => router.push("/login")}
              className="bg-accent hover:bg-accent/90 text-accent-foreground"
            >
              Conectare
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  return <>{children}</>
}
