export type HelpArticle = {
  id: string;
  title: string;
  excerpt: string;
  content: string[];
};

export type HelpCategoryKey =
  | "orders"
  | "returns"
  | "account"
  | "payments"
  | "technical"
  | "privacy";

export type HelpCategory = {
  key: HelpCategoryKey;
  title: string;
  route: string;
  description: string;
  articles: HelpArticle[];
};

export const HELP_CATEGORIES: HelpCategory[] = [
  {
    key: "orders",
    title: "Orders & Shipping",
    route: "/help/orders",
    description: "Delivery timelines, order updates, tracking and international shipping.",
    articles: [
      {
        id: "delivery-info",
        title: "Delivery Information",
        excerpt: "How long processing and delivery usually takes.",
        content: [
          "Orders are processed in 1 to 3 business days, then prepared for dispatch with tracking.",
          "Standard UK shipping usually arrives in 3 to 7 business days. International delivery can take 7 to 14 business days depending on destination and customs.",
          "During launches or holiday periods, dispatch may take a little longer. Your tracking link is always sent as soon as your parcel leaves our warehouse.",
        ],
      },
      {
        id: "track-order",
        title: "How do I track my order?",
        excerpt: "Where to find your tracking number and live delivery updates.",
        content: [
          "Open your Orders page and select the order to view carrier and tracking details.",
          "You can also track directly from your shipping confirmation email.",
          "If tracking has not updated after 48 hours, contact support and include your order number.",
        ],
      },
      {
        id: "change-order",
        title: "Change my order or delivery address",
        excerpt: "What changes are possible before and after dispatch.",
        content: [
          "We can update size, item, or address only before the parcel is handed to the courier.",
          "Once shipped, changes are no longer guaranteed and will depend on carrier controls.",
          "Contact support immediately with your order number and requested change.",
        ],
      },
      {
        id: "international-customs",
        title: "Customs and import fees",
        excerpt: "International taxes and duties explained.",
        content: [
          "International orders may incur customs duties, VAT, or brokerage fees set by local authorities.",
          "These fees are determined by your country and are paid by the recipient.",
          "For exact estimates, check your local customs guidance before ordering.",
        ],
      },
      {
        id: "gift-packaging",
        title: "Gift Packaging",
        excerpt: "Luxury gift wrapping options and what is included.",
        content: [
          "Gift orders are individually wrapped in our luxury Bear Lane gift wrapping for a premium unboxing experience.",
          "Each gift package includes a gift receipt, price tags removed, and can include a custom message left inside the box.",
          "Gift packaging pricing may vary depending on the number of products in your order and selected presentation options.",
        ],
      },
    ],
  },
  {
    key: "returns",
    title: "Returns & Refunds",
    route: "/help/returns",
    description: "Eligibility windows, refund timing, and exchange guidance.",
    articles: [
      {
        id: "return-policy",
        title: "Return policy",
        excerpt: "What qualifies for return and when.",
        content: [
          "Most items can be returned within 30 days of delivery if unused and in original packaging.",
          "Personalised products, gift cards and marked final-sale pieces are non-returnable.",
          "Include your order number and reason for return when contacting support.",
        ],
      },
      {
        id: "refund-processing",
        title: "Refund processing time",
        excerpt: "How quickly refunds are issued once your return arrives.",
        content: [
          "After inspection, refunds are processed in 5 to 7 business days.",
          "Your bank or payment provider may need additional time to post funds.",
          "You will receive an email confirmation once your refund has been submitted.",
        ],
      },
      {
        id: "exchange-item",
        title: "Exchanges",
        excerpt: "How to replace an item for a different size or colour.",
        content: [
          "Exchanges are available for eligible items while stock lasts.",
          "If your requested option is unavailable, we can process a refund instead.",
          "Contact support with your order number and preferred replacement item.",
        ],
      },
      {
        id: "refund-status",
        title: "Check refund status",
        excerpt: "Where to monitor your refund.",
        content: [
          "Refund status appears in your order history once the return is received and reviewed.",
          "If your refund is delayed beyond 10 business days, contact support.",
        ],
      },
    ],
  },
  {
    key: "account",
    title: "Account Management",
    route: "/help/account",
    description: "Registration, login recovery, profile settings and account safety.",
    articles: [
      {
        id: "create-account",
        title: "Create an account",
        excerpt: "Set up your Bear Lane account in minutes.",
        content: [
          "Use the registration page and enter your email, password and profile details.",
          "Once verified, you can manage orders, addresses, saved payments and wishlist from your profile.",
        ],
      },
      {
        id: "reset-password",
        title: "Reset password",
        excerpt: "Recover access quickly and securely.",
        content: [
          "Choose Forgot Password on the login screen and follow the reset email link.",
          "If email is delayed, check spam/junk and ensure you entered the correct email address.",
        ],
      },
      {
        id: "update-details",
        title: "Update account details",
        excerpt: "Change email, name, password and saved profile data.",
        content: [
          "Open your Profile area to update personal details.",
          "For security changes like email and password, you may be asked to verify your identity.",
        ],
      },
      {
        id: "delete-account",
        title: "Delete account",
        excerpt: "How permanent account removal works.",
        content: [
          "Account deletion permanently removes your profile data from your account view.",
          "Some transaction records may be retained where legally required.",
          "Contact support to request secure deletion.",
        ],
      },
    ],
  },
  {
    key: "payments",
    title: "Payments & Billing",
    route: "/help/payments",
    description: "Accepted payment methods, invoices, failed payments and billing support.",
    articles: [
      {
        id: "payment-methods",
        title: "Accepted payment methods",
        excerpt: "Cards and digital wallets currently supported.",
        content: [
          "We support major debit and credit cards plus selected wallet providers.",
          "All payment processing uses encrypted, PCI-compliant providers.",
        ],
      },
      {
        id: "invoice-access",
        title: "Invoices and receipts",
        excerpt: "How to download your order invoice.",
        content: [
          "Invoices are sent by email after checkout and available in your order history.",
          "If you need a business invoice update, contact support with your order number.",
        ],
      },
      {
        id: "payment-failed",
        title: "Payment failed",
        excerpt: "What to check when a card payment is declined.",
        content: [
          "Verify billing address, card number, expiry date and available funds.",
          "Try a different payment method or contact your card provider for more detail.",
        ],
      },
      {
        id: "billing-help",
        title: "Billing support",
        excerpt: "Resolving duplicate charges and unusual payment events.",
        content: [
          "If you see pending duplicates, most clear automatically within a few business days.",
          "For unresolved billing issues, contact support with order number and payment reference.",
        ],
      },
    ],
  },
  {
    key: "technical",
    title: "Technical Support",
    route: "/help/technical",
    description: "Browser issues, app glitches, bug reports and feature requests.",
    articles: [
      {
        id: "troubleshooting",
        title: "Troubleshoot common issues",
        excerpt: "Quick steps to fix most loading and checkout issues.",
        content: [
          "Refresh the page, clear cache/cookies, or try private browsing.",
          "Update your browser to the latest version and check connection stability.",
          "If the issue persists, share screenshots and exact steps with support.",
        ],
      },
      {
        id: "report-bug",
        title: "Report a bug",
        excerpt: "How to submit a high-quality bug report.",
        content: [
          "Include page URL, browser/device, and the exact steps that reproduced the issue.",
          "Attach screenshots or screen recordings if possible.",
        ],
      },
      {
        id: "email-notifications",
        title: "Not receiving emails or notifications",
        excerpt: "Checklist for delivery and notification settings.",
        content: [
          "Check spam/junk and add Bear Lane to your safe sender list.",
          "For mobile push issues, confirm app notification permissions are enabled.",
        ],
      },
      {
        id: "feature-request",
        title: "Suggest a feature",
        excerpt: "Share improvements you want to see next.",
        content: [
          "We review feature suggestions regularly when planning product updates.",
          "Submit your idea via support and include the problem you are trying to solve.",
        ],
      },
    ],
  },
  {
    key: "privacy",
    title: "Privacy & Security",
    route: "/help/privacy",
    description: "Data handling, cookies, account security and privacy controls.",
    articles: [
      {
        id: "privacy-overview",
        title: "Privacy overview",
        excerpt: "How Bear Lane handles personal information.",
        content: [
          "We use your data to deliver orders, manage accounts, and improve customer support.",
          "We do not sell personal data to third parties.",
          "Where needed to run the service, we share limited data with processors such as payment, shipping, moderation, maps, email, and OAuth providers.",
        ],
      },
      {
        id: "data-collected",
        title: "Data we collect",
        excerpt: "What information is stored and why.",
        content: [
          "Common data includes name, email, order details and saved preferences.",
          "Payment data is processed by secure payment providers and not stored as raw card details in your profile.",
          "Support messages and uploads may be checked by automated moderation systems to keep the platform safe.",
        ],
      },
      {
        id: "security-practices",
        title: "Security practices",
        excerpt: "Encryption and internal access controls.",
        content: [
          "Traffic is protected using SSL/TLS encryption.",
          "Access to sensitive operational data is restricted to authorised personnel.",
          "Sensitive return evidence links are time-limited and access-controlled.",
        ],
      },
      {
        id: "delete-my-data",
        title: "Delete my data",
        excerpt: "Request account and data removal.",
        content: [
          "You can request deletion through support.",
          "Where required by law, limited records may be retained for compliance and fraud prevention.",
          "You can also ask for a copy of your data and request corrections.",
        ],
      },
      {
        id: "cookies",
        title: "Cookies and Cookie Preferences",
        excerpt: "How cookies are used and where to manage your preferences.",
        content: [
          "We use essential and analytics cookies to keep the site secure, improve performance, and personalise your browsing experience.",
          "You can manage your cookie choices any time from the Cookie Preferences link in the footer under Customer Services.",
          "If you disable certain cookies, some site features may not function exactly as expected.",
          "Your cookie choice is recorded so we can respect it on future visits.",
        ],
      },
    ],
  },
];

export const HELP_FAQS = [
  {
    question: "How do I track my order?",
    answer:
      "Open your order history and select an order to view the live tracking link and carrier updates.",
  },
  {
    question: "What is your return window?",
    answer:
      "Most products can be returned within 30 days of delivery if unused and in original packaging.",
  },
  {
    question: "When will I get my refund?",
    answer:
      "Refunds are usually processed within 5 to 7 business days after your returned item is checked.",
  },
  {
    question: "Can I edit my order after placing it?",
    answer:
      "We can usually update orders before dispatch. Contact support immediately with your order number.",
  },
  {
    question: "How do I contact support?",
    answer:
      "Use the Support page form or live chat. Include your order number for faster resolution.",
  },
];

export const flattenHelpArticles = () =>
  HELP_CATEGORIES.flatMap((category) =>
    category.articles.map((article) => ({
      ...article,
      categoryTitle: category.title,
      categoryRoute: category.route,
      link: `${category.route}#${article.id}`,
    }))
  );

export const getHelpCategory = (key: HelpCategoryKey) =>
  HELP_CATEGORIES.find((category) => category.key === key)!;
