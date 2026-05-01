import Link from "next/link"
import { Mail, Code, Camera } from "lucide-react"
import { GoogleTranslateWidget } from "./google-translate-widget"

export function Footer() {
  return (
    <footer className="border-t py-6 md:py-0">
      <div className="container flex flex-col items-center justify-between gap-4 md:h-16 md:flex-row">
        <p className="text-center text-sm leading-loose text-muted-foreground md:text-left">
          An open source project made with ♥ and Next.js by{" "}
          <Link
            href="https://gitlab.com/danielpos178"
            className="font-medium underline underline-offset-4 hover:text-primary"
            target="_blank"
            rel="noopener noreferrer"
          >
            @danielpos178
          </Link>
        </p>
        <div className="flex items-center gap-4">
          <GoogleTranslateWidget />

          <Link
            href="https://github.com/Daniel1788/neurolearn"
            className="text-muted-foreground hover:text-foreground transition-colors"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Code className="h-4 w-4" />
            <span className="sr-only">GitHub</span>
          </Link>

          <Link
            href="https://instagram.com/neurolearn"
            className="text-muted-foreground hover:text-foreground transition-colors"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Camera className="h-4 w-4" />
            <span className="sr-only">Instagram</span>
          </Link>

          <Link
            href="mailto:contact@neurolearn.ro"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <Mail className="h-4 w-4" />
            <span className="sr-only">Email</span>
          </Link>

          <Link href="/termeni" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Termeni și condiții
          </Link>

          <Link href="/documentatie" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Documentație tehnică
          </Link>
        </div>
      </div>
    </footer>
  )
}
