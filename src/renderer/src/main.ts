import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { useUiStore } from './stores/uiStore'
import './assets/main.css'

const app = createApp(App)
const pinia = createPinia()
app.use(pinia)

// Terapkan tema sebelum render pertama agar tidak berkedip.
useUiStore(pinia).initTheme()

app.mount('#app')
