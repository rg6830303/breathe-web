import { redirect } from "next/navigation";

// Coaching has been removed from Breathe Pickleball.
// Redirect anyone who lands on this URL back to the homepage.
export default function CoachingPage() {
  redirect("/");
}
