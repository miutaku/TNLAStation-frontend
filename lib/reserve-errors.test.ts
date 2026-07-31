import { describe, expect, it } from "vitest";

import { ApiError } from "./api/client";
import { isApiFailure } from "./api-errors";
import { describeReserveFailure, RESERVATION_ALREADY_EXISTS } from "./reserve-errors";

function apiFailure(reason?: string): ApiError {
  return new ApiError("TNLAStation API returned 500", 500, "/api/reserves", "Internal Server Error", reason);
}

describe("describeReserveFailure", () => {
  it("explains that the program is already reserved", () => {
    expect(describeReserveFailure(apiFailure(RESERVATION_ALREADY_EXISTS)).message).toBe(
      "この番組はすでに録画予約されています。",
    );
  });

  it("never shows the placeholder message EPGStation puts in every failure", () => {
    for (const reason of [RESERVATION_ALREADY_EXISTS, "ReservationIsNotFound", "AddReservationOptionError"]) {
      expect(describeReserveFailure(apiFailure(reason)).message).not.toContain("Internal Server Error");
    }
  });

  it("shows the raw code when the reason is unknown so it stays traceable", () => {
    expect(describeReserveFailure(apiFailure("SomethingNew")).message).toBe("SomethingNew");
  });
});

describe("isApiFailure", () => {
  /** 画面はこれを見て、押せる状態のままにせず予約済みへ倒す。 */
  it("recognises the already-reserved failure and nothing else", () => {
    expect(isApiFailure(apiFailure(RESERVATION_ALREADY_EXISTS), RESERVATION_ALREADY_EXISTS)).toBe(true);
    expect(isApiFailure(apiFailure("Other"), RESERVATION_ALREADY_EXISTS)).toBe(false);
    expect(isApiFailure(new TypeError("Failed to fetch"), RESERVATION_ALREADY_EXISTS)).toBe(false);
  });
});
