// chatService.js

const CHAT_API_URL = "http://localhost:8081"; // URL backend Java
let stompClient = null;
let connected = false;

//obter o token guardado após o login no PHP
function getToken() {
  return localStorage.getItem("chat_jwt_token");
}

// Função principal de conexão
function connect(onConnectedCallback, onErrorCallback) {
  const token = getToken();
  if (!token) {
    console.error("Não foi possível conectar: token JWT não encontrado.");
    onErrorCallback("Token não encontrado");
    return;
  }

  const socket = new SockJS(`${CHAT_API_URL}/ws`);
  stompClient = Stomp.over(socket);

  const headers = {
    Authorization: `Bearer ${token}`,
  };

  stompClient.connect(
    headers,
    (frame) => {
      //sucesso
      connected = true;
      console.log("Conectado ao WebSocket:", frame);
      if (onConnectedCallback) onConnectedCallback();
    },
    (error) => {
      //erro
      connected = false;
      console.error("Erro na conexão WebSocket:", error);
      if (onErrorCallback) onErrorCallback(error);
    }
  );
}

//subscrever a um tópico
function subscribe(destination, callback) {
  if (!connected) return;
  stompClient.subscribe(destination, (message) => {
    callback(JSON.parse(message.body));
  });
}

//enviar dados para um endpoint
function send(destination, body) {
  if (!connected) return;
  stompClient.send(destination, {}, JSON.stringify(body));
}

export { connect, subscribe, send, getToken, CHAT_API_URL };
