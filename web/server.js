// server.js
const express = require('express');
const net = require('net');
const path = require('path');
const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Endpoint para enviar mensaje al servidor Python
app.post('/api/send', (req, res) => {
    const mensaje = req.body.mensaje;
    const client = new net.Socket();
    let respuesta = '';

    client.connect(3030, '127.0.0.1', () => {
        client.write(mensaje);
    });

    client.on('data', (data) => {
        respuesta += data.toString();
        client.destroy();
    });

    client.on('close', () => {
        res.json({ respuesta });
    });

    client.on('error', (err) => {
        res.status(500).json({ error: err.message });
    });
});

app.listen(PORT, () => {
    console.log(`Servidor web escuchando en http://localhost:${PORT}`);
});
