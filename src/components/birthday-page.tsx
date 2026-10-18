import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Music, VolumeX } from "lucide-react";
import { belovedName, DEFAULT_CARD, decodeShare, readDraft, signerName, type CardContent } from "@/lib/card";
import { startMusic, stopMusic } from "@/lib/music";
import roseArt from "@/assets/art/rose.jpg";
import cakeArt from "@/assets/art/cake.jpg";
import giftArt from "@/assets/art/gift.jpg";
import stillArt from "@/assets/art/still.jpg";

/**
 * Candle placement is measured off the cake photo: the top surface sits
 * between ~52% and ~57% of the image height, so each base lands on it
 * (bottom% is the distance from the image's bottom edge).
 * The middle candle sits further back — higher on screen and slightly smaller.
 */
const CANDLES = [
  { id: "left", left: "40.5%", bottom: "44.2%", scale: 0.96, tilt: "-5deg", delay: "0s" },
  { id: "mid", left: "50.5%", bottom: "46.8%", scale: 0.82, tilt: "1deg", delay: "0.7s" },
  { id: "right", left: "60%", bottom: "44.6%", scale: 1, tilt: "5deg", delay: "1.4s" },
];

const DRIFT = [
  { left: "6%", delay: "0s", duration: "13s", size: 11 },
  { left: "18%", delay: "2.2s", duration: "15s", size: 8 },
  { left: "32%", delay: "0.8s", duration: "12s", size: 13 },
  { left: "48%", delay: "3.4s", duration: "16s", size: 9 },
  { left: "63%", delay: "1.4s", duration: "14s", size: 12 },
  { left: "76%", delay: "4s", duration: "13s", size: 8 },
  { left: "88%", delay: "2.6s", duration: "15s", size: 11 },
];

const iconBtn =
  "grid size-11 place-items-center rounded-full border border-cream/25 bg-wine/50 text-cream backdrop-blur-sm transition-transform duration-150 ease-out active:scale-[0.96]";

const primaryBtn =
  "inline-flex min-h-12 items-center justify-center rounded-full bg-rose px-7 text-sm font-medium text-cream transition-transform duration-150 ease-out active:scale-[0.96]";

const quietBtn = "inline-flex min-h-11 items-center justify-center px-3 text-sm text-rose";

function Petals({ items }: { items: typeof DRIFT }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {items.map((petal) => (
        <span
          key={`${petal.left}-${petal.delay}`}
          className="petal"
          style={{
            left: petal.left,
            width: petal.size,
            height: petal.size * 1.4,
            animationDelay: petal.delay,
            animationDuration: petal.duration,
          }}
        />
      ))}
    </div>
  );
}

function MusicGlyph({ on }: { on: boolean }) {
  const motion =
    "col-start-1 row-start-1 size-5 transition-[opacity,filter,scale] duration-300 ease-[cubic-bezier(0.2,0,0,1)]";
  return (
    <span className="grid">
      <Music className={`${motion} ${on ? "scale-100 opacity-100 blur-none" : "scale-[0.25] opacity-0 blur-[4px]"}`} />
      <VolumeX
        className={`${motion} ${on ? "scale-[0.25] opacity-0 blur-[4px]" : "scale-100 opacity-100 blur-none"}`}
      />
    </span>
  );
}

export function BirthdayPage() {
  const [card, setCard] = useState<CardContent>(DEFAULT_CARD);
  const [opened, setOpened] = useState(false);
  const [lit, setLit] = useState(true);
  const [giftOpen, setGiftOpen] = useState(false);
  const [musicOn, setMusicOn] = useState(false);
  const [burst, setBurst] = useState(false);
  const [micHint, setMicHint] = useState<string | null>(null);
  const litRef = useRef(true);
  const micStop = useRef<(() => void) | null>(null);

  useEffect(() => {
    const shared = decodeShare(window.location.hash.replace(/^#/, ""));
    const stored = shared ?? readDraft();
    if (stored?.herName.trim()) setCard(stored);
    return () => {
      stopMusic();
      micStop.current?.();
    };
  }, []);

  function toggleMusic() {
    if (musicOn) {
      stopMusic();
      setMusicOn(false);
      return;
    }
    startMusic();
    setMusicOn(true);
  }

  function openLetter() {
    setOpened(true);
    if (!musicOn) {
      startMusic();
      setMusicOn(true);
    }
  }

  function extinguish() {
    if (!litRef.current) return;
    litRef.current = false;
    micStop.current?.();
    setLit(false);
    setMicHint(null);
    setBurst(true);
    window.setTimeout(() => setBurst(false), 2800);
  }

  function relight() {
    litRef.current = true;
    setLit(true);
    setMicHint(null);
  }

  async function listenBlow() {
    if (!litRef.current || micStop.current) return;
    setMicHint("Đưa máy gần miệng và thổi nhẹ…");
    let stream: MediaStream | null = null;
    let audio: AudioContext | null = null;
    let frame = 0;
    const stop = () => {
      if (frame) cancelAnimationFrame(frame);
      stream?.getTracks().forEach((track) => track.stop());
      void audio?.close();
      micStop.current = null;
    };
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audio = new AudioContext();
      const source = audio.createMediaStreamSource(stream);
      const analyser = audio.createAnalyser();
      analyser.fftSize = 1024;
      source.connect(analyser);
      const bins = new Uint8Array(analyser.fftSize);
      const started = performance.now();
      micStop.current = stop;
      const loop = () => {
        analyser.getByteTimeDomainData(bins);
        let peak = 0;
        for (const sample of bins) peak = Math.max(peak, Math.abs(sample - 128));
        if (peak > 22) {
          stop();
          extinguish();
          return;
        }
        if (performance.now() - started > 7000) {
          stop();
          setMicHint("Chưa nghe thấy hơi thở. Bấm Thổi nến cũng được.");
          return;
        }
        frame = requestAnimationFrame(loop);
      };
      loop();
    } catch {
      stop();
      setMicHint("Không mở được micro. Bấm Thổi nến giúp em.");
    }
  }

  const name = belovedName(card);

  return (
    <>
      {opened ? (
        <main className="min-h-dvh bg-wine text-cream">
          <header className="sticky top-0 z-20 flex items-center justify-between bg-wine/90 px-3 py-2 backdrop-blur-md">
            <button
              type="button"
              onClick={() => setOpened(false)}
              className="min-h-11 px-2 text-sm text-cream transition-transform duration-150 ease-out active:scale-[0.96]"
            >
              Gấp thư
            </button>
            <button type="button" className={iconBtn} onClick={toggleMusic} aria-pressed={musicOn} aria-label={musicOn ? "Tắt nhạc" : "Bật nhạc"}>
              <MusicGlyph on={musicOn} />
            </button>
          </header>

          <div className="mx-auto max-w-xl sm:px-4 sm:pb-16">
            <article className="rise sheet overflow-hidden bg-cream text-ink sm:rounded-card">
              <img src={roseArt} alt="" className="aspect-[3/2] w-full object-cover" />
              <div className="px-6 py-8 sm:px-10 sm:py-12">
                <p className="text-xs font-medium tracking-widest text-rose uppercase">Dành cho hôm nay</p>
                <h1 className="mt-3 font-serif text-5xl leading-none font-medium sm:text-6xl">
                  <span className="block">Chúc mừng</span>
                  <span className="mt-1 block">sinh nhật</span>
                  <span className="mt-3 block font-serif text-4xl italic text-rose sm:text-5xl">{name}</span>
                </h1>

                <section className="mt-10" aria-label="Bánh sinh nhật">
                  <p className="text-center font-serif text-xl italic text-ink/80">Ước một điều, rồi thổi nến.</p>
                  <div className="relative mx-auto mt-5 max-w-sm">
                    <img src={cakeArt} alt="Bánh kem và cánh hoa hồng" className="aspect-square w-full rounded-card object-cover" />
                    {CANDLES.map((candle) => (
                      <div
                        key={candle.id}
                        className={lit ? "candle" : "candle is-unlit"}
                        style={
                          {
                            left: candle.left,
                            bottom: candle.bottom,
                            "--candle-scale": candle.scale,
                            "--candle-tilt": candle.tilt,
                          } as CSSProperties
                        }
                        aria-hidden="true"
                      >
                        <span className={lit ? "candle-aura" : "candle-aura is-out"} />
                        {!lit ? (
                          <span className="smoke" style={{ animationDelay: candle.delay }}>
                            <span />
                            <span />
                            <span />
                          </span>
                        ) : null}
                        <span className={lit ? "flame" : "flame is-out"} style={{ transitionDelay: candle.delay }}>
                          <span className="flame-core" />
                        </span>
                        <span className="candle-wick" />
                        <span className="candle-stick" />
                      </div>
                    ))}
                  </div>
                  <div className="mt-5 flex flex-col items-center">
                    {lit ? (
                      <>
                        <button type="button" className={primaryBtn} onClick={extinguish}>
                          Thổi nến
                        </button>
                        <button type="button" className={quietBtn} onClick={() => void listenBlow()}>
                          Hoặc thổi vào micro
                        </button>
                        {micHint ? <p className="max-w-xs text-center text-sm text-ink/70">{micHint}</p> : null}
                      </>
                    ) : (
                      <>
                        <p className="max-w-xs text-center font-serif text-2xl leading-snug italic">
                          Nến tắt rồi. Giữ điều ước đó cho riêng {name}.
                        </p>
                        <button type="button" className={quietBtn} onClick={relight}>
                          Thắp lại
                        </button>
                      </>
                    )}
                  </div>
                </section>

                <div className="mt-12 space-y-4">
                  {card.letter.split(/\n\n+/).map((paragraph, index) => (
                    <p key={index} className="font-serif text-xl leading-relaxed">
                      {paragraph}
                    </p>
                  ))}
                </div>

                <section className="mt-12" aria-label="Ba điều chúc">
                  <h2 className="text-xs font-medium tracking-widest text-rose uppercase">Ba điều anh chúc</h2>
                  <ol className="mt-2">
                    {card.wishes.map((wish, index) => (
                      <li key={index} className="flex items-baseline gap-4 border-t border-ink/10 py-4">
                        <span className="font-serif text-xl italic text-rose">0{index + 1}</span>
                        <p className="font-serif text-xl leading-snug">{wish}</p>
                      </li>
                    ))}
                  </ol>
                </section>

                <section className="mt-12" aria-label="Hộp quà">
                  <h2 className="text-xs font-medium tracking-widest text-rose uppercase">Trong hộp quà</h2>
                  <div className={`gift-scene mt-4 ${giftOpen ? "is-open" : ""}`}>
                    <div className="gift-well">
                      <p className="gift-poem">
                        {name} ơi,
                        <br />
                        cách nhau một biển,
                        <br />
                        vẫn gần nhau một chỗ.
                        <br />
                        <br />
                        Anh không gói được
                        <br />
                        những ngày sắp tới,
                        <br />
                        chỉ gói một câu:
                        <br />
                        <br />
                        cứ đi đường của em,
                        <br />
                        anh đứng đợi ở cuối đường.
                      </p>
                      <p className="gift-sign">{signerName(card)}</p>
                    </div>
                    <button
                      type="button"
                      className={`gift-lid ${giftOpen ? "is-open" : ""}`}
                      onClick={() => setGiftOpen(true)}
                      aria-expanded={giftOpen}
                    >
                      <img src={giftArt} alt="Hộp quà buộc ruy băng" />
                      {giftOpen ? null : <span className="gift-open-label">Mở hộp quà</span>}
                    </button>
                  </div>
                </section>

                <footer className="mt-12 border-t border-ink/10 pt-8">
                  <p className="font-serif text-3xl italic">{signerName(card)}</p>
                  <p className="mt-2 text-sm text-ink/60">Viết cho {name}</p>
                </footer>
              </div>
            </article>
          </div>
        </main>
      ) : (
        <main className="relative min-h-dvh overflow-hidden bg-wine text-cream">
          <img
            src={stillArt}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            style={{ objectPosition: "center 42%" }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-wine via-wine/80 to-wine/30" />
          <Petals items={DRIFT} />
          <div className="relative z-10 flex min-h-dvh flex-col justify-end px-6 pt-24 pb-14 sm:items-center sm:justify-end sm:pb-20">
            <div className="max-w-md">
              <p className="text-xs font-medium tracking-widest text-cream/80 uppercase">Lá thư sinh nhật</p>
              <h1 className="mt-3 font-serif text-5xl leading-tight font-medium italic sm:text-6xl">Gửi {name}</h1>
              <p className="mt-4 max-w-sm text-base leading-relaxed text-cream/85">
                Gửi từ Việt Nam, đến Nhật Bản — một lá thư giữ đến hôm nay mới mở.
              </p>
              <button type="button" className={`${primaryBtn} mt-8`} onClick={openLetter}>
                Mở phong thư
              </button>
            </div>
          </div>
        </main>
      )}

      {burst ? (
        <div className="pointer-events-none fixed inset-0 z-30 overflow-hidden">
          <Petals
            items={DRIFT.map((petal) => ({
              ...petal,
              duration: "2.6s",
              delay: "0s",
              size: petal.size + 4,
            }))}
          />
        </div>
      ) : null}
    </>
  );
}
