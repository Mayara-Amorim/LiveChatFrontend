import { fetchWithAuth } from "./apiService.js";

$(document).ready(function () {
  // --- VARIÁVEIS GLOBAIS ---
  const coresAvatar = [
    "#5c8970",
    "#e6960dff",
    "#0dc475ff",
    "#99D98C",
    "#76C893",
    "#52B788",
    "#40916C",
    "#2D6A4F",
    "#1B4332",
    "#cbe80eff",
  ];
  let modoAtual = "maximizado";
  let conversaAtivaId = null;
  const modalNovoGrupo = $("#modal-novo-grupo");
  const modalInfo = $("#modal-info");
  let pressTimer;
  let modoModalGrupo = "criar";
  let idGrupoEmEdicao = null;
  const MAX_MEMBROS_GRUPO = 100;
  let membrosSelecionados = [];
  const loader = $("#loader");

  // --- FUNÇÕES DE RENDERIZAÇÃO E LÓGICA ---

  async function loadInitialChatData() {
    showLoader();
    try {
      const conversations = await fetchWithAuth("/api/conversations");
      renderChatList(conversations);
      if (conversations && conversations.length > 0) {
        await loadMessagesForConversation(conversations.id);
      }
    } catch (error) {
      console.error("Falha ao carregar os dados do chat:", error);
      alert("Não foi possível carregar as suas conversas.");
    } finally {
      hideLoader();
    }
  }

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
        ? '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-pin-angle" viewBox="0 0 16 16"><path d="M9.828.722a.5.5 0 0 1 .354.146l4.95 4.95a.5.5 0 0 1 0 .707c-.48.48-1.072.588-1.503.588-.177 0-.335-.018-.46-.039l-3.134 3.134a6 6 0 0 1 .16 1.013c.046.702-.032 1.687-.72 2.375a.5.5 0 0 1-.707 0l-2.829-2.828-3.182 3.182c-.195.195-1.219.902-1.414.707s.512-1.22.707-1.414l3.182-3.182-2.828-2.829a.5.5 0 0 1 0-.707c.688-.688 1.673-.767 2.375-.72a6 6 0 0 1 1.013.16l3.134-3.133a3 3 0 0 1-.04-.461c0-.43.108-1.022.589-1.503a.5.5 0 0 1 .353-.146m.122 2.112v-.002zm0-.002v.002a.5.5 0 0 1-.122.51L6.293 6.878a.5.5 0 0 1-.511.12H5.78l-.014-.004a5 5 0 0 0-.288-.076 5 5 0 0 0-.765-.116c-.422-.028-.836.008-1.175.15l5.51 5.509c.141-.34.177-.753.149-1.175a5 5 0 0 0-.192-1.054l-.004-.013v-.001a.5.5 0 0 1 .12-.512l3.536-3.535a.5.5 0 0 1 .532-.115l.096.022c.087.017.208.034.344.034q.172.002.343-.04L9.927 2.028q-.042.172-.04.343a1.8 1.8 0 0 0 .062.46z"/></svg>'
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
        </div>`;
      container.append(conversaHtml);
    });
    gerarAvatares();
    filtrarConversas();
  }

  function mostrarMenuContexto(conversaItem, x, y) {
    const menu = $("#menu-contexto-conversa");
    const conversaId = conversaItem.data("id");
    const conversa = conversasDB.find((c) => c.id === conversaId);
    if (!conversa) return;
    menu.html("");
    const fixarTexto = conversa.fixado ? "Desafixar" : "Fixar";
    let menuHtml = `
        <a class="dropdown-item acao-contexto-fixar" href="#" data-id="${conversaId}">${fixarTexto}</a>
        <a class="dropdown-item acao-contexto-excluir" href="#" data-id="${conversaId}">Excluir</a>`;
    if (conversa.tipo === "grupos" && conversa.admin) {
      menuHtml += `<li><hr class="dropdown-divider"></li><li><a class="dropdown-item acao-contexto-excluir-admin" href="#" data-id="${conversaId}"><i class="fas fa-times-circle fa-fw me-2"></i>Excluir Grupo (Admin)</a></li>`;
    }
    menu.html(menuHtml);
    menu.css({ top: y + 2, left: x + 2, display: "block" });
  }

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

  function carregarMensagens(idConversa) {
    const areaFixadas = $("#area-mensagens-fixadas");
    const areaMensagens = $("#area-mensagens");
    areaFixadas.html("");
    areaMensagens.html("");
    const mensagensDaConversa = mensagensDB[idConversa] || [];
    mensagensDaConversa.forEach((msg) => {
      adicionarBalaoMensagem(msg.texto, msg.tipo, msg.id, msg.fixada);
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
          </div>`;
        areaFixadas.append(fixadaHtml);
      });
    scrollParaUltimaMensagem();
  }

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
            <li><a class="dropdown-item acao-curtir" href="#"><span>${textoCurtir}</span></a></li>
            <li><a class="dropdown-item acao-fixar-msg" href="#"</i>${
              isFixada ? "Desafixar" : "Fixar"
            }</a></li>
            <li><a class="dropdown-item acao-apagar-msg" href="#"></i>Apagar</a></li>
        </ul>
      </div>`;
    const fixadaClass = isFixada ? "mensagem-original-fixada" : "";
    const balaoHtml = `<div class="mensagem ${tipo} ${fixadaClass}" data-msg-id="${msgId}" data-curtidas="0" data-curtido-pelo-usuario="false">${menuHtml}<p>${textoFormatado}</p></div>`;
    $("#area-mensagens").append(balaoHtml);
  }

  function scrollParaUltimaMensagem() {
    const areaMensagens = $("#area-mensagens");
    areaMensagens.scrollTop(areaMensagens.prop("scrollHeight"));
  }

  function enviarMensagem() {
    const input = $("#input-mensagem");
    const texto = input.val().trim();
    if (texto !== "") {
      const novoId = Date.now();
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
      $("#btn-abrir-chatbox").fadeOut();
    }
  }

  function mostrarModalInfo() {
    if (!conversaAtivaId) return;
    const conversa = conversasDB.find((c) => c.id === conversaAtivaId);
    if (!conversa) return;

    const modalDialog = $("#modal-info .modal-dialog");
    const modalContent = $("#modal-info .modal-content");
    modalContent.html("");

    if (
      conversa &&
      typeof conversa.tipo === "string" &&
      conversa.tipo.trim() === "chats"
    ) {
      modalDialog.removeClass("modal-xl").addClass("modal-md");
      const htmlChat = `
        <div class="modal-header">
            <h5 class="modal-title">Informações do Contato</h5>
            <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
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
        </div>`;
      modalContent.html(htmlChat);
    } else if (
      conversa &&
      typeof conversa.tipo === "string" &&
      conversa.tipo.trim() === "grupos"
    ) {
      modalDialog.removeClass("modal-md").addClass("modal-xl");
      const listaUsuarios = conversa.usuarios || [];
      const dataFormatada = new Date(conversa.dataCriacao).toLocaleDateString(
        "pt-BR",
        { day: "2-digit", month: "long", year: "numeric" }
      );
      const adminTag =
        conversa.admin || (conversa.nome === "Você" && conversa.admin)
          ? '<span class="member-admin-tag">Admin</span>'
          : "";
      const textoPermissao = conversa.apenasAdminsEnviam
        ? "Apenas admins podem enviar mensagens"
        : "Todos os membros podem enviar mensagens";
      let participantesHtml = listaUsuarios
        .map((user) => {
          return `
            <li class="list-group-item member-item" data-member-name="${user}">
                <div class="member-avatar avatar" data-nome="${user}"></div>
                <div class="member-info">
                    <h6 class="member-name">${user}</h6>${adminTag}
                </div>
            </li>`;
        })
        .join("");
      const htmlGrupo = `
        <div class="modal-header">
            <h5 class="modal-title">${conversa.nome}</h5>
            <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
        </div>
        <div class="modal-body p-0">
            <div class="list-group list-group-flush">
                <div class="list-group-item info-bloco d-flex align-items-center">
                    <i class="fas fa-calendar-alt fa-fw mr-3"></i>
                    <div class="info-texto">
                        <p>Criado em</p>
                        <small>${dataFormatada}</small>
                    </div>
                </div>
                <div class="list-group-item info-bloco d-flex align-items-center">
                    <i class="fas fa-info-circle fa-fw mr-3"></i>
                    <div class="info-texto">
                        <p>Descrição</p>
                        <small>${conversa.descricao || "Sem descrição"}</small>
                    </div>
                </div>
                <div class="list-group-item info-bloco d-flex align-items-center">
                    <i class="fas fa-shield-alt fa-fw mr-3"></i>
                    <div class="info-texto">
                        <p>Permissões</p>
                        <small>${textoPermissao}</small>
                    </div>
                </div>
            </div>
            <div class="list-group-header">${listaUsuarios.length} Membros</div>
            <ul class="list-group list-group-flush list-group-members">${participantesHtml}</ul>
        </div>
        <div class="modal-footer" style="justify-content: flex-end">
              
                <div>
                <button type="button" class="btn btn-outline-danger btn-sm btn-sair-grupo"><i class="fas fa-sign-out-alt me-2"></i> Sair</button>
                    ${
                      conversa.admin
                        ? '<button type="button" class="btn btn-outline-success btn-sm btn-editar-grupo ml-1"><i class="fas fa-edit me-2"></i> Editar</button>'
                        : ""
                    }
                    <button type="button" class="btn btn-secondary btn-sm ml-1" data-dismiss="modal">Fechar</button>
                </div>
            </div>`;
      modalContent.html(htmlGrupo);
    }
    modalInfo.modal("show");
    gerarAvatares();
  }

  function filtrarConversas() {
    const inputBusca = $("#input-busca");
    let termoBusca = "";
    if (inputBusca.length > 0) {
      termoBusca = inputBusca.val().toLowerCase();
    }
    const tabAtiva = $(".tab-link.active").data("tab");
    $("#lista-conversas .conversa-item").each(function () {
      const item = $(this);
      const tipoItem = item.data("tipo");
      const nomeConversa = item.data("nome");
      if (typeof nomeConversa !== "string") {
        return;
      }
      if (tipoItem !== tabAtiva) {
        item.hide();
        return;
      }
      if (
        termoBusca === "" ||
        nomeConversa.toLowerCase().includes(termoBusca)
      ) {
        item.show();
      } else {
        item.hide();
      }
    });
  }

  function renderizarContatosNovoGrupo(termoBusca = "") {
    const listaContatosEl = $("#lista-contatos-novo-grupo");
    listaContatosEl.html("");
    const contatosFiltrados = contatosDisponiveis.filter((contato) =>
      contato.nome.toLowerCase().includes(termoBusca.toLowerCase())
    );
    contatosFiltrados.forEach((contato) => {
      const isSelecionado = membrosSelecionados.includes(contato.nome);
      const selecionadoClass = isSelecionado ? "selecionado" : "";
      const checkIcon = isSelecionado ? '<i class="fas fa-check"></i>' : "";
      const avatarHtml = contato.img
        ? `<div class="avatar" style="background-image: url('${contato.img}'); background-size: cover;"></div>`
        : `<div class="avatar" data-nome="${contato.nome}"></div>`;
      const contatoHtml = `
        <li class="list-group-item contato-item-novo-grupo ${selecionadoClass}" data-nome-contato="${
        contato.nome
      }">
            ${avatarHtml}
            <div class="info-contato">
                <h6>${contato.nome}</h6>
                <p style="margin-left: 15px;">${contato.email || ""}</p>
            </div>
            <div class="checkbox-custom">${checkIcon}</div>
        </li>`;
      listaContatosEl.append(contatoHtml);
    });
    gerarAvatares();
    atualizarContagemMembros();
  }

  function renderizarMembrosSelecionadosPreview() {
    const previewEl = $("#membros-selecionados-preview");
    previewEl.html("");
    if (membrosSelecionados.length === 0) {
      previewEl.html(
        '<span class="text-muted small p-2">Nenhum membro selecionado</span>'
      );
    } else {
      membrosSelecionados.forEach((nomeMembro) => {
        const contato = contatosDisponiveis.find((c) => c.nome === nomeMembro);
        const avatarHtml =
          contato && contato.img
            ? `<div class="avatar" style="background-image: url('${contato.img}'); background-size: cover;"></div>`
            : `<div class="avatar" data-nome="${nomeMembro}"></div>`;
        const chipHtml = `
                <div class="membro-selecionado-chip" data-nome-contato="${nomeMembro}">
                    ${avatarHtml}
                    <span class="nome-membro">${nomeMembro}</span>
                    <button type="button" class="btn-remover-chip"><i class="fas fa-times"></i></button>
                </div>`;
        previewEl.append(chipHtml);
      });
    }
    gerarAvatares();
  }

  function atualizarContagemMembros() {
    $("#contagem-selecionados").text(membrosSelecionados.length);
    const nomeGrupo = $("#input-nome-grupo").val().trim();
    if (nomeGrupo.length > 0 && membrosSelecionados.length > 0) {
      $("#btn-criar-grupo").prop("disabled", false);
    } else {
      $("#btn-criar-grupo").prop("disabled", true);
    }
  }

  function showLoader() {
    loader.classList.remove("hidden");
  }

  function hideLoader() {
    loader.classList.add("hidden");
  }

  // --- EVENT HANDLERS ---

  $(document).on("click", "#botao-nova-conversa", () => {
    modoModalGrupo = "criar";
    idGrupoEmEdicao = null;
    $("#modal-novo-grupo .modal-title").text("Criar novo grupo");
    $("#input-nome-grupo").val("");
    $("#input-descricao-grupo").val("");
    membrosSelecionados = [];
    $("#collapse-contatos").collapse("hide");
    renderizarContatosNovoGrupo();
    renderizarMembrosSelecionadosPreview();
    atualizarContagemMembros();
    $("#btn-criar-grupo").text("Criar Grupo");
    modalNovoGrupo.modal("show");
  });

  $(document).on("click", ".btn-editar-grupo", function () {
    modalInfo.modal("hide");
    modoModalGrupo = "editar";
    idGrupoEmEdicao = conversaAtivaId;
    const conversa = conversasDB.find((c) => c.id === idGrupoEmEdicao);
    if (conversa) {
      $("#modal-novo-grupo .modal-title").text("Editar Grupo");
      $("#input-nome-grupo").val(conversa.nome);
      $("#input-descricao-grupo").val(conversa.descricao);
      membrosSelecionados = conversa.usuarios.filter((u) => u !== "Você");
      $("#collapse-contatos").collapse("show");
      renderizarContatosNovoGrupo();
      renderizarMembrosSelecionadosPreview();
      atualizarContagemMembros();
      $("#btn-criar-grupo").text("Salvar");
      modalNovoGrupo.modal("show");
    }
  });

  $("#modal-novo-grupo").on("hidden.bs.modal", function () {
    modoModalGrupo = "criar";
    idGrupoEmEdicao = null;
    $("#modal-novo-grupo .modal-title").text("Criar novo grupo");
    $("#btn-criar-grupo").text("Criar Grupo");
    $("#collapse-contatos").collapse("hide");
  });

  $(document).on("keyup", "#input-nome-grupo", function () {
    atualizarContagemMembros();
  });

  $(document).on("click", ".contato-item-novo-grupo", function () {
    const nomeContato = $(this).data("nome-contato");
    const index = membrosSelecionados.indexOf(nomeContato);
    if (index === -1) {
      membrosSelecionados.push(nomeContato);
      $(this)
        .addClass("selecionado")
        .find(".checkbox-custom")
        .html('<i class="fas fa-check"></i>');
    } else {
      membrosSelecionados.splice(index, 1);
      $(this).removeClass("selecionado").find(".checkbox-custom").html("");
    }
    renderizarMembrosSelecionadosPreview();
    atualizarContagemMembros();
  });

  $(document).on("click", ".btn-remover-chip", function (e) {
    e.stopPropagation();
    const nomeContato = $(this)
      .closest(".membro-selecionado-chip")
      .data("nome-contato");
    const index = membrosSelecionados.indexOf(nomeContato);
    if (index !== -1) {
      membrosSelecionados.splice(index, 1);
      renderizarMembrosSelecionadosPreview();
      renderizarContatosNovoGrupo($("#busca-contatos-novo-grupo").val());
      atualizarContagemMembros();
    }
  });

  $(document).on("click", "#btn-criar-grupo", function () {
    const nomeGrupo = $("#input-nome-grupo").val().trim();
    const descricaoGrupo = $("#input-descricao-grupo").val().trim();

    if (
      nomeGrupo === "" ||
      (modoModalGrupo === "criar" && membrosSelecionados.length === 0)
    ) {
      alert(
        "É necessário definir um nome e selecionar pelo menos um membro para o grupo."
      );
      return;
    }

    if (modoModalGrupo === "editar") {
      const conversa = conversasDB.find((c) => c.id === idGrupoEmEdicao);
      if (conversa) {
        conversa.nome = nomeGrupo;
        conversa.descricao = descricaoGrupo;
        conversa.usuarios = [...membrosSelecionados, "Você"];
        alert(`Grupo "${nomeGrupo}" atualizado com sucesso!`);
      }
    } else {
      const novoGrupoId = `c${Date.now()}`;
      conversasDB.push({
        id: novoGrupoId,
        nome: nomeGrupo,
        descricao: descricaoGrupo,
        usuarios: [...membrosSelecionados, "Você"],
        ultimaMsg: "Grupo criado!",
        timestamp: "Agora",
        naoLido: 0,
        tipo: "grupos",
        fixado: false,
        admin: true,
        dataCriacao: new Date().toISOString().split("T")[0],
        apenasAdminsEnviam: false,
      });
      alert(`Grupo "${nomeGrupo}" criado com sucesso!`);
    }

    renderizarListaConversas();
    modalNovoGrupo.modal("hide");
  });

  $(document).on("click", ".conversa-item", function () {
    abrirConversa($(this));
  });

  $(document).on("contextmenu", ".conversa-item", function (e) {
    e.preventDefault();
    $("#menu-contexto-conversa").hide();
    mostrarMenuContexto($(this), e.pageX, e.pageY);
  });

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

  $(document).on("click", function (e) {
    if (!$(e.target).closest(".conversa-item").length) {
      $("#menu-contexto-conversa").hide();
    }
  });

  $(document).on("click", ".botao-voltar", function () {
    $("#chat-container, #chatbox-corpo").removeClass("conversa-ativa");
    $(".conversa-item").removeClass("active");
  });

  $(document).on("click", ".tab-link", function () {
    $(".tab-link").removeClass("active");
    $(this).addClass("active");
    $("#input-busca").val("");
    filtrarConversas();
    $("#botao-nova-conversa").toggleClass(
      "d-none",
      "grupos" !== $(this).data("tab")
    );
  });

  $(document).on("click", "#icone-busca", function () {
    $("#titulo-cabecalho, .avatar[data-nome='Professor 001']").toggleClass(
      "d-none"
    );
    $("#input-busca").toggleClass("d-none").focus();
    if ($("#input-busca").hasClass("d-none")) {
      $("#input-busca").val("");
      filtrarConversas();
    }
  });

  $(document).on("keyup", "#input-busca", filtrarConversas);
  $(document).on("click", "#botao-enviar", enviarMensagem);
  $(document).on("keypress", "#input-mensagem", (e) => {
    if (13 === e.which) {
      e.preventDefault();
      enviarMensagem();
    }
  });

  $(document).on("click", ".acao-curtir", function (e) {
    e.preventDefault();
    const mensagem = $(this).closest(".mensagem");
    const linkCurtir = $(this).find("span");
    let curtidas = parseInt(mensagem.attr("data-curtidas")) || 0;
    const jaCurtido = mensagem.attr("data-curtido-pelo-usuario") === "true";
    if (jaCurtido) {
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
    s.addClass("apagada").find("p").html("<em>Mensagem apagada</em>");
    s.find(".menu-mensagem-wrapper, .like-badge").remove();
  });

  $(document).on("click", ".acao-fixar-msg", function (e) {
    e.preventDefault();
    const msgId = $(this).closest(".mensagem").data("msg-id");
    const msg = mensagensDB[conversaAtivaId].find((m) => m.id === msgId);
    if (msg) {
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
      carregarMensagens(conversaIdDaMensagemFixada);
    }
  });

  $("#btn-abrir-chatbox").on("click", () => alternarModo("chatbox"));
  $("#chatbox-cabecalho").on("click", (e) => {
    if (!$(e.target).closest("button").length) {
      $("#chatbox").toggleClass("minimizado");
    }
  });
  $("#chatbox-minimizar").on("click", () =>
    $("#chatbox").toggleClass("minimizado")
  );
  $("#chatbox-maximizar").on("click", () => alternarModo("maximizado"));
  $(document).on("click", ".cabecalho-conversa .avatar", mostrarModalInfo);
  $(document).on("click", "#btn-minimizar-maximizado", function () {
    alternarModo("chatbox");
  });
  $(document).on("click", ".member-item", function () {
    const memberName = $(this).data("member-name");
    const memberEmail = $(this).data("member-email");
    modalInfo.modal("hide");
    let conversaComMembro = conversasDB.find(
      (c) => c.nome === memberName && c.tipo === "chats"
    );
    if (conversaComMembro) {
      const elementoConversa = $(
        `#lista-conversas .conversa-item[data-id="${conversaComMembro.id}"]`
      );
      if (elementoConversa.length) {
        abrirConversa(elementoConversa);
      }
    } else {
      const novoChatId = "c" + (conversasDB.length + 1);
      conversaComMembro = {
        id: novoChatId,
        nome: memberName,
        email: memberEmail,
        ultimaMsg: "",
        timestamp: "Agora",
        naoLido: 0,
        tipo: "chats",
        fixado: false,
        admin: false,
      };
      conversasDB.push(conversaComMembro);
      mensagensDB[novoChatId] = [];
      renderizarListaConversas();
      abrirConversa(
        $(`#lista-conversas .conversa-item[data-id="${novoChatId}"]`)
      );
    }
  });
  $(document).on("click", ".btn-adicionar-usuario", function () {
    const novoUsuarioNome = prompt(
      "Digite o nome do novo membro a adicionar ao grupo:"
    );
    if (novoUsuarioNome && novoUsuarioNome.trim() !== "") {
      const conversa = conversasDB.find((c) => c.id === conversaAtivaId);
      if (conversa && conversa.tipo === "grupos") {
        if (!conversa.usuarios.includes(novoUsuarioNome.trim())) {
          conversa.usuarios.push(novoUsuarioNome.trim());
          mostrarModalInfo();
        } else {
          alert("Este membro já está no grupo.");
        }
      }
    }
  });
  $(document).on("click", ".btn-remover-usuario", function (e) {
    e.stopPropagation();
    const usuarioRemover = $(this).data("usuario");
    const conversa = conversasDB.find((c) => c.id === conversaAtivaId);
    if (conversa && conversa.tipo === "grupos") {
      conversa.usuarios = conversa.usuarios.filter((u) => u !== usuarioRemover);
      mostrarModalInfo();
    }
  });

  $(document).on("click", ".btn-sair-grupo", function () {
    const conversa = conversasDB.find((c) => c.id === conversaAtivaId);
    if (conversa) {
      // Pede confirmação ao usuário
      const confirmacao = confirm(
        `Tem certeza que deseja sair do grupo "${conversa.nome}"?`
      );

      if (confirmacao) {
        // Remove o grupo da base de dados local
        conversasDB = conversasDB.filter((c) => c.id !== conversaAtivaId);

        // Fecha o modal de informações
        modalInfo.modal("hide");

        // Limpa o painel de conversa e volta para a lista
        $("#chat-container, #chatbox-corpo").removeClass("conversa-ativa");
        $("#nome-contato-ativo").text("Selecione uma conversa");
        $("#avatar-contato-ativo").data("nome", "");
        $("#area-mensagens, #area-mensagens-fixadas").html("");

        // Atualiza a lista de conversas na tela
        renderizarListaConversas();

        alert("Você saiu do grupo.");
      }
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
  loadInitialChatData();
});
