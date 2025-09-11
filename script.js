// Sistema de Tarefas básico
// Objetivo: fornecer um CRUD simples (criar, listar, concluir, editar e apagar)
// usando apenas HTML, CSS e JavaScript puro, com persistência no localStorage.
(function () {
  // Referências aos elementos do HTML (formulário, campos e lista)
  const form = document.getElementById('task-form');
  const input = document.getElementById('task-input'); // título da tarefa
  const inputDesc = document.getElementById('task-desc'); // descrição da tarefa (opcional)
  const list = document.getElementById('task-list');
  const counter = document.getElementById('task-counter');

  // Chave usada para salvar/ler as tarefas no armazenamento do navegador
  const STORAGE_KEY = 'task-app-basic:v1';

  // Salva o array de tarefas no localStorage (persistência simples)
  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    } catch (_) {
      // Caso o navegador esteja sem permissão (modo privativo), apenas ignore
    }
  }

  // Carrega tarefas salvas do localStorage. Se não existir nada, retorna array vazio
  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (_) {
      return [];
    }
  }

  // Estado em memória: começa carregando o que já havia sido salvo
  let tasks = load();

  // Atualiza o contador (ex.: 2/5 tarefas)
  function updateCounter() {
    const total = tasks.length;
    const done = tasks.filter(t => t.done).length;
    const plural = total === 1 ? 'tarefa' : 'tarefas';
    counter.textContent = `${done}/${total} ${plural}`;
  }

  // Recria a lista de tarefas na tela sempre que algo muda
  function render() {
    // Limpa a lista antes de desenhar novamente
    list.innerHTML = '';

    // Para cada tarefa, criamos um <li> com: checkbox, título, descrição, Editar e Excluir
    tasks.forEach((task, index) => {
      // Container da linha da tarefa
      const li = document.createElement('li');
      li.className = 'task-item';

      // Label agrupa o checkbox com o texto
      const label = document.createElement('label');

      // Checkbox para marcar como concluída
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = task.done;
      checkbox.addEventListener('change', () => {
        // Alterna o estado concluído e salva
        tasks[index].done = !tasks[index].done;
        save();
        render();
      });

      // Título (texto principal da tarefa)
      const span = document.createElement('span');
      span.className = 'task-text' + (task.done ? ' done' : '');
      span.textContent = task.text;

      // Descrição (texto secundário, opcional)
      const desc = document.createElement('small');
      desc.className = 'desc-text';
      desc.textContent = task.desc || '';

      // Monta o bloco de texto (título + descrição) numa coluna
      const textBlock = document.createElement('div');
      textBlock.className = 'text-block';
      textBlock.appendChild(span);
      if (task.desc) textBlock.appendChild(desc);

      // Junta checkbox + bloco de texto
      label.appendChild(checkbox);
      label.appendChild(textBlock);

      // Botão Editar (troca título e descrição por campos de edição simples)
      const editBtn = document.createElement('button');
      editBtn.className = 'edit-btn';
      editBtn.type = 'button';
      editBtn.textContent = 'Editar';
      editBtn.addEventListener('click', () => {
        // Inputs de edição para título e descrição
        const inputTitle = document.createElement('input');
        inputTitle.type = 'text';
        inputTitle.value = task.text;
        inputTitle.className = 'task-edit-input';

        const inputDescEdit = document.createElement('input');
        inputDescEdit.type = 'text';
        inputDescEdit.value = task.desc || '';
        inputDescEdit.className = 'task-edit-input';
        inputDescEdit.placeholder = 'Descrição (opcional)';

        // Cria um contêiner para edição no lugar do bloco de texto
        const editBlock = document.createElement('div');
        editBlock.className = 'text-block';
        editBlock.appendChild(inputTitle);
        editBlock.appendChild(inputDescEdit);

        // Substitui o bloco atual pelo de edição
        textBlock.replaceWith(editBlock);
        inputTitle.focus();
        inputTitle.select();

        // Função para finalizar a edição
        const finish = (commit) => {
          if (commit) {
            const newTitle = inputTitle.value.trim();
            const newDesc = inputDescEdit.value.trim();
            // Só atualiza se houver título
            if (newTitle) {
              tasks[index].text = newTitle;
              tasks[index].desc = newDesc;
              save();
            }
          }
          render();
        };

        // Atalhos de teclado: Enter confirma, Esc cancela
        editBlock.addEventListener('keydown', (ev) => {
          if (ev.key === 'Enter') finish(true);
          if (ev.key === 'Escape') finish(false);
        });
        // Se o usuário sair do foco de ambos os campos, confirma
        inputDescEdit.addEventListener('blur', () => finish(true));
        inputTitle.addEventListener('blur', () => {
          // pequeno atraso para permitir foco no segundo campo sem confirmar prematuramente
          setTimeout(() => {
            if (document.activeElement !== inputTitle && document.activeElement !== inputDescEdit) {
              finish(true);
            }
          }, 0);
        });
      });

      // Botão Excluir (remove a tarefa da lista)
      const delBtn = document.createElement('button');
      delBtn.className = 'delete-btn';
      delBtn.type = 'button';
      delBtn.textContent = 'Excluir';
      delBtn.addEventListener('click', () => {
        tasks.splice(index, 1);
        save();
        render();
      });

      // Monta a linha final e adiciona na lista
      li.appendChild(label);
      li.appendChild(editBtn);
      li.appendChild(delBtn);
      list.appendChild(li);
    });

    // Atualiza o texto do contador após redesenhar
    updateCounter();
  }

  // Captura o envio do formulário para criar uma nova tarefa
  form.addEventListener('submit', (e) => {
    e.preventDefault();

    // Pega os valores digitados nos campos
    const text = input.value.trim(); // título é obrigatório
    const desc = (inputDesc?.value || '').trim(); // descrição é opcional
    if (!text) return; // se não há título, não cria

    // Adiciona nova tarefa ao array em memória
    tasks.push({ text, desc, done: false });

    // Persiste e limpa os campos do formulário
    save();
    input.value = '';
    if (inputDesc) inputDesc.value = '';
    input.focus();

    // Redesenha a lista com a nova tarefa
    render();
  });

  // Render inicial ao carregar a página
  render();
})();
