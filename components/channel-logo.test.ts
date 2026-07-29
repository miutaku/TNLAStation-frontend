import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ChannelLogo } from "./channel-logo";

describe("ChannelLogo", () => {
  it("derives its height from the 64:36 broadcast logo aspect ratio", () => {
    const markup = renderToStaticMarkup(
      createElement(ChannelLogo, { channel: { id: 1, hasLogoData: false } }),
    );

    expect(markup).toContain("aspect-video");
    expect(markup).toContain("h-auto");
    expect(markup).toContain("w-16");
    expect(markup).not.toContain("size-9");
    expect(markup).not.toContain("rounded-");
  });
});
