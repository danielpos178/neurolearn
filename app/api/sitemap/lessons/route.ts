import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const supabase = await createClient()

    // Obținem toate lecțiile
    const { data: lessons } = await supabase
      .from("lessons")
      .select("id, title, updated_at")
      .order("created_at", { ascending: false })

    if (!lessons) {
      return NextResponse.json({ error: "Nu s-au putut obține lecțiile" }, { status: 500 })
    }

    // Generăm sitemap XML
    const baseUrl = process.env.SITE_URL || "https://neuro-learn.vercel.app"

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
    <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
      ${lessons
        .map(
          (lesson) => `
        <url>
          <loc>${baseUrl}/lectii/${lesson.id}</loc>
          <lastmod>${new Date(lesson.updated_at || new Date()).toISOString()}</lastmod>
          <changefreq>weekly</changefreq>
          <priority>0.7</priority>
        </url>
      `,
        )
        .join("")}
    </urlset>`

    return new NextResponse(xml, {
      headers: {
        "Content-Type": "application/xml",
      },
    })
  } catch (error) {
    console.error("Error generating sitemap:", error)
    return NextResponse.json({ error: "Eroare la generarea sitemap-ului" }, { status: 500 })
  }
}
