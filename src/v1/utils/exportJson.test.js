import { buildV1EbookJson } from "./exportJson";

describe("buildV1EbookJson", () => {
  test("builds ebook json from uploaded html and includes configured images", () => {
    const html = `
      <div>
        <p><span>[main]</span> <span>KP</span><b> - 2025/01/01</b> : <span>첫 대사</span></p>
        <p><span>[main]</span> <span>나레이션</span> : <span>장면 전환</span></p>
        <p><span>[비밀(kp)]</span> <span>KP</span> : <span>비밀 정보</span></p>
      </div>
    `;

    const result = buildV1EbookJson({
      fileContent: html,
      fileName: "session.html",
      selectedCategories: { main: true, "비밀(kp)": true },
      inputTexts: ["나레이션"],
      charHeads: { KP: "https://example.com/kp.png" },
      titleImages: ["https://example.com/title.png"],
      endImages: ["https://example.com/end.png"],
      diceEnabled: true,
      t: (key) => (key === "preview.secret" ? "비밀" : key),
    });

    expect(result.ebookView.titlePage.scenarioTitle).toBe("session");
    expect(result.lines).toHaveLength(5);

    expect(result.lines[0]).toEqual({
      id: expect.stringMatching(/^\d{16}$/),
      speaker: "",
      role: "system",
      text: "",
      imageUrl: "https://example.com/title.png",
    });

    expect(result.lines[1].speaker).toBe("KP");
    expect(result.lines[1].role).toBe("character");
    expect(result.lines[1].text).toBe("첫 대사");
    expect(result.lines[1].input.speakerImages.standing.url).toBe(
      "https://example.com/kp.png"
    );

    expect(result.lines[2].role).toBe("system");
    expect(result.lines[2].text).toBe("장면 전환");

    expect(result.lines[3].role).toBe("secret");
    expect(result.lines[3].text).toBe("비밀 정보");

    expect(result.lines[4]).toEqual({
      id: expect.stringMatching(/^\d{16}$/),
      speaker: "",
      role: "system",
      text: "",
      imageUrl: "https://example.com/end.png",
    });
  });

  test("builds ebook json from fetched firebase messages", () => {
    const result = buildV1EbookJson({
      fileContent: [
        {
          fields: {
            channelName: { stringValue: "main" },
            name: { stringValue: "PL" },
            text: { stringValue: "CC<=60 굴림: 22" },
            iconUrl: { stringValue: "https://example.com/pl.png" },
            createdAt: { timestampValue: "2025-01-01T10:30:00+09:00" },
          },
        },
      ],
      fileName: "room.html",
      selectedCategories: { main: true },
      inputTexts: [],
      charHeads: {},
      titleImages: [],
      endImages: [],
      diceEnabled: true,
      t: (key) => key,
    });

    expect(result.lines).toHaveLength(1);
    expect(result.lines[0].speaker).toBe("PL");
    expect(result.lines[0].role).toBe("dice");
    expect(result.lines[0].timestamp).toBe("오전 10:30");
    expect(result.lines[0].input.dice.template).toBe("coc-1");
  });
});
