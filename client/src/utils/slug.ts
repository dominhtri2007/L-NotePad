// Tạo slug ngẫu nhiên giống ví dụ của người dùng: domain/abc3223
export function generateRandomSlug(): string {
  const letters = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';

  let letterPart = '';
  for (let i = 0; i < 3; i++) {
    letterPart += letters.charAt(Math.floor(Math.random() * letters.length));
  }

  let numberPart = '';
  for (let i = 0; i < 4; i++) {
    numberPart += numbers.charAt(Math.floor(Math.random() * numbers.length));
  }

  return `${letterPart}${numberPart}`;
}

export function countStats(text: string) {
  const chars = text.length;
  const charsNoSpaces = text.replace(/\s+/g, '').length;
  const words = text.trim() === '' ? 0 : text.trim().split(/\s+/).length;
  const lines = text === '' ? 1 : text.split('\n').length;

  return { chars, charsNoSpaces, words, lines };
}
