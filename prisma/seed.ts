import { PrismaClient } from "../src/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

const assessmentQuestions = [
  // ─── FRONTEND ──────────────────────────────────────────────────────────────
  {
    category: "FRONTEND",
    questionType: "SELF_RATING",
    questionText: "Rate your frontend development skills (React, components, state management)",
    options: { min: 1, max: 10, labels: { low: "Beginner", high: "Expert" } },
    weight: 1.0,
    displayOrder: 1,
  },
  {
    category: "FRONTEND",
    questionType: "MULTIPLE_CHOICE",
    questionText: "Which state management approach do you prefer for complex React apps?",
    options: {
      choices: [
        "React Context + useReducer",
        "Redux / Redux Toolkit",
        "Zustand",
        "Jotai / Recoil",
        "TanStack Query + local state",
      ],
    },
    weight: 2.0,
    displayOrder: 2,
  },
  {
    category: "FRONTEND",
    questionType: "EXPERIENCE",
    questionText: "How many production React applications have you built?",
    options: { levels: ["0", "1-2", "3-5", "6-10", "10+"] },
    weight: 3.0,
    displayOrder: 3,
  },

  // ─── BACKEND ───────────────────────────────────────────────────────────────
  {
    category: "BACKEND",
    questionType: "SELF_RATING",
    questionText: "Rate your backend development skills (APIs, server logic, authentication)",
    options: { min: 1, max: 10, labels: { low: "Beginner", high: "Expert" } },
    weight: 1.0,
    displayOrder: 4,
  },
  {
    category: "BACKEND",
    questionType: "MULTIPLE_CHOICE",
    questionText: "Which backend framework are you most experienced with?",
    options: {
      choices: [
        "Node.js / Express",
        "Next.js API Routes",
        "Python / FastAPI",
        "Go / Gin",
        "Java / Spring Boot",
      ],
    },
    weight: 2.0,
    displayOrder: 5,
  },
  {
    category: "BACKEND",
    questionType: "PROJECT_FAMILIARITY",
    questionText: "Have you built a REST API with authentication, rate limiting, and database integration?",
    options: { values: ["yes", "no", "maybe"] },
    weight: 2.0,
    displayOrder: 6,
  },

  // ─── PYTHON ────────────────────────────────────────────────────────────────
  {
    category: "PYTHON",
    questionType: "SELF_RATING",
    questionText: "Rate your Python programming skills",
    options: { min: 1, max: 10, labels: { low: "Beginner", high: "Expert" } },
    weight: 1.0,
    displayOrder: 7,
  },
  {
    category: "PYTHON",
    questionType: "EXPERIENCE",
    questionText: "How many Python projects have you completed end-to-end?",
    options: { levels: ["0", "1-3", "4-7", "8-15", "15+"] },
    weight: 3.0,
    displayOrder: 8,
  },

  // ─── AI/ML ─────────────────────────────────────────────────────────────────
  {
    category: "AI_ML",
    questionType: "AI_USAGE",
    questionText: "Which AI/ML tools have you used in your development workflow?",
    options: {
      tools: [
        "OpenAI / GPT APIs",
        "LangChain / LlamaIndex",
        "Hugging Face Transformers",
        "TensorFlow / PyTorch",
        "Claude / Anthropic API",
        "Local LLMs (Ollama, llama.cpp)",
        "RAG pipelines",
        "Vector databases (Pinecone, Weaviate, Qdrant)",
      ],
    },
    weight: 1.5,
    displayOrder: 9,
  },
  {
    category: "AI_ML",
    questionType: "SELF_RATING",
    questionText: "Rate your experience integrating AI/ML APIs into applications",
    options: { min: 1, max: 10, labels: { low: "No experience", high: "Expert" } },
    weight: 1.0,
    displayOrder: 10,
  },

  // ─── API ───────────────────────────────────────────────────────────────────
  {
    category: "API",
    questionType: "SELF_RATING",
    questionText: "Rate your API design and development skills",
    options: { min: 1, max: 10, labels: { low: "Beginner", high: "Expert" } },
    weight: 1.0,
    displayOrder: 11,
  },
  {
    category: "API",
    questionType: "MULTIPLE_CHOICE",
    questionText: "What's your preferred API architecture pattern?",
    options: {
      choices: [
        "RESTful",
        "GraphQL",
        "tRPC",
        "WebSockets",
        "gRPC",
      ],
    },
    weight: 2.0,
    displayOrder: 12,
  },
  {
    category: "API",
    questionType: "PROJECT_FAMILIARITY",
    questionText: "Have you designed and documented APIs that were consumed by external teams?",
    options: { values: ["yes", "no", "maybe"] },
    weight: 2.0,
    displayOrder: 13,
  },

  // ─── DATABASE ──────────────────────────────────────────────────────────────
  {
    category: "DATABASE",
    questionType: "EXPERIENCE",
    questionText: "Which databases have you used in production?",
    options: {
      choices: [
        "PostgreSQL",
        "MySQL",
        "MongoDB",
        "SQLite",
        "Redis",
        "Supabase",
        "PlanetScale / Vitess",
      ],
    },
    weight: 3.0,
    displayOrder: 14,
  },
  {
    category: "DATABASE",
    questionType: "SELF_RATING",
    questionText: "Rate your SQL and database design skills",
    options: { min: 1, max: 10, labels: { low: "Beginner", high: "Expert" } },
    weight: 1.0,
    displayOrder: 15,
  },
  {
    category: "DATABASE",
    questionType: "PROJECT_FAMILIARITY",
    questionText: "Have you designed database schemas with migrations and indexing strategies?",
    options: { values: ["yes", "no", "maybe"] },
    weight: 2.0,
    displayOrder: 16,
  },

  // ─── DEVOPS ────────────────────────────────────────────────────────────────
  {
    category: "DEVOPS",
    questionType: "SELF_RATING",
    questionText: "Rate your DevOps and deployment skills",
    options: { min: 1, max: 10, labels: { low: "Beginner", high: "Expert" } },
    weight: 1.0,
    displayOrder: 17,
  },
  {
    category: "DEVOPS",
    questionType: "AI_USAGE",
    questionText: "Which deployment platforms have you used?",
    options: {
      tools: [
        "Vercel",
        "Netlify",
        "AWS (EC2 / ECS / Lambda)",
        "Google Cloud Run",
        "Railway / Render",
        "Docker / Docker Compose",
        "Kubernetes",
        "GitHub Actions / CI/CD",
      ],
    },
    weight: 1.5,
    displayOrder: 18,
  },

  // ─── SYSTEM DESIGN ─────────────────────────────────────────────────────────
  {
    category: "SYSTEM_DESIGN",
    questionType: "SELF_RATING",
    questionText: "Rate your system design and architecture skills",
    options: { min: 1, max: 10, labels: { low: "Beginner", high: "Expert" } },
    weight: 1.0,
    displayOrder: 19,
  },
  {
    category: "SYSTEM_DESIGN",
    questionType: "MULTIPLE_CHOICE",
    questionText: "What's your approach to handling scale in web applications?",
    options: {
      choices: [
        "Vertical scaling (bigger servers)",
        "Horizontal scaling + load balancers",
        "Microservices architecture",
        "Serverless / edge functions",
        "Caching + CDN + database optimization",
      ],
    },
    weight: 2.0,
    displayOrder: 20,
  },
]

const problemTemplates = [
  // ─── MULTIPLAYER PICTIONARY ──────────────────────────────────────────────────
  {
    title: "Multiplayer Pictionary",
    slug: "multiplayer-pictionary",
    category: "frontend",
    difficulty: 4,
    overview: `Build a real-time multiplayer Pictionary game where players take turns drawing a word while others guess it. The game should feature real-time canvas drawing via WebSocket, turn-based rounds with a timer, a word bank with varying difficulty, and a scoring system.

Players join or create rooms with shareable codes. The drawer sees the secret word and draws on a canvas streamed to all guessers in real-time. Guessers type their guesses in a chat panel — correct guesses earn points. Include emoji reactions for hype, a spectator mode for late joiners, and an end-of-game leaderboard with animated reveals.

Think about the drawing tools (brush sizes, colors, undo/clear), word selection fairness (each player gets turns), and anti-cheat (no pixel-text drawing). The UI should feel like a party game — playful colors, sound effects, and smooth animations.`,
    requirements: [
      "Real-time canvas drawing synced to all players via WebSocket",
      "Room system with join codes and public/private lobbies",
      "Turn-based gameplay with configurable round timer",
      "Word bank with difficulty tiers (easy, medium, hard) and category filters",
      "Chat-based guessing system with real-time submission",
      "Score tracking with per-round and cumulative scores",
      "Drawing tools: brush sizes, color palette, undo, clear, eraser",
      "End-of-game results screen with animated winner reveal and stats",
    ],
    constraints: [
      "Handle 2-8 players per room simultaneously",
      "Canvas sync latency under 200ms for smooth drawing experience",
      "Word bank must contain at least 100 words across categories",
      "No pixel-text or letter hints allowed in drawings (anti-cheat)",
    ],
    bonusFeatures: [
      "Emoji reactions and quick-chat during rounds",
      "Spectator mode for viewing ongoing games without playing",
      "Custom word packs created by players",
    ],
    deliverables: [
      "Git repository with full source code",
      "Live deployment URL",
      "ARCHITECTURE.md with WebSocket sync and game state management explanation",
      "AI declaration and prompts/ folder",
    ],
    evaluationCriteria: [
      "Real-time drawing sync quality and latency",
      "Game logic correctness (turn rotation, scoring, timer)",
      "UI/UX polish — playful, responsive, animated",
      "Drawing tool completeness and usability",
      "Chat and guess matching performance",
      "Code organization and real-time architecture",
    ],
    variantGroup: "games-pictionary",
  },
  // ─── GITHUB WRAPPED ─────────────────────────────────────────────────────────
  {
    title: "GitHub Wrapped",
    slug: "github-wrapped",
    category: "frontend",
    difficulty: 3,
    overview: `Create an animated, shareable \"year in code\" page for any GitHub username. Enter a username and watch as the app generates a beautiful, scrollable visual story of their GitHub year — languages used, commit heatmap, peak coding hours, most productive days, longest streaks, top repositories, and contributor network graph.

The experience should feel like Spotify Wrapped — animated transitions between \"slides\", celebratory confetti, personalized insights (\"You're a night owl! 73% of your commits happen after midnight\"), and a shareable link they can post on social media.

Data comes from the GitHub API (public repos/events). Cache aggressively to avoid rate limits. The shareable page should be an SSR-rendered snapshot with Open Graph preview.`,
    requirements: [
      "Enter a GitHub username to generate a personalized year-in-code page",
      "Animated slide-based experience with scroll or click navigation",
      "Language breakdown with percentage bars and color coding",
      "Commit heatmap (GitHub-style calendar grid) showing daily activity",
      "Peak coding hours chart showing time-of-day commit distribution",
      "Top repositories section with star counts and commit activity",
      "Shareable link with Open Graph preview image",
      "Aggressive caching strategy to handle GitHub API rate limits",
    ],
    constraints: [
      "Must work with public GitHub data only (no auth required)",
      "Handle users with 1,000+ repositories and 10,000+ commits",
      "GitHub API calls must be cached for minimum 5 minutes",
      "Page must load in under 3 seconds for cached profiles",
    ],
    bonusFeatures: [
      "Download your wrapped as an image or video",
      "Compare two GitHub profiles side-by-side",
      "GitHub README badge showing wrapped stats",
    ],
    deliverables: [
      "Git repository with full source code",
      "Live deployment URL",
      "ARCHITECTURE.md with data fetching and caching strategy",
      "AI declaration and prompts/ folder",
    ],
    evaluationCriteria: [
      "Visual storytelling quality and animation polish",
      "Data accuracy and insight uniqueness",
      "Performance and cache optimization",
      "Shareable page implementation with OG preview",
      "Error handling for invalid/private profiles",
      "Code architecture and readability",
    ],
    variantGroup: "frontend-wrapped",
  },
  // ─── LIVE POLL BATTLE ───────────────────────────────────────────────────────
  {
    title: "Live Poll Battle",
    slug: "live-poll-battle",
    category: "full-stack",
    difficulty: 3,
    overview: `Build a live polling platform where anyone can create a poll, share it via QR code or link, and watch results animate in real-time. Think of it as a supercharged, gamified alternative to Mentimeter or Slido — perfect for classrooms, conferences, or party games.

Users create polls with multiple choice options, set a timer, and launch. Voters scan a QR code or open the link and vote. Results update in REAL TIME — bar charts grow, pie charts rotate, and when the timer hits zero, confetti explodes and the winner is revealed with a dramatic animation.

Include a \"Speaker View\" mode for presenters (large text, full-screen charts), mobile-first voting experience (no login required to vote), and poll analytics (response times, demographics via custom fields). Polls can be saved as templates.`,
    requirements: [
      "Poll creation with multiple choice options, image support, and timer",
      "Real-time results update using WebSockets or Server-Sent Events",
      "Animated chart components (bar, pie, donut) with smooth transitions",
      "QR code generation per poll for easy sharing",
      "Confetti/particle animation on poll reveal",
      "Speaker View: full-screen, large text, presenter-friendly display",
      "Mobile-first voting experience — no account required to vote",
      "Poll analytics: response timeline, voter count, completion rate",
    ],
    constraints: [
      "Support 500+ concurrent voters on a single poll",
      "Results must reflect new votes within 1 second",
      "Polls auto-expire and become read-only after timer ends",
      "One vote per device (fingerprint-based, no auth required)",
    ],
    bonusFeatures: [
      "Quiz mode with correct answers and scoring",
      "Word cloud visualization for open-ended responses",
      "Custom themes and branding for enterprise polls",
    ],
    deliverables: [
      "Git repository with full source code",
      "Live deployment URL",
      "ARCHITECTURE.md with real-time update approach",
      "AI declaration and prompts/ folder",
    ],
    evaluationCriteria: [
      "Real-time update performance and reliability",
      "Chart animation quality and data visualization",
      "Mobile voting UX and accessibility",
      "Speaker View quality and presenter features",
      "Poll creation flow and template system",
      "Code architecture and testing",
    ],
    variantGroup: "full-stack-polls",
  },
  // ─── COLLABORATIVE WHITEBOARD ───────────────────────────────────────────────
  {
    title: "Collaborative Whiteboard",
    slug: "collaborative-whiteboard",
    category: "full-stack",
    difficulty: 4,
    overview: `Build a real-time collaborative whiteboard where multiple users can draw, place sticky notes, add shapes, and write text simultaneously — like a Figma-lite for brainstorming. Every user's cursor is visible to others (cursor presence), and all changes sync instantly via WebSocket.

Users create boards, invite collaborators via shareable links, and start creating. The canvas supports infinite pan/zoom. Tools include: freehand pen (with pressure sensitivity simulation), shape tools (rectangle, circle, arrow, line), sticky notes (colored, resizable), text boxes, and an image uploader.

Focus on the user experience: smooth 60fps canvas rendering, intuitive tool selection, keyboard shortcuts, layer management, and a clean minimal UI. Boards auto-save and can be exported as PNG/PDF.`,
    requirements: [
      "Infinite canvas with smooth pan/zoom (transform matrix)",
      "Drawing tools: freehand pen, shapes, sticky notes, text, image upload",
      "Real-time sync of all canvas elements via WebSocket",
      "Cursor presence — see other users' cursors and selections in real-time",
      "Shareable board links with view/edit permissions",
      "Layer management with z-order controls",
      "Undo/redo history for the entire session per user",
      "Auto-save with reconnection recovery",
    ],
    constraints: [
      "Canvas must render at 60fps with 1000+ elements",
      "Support 10+ concurrent users on a single board",
      "Sync latency under 100ms for drawing operations",
      "Export must preserve vector quality (SVG-based export)",
    ],
    bonusFeatures: [
      "Template boards (brainstorming, wireframe, retro, mindmap)",
      "Comment threads attached to specific elements",
      "Dark mode and multiple canvas backgrounds (grid, dots, lined)",
    ],
    deliverables: [
      "Git repository with full source code",
      "Live deployment URL",
      "ARCHITECTURE.md with real-time sync and conflict resolution explanation",
      "AI declaration and prompts/ folder",
    ],
    evaluationCriteria: [
      "Canvas rendering performance and smoothness",
      "Real-time sync quality and conflict handling",
      "Drawing tool completeness and UX",
      "Cursor presence implementation",
      "Export quality and format support",
      "Code architecture and extensibility",
    ],
    variantGroup: "full-stack-collab-board",
  },
  // ─── SPOTIFY TASTE VISUALIZER ───────────────────────────────────────────────
  {
    title: "Spotify Taste Visualizer",
    slug: "spotify-taste-visualizer",
    category: "frontend",
    difficulty: 3,
    overview: `Build a beautiful interactive visualization tool where users enter an artist, genre, or song and see an animated exploration of music relationships. Create a \"mood wheel\" that plots artists on emotional axes (happy/sad, energetic/calm), a \"genre map\" that shows how genres connect and influence each other, and an \"audio feature radar\" chart that visualizes danceability, energy, acousticness, and more.

Use the Spotify Web API (with a demo/mock mode as fallback when API keys aren't available) to fetch artist data, audio features, and recommendations. The visualizations should be stunning — think D3.js or Three.js with smooth animations, glowing nodes, and interactive hover/tap for details.

Users can save their \"taste profile\" and generate an embeddable widget for their personal website or GitHub README.`,
    requirements: [
      "Search for artists, genres, or songs to generate visualizations",
      "Mood wheel: plot artists on emotional/energetic axes with clustering",
      "Genre map: interactive network graph showing genre relationships",
      "Audio feature radar chart (danceability, energy, acousticness, valence, etc.)",
      "Interactive nodes — hover/click for details, drag to explore",
      "Smooth animations, transitions, and visual effects (glow, pulse)",
      "Mock data fallback when Spotify API is unavailable",
      "Shareable taste profile with embeddable widget",
    ],
    constraints: [
      "Visualizations must work smoothly on mobile devices",
      "API calls must be debounced and cached",
      "Mock data must be realistic and diverse",
      "Page must render without WebGL fallback for Three.js features",
    ],
    bonusFeatures: [
      "Compare two artists/songs side-by-side",
      "Discover similar artists with preview clips",
      "Spotify login for personalized recommendations",
    ],
    deliverables: [
      "Git repository with full source code",
      "Live deployment URL",
      "ARCHITECTURE.md with visualization approach and API integration",
      "AI declaration and prompts/ folder",
    ],
    evaluationCriteria: [
      "Visualization quality and visual appeal",
      "Interactivity and exploration experience",
      "Data accuracy from Spotify API or mock quality",
      "Mobile responsiveness and performance",
      "Embeddable widget implementation",
      "Code architecture and data flow design",
    ],
    variantGroup: "frontend-visualizer",
  },
  // ─── WEB TERMINAL ───────────────────────────────────────────────────────────
  {
    title: "Web Terminal",
    slug: "web-terminal",
    category: "frontend",
    difficulty: 4,
    overview: `Build a fully functional browser-based terminal emulator that looks and feels like a real developer terminal. It should support custom commands, a virtual file system, multiple themes (matrix, hacker, light, dark), split panes, command history, and intelligent autocomplete.

The terminal should work entirely on the frontend (no backend needed for basic operation) with a virtual filesystem stored in memory. Users can run commands like ls, cd, cat, mkdir, touch, rm, grep, echo, and custom commands unique to your implementation. Add fun easter egg commands (cmatrix, star wars, fortune, cowsay-style).

Include a command parser with piped commands, redirects, and argument flags. Themes should be customizable. Split panes let users work in multiple terminals side-by-side. Command suggestion appears as they type (fuzzy find).`,
    requirements: [
      "Fully interactive terminal emulator with blinking cursor and ANSI colors",
      "Virtual file system with directories, files, permissions (chmod)",
      "10+ built-in commands: ls, cd, cat, mkdir, touch, rm, cp, mv, grep, echo, pwd, clear, help",
      "Command history with arrow key navigation and reverse search (Ctrl+R)",
      "Intelligent autocomplete for commands, file paths, and flags",
      "Multiple themes with customizable colors, font, opacity, and backgrounds",
      "Split pane support (horizontal/vertical) with resize handles",
      "Pipe (|) and redirect (>, >>) support between commands",
    ],
    constraints: [
      "Terminal must render at 60fps with continuous output",
      "Support fonts that maintain monospace alignment",
      "Parsing must handle complex commands with nested flags and pipes",
      "Virtual file system must persist in memory across page navigation (sessionStorage)",
    ],
    bonusFeatures: [
      "SSH integration via WebSocket proxy to connect to real servers",
      "Command recording and replay for demos",
      "Easter egg commands: cmatrix, star wars telnet, fortune, cowsay",
    ],
    deliverables: [
      "Git repository with full source code",
      "Live deployment URL",
      "ARCHITECTURE.md with command parsing and virtual file system explanation",
      "AI declaration and prompts/ folder",
    ],
    evaluationCriteria: [
      "Terminal emulation accuracy and rendering quality",
      "Command implementation completeness and correctness",
      "Autocomplete and history UX polish",
      "Theme system quality and customizability",
      "Split pane implementation and usability",
      "Code architecture and extensibility for new commands",
    ],
    variantGroup: "frontend-terminal",
  },
  // ─── INFINITE CANVAS NOTES ─────────────────────────────────────────────────
  {
    title: "Infinite Canvas Notes",
    slug: "infinite-canvas-notes",
    category: "frontend",
    difficulty: 4,
    overview: `Build a note-taking app on an infinite canvas where notes are Markdown cards that can be freely positioned, connected with arrows/lines, and organized spatially. Think Obsidian + Miro — a graph-based thinking tool for visual note-takers.

Users create Markdown notes that appear as draggable cards on the infinite canvas. Cards can be connected with labeled edges to show relationships. The canvas auto-organizes into a graph view showing how notes connect. Users can zoom in/out, pan around, and group related notes into clusters.

Local-first architecture with IndexedDB storage means notes are instantly available offline. Export your entire canvas as Markdown files, JSON, or PNG. The app should feel fast and responsive — no login required to start taking notes.`,
    requirements: [
      "Infinite canvas with smooth pan, zoom, and drag-to-select",
      "Markdown note cards with real-time editing and live preview",
      "Drag notes freely to position them anywhere on canvas",
      "Connection lines/arrows between notes with labels",
      "Auto-generated graph view showing note relationships",
      "Add, delete, search, and filter notes",
      "Local-first storage via IndexedDB (works offline)",
      "Export as Markdown files, JSON graph, or PNG screenshot",
    ],
    constraints: [
      "Canvas must handle 500+ notes without performance degradation",
      "Markdown rendering must support common syntax (headings, lists, code blocks, images, links)",
      "Local storage must not exceed browser quota (graceful fallback)",
      "All core functionality must work without any backend",
    ],
    bonusFeatures: [
      "Collaborative editing via WebRTC (peer-to-peer sync)",
      "Daily notes with auto-generated date-based notes",
      "Canvas templates: mind map, project planning, Zettelkasten",
    ],
    deliverables: [
      "Git repository with full source code",
      "Live deployment URL",
      "ARCHITECTURE.md with local-first data model and canvas rendering approach",
      "AI declaration and prompts/ folder",
    ],
    evaluationCriteria: [
      "Canvas interaction smoothness and UX",
      "Markdown note editing and preview quality",
      "Graph view accuracy and visual appeal",
      "Local-first storage reliability and offline support",
      "Export feature completeness",
      "Code architecture and performance optimization",
    ],
    variantGroup: "frontend-canvas-notes",
  },
  // ─── LIVE CAPTION STUDIO ────────────────────────────────────────────────────
  {
    title: "Live Caption Studio",
    slug: "live-caption-studio",
    category: "frontend",
    difficulty: 3,
    overview: `Build a browser-based live captioning studio that uses the Web Speech API to convert microphone input into real-time captions. Perfect for accessibility, live streaming, classroom lectures, and content creation.

Users grant microphone access, and captions appear in real-time with word-by-word highlighting. The full transcript is searchable and can be saved as SRT or VTT subtitle files for video editing. Multiple display modes: floating captions overlay, presenter view (large text with speaker notes), and transcript view (full scrollable history).

Include a pause/resume button, language selection (for languages supported by Web Speech), speaker label support for multiple speakers, and a confidence indicator. The interface should be clean, dark-themed, and distraction-free.`,
    requirements: [
      "Microphone input → Web Speech API → real-time captions",
      "Word-by-word highlighting as speech is recognized",
      "Searchable full transcript with timestamps",
      "Save/export as SRT and VTT subtitle formats",
      "Multiple display modes: floating overlay, presenter view, transcript view",
      "Pause, resume, and clear caption session",
      "Language selection for supported speech recognition languages",
      "Captions displayed with configurable font size, color, and background opacity",
    ],
    constraints: [
      "Must work entirely in the browser (no backend for speech processing)",
      "Handle at least 30 minutes of continuous captioning",
      "Transcript search must be instant for sessions up to 2 hours",
      "Export files must be valid SRT/VTT format (pass validator checks)",
    ],
    bonusFeatures: [
      "Speaker diarization (detect and label multiple speakers)",
      "Live translation to other languages",
      "Keyboard shortcuts for all controls",
    ],
    deliverables: [
      "Git repository with full source code",
      "Live deployment URL",
      "ARCHITECTURE.md with Web Speech API usage and export format handling",
      "AI declaration and prompts/ folder",
    ],
    evaluationCriteria: [
      "Caption accuracy and real-time performance",
      "UI/UX cleanliness and distraction-free design",
      "Export format correctness (SRT/VTT)",
      "Transcript search performance",
      "Accessibility features and keyboard navigation",
      "Code organization and browser API handling",
    ],
    variantGroup: "frontend-captions",
  },
  // ─── GITHUB PROFILE README STUDIO ───────────────────────────────────────────
  {
    title: "GitHub Profile README Studio",
    slug: "github-profile-readme-studio",
    category: "frontend",
    difficulty: 2,
    overview: `Create a drag-and-drop builder for GitHub profile READMEs. Users visually compose their profile README by dragging sections onto a canvas, configuring each with live preview. Generated Markdown can be copied with one click and pasted into their GitHub profile.

Sections include: header (name, title, tagline), stats cards (GitHub stats, top languages, streak), tech stack icons grid, social links, pinned repositories, contribution graph embed, recent blog posts, visitor counter, and custom markdown blocks.

The builder provides theme previews (choose from presets), real-time Markdown output, and a live preview of how the README will look on GitHub. Users can save multiple drafts and share README templates with the community.`,
    requirements: [
      "Drag-and-drop section builder with real-time canvas preview",
      "10+ sections: header, stats, tech stack, social links, pinned repos, contribution graph, visitor counter, blog posts, custom markdown, divider, spacer",
      "GitHub stats integration (public API) for live stat cards",
      "Tech stack icon grid with 50+ icon options (customizable colors)",
      "Live Markdown output panel with one-click copy",
      "Theme presets with preview colors (dark, light, hacker, cyberpunk, minimal)",
      "Save drafts locally in browser storage",
      "Template gallery where users can start from existing designs",
    ],
    constraints: [
      "Markdown output must render correctly on GitHub (no unsupported syntax)",
      "Stats cards must use publicly available GitHub stats APIs (or mock)",
      "Drag-and-drop must work on touch devices",
      "Icon grid must offer at least 50 tech icons with proper attribution",
    ],
    bonusFeatures: [
      "Export as image for sharing on social media",
      "Community template marketplace with voting",
      "Automatic GitHub Gist backup of your README drafts",
    ],
    deliverables: [
      "Git repository with full source code",
      "Live deployment URL",
      "ARCHITECTURE.md with drag-and-drop implementation and Markdown generation",
      "AI declaration and prompts/ folder",
    ],
    evaluationCriteria: [
      "Drag-and-drop UX polish and responsiveness",
      "Markdown output accuracy (GitHub-compatible)",
      "Section variety and customization depth",
      "Theme system quality",
      "Template gallery and community features",
      "Code architecture and component design",
    ],
    variantGroup: "frontend-readme-studio",
  },
  // ─── LIVE Q&A PLATFORM ──────────────────────────────────────────────────────
  {
    title: "Live Q&A Platform",
    slug: "live-qa-platform",
    category: "full-stack",
    difficulty: 3,
    overview: `Build a real-time Q&A platform like Slido where audience members can submit questions, upvote existing ones, and presenters can moderate and answer. Perfect for conferences, all-hands meetings, classrooms, and webinars.

The audience joins a session via a code or QR link. Questions appear in real-time — upvote to push popular questions to the top. Presenters can mark questions as answered, pin important ones, hide inappropriate content, and toggle anonymous mode. A live results screen shows the most popular questions with animated vote counters.

Include moderation tools (block words, require approval), a \"slow mode\" for question submission rate limiting, and a presenter dashboard with analytics (questions per minute, top categories, response rate). Export the Q&A session as a CSV or PDF report.`,
    requirements: [
      "Create Q&A sessions with unique join codes and optional passwords",
      "Submit questions with optional anonymous mode",
      "Real-time upvoting — questions sort by popularity automatically",
      "Presenter moderation: answer, pin, hide, mark as answered",
      "Live results/projector screen with animated vote counters",
      "Mobile-friendly submission form with minimal friction",
      "Word filtering and rate limiting for spam prevention",
      "Session analytics dashboard for presenters",
    ],
    constraints: [
      "Support 1,000+ concurrent users in a single session",
      "Question list must update within 500ms of new votes/submissions",
      "Anonymous questions must not reveal identity to anyone (including presenters)",
      "Session data must persist for 30 days after event end",
    ],
    bonusFeatures: [
      "Reactions (applause, laugh, surprise) on questions",
      "Export Q&A as CSV, PDF, or embeddable widget",
      "Custom branding for enterprise events",
    ],
    deliverables: [
      "Git repository with full source code",
      "Live deployment URL",
      "ARCHITECTURE.md with real-time architecture and moderation flow",
      "AI declaration and prompts/ folder",
    ],
    evaluationCriteria: [
      "Real-time update performance under load",
      "Moderation tools completeness and UX",
      "Mobile submission experience",
      "Presenter dashboard quality and analytics",
      "Anonymity guarantees and privacy implementation",
      "Code architecture, security, and testing",
    ],
    variantGroup: "full-stack-qa",
  },
  // ─── SPEED TEST VISUALIZER ─────────────────────────────────────────────────
  {
    title: "Speed Test Visualizer",
    slug: "speed-test-visualizer",
    category: "frontend",
    difficulty: 2,
    overview: `Build a beautiful internet speed test tool like Fast.com but with memory — it tracks your speed history and visualizes it with stunning charts. Measure download speed, upload speed, and ping/latency with a single click.

The main screen shows a large animated speed gauge that fills up as the test runs, with real-time speed readout. After the test, results are saved locally (IndexedDB) and displayed on history charts — line charts showing speed over time (daily, weekly, monthly views), ISP comparison, time-of-day analysis, and reliability scoring.

Make the test itself visually engaging: particles flowing during download test, pulse animations during ping test, and a satisfying completion animation with results summary. Include a shareable speed test result card.`,
    requirements: [
      "One-click internet speed test measuring download, upload, and ping/latency",
      "Animated speed gauge with real-time readout during test",
      "History tracking with IndexedDB local storage",
      "Line charts for speed over time with daily/weekly/monthly granularity",
      "ISP comparison showing your speed vs. average for your provider",
      "Time-of-day analysis showing peak performance hours",
      "Test result card with animated reveal (shareable as image)",
      "Multiple test server selection or auto-best-ping detection",
    ],
    constraints: [
      "Speed test must not use more than 100MB of data per test",
      "History must survive browser restarts (IndexedDB persistence)",
      "Charts must render smoothly with 1+ year of daily data points",
      "Test must work within browser constraints (fetch API, no plugins)",
    ],
    bonusFeatures: [
      "Ping/jitter test with real-time graph",
      "Background periodic testing with notification on speed drops",
      "Export history as CSV for data analysis",
    ],
    deliverables: [
      "Git repository with full source code",
      "Live deployment URL",
      "ARCHITECTURE.md with speed test methodology and data storage approach",
      "AI declaration and prompts/ folder",
    ],
    evaluationCriteria: [
      "Speed test accuracy and methodology",
      "Gauge and visualization quality and animations",
      "History tracking and chart implementations",
      "Local storage reliability and data management",
      "Shareable result card implementation",
      "Code architecture and performance optimization",
    ],
    variantGroup: "frontend-speedtest",
  },
  // ─── LINK PREVIEW API ───────────────────────────────────────────────────────
  {
    title: "Link Preview API",
    slug: "link-preview-api",
    category: "full-stack",
    difficulty: 2,
    overview: `Build a service that generates rich Open Graph preview cards for any URL. Paste a URL, and instantly see a beautiful preview card with the page title, description, image, and metadata — just like how links appear when shared on Twitter, Slack, or WhatsApp.

The app has a clean UI where users paste URLs and see previews stack up. Each preview card can be saved to collections, tagged, and searched. But the real power is the API — other developers can hit your API endpoint with a URL parameter and get back structured OG metadata as JSON or an HTML embed snippet.

Include a browser bookmarklet for quick previews, history of all previews with full-text search, and an API dashboard with usage stats and an API key system. The OG extraction handles edge cases: missing OG tags (fall back to <title>, first <h1>, first image), JavaScript-rendered pages (use puppeteer or a headless browser service), and redirect chains.`,
    requirements: [
      "Paste any URL → instant rich preview card with title, description, image, domain, favicon",
      "Preview history with search, collections, and tagging",
      "Public API endpoint that returns structured OG metadata as JSON",
      "API key authentication with usage tracking dashboard",
      "HTML embed snippet generator for embedding previews on any site",
      "Browser bookmarklet for quick URL preview from any page",
      "Fallback extraction when OG tags are missing (title, h1, first image)",
      "Support for Twitter Card metadata in addition to Open Graph",
    ],
    constraints: [
      "API responses must return in under 2 seconds for cached URLs",
      "Handle redirect chains up to 5 hops",
      "Rate limit API to 60 requests per minute per key",
      "Cache previews for minimum 1 hour (configurable TTL)",
    ],
    bonusFeatures: [
      "Screenshot preview of the page alongside OG card",
      "Batch URL preview (upload CSV of URLs)",
      "Slack/Discord bot integration for previews",
    ],
    deliverables: [
      "Git repository with full source code",
      "Live deployment URL",
      "ARCHITECTURE.md with OG extraction pipeline and API design",
      "AI declaration and prompts/ folder",
    ],
    evaluationCriteria: [
      "Preview card rendering accuracy and visual quality",
      "API design, documentation, and developer experience",
      "Edge case handling (missing tags, redirects, JS pages)",
      "History management and search functionality",
      "API key system and usage dashboard",
      "Code architecture and caching strategy",
    ],
    variantGroup: "full-stack-linkpreview",
  },
]

async function main() {
  console.log("Seeding...")

  // Clear existing data
  await prisma.assessmentQuestion.deleteMany()
  await prisma.problemTemplate.deleteMany()

  // Seed assessment questions
  for (const q of assessmentQuestions) {
    await prisma.assessmentQuestion.create({
      data: {
        category: q.category as any,
        questionType: q.questionType as any,
        questionText: q.questionText,
        options: q.options,
        weight: q.weight,
        displayOrder: q.displayOrder,
      },
    })
  }

  console.log(`Seeded ${assessmentQuestions.length} assessment questions`)

  // Seed problem templates
  for (const p of problemTemplates) {
    await prisma.problemTemplate.create({
      data: {
        title: p.title,
        slug: p.slug,
        category: p.category,
        difficulty: p.difficulty,
        overview: p.overview,
        requirements: p.requirements,
        constraints: p.constraints,
        bonusFeatures: p.bonusFeatures,
        deliverables: p.deliverables,
        evaluationCriteria: p.evaluationCriteria,
        isActive: true,
        variantGroup: p.variantGroup,
      },
    })
  }

  console.log(`Seeded ${problemTemplates.length} problem templates`)
}

main()
  .catch((e) => {
    console.error("Seed error:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
