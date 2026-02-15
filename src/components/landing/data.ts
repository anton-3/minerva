// Static data for landing page sections

import {
  Heart,
  MessageCircleQuestion,
  AudioLines,
  TrendingUp,
  Triangle,
  Sparkles,
} from "lucide-react";

// ─── Socratic Edge features ─────────────────────────────────────────────────
export const socraticFeatures = [
  {
    icon: Heart,
    title: "Patience of a Saint",
    description:
      "Minerva never gets frustrated. She will rephrase, illustrate, and guide a student through a concept 100 times if that\u2019s what it takes to reach that \u2018Aha!\u2019 moment.",
  },
  {
    icon: MessageCircleQuestion,
    title: "Masterful Inquiry",
    description:
      "Powered by Claude 4.5, our AI uses the Socratic method to break down complex problems into manageable questions, building genuine understanding.",
  },
  {
    icon: AudioLines,
    title: "Natural Conversation",
    description:
      "Latency-free voice via HeyGen ensures the flow of conversation feels human, making learning a social, engaging experience rather than a chore.",
  },
];

// ─── Canvas feature cards ────────────────────────────────────────────────────
export const canvasFeatures = [
  {
    icon: TrendingUp,
    title: "Desmos Integration",
    description:
      "High-fidelity graphing for algebra, calculus, and trigonometry. See functions come to life instantly.",
  },
  {
    icon: Triangle,
    title: "GeoGebra Constructions",
    description:
      "Interactive geometry. Drag points, measure angles, and prove theorems in an environment that understands math.",
  },
  {
    icon: Sparkles,
    title: "Dynamic Rendering",
    description:
      "No static slides. Every visual is generated on-the-fly based on the student\u2019s specific struggle or question.",
  },
];

// ─── Stats for Social Proof ─────────────────────────────────────────────────
export const stats = [
  { value: "2.5x", label: "Faster concept mastery" },
  { value: "94%", label: "Student engagement rate" },
  { value: "< 2s", label: "Voice response latency" },
  { value: "24/7", label: "Available any time" },
];

// ─── Testimonials ────────────────────────────────────────────────────────────
export const testimonials = [
  {
    quote:
      "My daughter went from crying over math homework to actually requesting extra practice sessions. The difference is night and day.",
    name: "Sarah M.",
    role: "Parent of 7th grader",
    initials: "SM",
  },
  {
    quote:
      "The Socratic approach combined with real-time voice interaction creates a learning experience that feels genuinely human. This is the future of education technology.",
    name: "Dr. James Chen",
    role: "Education Researcher, Stanford",
    initials: "JC",
  },
  {
    quote:
      "I actually understand calculus now. Minerva doesn\u2019t just tell me the answer, she makes me figure it out myself, and it actually sticks.",
    name: "Alex T.",
    role: "11th grade student",
    initials: "AT",
  },
];

// ─── FAQ items ───────────────────────────────────────────────────────────────
export const faqItems = [
  {
    question: 'How "lifelike" is the avatar?',
    answer:
      "Powered by HeyGen\u2019s streaming technology, Minerva blinks, expresses emotions, and syncs her speech perfectly to her voice. Students often forget they are talking to an AI within the first 5 minutes.",
  },
  {
    question: "Can it help with competitive exams like SAT or AP?",
    answer:
      "Yes. Our curriculum engine includes dedicated modules for SAT Math and multiple AP subjects (BC Calculus, Statistics, Physics), with practice problems from past exams.",
  },
  {
    question: "What if my child gets stuck?",
    answer:
      "Minerva is specifically tuned to recognize frustration. If a student is stuck, she will drop the Socratic method temporarily to offer a supportive hint or visualize the concepts in a different way, ensuring the learning process remains fluid.",
  },
  {
    question: "How much does Minerva cost?",
    answer:
      "Minerva is currently free during our early access program. We\u2019re focused on building the best possible learning experience before introducing pricing. Sign up now to lock in early adopter benefits.",
  },
  {
    question: "Is my child\u2019s data safe?",
    answer:
      "Absolutely. All conversations are encrypted end-to-end. We never sell student data. Session recordings and transcripts are only accessible to the parent or guardian linked to the account. We comply with COPPA and FERPA regulations.",
  },
];

// ─── Parent portal checklist ─────────────────────────────────────────────────
export const parentChecklist = [
  "Set custom curriculum and goals (SAT, AP, State Exams)",
  "Real-time alerts for persistence roadblocks",
  "Weekly progress reports sent via WhatsApp/Email",
];

// ─── Footer nav links ───────────────────────────────────────────────────────
export const footerProductLinks = [
  { label: "How It Works", href: "#how-it-works" },
  { label: "Interactive Canvas", href: "#canvas" },
  { label: "Parent Portal", href: "#dashboard" },
  { label: "FAQ", href: "#faq" },
];

export const footerTechBadges = [
  "Zoom",
  "HeyGen",
  "Claude",
  "Next.js",
  "Supabase",
];
