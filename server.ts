import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { generateSudoku, isValidPlacement, type DifficultyLevel } from "./src/lib/sudoku.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

interface ServerPlayer {
  id: string;
  name: string;
  board: number[];
  initialFilled: number;
  moves: number;
  isBot?: boolean;
}

interface ServerRoom {
  code: string;
  difficulty: DifficultyLevel;
  status: "waiting" | "active" | "completed";
  winnerId: string | null;
  initialGrid: number[];
  solution: number[];
  players: ServerPlayer[];
  createdAt: number;
}

interface QueueTicket {
  ticketId: string;
  name: string;
  difficulty: DifficultyLevel;
  createdAt: number;
  matched?: {
    code: string;
    playerId: string;
    difficulty: DifficultyLevel;
  };
}

const rooms = new Map<string, ServerRoom>();
const queueTickets = new Map<string, QueueTicket>();

function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return rooms.has(code) ? generateRoomCode() : code;
}

function generatePlayerId(): string {
  return "usr_" + Math.random().toString(36).substring(2, 9);
}

// Bot simulation interval
setInterval(() => {
  const now = Date.now();
  rooms.forEach((room) => {
    if (room.status !== "active") return;
    const bot = room.players.find((p) => p.isBot);
    if (!bot) return;

    // Bot move speed based on difficulty:
    // easy: every ~3.5s, medium: ~2.8s, hard: ~2.4s
    const chance = room.difficulty === "easy" ? 0.35 : room.difficulty === "medium" ? 0.45 : 0.55;
    if (Math.random() > chance) return;

    const emptyIndices: number[] = [];
    bot.board.forEach((val, idx) => {
      if (val === 0 && room.initialGrid[idx] === 0) {
        emptyIndices.push(idx);
      }
    });

    if (emptyIndices.length > 0) {
      const targetIdx = emptyIndices[Math.floor(Math.random() * emptyIndices.length)];
      bot.board[targetIdx] = room.solution[targetIdx];
      bot.moves += 1;

      // Check if bot won
      if (bot.board.every((val, idx) => val === room.solution[idx])) {
        room.status = "completed";
        room.winnerId = bot.id;
      }
    }
  });
}, 1800);

// API Routes

// 1. Create Room
app.post("/api/arena/rooms", (req, res) => {
  try {
    const { name, difficulty = "easy" } = req.body;
    const validDifficulty: DifficultyLevel = ["easy", "medium", "hard"].includes(difficulty)
      ? difficulty
      : "easy";

    const code = generateRoomCode();
    const playerId = generatePlayerId();
    const { puzzle, solution } = generateSudoku(validDifficulty);

    const initialFilled = puzzle.filter(Boolean).length;
    const room: ServerRoom = {
      code,
      difficulty: validDifficulty,
      status: "waiting",
      winnerId: null,
      initialGrid: [...puzzle],
      solution: [...solution],
      players: [
        {
          id: playerId,
          name: name ? String(name).trim().slice(0, 24) : "Gridfox",
          board: [...puzzle],
          initialFilled,
          moves: 0,
        },
      ],
      createdAt: Date.now(),
    };

    rooms.set(code, room);

    res.json({
      code,
      playerId,
      difficulty: validDifficulty,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to create room" });
  }
});

// 2. Join Room
app.post("/api/arena/rooms/join", (req, res) => {
  try {
    const { code: rawCode, name } = req.body;
    const code = (rawCode || "").toUpperCase().trim();
    const room = rooms.get(code);

    if (!room) {
      return res.status(404).json({ error: "Room not found." });
    }

    const playerName = name ? String(name).trim().slice(0, 24) : "Player";
    const existingPlayer = room.players.find((p) => p.name === playerName);

    if (existingPlayer) {
      return res.json({
        code: room.code,
        playerId: existingPlayer.id,
        difficulty: room.difficulty,
      });
    }

    if (room.players.length >= 2) {
      return res.status(400).json({ error: "This room is already full." });
    }

    const playerId = generatePlayerId();
    room.players.push({
      id: playerId,
      name: playerName,
      board: [...room.initialGrid],
      initialFilled: room.initialGrid.filter(Boolean).length,
      moves: 0,
    });

    if (room.players.length >= 2) {
      room.status = "active";
    }

    res.json({
      code: room.code,
      playerId,
      difficulty: room.difficulty,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to join room" });
  }
});

// 3. Room State
app.post("/api/arena/rooms/state", (req, res) => {
  try {
    const { code: rawCode, playerId } = req.body;
    const code = (rawCode || "").toUpperCase().trim();
    const room = rooms.get(code);

    if (!room) {
      return res.status(404).json({ error: "Room not found." });
    }

    const player = room.players.find((p) => p.id === playerId) || room.players[0];
    const opponent = room.players.find((p) => p.id !== player.id) || null;

    res.json({
      code: room.code,
      difficulty: room.difficulty,
      status: room.status,
      winnerId: room.winnerId,
      initialGrid: room.initialGrid,
      board: player.board,
      players: room.players.map((p) => ({
        id: p.id,
        name: p.name,
        filled: p.board.filter(Boolean).length - p.initialFilled,
        moves: p.moves,
      })),
      opponent: opponent
        ? {
            id: opponent.id,
            name: opponent.name,
            filled: opponent.board.filter(Boolean).length - opponent.initialFilled,
            moves: opponent.moves,
          }
        : null,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to read room state" });
  }
});

// 4. Submit Move
app.post("/api/arena/rooms/moves", (req, res) => {
  try {
    const { code: rawCode, playerId, cell, value } = req.body;
    const code = (rawCode || "").toUpperCase().trim();
    const room = rooms.get(code);

    if (!room) {
      return res.status(404).json({ error: "Room not found." });
    }

    const player = room.players.find((p) => p.id === playerId);
    if (!player) {
      return res.status(404).json({ error: "Player not found in room." });
    }

    if (room.status === "completed") {
      return res.status(400).json({ error: "Match is already completed." });
    }

    if (cell < 0 || cell >= 81 || room.initialGrid[cell] !== 0) {
      return res.status(400).json({ error: "Cannot modify given clues." });
    }

    const val = Number(value) || 0;
    player.board[cell] = val;
    player.moves += 1;

    // Check if player completed the board
    const isComplete = player.board.every((v, i) => v === room.solution[i]);
    if (isComplete) {
      room.status = "completed";
      room.winnerId = player.id;
    }

    const opponent = room.players.find((p) => p.id !== player.id) || null;

    res.json({
      code: room.code,
      difficulty: room.difficulty,
      status: room.status,
      winnerId: room.winnerId,
      initialGrid: room.initialGrid,
      board: player.board,
      players: room.players.map((p) => ({
        id: p.id,
        name: p.name,
        filled: p.board.filter(Boolean).length - p.initialFilled,
        moves: p.moves,
      })),
      opponent: opponent
        ? {
            id: opponent.id,
            name: opponent.name,
            filled: opponent.board.filter(Boolean).length - opponent.initialFilled,
            moves: opponent.moves,
          }
        : null,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to submit move" });
  }
});

// 5. Matchmaking Queue
app.post("/api/arena/queue", (req, res) => {
  try {
    const { name, difficulty = "easy" } = req.body;
    const validDifficulty: DifficultyLevel = ["easy", "medium", "hard"].includes(difficulty)
      ? difficulty
      : "easy";

    const playerName = name ? String(name).trim().slice(0, 24) : "Gridfox";

    // Check if someone else is waiting for same difficulty
    for (const [tId, ticket] of queueTickets.entries()) {
      if (ticket.difficulty === validDifficulty && !ticket.matched && ticket.name !== playerName) {
        // Match found!
        const code = generateRoomCode();
        const player1Id = generatePlayerId();
        const player2Id = generatePlayerId();
        const { puzzle, solution } = generateSudoku(validDifficulty);
        const initialFilled = puzzle.filter(Boolean).length;

        const room: ServerRoom = {
          code,
          difficulty: validDifficulty,
          status: "active",
          winnerId: null,
          initialGrid: [...puzzle],
          solution: [...solution],
          players: [
            {
              id: player1Id,
              name: ticket.name,
              board: [...puzzle],
              initialFilled,
              moves: 0,
            },
            {
              id: player2Id,
              name: playerName,
              board: [...puzzle],
              initialFilled,
              moves: 0,
            },
          ],
          createdAt: Date.now(),
        };

        rooms.set(code, room);
        ticket.matched = {
          code,
          playerId: player1Id,
          difficulty: validDifficulty,
        };

        return res.json({
          status: "matched",
          code,
          playerId: player2Id,
          difficulty: validDifficulty,
        });
      }
    }

    // No immediate human match, create queue ticket
    const ticketId = "ticket_" + Math.random().toString(36).substring(2, 9);
    queueTickets.set(ticketId, {
      ticketId,
      name: playerName,
      difficulty: validDifficulty,
      createdAt: Date.now(),
    });

    res.json({
      status: "waiting",
      ticketId,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to join queue" });
  }
});

// 6. Queue Status
app.post("/api/arena/queue/status", (req, res) => {
  try {
    const { ticketId } = req.body;
    const ticket = queueTickets.get(ticketId);

    if (!ticket) {
      return res.status(404).json({ error: "Queue ticket not found." });
    }

    if (ticket.matched) {
      queueTickets.delete(ticketId);
      return res.json({
        status: "matched",
        ...ticket.matched,
      });
    }

    // If waiting for more than 2 seconds, pair with a smart Arena bot
    if (Date.now() - ticket.createdAt > 2000) {
      const botNames = ["Cipher-9", "Axiom-Bot", "SudoSpark", "GridMaster", "LogicCore"];
      const botName = botNames[Math.floor(Math.random() * botNames.length)];

      const code = generateRoomCode();
      const humanId = generatePlayerId();
      const botId = generatePlayerId();
      const { puzzle, solution } = generateSudoku(ticket.difficulty);
      const initialFilled = puzzle.filter(Boolean).length;

      const room: ServerRoom = {
        code,
        difficulty: ticket.difficulty,
        status: "active",
        winnerId: null,
        initialGrid: [...puzzle],
        solution: [...solution],
        players: [
          {
            id: humanId,
            name: ticket.name,
            board: [...puzzle],
            initialFilled,
            moves: 0,
          },
          {
            id: botId,
            name: botName,
            board: [...puzzle],
            initialFilled,
            moves: 0,
            isBot: true,
          },
        ],
        createdAt: Date.now(),
      };

      rooms.set(code, room);
      queueTickets.delete(ticketId);

      return res.json({
        status: "matched",
        code,
        playerId: humanId,
        difficulty: ticket.difficulty,
      });
    }

    res.json({ status: "waiting" });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to check queue status" });
  }
});

// 7. Cancel Queue
app.post("/api/arena/queue/cancel", (req, res) => {
  const { ticketId } = req.body;
  if (ticketId) {
    queueTickets.delete(ticketId);
  }
  res.json({ cancelled: true });
});

// Setup Vite or static serving
const PORT = Number(process.env.PORT) || 3000;

async function startServer() {
  if (process.env.NODE_ENV === "production") {
    app.use(express.static(path.resolve(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.resolve(__dirname, "dist", "index.html"));
    });
  } else {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
