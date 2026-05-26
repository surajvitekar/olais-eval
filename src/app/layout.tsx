import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import Providers from "./providers"
import Navbar from "@/components/shared/Navbar"
import Footer from "@/components/shared/Footer"
import PageTransition from "@/components/shared/PageTransition"

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: {
    default: "Olais Eval — AI-Assisted Candidate Evaluation",
    template: "%s | Olais Eval",
  },
  description:
    "AI-assisted engineering candidate evaluation platform. Skill-adaptive assessments, real-world problems, and multi-dimension scoring.",
  keywords: [
    "candidate evaluation",
    "engineering assessment",
    "AI-assisted",
    "skill assessment",
    "coding interview",
    "developer hiring",
    "technical assessment",
  ],
  authors: [{ name: "Olais Team" }],
  openGraph: {
    title: "Olais Eval — AI-Assisted Candidate Evaluation",
    description:
      "Evaluate how engineers use AI in the real world. Not LeetCode — real problems, real skills.",
    url: "https://eval.olais.in",
    siteName: "Olais Eval",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Olais Eval — AI-Assisted Candidate Evaluation",
    description:
      "Evaluate how engineers use AI in the real world. Not LeetCode — real problems, real skills.",
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} dark h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground font-sans">
        <Providers>
          <Navbar />
          <PageTransition>{children}</PageTransition>
          <Footer />
        </Providers>
      </body>
    </html>
  )
}
