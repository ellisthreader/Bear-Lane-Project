import { useMemo } from "react";
import { useSiteDesign } from "@/Theme/siteDesign";
import { AddItemButton, EditBand, ItemControls } from "@/Components/SiteEditor/controls";
import { EditAction, EditAnchor, EditBlock, EditText, PickableImage } from "@/Components/SiteEditor/primitives";
import { getEditorState, itemKey, setLogo, uploadImage, useEditMode, useVisibleIds } from "@/Components/SiteEditor/store";
import { FaFacebookF, FaInstagram, FaTiktok, FaXTwitter } from "react-icons/fa6";

type FooterLink = { label: string; href?: string };
type FooterColumn = { id: string; title: string; links: Record<string, FooterLink> };

// Link ids are stable keys for the on-page editor ("footer.col.1.links.2"), not positions.
const columns: FooterColumn[] = [
  {
    id: "1",
    title: "Customer Services",
    links: {
      "1": { label: "FAQs", href: "/faq" },
      "2": { label: "Contact us", href: "/support" },
      "3": { label: "Delivery", href: "/help/orders" },
      "4": { label: "Returns & Refunds", href: "/help/returns" },
      // No href: this one opens the cookie banner instead of navigating.
      "5": { label: "Cookie Preferences" },
      "6": { label: "Gift Packaging", href: "/help/orders#gift-packaging" },
    },
  },
  {
    id: "2",
    title: "Online Shopping",
    links: {
      "1": { label: "My Account", href: "/profile" },
      "2": { label: "Size Guide", href: "/help/account" },
      "3": { label: "Wishlist", href: "/profile" },
      "4": { label: "Delivery", href: "/help/orders" },
      "5": { label: "Track your order", href: "/user-orders" },
    },
  },
  {
    id: "3",
    title: "About Us",
    links: {
      "1": { label: "About BEAR LANE", href: "/company" },
      "2": { label: "Promotional Terms", href: "/help/payments" },
      "3": { label: "Customer Reviews", href: "/projects" },
      "4": { label: "Terms And Conditions", href: "/help/privacy" },
    },
  },
];

const defaultLinkIds = Object.fromEntries(columns.map((column) => [column.id, Object.keys(column.links)]));
const NEW_LINK: FooterLink = { label: "New link", href: "/" };

const socials = [
  { id: "instagram", label: "Instagram", href: "https://instagram.com", icon: FaInstagram },
  { id: "facebook", label: "Facebook", href: "https://facebook.com", icon: FaFacebookF },
  { id: "tiktok", label: "Tiktok", href: "https://www.tiktok.com", icon: FaTiktok },
  { id: "x", label: "X", href: "https://x.com", icon: FaXTwitter },
] as const;

const linkClass =
  "text-[14px] font-medium text-[#5A5145] transition hover:text-[#A17A2B] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B89443]";

function ColumnLinks({ column }: { column: FooterColumn }) {
  const listId = `footer.col.${column.id}.links`;
  const defaults = defaultLinkIds[column.id];
  const ids = useVisibleIds(listId, defaults);

  return (
    <>
      <ul className="mt-4 space-y-2.5">
        {ids.map((id) => {
          const link = column.links[id] ?? NEW_LINK;
          return (
            <li key={id} className="group/item relative">
              <ItemControls listId={listId} itemId={id} defaults={defaults} axis="y" min={0} noun="link" position="right-0 top-1/2 -translate-y-1/2" />
              <EditAction
                id={itemKey(listId, id)}
                label={link.label}
                defaultHref={link.href}
                onActivate={() => window.dispatchEvent(new Event("open-cookie-preferences"))}
                className={linkClass}
              />
            </li>
          );
        })}
      </ul>
      <AddItemButton listId={listId} defaults={defaults} label="Add a link" max={12} className="mt-3 !px-3 !py-1.5 text-xs" />
    </>
  );
}

export default function SiteFooter() {
  const siteDesign = useSiteDesign();
  const editing = useEditMode();
  const footerLogoSrc = siteDesign?.images?.footer_logo_url || "/images/BL-LogoW.png";
  const logoImage = useMemo(
    () => ({
      replace: async (file: File) => setLogo("footer_logo", await uploadImage(file, "logo")),
      reset: () => setLogo("footer_logo", null),
      canReset: () => Boolean(getEditorState().design?.footer_logo),
    }),
    [],
  );

  return (
    <footer data-edit-scope className="mt-12 w-full border-t border-[#DFD8CA] text-[#2D2419]">
      <EditBand id="section.footer" label="Background" className="bg-[#F5F5F2]">
        <div className="mx-auto max-w-[1400px] px-4 py-12 md:px-8 lg:px-12">
          <div className="grid gap-8 md:grid-cols-3 md:gap-10">
            {columns.map((column) => (
              <section key={column.id}>
                <EditText
                  id={`footer.col.${column.id}.title`}
                  as="h3"
                  label="Heading"
                  className="text-[15px] font-semibold uppercase tracking-[0.16em] text-[#41372A]"
                >
                  {column.title}
                </EditText>
                <div className="mt-3 h-px w-full bg-[#C8B58B]" />
                <ColumnLinks column={column} />
              </section>
            ))}
          </div>

          <EditBlock id="footer.newsletter.box" label="Sign-up box" className="mt-10 rounded-2xl border border-[#E4DCCA] bg-white px-5 py-5 md:px-6">
            <EditText id="footer.newsletter.title" as="h4" label="Heading" className="text-lg font-semibold tracking-tight text-[#2A241B]">
              Let&apos;s get to know each other
            </EditText>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
              <input
                type="email"
                placeholder="Enter your email"
                className="h-11 w-full rounded-xl border border-[#D9CCAF] bg-[#FFFEFB] px-4 text-sm text-[#2A241B] outline-none transition focus:border-[#C99B2E]"
              />
              <EditAction
                id="footer.newsletter.button"
                label="Subscribe"
                linkable={false}
                className="inline-flex h-11 items-center justify-center rounded-xl bg-[#B89443] px-5 text-sm font-semibold text-white transition hover:bg-[#A88434]"
              />
            </div>

            <p className="mt-3 text-xs leading-relaxed text-[#8A8377]">
              <EditText id="footer.legal.before" as="span">
                *By submitting your email address, you agree to receive marketing emails from BEAR LANE.
              </EditText>{" "}
              <EditAction
                id="footer.legal.link"
                label="Click here"
                defaultHref="/help/privacy"
                className="underline underline-offset-2 hover:text-[#6A5F4D]"
              />{" "}
              <EditText id="footer.legal.after" as="span">
                to read our privacy policy & terms and conditions.
              </EditText>
            </p>
          </EditBlock>
        </div>
      </EditBand>

      <EditBand id="section.footerBar" label="Bar colour" className="w-full bg-[#C99B2E]" pill="above">
        <div className="mx-auto grid max-w-[1400px] items-center gap-4 px-4 py-3 md:grid-cols-3 md:px-8 lg:px-12">
          <div className="flex items-center justify-start">
            <PickableImage
              url={footerLogoSrc}
              editing={editing}
              label="Footer logo"
              image={logoImage}
              imgProps={{ alt: "Bear Lane", loading: "lazy", decoding: "async", className: "h-8 w-auto object-contain" }}
            />
          </div>

          <div className="flex items-center justify-center gap-5">
            {socials.map((social) => {
              const Icon = social.icon;
              return (
                <EditAnchor
                  key={social.id}
                  id={`footer.social.${social.id}`}
                  defaultHref={social.href}
                  label={social.label}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white transition hover:bg-white/30"
                >
                  <Icon className="h-4 w-4" />
                </EditAnchor>
              );
            })}
          </div>

          <div className="flex items-center justify-center md:justify-end">
            <EditText id="footer.copyright" as="p" label="Text" className="text-xs font-medium text-white/95">
              © 2026 Bear Lane. All rights reserved.
            </EditText>
          </div>
        </div>
      </EditBand>
    </footer>
  );
}
