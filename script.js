// Sistema de Tarefas básico
// Objetivo: fornecer um CRUD simples (criar, listar, concluir, editar e apagar)
// usando apenas HTML, CSS e JavaScript puro, com persistência no localStorage.
(function () {
  // Referências aos elementos do HTML (formulário, campos e lista)
  const form = document.getElementById('task-form');
  const input = document.getElementById('task-input'); // título da tarefa
  const inputDesc = document.getElementById('task-desc'); // descrição da tarefa (opcional)
  const inputPriority = document.getElementById('task-priority'); // prioridade (baixa, media, alta)
  const inputDue = document.getElementById('task-due'); // data (opcional, formato yyyy-mm-dd)
  const list = document.getElementById('task-list');
  const counter = document.getElementById('task-counter');

  // Controles de filtro/ordenação e ações em massa
  const filterAllBtn = document.getElementById('filter-all');
  const filterActiveBtn = document.getElementById('filter-active');
  const filterDoneBtn = document.getElementById('filter-done');
  const sortSelect = document.getElementById('sort-select');
  const clearCompletedBtn = document.getElementById('clear-completed');
  const exportBtn = document.getElementById('export-btn');
  const importBtn = document.getElementById('import-btn');
  const importFile = document.getElementById('import-file');
  // calendário mensal
  const calTitle = document.getElementById('cal-title');
  const calGrid = document.getElementById('cal-grid');
  const calPrev = document.getElementById('cal-prev');
  const calNext = document.getElementById('cal-next');

  // Chave usada para salvar/ler as tarefas no armazenamento do navegador
  const STORAGE_KEY = 'task-app-basic:v2';

  // Salva o array de tarefas no localStorage (persistência simples)
  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    } catch (_) {
      // Caso o navegador esteja sem permissão (modo privativo), apenas ignore
    }
  }

  // Navegação do calendário: mês anterior e próximo
  calPrev?.addEventListener('click', () => {
    calMonth = new Date(calMonth.getFullYear(), calMonth.getMonth() - 1, 1);
    renderCalendar();
  });
  calNext?.addEventListener('click', () => {
    calMonth = new Date(calMonth.getFullYear(), calMonth.getMonth() + 1, 1);
    renderCalendar();
  });

  // Carrega tarefas salvas do localStorage. Se não existir nada, retorna array vazio
  function load() {
    try {
      // Tenta ler a versão nova (v2). Se não existir, tenta v1 para migrar
      const rawV2 = localStorage.getItem(STORAGE_KEY);
      if (rawV2) {
        return JSON.parse(rawV2);
      }
      const rawV1 = localStorage.getItem('task-app-basic:v1');
      if (rawV1) {
        const v1 = JSON.parse(rawV1);
        // Migração: adiciona prioridade média e due vazio por padrão
        const migrated = (Array.isArray(v1) ? v1 : []).map(t => ({
          text: t.text,
          desc: t.desc || '',
          done: !!t.done,
          priority: 'media',
          due: ''
        }));
        return migrated;
      }
      return [];
    } catch (_) {
      return [];
    }
  }

  // Estado em memória: começa carregando o que já havia sido salvo
  let tasks = load();

  // Estado de UI: filtro e ordenação
  let filterMode = 'todas'; // todas | ativas | concluidas
  let sortMode = 'padrao'; // padrao | data | prioridade
  // Estado do calendário: mês base (Date no dia 1)
  let calMonth = (() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); })();

  // Mapas de apoio para prioridade
  const priorityOrder = { 'alta': 0, 'media': 1, 'baixa': 2 };

  // Atualiza o contador (ex.: 2/5 tarefas)
  function updateCounter() {
    const total = tasks.length;
    const done = tasks.filter(t => t.done).length;
    const plural = total === 1 ? 'tarefa' : 'tarefas';
    counter.textContent = `${done}/${total} ${plural}`;
  }

  // Funções auxiliares de data
  function isOverdue(dueStr, done) {
    if (!dueStr || done) return false;
    // dueStr esperado: yyyy-mm-dd
    const today = new Date();
    today.setHours(0,0,0,0);
    const parts = dueStr.split('-');
    if (parts.length !== 3) return false;
    const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    d.setHours(0,0,0,0);
    return d.getTime() < today.getTime();
  }

  function formatDue(dueStr) {
    // Formata yyyy-mm-dd -> dd/mm/aaaa para ficar igual ao placeholder
    if (!dueStr) return '';
    const [y, m, d] = dueStr.split('-');
    if (!y || !m || !d) return dueStr;
    return `${d.padStart(2,'0')}/${m.padStart(2,'0')}/${y}`;
  }

  // ==== Calendário ====
  function ymd(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  function monthLabel(date) {
    const meses = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
    return `${meses[date.getMonth()]} ${date.getFullYear()}`;
  }

  function renderCalendar() {
    if (!calTitle || !calGrid) return;
    calTitle.textContent = monthLabel(calMonth);
    calGrid.innerHTML = '';

    const year = calMonth.getFullYear();
    const month = calMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const startWeekday = firstDay.getDay(); // 0=Dom ... 6=Sáb
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // Preenche células vazias antes do dia 1
    for (let i = 0; i < startWeekday; i++) {
      const empty = document.createElement('div');
      empty.className = 'cal-cell';
      calGrid.appendChild(empty);
    }

    // Dias do mês
    for (let day = 1; day <= daysInMonth; day++) {
      const cell = document.createElement('div');
      cell.className = 'cal-cell';
      const dayEl = document.createElement('div');
      dayEl.className = 'day';
      dayEl.textContent = String(day);
      const items = document.createElement('div');
      items.className = 'items';

      // Data no formato yyyy-mm-dd
      const thisDate = ymd(new Date(year, month, day));
      // Seleciona tarefas da data
      const dayTasks = tasks.filter(t => (t.due || '') === thisDate);
      dayTasks.forEach(t => {
        const it = document.createElement('div');
        const overdue = isOverdue(t.due, t.done);
        it.className = 'cal-item ' + (t.done ? 'done' : overdue ? 'overdue' : 'active');
        it.textContent = t.text;
        items.appendChild(it);
      });

      cell.appendChild(dayEl);
      cell.appendChild(items);
      calGrid.appendChild(cell);
    }
  }

  // Recria a lista de tarefas na tela sempre que algo muda
  function render() {
    // Limpa a lista antes de desenhar novamente
    list.innerHTML = '';

    // Aplica filtro
    let view = tasks.map((t, i) => ({ ...t, _idx: i }));
    if (filterMode === 'ativas') view = view.filter(t => !t.done);
    if (filterMode === 'concluidas') view = view.filter(t => t.done);

    // Aplica ordenação
    if (sortMode === 'data') {
      view.sort((a, b) => {
        const av = a.due || '9999-12-31';
        const bv = b.due || '9999-12-31';
        return av.localeCompare(bv);
      });
    } else if (sortMode === 'prioridade') {
      view.sort((a, b) => priorityOrder[a.priority || 'media'] - priorityOrder[b.priority || 'media']);
    }

    // Para cada tarefa filtrada e ordenada, criamos um <li>
    view.forEach((task, indexOnView) => {
      const realIndex = task._idx; // índice real no array tasks
      // Container da linha da tarefa
      const li = document.createElement('li');
      li.className = 'task-item';
      if (isOverdue(task.due, task.done)) li.classList.add('overdue');

      // Label agrupa o checkbox com o texto
      const label = document.createElement('label');

      // Checkbox para marcar como concluída
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = task.done;
      checkbox.addEventListener('change', () => {
        // Alterna o estado concluído e salva
        tasks[realIndex].done = !tasks[realIndex].done;
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

      // Badge de prioridade
      const pri = document.createElement('span');
      pri.className = 'priority-badge ' + (task.priority === 'alta' ? 'p-alta' : task.priority === 'baixa' ? 'p-baixa' : 'p-media');
      pri.textContent = 'Prioridade: ' + (task.priority || 'media');

      // Data de vencimento
      if (task.due) {
        const dueEl = document.createElement('small');
        dueEl.className = 'due-text';
        dueEl.textContent = 'Vencimento: ' + formatDue(task.due);
        textBlock.appendChild(dueEl);
      }

      // Junta checkbox + bloco de texto
      label.appendChild(checkbox);
      label.appendChild(textBlock);
      label.appendChild(pri);

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

        // Edição de prioridade
        const selectPri = document.createElement('select');
        selectPri.className = 'task-edit-input';
        selectPri.innerHTML = `
          <option value="alta">Prioridade: Alta</option>
          <option value="media">Prioridade: Média</option>
          <option value="baixa">Prioridade: Baixa</option>
        `;
        selectPri.value = task.priority || 'media';

        // Edição de data
        const inputDueEdit = document.createElement('input');
        inputDueEdit.type = 'date';
        inputDueEdit.className = 'task-edit-input';
        inputDueEdit.value = task.due || '';

        // Cria um contêiner para edição no lugar do bloco de texto
        const editBlock = document.createElement('div');
        editBlock.className = 'text-block';
        editBlock.appendChild(inputTitle);
        editBlock.appendChild(inputDescEdit);
        editBlock.appendChild(selectPri);
        editBlock.appendChild(inputDueEdit);

        // Substitui o bloco atual pelo de edição
        textBlock.replaceWith(editBlock);
        inputTitle.focus();
        inputTitle.select();

        // Função para finalizar a edição
        const finish = (commit) => {
          if (commit) {
            const newTitle = inputTitle.value.trim();
            const newDesc = inputDescEdit.value.trim();
            const newPri = selectPri.value;
            const newDue = inputDueEdit.value;
            // Só atualiza se houver título
            if (newTitle) {
              tasks[realIndex].text = newTitle;
              tasks[realIndex].desc = newDesc;
              tasks[realIndex].priority = newPri;
              tasks[realIndex].due = newDue;
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
        // Confirma somente quando o foco sair de TODOS os campos da edição
        const blurCheck = () => {
          setTimeout(() => {
            const a = document.activeElement;
            const stillIn = (a === inputTitle || a === inputDescEdit || a === selectPri || a === inputDueEdit);
            if (!stillIn) finish(true);
          }, 0);
        };
        [inputTitle, inputDescEdit, selectPri, inputDueEdit].forEach(el => el.addEventListener('blur', blurCheck));
      });

      // Botão Excluir (remove a tarefa da lista)
      const delBtn = document.createElement('button');
      delBtn.className = 'delete-btn';
      delBtn.type = 'button';
      delBtn.textContent = 'Excluir';
      delBtn.addEventListener('click', () => {
        const ok = confirm('Deseja realmente excluir esta tarefa?');
        if (!ok) return;
        tasks.splice(realIndex, 1);
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
    renderCalendar();
  }

  // Captura o envio do formulário para criar uma nova tarefa
  form.addEventListener('submit', (e) => {
    e.preventDefault();

    // Pega os valores digitados nos campos
    const text = input.value.trim(); // título é obrigatório
    const desc = (inputDesc?.value || '').trim(); // descrição é opcional
    const priority = (inputPriority?.value || 'media');
    const due = (inputDue?.value || '').trim();
    if (!text) return; // se não há título, não cria

    // Adiciona nova tarefa ao array em memória
    tasks.push({ text, desc, done: false, priority, due });

    // Persiste e limpa os campos do formulário
    save();
    input.value = '';
    if (inputDesc) inputDesc.value = '';
    if (inputPriority) inputPriority.value = 'media';
    if (inputDue) inputDue.value = '';
    input.focus();

    // Redesenha a lista com a nova tarefa
    render(); // re-render também atualiza o calendário
  });

  // Filtros: define estado e re-renderiza
  function setFilter(mode) {
    filterMode = mode; // 'todas' | 'ativas' | 'concluidas'
    // atualiza estado visual dos botões
    [filterAllBtn, filterActiveBtn, filterDoneBtn].forEach(btn => btn.classList.remove('active'));
    if (mode === 'todas') filterAllBtn.classList.add('active');
    if (mode === 'ativas') filterActiveBtn.classList.add('active');
    if (mode === 'concluidas') filterDoneBtn.classList.add('active');
    render();
  }

  filterAllBtn?.addEventListener('click', () => setFilter('todas'));
  filterActiveBtn?.addEventListener('click', () => setFilter('ativas'));
  filterDoneBtn?.addEventListener('click', () => setFilter('concluidas'));

  // Ordenação
  sortSelect?.addEventListener('change', () => {
    sortMode = sortSelect.value; // 'padrao' | 'data' | 'prioridade'
    render();
  });

  // Limpar concluídas
  clearCompletedBtn?.addEventListener('click', () => {
    const ok = confirm('Remover todas as tarefas concluídas?');
    if (!ok) return;
    tasks = tasks.filter(t => !t.done);
    save();
    render();
  });

  // Exportar JSON
  exportBtn?.addEventListener('click', () => {
    const dataStr = JSON.stringify(tasks, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tarefas.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  });

  // Importar JSON
  importBtn?.addEventListener('click', () => importFile?.click());
  importFile?.addEventListener('change', async () => {
    const file = importFile.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const arr = JSON.parse(text);
      if (!Array.isArray(arr)) throw new Error('Formato inválido');
      // Valida elementos mínimos e normaliza
      const normalized = arr.map(item => ({
        text: String(item.text || '').trim(),
        desc: String(item.desc || '').trim(),
        done: !!item.done,
        priority: (['alta','media','baixa'].includes(item.priority) ? item.priority : 'media'),
        due: String(item.due || '').trim(),
      })).filter(t => t.text);
      const ok = confirm('Importar irá substituir as tarefas atuais. Continuar?');
      if (!ok) return;
      tasks = normalized;
      save();
      render(); // re-render também atualiza o calendário
    } catch (err) {
      alert('Falha ao importar: ' + (err?.message || err));
    } finally {
      importFile.value = '';
    }
  });

  // Render inicial ao carregar a página
  render();
})();
