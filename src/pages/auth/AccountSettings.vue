<script setup>

import {ref, watch} from "vue";
import {useStore} from "vuex";
import Drawer from "@components/Drawer.vue";
import {apiGet, apiPost,headers} from "@app/api.js";

const emit = defineEmits(['reload', 'close']);
let props = defineProps([
  'show'
]);

let user = ref({});
let load = ref(true);
const store = useStore();
let showPassword = ref(false);
let showPassword2 = ref(false);

watch(() => [props.show], () => {
  loading();
})

async function loading() {
  if (!props.show) return;
  load.value = true;
  store.dispatch('user/getUser')
      .then((data) => {
        user.value = store.state.user.user;
      })
  load.value = false;
}

async function save() {
  let res = await apiPost("save_profile", user.value);
  if(res.user){
    store.commit("user/setUser",res.user);
  }
  if (res.close) {
    emit("close");
  }
}

async function sendEmail(type) {
  await apiPost("users/save/send_email", {id: user.value.id, email: type});
}
function generatePassword(){
  const pass = Math.random().toString(36).slice(-8);
  user.value.password = pass;
  user.value.password2 = pass;

}

function generateToken(){
    user.value.telegram_token = Math.random().toString(36).slice(-6);
}
</script>

<template>
  <Drawer v-if="user"
          title="Настройки профиля"
          :show="props.show"
          @close="emit('close')"
  >
    <template v-slot:body >
        <div class="mb-3">
          <label for="name">ФИО</label>
          <input id="name" class="form-control" v-model="user.name"/>
        </div>
        <div class="mb-3">
            <label for="email">E-mail</label>
            <input id="email" class="form-control" v-model="user.email" />
        </div>
      <a-divider></a-divider>
        <div class="mb-3">
          <label for="password">Новый пароль</label>
          <div class="input-group">
            <input id="password" :type="showPassword?'text':'password'" class="form-control" v-model="user.password"
                   autocomplete="new-password" />
            <button type="button" class="btn btn-outline-primary input-group-append"
                    @click="generatePassword()"
            >
              <i class="fas fa-dice"></i>
            </button>
            <button type="button" class="btn btn-outline-primary input-group-append"
                    @click="showPassword = !showPassword"
            >
              <i class="fa fa-eye" v-if="!showPassword"></i>
              <i class="fa fa-eye-slash" v-else></i>
            </button>
          </div>
        </div>
        <div class="w-100">
          <label for="password2">Повторите пароль</label>

          <div class="input-group">
            <input id="password2" :type="showPassword2?'text':'password'" class="form-control" v-model="user.password2"
                   autocomplete="new-password2" />

            <button type="button"  class="btn btn-outline-primary input-group-append"
                    @click="showPassword2 = !showPassword2"
            >

              <i class="fa fa-eye" v-if="!showPassword2"></i>
              <i class="fa fa-eye-slash" v-else></i>
            </button>
          </div>


      </div>
    </template>

    <template v-slot:footer>
      <button class="btn btn-success w-100" @click="save">
        <i class="fa fa-save"></i> Сохранить
      </button>
    </template>
  </Drawer>
</template>

<style scoped lang="scss">

</style>
