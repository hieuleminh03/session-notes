const input = document.getElementById('input');
const addBtn = document.getElementById('add-tasks');
const list = document.getElementById('todo-list');
const toggleMode = document.getElementById('toggle-mode');
const toggleTimer = document.getElementById('toggle-timer');
const addTaskButton = document.getElementById('add-task-button');
const inputContainer = document.querySelector('.input-container');
const clearAllButton = document.getElementById('clear-all');
const taskNavigator = document.querySelector('.task-navigator');
const sliderMarkers = document.querySelector('.slider-markers');
const scrollUpBtn = document.getElementById('scroll-up-btn');
const scrollDownBtn = document.getElementById('scroll-down-btn');

// Timer elements
const timerContainer = document.getElementById('timer-container');
const closeTimerBtn = document.getElementById('close-timer');
const hoursInput = document.getElementById('hours-input');
const minutesInput = document.getElementById('minutes-input');
const enableBreaksCheckbox = document.getElementById('enable-breaks');
const breakOptionsDiv = document.querySelector('.break-options');
const workIntervalInput = document.getElementById('work-interval');
const breakIntervalInput = document.getElementById('break-interval');
const timeRemainingDisplay = document.getElementById('time-remaining');
const intervalStatusDisplay = document.getElementById('interval-status');
const startTimerBtn = document.getElementById('start-timer');
const pauseTimerBtn = document.getElementById('pause-timer');
const resumeTimerBtn = document.getElementById('resume-timer');
const resetTimerBtn = document.getElementById('reset-timer');

const STORAGE_KEY = 'todo-tasks';
const THEME_KEY = 'dark-mode';
const TASKS_PER_GROUP = 5; // Number of tasks per marker

// Track the currently dragged item
let draggedItem = null;
// For auto-scrolling
let autoScrollInterval = null;
const scrollSpeed = 15; // Higher value = faster scroll
const scrollThreshold = 100; // Distance from viewport edge to trigger scroll

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

    // Also update task navigator on window resize
    window.addEventListener('resize', () => {
        if (list.children.length > TASKS_PER_GROUP) {
            updateTaskNavigator();
        }
    });
});

function loadTasks() {
    const savedTasks = localStorage.getItem(STORAGE_KEY);
    if (savedTasks) {
        const tasks = JSON.parse(savedTasks);
        tasks.forEach(task => addTask(task.text, task.status));
        updateTaskNavigator();
    }
}

function saveTasks() {
    const tasks = Array.from(list.children).map(li => ({
        text: li.querySelector('.task-content span').textContent,
        status: li.dataset.status
    }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    updateTaskNavigator();
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
    updateTaskNavigator();
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
    li.draggable = true;  // Make the list item draggable

    // Add drag and drop event listeners
    li.addEventListener('dragstart', handleDragStart);
    li.addEventListener('dragend', handleDragEnd);
    li.addEventListener('dragover', handleDragOver);
    li.addEventListener('dragenter', handleDragEnter);
    li.addEventListener('dragleave', handleDragLeave);
    li.addEventListener('drop', handleDrop);

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

// Drag and drop handlers
function handleDragStart(e) {
    draggedItem = this;
    // Set data transfer for Firefox
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', this.innerHTML);

    // Add dragging class after a small delay to maintain visual feedback
    setTimeout(() => {
        this.classList.add('dragging');
    }, 0);

    // Set up auto-scroll
    document.addEventListener('dragover', handleAutoScroll);
}

function handleDragEnd() {
    this.classList.remove('dragging');

    // Remove all drag-over classes
    document.querySelectorAll('.drag-over').forEach(item => {
        item.classList.remove('drag-over');
    });

    // Reset the dragged item
    draggedItem = null;

    // Clean up auto-scroll
    document.removeEventListener('dragover', handleAutoScroll);
    if (autoScrollInterval) {
        clearInterval(autoScrollInterval);
        autoScrollInterval = null;
    }

    // Save the new order
    saveTasks();
}

function handleDragOver(e) {
    e.preventDefault(); // Necessary to allow dropping
    return false;
}

function handleDragEnter(e) {
    e.preventDefault();
    if (this !== draggedItem) {
        this.classList.add('drag-over');
    }
}

function handleDragLeave() {
    this.classList.remove('drag-over');
}

function handleDrop(e) {
    e.stopPropagation();

    if (this === draggedItem) return false;

    // Remove the drag-over class
    this.classList.remove('drag-over');

    // Get the position of the dragged item and the drop target
    const allItems = Array.from(list.querySelectorAll('li'));
    const draggedIndex = allItems.indexOf(draggedItem);
    const droppedIndex = allItems.indexOf(this);

    // Reposition the dragged item
    if (draggedIndex < droppedIndex) {
        // Moving down
        this.parentNode.insertBefore(draggedItem, this.nextSibling);
    } else {
        // Moving up
        this.parentNode.insertBefore(draggedItem, this);
    }

    return false;
}

function handleAutoScroll(e) {
    const mouseY = e.clientY;
    const viewportHeight = window.innerHeight;

    // Clear any existing scroll interval
    if (autoScrollInterval) {
        clearInterval(autoScrollInterval);
        autoScrollInterval = null;
    }

    // If we're near the top of the viewport
    if (mouseY < scrollThreshold) {
        const scrollAmount = Math.max(1, (scrollThreshold - mouseY) / 5) * scrollSpeed;
        autoScrollInterval = setInterval(() => {
            window.scrollBy(0, -scrollAmount);
        }, 16); // ~60fps
    }
    // If we're near the bottom of the viewport
    else if (mouseY > viewportHeight - scrollThreshold) {
        const scrollAmount = Math.max(1, (mouseY - (viewportHeight - scrollThreshold)) / 5) * scrollSpeed;
        autoScrollInterval = setInterval(() => {
            window.scrollBy(0, scrollAmount);
        }, 16); // ~60fps
    }
}

// Task navigation slider functionality
function updateTaskNavigator() {
    const taskCount = list.children.length;

    // Only show the navigator if we have more than 5 tasks
    if (taskCount <= TASKS_PER_GROUP) {
        taskNavigator.classList.remove('show');
        return;
    }

    // Position the task navigator to exactly match the task list position
    const listRect = list.getBoundingClientRect();
    taskNavigator.style.top = `${listRect.top - document.body.getBoundingClientRect().top}px`;
    taskNavigator.style.height = `${listRect.height}px`;

    // Ensure the slider track fits properly
    const sliderTrack = taskNavigator.querySelector('.slider-track');
    sliderTrack.style.top = '0';
    sliderTrack.style.bottom = '0';

    taskNavigator.classList.add('show');
    sliderMarkers.innerHTML = '';

    // Calculate how many markers we need
    const markerCount = Math.ceil(taskCount / TASKS_PER_GROUP);
    const taskItems = Array.from(list.children);

    // Create marker for each group of tasks
    for (let i = 0; i < markerCount; i++) {
        const markerNumber = i * TASKS_PER_GROUP + 1;
        const marker = document.createElement('div');
        marker.className = 'task-marker';
        marker.textContent = markerNumber;
        marker.dataset.index = i;

        // Position the marker aligned with the corresponding task
        const taskIndex = i * TASKS_PER_GROUP;
        if (taskIndex < taskItems.length) {
            const taskItem = taskItems[taskIndex];
            const taskRect = taskItem.getBoundingClientRect();
            const taskMiddle = taskRect.top + (taskRect.height / 2) - listRect.top;

            // Position marker at the same height as the middle of the task
            marker.style.top = `${taskMiddle}px`;
        }

        marker.addEventListener('click', () => {
            scrollToTaskGroup(i);
            updateActiveMarker(i);
        });

        sliderMarkers.appendChild(marker);
    }

    // Initial active marker highlight
    updateActiveMarker(0);

    // Add scroll event listener to update active marker and positions
    window.addEventListener('scroll', updateMarkerPositions);
    window.addEventListener('scroll', updateActiveMarkerOnScroll);
}

// Update marker positions on scroll
function updateMarkerPositions() {
    const taskItems = Array.from(list.children);
    if (taskItems.length === 0) return;

    const listRect = list.getBoundingClientRect();

    // Update the navigator position and height
    taskNavigator.style.top = `${listRect.top - document.body.getBoundingClientRect().top}px`;
    taskNavigator.style.height = `${listRect.height}px`;

    const markers = document.querySelectorAll('.task-marker');

    markers.forEach((marker, index) => {
        const taskIndex = index * TASKS_PER_GROUP;
        if (taskIndex < taskItems.length) {
            const taskItem = taskItems[taskIndex];
            const taskRect = taskItem.getBoundingClientRect();
            const taskMiddle = taskRect.top + (taskRect.height / 2) - listRect.top;

            // Position marker at the same height as the middle of the task
            marker.style.top = `${taskMiddle}px`;
        }
    });
}

function scrollToTaskGroup(index) {
    const taskItems = Array.from(list.children);
    const startIndex = index * TASKS_PER_GROUP;

    if (taskItems[startIndex]) {
        taskItems[startIndex].scrollIntoView({ behavior: 'smooth' });
    }
}

function updateActiveMarker(index) {
    const markers = document.querySelectorAll('.task-marker');
    markers.forEach(marker => marker.classList.remove('active'));

    if (markers[index]) {
        markers[index].classList.add('active');
    }
}

function updateActiveMarkerOnScroll() {
    const taskItems = Array.from(list.children);
    if (taskItems.length === 0) return;

    // Find the first visible task
    let firstVisibleIndex = 0;
    const scrollPosition = window.scrollY + 200; // Add offset to account for header

    for (let i = 0; i < taskItems.length; i++) {
        const taskTop = taskItems[i].getBoundingClientRect().top + window.scrollY;
        if (taskTop >= scrollPosition) {
            break;
        }
        firstVisibleIndex = i;
    }

    // Calculate which marker group this belongs to
    const markerIndex = Math.floor(firstVisibleIndex / TASKS_PER_GROUP);
    updateActiveMarker(markerIndex);
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

// Scroll buttons functionality
let lastClickTime = 0;
const doubleClickThreshold = 500; // 0.5 seconds in milliseconds

// Function to update button visibility based on scroll position
function updateScrollButtonsVisibility() {
    // For the scroll up button
    if (window.scrollY <= 10) {
        scrollUpBtn.classList.add('hidden');
    } else {
        scrollUpBtn.classList.remove('hidden');
    }
    
    // For the scroll down button
    if (window.scrollY + window.innerHeight >= document.body.scrollHeight - 10) {
        scrollDownBtn.classList.add('hidden');
    } else {
        scrollDownBtn.classList.remove('hidden');
    }
}

// Initialize button visibility
document.addEventListener('DOMContentLoaded', () => {
    updateScrollButtonsVisibility();
});

// Update button visibility on scroll
window.addEventListener('scroll', updateScrollButtonsVisibility);

// Scroll up button functionality
scrollUpBtn.addEventListener('click', (e) => {
    const currentTime = new Date().getTime();
    const isDoubleClick = currentTime - lastClickTime < doubleClickThreshold;
    
    if (isDoubleClick) {
        // Double-click: Scroll to the top
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    } else {
        // Single-click: Scroll up by a set amount
        window.scrollBy({
            top: -window.innerHeight / 2,
            behavior: 'smooth'
        });
    }
    
    lastClickTime = currentTime;
});

// Timer Constants and State
const TIMER_STORAGE_KEY = 'timer-settings';
const TIMER_VISIBILITY_KEY = 'timer-visible';
let timerIntervalId = null;
let totalSeconds = 0;
let remainingSeconds = 0;
let isPaused = false;
let isBreak = false;
let completedWorkIntervals = 0;
let workDurationSeconds = 0;
let breakDurationSeconds = 0;

// Audio notification for when timer completes or switches between work/break
const timerAudio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEARKwAAESsAAABAAgAZGF0YWoGAAAAAAEA/v8CAP//AAABAP7/AgD//wAAAQD+/wIA//8AAAAA');

// Load saved timer settings and visibility
document.addEventListener('DOMContentLoaded', () => {
    loadTimerSettings();
    loadTimerVisibility();
});

function loadTimerSettings() {
    const savedSettings = localStorage.getItem(TIMER_STORAGE_KEY);
    if (savedSettings) {
        const settings = JSON.parse(savedSettings);
        hoursInput.value = settings.hours || 1;
        minutesInput.value = settings.minutes || 0;
        enableBreaksCheckbox.checked = settings.enableBreaks || false;
        workIntervalInput.value = settings.workInterval || 25;
        breakIntervalInput.value = settings.breakInterval || 5;
        
        // Show/hide break options based on checkbox
        breakOptionsDiv.classList.toggle('hidden', !enableBreaksCheckbox.checked);
    }
}

function loadTimerVisibility() {
    const isVisible = localStorage.getItem(TIMER_VISIBILITY_KEY) === 'true';
    if (isVisible) {
        timerContainer.classList.remove('hidden');
        document.body.classList.add('timer-active');
    }
}

function saveTimerSettings() {
    const settings = {
        hours: parseInt(hoursInput.value) || 0,
        minutes: parseInt(minutesInput.value) || 0,
        enableBreaks: enableBreaksCheckbox.checked,
        workInterval: parseInt(workIntervalInput.value) || 25,
        breakInterval: parseInt(breakIntervalInput.value) || 5
    };
    localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify(settings));
}

// Timer Toggle Button
toggleTimer.addEventListener('click', () => {
    timerContainer.classList.toggle('hidden');
    const isVisible = !timerContainer.classList.contains('hidden');
    document.body.classList.toggle('timer-active', isVisible);
    localStorage.setItem(TIMER_VISIBILITY_KEY, isVisible);
});

// Close Timer Button
closeTimerBtn.addEventListener('click', () => {
    timerContainer.classList.add('hidden');
    document.body.classList.remove('timer-active');
    localStorage.setItem(TIMER_VISIBILITY_KEY, false);
});

// Enable/Disable Break Options
enableBreaksCheckbox.addEventListener('change', () => {
    breakOptionsDiv.classList.toggle('hidden', !enableBreaksCheckbox.checked);
    saveTimerSettings();
});

// Format time as HH:MM:SS
function formatTime(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    
    return [
        h.toString().padStart(2, '0'),
        m.toString().padStart(2, '0'),
        s.toString().padStart(2, '0')
    ].join(':');
}

// Update timer display
function updateTimerDisplay() {
    timeRemainingDisplay.textContent = formatTime(remainingSeconds);
    
    if (enableBreaksCheckbox.checked) {
        intervalStatusDisplay.classList.remove('hidden');
        intervalStatusDisplay.textContent = isBreak ? 'breaking' : 'working';
        intervalStatusDisplay.className = isBreak ? 'break' : 'work';
    } else {
        intervalStatusDisplay.classList.add('hidden');
    }
    
    document.title = `(${formatTime(remainingSeconds)}) danh sách công việc`;
}

// Start the timer
function startTimer() {
    // Clear any existing interval
    if (timerIntervalId) {
        clearInterval(timerIntervalId);
    }
    
    // Calculate total seconds from inputs
    const hours = parseInt(hoursInput.value) || 0;
    const minutes = parseInt(minutesInput.value) || 0;
    totalSeconds = hours * 3600 + minutes * 60;
    remainingSeconds = totalSeconds;
    
    // If breaks are enabled, set interval durations
    if (enableBreaksCheckbox.checked) {
        workDurationSeconds = parseInt(workIntervalInput.value) * 60 || 1500; // Default to 25 minutes
        breakDurationSeconds = parseInt(breakIntervalInput.value) * 60 || 300; // Default to 5 minutes
        isBreak = false;
        completedWorkIntervals = 0;
    }
    
    // Save settings
    saveTimerSettings();
    
    // Hide setup, show timer
    startTimerBtn.classList.add('hidden');
    pauseTimerBtn.classList.remove('hidden');
    resumeTimerBtn.classList.add('hidden');
    
    // Start countdown
    isPaused = false;
    updateTimerDisplay();
    
    timerIntervalId = setInterval(() => {
        if (remainingSeconds <= 0) {
            // Timer complete
            clearInterval(timerIntervalId);
            timerAudio.play();
            resetTimer();
            // Send notification if supported
            if (Notification.permission === 'granted') {
                new Notification('Thời gian đã hết!', {
                    body: 'Session đã hoàn thành.',
                    icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><circle cx="50" cy="50" r="45" fill="%233498db"/></svg>'
                });
            }
            return;
        }
        
        remainingSeconds--;
        updateTimerDisplay();
        
        // Handle work/break intervals if enabled
        if (enableBreaksCheckbox.checked) {
            let currentIntervalDuration = isBreak ? breakDurationSeconds : workDurationSeconds;
            let totalIntervalSeconds = calculateTotalIntervalSeconds();
            let secondsInCurrentInterval = totalIntervalSeconds % (workDurationSeconds + breakDurationSeconds);
            
            // Check if we need to switch between work and break
            if (!isBreak && secondsInCurrentInterval >= workDurationSeconds) {
                // Switch to break
                isBreak = true;
                completedWorkIntervals++;
                intervalStatusDisplay.textContent = 'Nghỉ';
                intervalStatusDisplay.className = 'break';
                timerAudio.play();
                
                // Notification
                if (Notification.permission === 'granted') {
                    new Notification('Thời gian nghỉ!', {
                        body: 'Hãy nghỉ ngơi 5 phút.',
                        icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><circle cx="50" cy="50" r="45" fill="%23f1c40f"/></svg>'
                    });
                }
            } else if (isBreak && secondsInCurrentInterval >= workDurationSeconds + breakDurationSeconds) {
                // Switch back to work
                isBreak = false;
                intervalStatusDisplay.textContent = 'Làm việc';
                intervalStatusDisplay.className = 'work';
                timerAudio.play();
                
                // Notification
                if (Notification.permission === 'granted') {
                    new Notification('Quay lại làm việc!', {
                        body: 'Đã đến lúc tiếp tục làm việc.',
                        icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><circle cx="50" cy="50" r="45" fill="%233498db"/></svg>'
                    });
                }
            }
        }
    }, 1000);
    
    // Request notification permission
    if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
        Notification.requestPermission();
    }
}

// Calculate total seconds elapsed in work/break intervals
function calculateTotalIntervalSeconds() {
    return totalSeconds - remainingSeconds;
}

// Pause the timer
function pauseTimer() {
    if (timerIntervalId) {
        clearInterval(timerIntervalId);
        timerIntervalId = null;
        isPaused = true;
        pauseTimerBtn.classList.add('hidden');
        resumeTimerBtn.classList.remove('hidden');
    }
}

// Resume the timer
function resumeTimer() {
    isPaused = false;
    pauseTimerBtn.classList.remove('hidden');
    resumeTimerBtn.classList.add('hidden');
    
    timerIntervalId = setInterval(() => {
        if (remainingSeconds <= 0) {
            clearInterval(timerIntervalId);
            timerAudio.play();
            resetTimer();
            return;
        }
        
        remainingSeconds--;
        updateTimerDisplay();
        
        // Handle work/break intervals if enabled (same logic as in startTimer)
        if (enableBreaksCheckbox.checked) {
            let currentIntervalDuration = isBreak ? breakDurationSeconds : workDurationSeconds;
            let totalIntervalSeconds = calculateTotalIntervalSeconds();
            let secondsInCurrentInterval = totalIntervalSeconds % (workDurationSeconds + breakDurationSeconds);
            
            if (!isBreak && secondsInCurrentInterval >= workDurationSeconds) {
                isBreak = true;
                completedWorkIntervals++;
                intervalStatusDisplay.textContent = 'Nghỉ';
                intervalStatusDisplay.className = 'break';
                timerAudio.play();
            } else if (isBreak && secondsInCurrentInterval >= workDurationSeconds + breakDurationSeconds) {
                isBreak = false;
                intervalStatusDisplay.textContent = 'Làm việc';
                intervalStatusDisplay.className = 'work';
                timerAudio.play();
            }
        }
    }, 1000);
}

// Reset the timer
function resetTimer() {
    if (timerIntervalId) {
        clearInterval(timerIntervalId);
        timerIntervalId = null;
    }
    
    isPaused = false;
    isBreak = false;
    remainingSeconds = 0;
    completedWorkIntervals = 0;
    
    startTimerBtn.classList.remove('hidden');
    pauseTimerBtn.classList.add('hidden');
    resumeTimerBtn.classList.add('hidden');
    
    timeRemainingDisplay.textContent = '00:00:00';
    intervalStatusDisplay.classList.add('hidden');
    document.title = 'danh sách công việc';
}

// Timer control event listeners
startTimerBtn.addEventListener('click', startTimer);
pauseTimerBtn.addEventListener('click', pauseTimer);
resumeTimerBtn.addEventListener('click', resumeTimer);
resetTimerBtn.addEventListener('click', resetTimer);

// Save settings when inputs change
[hoursInput, minutesInput, workIntervalInput, breakIntervalInput].forEach(input => {
    input.addEventListener('change', saveTimerSettings);
});

// Scroll down button functionality
scrollDownBtn.addEventListener('click', (e) => {
    const currentTime = new Date().getTime();
    const isDoubleClick = currentTime - lastClickTime < doubleClickThreshold;
    
    if (isDoubleClick) {
        // Double-click: Scroll to the bottom
        window.scrollTo({
            top: document.body.scrollHeight,
            behavior: 'smooth'
        });
    } else {
        // Single-click: Scroll down by a set amount
        window.scrollBy({
            top: window.innerHeight / 2,
            behavior: 'smooth'
        });
    }
    
    lastClickTime = currentTime;
});
