$(document).ready(function () {
  // --- FONTE DE DADOS SIMULADA ---
  let conversasDB = [
    {
      id: "c1",
      nome: "Joyce",
      email: "hajeera@example.com",
      ultimaMsg: "Ok, let me check.",
      timestamp: "Ontem",
      naoLido: 3,
      tipo: "chats",
      fixado: false,
      admin: false,
    },
    {
      id: "c2",
      nome: "Arthur",
      email: "riya@example.com",
      ultimaMsg: "See you tomorrow",
      timestamp: "Segunda",
      naoLido: 0,
      tipo: "chats",
      fixado: false,
      admin: false,
    },
    {
      id: "c3",
      nome: "Equipe de Vendas",
      descricao: "Grupo para alinhamento de estratégias e novos leads.",
      usuarios: ["Você", "Marcos", "Ana"],
      ultimaMsg: "<strong>Marcos:</strong> Pessoal, novo lead na área!",
      timestamp: "10:30",
      naoLido: 1,
      tipo: "grupos",
      fixado: false,
      admin: true,
    },
    {
      id: "c4",
      nome: "Maria Eloisa",
      email: "nakul@example.com",
      ultimaMsg: "Ok",
      timestamp: "Segunda",
      naoLido: 0,
      tipo: "chats",
      fixado: false,
      admin: false,
    },
    {
      id: "c5",
      nome: "Projeto Alpha",
      descricao:
        "Discussões técnicas sobre o desenvolvimento do Projeto Alpha.",
      usuarios: ["Você", "Ana", "Carlos"],
      ultimaMsg: "<strong>Ana:</strong> Deadline é amanhã!",
      timestamp: "09:15",
      naoLido: 0,
      tipo: "grupos",
      fixado: true,
      admin: false,
    },
  ];

  let mensagensDB = {
    c1: [
      { id: 1, tipo: "recebida", texto: "Hi, Hajeera.", fixada: false },
      {
        id: 2,
        tipo: "enviada",
        texto: "Hey, I'm open for work, plz share me further details.",
        fixada: false,
      },
    ],
    c2: [{ id: 3, tipo: "recebida", texto: "See you tomorrow", fixada: false }],
    c3: [
      {
        id: 4,
        tipo: "recebida",
        texto: "<strong>Marcos:</strong> Pessoal, novo lead na área!",
        fixada: true,
      },
      {
        id: 5,
        tipo: "enviada",
        texto: "Obrigado por avisar, Marcos! Já estou verificando.",
        fixada: false,
      },
    ],
    c4: [
      { id: 6, tipo: "enviada", texto: "Tudo certo por aqui?" },
      { id: 7, tipo: "recebida", texto: "Ok", fixada: false },
    ],
    c5: [
      {
        id: 8,
        tipo: "recebida",
        texto: "<strong>Ana:</strong> Deadline é amanhã!",
        fixada: false,
      },
    ],
  };

  // --- VARIÁVEIS GLOBAIS ---
  const coresAvatar = [
    "#5c8970", // verde pastel suave
    "#e6960dff", // verde menta claro
    "#0dc475ff", // verde lima suave
    "#99D98C", // verde folha claro
    "#76C893", // verde médio natural
    "#52B788", // verde vibrante
    "#40916C", // verde floresta médio
    "#2D6A4F", // verde escuro elegante
    "#1B4332", // verde bem profundo
    "#cbe80eff", // verde esbranquiçado (para contraste leve)
  ];
  let modoAtual = "maximizado";
  let conversaAtivaId = null;
  const modalNovoGrupo = $("#modal-novo-grupo");
  const modalInfo = $("#modal-info");
  let pressTimer;

  // --- FUNÇÕES DE RENDERIZAÇÃO E LÓGICA ---

  /**
   * Gera a lista de conversas no HTML a partir do array conversasDB.
   */
  function renderizarListaConversas() {
    const container = $("#lista-conversas");
    container.html("");
    conversasDB.sort((a, b) => b.fixado - a.fixado);

    conversasDB.forEach((conversa) => {
      const badgeHtml =
        conversa.naoLido > 0
          ? `<span class="badge-nao-lido">${conversa.naoLido}</span>`
          : "";
      const fixadoClass = conversa.fixado ? "fixado" : "";
      const fixadoIcon = conversa.fixado
        ? '<i class="fas fa-thumbtack fixado-icon-lista"></i>'
        : "";

      const conversaHtml = `
                <div class="conversa-item ${fixadoClass}" data-id="${conversa.id}" data-nome="${conversa.nome}" data-tipo="${conversa.tipo}">
                    <div class="avatar" data-nome="${conversa.nome}"></div>
                    <div class="conversa-info">
                        <h4>${conversa.nome} ${fixadoIcon}</h4>
                        <p>${conversa.ultimaMsg}</p>
                    </div>
                    <div class="conversa-meta">
                        <span class="timestamp">${conversa.timestamp}</span>
                        ${badgeHtml}
                    </div>
                </div>
            `;
      container.append(conversaHtml);
    });
    gerarAvatares();
    filtrarConversas();
  }
  /**
   * Cria e exibe o menu de contexto customizado para a lista de conversas.
   */
  function mostrarMenuContexto(conversaItem, x, y) {
    const menu = $("#menu-contexto-conversa");
    const conversaId = conversaItem.data("id");
    const conversa = conversasDB.find((c) => c.id === conversaId);
    if (!conversa) return;

    menu.html("");
    const fixarTexto = conversa.fixado ? "Desafixar" : "Fixar";
    let menuHtml = `
            <a class="dropdown-item acao-contexto-fixar" href="#" data-id="${conversaId}"><i class="fas fa-thumbtack fa-fw me-2"></i>${fixarTexto}</a>
            <a class="dropdown-item acao-contexto-excluir" href="#" data-id="${conversaId}"><i class="fas fa-trash fa-fw me-2"></i>Excluir</a>
        `;
    if (conversa.tipo === "grupo" && conversa.admin) {
      menuHtml += `<li><hr class="dropdown-divider"></li><li><a class="dropdown-item acao-contexto-excluir-admin" href="#" data-id="${conversaId}"><i class="fas fa-times-circle fa-fw me-2"></i>Excluir Grupo (Admin)</a></li>`;
    }
    menu.html(menuHtml);

    menu.css({ top: y + 2, left: x + 2, display: "block" });
  }

  /**
   * Gera avatares com a inicial do nome e cor de fundo.
   */
  function gerarAvatares() {
    $(".avatar").each(function () {
      const nome = $(this).data("nome");
      if (nome) {
        const inicial = nome.charAt(0).toUpperCase();
        let hash = 0;
        for (let i = 0; i < nome.length; i++) {
          hash = nome.charCodeAt(i) + ((hash << 5) - hash);
        }
        const corIndex = Math.abs(hash % coresAvatar.length);
        $(this).css("background-color", coresAvatar[corIndex]).text(inicial);
      }
    });
  }

  /**
   * Abre uma conversa, atualizando o painel da direita.
   */
  function abrirConversa(elementoConversa) {
    conversaAtivaId = elementoConversa.data("id");
    const nome = elementoConversa.data("nome");

    $(".conversa-item").removeClass("active");
    elementoConversa.addClass("active");
    $("#nome-contato-ativo").text(nome);
    $("#avatar-contato-ativo").data("nome", nome);
    gerarAvatares();
    carregarMensagens(conversaAtivaId);

    if (modoAtual === "maximizado") {
      $("#chat-container").addClass("conversa-ativa");
    } else {
      $("#chatbox-corpo").addClass("conversa-ativa");
    }
  }

  /**
   * Carrega e renderiza mensagens normais e fixadas.
   */
  function carregarMensagens(idConversa) {
    const areaFixadas = $("#area-mensagens-fixadas");
    const areaMensagens = $("#area-mensagens");
    areaFixadas.html("");
    areaMensagens.html("");

    const mensagensDaConversa = mensagensDB[idConversa] || [];

    //todas as mensagens primeiro
    mensagensDaConversa.forEach((msg) => {
      adicionarBalaoMensagem(msg.texto, msg.tipo, msg.id, msg.fixada); //estado 'fixada'
    });

    mensagensDaConversa
      .filter((msg) => msg.fixada)
      .forEach((msg) => {
        const fixadaHtml = `
                <div class="mensagem-fixada" data-msg-id="${
                  msg.id
                }" data-conversa-id="${idConversa}">
                    <div class="mensagem-fixada-conteudo">
                        <i class="fas fa-thumbtack mensagem-fixada-icone"></i>
                        <p><strong>${
                          msg.tipo === "enviada" ? "Você" : "Remetente"
                        }:</strong> ${msg.texto}</p>
                    </div>
                    <button class="btn-desafixar" title="Desafixar"><i class="fas fa-times"></i></button>
                </div>
            `;
        areaFixadas.append(fixadaHtml);
      });

    scrollParaUltimaMensagem();
  }

  /**
   * Adiciona um balão de mensagem na área de conversa.
   */
  /**
   * Adiciona um balão de mensagem na área de conversa.
   * ATUALIZADO: Corrigido para usar 'data-toggle' do Bootstrap 4.
   */
  function adicionarBalaoMensagem(texto, tipo, msgId, isFixada = false) {
    const regexUrl = /(https?:\/\/[^\s]+)/g;
    const textoFormatado = texto.replace(
      regexUrl,
      '<a href="$1" target="_blank">$1</a>'
    );
    const textoCurtir = "Curtir";

    const menuHtml = `
            <div class="dropdown menu-mensagem-wrapper">
              <button class="btn-menu-msg" type="button" data-toggle="dropdown"><i class="fas fa-ellipsis-v"></i></button>
              <ul class="dropdown-menu">
                <li><a class="dropdown-item acao-curtir" href="#"><i class="fas fa-thumbs-up fa-fw me-2"></i><span>${textoCurtir}</span></a></li>
                <li><a class="dropdown-item acao-fixar-msg" href="#"><i class="fas fa-thumbtack fa-fw me-2"></i>${
                  isFixada ? "Desafixar" : "Fixar"
                }</a></li>
                <li><a class="dropdown-item acao-apagar-msg" href="#"><i class="fas fa-trash fa-fw me-2"></i>Apagar</a></li>
              </ul>
            </div>
        `;

    const fixadaClass = isFixada ? "mensagem-original-fixada" : "";
    const balaoHtml = `<div class="mensagem ${tipo} ${fixadaClass}" data-msg-id="${msgId}" data-curtidas="0" data-curtido-pelo-usuario="false">${menuHtml}<p>${textoFormatado}</p></div>`;
    $("#area-mensagens").append(balaoHtml);
  }

  /**
   * Popula e exibe o modal com informações da conversa ativa.
   */
  function mostrarModalInfo() {
    // 1. Validação inicial
    if (!conversaAtivaId) return;
    const conversa = conversasDB.find((c) => c.id === conversaAtivaId);
    if (!conversa) return;

    const modalDialog = $("#modal-info .modal-dialog");
    const modalContent = $("#modal-info .modal-content");

    modalContent.html("");

    // 2. Verifica de forma segura se a conversa é do tipo 'chats'
    if (conversa && conversa.tipo && conversa.tipo.trim() === "chats") {
      modalDialog.removeClass("modal-xl").addClass("modal-md");

      // CORREÇÃO: Trocado 'data-bs-dismiss' por 'data-dismiss'
      const htmlChat = `
            <div class="modal-header">
                <h5 class="modal-title">Informações do Contato</h5>
                <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                    <span aria-hidden="true">&times;</span>
                </button>
            </div>
            <div class="modal-body">
                <div class="d-flex align-items-center">
                    <div class="avatar me-3" data-nome="${conversa.nome}"></div>
                    <div>
                        <h5 class="mb-0">${conversa.nome}</h5>
                        <p class="text-muted mb-0">${
                          conversa.email || "E-mail não disponível"
                        }</p>
                    </div>
                </div>
            </div>
        `;
      modalContent.html(htmlChat);
    } else if (conversa && conversa.tipo && conversa.tipo.trim() === "grupos") {
      modalDialog.removeClass("modal-md").addClass("modal-xl");

      const listaUsuarios = conversa.usuarios || [];
      const todosUsuarios = [
        { nome: "Você", email: "voce@example.com", admin: true },
        { nome: "Marcos", email: "marcos@example.com", admin: true },
        { nome: "Ana", email: "ana@example.com", admin: false },
        { nome: "Carlos", email: "carlos@example.com", admin: true },
        { nome: "Julia", email: "julia@example.com", admin: false },
      ];

      const membrosDoGrupo = listaUsuarios.map((nomeUsuario) => {
        return (
          todosUsuarios.find((u) => u.nome === nomeUsuario) || {
            nome: nomeUsuario,
            admin: false,
          }
        );
      });

      const membrosHtml = membrosDoGrupo
        .map((membro) => {
          const adminTag =
            membro.admin || (membro.nome === "Você" && conversa.admin)
              ? '<span class="member-admin-tag">Admin</span>'
              : "";
          const btnRemover =
            conversa.admin && membro.nome !== "Você"
              ? '<button class="btn btn-sm btn-danger btn-remover-usuario" data-usuario="' +
                membro.nome +
                '"><i class="fas fa-user-minus"></i></button>'
              : "";
          return `
                <li class="list-group-item member-item" data-member-name="${
                  membro.nome
                }" data-member-email="${membro.email || ""}">
                    <div class="member-avatar avatar" data-nome="${
                      membro.nome
                    }"></div>
                    <div class="member-info">
                        <div class="member-name-row"><h6 class="member-name">${
                          membro.nome
                        }</h6>${adminTag}</div>
                    </div>
                    ${btnRemover}
                </li>`;
        })
        .join("");

      // CORREÇÃO: Trocado 'data-bs-dismiss' por 'data-dismiss' e classe 'btn-close' por 'close'
      const htmlGrupo = `
            <div class="modal-header modal-header-custom-group">
                <h4 class="modal-title">Membros (${listaUsuarios.length})</h4>
                <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                    <span aria-hidden="true">&times;</span>
                </button>
            </div>
            <div class="modal-body modal-body-custom-group">
                <div class="search-members-container">
                    <i class="fas fa-search search-members-icon"></i>
                    <input type="text" class="form-control search-members-input" placeholder="Procurar membros">
                </div>
                <ul class="list-group list-group-members">${membrosHtml}</ul>
                <div class="group-admin-actions">
                    ${
                      conversa.admin
                        ? '<button class="btn btn-primary btn-sm btn-adicionar-usuario"><i class="fas fa-user-plus me-2"></i> Adicionar</button>'
                        : ""
                    }
                    ${
                      conversa.admin
                        ? '<button class="btn btn-outline-secondary btn-sm btn-editar-grupo"><i class="fas fa-edit me-2"></i> Editar Grupo</button>'
                        : ""
                    }
                </div>
            </div>`;
      modalContent.html(htmlGrupo);
    }

    // 3. Exibe o modal e gera os avatares
    // O método .modal('show') do jQuery funciona para ambas as versões
    modalInfo.modal("show");
    gerarAvatares();
  }
  // --- EVENT HANDLERS DE FIXAR/DESAFIXAR ---

  $(document).on("click", ".acao-fixar-msg", function (e) {
    e.preventDefault();
    const msgId = $(this).closest(".mensagem").data("msg-id");
    const msg = mensagensDB[conversaAtivaId].find((m) => m.id === msgId);

    if (msg) {
      // Em vez de apenas definir como 'true', nós invertemos o valor atual.
      // Se for 'true', vira 'false'. Se for 'false', vira 'true'.
      msg.fixada = !msg.fixada;
      carregarMensagens(conversaAtivaId);
    }
  });

  $(document).on("click", ".btn-desafixar", function () {
    const msgId = $(this).closest(".mensagem-fixada").data("msg-id");
    const conversaIdDaMensagemFixada = $(this)
      .closest(".mensagem-fixada")
      .data("conversa-id");
    const msg = mensagensDB[conversaIdDaMensagemFixada].find(
      (m) => m.id === msgId
    );
    if (msg) {
      msg.fixada = false;
      // Carrega as mensagens da conversa ativa (a mesma que continha a mensagem fixada)
      carregarMensagens(conversaIdDaMensagemFixada);
    }
  });
  /**
   * Rola a área de mensagens para o final.
   */
  function scrollParaUltimaMensagem() {
    const areaMensagens = $("#area-mensagens");
    areaMensagens.scrollTop(areaMensagens.prop("scrollHeight"));
  }

  /**
   * Envia uma nova mensagem digitada pelo usuário.
   */
  function enviarMensagem() {
    const input = $("#input-mensagem");
    const texto = input.val().trim();
    if (texto !== "") {
      const novoId = Date.now(); // ID simples para o exemplo
      mensagensDB[conversaAtivaId].push({
        id: novoId,
        tipo: "enviada",
        texto: texto,
        fixada: false,
      });
      adicionarBalaoMensagem(texto, "enviada", novoId);
      scrollParaUltimaMensagem();
      input.val("");
    }
  }

  /**
   * Alterna a visualização entre modo maximizado e chatbox.
   */
  function alternarModo(novoModo) {
    if (novoModo === "chatbox") {
      modoAtual = "chatbox";
      $("#chatbox-corpo").append(
        $("#painel-lista-conversas, #painel-conversa")
      );
      $("#chat-container").removeClass("modo-maximizado").hide();
      $("#chatbox").addClass("aberto").removeClass("minimizado");
      $("#btn-abrir-chatbox").fadeOut();
    } else {
      modoAtual = "maximizado";
      $("#chat-container")
        .append($("#painel-lista-conversas, #painel-conversa"))
        .addClass("modo-maximizado")
        .show();
      $("#chatbox").removeClass("aberto");
      $("#btn-abrir-chatbox").fadeIn();
    }
  }

  /**
   * Popula e exibe o modal com informações da conversa ativa.
   *
   */

  function mostrarModalInfo() {
    // 1. Validação inicial
    if (!conversaAtivaId) return;
    const conversa = conversasDB.find((c) => c.id === conversaAtivaId);
    if (!conversa) return;

    const modalDialog = $("#modal-info .modal-dialog");
    const modalContent = $("#modal-info .modal-content");

    // Limpa completamente o conteúdo anterior para evitar qualquer resíduo
    modalContent.html("");

    // 2. Verifica de forma segura se a conversa é do tipo 'chat'
    if (conversa && conversa.tipo && conversa.tipo.trim() === "chats") {
      // --- LÓGICA EXCLUSIVA PARA CHAT PRIVADO ---

      const htmlChat = `
            <div class="modal-header">
                <h5 class="modal-title">Informações do Contato</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
                <div class="d-flex align-items-center">
                    <div class="avatar me-3" data-nome="${conversa.nome}"></div>
                    <div>
                        <h5 class="mb-0">${conversa.nome}</h5>
                        <p class="text-muted mb-0">${
                          conversa.email || "E-mail não disponível"
                        }</p>
                    </div>
                </div>
            </div>
        `;

      modalContent.html(htmlChat);
    } else if (conversa && conversa.tipo && conversa.tipo.trim() === "grupos") {
      // --- LÓGICA EXCLUSIVA PARA GRUPO ---

      const listaUsuarios = conversa.usuarios || [];
      const todosUsuarios = [
        {
          nome: "Você",
          email: "voce@example.com",
          telefone: null,
          admin: true,
        },
        {
          nome: "Marcos",
          email: "marcos@example.com",
          telefone: "+55 11 98765-4321",
          admin: true,
        },
        {
          nome: "Ana",
          email: "ana@example.com",
          telefone: "+55 21 99876-5432",
          admin: false,
        },
        {
          nome: "Carlos",
          email: "carlos@example.com",
          telefone: "+55 31 97654-3210",
          admin: true,
        },
        {
          nome: "Julia",
          email: "julia@example.com",
          telefone: "+55 41 96543-2109",
          admin: false,
        },
      ];

      const membrosDoGrupo = listaUsuarios.map((nomeUsuario) => {
        return (
          todosUsuarios.find((u) => u.nome === nomeUsuario) || {
            nome: nomeUsuario,
            admin: false,
          }
        );
      });

      const membrosHtml = membrosDoGrupo
        .map((membro) => {
          const adminTag =
            membro.admin || (membro.nome === "Você" && conversa.admin)
              ? '<span class="member-admin-tag">Admin</span>'
              : "";
          const btnRemover =
            conversa.admin && membro.nome !== "Você"
              ? '<button class="btn btn-sm btn-danger btn-remover-usuario" data-usuario="' +
                membro.nome +
                '"><i class="fas fa-user-minus"></i></button>'
              : "";
          return `
                <li class="list-group-item member-item" data-member-name="${
                  membro.nome
                }" data-member-email="${membro.email || ""}">
                    <div class="member-avatar avatar" data-nome="${
                      membro.nome
                    }"></div>
                    <div class="member-info">
                        <div class="member-name-row"><h6 class="member-name">${
                          membro.nome
                        }</h6>${adminTag}</div>
                    </div>
                    ${btnRemover}
                </li>`;
        })
        .join("");

      const htmlGrupo = `
            <div class="modal-header modal-header-custom-group">
                <h4 class="modal-title">Membros (${listaUsuarios.length})</h4>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body modal-body-custom-group">
                <div class="search-members-container">
                    <i class="fas fa-search search-members-icon"></i>
                    <input type="text" class="form-control search-members-input" placeholder="Procurar membros">
                </div>
                <ul class="list-group list-group-members">${membrosHtml}</ul>
                <div class="group-admin-actions">
                    ${
                      conversa.admin
                        ? '<button class="btn btn-primary btn-sm btn-adicionar-usuario"><i class="fas fa-user-plus me-2"></i> Adicionar</button>'
                        : ""
                    }
                    ${
                      conversa.admin
                        ? '<button class="btn btn-outline-secondary btn-sm btn-editar-grupo"><i class="fas fa-edit me-2"></i> Editar Grupo</button>'
                        : ""
                    }
                </div>
            </div>`;

      modalContent.html(htmlGrupo);
    }

    // 3. Exibe o modal e gera os avatares
    modalInfo.modal("show");
    gerarAvatares();
  }

  // Handler para o botão "Editar Grupo" no modal de membros (opcional)
  $(document).on("click", ".btn-editar-grupo", function () {
    alert(
      "Funcionalidade de Editar Grupo (nome/descrição) seria implementada aqui, talvez em outro modal!"
    );
    // Aqui você pode abrir um novo modal com os campos para editar o nome e a descrição do grupo,
    // usando o mesmo padrão que tínhamos anteriormente.
  });

  // Handler para adicionar membro (exemplo simples com prompt)
  $(document).on("click", ".btn-adicionar-usuario", function () {
    const novoUsuarioNome = prompt(
      "Digite o nome do novo membro a adicionar ao grupo:"
    );
    if (novoUsuarioNome && novoUsuarioNome.trim() !== "") {
      const conversa = conversasDB.find((c) => c.id === conversaAtivaId);
      if (conversa && conversa.tipo === "grupos") {
        if (!conversa.usuarios.includes(novoUsuarioNome.trim())) {
          conversa.usuarios.push(novoUsuarioNome.trim());
          mostrarModalInfo(); // Re-renderiza o modal
        } else {
          alert("Este membro já está no grupo.");
        }
      }
    }
  });

  // Handler para remover membro
  $(document).on("click", ".btn-remover-usuario", function (e) {
    e.stopPropagation(); // Impede que o clique no botão ative o clique no item de membro
    const usuarioRemover = $(this).data("usuario");
    const conversa = conversasDB.find((c) => c.id === conversaAtivaId);
    if (conversa && conversa.tipo === "grupo") {
      conversa.usuarios = conversa.usuarios.filter((u) => u !== usuarioRemover);
      mostrarModalInfo(); // Re-renderiza o modal
    }
  });
  /**
   * Filtra a lista de conversas com base na busca e na aba ativa.
   */
  function filtrarConversas() {
    const termoBusca = $("#input-busca").val().toLowerCase();
    const tabAtiva = $(".tab-link.active").data("tab");

    $("#lista-conversas .conversa-item").each(function () {
      const item = $(this);
      const tipoItem = item.data("tipo");
      const nomeConversa = item.data("nome").toLowerCase();

      if (tipoItem !== tabAtiva) {
        item.hide();
        return;
      }

      if (termoBusca === "" || nomeConversa.includes(termoBusca)) {
        item.show();
      } else {
        item.hide();
      }
    });
  }

  // --- EVENT HANDLERS ---

  // Abrir conversa com clique normal
  $(document).on("click", ".conversa-item", function (e) {
    abrirConversa($(this));
  });

  // Abrir menu de contexto com clique direito
  $(document).on("contextmenu", ".conversa-item", function (e) {
    e.preventDefault();
    $("#menu-contexto-conversa").hide();
    mostrarMenuContexto($(this), e.pageX, e.pageY);
  });

  // Abrir menu de contexto com toque longo
  $(document)
    .on("mousedown touchstart", ".conversa-item", function (e) {
      const conversaItem = $(this);
      pressTimer = window.setTimeout(function () {
        const x =
          e.pageX ||
          (e.originalEvent.touches && e.originalEvent.touches[0].pageX);
        const y =
          e.pageY ||
          (e.originalEvent.touches && e.originalEvent.touches[0].pageY);
        if (x && y) mostrarMenuContexto(conversaItem, x, y);
      }, 500);
    })
    .on("mouseup touchend mouseleave", ".conversa-item", function () {
      clearTimeout(pressTimer);
    });

  // Ações do menu de contexto
  $(document).on("click", ".acao-contexto-fixar", function (e) {
    e.preventDefault();
    const conversaId = $(this).data("id");
    const conversa = conversasDB.find((c) => c.id === conversaId);
    if (conversa) {
      conversa.fixado = !conversa.fixado;
      renderizarListaConversas();
    }
    $("#menu-contexto-conversa").hide();
  });

  $(document).on(
    "click",
    ".acao-contexto-excluir, .acao-contexto-excluir-admin",
    function (e) {
      e.preventDefault();
      const conversaId = $(this).data("id");
      conversasDB = conversasDB.filter((c) => c.id !== conversaId);
      renderizarListaConversas();
      $("#menu-contexto-conversa").hide();
    }
  );

  // Esconder menu de contexto com clique geral
  $(document).on("click", function (e) {
    if (!$(e.target).closest(".conversa-item").length) {
      $("#menu-contexto-conversa").hide();
    }
  });

  // Demais handlers
  $(document).on("click", ".botao-voltar", function () {
    $("#chat-container, #chatbox-corpo").removeClass("conversa-ativa"),
      $(".conversa-item").removeClass("active");
  });
  $(document).on("click", ".tab-link", function () {
    $(".tab-link").removeClass("active"),
      $(this).addClass("active"),
      $("#input-busca").val(""),
      filtrarConversas(),
      $("#botao-nova-conversa").toggleClass(
        "d-none",
        "grupos" !== $(this).data("tab")
      );
  });
  $(document).on("click", "#icone-busca", function () {
    $("#titulo-cabecalho, .avatar[data-nome='Usuário']").toggleClass("d-none"),
      $("#input-busca").toggleClass("d-none").focus(),
      $("#input-busca").hasClass("d-none") &&
        ($("#input-busca").val(""), filtrarConversas());
  });
  $(document).on("keyup", "#input-busca", filtrarConversas);
  $(document).on("click", "#botao-enviar", enviarMensagem);
  $(document).on("keypress", "#input-mensagem", (e) => {
    13 === e.which && (e.preventDefault(), enviarMensagem());
  });
  $(document).on("click", "#botao-nova-conversa", () =>
    modalNovoGrupo.modal("show")
  );
  $(document).on("click", ".acao-curtir", function (e) {
    e.preventDefault();
    const mensagem = $(this).closest(".mensagem");
    const linkCurtir = $(this).find("span"); // Seleciona o texto "Curtir"

    let curtidas = parseInt(mensagem.attr("data-curtidas")) || 0;
    const jaCurtido = mensagem.attr("data-curtido-pelo-usuario") === "true";

    if (jaCurtido) {
      // Se já curtiu, então DESCURTE
      curtidas--;
      mensagem.attr("data-curtido-pelo-usuario", "false");
      linkCurtir.text("Curtir");
    } else {
      curtidas++;
      mensagem.attr("data-curtido-pelo-usuario", "true");
      linkCurtir.text("Descurtir");
    }

    mensagem.attr("data-curtidas", curtidas);
    let badge = mensagem.find(".like-badge");
    if (curtidas > 0) {
      if (!badge.length) {
        badge = $('<div class="like-badge"></div>').appendTo(mensagem);
      }
      badge.html(`👍 ${curtidas}`);
    } else {
      badge.remove();
    }
  });
  $(document).on("click", ".acao-apagar-msg", function (e) {
    e.preventDefault();
    const s = $(this).closest(".mensagem");
    s.addClass("apagada").find("p").html("<em>Mensagem apagada</em>"),
      s.find(".menu-mensagem-wrapper, .like-badge").remove();
  });
  $("#btn-abrir-chatbox").on("click", () => alternarModo("chatbox"));
  $("#chatbox-cabecalho").on("click", (e) => {
    $(e.target).closest("button").length ||
      $("#chatbox").toggleClass("minimizado");
  });
  $("#chatbox-minimizar").on("click", () =>
    $("#chatbox").toggleClass("minimizado")
  );
  $("#chatbox-maximizar").on("click", () => alternarModo("maximizado"));

  // Handlers do Modal de Info
  $(document).on("click", ".cabecalho-conversa .avatar", mostrarModalInfo);
  $(document).on("click", ".btn-editar-campo", function () {
    const campo = $(this).data("campo");
    const container = $(this).closest(".campo-editavel");
    const displayEl = container.find('[data-id="' + campo + '-grupo-display"]');
    const valorAtual = displayEl.text();

    const inputHtml =
      campo === "nome"
        ? `<input type="text" class="form-control form-control-inline" value="${valorAtual}">`
        : `<textarea class="form-control form-control-inline">${valorAtual}</textarea>`;

    displayEl
      .parent()
      .html(
        `<div class="input-group input-group-sm">${inputHtml}<button class="btn btn-success btn-salvar-campo" data-campo="${campo}"><i class="fas fa-check"></i></button></div>`
      );
    $(this).hide();
  });
  $(document).on("click", ".btn-salvar-campo", function () {
    const campo = $(this).data("campo");
    const novoValor = $(this).siblings().first().val();
    const conversa = conversasDB.find((c) => c.id === conversaAtivaId);
    conversa[campo] = novoValor;
    renderizarListaConversas();
    $("#nome-contato-ativo").text(conversa.nome);
    mostrarModalInfo();
  });
  $(document).on("click", ".btn-remover-usuario", function () {
    const usuario = $(this).data("usuario");
    const conversa = conversasDB.find((c) => c.id === conversaAtivaId);
    conversa.usuarios = conversa.usuarios.filter((u) => u !== usuario);
    mostrarModalInfo();
  });
  $(document).on("click", ".btn-adicionar-usuario", function () {
    const novoUsuario = prompt("Digite o nome do novo participante:");
    if (novoUsuario && novoUsuario.trim() !== "") {
      const conversa = conversasDB.find((c) => c.id === conversaAtivaId);
      conversa.usuarios.push(novoUsuario.trim());
      mostrarModalInfo();
    }
  });

  // --- INICIALIZAÇÃO ---
  function iniciarApp() {
    $("#chat-container").append(
      $("#templates #painel-lista-conversas, #templates #painel-conversa")
    );
    renderizarListaConversas();
    $('.tab-link[data-tab="chats"]').trigger("click");
    alternarModo("maximizado");
  }

  iniciarApp();
});
