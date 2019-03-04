import Vuetify from 'vuetify';
import VueAsyncComputed from 'vue-async-computed';

import * as components from './components';
import * as utils from './utils';

export default function install(Vue) {
  Vue.use(Vuetify);
  Vue.use(VueAsyncComputed);
}

export {
  components,
  utils,
};
