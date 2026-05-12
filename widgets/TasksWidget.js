// widgets/TasksWidget.js

export default class TasksWidget {
    #container;
    #state;
    #taskList;
    #taskInput;
    #onUpdate;

    constructor(container, state, onUpdate) {
        this.#container = typeof container === 'string' ? document.querySelector(container) : container;
        this.#state = state;
        this.#onUpdate = onUpdate; // Callback para guardar datos

        if (this.#container) {
            this.#taskList = this.#container.querySelector('.tasks-mini-list');
            this.#taskInput = this.#container.querySelector('#quick-task-input');

            this.#init();
        }
    }

    #init() {
        if (this.#taskInput) {
            this.#taskInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && this.#taskInput.value.trim()) {
                    this.#addTask(this.#taskInput.value.trim());
                    this.#taskInput.value = '';
                }
            });
        }

        this.render();
    }

    #addTask(text) {
        const tasks = this.#state.getTasks() || [];
        const newTask = {
            id: Date.now(),
            text: text,
            completed: false,
            createdAt: new Date().toISOString()
        };
        
        tasks.push(newTask);
        this.#state.setTasks(tasks);
        this.render();
        
        if (this.#onUpdate) this.#onUpdate();
    }

    #toggleTask(taskId) {
        const tasks = this.#state.getTasks();
        const task = tasks.find(t => t.id === taskId);
        if (task) {
            task.completed = !task.completed;
            this.#state.setTasks(tasks);
            this.render();
            if (this.#onUpdate) this.#onUpdate();
        }
    }

    #deleteTask(taskId) {
        const tasks = this.#state.getTasks().filter(t => t.id !== taskId);
        this.#state.setTasks(tasks);
        this.render();
        if (this.#onUpdate) this.#onUpdate();
    }

    render() {
        if (!this.#taskList) return;

        const tasks = this.#state.getTasks() || [];
        
        if (tasks.length === 0) {
            this.#taskList.innerHTML = '<div class="no-tasks">No hay tareas pendientes</div>';
            return;
        }

        this.#taskList.innerHTML = '';
        tasks.forEach(task => {
            const item = document.createElement('div');
            item.className = `task-mini-item ${task.completed ? 'completed' : ''}`;
            
            const statusIcon = task.completed ? '●' : '○';
            item.innerHTML = `
                <span>${statusIcon}</span>
                <span class="task-text">${task.text}</span>
                <button class="delete-task-btn" title="Eliminar">×</button>
            `;

            item.addEventListener('click', (e) => {
                if (!e.target.classList.contains('delete-task-btn')) {
                    this.#toggleTask(task.id);
                }
            });

            const deleteBtn = item.querySelector('.delete-task-btn');
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.#deleteTask(task.id);
            });

            this.#taskList.appendChild(item);
        });
    }
}
