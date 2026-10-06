import { redirect } from "next/navigation";
import { SettingsForm } from "@/components/settings-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSessionUser } from "@/lib/auth";
import { checkLimit } from "@/lib/plans";
import { readyStore } from "@/lib/store";

export default async function SettingsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const store = await readyStore();
  const intents = await store.listBillingIntents(user.id);

  return (
    <div className="grid gap-8">
      <div>
        <h1 className="font-heading text-3xl">Alert channels</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Email is live as Resend-or-stub. Telegram is a channel stub until
          Josh unlocks the bot token. SMS is out of week 1.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Email</CardTitle>
        </CardHeader>
        <CardContent>
          <SettingsForm alertEmail={user.alertEmail} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Telegram</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Stub only. A live bot needs a token on the Josh unlock list. The
          channel is reserved so week-2 wiring does not change the data model.
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Plan</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Current plan: <strong className="text-foreground">{user.plan}</strong>{" "}
          · {checkLimit(user.plan)} checks. Upgrade intents recorded:{" "}
          {intents.length === 0
            ? "none"
            : intents
                .map((intent) => `${intent.plan} ${intent.status}`)
                .join(", ")}
          .
        </CardContent>
      </Card>
    </div>
  );
}
