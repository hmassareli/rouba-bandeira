const http = require("http");
const WebSocket = require("ws");
const express = require("express");
const path = require("path");
const ngrok = require("ngrok");

const app = express();
app.use(express.static(path.join(__dirname, "public")));

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });
const players = new Map();
let blueLeader, redLeader;

wss.on("connection", (ws) => {
  console.log("Alguém entrou aqui");
  const playerId = Math.random().toString(36).substring(2, 8);
  const team = players.size % 2 === 0 ? "blue" : "red";
  players.set(playerId, { ws, team });

  if (team === "blue" && !blueLeader) blueLeader = playerId;
  if (team === "red" && !redLeader) redLeader = playerId;

  console.log(`Jogador conectado: ${playerId} (${team})`);
  const leaderId = team === "blue" ? blueLeader : redLeader;

  ws.send(
    JSON.stringify({
      type: "init",
      playerId,
      team,
      leaderId: playerId === leaderId ? null : leaderId,
      isLeader: playerId === leaderId,
      blueLeader,
      redLeader,
      players: Array.from(players.keys()),
    })
  );

  ws.on("message", (message) => {
    console.log("Mensagem recebida:", message);
    const data = JSON.parse(message);
    if (data.targetId && players.has(data.targetId)) {
      players
        .get(data.targetId)
        .ws.send(JSON.stringify({ ...data, fromId: playerId }));
    }
    if (data.type === "victory") {
      players.forEach((p) => p.ws.send(JSON.stringify(data)));
    }
  });

  ws.on("close", () => {
    players.delete(playerId);
    if (playerId === blueLeader) blueLeader = null;
    if (playerId === redLeader) redLeader = null;
    players.forEach((p) =>
      p.ws.send(
        JSON.stringify({
          type: "playerLeft",
          playerId,
          blueLeader,
          redLeader,
        })
      )
    );
    console.log(`Jogador ${playerId} saiu`);
  });
});

server.listen(3000, async () => {
  console.log("Servidor local rodando na porta 3000");
  try {
    await ngrok.authtoken("2FPRDtrxApO70jHRGL6jfuksWBO_3687cs2NXz17VHREC2vMG"); // Substitua pelo seu token ngrok
    const url = await ngrok.connect(3000);
    console.log(`Túnel ngrok criado! Acesse em: ${url}`);
    console.log(`Dê este link pros seus amigos: ${url}/game.html`);
  } catch (err) {
    console.error("Erro ao criar o túnel ngrok:", err);
  }
});
