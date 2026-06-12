const REFRESH_RATE = 30000; 
let weatherChart = null;

// Kategori Wilayah ditambahkan untuk mempermudah filter dari Sidebar
const daftarKota = [
  { nama: "Bogor", provinsi: "West Java", region: "Java", lat: -6.5950, lon: 106.7894 },
  { nama: "Jakarta", provinsi: "DKI Jakarta", region: "Java", lat: -6.2088, lon: 106.8456 },
  { nama: "Bandung", provinsi: "West Java", region: "Java", lat: -6.9175, lon: 107.6191 },
  { nama: "Yogyakarta", provinsi: "DI Yogyakarta", region: "Java", lat: -7.7956, lon: 110.3695 },
  { nama: "Surabaya", provinsi: "East Java", region: "Java", lat: -7.2504, lon: 112.7688 },
  { nama: "Medan", provinsi: "North Sumatra", region: "Outer", lat: 3.5952, lon: 98.6722 },
  { nama: "Makassar", provinsi: "South Sulawesi", region: "Outer", lat: -5.1476, lon: 119.4327 },
  { nama: "Denpasar", provinsi: "Bali", region: "Outer", lat: -8.6705, lon: 115.2126 },
  { nama: "Jayapura", provinsi: "Papua", region: "Outer", lat: -2.5916, lon: 140.6690 },
  { nama: "Balikpapan", provinsi: "East Kalimantan", region: "Outer", lat: -1.2654, lon: 116.8312 }
];

const weatherCodeMap = {
  0: { text: "Cerah Murni", icon: "ri-sun-fill text-amber-400" },
  1: { text: "Utamanya Cerah", icon: "ri-sun-cloudy-line text-amber-300" },
  2: { text: "Berawan Sebagian", icon: "ri-cloudy-line text-slate-300" },
  3: { text: "Mendung Mendalam", icon: "ri-clouds-fill text-slate-400" },
  45: { text: "Berkabut", icon: "ri-foggy-line text-slate-400" },
  51: { text: "Gerimis Ringan", icon: "ri-drizzle-line text-blue-300" },
  61: { text: "Hujan Ringan", icon: "ri-rainy-line text-blue-400" },
  63: { text: "Hujan Sedang", icon: "ri-rainy-fill text-blue-500" },
  65: { text: "Hujan Lebat", icon: "ri-heavy-showers-fill text-blue-600" },
  95: { text: "Hujan Badai Petir", icon: "ri-thunderstorm-fill text-purple-500" }
};

function getCitySelector() {
  return document.getElementById('city-selector');
}

// Render dropdown berdasarkan tipe filter sidebar yang dipilih
function renderCityDropdown(filterType = "all") {
  const selector = getCitySelector();
  if (!selector) return;

  const kotaDifilter = daftarKota.filter(k => filterType === "all" || k.region === filterType);
  
  selector.innerHTML = kotaDifilter.map(kota => {
    // Mencari index asli di array master agar sinkronisasi fetch tidak rusak
    const originalIndex = daftarKota.findIndex(d => d.nama === kota.nama);
    return `<option value="${originalIndex}">${kota.nama} , ${kota.provinsi}</option>`;
  }).join('');
}

async function updateLiveMonitorOverview() {
  const elLiveListContainer = document.getElementById('live-cities-list');
  if (!elLiveListContainer) return;

  const kotaLive = daftarKota.slice(0, 8);
  const promises = kotaLive.map(async (k) => {
    try {
      const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${k.lat}&longitude=${k.lon}&current_weather=true`);
      const d = await res.json();
      return { nama: k.nama, temp: Math.round(d.current_weather.temperature) };
    } catch {
      return { nama: k.nama, temp: "--" };
    }
  });

  const hasilKota = await Promise.all(promises);
  elLiveListContainer.innerHTML = hasilKota.map(k => `
    <div class="flex justify-between items-center bg-[#132247]/40 hover:bg-[#1e293b] p-2.5 rounded-lg border border-slate-800/40 transition-colors text-xs">
      <div class="flex items-center gap-2">
        <span class="w-2 h-2 bg-sky-400 rounded-full animate-pulse"></span>
        <span class="font-medium text-slate-300">${k.nama}</span>
      </div>
      <span class="font-mono font-bold text-white">${k.temp}&deg;C</span>
    </div>
  `).join('');
}

function render7DayForecast(dailyData) {
  const elForecastContainer = document.getElementById('forecast-7days-container');
  if (!elForecastContainer) return;

  elForecastContainer.innerHTML = dailyData.time.map((time, idx) => {
    const date = new Date(time);
    const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
    const code = dailyData.weathercode[idx];
    const info = weatherCodeMap[code] || { icon: "ri-cloud-line text-slate-400" };
    const maxTemp = Math.round(dailyData.temperature_2m_max[idx]);
    const minTemp = Math.round(dailyData.temperature_2m_min[idx]);

    return `
      <div class="flex flex-col items-center bg-[#0b1329]/50 p-2.5 rounded-xl border border-slate-800/50 text-center">
        <span class="text-[11px] font-bold text-slate-400 uppercase tracking-wider">${dayName}</span>
        <i class="${info.icon} text-2xl my-2.5"></i>
        <span class="font-mono text-[10px] text-white font-medium">${minTemp}&deg; - ${maxTemp}&deg;</span>
      </div>
    `;
  }).join('');
}

function renderChart(hourlyData) {
  const canvasElement = document.getElementById('tempChart');
  if (!canvasElement) return;

  const ctx = canvasElement.getContext('2d');
  if (weatherChart) { weatherChart.destroy(); }

  const labels24h = hourlyData.time.slice(0, 24).map(t => new Date(t).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }));
  const temps24h = hourlyData.temperature_2m.slice(0, 24);

  weatherChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels24h,
      datasets: [{
        data: temps24h,
        borderColor: '#38bdf8',
        backgroundColor: 'rgba(56, 189, 248, 0.06)',
        borderWidth: 2,
        tension: 0.4,
        pointRadius: 1,
        fill: true
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false }, ticks: { color: '#64748b', font: { size: 9 }, maxTicksLimit: 8 } },
        y: { grid: { color: 'rgba(51, 65, 85, 0.15)' }, ticks: { color: '#64748b', font: { size: 9 } } }
      }
    }
  });
}

async function updateWeatherDashboard() {
  const errorAlert = document.getElementById('weather-error');
  if (errorAlert) errorAlert.classList.add('hidden');

  const selector = getCitySelector();
  const selectedIndex = selector ? selector.value : 0;
  const kotaTerpilih = daftarKota[selectedIndex] || daftarKota[0];

  const elCityTitle = document.getElementById('info-city-name');
  if (elCityTitle) elCityTitle.innerText = `Current Weather for ${kotaTerpilih.nama}, ${kotaTerpilih.provinsi}`;

  const API_URL = `https://api.open-meteo.com/v1/forecast?latitude=${kotaTerpilih.lat}&longitude=${kotaTerpilih.lon}&current_weather=true&hourly=temperature_2m,relative_humidity_2m,dew_point_2m,precipitation_probability&daily=weathercode,temperature_2m_max,temperature_2m_min&timezone=auto`;

  try {
    const response = await fetch(API_URL);
    if (!response.ok) throw new Error("Gagal mengambil data");
    const data = await response.json();

    const { temperature, windspeed, winddirection, weathercode } = data.current_weather;
    const infoCuaca = weatherCodeMap[weathercode] || { text: "Mendung", icon: "ri-clouds-fill text-slate-400" };

    if (document.getElementById('info-temp')) document.getElementById('info-temp').innerText = temperature;
    if (document.getElementById('info-status')) document.getElementById('info-status').innerText = infoCuaca.text;
    if (document.getElementById('info-icon')) document.getElementById('info-icon').innerHTML = `<i class="${infoCuaca.icon} text-5xl"></i>`;
    if (document.getElementById('info-wind')) document.getElementById('info-wind').innerText = windspeed;
    if (document.getElementById('info-direction-raw')) document.getElementById('info-direction-raw').innerText = `${winddirection}°`;

    const jarumAngin = document.getElementById('wind-arrow');
    if (jarumAngin) jarumAngin.style.transform = `rotate(${winddirection}deg)`;

    const barProgress = document.getElementById('temp-gauge-bar');
    if (document.getElementById('progress-val')) document.getElementById('progress-val').innerText = `${temperature}°C`;
    if (barProgress) {
      const percent = ((temperature - 10) / 35) * 100;
      barProgress.style.width = `${Math.min(Math.max(percent, 0), 100)}%`;
    }

    if (document.getElementById('idx-humidity')) document.getElementById('idx-humidity').innerText = `${data.hourly.relative_humidity_2m[0]}%`;
    if (document.getElementById('idx-dewpoint')) document.getElementById('idx-dewpoint').innerText = `${data.hourly.dew_point_2m[0]}°C`;

    const aqiScore = Math.round(Math.min(Math.max((temperature * 1.3) + (windspeed * 0.4), 10), 100));
    if (document.getElementById('aqi-score')) document.getElementById('aqi-score').innerHTML = `${aqiScore}<span class="text-xs text-slate-500 font-normal">/100</span>`;
    if (document.getElementById('aqi-bar')) document.getElementById('aqi-bar').style.width = `${aqiScore}%`;

    const elTimeCheck = document.getElementById('info-time');
    const sekarang = new Date();
    if (elTimeCheck) {
      elTimeCheck.innerText = `Last check: ${sekarang.getDate()} ${sekarang.toLocaleString('en-US', {month: 'short'})} 2026 ${sekarang.toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit'})}`;
    }

    render7DayForecast(data.daily);
    renderChart(data.hourly);

  } catch (error) {
    console.error(error);
    if (errorAlert) errorAlert.classList.remove('hidden');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  renderCityDropdown("all"); 
  updateLiveMonitorOverview(); 
  updateWeatherDashboard(); 

  if (getCitySelector()) {
    getCitySelector().addEventListener('change', updateWeatherDashboard);
  }

  if (document.getElementById('btn-refresh')) {
    document.getElementById('btn-refresh').addEventListener('click', () => {
      updateWeatherDashboard();
      updateLiveMonitorOverview();
    });
  }

  // LOGIKA AKTIVASI UTAMA INTERAKSI SIDEBAR FILTER REGION
  const menuButtons = document.querySelectorAll('#sidebar-menu .menu-item');
  menuButtons.forEach(button => {
    button.addEventListener('click', (e) => {
      e.preventDefault();
      const filterValue = button.getAttribute('data-filter');

      // Update Visual Highlight Active Sidebar Button
      menuButtons.forEach(btn => {
        btn.classList.remove('bg-gradient-to-r', 'from-sky-500/10', 'to-transparent', 'text-sky-400', 'border', 'border-sky-500/10', 'font-bold');
        btn.classList.add('text-slate-400', 'font-medium');
      });
      button.classList.remove('text-slate-400', 'font-medium');
      button.classList.add('bg-gradient-to-r', 'from-sky-500/10', 'to-transparent', 'text-sky-400', 'border', 'border-sky-500/10', 'font-bold');

      // Ubah isi opsi kota di dropdown berdasarkan filter region
      renderCityDropdown(filterValue);
      // Langsung panggil data kota pertama hasil filter tersebut
      updateWeatherDashboard();
    });
  });

  setInterval(updateWeatherDashboard, REFRESH_RATE);
});