// server.js
const express = require('express');
const net = require('net');
const path = require('path');
const app = express();
const PORT = 5030;


app.use(express.json());

// Endpoint para enviar mensaje al servidor Python
const mysql = require('mysql');

// Configuración de la base de datos MariaDB
const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: 'X!208eGm0RSbMhtpt1IN4r3I', // Cambia si tienes contraseña
    database: 'usuariosdb',
    port: 3306 // Cambia si tu MariaDB usa otro puerto
};

app.post('/api/register', (req, res) => {
    const { usuario, clave } = req.body;
    const connection = mysql.createConnection(dbConfig);
    connection.connect();
    // Comprobar si el usuario ya existe
    connection.query('SELECT id FROM usuarios WHERE usuario = ?', [usuario], (err, results) => {
        if (err) {
            connection.end();
            return res.status(500).json({ error: 'Error de base de datos' });
        }
        if (results.length > 0) {
            connection.end();
            return res.json({ exito: false, mensaje: 'El usuario ya existe' });
        }
        // Insertar nuevo usuario
        connection.query('INSERT INTO usuarios (usuario, clave) VALUES (?, ?)', [usuario, clave], (err2) => {
            connection.end();
            if (err2) {
                return res.status(500).json({ error: 'Error al crear usuario' });
            }
            return res.json({ exito: true, mensaje: 'Usuario creado correctamente' });
        });
    });
});

app.post('/api/send', (req, res) => {
    const { usuario, clave, mensaje } = req.body;
    const client = new net.Socket();
    let respuesta = '';
    let autenticado = false;
    let mensajePendiente = mensaje;

    client.connect(5030, '127.0.0.1', () => {
        // Enviar credenciales primero
        client.write(`${usuario}:${clave}`);
    });

    client.on('data', (data) => {
        const texto = data.toString();
        if (!autenticado) {
            if (texto === 'OK') {
                autenticado = true;
                if (mensajePendiente && mensajePendiente.trim() !== '') {
                    // Enviar mensaje normal solo si no está vacío
                    client.write(mensajePendiente);
                } else {
                    respuesta = texto;
                    client.destroy();
                }
            } else {
                respuesta = texto;
                client.destroy();
            }
        } else {
            respuesta = texto;
            client.destroy();
        }
    });

    client.on('close', () => {
        res.json({ respuesta });
    });

    client.on('error', (err) => {
        res.status(500).json({ error: err.message });
    });
});


app.use(express.static(path.join(__dirname, 'public')));

app.listen(PORT, () => {
    console.log(`Servidor web escuchando en http://localhost:${PORT}`);
});
