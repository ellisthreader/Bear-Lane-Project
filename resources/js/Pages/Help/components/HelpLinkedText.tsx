import { Link } from "@inertiajs/react";
import { Fragment, type ReactNode } from "react";

type LinkRule = {
  phrase: string;
  href: string;
};

const LINK_RULES: LinkRule[] = [
  { phrase: "orders page", href: "/user-orders" },
  { phrase: "order history", href: "/user-orders" },
  { phrase: "tracking details", href: "/help/orders#track-order" },
  { phrase: "tracking link", href: "/help/orders#track-order" },
  { phrase: "live chat", href: "/help/livechat" },
  { phrase: "support page", href: "/support" },
  { phrase: "return policy", href: "/help/returns#return-policy" },
  { phrase: "payment methods", href: "/help/payments#payment-methods" },
];

type Match = {
  start: number;
  end: number;
  href: string;
  phrase: string;
};

function findMatches(text: string): Match[] {
  const lower = text.toLowerCase();
  const rules = [...LINK_RULES].sort((a, b) => b.phrase.length - a.phrase.length);
  const matches: Match[] = [];

  let cursor = 0;
  while (cursor < text.length) {
    let best: Match | null = null;

    for (const rule of rules) {
      const index = lower.indexOf(rule.phrase, cursor);
      if (index < 0) continue;

      const candidate: Match = {
        start: index,
        end: index + rule.phrase.length,
        href: rule.href,
        phrase: text.slice(index, index + rule.phrase.length),
      };

      if (!best || candidate.start < best.start) {
        best = candidate;
      }
    }

    if (!best) break;
    matches.push(best);
    cursor = best.end;
  }

  return matches;
}

type HelpLinkedTextProps = {
  text: string;
};

export default function HelpLinkedText({ text }: HelpLinkedTextProps) {
  const matches = findMatches(text);
  if (matches.length === 0) {
    return <>{text}</>;
  }

  const nodes: ReactNode[] = [];
  let cursor = 0;

  matches.forEach((match, index) => {
    if (match.start > cursor) {
      nodes.push(
        <Fragment key={`text-${index}`}>{text.slice(cursor, match.start)}</Fragment>
      );
    }

    nodes.push(
      <Link
        key={`link-${match.start}-${match.href}`}
        href={match.href}
        className="font-semibold text-[#7B5E24] underline decoration-[#D2B16B] decoration-1 underline-offset-2 hover:text-[#5E4618]"
      >
        {match.phrase}
      </Link>
    );

    cursor = match.end;
  });

  if (cursor < text.length) {
    nodes.push(<Fragment key="tail">{text.slice(cursor)}</Fragment>);
  }

  return <>{nodes}</>;
}
