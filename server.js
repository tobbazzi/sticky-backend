
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const app = express();

app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

let notes = [];

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  socket.emit('initial_notes', notes);

  socket.on('new_note', (note) => {
    notes.push(note);
    io.emit('note_thrown', note);
  });

  socket.on('cluster_notes', () => {
    const clusters = clusterNotes(notes);
    io.emit('notes_clustered', clusters);
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
  });
});

function clusterNotes(notes) {
  const clusters = [];
  const used = new Set();
  notes.forEach((note, i) => {
    if (used.has(i)) return;
    const group = [note];
    used.add(i);
    notes.forEach((otherNote, j) => {
      if (i !== j && !used.has(j)) {
        const dist = levenshtein(note.text, otherNote.text);
        if (dist < 10) {
          group.push(otherNote);
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

server.listen(3001, () => {
  console.log('Server running on port 3001');
});
