// widgets/QuoteWidget.js

export default class QuoteWidget {
    #container;
    #state;
    #quoteText;
    #quoteAuthor;
    #refreshBtn;

    #quotes = [
        { text: "El enfoque es el puente entre tus metas y tus logros.", author: "Jim Rohn" },
        { text: "La productividad no es ser un robot, es ser el arquitecto de tu tiempo.", author: "James Clear" },
        { text: "Pequeños pasos cada día suman grandes resultados.", author: "Anónimo" },
        { text: "Tu mente es para tener ideas, no para guardarlas.", author: "David Allen" },
        { text: "No cuentes los días, haz que los días cuenten.", author: "Muhammad Ali" },
        { text: "La mejor forma de predecir el futuro es creándolo.", author: "Peter Drucker" },
        { text: "El éxito es la suma de pequeños esfuerzos repetidos día tras día.", author: "Robert Collier" },
        { text: "Menos es más. El enfoque es eliminar lo innecesario.", author: "Leo Babauta" },
        { text: "Hazlo ahora. A veces 'después' se convierte en 'nunca'.", author: "Anónimo" },
        { text: "La disciplina es el puente entre las metas y los logros.", author: "Jim Rohn" }
    ];

    constructor(container, state) {
        this.#container = typeof container === 'string' ? document.querySelector(container) : container;
        this.#state = state;

        if (this.#container) {
            this.#quoteText = this.#container.querySelector('.quote-text');
            this.#quoteAuthor = this.#container.querySelector('.quote-author');
            this.#refreshBtn = this.#container.querySelector('.refresh-quote-btn');

            this.#init();
        }
    }

    #init() {
        if (this.#refreshBtn) {
            this.#refreshBtn.addEventListener('click', () => this.refreshQuote());
        }
        this.refreshQuote();
    }

    refreshQuote() {
        const randomIndex = Math.floor(Math.random() * this.#quotes.length);
        const quote = this.#quotes[randomIndex];

        if (this.#quoteText && this.#quoteAuthor) {
            // Animación simple de desvanecimiento
            this.#quoteText.style.opacity = 0;
            this.#quoteAuthor.style.opacity = 0;

            setTimeout(() => {
                this.#quoteText.textContent = `"${quote.text}"`;
                this.#quoteAuthor.textContent = `— ${quote.author}`;
                this.#quoteText.style.opacity = 1;
                this.#quoteAuthor.style.opacity = 1;
            }, 200);
        }
    }
}
