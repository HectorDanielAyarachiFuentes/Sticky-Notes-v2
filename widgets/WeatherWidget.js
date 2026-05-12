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
            const locationDisplay = location.city + (location.province ? ', ' + location.province : '') + ', ' + location.country;
            this.#renderWeather(weatherData, locationDisplay);
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
                        const lat = position.coords.latitude;
                        const lon = position.coords.longitude;
                        
                        try {
                            // Use BigDataCloud for accurate reverse geocoding from coordinates
                            const response = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=es`);
                            const data = await response.json();
                            
                            resolve({
                                lat: lat,
                                lon: lon,
                                city: data.city || data.locality || 'Mi Ubicación',
                                province: data.principalSubdivision || '',
                                country: data.countryCode || ''
                            });
                        } catch (error) {
                            console.warn("Reverse geocoding failed, using coordinates only:", error);
                            resolve({
                                lat: lat,
                                lon: lon,
                                city: 'Mi Ubicación',
                                province: '',
                                country: ''
                            });
                        }
                    },
                    async (error) => {
                        console.warn("Geolocation denied or failed, falling back to IP:", error);
                        resolve(await this.#getLocationByIP());
                    },
                    { timeout: 10000, enableHighAccuracy: true }
                );
            } else {
                this.#getLocationByIP().then(resolve);
            }
        });
    }

    async #getLocationByIP() {
        try {
            // Try BigDataCloud first as it's often more accurate for Argentine IPs than ipapi.co
            const response = await fetch('https://api.bigdatacloud.net/data/reverse-geocode-client?localityLanguage=es');
            const data = await response.json();
            
            if (data.latitude && data.longitude) {
                return {
                    lat: data.latitude,
                    lon: data.longitude,
                    city: data.city || data.locality || 'Ciudad desconocida',
                    province: data.principalSubdivision || '',
                    country: data.countryCode || ''
                };
            }
            throw new Error("Invalid data from BigDataCloud");
        } catch (error) {
            console.error("IP Geolocation primary failed, trying secondary:", error);
            try {
                const response = await fetch('https://ipapi.co/json/');
                const data = await response.json();
                return {
                    lat: data.latitude,
                    lon: data.longitude,
                    city: data.city,
                    province: data.region || '',
                    country: data.country_code
                };
            } catch (err) {
                console.error("IP Geolocation secondary failed:", err);
                // Last resort: Default to Buenos Aires or similar if everything fails, 
                // but keep it subtle so the user knows it's a fallback
                return { lat: -34.6037, lon: -58.3816, city: 'Buenos Aires', province: 'CABA', country: 'AR' };
            }
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
