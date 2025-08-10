// Quando todo o conteúdo da página estiver carregado
document.addEventListener('DOMContentLoaded', () => {
  initCep();       // ViaCEP → preenche endereço
  initProdutos();  // Itens de produto dinâmicos
  initAnexos();    // Anexos (memória + sessionStorage)
  initSalvar();    // JSON final
});

/* =========================
   CEP (ViaCEP)
   ========================= */
function initCep() {
  // Pega o input do CEP
  var cepInput = document.querySelector('#cep');
  if (!cepInput) return;

  // Quando sair do campo CEP
  cepInput.addEventListener('blur', function () {
    var cep = cepInput.value.replace(/\D/g, ''); // só números

    if (cep.length === 8) {
      // Chama a API do ViaCEP
      fetch('https://viacep.com.br/ws/' + cep + '/json/')
        .then(function (res) { return res.json(); })
        .then(function (dados) {
          if (!dados.erro) {
            // Preenche os campos
            var endereco = document.querySelector('#endereco');
            var bairro   = document.querySelector('#bairro');
            var cidade   = document.querySelector('#municipio');
            var estado   = document.querySelector('#estado');

            if (endereco) endereco.value = dados.logradouro || '';
            if (bairro)   bairro.value   = dados.bairro     || '';
            if (cidade)   cidade.value   = dados.localidade || '';
            if (estado)   estado.value   = dados.uf         || '';

          } else {
            alert('CEP não encontrado.');
          }
        })
        .catch(function () {
          alert('Erro ao buscar CEP.');
        });
    } else {
      alert('CEP inválido.');
    }
  });
}

/* =========================
   PRODUTOS
   ========================= */
function initProdutos() {
  var lista = document.querySelector('#lista-produtos'); // onde entram os cards
  var tpl   = document.querySelector('#tpl-produto');    // <template> do produto
  var btn   = document.querySelector('#btnAddProduto');  // botão "Adicionar Produto"
  var form  = document.querySelector('form');            // formulário principal

  if (!lista || !tpl || !btn || !form) return;

  // Renumera os títulos "Produto - X"
  function renumerar() {
    var indices = lista.querySelectorAll('.produto-item .idx');
    for (var i = 0; i < indices.length; i++) {
      indices[i].textContent = (i + 1);
    }
  }

  // Liga cálculo de total (qtde * unitário) para um item
  function bindCalculo(itemEl) {
    var qtdeEl  = itemEl.querySelector('input[name="qtde[]"]');
    var unitEl  = itemEl.querySelector('input[name="valorUnitario[]"]');
    var totalEl = itemEl.querySelector('input[name="valorTotal[]"]');

    function calc() {
      var q = parseFloat((qtdeEl && qtdeEl.value || '0').replace(',', '.')) || 0;
      var u = parseFloat((unitEl && unitEl.value || '0').replace(',', '.')) || 0;
      if (totalEl) totalEl.value = (q === 0 && u === 0) ? '' : (q * u).toFixed(2);
    }

    if (qtdeEl) qtdeEl.addEventListener('input', calc);
    if (unitEl) unitEl.addEventListener('input', calc);
  }

  // Adiciona um novo produto a partir do template
  function addProduto() {
    var frag   = tpl.content.cloneNode(true);          // clona o conteúdo do <template>
    var itemEl = frag.querySelector('.produto-item');  // raiz do item clonado

    // Botão lixeira
    var btnDel = frag.querySelector('.btn-delete');
    if (btnDel) {
      btnDel.addEventListener('click', function (e) {
        var root = e.currentTarget.closest('.produto-item');
        if (root) root.remove();
        renumerar();
      });
    }

    // Liga o cálculo de total
    if (itemEl) bindCalculo(itemEl);

    // Coloca no DOM e renumera
    lista.appendChild(frag);
    renumerar();
  }

  // Bloqueia submit se não houver produtos
  form.addEventListener('submit', function (e) {
    var temProdutos = lista.querySelectorAll('.produto-item').length > 0;
    if (!temProdutos) {
      e.preventDefault();
      alert('Inclua pelo menos 1 produto antes de salvar.');
    }
  });

  // Botão "Adicionar Produto"
  btn.addEventListener('click', addProduto);
}

/* =========================
   ANEXOS
   ========================= */
function initAnexos() {
  var lista     = document.querySelector('#lista-anexos'); // container visual
  var tpl       = document.querySelector('#tpl-anexo');    // <template> do anexo
  var btnAdd    = document.querySelector('#btnAddAnexo');  // botão "Incluir Anexo"
  var inputFile = document.querySelector('#fileAnexo');    // input file oculto
  var form      = document.querySelector('form');

  if (!lista || !tpl || !btnAdd || !inputFile || !form) return;

  // Armazenamento em memória (array simples)
  // Guarda objetos: { id, name, blob }
  var anexosMem = [];

  // Carrega anexos do sessionStorage 
  window.getAnexosMem = function () {
    return anexosMem.slice(); // cópia superficial
  };

  // Salvar no sessionStorage 
  function salvarSession() {
    var arrMeta = [];
    for (var i = 0; i < anexosMem.length; i++) {
      arrMeta.push({ id: anexosMem[i].id, name: anexosMem[i].name });
    }
    sessionStorage.setItem('anexos', JSON.stringify(arrMeta));
  }

  // Remove por id do array
  function removeById(id) {
    for (var i = 0; i < anexosMem.length; i++) {
      if (anexosMem[i].id === id) {
        anexosMem.splice(i, 1);
        break;
      }
    }
  }

  // Cria o item visual na lista e liga os botões
  function addItemVisual(id, fileName) {
    var frag = tpl.content.cloneNode(true);
    var el   = frag.querySelector('.anexo-item');
    var nome = frag.querySelector('.anexo-nome');
    var del  = frag.querySelector('.btn-delete');
    var eye  = frag.querySelector('.btn-visualizar');

    if (el)   el.dataset.id = id;
    if (nome) nome.textContent = fileName;

    // Excluir
    if (del) {
      del.addEventListener('click', function () {
        removeById(id);
        if (el) el.remove();
        // esconde a lista se ficou vazia
        var restam = lista.querySelectorAll('.anexo-item').length;
        if (restam === 0) lista.style.display = 'none';
        salvarSession();
      });
    }

    // Visualizar (download usando Blob em memória)
    if (eye) {
      eye.addEventListener('click', function () {
        // procura o anexo na memória
        var info = null;
        for (var i = 0; i < anexosMem.length; i++) {
          if (anexosMem[i].id === id) { info = anexosMem[i]; break; }
        }
        if (!info) { alert('Arquivo não disponível.'); return; }

        var url = URL.createObjectURL(info.blob);
        var a   = document.createElement('a');
        a.href = url;
        a.download = info.name || 'anexo';
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      });
    }

    // insere e mostra a lista
    lista.appendChild(frag);
    lista.style.display = 'block';
  }

  // Ao clicar em "Incluir Anexo", abre o seletor
  btnAdd.addEventListener('click', function () {
    inputFile.click();
  });

  // Quando um arquivo for escolhido
  inputFile.addEventListener('change', function (e) {
    var file = e.target.files && e.target.files[0];
    if (!file) return;

    var id = String(Date.now()); // id simples
    anexosMem.push({ id: id, name: file.name, blob: file }); // guarda o Blob real
    addItemVisual(id, file.name);
    salvarSession();

    inputFile.value = '';
  });

  // começa oculto
  lista.style.display = 'none';

}

/* =========================
   UTIL: Blob → Base64 (dataURL)
   ========================= */
function blobToBase64(blob) {
  return new Promise(function (resolve, reject) {
    var fr = new FileReader();
    fr.onload = function () { resolve(fr.result); };
    fr.onerror = reject;
    fr.readAsDataURL(blob); // gera "data:...;base64,xxxx"
  });
}

/* =========================
   MONTAR JSON 
   ========================= */
function montarJSON() {
  // get simples (sem optional chaining)
  function get(sel) {
    var el = document.querySelector(sel);
    return el ? el.value.trim() : '';
  }

  // Coleta dos campos do fornecedor
  var data = {
    razaoSocial:        get('#razaoSocial'),
    nomeFantasia:       get('#nomeFantasia'),
    cnpj:               get('#cnpj'),
    inscricaoEstadual:  get('#inscricaoEstadual'),
    inscricaoMunicipal: get('#inscricaoMunicipal'),
    nomeContato:        get('#nomeContato'),
    telefoneContato:    get('#telefone'),
    emailContato:       get('#email'),
    produtos: [],
    anexos: []
  };

  // Produtos 
  var itens = document.querySelectorAll('#lista-produtos .produto-item');
  for (var i = 0; i < itens.length; i++) {
    var item = itens[i];
    function val(sel) {
      var el = item.querySelector(sel);
      return el ? el.value.trim() : '';
    }
    data.produtos.push({
      indice:           i + 1,
      descricaoProduto: val('input[name="descricao[]"]'),
      unidadeMedida:    val('select[name="unidade[]"]'),
      qtdeEstoque:      val('input[name="qtde[]"]'),
      valorUnitario:    Number(val('input[name="valorUnitario[]"]') || 0).toFixed(2),
      valorTotal:       Number(val('input[name="valorTotal[]"]') || 0).toFixed(2)
    });
  }

  // Converte anexos em série 
  var mem = (typeof window.getAnexosMem === 'function') ? window.getAnexosMem() : [];

  return new Promise(function (resolve, reject) {
    var idx = 0;

    function proximo() {
      if (idx >= mem.length) {
        resolve(data);
        return;
      }
      var f = mem[idx++];
      blobToBase64(f.blob).then(function (base64) {
        data.anexos.push({
          indice: data.anexos.length + 1,
          nomeArquivo: f.name,
          blobArquivo: base64
        });
        proximo();
      }).catch(reject);
    }

    proximo();
  });
}

/* =========================
   SALVAR
   ========================= */
function initSalvar() {
  var form = document.querySelector('form');
  if (!form) return;

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    // Abre modal de loading 
    $('#loadingModal').modal('show');

    montarJSON()
      .then(function (payload) {
        // Mostra no console 
        console.log('JSON de envio:', payload);

        // Baixar JSON 
        var baixar = true;
        if (baixar) {
          var blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
          var url  = URL.createObjectURL(blob);
          var a = document.createElement('a');
          a.href = url;
          a.download = 'fornecedor.json';
          document.body.appendChild(a);
          a.click();
          a.remove();
          URL.revokeObjectURL(url);
        }


      })
      .catch(function (err) {
        alert('Erro ao montar/enviar os dados.');
        console.error(err);
      })
      .then(function () {
        // Fecha o modal sempre (sucesso ou erro)
        $('#loadingModal').modal('hide');
      });
  });
}
