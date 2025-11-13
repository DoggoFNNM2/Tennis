// relay.js
import express from "express";
import { WebSocketServer } from "ws";
import { randomInt } from "crypto";

const app = express();
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => console.log("Relay running on", PORT));
const wss = new WebSocketServer({ server });

let rooms = {}; // { "123456": [ws1, ws2] }

wss.on("connection", (ws) => {
  ws.on("message", (msg) => {
    const data = JSON.parse(msg);
    if (data.type === "create") {
      const code = randomInt(100000, 999999).toString();
      rooms[code] = [ws];
      ws.send(JSON.stringify({ type: "created", code }));
    } else if (data.type === "join") {
      const code = data.code;
      if (rooms[code] && rooms[code].length < 2) {
        rooms[code].push(ws);
        ws.send(JSON.stringify({ type: "joined", code }));
        // notify both players
        rooms[code].forEach(p => p.send(JSON.stringify({ type: "start" })));
      } else {
        ws.send(JSON.stringify({ type: "error", msg: "Invalid or full code" }));
      }
    } else if (data.type === "game") {
      // relay gameplay messages to the other player
      const code = data.code;
      if (rooms[code]) {
        rooms[code].forEach(p => {
          if (p !== ws) p.send(JSON.stringify(data));
        });
      }
    }
  });

  ws.on("close", () => {
    for (const code in rooms) {
      rooms[code] = rooms[code].filter(p => p !== ws);
      if (rooms[code].length === 0) delete rooms[code];
    }
  });
});
