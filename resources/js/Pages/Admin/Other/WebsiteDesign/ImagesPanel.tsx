import React from "react";
import { ArrowDown, ArrowUp, ImageIcon, Plus, RotateCcw, Trash2, Upload } from "lucide-react";
import { GhostButton, Panel } from "./Panel";
import type { DesignEditor } from "./useDesignEditor";
import type { LogoKind } from "./types";

type Props = { editor: DesignEditor; maxHeroSlides: number };

const ACCEPT_LOGO = ".png,.jpg,.jpeg,.webp,.svg";
const ACCEPT_PHOTO = ".png,.jpg,.jpeg,.webp";

export default function ImagesPanel({ editor, maxHeroSlides }: Props) {
  const heroInput = React.useRef<HTMLInputElement | null>(null);
  const usingDefaultHero = editor.draft.hero.length === 0;

  return (
    <Panel title="Images" description="Swap the logos and homepage hero slideshow." icon={<ImageIcon className="h-5 w-5" />}>
      <LogoRow editor={editor} kind="navLogo" label="Navigation logo" hint="Shown in the top menu. PNG or SVG with a transparent background works best." dark={false} />
      <LogoRow editor={editor} kind="footerLogo" label="Footer logo" hint="Shown on the gold footer bar, so a white version reads best." dark />

      <div className="rounded-xl border border-[#EDE0BF] bg-[#FFFDF8] p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-sm font-medium text-[#5F4C2A]">Homepage hero slideshow</p>
            <p className="text-xs text-[#8A7B5A]">Up to {maxHeroSlides} landscape images, ideally 1920 × 1080. Leave empty to use the built-in slides.</p>
          </div>
          <div className="flex gap-2">
            {!usingDefaultHero ? (
              <GhostButton onClick={editor.clearHero}>
                <RotateCcw className="h-3.5 w-3.5" /> Use default slides
              </GhostButton>
            ) : null}
            <GhostButton onClick={() => heroInput.current?.click()} disabled={editor.heroRoom === 0}>
              <Plus className="h-3.5 w-3.5" /> Add images
            </GhostButton>
            <input
              ref={heroInput}
              type="file"
              accept={ACCEPT_PHOTO}
              multiple
              className="hidden"
              onChange={(event) => {
                if (event.target.files?.length) editor.addHeroFiles(event.target.files);
                event.target.value = "";
              }}
            />
          </div>
        </div>

        {usingDefaultHero ? (
          <p className="mt-3 rounded-lg border border-dashed border-[#DCC99D] px-3 py-4 text-center text-xs text-[#8A7B5A]">
            Using the built-in Bear Lane slides. Add images to replace them.
          </p>
        ) : (
          <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {editor.draft.hero.map((slide, index) => {
              const src = editor.previewDesign.images.hero_slides[index];
              return (
                <li key={slide.id} className="group relative overflow-hidden rounded-lg border border-[#E4D2AA] bg-white">
                  <img src={src} alt={`Hero slide ${index + 1}`} className="aspect-video w-full object-cover" />
                  <span className="absolute left-1.5 top-1.5 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-semibold text-white">{index + 1}</span>
                  <div className="absolute inset-x-0 bottom-0 flex justify-end gap-1 bg-gradient-to-t from-black/60 to-transparent p-1.5">
                    <IconButton label="Move earlier" disabled={index === 0} onClick={() => editor.moveHero(slide.id, -1)}><ArrowUp className="h-3.5 w-3.5" /></IconButton>
                    <IconButton label="Move later" disabled={index === editor.draft.hero.length - 1} onClick={() => editor.moveHero(slide.id, 1)}><ArrowDown className="h-3.5 w-3.5" /></IconButton>
                    <IconButton label="Remove slide" onClick={() => editor.removeHero(slide.id)}><Trash2 className="h-3.5 w-3.5" /></IconButton>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Panel>
  );
}

function LogoRow({ editor, kind, label, hint, dark }: { editor: DesignEditor; kind: LogoKind; label: string; hint: string; dark: boolean }) {
  const input = React.useRef<HTMLInputElement | null>(null);
  const logo = editor.draft[kind];
  const isCustom = Boolean(logo.file) || (Boolean(logo.url) && !logo.reset);

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[#EDE0BF] bg-[#FFFDF8] p-3">
      <span className={`flex h-14 w-32 shrink-0 items-center justify-center rounded-lg border border-[#E4D2AA] p-2 ${dark ? "bg-[#C99B2E]" : "bg-white"}`}>
        <img src={editor.logoPreviewUrl(kind)} alt={`${label} preview`} className="max-h-full max-w-full object-contain" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-[#5F4C2A]">{label}</p>
        <p className="text-xs text-[#8A7B5A]">{hint}</p>
      </div>
      <div className="flex gap-2">
        {isCustom ? (
          <GhostButton onClick={() => editor.resetLogo(kind)}>
            <RotateCcw className="h-3.5 w-3.5" /> Default
          </GhostButton>
        ) : null}
        <GhostButton onClick={() => input.current?.click()}>
          <Upload className="h-3.5 w-3.5" /> {isCustom ? "Replace" : "Upload"}
        </GhostButton>
        <input
          ref={input}
          type="file"
          accept={ACCEPT_LOGO}
          className="hidden"
          onChange={(event) => {
            editor.setLogoFile(kind, event.target.files?.[0] ?? null);
            event.target.value = "";
          }}
        />
      </div>
    </div>
  );
}

function IconButton({ label, children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      {...props}
      className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-white/90 text-[#2D2515] shadow transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  );
}
