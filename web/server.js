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
    user: 'alvSSII',
    password: 'ejemploprueba', // Cambia si tienes contraseña
    database: 'usuariosdb',
    port: 3306 // Cambia si tu MariaDB usa otro puerto
};

const crypto = require('crypto');

app.post('/api/register', (req, res) => {
    const { usuario, clave } = req.body;
    // Encriptar la contraseña con SHA-256
    const claveHash = crypto.createHash('sha256').update(clave).digest('hex');
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
            return res.json({ exito: false, mensaje: 'Usuario ya registrado.' });
        }
        // Insertar nuevo usuario con contraseña encriptada
        connection.query('INSERT INTO usuarios (usuario, clave) VALUES (?, ?)', [usuario, claveHash], (err2) => {
            connection.end();
            if (err2) {
                return res.status(500).json({ error: 'Error al crear usuario' });
            }
            return res.json({ exito: true, mensaje: 'Usuario registrado exitosamente.' });
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
                    respuesta = 'Inicio de sesión exitoso.';
                    client.destroy();
                }
            } else {
                respuesta = 'Inicio de sesión fallido.';
                client.destroy();
            }
        } else {
            // Si el mensaje es una transferencia, mostrar mensaje de integridad y registrar en BD
            if (mensajePendiente && mensajePendiente.trim() !== '') {
                respuesta = 'Transferencia realizada con integridad.';
                // Registrar transacción en la base de datos
                const partes = mensajePendiente.split(',');
                if (partes.length === 3) {
                    const [cuenta_origen, cuenta_destino, cantidad] = partes.map(x => x.trim());
                    const connection = mysql.createConnection(dbConfig);
                    connection.connect();
                    connection.query(
                        'INSERT INTO transacciones (cuenta_origen, cuenta_destino, cantidad) VALUES (?, ?, ?)',
                        [cuenta_origen, cuenta_destino, cantidad],
                        (err) => {
                            connection.end();
                            // Puedes manejar errores aquí si lo deseas
                        }
                    );
                }
            } else {
                respuesta = texto;
            }
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
