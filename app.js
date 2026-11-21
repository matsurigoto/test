// ===== 我的待辦清單 =====
// 純前端實作,不使用任何框架或套件。資料存在瀏覽器的 localStorage。

const STORAGE_KEY = 'workshop-todos';
const THEME_STORAGE_KEY = 'workshop-theme';

// 取得畫面上會用到的元素
const form = document.getElementById('todo-form');
const input = document.getElementById('todo-input');
const list = document.getElementById('todo-list');
const emptyState = document.getElementById('empty-state');
const remainingCount = document.getElementById('remaining-count');
const filterBar = document.getElementById('filters');
const filterButtons = filterBar.querySelectorAll('.filter-btn');
const themeButton = document.getElementById('theme-toggle');
const systemDarkQuery = window.matchMedia('(prefers-color-scheme: dark)');

// 所有待辦事項都放在這個陣列裡
// 每一筆的格式:{ id: '169...', text: '買牛奶', completed: false }
let todos = loadTodos();

// 目前的篩選條件:'all' 全部 / 'active' 未完成 / 'completed' 已完成(不存進 localStorage)
let currentFilter = 'all';

// 各篩選條件下清單為空時顯示的提示文字
const EMPTY_MESSAGES = {
  all: '還沒有任何待辦事項,新增一個吧!',
  active: '太棒了,目前沒有未完成的待辦事項!',
  completed: '還沒有已完成的待辦事項。',
};

// 使用者手動選過的主題;沒選過就是 null,會跟隨作業系統設定
let savedTheme = loadSavedTheme();

// ---------- 資料存取 ----------

/** 從 localStorage 讀回待辦清單,讀不到或格式壞掉就回傳空陣列 */
function loadTodos() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    const parsed = saved ? JSON.parse(saved) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn('讀取待辦清單失敗,將以空清單開始。', error);
    return [];
  }
}

/** 把目前的待辦清單寫回 localStorage */
function saveTodos() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
}

/** 讀取使用者手動選擇的主題,只接受 'light' / 'dark',其餘視為沒選過 */
function loadSavedTheme() {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    return saved === 'light' || saved === 'dark' ? saved : null;
  } catch (error) {
    return null;
  }
}

/** 儲存使用者手動選擇的主題 */
function saveTheme() {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, savedTheme);
  } catch (error) {
    console.warn('儲存主題設定失敗。', error);
  }
}

// ---------- 主題 ----------

/** 目前生效的主題:有手動選擇就用手動的,否則跟隨作業系統的深淺色設定 */
function getEffectiveTheme() {
  if (savedTheme) return savedTheme;
  return systemDarkQuery.matches ? 'dark' : 'light';
}

/** 把生效的主題套用到頁面上,並更新按鈕文字 */
function applyTheme() {
  const theme = getEffectiveTheme();
  document.documentElement.dataset.theme = theme;

  // 按鈕顯示的是「切換後」的主題
  themeButton.textContent = theme === 'dark' ? '☀️ 淺色模式' : '🌙 深色模式';
}

// ---------- 畫面繪製 ----------

/** 依照目前的篩選條件,回傳要顯示的待辦事項 */
function getVisibleTodos() {
  if (currentFilter === 'active') return todos.filter((todo) => !todo.completed);
  if (currentFilter === 'completed') return todos.filter((todo) => todo.completed);
  return todos;
}

/** 依照目前的 todos 陣列與篩選條件,重新畫出整份清單 */
function render() {
  const visibleTodos = getVisibleTodos();
  list.replaceChildren();

  visibleTodos.forEach((todo) => {
    const item = document.createElement('li');
    item.className = todo.completed ? 'todo-item completed' : 'todo-item';
    item.dataset.id = todo.id;

    // 完成勾選框
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = todo.completed;
    checkbox.setAttribute('aria-label', `標記「${todo.text}」為完成`);

    // 待辦文字
    const text = document.createElement('span');
    text.className = 'todo-text';
    text.textContent = todo.text;

    // 刪除按鈕
    const deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.className = 'btn-delete';
    deleteButton.textContent = '✕';
    deleteButton.setAttribute('aria-label', `刪除「${todo.text}」`);

    item.append(checkbox, text, deleteButton);
    list.append(item);
  });

  // 清單為空時顯示對應篩選條件的提示文字
  emptyState.hidden = visibleTodos.length > 0;
  emptyState.textContent = EMPTY_MESSAGES[currentFilter];

  // 篩選按鈕的選中樣式(同時更新 aria-pressed 給螢幕閱讀器)
  filterButtons.forEach((button) => {
    const active = button.dataset.filter === currentFilter;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });

  // 未完成數量永遠算全部待辦,不受篩選影響
  const remaining = todos.filter((todo) => !todo.completed).length;
  remainingCount.textContent = `未完成:${remaining} 項`;
}

// ---------- 操作行為 ----------

/** 產生一組不會重複的 id(時間戳 + 隨機碼) */
function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** 新增一筆待辦 */
function addTodo(text) {
  todos.push({
    id: createId(),
    text,
    completed: false,
  });
  saveTodos();
  render();
}

/** 切換某一筆待辦的完成狀態 */
function toggleTodo(id) {
  todos = todos.map((todo) =>
    todo.id === id ? { ...todo, completed: !todo.completed } : todo
  );
  saveTodos();
  render();
}

/** 刪除某一筆待辦 */
function deleteTodo(id) {
  todos = todos.filter((todo) => todo.id !== id);
  saveTodos();
  render();
}

// ---------- 事件綁定 ----------

// 送出表單 = 新增待辦
form.addEventListener('submit', (event) => {
  event.preventDefault();

  const text = input.value.trim();
  if (!text) return; // 空白內容不新增

  addTodo(text);
  input.value = '';
  input.focus();
});

// 用事件委派處理清單內的點擊(勾選完成 / 刪除)
list.addEventListener('click', (event) => {
  const item = event.target.closest('.todo-item');
  if (!item) return;

  const id = item.dataset.id;

  if (event.target.matches('input[type="checkbox"]')) {
    toggleTodo(id);
  } else if (event.target.matches('.btn-delete')) {
    deleteTodo(id);
  }
});

// 點選篩選按鈕 = 切換篩選條件
filterBar.addEventListener('click', (event) => {
  const button = event.target.closest('.filter-btn');
  if (!button) return;

  currentFilter = button.dataset.filter;
  render();
});

// 切換深色 / 淺色模式,並把選擇存起來
themeButton.addEventListener('click', () => {
  savedTheme = getEffectiveTheme() === 'dark' ? 'light' : 'dark';
  saveTheme();
  applyTheme();
});

// 使用者沒手動選過時,作業系統深淺色變更要即時跟著變
systemDarkQuery.addEventListener('change', () => {
  if (!savedTheme) applyTheme();
});

// 頁面載入時先套用主題,再畫一次清單
applyTheme();
render();
