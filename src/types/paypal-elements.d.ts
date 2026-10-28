import type { DetailedHTMLProps, HTMLAttributes } from "react";

type PayButton = DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement> & { type?: string; hidden?: boolean };

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "paypal-button": PayButton;
      "venmo-button": PayButton;
    }
  }
}
