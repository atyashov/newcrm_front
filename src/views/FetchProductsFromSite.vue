<script setup>
import axios from "axios"
import { onMounted, ref } from "vue"

const url = "https://wprokat.ru/index.php?route=api/simple/products"

const productsList = ref([])
const page = ref(1)
const per_page = ref(100)

const siteLogin = async (url, page, per_page) => {
  const res = await axios.post(`${url}login`, {
    page: page.value,
    per_page: per_page.value,
  })
  if (!res.data.api_token) {
    console.log("ERROR", res.data)
  }
  console.log("res", res)
  return res.data.api_token
}

const products = async (url, token) => {
  try {
    const res = await axios.get(`${url}products`, {
      params: {
        api_token: token,
      },
      headers: {
        "Content-Type": "application/json",
      },
      validateStatus: function (status) {
        return status >= 200 && status < 500 // Resolve or reject the request
      },
    })
    console.log("res", res)
    return res
  } catch (e) {
    console.log("ERROR", e)
  }
}

onMounted(async () => {
  const token = await siteLogin(login, password, url)
  const res = await products(url, token)
  console.log("res", res)
  productsList.value = res.data
})
</script>
<template>
  <h1>Подгружаем!</h1>
  <ul v-if="productsList.length">
    <li v-for="product in productsList" :key="product.id">
      {{ product.name }}
    </li>
  </ul>
</template>
