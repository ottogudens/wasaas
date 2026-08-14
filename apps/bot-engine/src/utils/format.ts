export const extractMessageText = (payload: any): string => {
  if (!payload) return '';
  if (typeof payload === 'string') return payload;
  if (payload.body && typeof payload.body === 'string') return payload.body;
  const msg = payload.message || payload;
  if (typeof msg === 'string') return msg;
  return (
    msg?.conversation ||
    msg?.extendedTextMessage?.text ||
    msg?.imageMessage?.caption ||
    msg?.videoMessage?.caption ||
    msg?.documentMessage?.caption ||
    msg?.buttonsResponseMessage?.selectedButtonId ||
    msg?.listResponseMessage?.singleSelectReply?.selectedRowId ||
    ''
  );
};

export const cleanPhoneNumber = (raw: string): string => {
  if (!raw) return '';
  return raw.replace(/@.*$/, '').replace(/:.*$/, '').replace(/[^\d]/g, '');
};
