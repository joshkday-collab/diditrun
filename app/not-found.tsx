import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-full max-w-lg flex-col justify-center gap-4 px-4 py-24">
      <h1 className="font-heading text-4xl">Nothing here</h1>
      <p className="text-muted-foreground">
        If you were pinging a check, the UUID was missing or not a v4. We do
        not create checks from guessed URLs.
      </p>
      <Link href="/" className={cn(buttonVariants(), "w-fit")}>
        Back to DidItRun
      </Link>
    </div>
  );
}
