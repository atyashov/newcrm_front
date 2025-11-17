<template>
    <div class="login-page">
        <div class="card">
            <div class="card-body">
                <router-link :to="'/'" class="auth-logo">
                    Панель управления
                </router-link>
                <div class="p-2">
                    <router-view/>
                </div>
            </div>
        </div>
    </div>
</template>
<script setup>

// import "@assets/scss/login.scss";

</script>