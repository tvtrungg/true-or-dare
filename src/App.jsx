import { AnimatePresence, motion, useMotionValue, useTransform } from "framer-motion";
import { useCallback, useMemo, useRef, useState } from "react";
import importedQuestions from "./questions.json";

const FALLBACK_DATA = {
  truthOrDare: {
    truth: [
      "What is the most embarrassing thing you have done at a party?",
      "Who here would you trust with your unlocked phone?",
      "What is one secret talent you have never shown this group?",
    ],
    dare: [
      "Give the person to your left a dramatic compliment.",
      "Let the group choose your next sip.",
      "Do your best celebrity impression for 20 seconds.",
    ],
    special: [
      "Everyone raises a glass and makes a toast.",
      "Until your next turn, you must speak like a game show host.",
      "Pick someone to swap seats with you.",
    ],
  },
  drinkingGames: {
    normal: [
      "Last person to touch the floor drinks.",
      "Everyone wearing black drinks.",
      "Point to the funniest person. They give out a sip.",
    ],
    special: [
      "Immunity: Block one drink before your next turn.",
      "Rule Maker: Create one table rule until your next turn.",
      "Lucky Draw: Give out three sips.",
    ],
  },
};

const SPECIAL_CHANCE = 0.15;
const SPECIAL_TARGET_PROGRESS = 0.7;
const SWIPE_OFFSET = 92;
const SWIPE_VELOCITY = 520;

const CARD_COPY = {
  truth: {
    title: "Truth",
    label: "Truth",
    hint: "Answer honestly",
  },
  dare: {
    title: "Dare",
    label: "Dare",
    hint: "Commit fully",
  },
};

const cardShellVariants = {
  initial: { opacity: 0, y: 30, scale: 0.94 },
  active: { opacity: 1, y: 0, scale: 1 },
  exit: (direction) => ({
    opacity: 0,
    x: direction * 460,
    rotate: direction * 18,
    scale: 0.94,
    transition: { duration: 0.22, ease: [0.22, 1, 0.36, 1] },
  }),
};

function vibrate(pattern) {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate(pattern);
  }
}

function shuffle(items) {
  const shuffled = [...items];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  return shuffled;
}

function cleanDeck(source, fallback) {
  const deck = Array.isArray(source) ? source : fallback;

  return deck
    .filter((question) => typeof question === "string" && question.trim())
    .map((question) => question.trim());
}

function normalizeData(rawQuestions) {
  const source =
    rawQuestions && typeof rawQuestions === "object" && !Array.isArray(rawQuestions)
      ? rawQuestions
      : {};

  const legacyTruthOrDare =
    Array.isArray(source.truth) || Array.isArray(source.dare) || Array.isArray(source.special)
      ? source
      : {};
  const truthOrDareSource =
    source.truthOrDare && typeof source.truthOrDare === "object"
      ? source.truthOrDare
      : legacyTruthOrDare;
  const drinkingSource =
    source.drinkingGames && typeof source.drinkingGames === "object" ? source.drinkingGames : {};

  const truthOrDare = {
    truth: cleanDeck(truthOrDareSource.truth, FALLBACK_DATA.truthOrDare.truth),
    dare: cleanDeck(truthOrDareSource.dare, FALLBACK_DATA.truthOrDare.dare),
    special: cleanDeck(truthOrDareSource.special, FALLBACK_DATA.truthOrDare.special),
  };
  const drinkingGames = {
    normal: cleanDeck(drinkingSource.normal, FALLBACK_DATA.drinkingGames.normal),
    special: cleanDeck(drinkingSource.special, FALLBACK_DATA.drinkingGames.special),
  };

  if (truthOrDare.truth.length + truthOrDare.dare.length + truthOrDare.special.length === 0) {
    truthOrDare.truth = FALLBACK_DATA.truthOrDare.truth;
    truthOrDare.dare = FALLBACK_DATA.truthOrDare.dare;
    truthOrDare.special = FALLBACK_DATA.truthOrDare.special;
  }

  if (drinkingGames.normal.length + drinkingGames.special.length === 0) {
    drinkingGames.normal = FALLBACK_DATA.drinkingGames.normal;
    drinkingGames.special = FALLBACK_DATA.drinkingGames.special;
  }

  return { truthOrDare, drinkingGames };
}

function HomeScreen({ onStart }) {
  return (
    <main className="flex h-[100dvh] w-full touch-none select-none flex-col items-center justify-center overflow-hidden bg-black px-6 pb-[max(env(safe-area-inset-bottom),1.5rem)] pt-[max(env(safe-area-inset-top),1.5rem)]">
      <motion.h1
        className="mb-12 text-center font-display text-6xl font-black uppercase leading-[0.9] text-fuchsia-400 drop-shadow-[0_0_24px_rgba(236,72,153,0.78)] sm:text-7xl"
        initial={{ opacity: 0, y: 18, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 22 }}
      >
        Party
        <span className="block text-violet-300 drop-shadow-[0_0_28px_rgba(167,139,250,0.72)]">
          Cards
        </span>
      </motion.h1>

      <div className="grid w-full max-w-sm gap-4">
        <motion.button
          className="rounded-[24px] border border-fuchsia-300/40 bg-fuchsia-500 px-8 py-7 text-2xl font-black uppercase tracking-normal text-white shadow-neon outline-none"
          type="button"
          whileTap={{ scale: 0.92 }}
          onClick={() => {
            vibrate(25);
            onStart("truthOrDare");
          }}
        >
          Truth or Dare
        </motion.button>
        <motion.button
          className="rounded-[24px] border border-cyan-200/45 bg-gradient-to-br from-cyan-400 to-amber-400 px-8 py-7 text-2xl font-black uppercase tracking-normal text-black shadow-[0_0_30px_rgba(34,211,238,0.3),0_0_70px_rgba(251,191,36,0.16)] outline-none"
          type="button"
          whileTap={{ scale: 0.92 }}
          onClick={() => {
            vibrate(25);
            onStart("drinkingGames");
          }}
        >
          Drinking Games
        </motion.button>
      </div>
    </main>
  );
}

function FateButton({ deck, count, disabled, onChoose }) {
  const isTruth = deck === "truth";
  const colorClasses = isTruth
    ? "border-violet-300/45 bg-violet-500 text-white shadow-[0_0_30px_rgba(139,92,246,0.34)]"
    : "border-orange-300/50 bg-gradient-to-br from-fuchsia-500 to-orange-500 text-white shadow-[0_0_30px_rgba(249,115,22,0.3)]";

  return (
    <motion.button
      className={`min-h-28 flex-1 rounded-[24px] border px-5 py-6 text-left outline-none transition ${
        disabled ? "border-white/10 bg-white/[0.04] text-white/35 shadow-none" : colorClasses
      }`}
      type="button"
      disabled={disabled}
      whileTap={disabled ? undefined : { scale: 0.94 }}
      onClick={() => onChoose(deck)}
    >
      <span className="block text-3xl font-black uppercase leading-none">
        {disabled ? "Empty!" : CARD_COPY[deck].label}
      </span>
      <span className="mt-3 block text-sm font-black uppercase tracking-[0.2em] opacity-75">
        {count} left
      </span>
    </motion.button>
  );
}

function TruthOrDareFaceDown({ counts, onChoose }) {
  const truthEmpty = counts.truth === 0;
  const dareEmpty = counts.dare === 0;
  const specialAvailable = counts.special > 0;

  return (
    <div className="absolute inset-0 flex flex-col justify-between rounded-[24px] border border-fuchsia-300/20 bg-[#1A1A1A] p-6 shadow-card">
      <div>
        <p className="text-sm font-black uppercase tracking-[0.32em] text-fuchsia-200/70">
          Choose your fate
        </p>
        <h2 className="mt-4 text-5xl font-black uppercase leading-none text-white drop-shadow-[0_0_18px_rgba(255,255,255,0.25)]">
          Truth
          <span className="block text-violet-300 drop-shadow-[0_0_22px_rgba(167,139,250,0.55)]">
            or Dare
          </span>
        </h2>
      </div>

      <div>
        <div className="grid gap-4 min-[380px]:grid-cols-2">
          <FateButton deck="truth" count={counts.truth} disabled={truthEmpty} onChoose={onChoose} />
          <FateButton deck="dare" count={counts.dare} disabled={dareEmpty} onChoose={onChoose} />
        </div>
        {truthEmpty && dareEmpty && specialAvailable ? (
          <motion.button
            className="mt-4 min-h-24 w-full rounded-[24px] border border-yellow-200/55 bg-yellow-400 px-5 py-5 text-left text-black shadow-[0_0_30px_gold]"
            type="button"
            whileTap={{ scale: 0.94 }}
            onClick={() => onChoose("special")}
          >
            <span className="block text-3xl font-black uppercase leading-none">Lucky Card</span>
          </motion.button>
        ) : null}
      </div>
    </div>
  );
}

function DrinkingFaceDown({ onDraw }) {
  return (
    <motion.button
      className="absolute inset-0 flex flex-col items-center justify-center rounded-[24px] border border-cyan-200/30 bg-[#10191A] p-8 text-center shadow-[0_0_28px_rgba(34,211,238,0.2),0_18px_70px_rgba(0,0,0,0.72)] outline-none"
      type="button"
      whileTap={{ scale: 0.96 }}
      onClick={onDraw}
    >
      <span className="text-sm font-black uppercase tracking-[0.34em] text-cyan-100/65">
        Drinking Games
      </span>
      <span className="mt-5 text-6xl font-black uppercase leading-[0.9] text-cyan-200 drop-shadow-[0_0_22px_rgba(34,211,238,0.58)]">
        Tap
        <span className="block text-amber-200 drop-shadow-[0_0_22px_rgba(251,191,36,0.5)]">
          to Draw
        </span>
      </span>
    </motion.button>
  );
}

function RevealedCard({ card }) {
  const isPremium = card.isSpecial;
  const isDrinkingNormal = card.mode === "drinkingGames" && !isPremium;
  const title = isPremium ? (card.mode === "drinkingGames" ? "Power Card" : "Special Rule") : CARD_COPY[card.type]?.title;
  const hint = isPremium ? (card.mode === "drinkingGames" ? "Lucky draw" : "Lucky card") : CARD_COPY[card.type]?.hint;
  const shellClass = isPremium
    ? "border-yellow-200/50 bg-[#211B08] shadow-[0_0_30px_gold,0_0_90px_rgba(250,204,21,0.28),0_18px_70px_rgba(0,0,0,0.78)]"
    : isDrinkingNormal
      ? "border-cyan-200/28 bg-[#10191A] shadow-[0_0_30px_rgba(34,211,238,0.16),0_0_58px_rgba(251,191,36,0.12),0_18px_70px_rgba(0,0,0,0.72)]"
      : card.type === "truth"
        ? "border-violet-200/24 bg-[#1A1A1A] shadow-card"
        : "border-fuchsia-200/24 bg-[#1A1A1A] shadow-[0_0_30px_rgba(249,115,22,0.18),0_18px_70px_rgba(0,0,0,0.72)]";
  const titleClass = isPremium
    ? "text-yellow-200 drop-shadow-[0_0_20px_rgba(250,204,21,0.76)]"
    : card.type === "truth"
      ? "text-violet-300 drop-shadow-[0_0_18px_rgba(167,139,250,0.68)]"
      : "text-fuchsia-300 drop-shadow-[0_0_18px_rgba(236,72,153,0.68)]";

  return (
    <motion.div
      className={`absolute inset-0 flex flex-col justify-between rounded-[24px] border p-7 ${shellClass}`}
      animate={
        isPremium
          ? {
              boxShadow: [
                "0 0 30px gold, 0 0 90px rgba(250,204,21,0.28), 0 18px 70px rgba(0,0,0,0.78)",
                "0 0 46px gold, 0 0 120px rgba(250,204,21,0.4), 0 18px 70px rgba(0,0,0,0.78)",
                "0 0 30px gold, 0 0 90px rgba(250,204,21,0.28), 0 18px 70px rgba(0,0,0,0.78)",
              ],
              borderColor: [
                "rgba(254, 240, 138, 0.5)",
                "rgba(253, 224, 71, 0.85)",
                "rgba(254, 240, 138, 0.5)",
              ],
            }
          : undefined
      }
      transition={isPremium ? { duration: 1.15, repeat: Infinity, ease: "easeInOut" } : undefined}
      style={{
        backfaceVisibility: "hidden",
        transform: "rotateY(180deg)",
      }}
    >
      <div>
        {isDrinkingNormal ? null : (
          <>
            <p className="text-sm font-black uppercase tracking-[0.3em] text-white/55">{hint}</p>
            <h2 className={`mt-3 text-4xl font-black uppercase leading-none ${titleClass}`}>
              {title}
            </h2>
          </>
        )}
      </div>

      <p
        className={`text-balance text-center font-black leading-[1.02] text-white ${
          isDrinkingNormal ? "text-[clamp(2.4rem,10vw,4.1rem)]" : "text-[clamp(2rem,8vw,3.55rem)]"
        }`}
      >
        {card.text}
      </p>

      <p className="text-center text-sm font-black uppercase tracking-[0.22em] text-white/35">
        Swipe when done
      </p>
    </motion.div>
  );
}

function PartyCard({
  card,
  counts,
  exitDirection,
  isRevealed,
  mode,
  onChoose,
  onDraw,
  onSwipe,
}) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-240, 0, 240], [-13, 0, 13]);
  const doneOpacity = useTransform(x, [24, 120], [0, 1]);
  const passOpacity = useTransform(x, [-120, -24], [1, 0]);

  return (
    <motion.div
      className="absolute inset-x-0 mx-auto h-[min(68dvh,560px)] w-full max-w-[390px] px-2"
      custom={exitDirection}
      style={{ x, rotate }}
      drag={isRevealed ? "x" : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.18}
      dragMomentum={false}
      variants={cardShellVariants}
      initial="initial"
      animate="active"
      exit="exit"
      transition={{ type: "spring", stiffness: 360, damping: 30, mass: 0.9 }}
      whileDrag={{ scale: 1.025 }}
      onDragEnd={(_, info) => {
        const swipePower = info.offset.x;
        const swipeSpeed = info.velocity.x;

        if (swipePower > SWIPE_OFFSET || swipeSpeed > SWIPE_VELOCITY) {
          onSwipe(1);
          return;
        }

        if (swipePower < -SWIPE_OFFSET || swipeSpeed < -SWIPE_VELOCITY) {
          onSwipe(-1);
        }
      }}
    >
      <motion.div
        className="pointer-events-none absolute right-6 top-7 z-20 rounded-full border border-emerald-300/60 bg-emerald-400/18 px-4 py-2 text-sm font-black uppercase text-emerald-100 shadow-[0_0_22px_rgba(52,211,153,0.34)]"
        style={{ opacity: doneOpacity }}
      >
        Done
      </motion.div>

      <motion.div
        className="pointer-events-none absolute left-6 top-7 z-20 rounded-full border border-rose-300/60 bg-rose-400/18 px-4 py-2 text-sm font-black uppercase text-rose-100 shadow-[0_0_22px_rgba(251,113,133,0.34)]"
        style={{ opacity: passOpacity }}
      >
        Penalty
      </motion.div>

      <div
        className="relative h-full w-full rounded-[24px]"
        style={{
          perspective: 1200,
          transformStyle: "preserve-3d",
        }}
      >
        <motion.div
          className="relative h-full w-full rounded-[24px]"
          animate={{ rotateY: isRevealed ? 180 : 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 24 }}
          style={{
            transformStyle: "preserve-3d",
          }}
        >
          <div className="absolute inset-0" style={{ backfaceVisibility: "hidden" }}>
            {mode === "drinkingGames" ? (
              <DrinkingFaceDown onDraw={onDraw} />
            ) : (
              <TruthOrDareFaceDown counts={counts} onChoose={onChoose} />
            )}
          </div>

          {card ? <RevealedCard card={card} /> : null}
        </motion.div>
      </div>
    </motion.div>
  );
}

function GameOver({ mode, onRestart }) {
  const body =
    mode === "drinkingGames"
      ? "Every drinking prompt and power card has been used this session."
      : "Every truth, dare, and lucky card has been used this session.";

  return (
    <motion.div
      className="mx-auto flex w-full max-w-[390px] flex-col items-center justify-center rounded-[24px] border border-white/12 bg-[#1A1A1A] p-8 text-center shadow-card"
      initial={{ opacity: 0, scale: 0.94, y: 18 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 260, damping: 24 }}
    >
      <p className="text-sm font-black uppercase tracking-[0.32em] text-fuchsia-200/70">Game Over</p>
      <h2 className="mt-4 text-5xl font-black uppercase leading-none text-white">Out of Cards</h2>
      <p className="mt-6 text-base font-bold leading-relaxed text-white/55">{body}</p>
      <motion.button
        className="mt-8 w-full rounded-[24px] border border-fuchsia-300/40 bg-fuchsia-500 px-6 py-5 text-xl font-black uppercase text-white shadow-neon outline-none"
        type="button"
        whileTap={{ scale: 0.94 }}
        onClick={() => {
          vibrate(25);
          onRestart();
        }}
      >
        Restart
      </motion.button>
    </motion.div>
  );
}

function createTruthOrDareQueues(questions) {
  return {
    truth: shuffle([...questions.truth]),
    dare: shuffle([...questions.dare]),
    special: shuffle([...questions.special]),
  };
}

function getTruthOrDareCounts(queues) {
  return {
    truth: queues.truth.length,
    dare: queues.dare.length,
    special: queues.special.length,
  };
}

function getTruthOrDareStats(questions) {
  return {
    regularTotal: questions.truth.length + questions.dare.length,
    specialTotal: questions.special.length,
  };
}

function shouldDrawTruthOrDareSpecial(queues, progress, stats) {
  if (queues.special.length === 0 || stats.specialTotal === 0) {
    return false;
  }

  const targetRegularCount = Math.max(1, Math.ceil(stats.regularTotal * SPECIAL_TARGET_PROGRESS));
  const projectedRegularPlayed = Math.min(progress.playedRegular + 1, targetRegularCount);
  const specialsDue = Math.min(
    stats.specialTotal,
    Math.floor((projectedRegularPlayed / targetRegularCount) * stats.specialTotal),
  );

  return progress.playedSpecial < specialsDue || Math.random() < SPECIAL_CHANCE;
}

function TruthOrDareGame({ questions }) {
  const queuesRef = useRef(createTruthOrDareQueues(questions));
  const statsRef = useRef(getTruthOrDareStats(questions));
  const progressRef = useRef({ playedRegular: 0, playedSpecial: 0 });
  const roundIdRef = useRef(1);
  const [counts, setCounts] = useState(() => getTruthOrDareCounts(queuesRef.current));
  const [card, setCard] = useState(null);
  const [isRevealed, setIsRevealed] = useState(false);
  const [isAdvancing, setIsAdvancing] = useState(false);
  const [exitDirection, setExitDirection] = useState(1);
  const [roundId, setRoundId] = useState(roundIdRef.current);

  const isGameOver = counts.truth === 0 && counts.dare === 0 && counts.special === 0 && !card;

  const chooseCard = useCallback(
    (choice) => {
      if (isAdvancing) {
        return;
      }

      const queues = queuesRef.current;

      if (!queues[choice]?.length) {
        return;
      }

      const shouldDrawSpecial =
        choice !== "special" &&
        shouldDrawTruthOrDareSpecial(queues, progressRef.current, statsRef.current);
      const type = shouldDrawSpecial ? "special" : choice;
      const text = queues[type].pop();

      if (type === "special") {
        progressRef.current.playedSpecial += 1;
      } else {
        progressRef.current.playedRegular += 1;
      }

      setCounts(getTruthOrDareCounts(queues));
      setCard({
        id: `${type}-${roundIdRef.current}`,
        mode: "truthOrDare",
        type,
        isSpecial: type === "special",
        text,
      });
      setIsRevealed(true);
      vibrate(type === "special" ? [40, 50, 40] : 15);
    },
    [isAdvancing],
  );

  const handleSwipe = useCallback((direction) => {
    vibrate(50);
    setExitDirection(direction);
    setIsAdvancing(true);
  }, []);

  const handleExitComplete = useCallback(() => {
    if (!isAdvancing) {
      return;
    }

    setCard(null);
    setIsRevealed(false);
    roundIdRef.current += 1;
    setRoundId(roundIdRef.current);
    setIsAdvancing(false);
  }, [isAdvancing]);

  const restart = useCallback(() => {
    queuesRef.current = createTruthOrDareQueues(questions);
    statsRef.current = getTruthOrDareStats(questions);
    progressRef.current = { playedRegular: 0, playedSpecial: 0 };
    roundIdRef.current += 1;
    setCounts(getTruthOrDareCounts(queuesRef.current));
    setCard(null);
    setIsRevealed(false);
    setIsAdvancing(false);
    setRoundId(roundIdRef.current);
  }, [questions]);

  return (
    <GameFrame title="True or Dare">
      {isGameOver ? (
        <GameOver mode="truthOrDare" onRestart={restart} />
      ) : (
        <AnimatePresence custom={exitDirection} mode="wait" onExitComplete={handleExitComplete}>
          {!isAdvancing ? (
            <PartyCard
              key={roundId}
              card={card}
              counts={counts}
              exitDirection={exitDirection}
              isRevealed={isRevealed}
              mode="truthOrDare"
              onChoose={chooseCard}
              onSwipe={handleSwipe}
            />
          ) : null}
        </AnimatePresence>
      )}
    </GameFrame>
  );
}

function createDrinkingQueues(questions) {
  return {
    normal: shuffle([...questions.normal]),
    special: shuffle([...questions.special]),
  };
}

function getDrinkingCounts(queues) {
  return {
    normal: queues.normal.length,
    special: queues.special.length,
  };
}

function pickDrinkingType(queues) {
  if (queues.normal.length === 0 && queues.special.length === 0) {
    return null;
  }

  if (queues.special.length === 0) {
    return "normal";
  }

  if (queues.normal.length === 0) {
    return "special";
  }

  return Math.random() < SPECIAL_CHANCE ? "special" : "normal";
}

function DrinkingGame({ questions }) {
  const queuesRef = useRef(createDrinkingQueues(questions));
  const roundIdRef = useRef(1);
  const [counts, setCounts] = useState(() => getDrinkingCounts(queuesRef.current));
  const [card, setCard] = useState(null);
  const [isRevealed, setIsRevealed] = useState(false);
  const [isAdvancing, setIsAdvancing] = useState(false);
  const [exitDirection, setExitDirection] = useState(1);
  const [roundId, setRoundId] = useState(roundIdRef.current);

  const isGameOver = counts.normal === 0 && counts.special === 0 && !card;

  const drawCard = useCallback(() => {
    if (isAdvancing) {
      return;
    }

    const queues = queuesRef.current;
    const type = pickDrinkingType(queues);

    if (!type) {
      setCounts(getDrinkingCounts(queues));
      return;
    }

    const text = queues[type].pop();

    setCounts(getDrinkingCounts(queues));
    setCard({
      id: `drinking-${type}-${roundIdRef.current}`,
      mode: "drinkingGames",
      type: `drinking-${type}`,
      isSpecial: type === "special",
      text,
    });
    setIsRevealed(true);
    vibrate(type === "special" ? [40, 50, 40] : 15);
  }, [isAdvancing]);

  const handleSwipe = useCallback((direction) => {
    vibrate(50);
    setExitDirection(direction);
    setIsAdvancing(true);
  }, []);

  const handleExitComplete = useCallback(() => {
    if (!isAdvancing) {
      return;
    }

    setCard(null);
    setIsRevealed(false);
    roundIdRef.current += 1;
    setRoundId(roundIdRef.current);
    setIsAdvancing(false);
  }, [isAdvancing]);

  const restart = useCallback(() => {
    queuesRef.current = createDrinkingQueues(questions);
    roundIdRef.current += 1;
    setCounts(getDrinkingCounts(queuesRef.current));
    setCard(null);
    setIsRevealed(false);
    setIsAdvancing(false);
    setRoundId(roundIdRef.current);
  }, [questions]);

  return (
    <GameFrame title="Drinking Games">
      {isGameOver ? (
        <GameOver mode="drinkingGames" onRestart={restart} />
      ) : (
        <AnimatePresence custom={exitDirection} mode="wait" onExitComplete={handleExitComplete}>
          {!isAdvancing ? (
            <PartyCard
              key={roundId}
              card={card}
              counts={counts}
              exitDirection={exitDirection}
              isRevealed={isRevealed}
              mode="drinkingGames"
              onDraw={drawCard}
              onSwipe={handleSwipe}
            />
          ) : null}
        </AnimatePresence>
      )}
    </GameFrame>
  );
}

function GameFrame({ children, title }) {
  return (
    <main className="relative flex h-[100dvh] w-full touch-none select-none items-center justify-center overflow-hidden bg-black px-5 pb-[max(env(safe-area-inset-bottom),1.25rem)] pt-[max(env(safe-area-inset-top),1.25rem)]">
      <div className="pointer-events-none absolute inset-x-0 top-[max(env(safe-area-inset-top),1.25rem)] z-10 px-5 text-center">
        <p className="text-sm font-black uppercase tracking-[0.28em] text-fuchsia-200/70">
          {title}
        </p>
      </div>
      {children}
    </main>
  );
}

export default function App() {
  const [mode, setMode] = useState(null);
  const data = useMemo(() => normalizeData(importedQuestions), []);

  if (mode === "truthOrDare") {
    return <TruthOrDareGame questions={data.truthOrDare} />;
  }

  if (mode === "drinkingGames") {
    return <DrinkingGame questions={data.drinkingGames} />;
  }

  return <HomeScreen onStart={setMode} />;
}
