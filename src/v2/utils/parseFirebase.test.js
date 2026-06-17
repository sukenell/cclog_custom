import { parseFirebaseMessages, parseLogContent } from './parseFirebase';

describe('parseFirebaseMessages', () => {
  test('sets explicit main background color for export-hosted environments', () => {
    const fileContent = [
      {
        fields: {
          channelName: { stringValue: 'main' },
          name: { stringValue: 'Alice' },
          text: { stringValue: 'hello' },
        },
      },
    ];

    const [message] = parseFirebaseMessages(fileContent, { diceEnabled: false });

    expect(message.backgroundColor).toBe('#313131');
  });

  test('does not mark non-main category as dice when diceEnabled is false', () => {
    const fileContent = [
      {
        fields: {
          channelName: { stringValue: 'custom' },
          name: { stringValue: 'Alice' },
          text: { stringValue: 'CC<=50 성공' },
        },
      },
    ];

    const [message] = parseFirebaseMessages(fileContent, { diceEnabled: false });

    expect(message.isDice).toBe(false);
    expect(message.diceStyle).toBeNull();
  });
});

describe('parseLogContent', () => {
  test('parses uploaded CCFolia html into v2 preview messages', () => {
    const html = `
      <div>
        <p><span>[main]</span> <span>KP</span><b> - 2025/01/01 10:30</b> : <span>첫 대사</span></p>
        <p><span>[정보]</span> <span>system</span> : <span>장면 전환</span></p>
      </div>
    `;

    const messages = parseLogContent(html, { diceEnabled: false });

    expect(messages).toHaveLength(2);
    expect(messages[0]).toMatchObject({
      category: 'main',
      charName: 'KP',
      text: '첫 대사',
      backgroundColor: '#313131',
      imgUrl: 'https://ccfolia.com/blank.gif',
      isDice: false,
    });
    expect(messages[0].timestamp).toEqual(expect.any(String));

    expect(messages[1]).toMatchObject({
      category: 'info',
      charName: 'system',
      text: '장면 전환',
      backgroundColor: '#464646',
    });
  });

  test('parses the current exported all-tab html format', () => {
    const html = `
      <!DOCTYPE html>
      <html lang="ja">
        <body>
          <p style="color:#888888;">
            <span> [main]</span>
            <span>새로운 탐사자</span> :
            <span>
              ㅇㅇ
            </span>
          </p>

          <p style="color:#888888;">
            <span> [main]</span>
            <span>새로운 탐사자</span> :
            <span>
              대사
            </span>
          </p>
        </body>
      </html>
    `;

    const messages = parseLogContent(html, { diceEnabled: false });

    expect(messages).toHaveLength(2);
    expect(messages[0]).toMatchObject({
      category: 'main',
      charName: '새로운 탐사자',
      text: 'ㅇㅇ',
      backgroundColor: '#313131',
    });
    expect(messages[1]).toMatchObject({
      category: 'main',
      charName: '새로운 탐사자',
      text: '대사',
      backgroundColor: '#313131',
    });
  });
});
