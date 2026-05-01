import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Do not run code between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  // IMPORTANT: If you remove getUser() and you use server-side rendering
  // with the Supabase client, your users may be randomly logged out.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // --- Custom route protection logic ---

  if (!user) {
    // If the user is not signed in and the current path is not / or doesn't start with /login or /register
    if (
      request.nextUrl.pathname !== "/" &&
      !request.nextUrl.pathname.startsWith("/login") &&
      !request.nextUrl.pathname.startsWith("/register")
    ) {
      const url = request.nextUrl.clone()
      url.pathname = "/login"
      return NextResponse.redirect(url)
    }
  } else {
    // If user is signed in and the current path is /login or /register
    if (request.nextUrl.pathname.startsWith("/login") || request.nextUrl.pathname.startsWith("/register")) {
      return NextResponse.redirect(new URL("/dashboard", request.url))
    }

    // Skip quiz check for API routes and the quiz page itself
    if (request.nextUrl.pathname.startsWith("/api/") || request.nextUrl.pathname === "/quiz") {
      return supabaseResponse
    }

    // Only redirect to quiz if email is confirmed and learning_style is null
    if (user.email_confirmed_at) {
      try {
        const { data: profile, error } = await supabase
          .from("profiles")
          .select("learning_style")
          .eq("id", user.id)
          .single()

        // If there's no profile or learning_style is null/empty, redirect to quiz
        if (error || !profile || profile.learning_style === null) {
          // Only redirect if not already on the quiz page
          if (request.nextUrl.pathname !== "/quiz") {
            return NextResponse.redirect(new URL("/quiz", request.url))
          }
        }
      } catch (error) {
        console.error("Error checking profile:", error)
      }
    }
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is.
  // If you're creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Change the myNewResponse object to fit your needs, but avoid changing
  //    the cookies!
  // 4. Finally:
  //    return myNewResponse
  // If this is not done, you may be causing the browser and server to go out
  // of sync and terminate the user's session prematurely!

  return supabaseResponse
}
