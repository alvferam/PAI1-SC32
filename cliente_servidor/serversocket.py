# serversocket.py

import socket

HOST = "127.0.0.1"  # Standard loopback interface address (localhost)
PORT = 3030  # Port to listen on (non-privileged ports are > 1023)

with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
    s.bind((HOST, PORT))
    s.listen()
    conn, addr = s.accept()
    with conn:
        print(f"Connected by {addr}")
        while True:
            data = conn.recv(1024)
            if not data:
                break
            mensaje = data.decode('utf-8').strip()
            if mensaje.lower() == "cerrar":
                print("Cerrando conexión por solicitud del cliente.")
                break
            conn.sendall(data)
