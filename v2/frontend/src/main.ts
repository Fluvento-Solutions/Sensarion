import { createApp } from 'vue';
import { createPinia } from 'pinia';
import { VueQueryPlugin } from '@tanstack/vue-query';
import App from './App.vue';
import { router } from './app/router';
import { queryClient } from './app/queryClient';
import './assets/main.css';

const app = createApp(App);

// Pinia (Client-State)
app.use(createPinia());

// Vue Query (Server-State)
app.use(VueQueryPlugin, { queryClient });

// Vue Router
app.use(router);

app.mount('#app');

