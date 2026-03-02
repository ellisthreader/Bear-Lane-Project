import React, { useEffect } from "react";
import { CheckCircle2, ChevronLeft, Mail, MessageCircle, X } from "lucide-react";
import { SIDE_OPTIONS, useProductQuote } from "./ProductQuoteContext";
import type { EmbroideryType } from "./types";

const EMBROIDERY_OPTIONS: EmbroideryType[] = [
  "Logo",
  "Personalised Text",
  "Image",
  "Image & Text",
  "Complex Pattern",
  "Event / Team Branding",
];

const EMBROIDERY_IMAGES: Record<EmbroideryType, string> = {
  Logo: "/images/embroidery/logo.png",
  "Personalised Text": "/images/embroidery/text.png",
  Image: "/images/embroidery/custom.png",
  "Image & Text": "/images/embroidery/imagetext.png",
  "Complex Pattern": "/images/embroidery/pattern.png",
  "Event / Team Branding": "/images/embroidery/teambranding.png",
};

export default function ProductQuoteModal() {
  const {
    isOpen,
    close,
    source,
    quantity,
    setQuantity,
    embroideryType,
    setEmbroideryType,
    sides,
    toggleSide,
    stage,
    goToQuote,
    goBackToForm,
    quoteNumber,
    quoteTotal,
    guestEmail,
    setGuestEmail,
    sending,
    sendQuoteEmail,
  } = useProductQuote();
  const [loggedInQuoteSent, setLoggedInQuoteSent] = React.useState(false);
  const autoSendAttemptedRef = React.useRef(false);

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [close, isOpen]);

  useEffect(() => {
    if (!isOpen || stage !== "quote" || !source.isLoggedIn || !quoteNumber || autoSendAttemptedRef.current) return;

    let cancelled = false;
    autoSendAttemptedRef.current = true;
    (async () => {
      const sent = await sendQuoteEmail(false, true);
      if (!cancelled) setLoggedInQuoteSent(sent);
    })();

    return () => {
      cancelled = true;
    };
  }, [isOpen, stage, source.isLoggedIn, quoteNumber, sendQuoteEmail]);

  useEffect(() => {
    if (!isOpen || stage === "form") {
      setLoggedInQuoteSent(false);
      autoSendAttemptedRef.current = false;
    }
  }, [isOpen, stage]);

  const goToEmbroideryArtist = () => {
    const invoiceReference = quoteNumber ? `Q-${quoteNumber}` : "";
    const params = new URLSearchParams();
    params.set("quote_tab", "artist");
    if (invoiceReference) {
      params.set("invoice_ref", invoiceReference);
    }
    window.location.href = `/?${params.toString()}#get-quote-instantly`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[150] bg-black/60 p-3 sm:p-6" role="dialog" aria-modal="true" aria-label="Get quote modal">
      <div className="mx-auto flex h-full w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-[#E8DAB8] bg-[#FFFCF6] shadow-[0_30px_70px_rgba(33,25,13,0.35)]">
        <header className="relative border-b border-[#E9DFC8] bg-gradient-to-r from-[#FFF2D7] via-[#FFF8EA] to-[#FDF2D7] px-5 pb-5 pt-6 sm:px-7">
          <button
            type="button"
            onClick={close}
            className="absolute right-4 top-4 rounded-full border border-[#D9C79E] bg-white/80 p-2 text-[#5C4B27] transition hover:bg-white"
            aria-label="Close quote modal"
          >
            <X className="h-4 w-4" />
          </button>

          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#8A6A2F]">Get Quote Instantly</p>
          <h2 className="mt-1 text-2xl font-black text-[#271D0F] sm:text-3xl">{source.productName}</h2>
          <p className="mt-2 text-sm text-[#5F4D29]">
            Product pre-selected: <span className="font-semibold">{source.colour}</span> · {source.sizeCategory} — {source.size}
          </p>
        </header>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {stage === "form" ? (
            <div className="space-y-6">
              <section className="rounded-2xl border border-[#E8DCC3] bg-white p-4 sm:p-5">
                <h3 className="text-base font-bold text-[#2F2415]">1. Quantity</h3>
                <div className="mt-3 max-w-xs">
                  <input
                    type="number"
                    min={1}
                    value={quantity > 0 ? quantity : ""}
                    onChange={(event) => {
                      const raw = event.target.value.trim();
                      if (raw === "") {
                        setQuantity(0);
                        return;
                      }
                      const parsed = Number(raw);
                      if (!Number.isFinite(parsed)) return;
                      setQuantity(Math.max(0, Math.floor(parsed)));
                    }}
                    className="w-full rounded-xl border border-[#DCC99D] bg-white px-4 py-3 text-base text-[#2B2417] focus:outline-none focus:ring-2 focus:ring-[#C9A24D]"
                    placeholder="Enter quantity"
                  />
                </div>
              </section>

              <section className="rounded-2xl border border-[#E8DCC3] bg-white p-4 sm:p-5">
                <h3 className="text-base font-bold text-[#2F2415]">2. Embroidery Type</h3>
                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {EMBROIDERY_OPTIONS.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setEmbroideryType(option)}
                      className={`relative aspect-square overflow-hidden rounded-xl border text-left transition ${
                        embroideryType === option
                          ? "border-[#B4872A] ring-2 ring-[#E5D29F]"
                          : "border-[#E7DCC6] hover:border-[#C9A24D]"
                      }`}
                    >
                      <img
                        src={source.previewImage || "/images/no-image.png"}
                        alt={`${source.productName} preview`}
                        className="absolute inset-0 h-full w-full object-contain bg-[#E5E7EB] p-2"
                      />
                      <img
                        src={EMBROIDERY_IMAGES[option]}
                        alt={option}
                        className="absolute left-1/2 top-[32%] h-[34%] w-[34%] -translate-x-1/2 -translate-y-1/2 object-contain"
                      />
                      <span className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-black/5" />
                      <span className="absolute inset-x-2 bottom-2 rounded-md bg-black/55 px-2 py-1 text-center text-xs font-semibold text-white">
                        {option}
                      </span>
                    </button>
                  ))}
                </div>
              </section>

              <section className="rounded-2xl border border-[#E8DCC3] bg-white p-4 sm:p-5">
                <h3 className="text-base font-bold text-[#2F2415]">3. Embroidery Sides</h3>
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {SIDE_OPTIONS.map((side) => {
                    const active = sides.includes(side);
                    return (
                      <button
                        key={side}
                        type="button"
                        onClick={() => toggleSide(side)}
                        className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                          active
                            ? "border-[#B4872A] bg-[#FFF3DA] text-[#2B2417]"
                            : "border-[#E7DCC6] bg-white text-[#5A4A2B] hover:border-[#C9A24D]"
                        }`}
                      >
                        {side}
                      </button>
                    );
                  })}
                </div>
              </section>

              <button
                type="button"
                onClick={goToQuote}
                className="w-full rounded-full bg-[#1F1A12] px-6 py-3.5 text-sm font-semibold uppercase tracking-[0.12em] text-white transition hover:bg-[#372D1C]"
              >
                Load Your Quote
              </button>
            </div>
          ) : (
            <div className="space-y-5">
              <section className="rounded-2xl border border-[#E8DCC3] bg-white p-5 shadow-[0_16px_34px_rgba(49,35,15,0.08)] transition-all duration-300">
                <p className="text-xs uppercase tracking-[0.14em] text-[#8A6A2F]">Quote #{quoteNumber || "------"}</p>
                <p className="mt-2 text-sm text-[#6B5A3D]">Estimated total</p>
                <p className="text-3xl text-[#1B140A]">£{quoteTotal.toFixed(2)}</p>
                <p className="mt-2 text-xs text-[#7A6742]">Final pricing may vary depending on final design complexity.</p>

                <div className="mt-5 space-y-2">
                  <p className="flex items-start gap-2 text-sm text-[#5D4D31]">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#A57B22]" />
                    <span>
                      {quantity} {source.productName} in {source.colour}
                    </span>
                  </p>
                  <p className="flex items-start gap-2 text-sm text-[#5D4D31]">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#A57B22]" />
                    <span>Embroidery type: {embroideryType}</span>
                  </p>
                  <p className="flex items-start gap-2 text-sm text-[#5D4D31]">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#A57B22]" />
                    <span>Professional Design Review + Customer Engagement</span>
                  </p>
                  <p className="flex items-start gap-2 text-sm text-[#5D4D31]">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#A57B22]" />
                    <span>Embroidery sides: {sides.join(", ")}</span>
                  </p>
                </div>

                <div className="mt-5 border-t border-[#EEE2C9] pt-4">
                  <h4 className="text-sm uppercase tracking-[0.1em] text-[#2D2415]">Email Your Quote</h4>
                  {source.isLoggedIn ? (
                    <p className="mt-2 text-sm text-[#5D4D31]">
                      {loggedInQuoteSent ? "Quote sent to " : "We will send this quote to "} {source.accountEmail}
                    </p>
                  ) : (
                    <input
                      type="email"
                      value={guestEmail}
                      onChange={(event) => setGuestEmail(event.target.value)}
                      placeholder="Enter your email"
                      className="mt-3 w-full rounded-xl border border-[#DCC99D] bg-white px-4 py-3 text-base text-[#2B2417] focus:outline-none focus:ring-2 focus:ring-[#C9A24D]"
                    />
                  )}
                </div>
              </section>

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={goBackToForm}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-[#D7BE84] bg-white px-5 py-3 text-sm font-semibold text-[#7B6530] transition hover:bg-[#FFF5DF]"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Edit Quote
                </button>
                <button
                  type="button"
                  onClick={goToEmbroideryArtist}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-[#D7BE84] bg-[#FFF9EA] px-5 py-3 text-sm font-semibold text-[#7B6530] transition hover:bg-[#F8E9C9]"
                >
                  <MessageCircle className="h-4 w-4" />
                  Speak to an Embroidery Artist
                </button>
                {!source.isLoggedIn ? (
                  <button
                    type="button"
                    onClick={() => sendQuoteEmail(true)}
                    disabled={sending}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-[#1F1A12] px-6 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-white transition hover:bg-[#372D1C] disabled:cursor-not-allowed disabled:opacity-65"
                  >
                    <Mail className="h-4 w-4" />
                    {sending ? "Sending..." : "Email My Quote"}
                  </button>
                ) : null}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
