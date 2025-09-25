# clientsocket.py

import socket

HOST = "127.0.0.1"  # The server's hostname or IP address
PORT = 5030  # The port used by the server

with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
    s.connect((HOST, PORT))
    usuario = input("Usuario: ")
    clave = input("Clave: ")
    credenciales = f"{usuario}:{clave}"
    s.sendall(credenciales.encode('utf-8'))
    respuesta = s.recv(1024).decode('utf-8')
    if respuesta != "OK":
        print(f"Autenticación fallida: {respuesta}")
    else:
        print("Autenticación exitosa.")
        while True:
            mensaje = input("Escribe un mensaje (o 'cierre' para salir): ")
            s.sendall(mensaje.encode('utf-8'))
            if mensaje.lower().strip() == "cierre":
                print("Conexión cerrada por el usuario.")
                break
            data = s.recv(1024)
            print(f"Recibido: {data.decode('utf-8')}")
