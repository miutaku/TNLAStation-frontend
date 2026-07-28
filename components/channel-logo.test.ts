import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ChannelLogo } from "./channel-logo";

describe("ChannelLogo", () => {
  it("uses the 64:36 broadcast logo aspect ratio instead of a square frame", () => {
    const markup = renderToStaticMarkup(
      createElement(ChannelLogo, { channel: { id: 1, hasLogoData: false } }),
    );

    expect(markup).toContain("h-9");
    expect(markup).toContain("w-16");
    expect(markup).not.toContain("size-9");
  });
});
