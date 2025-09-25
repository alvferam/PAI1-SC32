"""
Servidor principal para autenticación y gestión de transacciones.
Desarrollado para prácticas de Seguridad y Sistemas Informáticos.
"""

import socket  # Comunicación por sockets TCP
import hashlib  # Hashing seguro de contraseñas
import mysql.connector  # Conexión a base de datos MariaDB
import time  # Control de bloqueos por fuerza bruta


DB_HOST = "localhost"  # Host de la base de datos
DB_USER = "alvSSII"    # Usuario con permisos mínimos (SELECT, INSERT)
DB_PASSWORD = "ejemploprueba"  # Contraseña segura
DB_NAME = "usuariosdb" # Nombre de la base de datos

HOST = "127.0.0.1"  # Dirección local del servidor
PORT = 5030         # Puerto de escucha

# Seguridad: protección contra fuerza bruta
MAX_INTENTOS = 5            # Intentos máximos antes de bloqueo
BLOQUEO_MINUTOS = 5         # Duración del bloqueo en minutos
intentos_fallidos_ip = {}   # Intentos fallidos por IP
bloqueos_ip = {}            # IPs bloqueadas temporalmente

with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
    s.bind((HOST, PORT))
    s.listen()
    print(f"Servidor escuchando en {HOST}:{PORT}")
    detener = False
    # Conexión persistente a la base de datos
    db = mysql.connector.connect(
        host=DB_HOST,
        user=DB_USER,
        password=DB_PASSWORD,
        database=DB_NAME
    )
    cursor = db.cursor()
    while not detener:
        conn, addr = s.accept()
        ip_cliente = addr[0]
        with conn:
            print(f"Conexión establecida desde {addr}")
            # --- Autenticación de usuario ---
            data = conn.recv(1024)
            if not data:
                conn.close()
                continue
            try:
                credenciales = data.decode('utf-8').strip().split(":")
                usuario = credenciales[0]
                clave = credenciales[1]
            except Exception:
                conn.sendall(b"ERROR formato credenciales")
                conn.close()
                continue
            # --- Protección contra fuerza bruta por IP ---
            ahora = time.time()
            if ip_cliente in bloqueos_ip:
                if ahora < bloqueos_ip[ip_cliente]:
                    minutos_restantes = int((bloqueos_ip[ip_cliente] - ahora) // 60) + 1
                    conn.sendall(f"IP bloqueada por intentos fallidos. Intenta en {minutos_restantes} minutos.".encode('utf-8'))
                    conn.close()
                    continue
                else:
                    del bloqueos_ip[ip_cliente]
                    intentos_fallidos_ip[ip_cliente] = 0
            # --- Verificación de credenciales ---
            clave_hash = hashlib.sha256(clave.encode('utf-8')).hexdigest()
            cursor = db.cursor()
            cursor.execute("SELECT clave FROM usuarios WHERE usuario = %s", (usuario,))
            resultado = cursor.fetchone()
            cursor.close()
            if resultado and resultado[0] == clave_hash:
                conn.sendall(b"OK")
                intentos_fallidos_ip[ip_cliente] = 0
            else:
                # Registrar intento fallido por IP
                intentos_fallidos_ip[ip_cliente] = intentos_fallidos_ip.get(ip_cliente, 0) + 1
                if intentos_fallidos_ip[ip_cliente] >= MAX_INTENTOS:
                    bloqueos_ip[ip_cliente] = ahora + BLOQUEO_MINUTOS * 60
                    conn.sendall(f"IP bloqueada por {BLOQUEO_MINUTOS} minutos por demasiados intentos fallidos.".encode('utf-8'))
                else:
                    restantes = MAX_INTENTOS - intentos_fallidos_ip[ip_cliente]
                    conn.sendall(f"ERROR autenticacion. Intentos restantes: {restantes}".encode('utf-8'))
                conn.close()
                continue
            # --- Comunicación de mensajes/transacciones ---
            while True:
                data = conn.recv(1024)
                if not data:
                    break
                mensaje = data.decode('utf-8').strip()
                # Aquí se procesarían las transacciones si se requiriera lógica adicional
                conn.sendall(data)
    cursor.close()
    db.close()
