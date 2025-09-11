import {
  connect,
  subscribe,
  send,
  getToken,
  CHAT_API_URL,
} from "./chatService.js";
let typingTimer;
const messageInput = document.getElementById("message-input");
const sendButton = document.getElementById("send-button");
const currentConversationId = 1; // O ID da conversa ativa
const fileInput = document.getElementById("file-input");
const TYPING_TIMEOUT = 2000;
const messageList = document.getElementById("message-list");
let oldestMessage = null; // mensagem mais antiga que temos

// Suponha que esta função é chamada após o login no PHP
function onLoginSuccess(token) {
  // 1. Guardar o token
  localStorage.setItem("chat_jwt_token", token);

  // 2. Conectar ao chat
  connect(
    () => {
      // O que fazer quando a conexão for bem-sucedida
      console.log("Conexão com o chat estabelecida!");
      //subscrever aos tópicos, carregar a lista de conversa
      loadConversations();
      subscribeToPresenceUpdates();
    },
    (error) => {
      alert(
        "Não foi possível conectar ao serviço de chat. Tente novamente mais tarde."
      );
    }
  );
}

function openConversation(conversationId) {
  const destination = `/topic/conversation/${conversationId}`;

  subscribe(destination, (message) => {
    // message é o nosso ChatMessageDto que vem do backend
    // Ex: { senderDisplayName: "Mayara", content: "Olá!",... }

    // Adicionar a mensagem à janela de chat
    displayNewMessage(message);
  });
}
sendButton.addEventListener("click", () => {
  const content = messageInput.value;
  if (content.trim() !== "") {
    const payload = {
      conversationId: currentConversationId,
      content: content,
    };

    // Envia a mensagem para o backend
    send("/app/chat.send", payload);

    messageInput.value = "";
  }
});

// Indicador de "Digitando..."
messageInput.addEventListener("keydown", () => {
  clearTimeout(typingTimer);
  send("/app/typing", {
    conversationId: currentConversationId,
    isTyping: true,
  });
});
messageInput.addEventListener("keyup", () => {
  clearTimeout(typingTimer);
  typingTimer = setTimeout(() => {
    send("/app/typing", {
      conversationId: currentConversationId,
      isTyping: false,
    });
  }, TYPING_TIMEOUT);
});

// Para receber os eventos
subscribe(`/topic/conversation/${currentConversationId}/typing`, (event) => {
  // event = { userId: "456", isTyping: true }
  updateTypingIndicatorInUI(event.userId, event.isTyping);
});

//Contagem de Mensagens Não Lidas
async function markConversationAsRead(conversationId) {
  const token = getToken();
  await fetch(`${CHAT_API_URL}/api/conversations/${conversationId}/read`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  // Após marcar como lida, zerar o contador de não lidas
  resetUnreadCountInUI(conversationId);
}

//Scroll Infinito
messageList.addEventListener("scroll", async () => {
  //topo
  if (messageList.scrollTop === 0) {
    const olderMessages = await fetchOlderMessages(
      currentConversationId,
      oldestMessage
    );

    // Guardar a altura atual do scroll para evitar "saltos"
    const previousHeight = messageList.scrollHeight;

    //mensagens antigas no topo
    prependMessages(olderMessages);

    //scroll
    messageList.scrollTop = messageList.scrollHeight - previousHeight;

    // Atualizar qual é a mensagem mais antiga
    if (olderMessages.length > 0) {
      oldestMessage = olderMessages;
    }
  }
});

async function fetchOlderMessages(conversationId, lastMessage) {
  const token = getToken();
  let url = `${CHAT_API_URL}/api/conversations/${conversationId}/messages`;

  if (lastMessage) {
    // Enviar o timestamp e o ID da última mensagem
    url += `?beforeTimestamp=${lastMessage.timestamp}&beforeId=${lastMessage.id}`;
  }

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  return await response.json();
}

//Upload de arquivos
fileInput.addEventListener("change", async (event) => {
  const file = event.target.files;
  if (!file) return;

  // 1. Pedir a URL de upload ao backend
  const token = getToken();
  const response = await fetch(
    `${CHAT_API_URL}/api/uploads/request-url?fileName=${file.name}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  const { uploadUrl, fileId } = await response.json();

  // 2. Fazer o upload DIRETAMENTE para a Azure usando a URL recebida
  const uploadResponse = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "x-ms-blob-type": "BlockBlob" },
    body: file,
  });

  if (uploadResponse.ok) {
    //Notificar  backend que o upload foi ok
    // e enviar uma mensagem de chat com o link para o storage
    send("/app/chat.send", {
      conversationId: currentConversationId,
      content: `Ficheiro carregado: ${fileId}`,
    });
  }
});
