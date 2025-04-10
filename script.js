const input = document.getElementById('input');
const addBtn = document.getElementById('add-tasks');
const list = document.getElementById('todo-list');
const toggleMode = document.getElementById('toggle-mode');
const addTaskButton = document.getElementById('add-task-button');
const inputContainer = document.querySelector('.input-container');
const clearAllButton = document.getElementById('clear-all');

const STORAGE_KEY = 'todo-tasks';
const THEME_KEY = 'dark-mode';

const statusClasses = {
    doing: 'status-doing',
    later: 'status-later',
    done: 'status-done',
    cancelled: 'status-cancelled'
};

const statusLabels = {
    doing: 'đang làm',
    later: 'để sau',
    done: 'hoàn thành',
    cancelled: 'đã hủy'
};

// Load saved tasks and theme
document.addEventListener('DOMContentLoaded', () => {
    loadTasks();
    loadTheme();
});

function loadTasks() {
    const savedTasks = localStorage.getItem(STORAGE_KEY);
    if (savedTasks) {
        const tasks = JSON.parse(savedTasks);
        tasks.forEach(task => addTask(task.text, task.status));
    }
}

function saveTasks() {
    const tasks = Array.from(list.children).map(li => ({
        text: li.querySelector('.task-content span').textContent,
        status: li.dataset.status
    }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

function loadTheme() {
    const isDark = localStorage.getItem(THEME_KEY) === 'true';
    if (isDark) {
        document.body.classList.add('dark');
        toggleMode.textContent = '☀️';
    }
}

addTaskButton.onclick = () => {
    inputContainer.classList.toggle('show');
    if (inputContainer.classList.contains('show')) {
        input.focus();
    }
};

function handleAddTasks() {
    const tasks = input.value.trim().split('\n').filter(Boolean);
    tasks.forEach(text => addTask(text));
    input.value = '';
    inputContainer.classList.remove('show');
}

addBtn.onclick = handleAddTasks;

input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleAddTasks();
    }
});

function createStatusMenu() {
    const menu = document.createElement('div');
    menu.className = 'status-menu';

    // Add status options
    Object.entries(statusLabels).forEach(([status, label]) => {
        const option = document.createElement('div');
        option.className = 'status-option';
        option.dataset.status = status;

        const dot = document.createElement('div');
        dot.className = `status-dot ${statusClasses[status]}`;

        const text = document.createElement('span');
        text.textContent = label;

        option.appendChild(dot);
        option.appendChild(text);
        menu.appendChild(option);
    });

    // Add delete option
    const deleteOption = document.createElement('div');
    deleteOption.className = 'status-option';
    deleteOption.dataset.action = 'delete';
    deleteOption.style.color = 'var(--cancelled)';
    deleteOption.textContent = 'xóa';
    menu.appendChild(deleteOption);

    return menu;
}

function addTask(text, status = 'doing') {
    const li = document.createElement('li');
    li.dataset.status = status;

    const dot = document.createElement('div');
    dot.className = `status-dot ${statusClasses[status]}`;

    const span = document.createElement('span');
    span.textContent = text.toLowerCase();

    const taskContent = document.createElement('div');
    taskContent.className = 'task-content';
    taskContent.appendChild(dot);
    taskContent.appendChild(span);

    const statusButton = document.createElement('button');
    statusButton.className = 'status-button';
    statusButton.textContent = statusLabels[status];

    const menu = createStatusMenu();
    document.body.appendChild(menu);

    statusButton.onclick = (e) => {
        e.stopPropagation();
        // Close all other menus first
        document.querySelectorAll('.status-menu.show').forEach(m => {
            if (m !== menu) m.classList.remove('show');
        });
        const rect = statusButton.getBoundingClientRect();
        menu.style.top = `${rect.bottom + 5}px`;
        menu.style.left = `${rect.left}px`;
        menu.classList.toggle('show');
    };

    menu.onclick = (e) => {
        const option = e.target.closest('.status-option');
        if (option) {
            if (option.dataset.action === 'delete') {
                li.remove();
                menu.remove();
            } else {
                const newStatus = option.dataset.status;
                li.dataset.status = newStatus;
                dot.className = `status-dot ${statusClasses[newStatus]}`;
                statusButton.textContent = statusLabels[newStatus];
            }
            menu.classList.remove('show');
            reorderTasks();
            saveTasks();
        }
    };

    document.addEventListener('click', (e) => {
        if (!menu.contains(e.target) && e.target !== statusButton) {
            menu.classList.remove('show');
        }
    });

    const actions = document.createElement('div');
    actions.className = 'actions';
    actions.appendChild(statusButton);

    li.appendChild(taskContent);
    li.appendChild(actions);

    list.appendChild(li);
    reorderTasks();
    saveTasks();
}

function reorderTasks() {
    const items = Array.from(list.children);
    items.sort((a, b) => {
        const order = ['doing', 'later', 'done', 'cancelled'];
        return order.indexOf(a.dataset.status) - order.indexOf(b.dataset.status);
    });
    items.forEach(item => list.appendChild(item));
}

clearAllButton.onclick = () => {
    if (confirm('bạn có chắc chắn muốn xóa tất cả công việc?')) {
        list.innerHTML = '';
        document.querySelectorAll('.status-menu').forEach(menu => menu.remove());
        saveTasks();
    }
};

toggleMode.onclick = () => {
    document.body.classList.toggle('dark');
    const isDark = document.body.classList.contains('dark');
    toggleMode.textContent = isDark ? '☀️' : '🌙';
    localStorage.setItem(THEME_KEY, isDark);
};
