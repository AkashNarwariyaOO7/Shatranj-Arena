const express = require("express");
const socket = require("socket.io");
const http = require("http");
const { Chess } = require("chess.js");
const path = require("path");

const app = express();

const server = http.createServer(app);
const io = socket(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const chess = new Chess();
let players = {};
let playerData = {};
// let currentPlayer = "w";
// let lastMove = null;
 
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.render("index", { title: "Chess Game" });
});

io.on("connection", function (uniquesocket) {

  console.log("connected");

  // handle player joining and assign roles

  uniquesocket.on("joinGame", ({ name }) => {

  playerData[uniquesocket.id] = {
    id: uniquesocket.id,
    name: name
  };

  if (!players.white) {
    players.white = uniquesocket.id;
    uniquesocket.emit("playerRole", {
      role: "w",
      name: name,
      id: uniquesocket.id
    });

  } else if (!players.black) {
    players.black = uniquesocket.id;
    uniquesocket.emit("playerRole", {
      role: "b",
      name: name,
      id: uniquesocket.id
    });

  } else {
    uniquesocket.emit("spectatorRole");
  }

  // Send both player names to everyone
 io.emit("playersUpdate", {
  white: players.white ? playerData[players.white] : null,
  black: players.black ? playerData[players.black] : null
});

});
 

 

  //  Send current board immediately
  uniquesocket.emit("boardState", chess.fen());

  uniquesocket.on("disconnect", function () {
    if (uniquesocket.id === players.white) {
      delete players.white;
    } else if (uniquesocket.id === players.black) {
      delete players.black;
    }
     delete playerData[uniquesocket.id];
  });

 uniquesocket.on("move", (move) => {

  try {

    if (chess.turn() === "w" && uniquesocket.id !== players.white) return;
    if (chess.turn() === "b" && uniquesocket.id !== players.black) return;

    const result = chess.move(move);

    if (result) {

      // currentPlayer = chess.turn();

      const moveData = {
        from: result.from,
        to: result.to,
        san: result.san
      };

      io.emit("move", moveData);
      io.emit("boardState", chess.fen());

      // CHECKMATE
      if (chess.isCheckmate()) {

        const winner = result.color === "w" ? "White" : "Black";

        io.emit("gameOver", {
          message: winner + " Wins by Checkmate!"
        });

      }

      // DRAW
      if (chess.isDraw()) {

        io.emit("gameOver", {
          message: "Game Draw!"
        });

      }

    } else {

      uniquesocket.emit("invalidMove", move);

    }

  } catch (err) {
    console.log(err);
  }

});
uniquesocket.on("restartGame", () => {

  chess.reset();
   let currentPlayer = "w";   
  //  lastMove = null;
     
  io.emit("boardState", chess.fen());

  io.emit("gameRestarted");

  

});
});



const PORT = process.env.PORT || 3000;

server.listen(PORT, function () {
  console.log("Server running on port", PORT);
});



