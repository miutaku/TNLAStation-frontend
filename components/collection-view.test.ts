import { strict as assert } from "node:assert";
import { describe, it } from "vitest";

import { collectionLayoutClass } from "./collection-view";

describe("collectionLayoutClass", () => {
  it("keeps the requested card columns in card mode", () => {
    const className = collectionLayoutClass("cards", "sm:grid-cols-2 2xl:grid-cols-3");

    assert.match(className, /grid-cols-1/);
    assert.match(className, /sm:grid-cols-2/);
    assert.match(className, /2xl:grid-cols-3/);
  });

  it("uses one column in list mode", () => {
    const className = collectionLayoutClass("list", "sm:grid-cols-2 2xl:grid-cols-3");

    assert.match(className, /grid-cols-1/);
    assert.doesNotMatch(className, /sm:grid-cols-2/);
    assert.doesNotMatch(className, /2xl:grid-cols-3/);
  });
});
