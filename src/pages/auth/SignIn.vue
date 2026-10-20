<template>
  <div
    class="page-header align-items-start min-vh-100"
    style="
      background-image: url('https://images.unsplash.com/photo-1497294815431-9365093b7331?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1950&q=80');
    "
  >
    <span class="mask bg-gradient-dark opacity-6"></span>
    <div class="container my-auto">
      <div class="row">
        <div class="col-lg-4 col-md-8 col-12 mx-auto">
          <div class="card z-index-0 fadeIn3 fadeInBottom">
            <div class="card-header p-0 position-relative mt-n4 mx-3 z-index-2">
              <div
                class="bg-gradient-success shadow-success border-radius-lg py-3 pe-1"
              >
                <h4 class="text-white font-weight-bolder text-center mt-2 mb-0">
                  Впрокат ЦРМ
                </h4>

              </div>
            </div>
            <div class="card-body">
              <form role="form" class="text-start mt-3" @submit.prevent="onSubmit">
                <p v-if="loginError" class="text-danger text-sm login-error" role="alert">{{ loginError }}</p>
                <div class="mb-3">
                  <material-input
                    id="login"
                    type="text"
                    label="Логин"
                    name="login"
                    isRequired
                    v-model:value="login"
                  />
                </div>
                <div class="mb-3">
                  <material-input
                    id="password"
                    type="password"
                    label="Пароль"
                    name="password"
                    isRequired
                    v-model:value="password"
                  />
                </div>
                <div class="text-center">
                  <material-button
                    class="my-4 mb-2"
                    variant="gradient"
                    color="success"
                    fullWidth
                    type="submit"
                    :disabled="isSubmitting"
                    >{{ isSubmitting ? 'Вход…' : 'Войти' }}</material-button
                  >
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
    <footer class="footer position-absolute bottom-2 py-2 w-100">
      <div class="container">
      </div>
    </footer>
  </div>
</template>

<script>
import MaterialInput from "@/components/MaterialInput.vue";
import MaterialButton from "@/components/MaterialButton.vue";
import { mapMutations } from "vuex";

import {ref} from "vue";
import {apiPost, TOKEN_USER_NAME} from "../../api.js";
import { authErrorMessage } from "@/utils/authError";

export default {
  name: "sign-in",
  setup() {
    const login = ref(''),
        password = ref(''),
        session_time = ref(60);
    const loginError = ref('');
    const isSubmitting = ref(false);

    const onSubmit = async () => {
      if (isSubmitting.value) return;
      loginError.value = '';
      isSubmitting.value = true;
      try {
        let result = await apiPost('pub/auths/login', {
            login: login.value.trim(),
            password: password.value,
            session_time: session_time.value
        }, { notify: false });

        if (result.status === true && result.data?.api_token) {
            localStorage.setItem(TOKEN_USER_NAME, result.data.api_token);
            window.location.assign("/dashboard");
        } else {
            loginError.value = authErrorMessage(result);
        }
      } catch (error) {
        loginError.value = error.response
          ? authErrorMessage(error.response.data)
          : 'Не удалось связаться с сервером. Проверьте подключение и попробуйте снова.';
      } finally {
        isSubmitting.value = false;
      }
    }

    return {
      login,
      password,
      session_time,
      loginError,
      isSubmitting,
      onSubmit
    }
  },
  components: {
    MaterialInput,
    MaterialButton,
  },
  beforeMount() {
    this.toggleEveryDisplay();
    this.toggleHideConfig();
  },
  beforeUnmount() {
    this.toggleEveryDisplay();
    this.toggleHideConfig();
  },
  methods: {
    ...mapMutations(["toggleEveryDisplay", "toggleHideConfig"]),
  },
};
</script>

<style scoped>
.login-error { white-space: pre-line; }
</style>
