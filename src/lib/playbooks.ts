/**
 * Playbooks — proven starting points, not templates for their own sake.
 *
 * Each one is a project that has actually worked in neighborhoods: what it
 * is, the first concrete step, and — importantly — *what help to ask for*,
 * because a vague ask is the most common reason an idea never gathers
 * anyone (see the AI Gardener's stall nudges, PRD §3.9).
 *
 * As real projects reach completion, their histories become the source for
 * new playbooks — the acknowledgment ledger turning into a cookbook.
 */

export type Playbook = {
  slug: string;
  emoji: string;
  title: string;
  /** Prefills the wizard's description. */
  description: string;
  category: string;
  help: "local" | "remote" | "both";
  /** The one thing to do first, shown as a tip. */
  firstStep: string;
  asks: string[];
};

export const PLAYBOOKS: Playbook[] = [
  {
    slug: "repair-cafe",
    emoji: "🔧",
    title: "Start a repair café",
    description:
      "One Saturday a month we fix things instead of throwing them out — toasters, torn hems, wobbly chairs, bikes. Bring something broken and we'll figure it out together. I'm looking for a few people who like fixing things and somewhere with tables and power we can borrow.",
    category: "community",
    help: "local",
    firstStep:
      "Pick one date and one room (a library, a church hall, a garage). A date makes it real.",
    asks: [
      "Someone handy with electronics",
      "Someone who sews",
      "A room with tables and power",
      "A few extension cords",
    ],
  },
  {
    slug: "community-garden",
    emoji: "🌱",
    title: "Turn a vacant lot into a garden",
    description:
      "There's an empty lot near us that could grow food instead of weeds. I'd like to build a few raised beds we all share — plant together, water on a rota, split whatever comes up. I've never done this before, so I need people who have.",
    category: "community",
    help: "local",
    firstStep:
      "Find out who owns the lot and what permission looks like — one phone call to the city usually answers it.",
    asks: [
      "Someone who's grown vegetables",
      "Wood or pallets for beds",
      "A truck for one afternoon",
      "Hands on planting day",
    ],
  },
  {
    slug: "walking-group",
    emoji: "🚶",
    title: "Start a weekly walking group",
    description:
      "A loop around the neighborhood, same time every week, any pace, no fitness required. I've been walking alone and it would be nicer with company. Kids, dogs and slow walkers all welcome.",
    category: "fitness",
    help: "local",
    firstStep:
      "Set the day, time and meeting spot now — even for two people. Consistency is the whole trick.",
    asks: ["Anyone who'll show up", "Someone to co-host when I can't"],
  },
  {
    slug: "little-free-pantry",
    emoji: "🥫",
    title: "Put up a little free pantry",
    description:
      "A weatherproof box where anyone can leave food they don't need and anyone can take what they do — no forms, no questions. I'll build the box if a few people help keep it stocked and tidy.",
    category: "community",
    help: "local",
    firstStep:
      "Find a host spot with a visible fence or wall, and one person willing to check it weekly.",
    asks: ["A spot to mount it", "Someone with basic tools", "Weekly checkers"],
  },
  {
    slug: "tool-library",
    emoji: "🧰",
    title: "Share a shelf of tools",
    description:
      "Most of us own a drill we use twice a year. I'd like to pool what we have so borrowing beats buying — a shared shelf, a simple sign-out list, and trust.",
    category: "community",
    help: "both",
    firstStep:
      "List five tools you'd lend today. A short real list starts this faster than a perfect system.",
    asks: ["Tools to pool", "Somewhere dry to keep them", "Someone to keep the list"],
  },
  {
    slug: "skill-swap",
    emoji: "🔁",
    title: "Run a skill swap evening",
    description:
      "You teach me spreadsheets, I teach you guitar. One evening a month where neighbors trade an hour of whatever they're good at — no money, just time for time.",
    category: "learning",
    help: "local",
    firstStep:
      "Ask three people what they could teach in an hour. Three yeses is enough to schedule it.",
    asks: ["People with an hour to teach", "A room for the evening"],
  },
  {
    slug: "senior-tech-hour",
    emoji: "💻",
    title: "Help older neighbors with tech",
    description:
      "One hour, one person, one phone — help someone video-call their grandkids, sort their photos, or stop the pop-ups. Patience matters more than expertise.",
    category: "learning",
    help: "local",
    firstStep:
      "Book a weekly hour somewhere older neighbors already go — a library, a community room, a café.",
    asks: ["Patient helpers", "A quiet table", "Someone to spread the word"],
  },
  {
    slug: "block-cleanup",
    emoji: "🧹",
    title: "Organize a park or block cleanup",
    description:
      "One hour, gloves and bags provided, coffee after. The place is ours and it looks like nobody's. Twelve people make it spotless in a morning.",
    category: "community",
    help: "local",
    firstStep:
      "Set the date and ask the city for bags and pickup — most will supply both for free.",
    asks: ["Bags and gloves", "Twelve pairs of hands", "Someone to bring coffee"],
  },
];

export function playbookBySlug(slug: string): Playbook | undefined {
  return PLAYBOOKS.find((p) => p.slug === slug);
}
