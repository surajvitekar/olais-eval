"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { motion, useScroll, useTransform } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Brain,
  Code,
  Zap,
  Shield,
  BarChart3,
  Users,
  ArrowRight,
  ChevronDown,
  Sparkles,
  Terminal,
  FileCode,
  Clock,
  Award,
  CheckCircle2,
  Globe,
  ExternalLink,
} from "lucide-react"

const fadeInUp = {
  hidden: { opacity: 0, y: 40 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay: i * 0.12, ease: [0.25, 0.4, 0.25, 1] as [number, number, number, number] },
  }),
}

const staggerContainer = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.12 },
  },
}

const features = [
  {
    icon: Brain,
    title: "AI-Assisted Evaluation",
    description:
      "We evaluate how candidates use AI tools — not whether they can code without them. Modern engineering is AI-augmented.",
    gradient: "from-emerald-500/20 to-teal-500/10",
  },
  {
    icon: Code,
    title: "Real-World Problems",
    description:
      "No algorithm puzzles. Candidates build real applications with real requirements, constraints, and deployment targets.",
    gradient: "from-blue-500/20 to-cyan-500/10",
  },
  {
    icon: Zap,
    title: "Skill-Based Matching",
    description:
      "Adaptive assessment identifies each candidate's strengths and assigns problems that match their skill profile.",
    gradient: "from-amber-500/20 to-orange-500/10",
  },
  {
    icon: Shield,
    title: "Integrity First",
    description:
      "Built-in timers, AI usage declarations, and architecture notes ensure authentic evaluation of candidate capabilities.",
    gradient: "from-violet-500/20 to-purple-500/10",
  },
  {
    icon: BarChart3,
    title: "Multi-Dimension Scoring",
    description:
      "8 evaluation dimensions — execution, architecture, thought process, AI usage, deployment, and more. Holistic scoring.",
    gradient: "from-rose-500/20 to-pink-500/10",
  },
  {
    icon: Users,
    title: "Cycle-Based Campaigns",
    description:
      "Run evaluation cycles with up to 50 candidates. Track progress, compare results, and select the best engineers.",
    gradient: "from-indigo-500/20 to-blue-500/10",
  },
]

const howItWorks = [
  {
    step: 1,
    title: "Receive Invite",
    description: "Get your unique invite code via email. No open registration — every candidate is vetted.",
    icon: MailIcon,
  },
  {
    step: 2,
    title: "Skill Assessment",
    description: "Complete a 10-minute adaptive assessment across 10 categories. We build your skill profile.",
    icon: Brain,
  },
  {
    step: 3,
    title: "Solve Problems",
    description: "Receive 2 problems matched to your strengths. Build, deploy, and submit with AI usage declared.",
    icon: FileCode,
  },
  {
    step: 4,
    title: "Get Evaluated",
    description: "Our expert evaluators score your work across 8 dimensions. Results update on the leaderboard.",
    icon: Award,
  },
]

const stats = [
  { value: "10+", label: "Skill Categories", icon: BarChart3 },
  { value: "8", label: "Evaluation Dimensions", icon: CheckCircle2 },
  { value: "50", label: "Candidates per Cycle", icon: Users },
  { value: "2x", label: "Better Candidate Insight", icon: Zap },
]

function MailIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect width="20" height="16" x="2" y="4" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  )
}

function LandingContent() {
  const router = useRouter()
  const [inviteCode, setInviteCode] = useState("")
  const { scrollYProgress } = useScroll()
  const heroScale = useTransform(scrollYProgress, [0, 0.3], [1, 0.95])
  const heroOpacity = useTransform(scrollYProgress, [0, 0.3], [1, 0.6])

  const handleInviteSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (inviteCode.trim()) {
      router.push(`/register?code=${encodeURIComponent(inviteCode.trim())}`)
    }
  }

  return (
    <div className="flex flex-col">
      {/* ─── Hero Section ────────────────────────────────────────────── */}
      <motion.section
        style={{ scale: heroScale, opacity: heroOpacity }}
        className="relative min-h-[90vh] flex items-center justify-center overflow-hidden"
      >
        {/* Background Effects */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(16,185,129,0.08),transparent_70%)]" />
        <div className="absolute inset-0 bg-grid-pattern opacity-[0.03]" />

        {/* Scan Line Overlay */}
        <div className="absolute inset-0 scan-line pointer-events-none" />

        <div className="relative z-10 container mx-auto px-4 text-center max-w-5xl">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-1.5 text-sm text-emerald-400 mb-8"
          >
            <Sparkles className="h-4 w-4" />
            <span>AI-Assisted Engineering Evaluation Platform</span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15 }}
            className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight mb-6"
          >
            <span className="text-foreground">This is not</span>
            <br />
            <span className="bg-gradient-to-r from-emerald-400 via-green-400 to-teal-400 bg-clip-text text-transparent">
              LeetCode
            </span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            We evaluate how engineers use AI in the real world.
            <br />
            <span className="text-foreground/80">
              Skill-adaptive problems, multi-dimension scoring, and AI-augmented assessment.
            </span>
          </motion.p>

          {/* CTA: Invite Code Input */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.45 }}
            className="max-w-md mx-auto"
          >
            <form onSubmit={handleInviteSubmit} className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  type="text"
                  placeholder="Enter your invite code..."
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  className="h-12 pl-4 pr-4 bg-background/80 border-emerald-500/30 focus:border-emerald-500/60 focus:ring-emerald-500/20 text-base"
                />
                <div className="absolute inset-0 rounded-lg ring-1 ring-emerald-500/10 pointer-events-none" />
              </div>
              <Button
                type="submit"
                size="lg"
                disabled={!inviteCode.trim()}
                className="h-12 px-6 bg-emerald-600 hover:bg-emerald-500 text-white font-medium gap-2 group"
              >
                Start
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Button>
            </form>
            <p className="text-xs text-muted-foreground mt-3">
              Have an invite? Enter your code above. No account yet?{" "}
              <Link href="/register" className="text-emerald-400 hover:text-emerald-300 underline underline-offset-2">
                Register here
              </Link>
            </p>
          </motion.div>

          {/* Scroll Indicator */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
            className="absolute bottom-8 left-1/2 -translate-x-1/2"
          >
            <motion.div
              animate={{ y: [0, 8, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="text-muted-foreground/40"
            >
              <ChevronDown className="h-6 w-6" />
            </motion.div>
          </motion.div>
        </div>
      </motion.section>

      {/* ─── Stats Bar ───────────────────────────────────────────────── */}
      <motion.section
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, margin: "-100px" }}
        className="border-y border-border/40 bg-card/50"
      >
        <div className="container mx-auto max-w-6xl px-4 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, i) => {
              const Icon = stat.icon
              return (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.1 }}
                  className="text-center"
                >
                  <Icon className="h-5 w-5 mx-auto mb-3 text-emerald-400/60" />
                  <div className="text-3xl font-bold text-foreground mb-1 font-mono">{stat.value}</div>
                  <div className="text-sm text-muted-foreground">{stat.label}</div>
                </motion.div>
              )
            })}
          </div>
        </div>
      </motion.section>

      {/* ─── Features Grid ───────────────────────────────────────────── */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        className="py-24 relative"
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(16,185,129,0.03),transparent_70%)]" />
        <div className="container mx-auto max-w-6xl px-4 relative z-10">
          <motion.div variants={fadeInUp} className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Built for{" "}
              <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                modern engineering
              </span>{" "}
              evaluation
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
              Stop testing memorization. Start evaluating how engineers actually build software today.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, i) => {
              const Icon = feature.icon
              return (
                <motion.div
                  key={feature.title}
                  variants={fadeInUp}
                  custom={i}
                  className="group relative rounded-xl border border-border/50 bg-card/30 p-6 transition-all duration-300 hover:border-emerald-500/30 hover:bg-card/60 hover:shadow-[0_0_30px_rgba(16,185,129,0.06)]"
                >
                  {/* Gradient background */}
                  <div
                    className={`absolute inset-0 rounded-xl bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`}
                  />

                  <div className="relative z-10">
                    <div className="h-10 w-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-4 group-hover:border-emerald-500/40 transition-colors">
                      <Icon className="h-5 w-5 text-emerald-400" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2 text-foreground">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
                  </div>

                  {/* Terminal-style corner accents */}
                  <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-[10px] text-emerald-500/40 font-mono">✦</span>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>
      </motion.section>

      {/* ─── How It Works ────────────────────────────────────────────── */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        className="py-24 border-t border-border/40 bg-card/20"
      >
        <div className="container mx-auto max-w-5xl px-4">
          <motion.div variants={fadeInUp} className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              How it{" "}
              <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">works</span>
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              From invite to evaluation in four straightforward steps.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-4 gap-8 relative">
            {/* Connector line */}
            <div className="hidden md:block absolute top-12 left-[12.5%] right-[12.5%] h-px bg-gradient-to-r from-emerald-500/40 via-emerald-500/20 to-transparent" />

            {howItWorks.map((item, i) => {
              const Icon = item.icon
              return (
                <motion.div
                  key={item.step}
                  variants={fadeInUp}
                  custom={i}
                  className="relative text-center"
                >
                  {/* Step number */}
                  <div className="relative mx-auto mb-6">
                    <div className="h-14 w-14 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto relative z-10">
                      <Icon className="h-6 w-6 text-emerald-400" />
                    </div>
                    <div className="absolute inset-0 rounded-full bg-emerald-500/5 blur-xl" />
                  </div>

                  <div className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-emerald-500/20 text-xs font-mono text-emerald-400 mb-3">
                    {item.step}
                  </div>

                  <h3 className="text-lg font-semibold mb-2">{item.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
                </motion.div>
              )
            })}
          </div>
        </div>
      </motion.section>

      {/* ─── CTA Section ─────────────────────────────────────────────── */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        className="py-24 relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(16,185,129,0.06),transparent_70%)]" />
        <div className="container mx-auto max-w-4xl px-4 text-center relative z-10">
          <motion.div variants={fadeInUp}>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-1.5 text-sm text-emerald-400 mb-6">
              <Terminal className="h-4 w-4" />
              <span>$ eval --candidates</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Ready to evaluate{" "}
              <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                differently
              </span>
              ?
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto mb-8 text-lg">
              Join the next evaluation cycle. Get better candidates, clearer insights, and fairer assessments.
            </p>
            <div className="flex items-center justify-center gap-4 flex-wrap">
              <Link href="/register">
                <Button size="lg" className="h-12 px-8 bg-emerald-600 hover:bg-emerald-500 text-white gap-2 group">
                  Register with Invite
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Button>
              </Link>
              <Link href="/leaderboard">
                <Button
                  variant="outline"
                  size="lg"
                  className="h-12 px-8 border-emerald-500/30 hover:border-emerald-500/60 gap-2"
                >
                  View Leaderboard
                  <BarChart3 className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </motion.section>

      {/* ─── Footer ──────────────────────────────────────────────────── */}
      <footer className="border-t border-border/40 bg-card/30 py-8">
        <div className="container mx-auto max-w-6xl px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Terminal className="h-4 w-4 text-emerald-400" />
              <span className="font-mono text-sm text-muted-foreground">
                <span className="text-emerald-400">olais</span>
                <span className="text-foreground/60">.eval</span>
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              &copy; {new Date().getFullYear()} Olais.in — AI-Assisted Engineering Evaluation
            </p>
            <div className="flex items-center gap-4">
              <a
                href="https://github.com/surajvitekar/olais-eval"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
              <a
                href="https://olais.in"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                olais.in
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default function LandingPage() {
  return <LandingContent />
}
