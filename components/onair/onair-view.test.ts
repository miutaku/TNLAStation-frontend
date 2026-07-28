import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import type { ChannelItem, LiveStreamInfoItem, ScheduleProgramItem } from "@/lib/api/types";
import type { TableColumnVisibilityState } from "@/components/table-column-visibility";

import { groupOnAirChannels, OnAirChannelGroupCard, OnAirChannelGroupRow } from "./onair-view";

function channel(overrides: Partial<ChannelItem> & Pick<ChannelItem, "id" | "serviceId">): ChannelItem {
  return {
    networkId: 32736,
    name: `放送サービス ${overrides.serviceId}`,
    halfWidthName: `放送サービス ${overrides.serviceId}`,
    remoteControlKeyId: 1,
    hasLogoData: false,
    channelType: "GR",
    channel: "27",
    type: 0x01,
    ...overrides,
  };
}

function program(channelId: number, name: string): ScheduleProgramItem {
  return {
    id: channelId * 10,
    channelId,
    startAt: 1_000,
    endAt: 61_000,
    isFree: true,
    name,
  };
}

describe("on-air channel groups", () => {
  it("groups subchannels by broadcast network and remote key in service order", () => {
    const main = channel({ id: 1, serviceId: 102 });
    const sub = channel({ id: 2, serviceId: 101 });
    const otherNetwork = channel({ id: 3, serviceId: 101, networkId: 32737 });

    const groups = groupOnAirChannels([main, otherNetwork, sub]);

    expect(groups).toHaveLength(2);
    expect(groups[0].channels.map((item) => item.id)).toEqual([2, 1]);
    expect(groups[1].channels.map((item) => item.id)).toEqual([3]);
  });

  it("uses the physical channel and normalized station name for services without a remote key", () => {
    const first = channel({
      id: 1,
      serviceId: 201,
      remoteControlKeyId: undefined,
      channel: "BS15_0",
      name: "BSサンプル1",
      halfWidthName: "BSサンプル1",
    });
    const sub = channel({
      id: 2,
      serviceId: 202,
      remoteControlKeyId: undefined,
      channel: "BS15_0",
      name: "BSサンプル2",
      halfWidthName: "BSサンプル2",
    });
    const otherPhysicalChannel = channel({
      id: 3,
      serviceId: 203,
      remoteControlKeyId: undefined,
      channel: "BS17_0",
      name: "BSサンプル3",
      halfWidthName: "BSサンプル3",
    });
    const unrelatedStationOnSameMultiplex = channel({
      id: 4,
      serviceId: 204,
      remoteControlKeyId: undefined,
      channel: "BS15_0",
      name: "別の放送局",
      halfWidthName: "別の放送局",
    });

    expect(
      groupOnAirChannels([first, sub, otherPhysicalChannel, unrelatedStationOnSameMultiplex])
        .map((group) => group.channels.length),
    ).toEqual([2, 1, 1]);
  });

  it("renders one card with a selector and derives its initial program and stream from the selected service", () => {
    const sub = channel({ id: 2, serviceId: 102, name: "サンプル放送", halfWidthName: "サンプル放送" });
    const main = channel({ id: 1, serviceId: 101, name: "サンプル放送", halfWidthName: "サンプル放送" });
    const group = groupOnAirChannels([sub, main])[0];
    const selectedStream: LiveStreamInfoItem = {
      streamId: 9,
      type: "LiveHLS",
      mode: 0,
      isEnable: true,
      channelId: main.id,
      name: "メイン番組",
      startAt: 1_000,
      endAt: 61_000,
    };

    const markup = renderToStaticMarkup(
      createElement(OnAirChannelGroupCard, {
        group,
        programsByChannel: new Map([
          [main.id, program(main.id, "メイン番組")],
          [sub.id, program(sub.id, "サブ番組")],
        ]),
        streamsByChannel: new Map([[main.id, selectedStream]]),
        currentTime: 31_000,
        halfWidth: false,
        viewMode: "cards",
        onReserve: vi.fn(),
        onWatch: vi.fn(),
      }),
    );

    expect(markup).toContain("サブチャンネル");
    expect(markup).toContain("サンプル放送（サービス 101）");
    expect(markup).toContain("サンプル放送（サービス 102）");
    expect(markup).toContain("メイン番組");
    expect(markup).not.toContain("サブ番組");
    expect(markup).toContain("視聴中");
  });

  it("renders the station logo and station name in separate table cells", () => {
    const station = channel({
      id: 1,
      serviceId: 101,
      name: "サンプル放送",
      halfWidthName: "サンプル放送",
    });
    const group = groupOnAirChannels([station])[0];

    const markup = renderToStaticMarkup(
      createElement("table", null,
        createElement("tbody", null,
          createElement(OnAirChannelGroupRow, {
            group,
            programsByChannel: new Map([[station.id, program(station.id, "サンプル番組")]]),
            streamsByChannel: new Map(),
            currentTime: 31_000,
            halfWidth: false,
            onReserve: vi.fn(),
            onWatch: vi.fn(),
          }),
        ),
      ),
    );
    const cells = [...markup.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/g)].map((match) => match[1]);

    expect(cells).toHaveLength(7);
    expect(cells[0]).not.toContain("サンプル放送");
    expect(cells[1]).toContain("サンプル放送");
    expect(cells[2]).toContain("メイン");
  });

  it("keeps an accessible station name when only the logo column is visible", () => {
    const station = channel({
      id: 1,
      serviceId: 101,
      name: "サンプル放送",
      halfWidthName: "サンプル放送",
    });
    const group = groupOnAirChannels([station])[0];
    const columns: TableColumnVisibilityState<
      "logo" | "station" | "service" | "program" | "airtime" | "stream" | "actions"
    > = {
      columns: [
        { key: "logo", label: "局ロゴ" },
        { key: "station", label: "局名" },
        { key: "service", label: "サービス" },
        { key: "program", label: "放送中の番組" },
        { key: "airtime", label: "放送時間" },
        { key: "stream", label: "配信" },
        { key: "actions", label: "操作" },
      ],
      visibleCount: 1,
      isVisible: (key) => key === "logo",
      toggle: vi.fn(),
      showAll: vi.fn(),
      moveUp: vi.fn(),
      moveDown: vi.fn(),
    };

    const markup = renderToStaticMarkup(
      createElement("table", null,
        createElement("tbody", null,
          createElement(OnAirChannelGroupRow, {
            group,
            programsByChannel: new Map([[station.id, program(station.id, "サンプル番組")]]),
            streamsByChannel: new Map(),
            currentTime: 31_000,
            halfWidth: false,
            onReserve: vi.fn(),
            onWatch: vi.fn(),
            columns,
          }),
        ),
      ),
    );

    expect(markup.match(/<td\b/g)).toHaveLength(1);
    expect(markup).toContain('<span class="sr-only">サンプル放送</span>');
  });
});
