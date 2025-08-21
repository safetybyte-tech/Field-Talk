interface WeatherData {
  description: string;
  temperature: number;
  condition: string;
}

interface GeolocationCoords {
  latitude: number;
  longitude: number;
}

// Simple weather descriptions for construction sites
const getSimpleWeatherDescription = (condition: string, temp: number): string => {
  const tempF = Math.round((temp * 9/5) + 32);
  
  const conditionMap: { [key: string]: string } = {
    'clear': 'Clear',
    'clouds': 'Cloudy',
    'rain': 'Rainy',
    'drizzle': 'Light Rain',
    'thunderstorm': 'Stormy',
    'snow': 'Snowy',
    'mist': 'Foggy',
    'fog': 'Foggy',
    'haze': 'Hazy'
  };

  const simpleCondition = conditionMap[condition.toLowerCase()] || 'Partly Cloudy';
  return `${simpleCondition}, ${tempF}°F`;
};

const getCurrentPosition = (): Promise<GeolocationCoords> => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        });
      },
      (error) => {
        reject(error);
      },
      {
        timeout: 10000,
        maximumAge: 300000, // 5 minutes
        enableHighAccuracy: false
      }
    );
  });
};

// Fallback weather service using a free API
const fetchWeatherFromFreeAPI = async (lat: number, lon: number): Promise<WeatherData> => {
  try {
    // Using Open-Meteo (free, no API key required)
    const response = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&temperature_unit=celsius`
    );
    
    if (!response.ok) {
      throw new Error('Weather API request failed');
    }
    
    const data = await response.json();
    const current = data.current_weather;
    
    // Map weather codes to simple descriptions
    const getConditionFromCode = (code: number): string => {
      if (code === 0) return 'clear';
      if (code <= 3) return 'clouds';
      if (code <= 67) return 'rain';
      if (code <= 77) return 'snow';
      if (code <= 82) return 'rain';
      if (code <= 99) return 'thunderstorm';
      return 'clouds';
    };
    
    return {
      description: getSimpleWeatherDescription(
        getConditionFromCode(current.weathercode),
        current.temperature
      ),
      temperature: current.temperature,
      condition: getConditionFromCode(current.weathercode)
    };
  } catch (error) {
    throw new Error('Failed to fetch weather data');
  }
};

export const getCurrentWeather = async (): Promise<string> => {
  try {
    // Get user's location
    const coords = await getCurrentPosition();
    
    // Fetch weather data
    const weather = await fetchWeatherFromFreeAPI(coords.latitude, coords.longitude);
    
    return weather.description;
  } catch (error) {
    console.warn('Could not get current weather:', error);
    
    // Return a generic description based on time of day
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 12) {
      return 'Morning conditions';
    } else if (hour >= 12 && hour < 18) {
      return 'Afternoon conditions';
    } else {
      return 'Evening conditions';
    }
  }
};

// Get weather with caching to avoid repeated API calls
let weatherCache: { data: string; timestamp: number } | null = null;
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

export const getCachedWeather = async (): Promise<string> => {
  const now = Date.now();
  
  // Return cached weather if it's still fresh
  if (weatherCache && (now - weatherCache.timestamp) < CACHE_DURATION) {
    return weatherCache.data;
  }
  
  // Fetch new weather data
  const weather = await getCurrentWeather();
  
  // Cache the result
  weatherCache = {
    data: weather,
    timestamp: now
  };
  
  return weather;
};