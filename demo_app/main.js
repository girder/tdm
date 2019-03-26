import 'material-design-icons-iconfont/dist/material-design-icons.css';
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
