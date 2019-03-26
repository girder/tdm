import Vuetify from 'vuetify';
import VueAsyncComputed from 'vue-async-computed';

import * as components from './components';
import * as utils from './utils';

import vuetifyConfig from './utils/vuetify.config';

export default function install(Vue) {
  Vue.use(Vuetify, vuetifyConfig);
  Vue.use(VueAsyncComputed);
}

export {
  components,
  utils,
};
