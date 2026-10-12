import { redirect } from "next/navigation";

// No landing page yet: the closet is the app's home.
export default function Home() {
  redirect("/closet");
}
