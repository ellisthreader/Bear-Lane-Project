import { Link, usePage } from "@inertiajs/react";
import axios from "axios";
import {
  CircleHelp,
  ImagePlus,
  MessageCircle,
  Package,
  RefreshCcw,
  SendHorizonal,
  ShoppingBag,
  Truck,
  UserRound,
  X,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "react-toastify";
import { v4 as uuidv4 } from "uuid";
import HelpShell from "./components/HelpShell";
import { SIZE_GUIDE_DATA } from "@/Pages/Product/SizeGuide/sizeGuideData";
import type { GenderKey } from "@/Pages/Product/SizeGuide/types";

type Message = {
  id: number | string;
  chat_id?: number;
  user_id: number | null;
  username: string;
  avatar?: string | null;
  sender_type: "guest" | "user" | "admin" | "system";
  is_image?: boolean;
  image_url?: string | null;
  content: string;
  created_at: string;
};

type QuickOption = {
  id: string;
  label: string;
  icon: ReactNode;
  action:
    | { type: "main"; key: MainMenuKey }
    | { type: "sub"; key: MainMenuKey; topic: string }
    | { type: "article"; href: string }
    | { type: "size_guide"; gender: GenderKey }
    | { type: "need_help" }
    | { type: "back_main" };
};

type MainMenuKey = "order" | "product" | "returns" | "delivery" | "something_else";

type MenuConfig = {
  prompt: string;
  options: Array<{
    label: string;
    articleLabel: string;
    href: string;
  }>;
};

const MENU_CONFIG: Record<Exclude<MainMenuKey, "something_else">, MenuConfig> = {
  order: {
    prompt: "What would you like help with regarding your order?",
    options: [
      { label: "Amend Order", articleLabel: "Order changes", href: "/help/orders#change-order" },
      { label: "Cancel Order", articleLabel: "Order changes", href: "/help/orders#change-order" },
      { label: "Update Order Details", articleLabel: "Order changes", href: "/help/orders#change-order" },
      { label: "Track Order", articleLabel: "Track your order", href: "/help/orders#track-order" },
      { label: "Change Delivery Address", articleLabel: "Order changes", href: "/help/orders#change-order" },
      { label: "Change Payment Method", articleLabel: "Payments help", href: "/help/payments#payment-methods" },
    ],
  },
  product: {
    prompt: "What can I help you with about a product?",
    options: [
      { label: "Faulty Product", articleLabel: "Return policy", href: "/help/returns#return-policy" },
      { label: "Product Not As Described", articleLabel: "Exchanges", href: "/help/returns#exchange-item" },
      { label: "Product Information", articleLabel: "Technical support", href: "/help/technical#troubleshooting" },
      { label: "Sizing & Specifications", articleLabel: "Product guidance", href: "/help/technical" },
      { label: "Stock Availability", articleLabel: "Support contact", href: "/support" },
      { label: "Warranty Information", articleLabel: "Returns policy", href: "/help/returns#return-policy" },
    ],
  },
  returns: {
    prompt: "I can help with returns and refunds. Please choose an option below:",
    options: [
      { label: "Start a Return", articleLabel: "Return policy", href: "/help/returns#return-policy" },
      { label: "Return Status", articleLabel: "Refund status", href: "/help/returns#refund-status" },
      { label: "Refund Status", articleLabel: "Refund status", href: "/help/returns#refund-status" },
      { label: "Exchange an Item", articleLabel: "Exchanges", href: "/help/returns#exchange-item" },
      { label: "Return Policy Information", articleLabel: "Return policy", href: "/help/returns#return-policy" },
    ],
  },
  delivery: {
    prompt: "What delivery issue can I assist you with?",
    options: [
      { label: "Track Delivery", articleLabel: "Track your order", href: "/help/orders#track-order" },
      { label: "Delayed Delivery", articleLabel: "Delivery information", href: "/help/orders#delivery-info" },
      { label: "Missing Parcel", articleLabel: "Delivery support", href: "/support" },
      { label: "Delivery Address Issue", articleLabel: "Order changes", href: "/help/orders#change-order" },
      { label: "Courier Information", articleLabel: "Delivery information", href: "/help/orders#delivery-info" },
    ],
  },
};

const MAIN_MENU_OPTIONS: QuickOption[] = [
  { id: "main-order", label: "Order", icon: <Package className="h-4 w-4" />, action: { type: "main", key: "order" } },
  { id: "main-product", label: "Product", icon: <ShoppingBag className="h-4 w-4" />, action: { type: "main", key: "product" } },
  { id: "main-returns", label: "Returns & Refunds", icon: <RefreshCcw className="h-4 w-4" />, action: { type: "main", key: "returns" } },
  { id: "main-delivery", label: "Delivery", icon: <Truck className="h-4 w-4" />, action: { type: "main", key: "delivery" } },
  { id: "main-other", label: "Something Else", icon: <CircleHelp className="h-4 w-4" />, action: { type: "main", key: "something_else" } },
];

const BOT_AVATAR = "/images/Admin/support-bot.svg";
const DEFAULT_AGENT_AVATAR = "/images/DefaultPicture.png";
const LIVECHAT_STORAGE_KEY = "livechat_active_chat_id";
const LIVECHAT_CONTEXT_KEY = "livechat_context_v1";
const LIVECHAT_SNAPSHOT_KEY = "livechat_snapshot_v1";
const LIVECHAT_INTRO_PENDING_KEY = "livechat_intro_pending_v1";

type StoredLiveChatContext = {
  conversationContext: string[];
  allowFreeText: boolean;
  transferredToAgent: boolean;
};

type StoredLiveChatSnapshot = {
  chatId: number | null;
  messages: Message[];
  conversationContext: string[];
  allowFreeText: boolean;
  transferredToAgent: boolean;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const getStoredChatId = (): number | null => {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(LIVECHAT_STORAGE_KEY);
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const setStoredChatId = (chatId: number | null) => {
  if (typeof window === "undefined") return;
  if (chatId && chatId > 0) {
    window.localStorage.setItem(LIVECHAT_STORAGE_KEY, String(chatId));
    return;
  }
  window.localStorage.removeItem(LIVECHAT_STORAGE_KEY);
};

const getStoredChatContext = (): StoredLiveChatContext => {
  if (typeof window === "undefined") {
    return {
      conversationContext: [],
      allowFreeText: false,
      transferredToAgent: false,
    };
  }

  try {
    const raw = window.localStorage.getItem(LIVECHAT_CONTEXT_KEY);
    if (!raw) {
      return {
        conversationContext: [],
        allowFreeText: false,
        transferredToAgent: false,
      };
    }

    const parsed = JSON.parse(raw) as Partial<StoredLiveChatContext> | null;
    const context = Array.isArray(parsed?.conversationContext)
      ? parsed!.conversationContext.filter((value) => typeof value === "string").slice(-20)
      : [];

    return {
      conversationContext: context,
      allowFreeText: Boolean(parsed?.allowFreeText),
      transferredToAgent: Boolean(parsed?.transferredToAgent),
    };
  } catch {
    return {
      conversationContext: [],
      allowFreeText: false,
      transferredToAgent: false,
    };
  }
};

const setStoredChatContext = (context: StoredLiveChatContext) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LIVECHAT_CONTEXT_KEY, JSON.stringify(context));
};

const clearStoredChatContext = () => {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(LIVECHAT_CONTEXT_KEY);
};

const getStoredLiveChatSnapshot = (): StoredLiveChatSnapshot | null => {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(LIVECHAT_SNAPSHOT_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<StoredLiveChatSnapshot> | null;
    if (!parsed || typeof parsed !== "object") return null;

    const messages = Array.isArray(parsed.messages)
      ? parsed.messages.filter((message) =>
        Boolean(message)
        && typeof (message as Message).id !== "undefined"
        && typeof (message as Message).content === "string"
        && typeof (message as Message).created_at === "string"
      ) as Message[]
      : [];

    const chatIdRaw = parsed.chatId;
    const chatId =
      typeof chatIdRaw === "number" && Number.isFinite(chatIdRaw) && chatIdRaw > 0
        ? chatIdRaw
        : null;

    const conversationContext = Array.isArray(parsed.conversationContext)
      ? parsed.conversationContext.filter((value) => typeof value === "string").slice(-20)
      : [];

    return {
      chatId,
      messages: messages.slice(-300),
      conversationContext,
      allowFreeText: Boolean(parsed.allowFreeText),
      transferredToAgent: Boolean(parsed.transferredToAgent),
    };
  } catch {
    return null;
  }
};

const setStoredLiveChatSnapshot = (snapshot: StoredLiveChatSnapshot) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LIVECHAT_SNAPSHOT_KEY, JSON.stringify(snapshot));
};

const clearStoredLiveChatSnapshot = () => {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(LIVECHAT_SNAPSHOT_KEY);
};

const setIntroPending = (isPending: boolean) => {
  if (typeof window === "undefined") return;
  if (isPending) {
    window.localStorage.setItem(LIVECHAT_INTRO_PENDING_KEY, "1");
    return;
  }
  window.localStorage.removeItem(LIVECHAT_INTRO_PENDING_KEY);
};

const recoverIfIntroWasInterrupted = () => {
  if (typeof window === "undefined") return;
  const isPending = window.localStorage.getItem(LIVECHAT_INTRO_PENDING_KEY) === "1";
  if (!isPending) return;

  window.localStorage.removeItem(LIVECHAT_INTRO_PENDING_KEY);
  window.localStorage.removeItem(LIVECHAT_STORAGE_KEY);
  window.localStorage.removeItem(LIVECHAT_CONTEXT_KEY);
  window.localStorage.removeItem(LIVECHAT_SNAPSHOT_KEY);
};

export default function Livechat() {
  recoverIfIntroWasInterrupted();
  const persistedContext = getStoredChatContext();
  const persistedSnapshot = getStoredLiveChatSnapshot();
  const page = usePage<any>();
  const authUser = page.props?.auth?.user;
  const isAuthenticated = Boolean(authUser?.id);

  const [messages, setMessages] = useState<Message[]>(() => persistedSnapshot?.messages || []);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [chatId, setChatId] = useState<number | null>(
    () => persistedSnapshot?.chatId ?? getStoredChatId()
  );
  const [chatDeleted, setChatDeleted] = useState(false);
  const [deletedAt, setDeletedAt] = useState<string | null>(null);
  const [chatDeleter, setChatDeleter] = useState<string | null>(null);
  const [closedChatId, setClosedChatId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [transcriptEmail, setTranscriptEmail] = useState("");
  const [sendingTranscript, setSendingTranscript] = useState(false);
  const [transcriptStatus, setTranscriptStatus] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [botTyping, setBotTyping] = useState(false);
  const [quickOptions, setQuickOptions] = useState<QuickOption[]>([]);
  const [allowFreeText, setAllowFreeText] = useState(
    () => persistedSnapshot?.allowFreeText ?? persistedContext.allowFreeText
  );
  const [transferredToAgent, setTransferredToAgent] = useState(
    () => persistedSnapshot?.transferredToAgent ?? persistedContext.transferredToAgent
  );
  const [isTransferring, setIsTransferring] = useState(false);
  const [conversationContext, setConversationContext] = useState<string[]>(
    () => persistedSnapshot?.conversationContext ?? persistedContext.conversationContext
  );
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSizeGuideOpen, setIsSizeGuideOpen] = useState(false);
  const [sizeGuideGender, setSizeGuideGender] = useState<GenderKey>("men");
  const [sendTimestamps, setSendTimestamps] = useState<number[]>([]);
  const [spamBlockedUntil, setSpamBlockedUntil] = useState<number | null>(null);

  const SPAM_WINDOW_MS = 12_000;
  const SPAM_LIMIT = 6;
  const SPAM_COOLDOWN_MS = 25_000;

  const introStartedRef = useRef(false);
  const chatBodyRef = useRef<HTMLDivElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const seenMessageIdsRef = useRef<Set<string>>(new Set());
  const hasHydratedMessagesRef = useRef(false);

  const [guestId] = useState(() => {
    const getCookie = (name: string) => {
      const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
      return match ? match[2] : null;
    };

    let id = getCookie("chat_session_id");
    if (!id) {
      id = uuidv4();
      document.cookie = `chat_session_id=${id}; path=/; max-age=${60 * 60 * 24 * 7}`;
    }
    return id;
  });

  const scrollToBottom = () => {
    const container = chatBodyRef.current;
    if (!container) return;
    container.scrollTo({
      top: container.scrollHeight,
      behavior: "smooth",
    });
  };

  const updateChatId = (nextChatId: number | null) => {
    setChatId(nextChatId);
  };

  const resetChatContext = () => {
    setConversationContext([]);
    setAllowFreeText(false);
    setTransferredToAgent(false);
    setQuickOptions([]);
    clearStoredChatContext();
    clearStoredLiveChatSnapshot();
  };

  const showInappropriateContentToast = () => {
    toast.error("Content innapropriate, message was not sent", {
      position: "top-center",
      autoClose: 3200,
    });
  };

  const showInappropriateImageToast = (reason?: string) => {
    const cleanedReason =
      typeof reason === "string" && reason.trim() ? reason.trim() : "content policy restrictions";
    toast.error(`Image was not appropraite: ${cleanedReason}`, {
      position: "top-center",
      autoClose: 3800,
    });
  };

  const showModerationUnavailableToast = () => {
    toast.error("Image safety checks are temporarily unavailable. Please try again.", {
      position: "top-center",
      autoClose: 3200,
    });
  };

  const playChatSound = (type: "sent" | "received") => {
    try {
      const AudioCtx =
        (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;

      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioCtx();
      }
      const ctx: AudioContext = audioCtxRef.current;
      if (ctx.state === "suspended") {
        void ctx.resume();
      }

      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();

      oscillator.type = "sine";
      oscillator.frequency.value = type === "sent" ? 720 : 560;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.06, ctx.currentTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.16);

      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.start();
      oscillator.stop(ctx.currentTime + 0.18);
    } catch (error) {
      // Ignore sound failures - chat should continue normally.
    }
  };

  const isInboundMessageForCurrentViewer = (message: Message) => {
    if (isAuthenticated && Boolean(authUser?.is_admin)) {
      return (
        message.sender_type === "guest"
        || message.sender_type === "user"
        || message.sender_type === "system"
      );
    }

    return message.sender_type === "admin" || message.sender_type === "system";
  };

  const appendMessage = (message: Message) => {
    const messageId = String(message.id);
    seenMessageIdsRef.current.add(messageId);
    setMessages((prev) => (prev.some((entry) => entry.id === message.id) ? prev : [...prev, message]));
  };

  const updateMessageContent = (id: string, content: string) => {
    setMessages((prev) =>
      prev.map((message) => (message.id === id ? { ...message, content } : message))
    );
  };

  const addUserContext = (entry: string) => {
    setConversationContext((prev) => {
      const next = [...prev, entry].slice(-20);
      return next;
    });
  };

  const addSystemMessage = (content: string, timestamp?: string) => {
    setMessages((prev) => {
      const exists = prev.some(
        (message) => message.sender_type === "system" && message.content === content
      );
      if (exists) return prev;

      return [
        ...prev,
        {
          id: `system_${Date.now()}_${Math.random()}`,
          user_id: null,
          username: "System",
          sender_type: "system",
          content,
          created_at: timestamp || new Date().toISOString(),
        },
      ];
    });
  };

  const typeBotMessage = async (content: string) => {
    const id = `bot_${Date.now()}_${Math.random()}`;
    appendMessage({
      id,
      chat_id: chatId ?? undefined,
      user_id: null,
      username: "BearLane AI",
      sender_type: "admin",
      content: "",
      created_at: new Date().toISOString(),
    });

    setBotTyping(true);
    for (let i = 1; i <= content.length; i++) {
      updateMessageContent(id, content.slice(0, i));
      await sleep(16 + Math.floor(Math.random() * 24));
    }
    setBotTyping(false);
    await sleep(140);
  };

  const showMainMenu = async () => {
    setAllowFreeText(false);
    setQuickOptions([]);
    await typeBotMessage("Please choose one of the options below so I can guide you quickly.");
    setQuickOptions(MAIN_MENU_OPTIONS);
  };

  const sendToServer = async (content: string) => {
    const response = await axios.post("/livechat/message", {
      message: content,
      chat_id: chatId || undefined,
      guest_id: guestId,
    });

    if (response.data.chat_id) {
      updateChatId(Number(response.data.chat_id));
    }

    if (response.data.message) {
      appendMessage(response.data.message as Message);
    }
  };

  const transferToAgent = async (reason: string, options?: { announce?: boolean }) => {
    if (transferredToAgent || chatDeleted || isTransferring) return;
    const announce = options?.announce !== false;

    setIsTransferring(true);
    setQuickOptions([]);
    setAllowFreeText(true);

    if (announce) {
      await typeBotMessage("Transferring you to a Bear Lane support agent now. Please hold for a moment.");
    }

    const summaryLines = [
      "[AI HANDOVER REQUEST]",
      `Reason: ${reason}`,
      "Customer context:",
      ...conversationContext.map((entry) => `- ${entry}`),
    ];

    try {
      await sendToServer(summaryLines.join("\n"));
      setTransferredToAgent(true);
      setError(null);
      if (announce) {
        await typeBotMessage("You are now connected to our support team. Please share any extra details below.");
      }
      return;
    } catch (requestError) {
      try {
        await axios.get("/livechat/messages", { params: { guest_id: guestId } });
        await sendToServer(summaryLines.join("\n"));
        setTransferredToAgent(true);
        setError(null);
        if (announce) {
          await typeBotMessage("You are now connected to our support team. Please share any extra details below.");
        }
        return;
      } catch (retryError) {
        console.error("Transfer failed", retryError);
        const responseMessage = (retryError as any)?.response?.data?.message
          || (requestError as any)?.response?.data?.message;
        const isModerationBlocked =
          ((retryError as any)?.response?.status === 422 && Boolean((retryError as any)?.response?.data?.warning))
          || ((requestError as any)?.response?.status === 422 && Boolean((requestError as any)?.response?.data?.warning));
        if (isModerationBlocked) {
          showInappropriateContentToast();
          setError(null);
          return;
        }
        setError(
          typeof responseMessage === "string" && responseMessage.trim()
            ? responseMessage
            : "Could not transfer to a support agent right now."
        );
      }
    } finally {
      setIsTransferring(false);
    }
  };

  const handleTopicSelection = async (mainKey: Exclude<MainMenuKey, "something_else">, topic: string) => {
    addUserContext(`${mainKey.toUpperCase()}: ${topic}`);
    setQuickOptions([]);

    const option = MENU_CONFIG[mainKey].options.find((entry) => entry.label === topic);
    const href = option?.href || "/help";
    const articleLabel = option?.articleLabel || "related help article";

    if (mainKey === "order" && topic !== "Track Order") {
      setAllowFreeText(true);
      await typeBotMessage("Okay, please describe the the change to your order,\nan Agent will be with you shortly");
      await transferToAgent(`Order request: ${topic}`, { announce: false });
      return;
    }

    if (mainKey === "product" && topic === "Sizing & Specifications") {
      await typeBotMessage("Please choose a size guide category below.");
      setQuickOptions([
        {
          id: "size-guide-men",
          label: "Men",
          icon: <CircleHelp className="h-4 w-4" />,
          action: { type: "size_guide", gender: "men" },
        },
        {
          id: "size-guide-women",
          label: "Women",
          icon: <CircleHelp className="h-4 w-4" />,
          action: { type: "size_guide", gender: "women" },
        },
        {
          id: "size-guide-kids",
          label: "Kids",
          icon: <CircleHelp className="h-4 w-4" />,
          action: { type: "size_guide", gender: "kids" },
        },
        {
          id: "size-guide-back-main",
          label: "Back to main menu",
          icon: <MessageCircle className="h-4 w-4" />,
          action: { type: "back_main" },
        },
      ]);
      return;
    }

    await typeBotMessage(
      `Thanks. I can help with ${topic.toLowerCase()}. I found a ${articleLabel} article that should solve this quickly.`
    );

    setQuickOptions([
      {
        id: `article-${mainKey}-${topic}`,
        label: `Open: ${articleLabel}`,
        icon: <CircleHelp className="h-4 w-4" />,
        action: { type: "article", href },
      },
      {
        id: `need-help-${mainKey}-${topic}`,
        label: "Need more help",
        icon: <UserRound className="h-4 w-4" />,
        action: { type: "need_help" },
      },
      {
        id: `back-main-${mainKey}-${topic}`,
        label: "Back to main menu",
        icon: <MessageCircle className="h-4 w-4" />,
        action: { type: "back_main" },
      },
    ]);
  };

  const handleMainSelection = async (key: MainMenuKey) => {
    if (key === "something_else") {
      setQuickOptions([]);
      setAllowFreeText(true);
      await typeBotMessage(
        "Please type what you need help with.\nI will find the closest help article, and you can then choose Need more help or Back to main menu."
      );
      return;
    }

    const config = MENU_CONFIG[key];
    setAllowFreeText(false);
    setQuickOptions([]);
    await typeBotMessage(config.prompt);

    setQuickOptions([
      ...config.options.map((entry, index) => ({
        id: `sub-${key}-${index}`,
        label: entry.label,
        icon: <CircleHelp className="h-4 w-4" />,
        action: { type: "sub", key, topic: entry.label },
      })),
      {
        id: `sub-${key}-back-main`,
        label: "Back to main menu",
        icon: <MessageCircle className="h-4 w-4" />,
        action: { type: "back_main" },
      },
    ]);
  };

  const handleOptionClick = async (option: QuickOption) => {
    if (isTransferring) return;

    appendMessage({
      id: `local_user_${Date.now()}_${Math.random()}`,
      user_id: null,
      username: "You",
      sender_type: "guest",
      content: option.label,
      created_at: new Date().toISOString(),
    });

    if (option.action.type === "main") {
      await handleMainSelection(option.action.key);
      return;
    }

    if (option.action.type === "sub") {
      await handleTopicSelection(option.action.key, option.action.topic);
      return;
    }

    if (option.action.type === "article") {
      window.location.href = option.action.href;
      return;
    }

    if (option.action.type === "size_guide") {
      const selectedGender = option.action.gender;
      const label = selectedGender.charAt(0).toUpperCase() + selectedGender.slice(1);
      setSizeGuideGender(selectedGender);
      setIsSizeGuideOpen(true);
      await typeBotMessage(`Opening the ${label} size guide now.`);
      return;
    }

    if (option.action.type === "need_help") {
      await transferToAgent("Customer clicked Need more help");
      return;
    }

    if (option.action.type === "back_main") {
      await showMainMenu();
    }
  };

  const suggestArticleFromText = (input: string) => {
    const normalized = input.toLowerCase();
    const compact = normalized.replace(/[^a-z]/g, "");

    if (
      normalized.includes("track")
      || normalized.includes("delivery")
      || normalized.includes("ordweer")
      || compact.includes("trackorder")
      || compact.includes("trackordweer")
    ) {
      return { href: "/help/orders#track-order", label: "Track your order" };
    }
    if (normalized.includes("refund") || normalized.includes("return")) {
      return { href: "/help/returns#refund-status", label: "Returns & refund help" };
    }
    if (normalized.includes("payment") || normalized.includes("card")) {
      return { href: "/help/payments#payment-methods", label: "Payment methods" };
    }
    if (normalized.includes("account") || normalized.includes("password")) {
      return { href: "/help/account#reset-password", label: "Account help" };
    }
    return { href: "/help", label: "Help Centre" };
  };

  const runIntro = async () => {
    if (introStartedRef.current) return;
    introStartedRef.current = true;
    setIntroPending(true);

    try {
      setQuickOptions([]);
      await typeBotMessage("Welcome to BearLane Support.\nI’m your dedicated AI assistant.");
      await typeBotMessage("I’m here to provide fast, seamless assistance with your enquiry.");
      await typeBotMessage("Please select an option below to continue.");
      setQuickOptions(MAIN_MENU_OPTIONS);
    } finally {
      setIntroPending(false);
    }
  };

  const fetchMessages = async (attempt = 0, forcedChatId?: number | null) => {
    const requestedChatId =
      forcedChatId !== undefined
        ? forcedChatId
        : chatId;

    try {
      const response = await axios.get("/livechat/messages", {
        params: { guest_id: guestId, chat_id: requestedChatId || undefined },
      });

      const incomingChatId = Number(response.data.chat_id || 0);
      if (!chatId && incomingChatId) {
        updateChatId(incomingChatId);
      }

      const incomingMessages = (response.data.messages || []) as Message[];
      let hasNewInboundMessage = false;
      for (const message of incomingMessages) {
        const messageId = String(message.id);
        const alreadySeen = seenMessageIdsRef.current.has(messageId);
        if (
          !alreadySeen
          && hasHydratedMessagesRef.current
          && isInboundMessageForCurrentViewer(message)
        ) {
          hasNewInboundMessage = true;
        }
        seenMessageIdsRef.current.add(messageId);
      }
      if (hasNewInboundMessage) {
        playChatSound("received");
      }

      setMessages((prev) => {
        if (prev.length === 0) return incomingMessages;

        const byId = new Map<string, Message>();
        for (const message of prev) {
          byId.set(String(message.id), message);
        }
        for (const message of incomingMessages) {
          byId.set(String(message.id), message);
        }

        return Array.from(byId.values()).sort(
          (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
      });

      const hasAgentMessages = incomingMessages.some((message) => message.sender_type === "admin");
      if (hasAgentMessages) {
        setTransferredToAgent(true);
        setAllowFreeText(true);
        setQuickOptions([]);
      }

      if (response.data.chat_deleted) {
        const deletedChatId = requestedChatId || incomingChatId || chatId || null;
        const deletedAtValue = response.data.deleted_at || new Date().toISOString();
        const closedBy = response.data.deleted_by === "Guest" ? "You" : "Admin";
        setChatDeleted(true);
        setDeletedAt(deletedAtValue);
        setChatDeleter(closedBy);
        addSystemMessage(
          `Chat closed by ${closedBy} at ${new Date(deletedAtValue).toLocaleString("en-US")}.`,
          deletedAtValue
        );
        setClosedChatId(deletedChatId);
        updateChatId(null);
        resetChatContext();
      } else {
        setChatDeleted(false);
        setClosedChatId(null);
      }

      setError(null);

      const hasAnyVisibleMessages = incomingMessages.length > 0 || messages.length > 0;
      if (!hasAnyVisibleMessages && !incomingChatId) {
        await runIntro();
      }

      hasHydratedMessagesRef.current = true;
    } catch (requestError) {
      const responseStatus = (requestError as any)?.response?.status;
      const hasPinnedChat = Boolean(requestedChatId);

      // Recover from stale/unauthorized/deleted saved chat ids by resetting chat context
      // and retrying once without chat_id.
      if ((responseStatus === 403 || responseStatus === 404) && hasPinnedChat && attempt < 1) {
        updateChatId(null);
        hasHydratedMessagesRef.current = false;
        await fetchMessages(attempt + 1, null);
        return;
      }

      console.error("Live chat fetch failed", requestError);
      setError("Could not load live chat messages.");
    }
  };

  useEffect(() => {
    void fetchMessages();
  }, []);

  useEffect(() => {
    if (!chatId || chatDeleted) return;
    const interval = window.setInterval(() => {
      void fetchMessages();
    }, 2500);

    return () => window.clearInterval(interval);
  }, [chatId, chatDeleted]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      scrollToBottom();
    }, 40);
    return () => window.clearTimeout(timer);
  }, [messages.length, quickOptions.length, botTyping]);

  useEffect(() => {
    if (!transferredToAgent || chatDeleted) {
      clearStoredChatContext();
      return;
    }

    setStoredChatContext({
      conversationContext: conversationContext.slice(-20),
      allowFreeText,
      transferredToAgent,
    });
  }, [conversationContext, allowFreeText, transferredToAgent, chatDeleted]);

  useEffect(() => {
    if (chatDeleted || !transferredToAgent) {
      clearStoredLiveChatSnapshot();
      return;
    }
    setStoredLiveChatSnapshot({
      chatId,
      messages: messages.slice(-300),
      conversationContext: conversationContext.slice(-20),
      allowFreeText,
      transferredToAgent,
    });
  }, [chatId, messages, conversationContext, allowFreeText, transferredToAgent, chatDeleted]);

  useEffect(() => {
    if (!transferredToAgent || chatDeleted || !chatId) {
      setStoredChatId(null);
      return;
    }

    setStoredChatId(chatId);
  }, [chatId, transferredToAgent, chatDeleted]);

  useEffect(() => {
    if (!isSizeGuideOpen) return;

    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsSizeGuideOpen(false);
      }
    };

    window.addEventListener("keydown", onEscape);
    return () => {
      window.removeEventListener("keydown", onEscape);
    };
  }, [isSizeGuideOpen]);

  useEffect(() => {
    if (!chatId || !isAuthenticated) return;

    const echo = (window as any).Echo;
    if (!echo) return;

    const channel = echo.private(`livechat.${chatId}`);

    channel.listen(".MessageSent", (event: Message) => {
      const eventId = String(event.id);
      const alreadySeen = seenMessageIdsRef.current.has(eventId);
      appendMessage(event);
      if (!alreadySeen && isInboundMessageForCurrentViewer(event)) {
        playChatSound("received");
      }
      if (event.sender_type === "admin") {
        setTransferredToAgent(true);
        setAllowFreeText(true);
        setQuickOptions([]);
      }
      if (event.sender_type !== "admin") {
        scrollToBottom();
      }
    });

    channel.listen(".ChatDeleted", (event: { deleted_by: string; deleted_at?: string }) => {
      const deletedAtValue = event.deleted_at || new Date().toISOString();
      const closedBy = event.deleted_by === "Guest" ? "You" : "Admin";
      setChatDeleted(true);
      setDeletedAt(deletedAtValue);
      setChatDeleter(closedBy);
      addSystemMessage(
        `Chat closed by ${closedBy} at ${new Date(deletedAtValue).toLocaleString("en-US")}.`,
        deletedAtValue
      );
      setClosedChatId(chatId);
      updateChatId(null);
      resetChatContext();
    });

    return () => {
      channel.stopListening(".MessageSent");
      channel.stopListening(".ChatDeleted");
      echo.leave(`livechat.${chatId}`);
    };
  }, [chatId, isAuthenticated]);

  const sendMessage = async () => {
    if (!newMessage.trim() || chatDeleted || botTyping) return;

    const now = Date.now();
    if (spamBlockedUntil && now < spamBlockedUntil) {
      const waitSeconds = Math.ceil((spamBlockedUntil - now) / 1000);
      setError(`Please slow down. You can send another message in ${waitSeconds}s.`);
      return;
    }

    const recent = sendTimestamps.filter((timestamp) => now - timestamp < SPAM_WINDOW_MS);
    if (recent.length >= SPAM_LIMIT) {
      const blockedUntil = now + SPAM_COOLDOWN_MS;
      setSpamBlockedUntil(blockedUntil);
      setError("You are sending messages too quickly. Please wait a moment before sending again.");
      return;
    }
    setSendTimestamps([...recent, now]);

    const content = newMessage.trim();
    setNewMessage("");
    setLoading(true);

    try {
      addUserContext(`Typed message: ${content}`);

      if (transferredToAgent) {
        await sendToServer(content);
        scrollToBottom();
      } else if (allowFreeText) {
        const isOrderContext = conversationContext.some((entry) => entry.startsWith("ORDER:"));
        if (isOrderContext) {
          await transferToAgent("Order amendment typed by customer", { announce: false });
          await sendToServer(content);
          setError(null);
          scrollToBottom();
          return;
        }

        const suggestion = suggestArticleFromText(content);
        await typeBotMessage(
          "Thanks for the details. I found a related support article that may help immediately."
        );

        setQuickOptions([
          {
            id: "free-article",
            label: `Open: ${suggestion.label}`,
            icon: <CircleHelp className="h-4 w-4" />,
            action: { type: "article", href: suggestion.href },
          },
          {
            id: "free-need-help",
            label: "Need more help",
            icon: <UserRound className="h-4 w-4" />,
            action: { type: "need_help" },
          },
          {
            id: "free-back-main",
            label: "Back to main menu",
            icon: <MessageCircle className="h-4 w-4" />,
            action: { type: "back_main" },
          },
        ]);
      } else {
        await typeBotMessage("Please select one of the menu options below so I can assist you accurately.");
        setQuickOptions(MAIN_MENU_OPTIONS);
      }

      setError(null);
    } catch (requestError) {
      console.error("Live chat send failed", requestError);
      const responseStatus = (requestError as any)?.response?.status;
      const responseMessage = (requestError as any)?.response?.data?.message;
      const isModerationBlocked =
        responseStatus === 422 && Boolean((requestError as any)?.response?.data?.warning);
      if (isModerationBlocked) {
        showInappropriateContentToast();
        setError(null);
      } else if (responseStatus === 429) {
        setError(responseMessage || "You are sending messages too quickly. Please wait and try again.");
      } else if (typeof responseMessage === "string" && responseMessage.trim()) {
        setError(responseMessage);
      } else {
        setError("Could not send message. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const closeChatSession = async () => {
    if (!chatId) {
      const deletedAtValue = new Date().toISOString();
      setChatDeleted(true);
      setDeletedAt(deletedAtValue);
      setChatDeleter("You");
      addSystemMessage(`Chat closed by You at ${new Date(deletedAtValue).toLocaleString("en-US")}.`, deletedAtValue);
      setClosedChatId(null);
      updateChatId(null);
      resetChatContext();
      return;
    }

    try {
      await axios.delete(`/livechat/${chatId}`, {
        data: { guest_id: guestId },
      });
      const deletedAtValue = new Date().toISOString();
      setChatDeleted(true);
      setDeletedAt(deletedAtValue);
      setChatDeleter("You");
      addSystemMessage(`Chat closed by You at ${new Date(deletedAtValue).toLocaleString("en-US")}.`, deletedAtValue);
      setClosedChatId(chatId);
      updateChatId(null);
      resetChatContext();
      setError(null);
      setTranscriptStatus(null);
    } catch (requestError: any) {
      if (requestError?.response?.status === 404) {
        const deletedAtValue = new Date().toISOString();
        setChatDeleted(true);
        setDeletedAt(deletedAtValue);
        setChatDeleter("You");
        addSystemMessage(`Chat closed by You at ${new Date(deletedAtValue).toLocaleString("en-US")}.`, deletedAtValue);
        setClosedChatId(chatId);
        updateChatId(null);
        resetChatContext();
        return;
      }
      console.error("Live chat close failed", requestError);
      setError("Could not close this chat right now.");
    }
  };

  const sendTranscript = async () => {
    const transcriptChatId = chatId || closedChatId;
    if (!transcriptChatId || sendingTranscript) return;

    setSendingTranscript(true);
    setTranscriptStatus(null);
    try {
      const response = await axios.post(`/livechat/${transcriptChatId}/transcript`, {
        guest_id: guestId,
        email: isAuthenticated ? undefined : transcriptEmail.trim() || undefined,
      });
      const sentTo = response.data?.email || (isAuthenticated ? authUser?.email : transcriptEmail.trim());
      setTranscriptStatus(
        sentTo
          ? `Transcript sent to ${sentTo}.`
          : "Transcript sent successfully."
      );
      setError(null);
    } catch (requestError: any) {
      const message =
        requestError?.response?.data?.message || "Could not send transcript right now.";
      setTranscriptStatus(message);
    } finally {
      setSendingTranscript(false);
    }
  };

  const isInputDisabled = useMemo(
    () => loading || botTyping || chatDeleted,
    [loading, botTyping, chatDeleted]
  );

  const startNewChat = async () => {
    updateChatId(null);
    resetChatContext();
    setMessages([]);
    setChatDeleted(false);
    setDeletedAt(null);
    setChatDeleter(null);
    setClosedChatId(null);
    setError(null);
    setTranscriptStatus(null);
    setTranscriptEmail("");
    hasHydratedMessagesRef.current = false;
    introStartedRef.current = false;
    await runIntro();
    scrollToBottom();
  };

  const uploadImage = async (file: File) => {
    if (chatDeleted) return;

    const formData = new FormData();
    formData.append("image", file);
    formData.append("guest_id", guestId);
    if (chatId) {
      formData.append("chat_id", String(chatId));
    }

    setUploadingImage(true);
    try {
      const response = await axios.post("/livechat/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      if (response.data.chat_id) {
        updateChatId(Number(response.data.chat_id));
      }

      if (response.data.message) {
        appendMessage(response.data.message as Message);
      }
      setError(null);
      scrollToBottom();
    } catch (requestError) {
      console.error("Live chat image upload failed", requestError);
      const responseStatus = (requestError as any)?.response?.status;
      const responseMessage = (requestError as any)?.response?.data?.message;
      const moderationReason = (requestError as any)?.response?.data?.reason;
      const isModerationBlocked =
        responseStatus === 422 && Boolean((requestError as any)?.response?.data?.warning);
      const isModerationUnavailable =
        responseStatus === 503
        && typeof responseMessage === "string"
        && responseMessage.toLowerCase().includes("moderation");
      if (isModerationBlocked) {
        showInappropriateImageToast(moderationReason);
        setError(null);
      } else if (isModerationUnavailable) {
        showModerationUnavailableToast();
        setError(null);
      } else if (typeof responseMessage === "string" && responseMessage.trim()) {
        setError(responseMessage);
      } else {
        setError("Could not upload image. Please try again.");
      }
    } finally {
      setUploadingImage(false);
    }
  };

  const supportJoined = useMemo(
    () =>
      messages.some(
        (message) => {
          const normalizedUsername = (message.username || "").trim().toLowerCase();
          const isHumanAgentMessage =
            message.sender_type === "admin"
            && normalizedUsername !== ""
            && normalizedUsername !== "bearlane ai";

          return (
          (message.sender_type === "system" &&
            message.content.toLowerCase().includes("support agent joined"))
          || isHumanAgentMessage
          );
        }
      ),
    [messages]
  );

  const activeAgentMessage = useMemo(
    () =>
      [...messages]
        .reverse()
        .find(
          (message) => {
            const normalizedUsername = (message.username || "").trim().toLowerCase();
            const isHumanAgentMessage =
              message.sender_type === "admin"
              && normalizedUsername !== ""
              && normalizedUsername !== "bearlane ai";

            return (
              isHumanAgentMessage
              || (message.sender_type === "system" &&
                message.content.toLowerCase().includes("support agent joined"))
            );
          }
        ) || null,
    [messages]
  );

  const headerAvatar = supportJoined
    ? activeAgentMessage?.avatar || DEFAULT_AGENT_AVATAR
    : BOT_AVATAR;
  const headerRole = supportJoined ? "Support Agent" : "AI Assistant";
  const headerName = supportJoined
    ? activeAgentMessage?.username || "BearLane Support"
    : "Bear Lane AI Chatbot";
  const activeSizeGuide = SIZE_GUIDE_DATA[sizeGuideGender];
  const closedSummary = `Chat closed by ${chatDeleter || "Unknown"} at ${
    deletedAt ? new Date(deletedAt).toLocaleString("en-US") : "just now"
  }`;

  return (
    <HelpShell
      title="Live Chat"
      eyebrow="Help Centre"
      description="Talk to support in real time. Our AI assistant can guide you instantly and transfer you to a live agent when needed."
      showBackToHelp={false}
      compactTop
    >
      <div className={isExpanded ? "w-full" : "mx-auto w-full max-w-4xl"}>
        <div
          className="relative overflow-hidden rounded-3xl border border-[#E6DCC4] bg-white shadow-[0_18px_50px_rgba(120,88,28,0.14)]"
        >
          <header className="flex flex-col gap-3 border-b border-[#E8DEC9] bg-gradient-to-r from-[#FFF8E6] via-[#FFFDF8] to-[#FFF8E6] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div className="flex min-w-0 items-center gap-3">
              <img loading="lazy" decoding="async"
                src={headerAvatar}
                alt={headerName}
                className="h-11 w-11 rounded-full border border-[#E3D5B7] bg-white object-cover"
              />
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.13em] text-[#8E7747]">{headerRole}</p>
                <h2 className="mt-0.5 truncate text-base font-semibold text-[#261F14]">{headerName}</h2>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsExpanded((prev) => !prev)}
                className="inline-flex items-center gap-2 rounded-xl border border-[#E1D4B8] bg-white px-2.5 py-2 text-xs font-semibold uppercase tracking-wide text-[#6A5940] transition hover:border-[#CDAA64] hover:text-[#3B3022] sm:px-3"
              >
                {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                <span className="hidden sm:inline">{isExpanded ? "Exit Fullscreen" : "Expand"}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  void closeChatSession();
                }}
                disabled={chatDeleted}
                className="inline-flex items-center gap-2 rounded-xl border border-[#E1D4B8] bg-white px-2.5 py-2 text-xs font-semibold uppercase tracking-wide text-[#6A5940] transition hover:border-[#CDAA64] hover:text-[#3B3022] disabled:cursor-not-allowed disabled:opacity-60 sm:px-3"
              >
                <X className="h-4 w-4" />
                <span className="hidden sm:inline">Close Chat</span>
              </button>
            </div>
          </header>

          <div
            ref={chatBodyRef}
            className={`${isExpanded ? "h-[74dvh] sm:h-[78vh]" : "h-[58dvh] min-h-[360px] sm:h-[520px]"} relative overflow-y-auto bg-[#FAF8F2] px-3 py-4 sm:px-5 sm:py-5`}
          >
            <div className="space-y-3">
              {messages.length === 0 ? (
                <p className="text-center text-sm text-[#7E715A]">
                  Initializing Bear Lane AI assistant...
                </p>
              ) : null}

              {messages.map((message) => {
                const fromUser = message.sender_type === "guest" || message.sender_type === "user";
                const isSystem = message.sender_type === "system";

                if (isSystem) {
                  return (
                    <p key={message.id} className="text-center text-xs italic text-[#8A7D67]">
                      {message.content}
                    </p>
                  );
                }

                return (
                  <div key={message.id} className={`flex ${fromUser ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[90%] rounded-2xl px-3 py-2.5 text-sm leading-relaxed sm:max-w-[80%] sm:px-4 sm:py-3 ${
                        fromUser
                          ? "rounded-br-sm bg-[#B89443] text-white"
                          : "rounded-bl-sm border border-[#E7DCC2] bg-white text-[#3B3124]"
                      }`}
                    >
                      <p className={`mb-1 text-[11px] font-semibold uppercase tracking-[0.11em] ${fromUser ? "text-white/80" : "text-[#8A7344]"}`}>
                        {fromUser ? "You" : message.username || "Bear Lane AI"}
                      </p>
                      {message.is_image && message.image_url ? (
                        <a href={message.image_url} target="_blank" rel="noreferrer">
                          <img loading="lazy" decoding="async"
                            src={message.image_url}
                            alt="Chat upload"
                            className="max-h-72 w-auto rounded-xl border border-[#E5D9C0] bg-white object-contain"
                          />
                        </a>
                      ) : (
                        message.content
                      )}
                    </div>
                  </div>
                );
              })}

              {botTyping ? (
                <p className="text-xs italic text-[#8B7E66]">Bear Lane AI is typing...</p>
              ) : null}

              <AnimatePresence>
                {quickOptions.length > 0 && !chatDeleted && !transferredToAgent && !isTransferring ? (
                  <motion.div
                    key="quick-options"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    className="space-y-2 pt-2"
                  >
                    {quickOptions.map((option, index) => (
                      <motion.button
                        key={option.id}
                        type="button"
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        onClick={() => {
                          void handleOptionClick(option);
                        }}
                        className="flex w-full items-center gap-2 rounded-2xl border border-[#E6D9BE] bg-white px-4 py-3 text-left text-sm font-medium text-[#3A3022] shadow-[0_4px_16px_rgba(80,56,18,0.10)] transition hover:-translate-y-0.5 hover:border-[#D3B87B] hover:shadow-[0_8px_22px_rgba(80,56,18,0.14)]"
                      >
                        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#F6EDD8] text-[#8A6D2B]">
                          {option.icon}
                        </span>
                        <span>{option.label}</span>
                      </motion.button>
                    ))}
                  </motion.div>
                ) : null}
              </AnimatePresence>

              <div ref={messagesEndRef} />
            </div>
          </div>

          {!chatDeleted ? (
            <footer className="border-t border-[#E8DEC9] bg-white px-3 py-3 sm:px-4 sm:py-4">
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) {
                      void uploadImage(file);
                    }
                    event.target.value = "";
                  }}
                />
                <input
                  type="text"
                  value={newMessage}
                  onChange={(event) => setNewMessage(event.target.value)}
                  onKeyDown={(event) => event.key === "Enter" && void sendMessage()}
                  placeholder={transferredToAgent ? "Write to support agent..." : "Type your message..."}
                  disabled={isInputDisabled}
                  className="order-1 h-12 w-full rounded-2xl border border-[#E1D4B8] bg-[#FFFEFB] px-4 text-sm text-[#2F281E] outline-none transition focus:border-[#C9A85B] disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto sm:flex-1"
                />
                <button
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  disabled={isInputDisabled || uploadingImage}
                  className="order-2 inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl border border-[#E1D4B8] bg-[#FFFEFB] px-3 text-sm font-semibold text-[#6A541F] transition hover:border-[#C9A85B] disabled:cursor-not-allowed disabled:opacity-60 sm:flex-none"
                >
                  <ImagePlus className="h-4 w-4" />
                  {uploadingImage ? "Uploading..." : "Image"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    void sendMessage();
                  }}
                  disabled={isInputDisabled || !newMessage.trim()}
                  className="order-3 inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-[#B89443] px-4 text-sm font-semibold text-white transition hover:bg-[#A58335] disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none"
                >
                  <SendHorizonal className="h-4 w-4" />
                  Send
                </button>
              </div>
              {error ? <p className="mt-2 text-sm text-[#9A2F2F]">{error}</p> : null}
            </footer>
          ) : (
            <div className="border-t border-[#E8DEC9] bg-[#FFF8E9] px-4 py-4 text-sm text-[#5C4D34]">
              <p>{closedSummary}</p>
              <div className="mt-3 rounded-xl border border-[#E5D8BE] bg-white p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8A6D2B]">Email Transcript</p>
                {!isAuthenticated ? (
                  <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                    <input
                      type="email"
                      value={transcriptEmail}
                      onChange={(event) => setTranscriptEmail(event.target.value)}
                      placeholder="Enter your email (required for guests)"
                      className="h-10 flex-1 rounded-xl border border-[#E1D4B8] bg-[#FFFEFB] px-3 text-sm text-[#2F281E] outline-none focus:border-[#C9A85B]"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        void sendTranscript();
                      }}
                      disabled={sendingTranscript || !(chatId || closedChatId)}
                      className="inline-flex h-10 items-center justify-center rounded-xl bg-[#B89443] px-4 text-sm font-semibold text-white transition hover:bg-[#A58335] disabled:opacity-60"
                    >
                      {sendingTranscript ? "Sending..." : "Send Transcript"}
                    </button>
                  </div>
                ) : (
                  <div className="mt-2">
                    <button
                      type="button"
                      onClick={() => {
                        void sendTranscript();
                      }}
                      disabled={sendingTranscript || !(chatId || closedChatId)}
                      className="inline-flex h-10 items-center justify-center rounded-xl bg-[#B89443] px-4 text-sm font-semibold text-white transition hover:bg-[#A58335] disabled:opacity-60"
                    >
                      {sendingTranscript ? "Sending..." : "Email Transcript"}
                    </button>
                  </div>
                )}
                {transcriptStatus ? <p className="mt-2 text-xs text-[#6A5A3A]">{transcriptStatus}</p> : null}
                <button
                  type="button"
                  onClick={() => {
                    void startNewChat();
                  }}
                  className="mt-3 inline-flex h-10 items-center justify-center rounded-xl bg-[#B89443] px-4 text-sm font-semibold text-white transition hover:bg-[#A58335]"
                >
                  Start New Chat
                </button>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-4">
                <Link href="/help" className="font-semibold text-[#7B5E24] hover:underline">
                  Return to Help Centre
                </Link>
                <Link href="/support" className="font-semibold text-[#7B5E24] hover:underline">
                  Send an email instead
                </Link>
              </div>
            </div>
          )}

        </div>

        {chatDeleter ? (
          <p className="mt-3 text-center text-xs text-[#7B6F58]">Last closed by: {chatDeleter}</p>
        ) : null}
      </div>
      {isSizeGuideOpen ? (
        <div className="fixed inset-0 z-[95] bg-black/55 p-4" role="dialog" aria-modal="true" aria-label="Size guide">
          <div className="mx-auto flex h-full w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-[#E8DAB8] bg-[#FFFCF6] shadow-[0_30px_70px_rgba(33,25,13,0.35)]">
            <header className="relative border-b border-[#E9DFC8] bg-gradient-to-r from-[#FFF2D7] via-[#FFF8EA] to-[#FDF2D7] px-5 pb-4 pt-5">
              <button
                type="button"
                onClick={() => setIsSizeGuideOpen(false)}
                className="absolute right-4 top-4 rounded-full border border-[#D9C79E] bg-white/80 p-2 text-[#5C4B27] transition hover:bg-white"
                aria-label="Close size guide"
              >
                <X className="h-4 w-4" />
              </button>
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#8A6A2F]">Size Guide</p>
              <h3 className="mt-1 text-2xl font-black text-[#271D0F]">{activeSizeGuide.heading}</h3>
              <p className="mt-1 text-sm text-[#5F4D29]">{activeSizeGuide.subtitle}</p>
              <div className="mt-4 flex gap-2">
                {(["men", "women", "kids"] as const).map((gender) => (
                  <button
                    key={gender}
                    type="button"
                    onClick={() => setSizeGuideGender(gender)}
                    className={`rounded-xl border px-3 py-1.5 text-xs font-semibold uppercase tracking-wide ${
                      sizeGuideGender === gender
                        ? "border-[#CFAF67] bg-[#FFF1CC] text-[#6A541F]"
                        : "border-[#E5D7B8] bg-white text-[#6F6248]"
                    }`}
                  >
                    {gender}
                  </button>
                ))}
              </div>
            </header>
            <div className="flex-1 space-y-4 overflow-y-auto bg-[#FFFDF9] p-4">
              {activeSizeGuide.sections.map((section) => {
                if (section.kind === "note") {
                  return (
                    <section key={section.id} className="rounded-2xl border border-[#E8DCC3] bg-white p-4">
                      <h4 className="text-base font-bold text-[#2F2415]">{section.title}</h4>
                      <p className="mt-2 text-sm leading-relaxed text-[#5C4C31]">{section.text}</p>
                    </section>
                  );
                }

                return (
                  <section key={section.id} className="rounded-2xl border border-[#E8DCC3] bg-white p-4">
                    <h4 className="text-base font-bold text-[#2F2415]">{section.title}</h4>
                    <div className="mt-3 overflow-x-auto rounded-xl border border-[#EFE5D2]">
                      <table className="min-w-full border-collapse text-sm">
                        <thead>
                          <tr className="bg-[#FBF4E5]">
                            {section.columns.map((column) => (
                              <th
                                key={column}
                                className="whitespace-nowrap border-b border-[#EFE5D2] px-3 py-2 text-left text-[11px] font-bold uppercase tracking-[0.08em] text-[#6A5530]"
                              >
                                {column}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {section.rows.map((row, rowIndex) => (
                            <tr key={`${section.id}-${rowIndex}`} className={rowIndex % 2 === 0 ? "bg-white" : "bg-[#FFFCF5]"}>
                              {row.map((cell, cellIndex) => (
                                <td key={`${section.id}-${rowIndex}-${cellIndex}`} className="whitespace-nowrap border-b border-[#F2EBDD] px-3 py-2 text-[#413522]">
                                  {cell}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {section.note ? <p className="mt-2 text-xs text-[#6B5A3D]">{section.note}</p> : null}
                  </section>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}
    </HelpShell>
  );
}
