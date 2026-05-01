"use client"

import type React from "react"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { ThemeToggle } from "@/components/theme-toggle"
import { UserNav } from "@/components/user-nav"
import { createClient } from "@/lib/supabase/client"
import type { User } from "@supabase/supabase-js"
import { Menu, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"
import { LogoSvg } from "@/components/logo-svg"
import { Footer } from "@/components/footer"

const navigation = [
  { name: "Dashboard", href: "/dashboard" },
  { name: "Lecții", href: "/lectii" },
  { name: "Agenda", href: "/agenda" },
  { name: "To Do", href: "/todo" },
  { name: "Progres", href: "/progres" },
  { name: "Unelte", href: "/unelte" },
]

function Header({ hideNavigation }: { hideNavigation?: boolean }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function getUser() {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser()

      if (!error && user) {
        setUser(user)
      }
      setLoading(false)
    }

    getUser()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null)
    })

    return () => subscription.unsubscribe()
  }, [supabase.auth])

  // Only show navigation if user is authenticated and hideNavigation is false
  const showNavigation = user && !hideNavigation

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center">
        <div className="mr-4 flex">
          <Link href={user ? "/dashboard" : "/"} className="flex items-center space-x-2">
            <div className="h-8 w-8 bg-primary rounded-sm flex items-center justify-center">
              <LogoSvg className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-xl hidden md:inline-block">NeuroLearn</span>
          </Link>
        </div>

        {/* Mobile menu button - only show if authenticated */}
        {showNavigation && (
          <div className="flex md:hidden flex-1 justify-end">
            <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>
          </div>
        )}

        {/* Desktop navigation - only show if authenticated */}
        {showNavigation && (
          <nav className="hidden md:flex flex-1 items-center space-x-4 px-4">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`text-sm font-medium transition-colors hover:text-accent relative group ${
                  pathname === item.href ? "text-accent" : "text-muted-foreground"
                }`}
              >
                {item.name}
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-accent transition-all group-hover:w-full"></span>
              </Link>
            ))}
          </nav>
        )}

        <div className="flex items-center space-x-4 ml-auto">
          <ThemeToggle />
          {!loading &&
            (user ? (
              <UserNav user={user} />
            ) : (
              <motion.div whileTap={{ scale: 0.95 }}>
                <Link href="/login">
                  <Button className="bg-accent hover:bg-accent/90 text-accent-foreground transition-all">
                    Conectare
                  </Button>
                </Link>
              </motion.div>
            ))}
        </div>
      </div>

      {/* Mobile navigation - only show if authenticated */}
      {showNavigation && mobileMenuOpen && (
        <div className="md:hidden">
          <div className="space-y-1 px-4 pb-3 pt-2">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`block rounded-md px-3 py-2 text-base font-medium transition-all ${
                  pathname === item.href
                    ? "bg-accent/10 text-accent"
                    : "text-muted-foreground hover:bg-accent/10 hover:text-accent"
                }`}
                onClick={() => setMobileMenuOpen(false)}
              >
                {item.name}
              </Link>
            ))}
          </div>
        </div>
      )}
    </header>
  )
}

interface LayoutProps {
  children: React.ReactNode
  hideNavigation?: boolean
}

export default function Layout({ children, hideNavigation }: LayoutProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header hideNavigation={hideNavigation} />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  )
}
