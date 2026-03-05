import { Link } from "@inertiajs/react";
import { FaFacebookF, FaInstagram, FaTiktok, FaXTwitter } from "react-icons/fa6";

const sectionLinks = [
  {
    title: "Customer Services",
    links: [
      { label: "FAQs", href: "/faq" },
      { label: "Contact us", href: "/support" },
      { label: "Delivery", href: "/help/orders" },
      { label: "Returns & Refunds", href: "/help/returns" },
      { label: "Cookie Preferences", href: "/help/privacy#cookies" },
      { label: "Gift Packaging", href: "/help/orders#gift-packaging" },
    ],
  },
  {
    title: "Online Shopping",
    links: [
      { label: "My Account", href: "/profile" },
      { label: "Size Guide", href: "/help/account" },
      { label: "Wishlist", href: "/profile" },
      { label: "Delivery", href: "/help/orders" },
      { label: "Track your order", href: "/user-orders" },
    ],
  },
  {
    title: "About Us",
    links: [
      { label: "About BEAR LANE", href: "/company" },
      { label: "Promotional Terms", href: "/help/payments" },
      { label: "Customer Reviews", href: "/projects" },
      { label: "Terms And Conditions", href: "/help/privacy" },
    ],
  },
] as const;

const socials = [
  { label: "Instagram", href: "https://instagram.com", icon: FaInstagram },
  { label: "Facebook", href: "https://facebook.com", icon: FaFacebookF },
  { label: "Tiktok", href: "https://www.tiktok.com", icon: FaTiktok },
  { label: "X", href: "https://x.com", icon: FaXTwitter },
] as const;

export default function SiteFooter() {
  return (
    <footer className="mt-12 w-full border-t border-[#DFD8CA] bg-[#F5F5F2] text-[#2D2419]">
      <div className="mx-auto max-w-[1400px] px-4 py-12 md:px-8 lg:px-12">
        <div className="grid gap-8 md:grid-cols-3 md:gap-10">
          {sectionLinks.map((section) => (
            <section key={section.title}>
              <h3 className="text-[15px] font-semibold uppercase tracking-[0.16em] text-[#41372A]">{section.title}</h3>
              <div className="mt-3 h-px w-full bg-[#C8B58B]" />

              <ul className="mt-4 space-y-2.5">
                {section.links.map((link) => (
                  <li key={link.label}>
                    {link.label === "Cookie Preferences" ? (
                      <button
                        type="button"
                        onClick={() => window.dispatchEvent(new Event("open-cookie-preferences"))}
                        className="text-[14px] font-medium text-[#5A5145] transition hover:text-[#A17A2B] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B89443]"
                      >
                        {link.label}
                      </button>
                    ) : (
                      <Link
                        href={link.href}
                        className="text-[14px] font-medium text-[#5A5145] transition hover:text-[#A17A2B]"
                      >
                        {link.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <div className="mt-10 rounded-2xl border border-[#E4DCCA] bg-white px-5 py-5 md:px-6">
          <h4 className="text-lg font-semibold tracking-tight text-[#2A241B]">Let&apos;s get to know each other</h4>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
            <input
              type="email"
              placeholder="Enter your email"
              className="h-11 w-full rounded-xl border border-[#D9CCAF] bg-[#FFFEFB] px-4 text-sm text-[#2A241B] outline-none transition focus:border-[#C99B2E]"
            />
            <button
              type="button"
              className="h-11 rounded-xl bg-[#B89443] px-5 text-sm font-semibold text-white transition hover:bg-[#A88434]"
            >
              Subscribe
            </button>
          </div>

          <p className="mt-3 text-xs leading-relaxed text-[#8A8377]">
            *By submitting your email address, you agree to receive marketing emails from BEAR LANE. {" "}
            <Link href="/help/privacy" className="underline underline-offset-2 hover:text-[#6A5F4D]">
              Click here
            </Link>{" "}
            to read our privacy policy & terms and conditions.
          </p>
        </div>
      </div>

      <div className="w-full bg-[#C99B2E]">
        <div className="mx-auto grid max-w-[1400px] items-center gap-4 px-4 py-3 md:grid-cols-3 md:px-8 lg:px-12">
          <div className="flex items-center justify-start">
            <img
              src="/images/BLText.png"
              alt="Bear Lane"
              loading="lazy"
              decoding="async"
              className="h-8 w-auto object-contain"
            />
          </div>

          <div className="flex items-center justify-center gap-5">
            {socials.map((social) => {
              const Icon = social.icon;
              return (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={social.label}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white transition hover:bg-white/30"
                >
                  <Icon className="h-4 w-4" />
                </a>
              );
            })}
          </div>

          <div className="flex items-center justify-center md:justify-end">
            <p className="text-xs font-medium text-white/95">© 2026 Bear Lane. All rights reserved.</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
