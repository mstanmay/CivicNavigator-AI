// Dummy / mock data for UI preview — replace with real API calls

import type {
  PollingStation,
  InsightCard,
  Election,
  TimelineEvent,
  QuickChip,
  Message,
} from "@/types";

// ── Quick Action Chips ──────────────────────────────────────────────────────
export const QUICK_CHIPS: QuickChip[] = [
  {
    id: "register",
    label: "quick.register",
    query: "How do I register to vote?",
    icon: "📋",
  },
  {
    id: "documents",
    label: "quick.documents",
    query: "What ID documents do I need to bring to vote?",
    icon: "🪪",
  },
  {
    id: "polling",
    label: "quick.polling",
    query: "Where is my nearest polling place?",
    icon: "🏫",
  },
  {
    id: "steps",
    label: "quick.steps",
    query: "Walk me through the voting process step by step.",
    icon: "🗳️",
  },
  {
    id: "mail",
    label: "quick.mail",
    query: "How do I request an absentee or mail-in ballot?",
    icon: "📬",
  },
  {
    id: "rights",
    label: "quick.rights",
    query: "What are my voting rights if I am turned away at the polls?",
    icon: "⚖️",
  },
];

// ── Mock Polling Stations ───────────────────────────────────────────────────
// (Polling stations usually have real names, keep as is or prefix if needed)
export const MOCK_POLLING_STATIONS: PollingStation[] = [
  {
    id: "ps1",
    name: "Lincoln Community Center",
    address: "1215 Lincoln Blvd, Washington, DC 20001",
    lat: 38.9101,
    lng: -77.043,
    distance: "0.8 mi",
    duration: "4 min",
    isOpen: true,
    type: "polling",
  },
  {
    id: "ps2",
    name: "Martin Luther King Jr. Library",
    address: "901 G St NW, Washington, DC 20001",
    lat: 38.8977,
    lng: -77.0258,
    distance: "1.2 mi",
    duration: "7 min",
    isOpen: true,
    type: "earlyVoting",
  },
  {
    id: "ps3",
    name: "DC Board of Elections",
    address: "1015 Half St SE, Washington, DC 20003",
    lat: 38.8785,
    lng: -77.0024,
    distance: "2.4 mi",
    duration: "11 min",
    isOpen: false,
    type: "registrar",
  },
  {
    id: "ps4",
    name: "Capitol Hill Ballot Dropbox",
    address: "200 Maryland Ave NE, Washington, DC",
    lat: 38.8901,
    lng: -77.0013,
    distance: "3.1 mi",
    duration: "14 min",
    isOpen: true,
    type: "dropbox",
  },
];

// ── Mock Upcoming Election ──────────────────────────────────────────────────
export const NEXT_ELECTION: Election = {
  id: "e1",
  name: "2026 General Election",
  date: "November 3, 2026",
  type: "Federal & State",
  daysUntil: 185,
};

// ── Mock Timeline Events ────────────────────────────────────────────────────
export const TIMELINE_EVENTS: TimelineEvent[] = [
  { id: "t1", label: "timeline.checkRegistration", date: "Now",         status: "current" },
  { id: "t2", label: "timeline.registerUpdate",     date: "Oct 6, 2026", status: "upcoming" },
  { id: "t3", label: "timeline.requestMailBallot",  date: "Oct 20, 2026",status: "upcoming" },
  { id: "t4", label: "timeline.earlyVotingBegins",  date: "Oct 24, 2026",status: "upcoming" },
  { id: "t5", label: "timeline.electionDay",        date: "Nov 3, 2026", status: "upcoming" },
];

// ── Mock Insight Cards ──────────────────────────────────────────────────────
export const INSIGHT_CARDS: InsightCard[] = [
  {
    id: "i1",
    title: "insights.voterRegistration",
    description: "insights.voterRegistrationDesc",
    icon: "📋",
    color: "#4f7ef8",
    type: "steps",
  },
  {
    id: "i2",
    title: "insights.idRequirements",
    description: "insights.idRequirementsDesc",
    icon: "🪪",
    color: "#f5a623",
    type: "faq",
  },
  {
    id: "i3",
    title: "insights.pollingHours",
    description: "insights.pollingHoursDesc",
    icon: "🕐",
    color: "#10d06e",
    type: "faq",
  },
  {
    id: "i4",
    title: "insights.mailInVoting",
    description: "insights.mailInVotingDesc",
    icon: "📬",
    color: "#a78bfa",
    type: "steps",
  },
];

// ── Welcome message ─────────────────────────────────────────────────────────
export const WELCOME_MESSAGE: Message = {
  id: "welcome",
  role: "assistant",
  content:
    "👋 **Welcome to CivicNavigator AI!**\n\nI'm your nonpartisan election assistant, powered by Google Gemini. Ask me anything about:\n\n🏫 Finding your **polling place**\n📋 **Voter registration** requirements\n📅 Upcoming **election dates** and deadlines\n🪪 **Voter ID** rules in your state\n📬 **Mail-in / absentee** ballot requests\n⚖️ Your **voting rights**\n\nEnter your address in the search bar above, or tap a quick action to get started!",
  timestamp: new Date(),
  structured: {
    explanation:
      "I provide nonpartisan civic guidance powered by Google Gemini and real-time election data.",
    steps: [
      "Enter your address for location-aware results",
      "Ask any election question in plain English",
      "Click quick actions for instant answers",
      "View nearby polling places on the map",
    ],
  },
};

// ── Mock structured AI response ─────────────────────────────────────────────
export function getMockResponse(query: string): {
  content: string;
  structured: { explanation: string; steps: string[]; tips: string[] };
} {
  const lower = query.toLowerCase();

  if (lower.includes("register")) {
    return {
      content:
        "To **register to vote**, you'll need to complete a few simple steps. Most states allow online, mail, or in-person registration.",
      structured: {
        explanation:
          "Voter registration is the process of signing up to vote in your jurisdiction. Deadlines and methods vary by state.",
        steps: [
          "Visit vote.gov or your state's Secretary of State website",
          "Fill out the online registration form with your name, address, and date of birth",
          "Upload or submit a copy of your ID (if required)",
          "Confirm your registration via email or postcard",
          "Check your status at least 1 week before Election Day",
        ],
        tips: [
          "Register by October 6 — 28 days before the November election",
          "Update your registration if you've moved recently",
          "You can register at the DMV when getting/renewing your license",
        ],
      },
    };
  }

  if (lower.includes("id") || lower.includes("document")) {
    return {
      content:
        "**Accepted voter ID** varies by state, but here are the most commonly accepted forms.",
      structured: {
        explanation:
          "Most states require some form of identification at the polls, ranging from photo ID to utility bills.",
        steps: [
          "Government-issued photo ID (driver's license, passport)",
          "State-issued non-driver ID card",
          "Military or tribal ID",
          "Utility bill, bank statement, or paycheck with your name and address",
          "Student ID (accepted in some states)",
        ],
        tips: [
          "Check your specific state's requirements at ncsl.org/voter-id",
          "If you lack ID, many states allow provisional ballots",
          "Contact your county election office for free ID options",
        ],
      },
    };
  }

  if (lower.includes("poll") || lower.includes("booth") || lower.includes("where")) {
    return {
      content:
        "I can help you **find your polling place**! Your assigned polling location is based on your registered address.",
      structured: {
        explanation:
          "Every registered voter is assigned a specific polling place. You can find yours using your address.",
        steps: [
          "Visit vote.gov and enter your registered address",
          "Or text your address to 97779 (VOTES)",
          "Check if your polling place has changed since last election",
          "Confirm early voting options if available in your county",
          "Note the polling hours (usually 7 AM – 8 PM)",
        ],
        tips: [
          "Bring your sample ballot — you can mark it before entering the booth",
          "If your name isn't on the roll, request a provisional ballot",
          "Arrive early to avoid long lines on Election Day",
        ],
      },
    };
  }

  // Default fallback
  return {
    content:
      "I'd be happy to help with your civic question! Here's what I can tell you based on general election guidelines.",
    structured: {
      explanation:
        "CivicNavigator AI provides nonpartisan voting guidance using official election data sources.",
      steps: [
        "Ask me about voter registration, ID requirements, or polling locations",
        "Enter your address for location-specific answers",
        "Use the quick action chips for common topics",
        "Explore the map to find nearby civic locations",
      ],
      tips: [
        "For official state rules, visit your Secretary of State website",
        "Questions? Call the nonpartisan Election Protection hotline: 1-866-OUR-VOTE",
      ],
    },
  };
}
