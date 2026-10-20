<template>
    <form class="form-horizontal" @submit.prevent="onSubmit">
        <div class="mb-3">
            <label for="login" class="form-label">Логин</label>
            <input type="text" class="form-control" id="login" v-model="login" required
                   placeholder="Введите логин">
        </div>

        <div class="mb-3">
            <label class="form-label">Пароль</label>
            <div class="input-group auth-pass-inputgroup">
                <input :type="displayPass?'text':'password'" v-model="password" id="password" class="form-control"
                       placeholder="Ввелите пароль"
                       aria-label="Password" aria-describedby="password-addon">
                <button class="btn btn-light " type="button" id="password-addon" @click="displayPass = !displayPass">
                    <i v-if="displayPass" class="fa fa-eye-slash"></i>
                    <i v-else class="fa fa-eye"></i>
                </button>
            </div>
        </div>

        <!--        <div class="mb-3">-->

        <!--            <label class="form-label">Время жизни сессии</label>-->
        <!--            <select class="form-control select2" v-model="session_time">-->
        <!--                <option value="60" selected>1 час</option>-->
        <!--                <option value="1440">1 день</option>-->
        <!--                <option value="10080">1 неделю</option>-->
        <!--                <option value="43200">1 месяц</option>-->
        <!--            </select>-->
        <!--        </div>-->

        <div class="mt-3">
            <button class="btn btn-primary" type="submit">Войти</button>
        </div>

    </form>
</template>
<script setup>
import {onMounted, ref} from "vue";
import {apiPost, TOKEN_USER_NAME} from "../../api.js";
// import {setCookie} from "@utils/cookies.js";

const login = ref(''),
    password = ref(''),
    session_time = ref(60);

let displayPass = ref(false);
const onSubmit = async () => {
    let result = await apiPost('pub/auths/login', {
        login: login.value.trim(),
        password: password.value,
        session_time: session_time.value
    });

    if (result.status === true && result.data.api_token) {
        console.log(result);
        setTimeout(() => {
            // setCookie(COOKIE_USER_NAME, result.token);
            localStorage.setItem(TOKEN_USER_NAME, result.data.api_token);
            console.log('storage', localStorage.getItem(TOKEN_USER_NAME));
            window.location.assign("/dashboard")
        }, 1000);
    }
}

onMounted(() => {

})
</script>

<style lang="scss">

</style>
