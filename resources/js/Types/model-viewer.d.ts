/// <reference types="react" />

declare global {
  namespace JSX {
    interface IntrinsicElements {
      "model-viewer": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      > & {
        src?: string;
        alt?: string;
        poster?: string;
        "auto-rotate"?: boolean | string;
        "camera-controls"?: boolean | string;
        "shadow-intensity"?: string | number;
        exposure?: string | number;
        "environment-image"?: string;
        ar?: boolean | string;
        "animation-name"?: string;
        // allow any other attributes to avoid future squiggles
        [key: string]: any;
      };
    }
  }
}

// ensure this file is treated as a module (makes TypeScript reliably load it)
export {};
