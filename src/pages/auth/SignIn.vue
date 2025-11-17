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
                <div class="mb-3">
                  <material-input
                    id="email"
                    type="email"
                    label="Email"
                    name="email"
                    v-model:value="email"
                  />
                </div>
                <div class="mb-3">
                  <material-input
                    id="password"
                    type="password"
                    label="Пароль"
                    name="password"
                    v-model:value="password"
                  />
                </div>
                <div class="text-center">
                  <material-button
                    class="my-4 mb-2"
                    variant="gradient"
                    color="success"
                    fullWidth
                    >Войти</material-button
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

export default {
  name: "sign-in",
  setup() {
    const email = ref(''),
        password = ref(''),
        session_time = ref(60);

    const onSubmit = async () => {
      try {
        let result = await apiPost('pub/auths/login', {
            email: email.value,
            password: password.value,
            session_time: session_time.value
        });

        if (result.status === true && result.data.api_token) {
            console.log(result);
            setTimeout(() => {
                // setCookie(COOKIE_USER_NAME, result.token);
                localStorage.setItem(TOKEN_USER_NAME, result.data.api_token);
                console.log('storage', localStorage.getItem(TOKEN_USER_NAME));
                location.reload()
            }, 1000);
        }
      } catch (error) {
        console.error('Error during form submission:', error);
      }
    }

    return {
      email,
      password,
      session_time,
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
