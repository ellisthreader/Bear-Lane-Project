import HelpTopicPage from "./components/HelpTopicPage";

type Props = {
  support_articles?: Array<{
    id: number;
    title: string;
    slug: string;
    category: string;
    excerpt: string | null;
    body: string;
  }>;
};

export default function ReturnsRefunds({ support_articles = [] }: Props) {
  return <HelpTopicPage categoryKey="returns" support_articles={support_articles} />;
}
