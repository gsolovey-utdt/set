(() => {
  // Paleta Okabe-Ito (color-blind safe)
  const COLORES = [
    { nombre: "azul", hex: "#0072B2" },
    { nombre: "naranja", hex: "#E69F00" },
    { nombre: "magenta", hex: "#CC79A7" },
  ];

  const FORMAS = ["rombo", "ovalo", "ondulado"];
  const RELLENOS = ["lleno", "rayado", "vacio"];
  const NUMEROS = [1, 2, 3];
  const ATRIBUTOS = ["color", "forma", "relleno", "numero"];

  const CLASE_FORMA = {
    rombo: "diamond",
    ovalo: "oval",
    ondulado: "squiggle",
  };

  const COLOR_HEX = COLORES.reduce((acc, color) => {
    acc[color.nombre] = color.hex;
    return acc;
  }, {});

  const state = {
    deck: [],
    board: [],
    selected: [],
    score: 0,
    startTime: 0,
    timerHandle: null,
  };

  const boardEl = document.getElementById("board");
  const scoreEl = document.getElementById("score");
  const timerEl = document.getElementById("timer");
  const deckCountEl = document.getElementById("deck-count");
  const messageEl = document.getElementById("message");

  document.getElementById("new-game").addEventListener("click", initGame);
  document.getElementById("add-cards").addEventListener("click", addCardsHandler);
  document.getElementById("hint").addEventListener("click", showHint);

  function initGame() {
    state.deck = makeDeck();
    state.board = [];
    state.selected = [];
    state.score = 0;
    state.startTime = Date.now();
    scoreEl.textContent = "0";
    setMessage("Nuevo juego iniciado.", "info");

    if (state.timerHandle) {
      clearInterval(state.timerHandle);
    }
    state.timerHandle = setInterval(updateTimer, 1000);

    deal(12);
    ensureSetOnBoard();
    render();
  }

  function makeDeck() {
    const deck = [];
    for (const color of COLORES.map((entry) => entry.nombre)) {
      for (const forma of FORMAS) {
        for (const relleno of RELLENOS) {
          for (const numero of NUMEROS) {
            deck.push({
              color,
              forma,
              relleno,
              numero,
              id: crypto.randomUUID(),
            });
          }
        }
      }
    }
    return shuffle(deck);
  }

  function shuffle(items) {
    const arr = [...items];
    for (let i = arr.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function deal(n) {
    const dealt = state.deck.splice(0, n);
    state.board.push(...dealt);
    updateDeckCount();
  }

  function updateTimer() {
    const elapsed = Math.floor((Date.now() - state.startTime) / 1000);
    const m = String(Math.floor(elapsed / 60)).padStart(2, "0");
    const s = String(elapsed % 60).padStart(2, "0");
    timerEl.textContent = `${m}:${s}`;
  }

  function updateDeckCount() {
    deckCountEl.textContent = String(state.deck.length);
  }

  function setMessage(text, type = "info") {
    messageEl.className = `message ${type}`;
    messageEl.textContent = text;
  }

  function render() {
    boardEl.innerHTML = "";

    state.board.forEach((card) => {
      const cardEl = document.createElement("button");
      cardEl.type = "button";
      cardEl.className = "card";
      cardEl.setAttribute("aria-label", describeCard(card));

      if (state.selected.includes(card.id)) {
        cardEl.classList.add("selected");
      }

      cardEl.addEventListener("click", () => toggleCard(card.id));

      for (let i = 0; i < card.numero; i += 1) {
        cardEl.appendChild(renderSymbol(card));
      }

      boardEl.appendChild(cardEl);
    });
  }

  function renderSymbol(card) {
    const symbol = document.createElement("span");
    symbol.className = `symbol ${CLASE_FORMA[card.forma]}`;
    symbol.style.border = `2px solid ${COLOR_HEX[card.color]}`;

    if (card.relleno === "lleno") {
      symbol.style.background = COLOR_HEX[card.color];
    }

    if (card.relleno === "vacio") {
      symbol.style.background = "transparent";
    }

    if (card.relleno === "rayado") {
      symbol.style.background = `repeating-linear-gradient(
        -45deg,
        ${COLOR_HEX[card.color]},
        ${COLOR_HEX[card.color]} 2px,
        transparent 2px,
        transparent 6px
      )`;
    }

    return symbol;
  }

  function describeCard(card) {
    return `${card.numero} ${card.forma} ${card.color} ${card.relleno}`;
  }

  function toggleCard(id) {
    if (state.selected.includes(id)) {
      state.selected = state.selected.filter((x) => x !== id);
      render();
      return;
    }

    if (state.selected.length === 3) {
      return;
    }

    state.selected.push(id);
    render();

    if (state.selected.length === 3) {
      evaluateSelection();
    }
  }

  function evaluateSelection() {
    const cards = state.selected
      .map((id) => state.board.find((card) => card.id === id))
      .filter(Boolean);

    if (cards.length !== 3) {
      state.selected = [];
      render();
      return;
    }

    if (isSet(cards)) {
      setMessage("Set correcto.", "ok");
      state.score += 1;
      scoreEl.textContent = String(state.score);

      const selectedIds = new Set(state.selected);
      state.board = state.board.filter((card) => !selectedIds.has(card.id));
      state.selected = [];

      while (state.board.length < 12 && state.deck.length > 0) {
        deal(3);
      }

      ensureSetOnBoard();
      render();
      checkWin();
      return;
    }

    setMessage("No es un set.", "error");
    state.score = Math.max(0, state.score - 1);
    scoreEl.textContent = String(state.score);

    setTimeout(() => {
      state.selected = [];
      render();
    }, 420);
  }

  function addCardsHandler() {
    if (state.deck.length < 3) {
      setMessage("No hay suficientes cartas en el mazo.", "error");
      return;
    }

    deal(3);
    render();

    const esTelefono = window.matchMedia("(max-width: 680px)").matches;
    const formato = esTelefono ? "fila" : "columna";
    setMessage(`Se agregaron 3 cartas en una ${formato}.`, "info");
  }

  function showHint() {
    const setIndices = findAnySetIndices(state.board);
    if (!setIndices) {
      setMessage("No hay set visible. Probá agregar 3 cartas.", "error");
      return;
    }

    const idx = setIndices[Math.floor(Math.random() * 3)];
    const cardId = state.board[idx].id;

    if (!state.selected.includes(cardId)) {
      state.selected.push(cardId);
      if (state.selected.length > 3) {
        state.selected.shift();
      }
    }

    render();
    setMessage("Pista: marqué una carta de un set válido.", "info");
  }

  function ensureSetOnBoard() {
    while (!findAnySetIndices(state.board) && state.deck.length >= 3) {
      deal(3);
    }
  }

  function checkWin() {
    if (state.deck.length === 0 && !findAnySetIndices(state.board)) {
      if (state.timerHandle) {
        clearInterval(state.timerHandle);
        state.timerHandle = null;
      }
      setMessage(`Fin de partida. Puntaje final: ${state.score}.`, "ok");
    }
  }

  function findAnySetIndices(cards) {
    for (let i = 0; i < cards.length - 2; i += 1) {
      for (let j = i + 1; j < cards.length - 1; j += 1) {
        for (let k = j + 1; k < cards.length; k += 1) {
          if (isSet([cards[i], cards[j], cards[k]])) {
            return [i, j, k];
          }
        }
      }
    }
    return null;
  }

  function isSet(cards) {
    return ATRIBUTOS.every((attr) => allSameOrAllDifferent(cards.map((card) => card[attr])));
  }

  function allSameOrAllDifferent(values) {
    const unique = new Set(values).size;
    return unique === 1 || unique === 3;
  }

  initGame();
})();
