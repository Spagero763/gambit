"use client";

import { AnchorHTMLAttributes, useEffect, useState } from "react";
import { inMiniPay } from "@/lib/minipay";

/**
 * External link that behaves inside MiniPay: its in-app browser has no tabs,
 * so target="_blank" is meaningless there and links open in the same view.
 * Outside MiniPay it's a normal new-tab external link.
 */
export function ExternalA({ children, ...props }: AnchorHTMLAttributes<HTMLAnchorElement>) {
  const [mini, setMini] = useState(false);
  useEffect(() => setMini(inMiniPay()), []);
  const extra = mini ? {} : { target: "_blank", rel: "noreferrer" };
  return (
    <a {...props} {...extra}>
      {children}
    </a>
  );
}
