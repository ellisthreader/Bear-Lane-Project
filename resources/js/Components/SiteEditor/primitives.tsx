import { Link } from "@inertiajs/react";
import { ImagePlus } from "lucide-react";
import {
  useLayoutEffect,
  useMemo,
  useRef,
  type ClipboardEvent,
  type CSSProperties,
  type ElementType,
  type FormEvent,
  type ImgHTMLAttributes,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from "react";
import { deleteAndAnnounce, nameFor } from "./actions";
import { selectTarget } from "./selection";
import {
  getEditorState,
  getStyle,
  resetLook,
  setImage,
  setLink,
  setStyle,
  setText,
  uploadImage,
  useEditMode,
  useHidden,
  useImageOverride,
  useLink,
  useStyleEntry,
  useText,
} from "./store";
import type { ColorCap, EditTarget, ElementStyle, MoveCap, SizeCap } from "./types";

/*
 * The building blocks the homepage is made of. Outside edit mode each one renders exactly what a
 * normal element would (saved override, else the default passed as children/props). In edit mode
 * the same element becomes click-to-change and tells the floating toolbar what it can do:
 * edit, recolour, resize, drag anywhere, or delete.
 */

export const cx = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(" ");

/* ------------------------------------------------------------------------------------------------
 * How an element looks (colours, size, where it was dragged to)
 * ---------------------------------------------------------------------------------------------- */

export type Look = { style: CSSProperties | undefined; className: string | undefined };
const NO_LOOK: Look = { style: undefined, className: undefined };

export function lookOf(entry: ElementStyle | undefined): Look {
  if (!entry) return NO_LOOK;
  const style: Record<string, string> = {};
  const classes: string[] = [];

  if (entry.color) style.color = entry.color;
  // `background` (not backgroundColor) so a chosen colour also replaces gradients.
  if (entry.background) style.background = entry.background;
  if (entry.x || entry.y) {
    // Applied through the `translate` property (see app.css) so it never fights other transforms.
    style["--bl-x"] = `${entry.x ?? 0}px`;
    style["--bl-y"] = `${entry.y ?? 0}px`;
    classes.push("bl-moved");
  }
  if (entry.size) {
    style["--bl-fs"] = `${entry.size}px`;
    classes.push("bl-sized");
  }

  return {
    style: Object.keys(style).length > 0 ? (style as CSSProperties) : undefined,
    className: classes.join(" ") || undefined,
  };
}

/** The owner's look for an element id. Pass null for "none". */
export function useLook(id: string | null): Look {
  const entry = useStyleEntry(id ?? "");
  return useMemo(() => (id ? lookOf(entry) : NO_LOOK), [id, entry]);
}

const merge = (a?: CSSProperties, b?: CSSProperties): CSSProperties | undefined => (a || b ? { ...a, ...b } : undefined);

/* ------------------------------------------------------------------------------------------------
 * What the toolbar can do with an element
 * ---------------------------------------------------------------------------------------------- */

export const colourCap = (id: string, property: "color" | "background"): ColorCap => ({
  get: () => getStyle(id)?.[property],
  set: (hex) => setStyle(id, { [property]: hex }, `style:${id}:${property}`),
});

export const moveCap = (id: string): MoveCap => ({
  get: () => ({ x: getStyle(id)?.x ?? 0, y: getStyle(id)?.y ?? 0 }),
  set: (x, y) => setStyle(id, { x, y }),
});

export const sizeCap = (id: string): SizeCap => ({
  get: () => getStyle(id)?.size,
  set: (px) => setStyle(id, { size: px }, `size:${id}`),
});

export const lookReset = (id: string): NonNullable<EditTarget["resetLook"]> => ({
  has: () => Object.keys(getStyle(id) ?? {}).length > 0,
  run: () => resetLook(id),
});

type Flags = { color?: boolean; background?: boolean; move?: boolean; size?: boolean };

/** The common bundle of controls for an element: look, drag, resize, delete. */
export function targetFor(
  id: string,
  styleId: string | null,
  el: HTMLElement,
  noun: string,
  flags: Flags,
  extra?: Partial<EditTarget>,
): EditTarget {
  return {
    el,
    label: noun,
    ...(styleId && flags.color ? { color: colourCap(styleId, "color") } : {}),
    ...(styleId && flags.background ? { background: colourCap(styleId, "background") } : {}),
    ...(styleId && flags.move ? { move: moveCap(styleId) } : {}),
    ...(styleId && flags.size ? { size: sizeCap(styleId) } : {}),
    ...(styleId ? { resetLook: lookReset(styleId) } : {}),
    remove: () => deleteAndAnnounce(id, nameFor(noun, el)),
    ...extra,
  };
}

/** Inertia navigation for on-site paths, plain anchors for everything else. */
type SmartLinkProps = {
  href: string;
  className?: string;
  style?: CSSProperties;
  "aria-label"?: string;
  children: ReactNode;
};

export function SmartLink({ href, children, ...rest }: SmartLinkProps) {
  if (href.startsWith("/") && !href.startsWith("//")) {
    return (
      <Link href={href} {...rest}>
        {children}
      </Link>
    );
  }
  const external = /^https?:/i.test(href);
  return (
    <a href={href} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})} {...rest}>
      {children}
    </a>
  );
}

/* ------------------------------------------------------------------------------------------------
 * Text
 * ---------------------------------------------------------------------------------------------- */

export type EditTextProps = {
  id: string;
  /** The built-in text. */
  children: string;
  as?: ElementType;
  className?: string;
  style?: CSSProperties;
  placeholder?: string;
  /** Which id holds this text's look. Defaults to `id`; null means it is styled by a wrapper (a button). */
  styleId?: string | null;
  /** Render nothing for visitors when the text is empty (an owner can clear a line to remove it). */
  hideWhenEmpty?: boolean;
  /** What to call it ("Heading", "Paragraph"…) in the toolbar and in the Deleted items list. */
  label?: string;
  /** Lets a wrapper (a button) take over what the toolbar offers and where it sits. */
  extraTarget?: (el: HTMLElement) => Partial<EditTarget>;
};

export function EditText(props: EditTextProps) {
  const hidden = useHidden(props.id);
  const editing = useEditMode();
  if (hidden) return null;
  return editing ? <EditableText {...props} /> : <StaticText {...props} />;
}

function StaticText({ id, children: fallback, as: Tag = "span", className, style, styleId, hideWhenEmpty = true }: EditTextProps) {
  const value = useText(id, fallback);
  const look = useLook(styleId === undefined ? id : styleId);
  if (value === "" && hideWhenEmpty) return null;

  return (
    <Tag className={cx(className, look.className)} style={merge(style, look.style)}>
      {value}
    </Tag>
  );
}

const plain = (text: string | null) => (text ?? "").replace(/ /g, " ");

/**
 * A single-line text element the owner can type into. Controlled from outside through `value` /
 * `onValue`, but uncontrolled while typing (it only rewrites the DOM when the value changed from
 * elsewhere — reset, undo — so the caret never jumps).
 */
export function RawEditable({
  value,
  onValue,
  as: Tag = "span",
  className,
  style,
  placeholder,
  onSelect,
  editId,
}: {
  value: string;
  onValue: (text: string) => void;
  as?: ElementType;
  className?: string;
  style?: CSSProperties;
  placeholder?: string;
  onSelect?: (el: HTMLElement) => void;
  editId?: string;
}) {
  const ref = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (el && plain(el.textContent) !== value) el.textContent = value;
  }, [value]);

  const select = () => ref.current && onSelect?.(ref.current);

  return (
    <Tag
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      spellCheck={false}
      data-edit-target
      data-edit-id={editId}
      data-placeholder={placeholder ?? "Type here"}
      className={cx(className, "bl-edit-text")}
      style={style}
      onFocus={select}
      onClick={select}
      onInput={(event: FormEvent<HTMLElement>) => {
        const el = event.currentTarget;
        const text = plain(el.textContent);
        if (text === "") el.innerHTML = "";
        onValue(text);
      }}
      onKeyDown={(event: KeyboardEvent<HTMLElement>) => {
        if (event.key === "Enter" || event.key === "Escape") {
          event.preventDefault();
          event.currentTarget.blur();
        }
      }}
      onPaste={(event: ClipboardEvent<HTMLElement>) => {
        event.preventDefault();
        document.execCommand("insertText", false, event.clipboardData.getData("text/plain").replace(/\s+/g, " "));
      }}
    />
  );
}

function EditableText({
  id,
  children: fallback,
  as,
  className,
  style,
  placeholder,
  styleId,
  label = "Text",
  extraTarget,
}: EditTextProps) {
  const value = useText(id, fallback);
  const lookId = styleId === undefined ? id : styleId;
  const look = useLook(lookId);

  return (
    <RawEditable
      value={value}
      onValue={(text) => setText(id, text, fallback)}
      as={as}
      // A label inside a button is found through the button, so it does not claim the id too.
      editId={styleId === null ? undefined : id}
      className={cx(className, look.className)}
      style={merge(style, look.style)}
      placeholder={placeholder}
      onSelect={(el) =>
        selectTarget(targetFor(id, lookId, el, label, { color: true, move: true, size: true }, extraTarget?.(el)))
      }
    />
  );
}

/* ------------------------------------------------------------------------------------------------
 * Buttons and links with a label
 * ---------------------------------------------------------------------------------------------- */

export type EditActionProps = {
  /** Keys the label text, the link and the look. */
  id: string;
  label: string;
  className?: string;
  /** Where it goes until the owner picks somewhere else. Without one it runs `onActivate`. */
  defaultHref?: string;
  onActivate?: () => void;
  /** Hide the whole button from visitors while its label is empty. */
  hideWhenEmpty?: boolean;
  placeholder?: string;
  linkable?: boolean;
};

export function EditAction(props: EditActionProps) {
  const hidden = useHidden(props.id);
  const editing = useEditMode();
  if (hidden) return null;
  return editing ? <EditableAction {...props} /> : <StaticAction {...props} />;
}

function StaticAction({ id, label, className, defaultHref, onActivate, hideWhenEmpty }: EditActionProps) {
  const text = useText(id, label);
  const href = useLink(id) ?? defaultHref;
  const look = useLook(id);
  if (text === "" && hideWhenEmpty) return null;

  const classes = cx(className, look.className);
  if (href) {
    return (
      <SmartLink href={href} className={classes} style={look.style}>
        {text}
      </SmartLink>
    );
  }
  return (
    <button type="button" onClick={onActivate} className={classes} style={look.style}>
      {text}
    </button>
  );
}

function EditableAction({ id, label, className, defaultHref, placeholder, linkable = true }: EditActionProps) {
  const ref = useRef<HTMLDivElement>(null);
  const look = useLook(id);
  const display = /(^|\s)(inline-)?flex(\s|$)/.test(className ?? "") ? "" : "inline-block";

  const target = (el: HTMLElement): EditTarget =>
    targetFor(
      id,
      id,
      el,
      "Button",
      { color: true, background: true, move: true, size: true },
      linkable
        ? {
            link: {
              get: () => getEditorState().draft.links[id] ?? defaultHref ?? "",
              set: (href: string) => setLink(id, href === (defaultHref ?? "") ? undefined : href),
              suggestions: true,
              blankHint: defaultHref ? undefined : "its normal action, or type a page address",
            },
          }
        : {},
    );

  return (
    <div
      ref={ref}
      role="button"
      data-edit-target
      data-edit-id={id}
      className={cx(display, className, look.className, "bl-edit-action")}
      style={look.style}
      onClick={(event) => {
        // Clicks on the label are handled by the label itself; this is for the padding around it.
        if ((event.target as Element).closest("[data-edit-target]") === event.currentTarget && ref.current) {
          selectTarget(target(ref.current));
        }
      }}
    >
      <EditableText
        id={id}
        as="span"
        styleId={null}
        label="Button"
        placeholder={placeholder ?? "Button text"}
        extraTarget={() => (ref.current ? target(ref.current) : {})}
      >
        {label}
      </EditableText>
    </div>
  );
}

/** An icon-style link (no label): social icons. An empty link hides it from visitors. */
export function EditAnchor({
  id,
  defaultHref,
  className,
  label,
  children,
}: {
  id: string;
  defaultHref: string;
  className?: string;
  label: string;
  children: ReactNode;
}) {
  const editing = useEditMode();
  const hidden = useHidden(id);
  const href = useLink(id) ?? defaultHref;
  const look = useLook(id);
  if (hidden) return null;

  const classes = cx(className, look.className);

  if (!editing) {
    return href ? (
      <SmartLink href={href} aria-label={label} className={classes} style={look.style}>
        {children}
      </SmartLink>
    ) : null;
  }

  return (
    <div
      role="button"
      aria-label={label}
      data-edit-target
      data-edit-id={id}
      className={cx(classes, "bl-edit-action", !href && "opacity-40")}
      style={look.style}
      onClick={(event: MouseEvent<HTMLDivElement>) =>
        selectTarget(
          targetFor(id, id, event.currentTarget, label, { color: true, background: true, move: true }, {
            link: {
              get: () => getEditorState().draft.links[id] ?? defaultHref,
              set: (next: string) => setLink(id, next === defaultHref ? undefined : next),
            },
          }),
        )
      }
    >
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------------------------------------
 * Boxes, icons and other things that are not text
 * ---------------------------------------------------------------------------------------------- */

/**
 * Any decorative piece (an icon, a number badge, a row of stars, a card): selectable, recolourable,
 * movable and deletable, though it has no text of its own to edit.
 */
export function EditBlock({
  id,
  label,
  as: Tag = "div",
  className,
  style,
  children,
  color = true,
  background = true,
  size = false,
  ariaLabel,
}: {
  id: string;
  label: string;
  as?: ElementType;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
  color?: boolean;
  background?: boolean;
  size?: boolean;
  ariaLabel?: string;
}) {
  const editing = useEditMode();
  const hidden = useHidden(id);
  const look = useLook(id);
  if (hidden) return null;

  const classes = cx(className, look.className);
  if (!editing) {
    return (
      <Tag className={classes} style={merge(style, look.style)} aria-label={ariaLabel}>
        {children}
      </Tag>
    );
  }

  return (
    <Tag
      data-edit-target
      data-edit-id={id}
      aria-label={ariaLabel}
      className={cx(classes, "bl-edit-block")}
      style={merge(style, look.style)}
      onClick={(event: MouseEvent<HTMLElement>) => {
        // Only react to clicks on the block itself, not on text or buttons inside it.
        if ((event.target as Element).closest("[data-edit-target]") !== event.currentTarget) return;
        selectTarget(targetFor(id, id, event.currentTarget, label, { color, background, move: true, size }));
      }}
    >
      {children}
    </Tag>
  );
}

/* ------------------------------------------------------------------------------------------------
 * Images
 * ---------------------------------------------------------------------------------------------- */

type ImageAccess = NonNullable<EditTarget["image"]>;

type PickableImageProps = {
  url: string;
  editing: boolean;
  label: string;
  image: ImageAccess;
  imgProps: ImgHTMLAttributes<HTMLImageElement>;
  /** Shown instead of an <img> when there is no url (e.g. an avatar's initial). */
  empty?: ReactNode;
  extraTarget?: (el: HTMLElement) => Partial<EditTarget>;
  editId?: string;
};

/** An <img> that, in edit mode, selects itself so the toolbar can replace or reset it. */
export function PickableImage({ url, editing, label, image, imgProps, empty, extraTarget, editId }: PickableImageProps) {
  if (!editing) return url ? <img {...imgProps} src={url} /> : <>{empty}</>;

  const select = (event: MouseEvent<HTMLElement>) => {
    event.preventDefault(); // images inside links (the nav logo) must not navigate while editing
    const el = event.currentTarget;
    selectTarget({ el, label, image, ...extraTarget?.(el) });
  };

  if (url) {
    return (
      <img
        {...imgProps}
        src={url}
        draggable={false}
        data-edit-target
        data-edit-id={editId}
        onClick={select}
        className={cx(imgProps.className, "bl-edit-img")}
      />
    );
  }

  return (
    <span role="button" data-edit-target data-edit-id={editId} onClick={select} className="bl-edit-img inline-flex cursor-pointer">
      {empty ?? (
        <span className="flex h-16 w-16 items-center justify-center rounded-xl border-2 border-dashed border-blue-400 text-blue-500">
          <ImagePlus className="h-6 w-6" />
        </span>
      )}
    </span>
  );
}

/**
 * A homepage image keyed by id, falling back to the built-in `src`. A deleted picture disappears
 * for visitors; while editing it shows an "add a picture" spot so a new one can be dropped in.
 */
export function ContentImage({
  id,
  src,
  empty,
  label = "Picture",
  ...imgProps
}: Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> & { id: string; src: string; empty?: ReactNode; label?: string }) {
  const editing = useEditMode();
  const hidden = useHidden(id);
  const override = useImageOverride(id);

  const image = useMemo<ImageAccess>(
    () => ({
      replace: async (file: File) => setImage(id, await uploadImage(file)),
      reset: () => setImage(id, null),
      canReset: () => Boolean(getEditorState().draft.images[id]),
    }),
    [id],
  );

  return (
    <PickableImage
      url={hidden ? "" : override?.url || src}
      editing={editing}
      label={label}
      image={image}
      imgProps={imgProps}
      empty={empty}
      editId={id}
      extraTarget={hidden ? undefined : (el) => ({ remove: () => deleteAndAnnounce(id, nameFor(label, el)) })}
    />
  );
}
