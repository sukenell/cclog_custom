import { parseFirebaseMessages } from './parseFirebase';

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
