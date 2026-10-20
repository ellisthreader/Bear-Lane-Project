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

export default function AccountManagement({ support_articles = [] }: Props) {
  return <HelpTopicPage categoryKey="account" support_articles={support_articles} />;
}
