const crypto = require('crypto');

const captchaStore = new Map();

// Tự động dọn dẹp captcha hết hạn
setInterval(() => {
  const now = Date.now();
  for (const [id, data] of captchaStore.entries()) {
    if (now > data.expiresAt) {
      captchaStore.delete(id);
    }
  }
}, 60000);

const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateRandomCode(length = 5) {
  let text = '';
  for (let i = 0; i < length; i++) {
    text += CHARS.charAt(Math.floor(Math.random() * CHARS.length));
  }
  return text;
}

function getRandomColor() {
  const letters = '0123456789ABCDEF';
  let color = '#';
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 12)]; // slightly darker colors
  }
  return color;
}

function createCaptchaSvg(code) {
  const width = 160;
  const height = 50;

  // Background noise lines
  let lines = '';
  for (let i = 0; i < 6; i++) {
    const x1 = Math.floor(Math.random() * width);
    const y1 = Math.floor(Math.random() * height);
    const x2 = Math.floor(Math.random() * width);
    const y2 = Math.floor(Math.random() * height);
    const stroke = getRandomColor();
    lines += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="1.5" stroke-opacity="0.6"/>`;
  }

  // Noise dots
  let dots = '';
  for (let i = 0; i < 30; i++) {
    const cx = Math.floor(Math.random() * width);
    const cy = Math.floor(Math.random() * height);
    const r = Math.random() * 2;
    dots += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${getRandomColor()}" opacity="0.5"/>`;
  }

  // Draw characters with random rotation and position
  let charElements = '';
  const charSpacing = width / (code.length + 1);

  for (let i = 0; i < code.length; i++) {
    const char = code[i];
    const x = 16 + i * charSpacing + (Math.random() * 6 - 3);
    const y = 32 + (Math.random() * 8 - 4);
    const rot = Math.floor(Math.random() * 40 - 20); // -20 to 20 deg
    const color = getRandomColor();
    const fontSize = 24 + Math.floor(Math.random() * 6);

    charElements += `
      <text 
        x="${x}" 
        y="${y}" 
        font-family="Arial, sans-serif" 
        font-size="${fontSize}" 
        font-weight="bold" 
        fill="${color}" 
        transform="rotate(${rot}, ${x}, ${y})"
      >${char}</text>`;
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" style="background-color: #f1f5f9; border-radius: 6px; user-select: none;">
    <rect width="100%" height="100%" fill="#f8fafc" rx="6"/>
    ${lines}
    ${dots}
    ${charElements}
  </svg>`;

  return svg;
}

function generateCaptcha() {
  const id = crypto.randomUUID();
  const code = generateRandomCode(5);
  const svg = createCaptchaSvg(code);

  captchaStore.set(id, {
    code: code.toUpperCase(),
    expiresAt: Date.now() + 5 * 60 * 1000, // 5 phút
  });

  return { id, svg };
}

function verifyCaptcha(id, userInput) {
  if (!id || !userInput) return false;
  const item = captchaStore.get(id);
  if (!item) return false;

  // Once checked, delete to prevent replay
  captchaStore.delete(id);

  if (Date.now() > item.expiresAt) return false;
  return item.code === userInput.trim().toUpperCase();
}

module.exports = {
  generateCaptcha,
  verifyCaptcha,
};
