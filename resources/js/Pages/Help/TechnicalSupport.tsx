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

export default function TechnicalSupport({ support_articles = [] }: Props) {
  return <HelpTopicPage categoryKey="technical" support_articles={support_articles} />;
}
