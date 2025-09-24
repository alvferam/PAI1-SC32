# clientsocket.py

import socket

HOST = "127.0.0.1"  # The server's hostname or IP address
PORT = 3030  # The port used by the server

with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
    s.connect((HOST, PORT))
    while True:
        mensaje = input("Escribe un mensaje (o 'cerrar' para salir): ")
        s.sendall(mensaje.encode('utf-8'))
        if mensaje.lower().strip() == "cerrar":
            print("Conexión cerrada por el usuario.")
            break
        data = s.recv(1024)
        print(f"Recibido: {data.decode('utf-8')}")
