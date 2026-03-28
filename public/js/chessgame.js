const socket = io();

const playerName = prompt("Enter your name");

socket.emit("joinGame", {
  name: playerName || "Guest"
});

const chess = new Chess();
const boardElement = document.querySelector(".chessboard");
//const pieceElement = document.querySelector(".piece");

const moveSound = new Audio("/sounds/move.mp3");

let draggedPiece = null;
let sourceSquare = null;
let playerRole = null;
let lastMove = null;
let selectedSquare = null;
let whiteTime = 600; 
let blackTime = 600;

let timerInterval = null;
let winnerColor = null;
let moveHistory = [];

document.addEventListener("DOMContentLoaded", () => {
  updateClock();
});

let paused = false;

const startBtn = document.getElementById("startBtn");
 const pauseBtn = document.getElementById("pauseBtn");

startBtn.onclick = () => {
  paused = false;
  startTimer(chess.turn());
};

pauseBtn.onclick = () => {
  paused = true;
  clearInterval(timerInterval);
};

const clearHighlights = () => {
  document.querySelectorAll(".square").forEach((square) => {
    square.classList.remove("highlight", "highlight-capture");
  });
};

const highlightMoves = (row, col) => {
  clearHighlights();

  const square = `${String.fromCharCode(97 + col)}${8 - row}`;

  const moves = chess.moves({
    square: square,
    verbose: true,
  });

  moves.forEach((move) => {
    const targetRow = 8 - parseInt(move.to[1]);
    const targetCol = move.to.charCodeAt(0) - 97;

    const squareElement = document.querySelector(
      `.square[data-row="${targetRow}"][data-col="${targetCol}"]`,
    );

    if (squareElement) {
      if (move.captured) {
        squareElement.classList.add("highlight-capture");
      } else {
        squareElement.classList.add("highlight");
      }
    }
  });
};

const renderBoard = () => {
  const board = chess.board();
  boardElement.innerHTML = "";

  board.forEach((row, rowindex) => {
    row.forEach((square, squareindex) => {
      const squareElement = document.createElement("div");

      squareElement.addEventListener("click", () => {
        if (!selectedSquare) return;

        if (
          squareElement.classList.contains("highlight") ||
          squareElement.classList.contains("highlight-capture")
        ) {
          const targetSquare = {
            row: parseInt(squareElement.dataset.row),
            col: parseInt(squareElement.dataset.col),
          };

          handleMove(selectedSquare, targetSquare);

          selectedSquare = null;
          clearHighlights();
        }
      });

      squareElement.classList.add(
        "square",
        (rowindex + squareindex) % 2 === 0 ? "light" : "dark",
      );

      squareElement.dataset.row = rowindex;
      squareElement.dataset.col = squareindex;

      const squareName = `${String.fromCharCode(97 + squareindex)}${8 - rowindex}`;

      if (
        lastMove &&
        (squareName === lastMove.from || squareName === lastMove.to)
      ) {
        squareElement.classList.add("last-move");
      }

      boardElement.appendChild(squareElement);
/// piece ki image ko square me add karna 
      if (square) {
        const pieceElement = document.createElement("div");

        pieceElement.classList.add(
          "piece",
          square.color === "w" ? "white" : "black",
        );

        const pieceImage = document.createElement("img");

        const color = square.color === "w" ? "w" : "b";
        const type = square.type;

        pieceImage.src = `/images/pieces/${color}${type}.svg`;
        pieceImage.classList.add("piece-img");

        pieceImage.draggable = false;

        pieceElement.appendChild(pieceImage);

        pieceElement.draggable = playerRole === square.color;

        // CLICK → highlight possible moves
        pieceElement.addEventListener("click", () => {
          if (!playerRole || playerRole === square.color) {
            selectedSquare = {
              row: rowindex,
              col: squareindex,
            };

            highlightMoves(rowindex, squareindex);
          }
        });

        // DRAG START
        pieceElement.addEventListener("dragstart", (e) => {
          if (pieceElement.draggable) {
            draggedPiece = pieceElement;

            sourceSquare = {
              row: rowindex,
              col: squareindex,
            };

            e.dataTransfer.setData("text/plain", "");
          }
        });

        // DRAG END
        pieceElement.addEventListener("dragend", () => {
          draggedPiece = null;
          sourceSquare = null;
        });

        squareElement.appendChild(pieceElement);
      }

      // ALLOW DROP
      squareElement.addEventListener("dragover", (e) => {
        e.preventDefault();
      });

      // DROP EVENT
      squareElement.addEventListener("drop", (e) => {
        e.preventDefault();

        if (draggedPiece) {
          const targetSource = {
            row: parseInt(squareElement.dataset.row),
            col: parseInt(squareElement.dataset.col),
          };

          handleMove(sourceSquare, targetSource);
        }
      });
    });
  });

  if (playerRole === "b") {
    boardElement.classList.add("flipped");
  } else {
    boardElement.classList.remove("flipped");
  }
// ye line hamne isliye add ki hai taki jab koi player black ke roop me khele to usko board ulta dikhe taki usko asani ho move karne me
  const boardContainer = document.querySelector(".board-container");

if (playerRole === "b") {
  boardContainer.style.flexDirection = "column-reverse";
} else {
  boardContainer.style.flexDirection = "column";
}

  if (winnerColor) {
    setTimeout(() => {
      showWinnerCrown(winnerColor);
    }, 0);
  }
  highlightCheck();
};

const handleMove = (source, target) => {
  clearHighlights();
  selectedSquare = null;

  const move = {
    from: `${String.fromCharCode(97 + source.col)}${8 - source.row}`,
    to: `${String.fromCharCode(97 + target.col)}${8 - target.row}`,
    promotion: "q",
  };

  socket.emit("move", move);
};

// const getPieceUnicode = (piece) => {
//   const unicodePieces = {
//     // p: "♟",
//     // r: "♜",
//     // n: "♞",
//     // b: "♝",
//     // q: "♛",
//     // k: "♚",
//     // P: "♙",
//     // R: "♖",
//     // N: "♘",
//     // B: "♗",
//     // Q: "♕",
//     // K: "♔",
//     // p: "♙",
//     // r: "♖",
//     // n: "♘",
//     // b: "♗",
//     // q: "♕",
//     // k: "♔",
//     // P: "♟",
//     // R: "♜",
//     // N: "♞",
//     // B: "♝",
//     // Q: "♛",
//     // K: "♚",
//   };

//   return unicodePieces[piece.type] || "";
// }; // is line se haam ki hamari goti ki sakal kesa hoga bo disaid karege

socket.on("playerRole", function (data) {
  playerRole = data.role;

  console.log("My Name:", data.name);
  console.log("My ID:", data.id);
  renderBoard();

  startTimer("w");
});

socket.on("spectatorRole", function () {
  playerRole = null;
  renderBoard();
});

socket.on("boardState", function (fen) {
  chess.load(fen);
  renderBoard();

  if (winnerColor) {
    requestAnimationFrame(() => {
      showWinnerCrown(winnerColor);
    });
  }
});

const moveList = document.getElementById("moveList");

let moveNumber = 1;

socket.on("move", function (move) {
  const result = chess.move({
    from: move.from,
    to: move.to,
    promotion: "q",
  });

  lastMove = move;

  moveSound.currentTime = 0;
  moveSound.play().catch(() => {});

  if (chess.turn() === "w") {
    startTimer("w");
  } else {
    startTimer("b");
  }

  if (result) {
  moveHistory.push(chess.fen());

  const li = document.createElement("li");

  li.dataset.index = moveHistory.length - 1;
  li.style.cursor = "pointer";

  li.addEventListener("click", () => {
    chess.load(moveHistory[li.dataset.index]);
    renderBoard();
  });

  if (result.color === "w") {
    li.textContent = moveNumber + ". " + result.san;
  } else {
    li.textContent = result.san;
    moveNumber++;
  }

  moveList.appendChild(li);
}

  renderBoard();
});

function updateClock() {
  const whiteEl = document.getElementById("whiteTimer");
  const blackEl = document.getElementById("blackTimer");

  if (!whiteEl || !blackEl) return; // DOM ready safety

  const whiteMin = Math.floor(whiteTime / 60);
  const whiteSec = whiteTime % 60;

  const blackMin = Math.floor(blackTime / 60);
  const blackSec = blackTime % 60;

  whiteEl.textContent = whiteMin + ":" + whiteSec.toString().padStart(2, "0");

  blackEl.textContent = blackMin + ":" + blackSec.toString().padStart(2, "0");
}

function startTimer(color) {
  clearInterval(timerInterval);

  timerInterval = setInterval(() => {
    if (paused) return;

    if (color === "w") {
      whiteTime--;
    } else {
      blackTime--;
    }

    updateClock();

    if (whiteTime <= 0) {
      clearInterval(timerInterval);
      alert("Black wins on time");
    }

    if (blackTime <= 0) {
      clearInterval(timerInterval);
      alert("White wins on time");
    }
  }, 1000);
}
socket.on("gameOver", function (data) {
  const screen = document.getElementById("gameOverScreen");
  const text = document.getElementById("winnerText");

  text.innerText = data.message;
  screen.style.display = "flex";

  clearInterval(timerInterval);
  paused = true;

  if (data.message.includes("White")) {
    winnerColor = "w";
  } else if (data.message.includes("Black")) {
    winnerColor = "b";
  }

  setTimeout(() => {
    showWinnerCrown(winnerColor);
  }, 100);
});

const restartBtn = document.getElementById("restartBtn");

restartBtn.addEventListener("click", () => {
  socket.emit("restartGame");
});

socket.on("gameRestarted", () => {
  chess.reset();
  winnerColor = null;

  moveList.innerHTML = "";
  moveNumber = 1;

  whiteTime = 600;
  blackTime = 600;

  updateClock();

  const screen = document.getElementById("gameOverScreen");
  screen.style.display = "none";
});

function showWinnerCrown(winnerColor) {
  const board = chess.board();

  board.forEach((row, rowIndex) => {
    row.forEach((square, colIndex) => {
      if (
        square &&
        square.type.toLowerCase() === "k" &&
        square.color === winnerColor
      ) {
        const kingSquare = document.querySelector(
          `.square[data-row="${rowIndex}"][data-col="${colIndex}"]`,
        );

        if (!kingSquare) return;

        kingSquare.classList.add("king-glow");

        if (!kingSquare.querySelector(".crown")) {
          const crown = document.createElement("div");
          crown.className = "crown";
          crown.innerText = "👑";

          kingSquare.appendChild(crown);
        }
      }
    });
  });
}

function highlightCheck() {
  document.querySelectorAll(".square").forEach(sq => {
    sq.classList.remove("check-glow");
  });

  if (!chess.in_check()) return;

  const board = chess.board();

  board.forEach((row, rowIndex) => {
    row.forEach((square, colIndex) => {
      if (
        square &&
        square.type === "k" &&
        square.color === chess.turn()
      ) {
        const kingSquare = document.querySelector(
          `.square[data-row="${rowIndex}"][data-col="${colIndex}"]`
        );

        if (kingSquare) {
          kingSquare.classList.add("check-glow");
        }
      }
    });
  });
}


// update player name display when players join

socket.on("playersUpdate", (data) => {

  console.log("Players Data:", data); 

  const whiteBox = document.getElementById("whitePlayer");
  const blackBox = document.getElementById("blackPlayer");

  if (whiteBox) {
    whiteBox.innerText = data.white?.name
      ? "♔ " + data.white.name
      : "Waiting...";
  }

  if (blackBox) {
    blackBox.innerText = data.black?.name
      ? "♚ " + data.black.name
      : "Waiting...";
  }

});

// let players = {
//   white: null,
//   black: null
// };



