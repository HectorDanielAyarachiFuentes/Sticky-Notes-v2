// widgets/WeatherWidget.js

export default class WeatherWidget {
    #container;
    #state;
    #tempElement;
    #iconElement;
    #descElement;
    #humidityElement;
    #windElement;
    #locationElement;
    #forecastContainer;

    constructor(container, state) {
        this.#container = typeof container === 'string' ? document.querySelector(container) : container;
        this.#state = state;

        if (this.#container) {
            this.#tempElement = this.#container.querySelector('.weather-temp');
            this.#iconElement = this.#container.querySelector('.weather-icon');
            this.#descElement = this.#container.querySelector('.weather-desc');
            this.#humidityElement = this.#container.querySelector('.w-detail:first-child');
            this.#windElement = this.#container.querySelector('.w-detail:last-child');
            this.#locationElement = this.#container.querySelector('.weather-location');
            this.#forecastContainer = this.#container.querySelector('.weather-forecast');

            this.#init();
        }
    }

    #init() {
        this.updateWeather();
        // Update weather every 30 minutes
        setInterval(() => this.updateWeather(), 30 * 60 * 1000);
    }

    async updateWeather() {
        try {
            // 1. Get Location
            const location = await this.#getLocation();
            
            // 2. Fetch Weather Data (Open-Meteo)
            const weatherData = await this.#fetchWeatherData(location.lat, location.lon);
            
            // 3. Update DOM
            this.#renderWeather(weatherData, location.city + ', ' + location.country);
        } catch (error) {
            console.error('Error updating weather:', error);
            if (this.#descElement) {
                this.#descElement.textContent = 'Error al cargar clima';
            }
        }
    }

    async #getLocation() {
        // Try to get location via browser geolocation
        return new Promise((resolve) => {
            if ("geolocation" in navigator) {
                navigator.geolocation.getCurrentPosition(
                    async (position) => {
                        // Success! Now get city name via reverse geocoding (optional, or just use coordinates)
                        // For simplicity and to avoid more API keys, we can use a free reverse geocoding or just show "Mi Ubicación"
                        // But let's try an IP API first as a fallback/primary for better "out of the box" experience
                        const ipLocation = await this.#getLocationByIP();
                        resolve({
                            lat: position.coords.latitude,
                            lon: position.coords.longitude,
                            city: ipLocation.city || 'Mi Ubicación',
                            country: ipLocation.country || ''
                        });
                    },
                    async (error) => {
                        console.warn("Geolocation denied or failed, falling back to IP:", error);
                        resolve(await this.#getLocationByIP());
                    }
                );
            } else {
                this.#getLocationByIP().then(resolve);
            }
        });
    }

    async #getLocationByIP() {
        try {
            const response = await fetch('https://ipapi.co/json/');
            const data = await response.json();
            return {
                lat: data.latitude,
                lon: data.longitude,
                city: data.city,
                country: data.country_code
            };
        } catch (error) {
            console.error("IP Geolocation failed:", error);
            return { lat: -31.4135, lon: -64.1811, city: 'Córdoba', country: 'AR' }; // Default to Córdoba as seen in screenshot
        }
    }

    async #fetchWeatherData(lat, lon) {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto`;
        const response = await fetch(url);
        return await response.json();
    }

    #renderWeather(data, locationName) {
        if (!data || !data.current) return;

        const current = data.current;
        const daily = data.daily;

        // Map WMO Weather Codes to Emojis and Descriptions
        const weatherMap = this.#getWeatherMap(current.weather_code);

        if (this.#tempElement) this.#tempElement.textContent = `${Math.round(current.temperature_2m)}°`;
        if (this.#iconElement) this.#iconElement.textContent = weatherMap.icon;
        if (this.#descElement) this.#descElement.textContent = weatherMap.description;
        if (this.#humidityElement) this.#humidityElement.innerHTML = `<span>💧</span> ${Math.round(current.relative_humidity_2m)}% Hum.`;
        if (this.#windElement) this.#windElement.innerHTML = `<span>💨</span> ${Math.round(current.wind_speed_10m)} km/h`;
        if (this.#locationElement) this.#locationElement.textContent = locationName;

        // Render Forecast
        if (this.#forecastContainer && daily) {
            this.#forecastContainer.innerHTML = '';
            // Show next 3 days
            for (let i = 1; i <= 3; i++) {
                const date = new Date(daily.time[i]);
                const dayName = date.toLocaleDateString('es-ES', { weekday: 'short' });
                const dayWeather = this.#getWeatherMap(daily.weather_code[i]);
                const maxTemp = Math.round(daily.temperature_2m_max[i]);

                const forecastDay = document.createElement('div');
                forecastDay.className = 'f-day';
                forecastDay.innerHTML = `
                    <span>${dayName.charAt(0).toUpperCase() + dayName.slice(1)}</span>
                    <span>${dayWeather.icon}</span>
                    <span>${maxTemp}°</span>
                `;
                this.#forecastContainer.appendChild(forecastDay);
            }
        }
    }

    #getWeatherMap(code) {
        // WMO Weather interpretation codes (WW)
        // https://open-meteo.com/en/docs
        const codes = {
            0: { icon: '☀️', description: 'Despejado' },
            1: { icon: '🌤️', description: 'Principalmente despejado' },
            2: { icon: '⛅', description: 'Parcialmente nublado' },
            3: { icon: '☁️', description: 'Nublado' },
            45: { icon: '🌫️', description: 'Niebla' },
            48: { icon: '🌫️', description: 'Niebla con escarcha' },
            51: { icon: '🌧️', description: 'Llovizna ligera' },
            53: { icon: '🌧️', description: 'Llovizna moderada' },
            55: { icon: '🌧️', description: 'Llovizna densa' },
            61: { icon: '🌧️', description: 'Lluvia ligera' },
            63: { icon: '🌧️', description: 'Lluvia moderada' },
            65: { icon: '🌧️', description: 'Lluvia fuerte' },
            71: { icon: '❄️', description: 'Nieve ligera' },
            73: { icon: '❄️', description: 'Nieve moderada' },
            75: { icon: '❄️', description: 'Nieve fuerte' },
            80: { icon: '🌦️', description: 'Chubascos ligeros' },
            81: { icon: '🌦️', description: 'Chubascos moderados' },
            82: { icon: '🌦️', description: 'Chubascos violentos' },
            95: { icon: '⛈️', description: 'Tormenta' },
            96: { icon: '⛈️', description: 'Tormenta con granizo' },
            99: { icon: '⛈️', description: 'Tormenta fuerte con granizo' },
        };

        return codes[code] || { icon: '🌡️', description: 'Clima' };
    }
}
