const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");
const app = express();

app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// In-memory canvas store
const canvases = {};

io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);

  socket.on("new_note", (note) => {
    const { canvasId } = note;
    if (!canvases[canvasId]) canvases[canvasId] = [];
    canvases[canvasId].push(note);
    io.emit("note_thrown", note);
  });

  socket.on("cluster_notes", ({ canvasId }) => {
    const notes = canvases[canvasId] || [];
    const clusters = clusterNotes(notes);
    io.emit("notes_clustered", clusters);
  });

  socket.on("generate_report", ({ canvasId }) => {
    const notes = canvases[canvasId] || [];
    const summary = generateSummary(notes);
    io.emit("canvas_report", summary);
  });

  socket.on("disconnect", () => {
    console.log(`User disconnected: ${socket.id}`);
  });
});

// Very simple clustering by Levenshtein distance
function clusterNotes(notes) {
  const clusters = [];
  const used = new Set();

  notes.forEach((note, i) => {
    if (used.has(i)) return;
    const group = [note];
    used.add(i);
    notes.forEach((other, j) => {
      if (i !== j && !used.has(j)) {
        const dist = levenshtein(note.text, other.text);
        if (dist < 10) {
          group.push(other);
          used.add(j);
        }
      }
    });
    clusters.push(group);
  });

  return clusters;
}

function levenshtein(a, b) {
  const matrix = Array.from({ length: b.length + 1 }, () =>
    Array(a.length + 1).fill(0)
  );

  for (let i = 0; i <= a.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= b.length; j++) matrix[j][0] = j;

  for (let j = 1; j <= b.length; j++) {
    for (let i = 1; i <= a.length; i++) {
      if (a[i - 1] === b[j - 1]) {
        matrix[j][i] = matrix[j - 1][i - 1];
      } else {
        matrix[j][i] = Math.min(
          matrix[j - 1][i - 1] + 1,
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

// Basic summary report (you can replace this with real AI later)
function generateSummary(notes) {
  const total = notes.length;
  const examples = notes.slice(0, 3).map((n) => `• ${n.text}`).join("\n");
  return `Total notes: ${total}\nExample notes:\n${examples}`;
}

server.listen(3001, () => {
  console.log("Server running on port 3001");
});
