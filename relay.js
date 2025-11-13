// relay.js
// Simple WebSocket relay server for Godot 4 Tennis Math Game

import express from "express";
import { WebSocketServer } from "ws";
import { randomInt } from "crypto";

// ----- Express server just to satisfy Render -----
const app = express();
const PORT = process.env.PORT || 3000;
app.get("/", (req, res) => res.send("Tennis Math Relay Online"));
const server = app.listen(PORT, () => console.log(`HTTP running on port ${PORT}`));

// ----- WebSocket server for real-time gameplay -----
const wss = new WebSocketServer({ server });

/**
 * Rooms structure:
 * rooms = {
 *   "123456": [player1_ws, player2_ws]
 * }
 */
let rooms = {};

wss.on("connection", (ws) => {
  console.log("✅ New connection");

  ws.on("message", (msg) => {
    let data;
    try {
      data = JSON.parse(msg.toString());
    } catch (e) {
      console.error("❌ Invalid JSON:", msg.toString());
      return;
    }

    switch (data.type) {
      // Host creates a game
      case "create":
        let code = randomInt(100000, 999999).toString();
        rooms[code] = [ws];
        ws.send(JSON.stringify({ type: "created", code }));
        console.log(`🆕 Game created with code ${code}`);
        break;

      // Player joins a game
      case "join":
        code = data.code;
        if (rooms[code] && rooms[code].length < 2) {
          rooms[code].push(ws);
          ws.send(JSON.stringify({ type: "joined", code }));
          console.log(`👤 Player joined room ${code}`);

          // Notify both players that game starts
          rooms[code].forEach(p => p.send(JSON.stringify({ type: "start" })));
        } else {
          ws.send(JSON.stringify({ type: "error", msg: "Invalid or full code" }));
        }
        break;

      // Relay in-game messages (question, answer, score)
      case "game":
        code = data.code;
        if (rooms[code]) {
          rooms[code].forEach(p => {
            if (p !== ws) p.send(JSON.stringify(data));
          });
        }
        break;

      default:
        ws.send(JSON.stringify({ type: "error", msg: "Unknown message type" }));
    }
  });

  ws.on("close", () => {
    console.log("⚠️ Connection closed, cleaning up rooms");
    for (const code in rooms) {
      rooms[code] = rooms[code].filter(p => p !== ws);
      if (rooms[code].length === 0) delete rooms[code];
    }
  });
});

console.log("🎾 Relay server running and ready for Godot 4 Tennis Game!");
