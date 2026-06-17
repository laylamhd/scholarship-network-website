import { useState, useEffect } from "react";
import {
  BookOpen,
  Briefcase,
  Users,
  Image as ImageIcon,
  User,
  Bell,
  Search,
  MessageSquare,
  ChevronRight,
  GraduationCap,
  Globe,
  FileText,
  Award,
  Home,
  LogOut,
  Download,
  Eye,
  ThumbsUp,
  MessageCircle,
  Bookmark,
  Megaphone,
  CheckCircle,
  Plus,
  MapPin,
  ArrowRight,
  Menu,
  MoreHorizontal,
  Clock,
  Shield,
  ExternalLink,
} from "lucide-react";

// ─────────────────────────────────────────────
// DATA
// ─────────────────────────────────────────────

const PORTALS = [
  { id: "palestine", name: "Palestine", flag: "🇵🇸", scholars: 847 },
  { id: "lebanon", name: "Lebanon", flag: "🇱🇧", scholars: 523 },
  { id: "egypt", name: "Egypt", flag: "🇪🇬", scholars: 412 },
  { id: "jordan", name: "Jordan", flag: "🇯🇴", scholars: 389 },
  { id: "syria", name: "Syria", flag: "🇸🇾", scholars: 634 },
  { id: "iraq", name: "Iraq", flag: "🇮🇶", scholars: 281 },
];

const GROUPS = [
  { id: 1, name: "Palestinian Scholars Network", members: 847, emoji: "🎓", joined: true },
  { id: 2, name: "Women in STEM", members: 392, emoji: "🔬", joined: true },
  { id: 3, name: "Research & Publications", members: 215, emoji: "📚", joined: false },
  { id: 4, name: "Career & Internships", members: 508, emoji: "💼", joined: true },
  { id: 5, name: "Mental Health & Wellbeing", members: 176, emoji: "💚", joined: false },
  { id: 6, name: "Lebanese Alumni Network", members: 523, emoji: "🏛️", joined: false },
];

const INITIAL_POSTS = [
  {
    id: 1,
    author: "Layla Hassan",
    initials: "LH",
    country: "Palestine",
    flag: "🇵🇸",
    group: "Palestinian Scholars Network",
    time: "2 hours ago",
    title: "Navigating university enrollment in Germany — a complete guide for Palestinian scholars",
    body: "Having completed this process last year, I want to share the exact steps, required documents, and contacts that helped me enroll at TU Berlin. This includes the Blocked Account requirement, credential recognition via the anabin database, and language certificate guidance.",
    upvotes: 94,
    comments: 23,
    saved: false,
  },
  {
    id: 2,
    author: "Rania Khalil",
    initials: "RK",
    country: "Lebanon",
    flag: "🇱🇧",
    group: "Women in STEM",
    time: "5 hours ago",
    title: "Open call: Women in STEM mentorship program — applications close July 15",
    body: "The Big Heart Foundation is matching 50 female scholars with senior professionals in engineering, medicine, and computer science. Mentors include faculty from MIT, Oxford, and AUB. One-year commitment, fully online.",
    upvotes: 67,
    comments: 14,
    saved: true,
  },
  {
    id: 3,
    author: "Omar Nasser",
    initials: "ON",
    country: "Syria",
    flag: "🇸🇾",
    group: "Research & Publications",
    time: "1 day ago",
    title: "My paper on water resource management in conflict zones was accepted to Nature Water",
    body: "Sharing this because I know many of us wonder whether research conducted under difficult circumstances can still reach top journals. It can. The work was done over 18 months with minimal lab access — happy to discuss the process with anyone.",
    upvotes: 213,
    comments: 48,
    saved: false,
  },
  {
    id: 4,
    author: "Fatima Al-Rashid",
    initials: "FA",
    country: "Jordan",
    flag: "🇯🇴",
    group: "Career & Internships",
    time: "2 days ago",
    title: "UNRWA is hiring 12 data analysts — remote positions open to TBHF scholars",
    body: "Deadline July 20. They specifically mentioned TBHF scholars as eligible. I applied last cycle and got the role — the process is straightforward if you have your documents organized. Happy to share my notes in the comments.",
    upvotes: 156,
    comments: 31,
    saved: false,
  },
];

const RESOURCES = [
  { id: 1, title: "International CV Template", type: "Document", icon: FileText, downloads: 1842 },
  { id: 2, title: "University Application Guide 2025", type: "Guide", icon: BookOpen, downloads: 967 },
  { id: 3, title: "Scholarship Search Handbook", type: "Guide", icon: Award, downloads: 743 },
  { id: 4, title: "English Academic Writing Basics", type: "Workshop", icon: GraduationCap, downloads: 521 },
  { id: 5, title: "Visa Documentation Checklist", type: "Document", icon: CheckCircle, downloads: 2104 },
];

const JOBS = [
  { id: 1, org: "UNRWA", role: "Data Analysis Intern", location: "Remote / Amman", deadline: "July 20, 2025", tags: ["Data", "Remote"], type: "Internship" },
  { id: 2, org: "MSF — Médecins Sans Frontières", role: "Public Health Research Assistant", location: "Geneva (hybrid)", deadline: "July 31, 2025", tags: ["Health", "Research"], type: "Fellowship" },
  { id: 3, org: "World Bank", role: "Economic Research Fellow", location: "Washington D.C.", deadline: "Aug 10, 2025", tags: ["Economics", "Fellowship"], type: "Fellowship" },
  { id: 4, org: "UNICEF Innovation", role: "Technology for Development Intern", location: "Remote", deadline: "Aug 20, 2025", tags: ["Tech", "Remote"], type: "Internship" },
];

const GALLERY_ITEMS = [
  { id: 1, type: "poster", title: "Water Scarcity & Conflict Zones", author: "Omar Nasser", country: "Syria", flag: "🇸🇾", img: "photo-1532094349884-543bc11b234d", views: 342, year: "2025" },
  { id: 2, type: "story", title: "From Gaza to Göttingen: My Scholarship Journey", author: "Samira Barakat", country: "Palestine", flag: "🇵🇸", img: "photo-1523050854058-8df90110c9f1", views: 891, year: "2025" },
  { id: 3, type: "video", title: "Preserving Palestinian Architecture Through Digital Twins", author: "Khalil Mansour", country: "Palestine", flag: "🇵🇸", img: "photo-1486312338219-ce68d2c6f44d", views: 1203, year: "2025" },
  { id: 4, type: "poster", title: "Climate Adaptation in Refugee Settlements", author: "Fatima Al-Rashid", country: "Jordan", flag: "🇯🇴", img: "photo-1541746972996-4e0b0f43e02a", views: 267, year: "2024" },
  { id: 5, type: "story", title: "Finding Home in a Foreign Library", author: "Rania Khalil", country: "Lebanon", flag: "🇱🇧", img: "photo-1481627834876-b7833e8f5570", views: 445, year: "2025" },
  { id: 6, type: "video", title: "Mental Health Among Displaced Scholars: A Study", author: "Nour Khalifa", country: "Syria", flag: "🇸🇾", img: "photo-1559757175-5700dde675bc", views: 687, year: "2024" },
];

const ACTIVE_SCHOLARS = [
  { name: "Omar Nasser", flag: "🇸🇾", status: "Online", initials: "ON" },
  { name: "Rania Khalil", flag: "🇱🇧", status: "Online", initials: "RK" },
  { name: "Fatima Al-Rashid", flag: "🇯🇴", status: "Away", initials: "FA" },
  { name: "Khalil Mansour", flag: "🇵🇸", status: "Online", initials: "KM" },
];

const EVENTS = [
  { title: "Scholarship Q&A Webinar", date: "Jun 22", time: "3:00 PM GST" },
  { title: "Women in STEM Networking", date: "Jun 28", time: "5:00 PM GST" },
  { title: "Research Writing Workshop", date: "Jul 4", time: "2:00 PM GST" },
];

// ─────────────────────────────────────────────
// SHARED COMPONENTS
// ─────────────────────────────────────────────

type AvatarSize = "sm" | "md" | "lg";

function Avatar({ initials, size = "md" }: { initials: string; size?: AvatarSize }) {
  const sizes: Record<AvatarSize, string> = {
    sm: "w-8 h-8 text-xs",
    md: "w-10 h-10 text-sm",
    lg: "w-16 h-16 text-xl",
  };
  return (
    <div
      className={`${sizes[size]} rounded-full bg-primary/10 text-primary font-semibold flex items-center justify-center flex-shrink-0`}
    >
      {initials}
    </div>
  );
}

function Skel({ className = "" }: { className?: string }) {
  return <div className={`bg-muted animate-pulse rounded-lg ${className}`} />;
}

function Badge({ children, variant = "default" }: { children: React.ReactNode; variant?: "default" | "outline" }) {
  const cls =
    variant === "outline"
      ? "border border-border text-muted-foreground"
      : "bg-secondary text-secondary-foreground";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${cls}`}>
      {children}
    </span>
  );
}

// ─────────────────────────────────────────────
// LANDING
// ─────────────────────────────────────────────

function LandingView({ onLogin }: { onLogin: () => void }) {
  const [selectedPortal, setSelectedPortal] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top bar */}
      <header className="border-b border-border bg-white">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <div>
              <div
                className="font-semibold text-foreground text-sm leading-tight"
                style={{ fontFamily: "'Lora', serif" }}
              >
                TBHF Global Scholars
              </div>
              <div className="text-xs text-muted-foreground">Palestine Legacy Fund</div>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
            <Shield className="w-3.5 h-3.5 text-primary" />
            <span>Supported by the Big Heart Foundation</span>
          </div>
        </div>
      </header>

      {/* Hero + content */}
      <main className="flex-1 max-w-6xl mx-auto px-6 py-14 w-full">
        <div className="grid lg:grid-cols-[1fr_420px] gap-16 items-start">
          {/* Left */}
          <div>
            <div className="inline-flex items-center gap-2 bg-secondary text-primary px-3 py-1.5 rounded-full text-xs font-semibold mb-6">
              <Globe className="w-3 h-3" />
              2,086 scholars across 6 regional portals
            </div>

            <h1
              style={{ fontFamily: "'Lora', serif" }}
              className="text-4xl font-semibold text-foreground leading-tight mb-4"
            >
              Empowering Scholars.<br />
              <span className="text-primary">Connecting Communities.</span><br />
              Supporting Hope.
            </h1>
            <p className="text-muted-foreground text-lg leading-relaxed mb-10 max-w-lg">
              A secure, accessible network for TBHF scholars and alumni across the region — access academic resources, connect with peers, and build your future.
            </p>

            {/* Portal selection */}
            <div className="mb-10">
              <p className="text-sm font-semibold text-foreground mb-3">
                Select your regional portal
              </p>
              <div className="grid grid-cols-3 gap-3">
                {PORTALS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedPortal(p.id)}
                    className={`p-4 rounded-xl border-2 text-left transition-all duration-150 ${
                      selectedPortal === p.id
                        ? "border-primary bg-secondary shadow-sm"
                        : "border-border bg-white hover:border-primary/40 hover:bg-muted/50"
                    }`}
                  >
                    <div className="text-2xl mb-1.5">{p.flag}</div>
                    <div className="text-sm font-semibold text-foreground">{p.name}</div>
                    <div className="text-xs text-muted-foreground">{p.scholars.toLocaleString()} scholars</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Stats */}
            <div className="flex gap-10 pt-6 border-t border-border">
              {[
                { value: "6", label: "Regional Portals" },
                { value: "2,086", label: "Active Scholars" },
                { value: "48", label: "Countries Reached" },
              ].map((s) => (
                <div key={s.label}>
                  <div
                    className="text-2xl font-semibold text-primary"
                    style={{ fontFamily: "'Lora', serif" }}
                  >
                    {s.value}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Right — login form */}
          <div>
            <div className="bg-card border border-border rounded-2xl p-8 shadow-sm">
              <h2
                style={{ fontFamily: "'Lora', serif" }}
                className="text-xl font-semibold text-foreground mb-1"
              >
                Sign in to your account
              </h2>
              <p className="text-sm text-muted-foreground mb-6">
                {selectedPortal
                  ? `Portal: ${PORTALS.find((p) => p.id === selectedPortal)?.name} ${PORTALS.find((p) => p.id === selectedPortal)?.flag}`
                  : "Please select your regional portal above"}
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    Email address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full px-4 py-3 rounded-lg border border-border bg-input-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-3 rounded-lg border border-border bg-input-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors text-sm"
                  />
                </div>
                <button
                  onClick={onLogin}
                  className="w-full py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 active:scale-[0.99] transition-all text-sm"
                >
                  Sign In
                </button>
              </div>

              <div className="flex items-center justify-between mt-4 text-sm">
                <button className="text-primary hover:underline text-sm">Forgot password?</button>
                <button className="text-muted-foreground hover:text-foreground text-sm transition-colors">
                  Request access →
                </button>
              </div>

              <div className="mt-6 pt-5 border-t border-border flex items-start gap-2 text-xs text-muted-foreground">
                <Shield className="w-3.5 h-3.5 text-primary flex-shrink-0 mt-0.5" />
                <span>Your data is protected and only accessible within your regional portal network.</span>
              </div>
            </div>

            <p className="text-center text-xs text-muted-foreground mt-4 leading-relaxed">
              TBHF Global Scholars Network · Palestine Legacy Fund<br />
              An initiative of the Big Heart Foundation
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

// ─────────────────────────────────────────────
// AUTHENTICATED SHELL
// ─────────────────────────────────────────────

type View = "dashboard" | "community" | "profile" | "gallery";

function Shell({
  view,
  setView,
  children,
}: {
  view: View;
  setView: (v: View) => void;
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);

  const navItems: { id: View; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: "dashboard", label: "Dashboard", icon: Home },
    { id: "community", label: "Community Hub", icon: Users },
    { id: "profile", label: "My Profile", icon: User },
    { id: "gallery", label: "Showcase", icon: ImageIcon },
  ];

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar */}
      <aside
        className={`${collapsed ? "w-16" : "w-56"} flex-shrink-0 bg-white border-r border-border flex flex-col transition-all duration-200`}
      >
        {/* Logo */}
        <div className="p-4 border-b border-border flex items-center gap-3 overflow-hidden min-h-[64px]">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center flex-shrink-0">
            <GraduationCap className="w-4 h-4 text-white" />
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <div
                className="text-xs font-semibold text-foreground leading-tight truncate"
                style={{ fontFamily: "'Lora', serif" }}
              >
                TBHF Scholars
              </div>
              <div className="text-xs text-muted-foreground truncate">Palestine Legacy Fund</div>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = view === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setView(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  active
                    ? "bg-primary text-primary-foreground font-medium"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* User */}
        <div className="p-3 border-t border-border">
          {!collapsed && (
            <div className="flex items-center gap-2.5 px-2 py-2 mb-1">
              <Avatar initials="LH" size="sm" />
              <div className="overflow-hidden">
                <div className="text-xs font-semibold text-foreground truncate">Layla Hassan</div>
                <div className="text-xs text-muted-foreground truncate">Palestine 🇵🇸</div>
              </div>
            </div>
          )}
          <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
            <LogOut className="w-4 h-4 flex-shrink-0" />
            {!collapsed && <span>Sign out</span>}
          </button>
        </div>
      </aside>

      {/* Main column */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="bg-white border-b border-border px-6 py-3 flex items-center justify-between flex-shrink-0 min-h-[64px]">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="p-1.5 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              aria-label="Toggle sidebar"
            >
              <Menu className="w-4 h-4" />
            </button>
            <div className="relative hidden sm:block">
              <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search resources, people, posts..."
                className="pl-9 pr-4 py-2 text-sm bg-muted/60 border border-border rounded-lg w-72 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white transition-colors placeholder:text-muted-foreground"
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="relative p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors">
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-accent rounded-full" />
            </button>
            <div className="flex items-center gap-2.5">
              <Avatar initials="LH" size="sm" />
              <div className="hidden sm:block">
                <div className="text-sm font-semibold text-foreground leading-tight">Layla Hassan</div>
                <div className="text-xs text-muted-foreground">Palestine 🇵🇸</div>
              </div>
            </div>
          </div>
        </header>

        {/* Page */}
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// DASHBOARD
// ─────────────────────────────────────────────

function DashboardView() {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setLoaded(true), 1500);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      {/* Communication Banner */}
      <div className="bg-primary text-primary-foreground rounded-2xl p-6">
        <div className="flex items-start gap-4">
          <div className="w-11 h-11 bg-white/15 rounded-xl flex items-center justify-center flex-shrink-0">
            <Megaphone className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="text-xs font-semibold bg-white/20 px-2.5 py-1 rounded-full">
                From the Big Heart Foundation
              </span>
              <span className="text-xs text-white/60">June 17, 2025</span>
            </div>
            <h3
              style={{ fontFamily: "'Lora', serif" }}
              className="font-semibold text-white text-lg mb-2 leading-snug"
            >
              Summer Research Stipend Applications Are Now Open
            </h3>
            <p className="text-sm text-white/80 leading-relaxed max-w-2xl">
              Dear scholars, we are pleased to announce the 2025 Summer Research Stipend program. Up to 150 scholars will receive AED 5,000 to support ongoing research and academic projects. Applications close July 31, 2025.
            </p>
            <button className="mt-4 text-sm font-semibold bg-white text-primary px-5 py-2.5 rounded-lg hover:bg-white/90 active:scale-[0.98] transition-all inline-flex items-center gap-2">
              Apply Now <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {loaded ? (
          [
            { label: "Scholar ID", value: "PS-2847", icon: Shield },
            { label: "Resources Accessed", value: "12", icon: BookOpen },
            { label: "Community Posts", value: "8", icon: MessageCircle },
            { label: "Connections", value: "43", icon: Users },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Icon className="w-4 h-4 text-primary" />
                <span className="text-xs text-muted-foreground">{label}</span>
              </div>
              <div
                className="text-xl font-semibold text-foreground"
                style={{ fontFamily: "'Lora', serif" }}
              >
                {value}
              </div>
            </div>
          ))
        ) : (
          [...Array(4)].map((_, i) => <Skel key={i} className="h-20" />)
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Resource Library */}
        <div className="lg:col-span-2">
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <h2
                style={{ fontFamily: "'Lora', serif" }}
                className="font-semibold text-foreground"
              >
                Resource Library
              </h2>
              <button className="text-xs text-primary hover:underline flex items-center gap-1">
                View all <ChevronRight className="w-3 h-3" />
              </button>
            </div>
            <div className="divide-y divide-border">
              {loaded
                ? RESOURCES.map((r) => {
                    const Icon = r.icon;
                    return (
                      <div
                        key={r.id}
                        className="px-5 py-4 flex items-center gap-3 hover:bg-muted/40 transition-colors group"
                      >
                        <div className="w-9 h-9 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Icon className="w-4 h-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-foreground truncate">{r.title}</div>
                          <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                            <span>{r.type}</span>
                            <span>·</span>
                            <span>{r.downloads.toLocaleString()} downloads</span>
                          </div>
                        </div>
                        <button className="flex items-center gap-1.5 text-xs text-primary border border-primary/20 px-3 py-1.5 rounded-lg hover:bg-primary hover:text-primary-foreground transition-colors opacity-0 group-hover:opacity-100">
                          <Download className="w-3 h-3" /> Get
                        </button>
                      </div>
                    );
                  })
                : [...Array(5)].map((_, i) => (
                    <div key={i} className="px-5 py-4 flex items-center gap-3">
                      <Skel className="w-9 h-9 flex-shrink-0" />
                      <div className="flex-1 space-y-2">
                        <Skel className="h-4 w-48" />
                        <Skel className="h-3 w-32" />
                      </div>
                    </div>
                  ))}
            </div>
          </div>
        </div>

        {/* Career Center */}
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <h2
                style={{ fontFamily: "'Lora', serif" }}
                className="font-semibold text-foreground"
              >
                Career Center
              </h2>
              <button className="text-xs text-primary hover:underline">See all</button>
            </div>
            <div className="divide-y divide-border">
              {loaded
                ? JOBS.slice(0, 3).map((job) => (
                    <div
                      key={job.id}
                      className="px-4 py-4 hover:bg-muted/40 transition-colors cursor-pointer"
                    >
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <div className="text-sm font-medium text-foreground leading-snug">
                          {job.role}
                        </div>
                        <Badge variant="outline">{job.type}</Badge>
                      </div>
                      <div className="text-xs text-primary font-semibold mb-1">{job.org}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                        <MapPin className="w-3 h-3 flex-shrink-0" /> {job.location}
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3 flex-shrink-0" /> Deadline: {job.deadline}
                      </div>
                    </div>
                  ))
                : [...Array(3)].map((_, i) => (
                    <div key={i} className="px-4 py-4 space-y-2">
                      <Skel className="h-4 w-full" />
                      <Skel className="h-3 w-3/4" />
                      <Skel className="h-3 w-1/2" />
                    </div>
                  ))}
            </div>
          </div>

          {/* Announcements */}
          {loaded && (
            <div className="bg-secondary border border-primary/15 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle className="w-4 h-4 text-primary" />
                <span
                  className="text-sm font-semibold text-primary"
                  style={{ fontFamily: "'Lora', serif" }}
                >
                  Portal Status
                </span>
              </div>
              <p className="text-xs text-secondary-foreground leading-relaxed">
                Palestine portal is active. Your scholarship renewal window opens August 1, 2025. All documents must be submitted by September 15.
              </p>
              <button className="mt-3 text-xs text-primary font-semibold flex items-center gap-1 hover:underline">
                View renewal checklist <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// COMMUNITY HUB
// ─────────────────────────────────────────────

function CommunityView() {
  const [activeGroup, setActiveGroup] = useState(1);
  const [posts, setPosts] = useState(INITIAL_POSTS);

  const handleUpvote = (id: number) =>
    setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, upvotes: p.upvotes + 1 } : p)));
  const handleSave = (id: number) =>
    setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, saved: !p.saved } : p)));

  const TAGS = ["#Scholarships2025", "#WomenInSTEM", "#ResearchLife", "#GazaScholars", "#DigitalArchiving"];

  return (
    <div className="flex h-full">
      {/* Groups sidebar */}
      <aside className="w-60 flex-shrink-0 border-r border-border bg-white overflow-y-auto p-4">
        <div className="flex items-center justify-between mb-3">
          <h2
            style={{ fontFamily: "'Lora', serif" }}
            className="text-sm font-semibold text-foreground"
          >
            My Groups
          </h2>
          <button className="p-1 text-muted-foreground hover:text-primary transition-colors">
            <Plus className="w-4 h-4" />
          </button>
        </div>
        <div className="space-y-0.5">
          {GROUPS.map((group) => (
            <button
              key={group.id}
              onClick={() => setActiveGroup(group.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                activeGroup === group.id
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <span className="text-base flex-shrink-0">{group.emoji}</span>
              <div className="overflow-hidden flex-1">
                <div className="text-xs font-medium truncate leading-snug">{group.name}</div>
                <div className="text-xs text-muted-foreground">{group.members.toLocaleString()} members</div>
              </div>
              {group.joined && (
                <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
              )}
            </button>
          ))}
        </div>

        <div className="mt-6 pt-5 border-t border-border">
          <p className="text-xs font-semibold text-muted-foreground mb-2.5 tracking-wide">TRENDING</p>
          {TAGS.map((tag) => (
            <button
              key={tag}
              className="block text-xs text-primary hover:underline mb-2 text-left"
            >
              {tag}
            </button>
          ))}
        </div>
      </aside>

      {/* Feed */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {/* Composer */}
        <div className="bg-card border border-border rounded-xl p-4 flex gap-3">
          <Avatar initials="LH" />
          <div className="flex-1">
            <input
              type="text"
              placeholder="Share something with your network..."
              className="w-full text-sm bg-muted/60 border border-border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors placeholder:text-muted-foreground"
            />
            <div className="flex items-center gap-2 mt-2.5">
              <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors px-2 py-1">
                <ImageIcon className="w-3.5 h-3.5" /> Photo
              </button>
              <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors px-2 py-1">
                <FileText className="w-3.5 h-3.5" /> Document
              </button>
              <button className="ml-auto text-xs bg-primary text-primary-foreground px-4 py-1.5 rounded-lg hover:bg-primary/90 transition-colors font-semibold">
                Post
              </button>
            </div>
          </div>
        </div>

        {/* Posts */}
        {posts.map((post) => (
          <div
            key={post.id}
            className="bg-card border border-border rounded-xl p-5 hover:border-primary/20 transition-colors"
          >
            <div className="flex items-center gap-3 mb-3">
              <Avatar initials={post.initials} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-foreground">{post.author}</span>
                  <span>{post.flag}</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  <span className="text-primary font-medium">{post.group}</span> · {post.time}
                </div>
              </div>
              <button className="p-1 text-muted-foreground hover:text-foreground transition-colors">
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </div>

            <h3
              style={{ fontFamily: "'Lora', serif" }}
              className="text-sm font-semibold text-foreground mb-2 leading-snug"
            >
              {post.title}
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed mb-4">{post.body}</p>

            <div className="flex items-center gap-4 pt-3 border-t border-border">
              <button
                onClick={() => handleUpvote(post.id)}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
              >
                <ThumbsUp className="w-3.5 h-3.5" />
                {post.upvotes}
              </button>
              <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors">
                <MessageCircle className="w-3.5 h-3.5" />
                {post.comments} replies
              </button>
              <button
                onClick={() => handleSave(post.id)}
                className={`flex items-center gap-1.5 text-xs transition-colors ${
                  post.saved ? "text-accent" : "text-muted-foreground hover:text-primary"
                }`}
              >
                <Bookmark className={`w-3.5 h-3.5 ${post.saved ? "fill-current" : ""}`} />
                {post.saved ? "Saved" : "Save"}
              </button>
              <button className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors">
                <MessageSquare className="w-3.5 h-3.5" /> Message
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Right sidebar */}
      <aside className="w-60 flex-shrink-0 border-l border-border bg-white overflow-y-auto p-4 hidden xl:block">
        <div className="mb-6">
          <p className="text-xs font-semibold text-muted-foreground mb-3 tracking-wide">
            ACTIVE SCHOLARS
          </p>
          <div className="space-y-3">
            {ACTIVE_SCHOLARS.map((s) => (
              <div key={s.name} className="flex items-center gap-2.5">
                <div className="relative">
                  <Avatar initials={s.initials} size="sm" />
                  <div
                    className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white ${
                      s.status === "Online" ? "bg-green-400" : "bg-yellow-400"
                    }`}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-foreground truncate">
                    {s.name} {s.flag}
                  </div>
                  <div className="text-xs text-muted-foreground">{s.status}</div>
                </div>
                <button className="p-1 text-muted-foreground hover:text-primary transition-colors">
                  <MessageSquare className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-3 tracking-wide">
            UPCOMING EVENTS
          </p>
          <div className="space-y-3">
            {EVENTS.map((ev) => (
              <div key={ev.title} className="border-l-2 border-primary/30 pl-3">
                <div className="text-xs font-medium text-foreground leading-snug">{ev.title}</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {ev.date} · {ev.time}
                </div>
              </div>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}

// ─────────────────────────────────────────────
// PROFILE
// ─────────────────────────────────────────────

function ProfileView() {
  const skills = [
    "Water Resource Management", "GIS Mapping", "Environmental Policy",
    "Data Analysis", "Arabic", "English", "German (B2)", "R / Python",
    "Academic Research", "Field Surveys",
  ];

  const academicInfo = [
    { label: "Scholar ID", value: "PS-2847" },
    { label: "Program", value: "MSc Environmental Engineering" },
    { label: "University", value: "TU Berlin" },
    { label: "Host Country", value: "Germany" },
    { label: "Cohort Year", value: "2023" },
    { label: "Status", value: "Active Scholar" },
  ];

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      {/* Header card */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="h-28 bg-gradient-to-r from-primary to-primary/60" />
        <div className="px-6 pb-6">
          <div className="flex items-end justify-between -mt-9 mb-4">
            <div className="w-20 h-20 rounded-full bg-primary/10 border-4 border-white flex items-center justify-center text-xl font-semibold text-primary flex-shrink-0" style={{ fontFamily: "'Lora', serif" }}>
              LH
            </div>
            <div className="flex gap-2 pb-1">
              <button className="text-xs border border-border px-3 py-2 rounded-lg text-muted-foreground hover:bg-muted transition-colors flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5" /> Message
              </button>
              <button className="text-xs bg-primary text-primary-foreground px-3 py-2 rounded-lg hover:bg-primary/90 transition-colors font-medium">
                Edit Profile
              </button>
            </div>
          </div>
          <h1
            style={{ fontFamily: "'Lora', serif" }}
            className="text-xl font-semibold text-foreground"
          >
            Layla Hassan
          </h1>
          <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1">
              <span>🇵🇸</span> Palestine
            </span>
            <span>·</span>
            <span className="flex items-center gap-1">
              <GraduationCap className="w-3.5 h-3.5" /> MSc Environmental Engineering
            </span>
            <span>·</span>
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" /> Berlin, Germany
            </span>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-5">
        {/* Main column */}
        <div className="md:col-span-2 space-y-5">
          <div className="bg-card border border-border rounded-xl p-5">
            <h2
              style={{ fontFamily: "'Lora', serif" }}
              className="font-semibold text-foreground mb-3"
            >
              Personal Biography
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              I am a Palestinian environmental engineer currently pursuing my MSc at TU Berlin, supported by the TBHF scholarship. My research focuses on water resource management in conflict-affected regions, drawing on fieldwork conducted in Gaza and the West Bank.
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed mt-3">
              I believe that science and community are both tools of resilience. Through this network, I hope to connect with other scholars who are turning adversity into research, and research into change.
            </p>
          </div>

          <div className="bg-card border border-border rounded-xl p-5">
            <h2
              style={{ fontFamily: "'Lora', serif" }}
              className="font-semibold text-foreground mb-3"
            >
              Skills & Expertise
            </h2>
            <div className="flex flex-wrap gap-2">
              {skills.map((skill) => (
                <span
                  key={skill}
                  className="text-xs px-3 py-1.5 bg-secondary text-secondary-foreground rounded-full font-medium"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-5">
            <h2
              style={{ fontFamily: "'Lora', serif" }}
              className="font-semibold text-foreground mb-3"
            >
              Recent Posts
            </h2>
            <div className="space-y-4">
              {INITIAL_POSTS.slice(0, 2).map((post) => (
                <div key={post.id} className="pb-4 border-b border-border last:border-0 last:pb-0">
                  <div
                    className="text-sm font-medium text-foreground mb-1 leading-snug"
                    style={{ fontFamily: "'Lora', serif" }}
                  >
                    {post.title}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    <span className="text-primary">{post.group}</span> · {post.time} ·{" "}
                    {post.upvotes} upvotes
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Info column */}
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-xl p-5">
            <h3
              style={{ fontFamily: "'Lora', serif" }}
              className="text-sm font-semibold text-foreground mb-4"
            >
              Academic Info
            </h3>
            <div className="space-y-3">
              {academicInfo.map(({ label, value }) => (
                <div key={label}>
                  <div className="text-xs text-muted-foreground mb-0.5">{label}</div>
                  <div className="text-xs font-semibold text-foreground">{value}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-5">
            <h3
              style={{ fontFamily: "'Lora', serif" }}
              className="text-sm font-semibold text-foreground mb-3"
            >
              Network
            </h3>
            <div className="grid grid-cols-2 gap-3 text-center">
              {[
                { value: "43", label: "Connections" },
                { value: "8", label: "Posts" },
              ].map((s) => (
                <div key={s.label}>
                  <div
                    className="text-xl font-semibold text-primary"
                    style={{ fontFamily: "'Lora', serif" }}
                  >
                    {s.value}
                  </div>
                  <div className="text-xs text-muted-foreground">{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-5">
            <h3
              style={{ fontFamily: "'Lora', serif" }}
              className="text-sm font-semibold text-foreground mb-3"
            >
              Groups
            </h3>
            <div className="space-y-2">
              {GROUPS.filter((g) => g.joined).map((group) => (
                <div key={group.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{group.emoji}</span>
                  <span className="truncate">{group.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// GALLERY / SHOWCASE
// ─────────────────────────────────────────────

function GalleryView() {
  const [filter, setFilter] = useState("all");

  const filtered =
    filter === "all" ? GALLERY_ITEMS : GALLERY_ITEMS.filter((i) => i.type === filter);

  const typeLabel: Record<string, string> = {
    poster: "Research Poster",
    video: "Video",
    story: "Academic Story",
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1
            style={{ fontFamily: "'Lora', serif" }}
            className="text-xl font-semibold text-foreground"
          >
            Scholar Showcase
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Research posters, academic stories, and video presentations from our scholars
          </p>
        </div>
        <button className="flex items-center gap-2 text-sm bg-primary text-primary-foreground px-4 py-2.5 rounded-lg hover:bg-primary/90 transition-colors font-medium flex-shrink-0">
          <Plus className="w-4 h-4" /> Share Your Work
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {[
          { id: "all", label: "All Works" },
          { id: "poster", label: "Research Posters" },
          { id: "video", label: "Videos" },
          { id: "story", label: "Academic Stories" },
        ].map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === f.id
                ? "bg-primary text-primary-foreground"
                : "bg-card border border-border text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map((item) => (
          <div
            key={item.id}
            className="bg-card border border-border rounded-xl overflow-hidden group hover:border-primary/30 hover:shadow-md transition-all duration-200 cursor-pointer"
          >
            <div className="relative overflow-hidden bg-muted h-48">
              <img
                src={`https://images.unsplash.com/${item.img}?w=600&h=400&fit=crop&auto=format`}
                alt={item.title}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              <div className="absolute top-3 left-3">
                <span className="text-xs bg-black/50 text-white px-2.5 py-1 rounded-full font-medium">
                  {typeLabel[item.type]}
                </span>
              </div>
              <div className="absolute bottom-3 right-3 text-xs text-white/80 flex items-center gap-1">
                <Eye className="w-3 h-3" /> {item.views.toLocaleString()}
              </div>
            </div>
            <div className="p-4">
              <h3
                style={{ fontFamily: "'Lora', serif" }}
                className="text-sm font-semibold text-foreground mb-2 leading-snug"
              >
                {item.title}
              </h3>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground flex-wrap">
                <span>{item.flag}</span>
                <span className="font-medium text-foreground">{item.author}</span>
                <span>·</span>
                <span>{item.country}</span>
                <span>·</span>
                <span>{item.year}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// ROOT
// ─────────────────────────────────────────────

export default function App() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [view, setView] = useState<View>("dashboard");

  if (!loggedIn) {
    return <LandingView onLogin={() => setLoggedIn(true)} />;
  }

  return (
    <Shell view={view} setView={setView}>
      {view === "dashboard" && <DashboardView />}
      {view === "community" && <CommunityView />}
      {view === "profile" && <ProfileView />}
      {view === "gallery" && <GalleryView />}
    </Shell>
  );
}
