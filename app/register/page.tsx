"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { motion } from "framer-motion"

import { createClient } from "@/lib/supabase/client"
import { useLoading } from "@/components/loading-provider"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import Layout from "@/components/layout"

export default function Register() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [userType, setUserType] = useState("student")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const router = useRouter()
  const supabase = createClient()
  const { setIsLoading } = useLoading()

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setIsLoading(true)

    try {
      // Validare
      if (!firstName.trim() || !lastName.trim()) {
        setError("Numele și prenumele sunt obligatorii.")
        setLoading(false)
        setIsLoading(false)
        return
      }

      if (password.length < 6) {
        setError("Parola trebuie să aibă cel puțin 6 caractere.")
        setLoading(false)
        setIsLoading(false)
        return
      }

      const fullName = `${firstName.trim()} ${lastName.trim()}`

      const {
        data: { user },
        error: signUpError,
      } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            full_name: fullName,
            user_type: userType,
          },
        },
      })

      if (signUpError) {
        console.error("Signup error:", signUpError)
        setError(signUpError.message)
      } else if (user) {
        // Prevent creating dummy profiles when Supabase returns a fake user due to email enumeration protection
        if (user.identities && user.identities.length === 0) {
          setError("Această adresă de email este deja înregistrată. Vă rugăm să vă conectați.")
          setLoading(false)
          setIsLoading(false)
          return
        }

        // The profile is automatically created by the Supabase database trigger 'handle_new_user'
        // Since email confirmation is disabled, redirect directly to dashboard
        router.push("/dashboard")
      }
    } catch (error) {
      console.error("Registration error:", error)
      setError("A apărut o eroare neașteptată. Vă rugăm să încercați din nou.")
    } finally {
      setLoading(false)
      setIsLoading(false)
    }
  }

  return (
    <Layout hideNavigation={true}>
      <div className="container flex items-center justify-center min-h-[calc(100vh-4rem)] py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <Card className="border-2 dark:border-zinc-800">
              <CardHeader>
                <CardTitle className="text-2xl">Înregistrare</CardTitle>
                <CardDescription>Creați un cont nou pentru a începe călătoria de învățare.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSignUp} className="space-y-4">
                  {error && (
                    <Alert variant="destructive">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="userType">Tip utilizator</Label>
                    <RadioGroup
                      id="userType"
                      value={userType}
                      onValueChange={setUserType}
                      className="flex flex-col space-y-1"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="student" id="student" />
                        <Label htmlFor="student" className="cursor-pointer">
                          Student
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="teacher" id="teacher" />
                        <Label htmlFor="teacher" className="cursor-pointer">
                          Profesor
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">Prenume *</Label>
                      <Input
                        id="firstName"
                        placeholder="Ion"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        required
                        className="border-2 focus:border-accent"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Nume *</Label>
                      <Input
                        id="lastName"
                        placeholder="Popescu"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        required
                        className="border-2 focus:border-accent"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="nume@exemplu.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="border-2 focus:border-accent"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Parolă * (min. 6 caractere)</Label>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                      className="border-2 focus:border-accent"
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
                    disabled={loading}
                  >
                    {loading ? "Se înregistrează..." : "Înregistrare"}
                  </Button>
                </form>
              </CardContent>
              <CardFooter className="flex flex-col items-center">
                <div className="text-sm text-muted-foreground">
                  Ai deja un cont?{" "}
                  <Link href="/login" className="text-accent hover:underline">
                    Conectează-te
                  </Link>
                </div>
              </CardFooter>
          </Card>
        </motion.div>
      </div>
    </Layout>
  )
}
