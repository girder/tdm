import '@mdi/font/css/materialdesignicons.min.css'
import 'vuetify/dist/vuetify.min.css';

import Vue from 'vue';
import Tdm from '@';
import App from './App.vue';
import store from '@/store';

Vue.use(Tdm);

new Vue({
  store,
  render: h => h(App),
}).$mount('#app');
