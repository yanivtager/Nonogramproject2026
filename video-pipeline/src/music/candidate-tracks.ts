import type { Mood } from "../data/types.js";

export interface CandidateTrack {
  id: string;
  title: string;
  mood: Mood;
  searchQuery: string;
  licenseSource: "pixabay";
  licenseProofUrl: string;
  notes: string;
}

export const CANDIDATE_TRACKS: CandidateTrack[] = [
  { id: "calm-01", title: "Calm puzzle focus bed", mood: "calm", searchQuery: "calm ambient focus instrumental", licenseSource: "pixabay", licenseProofUrl: "https://pixabay.com/service/license-summary/", notes: "Use for cozy, analog, and screen-free variants." },
  { id: "calm-02", title: "Soft paper-and-pencil ambience", mood: "calm", searchQuery: "soft piano ambient calm", licenseSource: "pixabay", licenseProofUrl: "https://pixabay.com/service/license-summary/", notes: "Low-distraction bed for caption-heavy videos." },
  { id: "calm-03", title: "Minimal logic loop", mood: "calm", searchQuery: "minimal ambient technology instrumental", licenseSource: "pixabay", licenseProofUrl: "https://pixabay.com/service/license-summary/", notes: "Works under narration when ducked aggressively." },
  { id: "energetic-01", title: "Fast reveal pulse", mood: "energetic", searchQuery: "upbeat electronic reveal instrumental", licenseSource: "pixabay", licenseProofUrl: "https://pixabay.com/service/license-summary/", notes: "Use for Spanish and high-energy solve reveals." },
  { id: "energetic-02", title: "Puzzle sprint beat", mood: "energetic", searchQuery: "upbeat pop beat instrumental short", licenseSource: "pixabay", licenseProofUrl: "https://pixabay.com/service/license-summary/", notes: "Good for first-second hook velocity." },
  { id: "energetic-03", title: "Arcade logic motion", mood: "energetic", searchQuery: "arcade electronic upbeat instrumental", licenseSource: "pixabay", licenseProofUrl: "https://pixabay.com/service/license-summary/", notes: "Use sparingly when the visual is simple." },
  { id: "cinematic-01", title: "Fantasy reveal tension", mood: "cinematic-tense", searchQuery: "cinematic fantasy tension instrumental", licenseSource: "pixabay", licenseProofUrl: "https://pixabay.com/service/license-summary/", notes: "Dragon and Titanic fantasy variants." },
  { id: "cinematic-02", title: "Hidden image suspense", mood: "cinematic-tense", searchQuery: "suspense cinematic ambient instrumental", licenseSource: "pixabay", licenseProofUrl: "https://pixabay.com/service/license-summary/", notes: "Use for before/after and slow reveal." },
  { id: "cinematic-03", title: "Epic grid scale", mood: "cinematic-tense", searchQuery: "epic cinematic trailer light instrumental", licenseSource: "pixabay", licenseProofUrl: "https://pixabay.com/service/license-summary/", notes: "Use for Scale Shock, low volume only." },
  { id: "playful-01", title: "Curiosity loop", mood: "playful", searchQuery: "playful quirky puzzle instrumental", licenseSource: "pixabay", licenseProofUrl: "https://pixabay.com/service/license-summary/", notes: "Good for comment-driven guess-the-image hooks." },
  { id: "playful-02", title: "Light reveal bounce", mood: "playful", searchQuery: "light upbeat playful instrumental", licenseSource: "pixabay", licenseProofUrl: "https://pixabay.com/service/license-summary/", notes: "Use for sample puzzles and broad audience variants." },
  { id: "healing-01", title: "Iyashi slow solve", mood: "healing", searchQuery: "healing ambient japanese calm instrumental", licenseSource: "pixabay", licenseProofUrl: "https://pixabay.com/service/license-summary/", notes: "Japanese variants; avoid aggressive sales feel." },
  { id: "healing-02", title: "Soft nostalgia bed", mood: "healing", searchQuery: "soft nostalgic ambient instrumental", licenseSource: "pixabay", licenseProofUrl: "https://pixabay.com/service/license-summary/", notes: "Japanese and cafe analog variants." },
  { id: "healing-03", title: "Gentle reveal texture", mood: "healing", searchQuery: "gentle relaxing ambient instrumental", licenseSource: "pixabay", licenseProofUrl: "https://pixabay.com/service/license-summary/", notes: "Good under slower narration." },
  { id: "calm-04", title: "Warm desk ambience", mood: "calm", searchQuery: "warm acoustic ambient instrumental", licenseSource: "pixabay", licenseProofUrl: "https://pixabay.com/service/license-summary/", notes: "Print Ritual and paper/desk visuals." },
  { id: "energetic-04", title: "Mobile-first hook beat", mood: "energetic", searchQuery: "short upbeat social media instrumental", licenseSource: "pixabay", licenseProofUrl: "https://pixabay.com/service/license-summary/", notes: "Portuguese mobile-legibility variants." },
  { id: "cinematic-04", title: "Wolf reveal atmosphere", mood: "cinematic-tense", searchQuery: "cinematic winter ambient instrumental", licenseSource: "pixabay", licenseProofUrl: "https://pixabay.com/service/license-summary/", notes: "Frozen Gaze and wildlife reveals." },
  { id: "playful-03", title: "Pixel-art curiosity", mood: "playful", searchQuery: "pixel art playful instrumental", licenseSource: "pixabay", licenseProofUrl: "https://pixabay.com/service/license-summary/", notes: "Use when solved art is the main payoff." },
  { id: "calm-05", title: "Low-volume subtitle bed", mood: "calm", searchQuery: "background ambient corporate calm instrumental", licenseSource: "pixabay", licenseProofUrl: "https://pixabay.com/service/license-summary/", notes: "Fallback when narration intelligibility is priority." },
  { id: "healing-04", title: "Quiet logic meditation", mood: "healing", searchQuery: "meditation calm ambient instrumental", licenseSource: "pixabay", licenseProofUrl: "https://pixabay.com/service/license-summary/", notes: "Slow Japanese and screen-free hooks." },
];
