import type { Metadata } from "next";
import ExampleWorkspace from "@/components/daybreak/ExampleWorkspace";
import { instantDate } from "@/lib/planner";

export const metadata: Metadata = { title: "Example week" };
export const dynamic = "force-dynamic";

export default function ExamplePage() {
  const now = new Date().toISOString();
  return <ExampleWorkspace today={instantDate(now)} now={now} />;
}
