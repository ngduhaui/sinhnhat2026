export type CardContent = {
  herName: string;
  hisName: string;
  letter: string;
  wishes: [string, string, string];
  whisper: string;
};

export type MemoryPhoto = {
  id: string;
  src: string;
  caption: string;
};

const DRAFT_KEY = "thu-sinh-nhat-draft-v1";
const PHOTO_KEY = "thu-sinh-nhat-photos-v1";

export const DEFAULT_CARD: CardContent = {
  herName: "Trinh",
  hisName: "Dự",
  letter:
    "Trinh,\n\nHôm nay em mở mắt ở Nhật, còn anh mở mắt ở Việt Nam. Giữa chúng ta là hai tiếng đồng hồ, một mùa lạnh, và cả một biển.\n\nAnh đã quen nhắn tin khi em còn ngủ, quen đọc tin của em lúc Hà Nội đã tối. Nhưng có một điều anh chưa quen được: mỗi lần em kể chuyện đi làm về muộn, giọng mệt đi một chút, anh chỉ muốn với tay qua màn hình. Anh biết mình không với tới được. Nên hôm nay anh làm một việc khác — gói hết những điều không nói thành lời vào đây, để em mở ra và biết rằng dù xa, em vẫn đang được yêu rất gần.\n\nCảm ơn em vì đã chọn đi xa để trưởng thành. Cảm ơn em vì những ngày mệt nhất vẫn gọi cho anh. Cảm ơn em vì đã giữ một chỗ cho anh, trong một thành phố không có anh.\n\nSinh nhật này anh không ở cạnh em. Anh không thắp được nến, không cắt được bánh, không ôm được em ngay khi em vừa mở mắt. Nhưng anh đang ở đây — ở đầu dây bên kia, ở đúng nơi em cần, và ở lại đó.\n\nChúc em một tuổi mới: ngủ đủ hơn, ăn cơm đúng bữa hơn, bớt tự làm khó mình hơn. Và khi nào thấy cô đơn, nhớ rằng ở Việt Nam có một người đang đếm từng ngày để được gặp em.\n\nAnh ở đây. Vẫn ở đây.",
  wishes: [
    "Một năm bình yên, đủ ấm cho những ngày Nhật lạnh",
    "Được cười nhiều hơn, lo ít hơn, không phải mạnh mẽ một mình",
    "Một ngày không xa, anh đứng trước mặt em và nói hết những điều này",
  ],
  whisper:
    "Nếu em đang đọc dòng này ở Nhật, thì đúng rồi — người viết lá thư này vẫn đang đợi em ở Việt Nam.",
};

export function belovedName(card: CardContent) {
  return card.herName.trim() || "em";
}

export function signerName(card: CardContent) {
  return card.hisName.trim() || "Anh";
}

export function encodeShare(card: CardContent) {
  const payload = {
    v: 1,
    herName: card.herName.slice(0, 40),
    hisName: card.hisName.slice(0, 40),
    letter: card.letter.slice(0, 2600),
    wishes: card.wishes.map((wish) => wish.slice(0, 90)),
    whisper: card.whisper.slice(0, 280),
  };
  const bytes = new TextEncoder().encode(JSON.stringify(payload));
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/g, "");
}

export function decodeShare(hash: string): CardContent | null {
  if (!hash) return null;
  try {
    const b64 = hash.replaceAll("-", "+").replaceAll("_", "/");
    const pad = b64.length % 4 === 0 ? b64 : b64 + "=".repeat(4 - (b64.length % 4));
    const binary = atob(pad);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const data = JSON.parse(new TextDecoder().decode(bytes)) as Partial<CardContent> & {
      wishes?: string[];
    };
    if (typeof data.letter !== "string") return null;
    const wishes = [0, 1, 2].map((index) =>
      String(data.wishes?.[index] ?? DEFAULT_CARD.wishes[index]).slice(0, 90),
    ) as [string, string, string];
    return {
      herName: String(data.herName ?? "").slice(0, 40),
      hisName: String(data.hisName ?? "").slice(0, 40),
      letter: data.letter.slice(0, 2600),
      wishes,
      whisper: String(data.whisper ?? DEFAULT_CARD.whisper).slice(0, 280),
    };
  } catch {
    return null;
  }
}

export function readDraft(): CardContent | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    return decodeShare(raw);
  } catch {
    return null;
  }
}

export function writeDraft(card: CardContent) {
  try {
    localStorage.setItem(DRAFT_KEY, encodeShare(card));
  } catch {
    /* private mode or full storage — the link still carries the letter */
  }
}

export function readPhotos(): MemoryPhoto[] {
  try {
    const raw = localStorage.getItem(PHOTO_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as MemoryPhoto[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((photo) => photo && typeof photo.src === "string" && typeof photo.id === "string")
      .slice(0, 6)
      .map((photo) => ({
        id: photo.id,
        src: photo.src,
        caption: String(photo.caption ?? "").slice(0, 80),
      }));
  } catch {
    return [];
  }
}

export function writePhotos(photos: MemoryPhoto[]) {
  try {
    localStorage.setItem(PHOTO_KEY, JSON.stringify(photos.slice(0, 6)));
  } catch {
    /* keep the in-memory photos even if storage is full */
  }
}

export function shareUrl(card: CardContent) {
  const token = encodeShare(card);
  return {
    token,
    url: `${location.origin}${location.pathname}${location.search}#${token}`,
  };
}
