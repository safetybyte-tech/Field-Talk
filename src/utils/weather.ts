interface WeatherData {
  description: string;
  temperature: number;
  condition: string;
  alerts?: WeatherAlert[];
}

interface WeatherAlert {
  title: string;
  description: string;
  severity: 'minor' | 'moderate' | 'severe' | 'extreme';
  urgency: 'immediate' | 'expected' | 'future';
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
    // Using Open-Meteo with alerts (free, no API key required)
    const weatherResponse = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&temperature_unit=celsius&timezone=auto`
    );
    
    if (!weatherResponse.ok) {
      throw new Error('Weather API request failed');
    }
    
    const weatherData = await weatherResponse.json();
    const current = weatherData.current_weather;
    
    // Try to get weather alerts from NWS (US only) or other sources
    let alerts: WeatherAlert[] = [];
    try {
      // For US locations, try to get NWS alerts
      const alertsResponse = await fetch(
        `https://api.weather.gov/alerts/active?point=${lat},${lon}`,
        { 
          headers: { 'User-Agent': 'FieldTalk/1.0' },
          signal: AbortSignal.timeout(5000)
        }
      );
      
      if (alertsResponse.ok) {
        const alertsData = await alertsResponse.json();
        alerts = alertsData.features?.map((feature: any) => ({
          title: feature.properties.headline || feature.properties.event,
          description: feature.properties.description || feature.properties.instruction,
          severity: mapSeverity(feature.properties.severity),
          urgency: mapUrgency(feature.properties.urgency)
        })).slice(0, 3) || []; // Limit to 3 most important alerts
      }
    } catch (alertError) {
      // Alerts are optional, continue without them
      console.warn('Could not fetch weather alerts:', alertError);
    }
    
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
      condition: getConditionFromCode(current.weathercode),
      alerts
    };
  } catch (error) {
    throw new Error('Failed to fetch weather data');
  }
};

// Helper functions for mapping alert severity and urgency
const mapSeverity = (severity: string): WeatherAlert['severity'] => {
  switch (severity?.toLowerCase()) {
    case 'extreme': return 'extreme';
    case 'severe': return 'severe';
    case 'moderate': return 'moderate';
    default: return 'minor';
  }
};

const mapUrgency = (urgency: string): WeatherAlert['urgency'] => {
  switch (urgency?.toLowerCase()) {
    case 'immediate': return 'immediate';
    case 'expected': return 'expected';
    default: return 'future';
  }
};

export const getCurrentWeather = async (): Promise<{ description: string; alerts?: WeatherAlert[] }> => {
  try {
    // Get user's location
    const coords = await getCurrentPosition();
    
    // Fetch weather data
    const weather = await fetchWeatherFromFreeAPI(coords.latitude, coords.longitude);
    
    return {
      description: weather.description,
      alerts: weather.alerts
    };
  } catch (error) {
    console.warn('Could not get current weather:', error);
    
    // Return a generic description based on time of day
    const hour = new Date().getHours();
    let description: string;
    if (hour >= 6 && hour < 12) {
      description = 'Morning conditions';
    } else if (hour >= 12 && hour < 18) {
      description = 'Afternoon conditions';
    } else {
      description = 'Evening conditions';
    }
    
    return { description };
  }
};

// Get weather with caching to avoid repeated API calls
let weatherCache: { data: { description: string; alerts?: WeatherAlert[] }; timestamp: number } | null = null;
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

export const getCachedWeather = async (forceRefresh: boolean = false): Promise<{ description: string; alerts?: WeatherAlert[] }> => {
  const now = Date.now(); // This is fine as it's used for cache timing, not display
  
  // Return cached weather if it's still fresh
  if (!forceRefresh && weatherCache && (now - weatherCache.timestamp) < CACHE_DURATION) {
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