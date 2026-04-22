import { CheckCircle2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { getStripePaymentLink } from "@/lib/lemonsqueezy";

const plans = [
  {
    name: "Starter",
    price: "$5",
    cadence: "/release",
    description: "Ship clean release notes when you need them, without changing your PR workflow.",
    bullets: [
      "Generate notes from any tag range",
      "Includes PR + direct commit analysis",
      "Markdown output ready for GitHub Releases"
    ],
    badge: "Best for occasional releases"
  },
  {
    name: "Maintainer",
    price: "$19",
    cadence: "/month",
    description: "Unlimited monthly usage for projects that ship every week.",
    bullets: [
      "Unlimited release note generations",
      "Usage dashboard with monthly totals",
      "Priority support for parser edge cases"
    ],
    badge: "Best value"
  }
];

export function PricingCards() {
  const paymentLink = getStripePaymentLink();

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {plans.map((plan) => (
        <Card key={plan.name} className="border-slate-800 bg-[#101722]">
          <CardHeader>
            <Badge variant="secondary" className="w-fit">
              {plan.badge}
            </Badge>
            <CardTitle className="mt-3 text-2xl">{plan.name}</CardTitle>
            <CardDescription>{plan.description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-3xl font-semibold text-slate-100">
              {plan.price}
              <span className="ml-1 text-base font-normal text-slate-400">{plan.cadence}</span>
            </p>
            <ul className="space-y-2 text-sm text-slate-300">
              {plan.bullets.map((bullet) => (
                <li key={bullet} className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          </CardContent>
          <CardFooter>
            <Button asChild className="w-full" variant="default">
              <a href={paymentLink || "#"} target="_blank" rel="noreferrer">
                Buy With Stripe Checkout
              </a>
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}
