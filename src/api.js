import axios from "axios"

export const API = process.env.VUE_APP_API_URL
export const TOKEN_USER_NAME = process.env.VUE_APP_STORAGE_NAME ?? "user-token"
export const token = localStorage.getItem(TOKEN_USER_NAME)

export const headers = {
  Authorization: `Bearer ${token}`,
}

const config = {
  headers: headers,
}

export const apiGet = async (url, params) => {
  let res = await axios.get(`${API}/${url}`, {
    params,
    headers: config.headers,
  })
  if (res.status === 401) {
    window.location = "/"
  }
  if (res.data.message) {
    // notification[res.data.status]({
    //     message: res.data.message,
    //     description: res.data.description,
    //     placement:'bottomRight'
    // });
    // notify({
    //     title: res.data.message,
    //     type:res.data.status
    // });
    console.log("message", res.data.message)
  }

  return res.data
}

export const apiPost = async (url, data) => {
  let res = await axios.post(`${API}/${url}`, data, config)

  if (res.data.message) {
    // notify({
    //     title: res.data.message,
    //     type:res.data.status
    // });
    // notification[res.data.status]({
    //     message: res.data.message,
    //     description: res.data.description,
    //     placement:'bottomRight'
    // });
    console.log("message", res.data.message)
  }
  if (res.data.error_fields) {
    var labels = document.getElementsByTagName("LABEL")
    for (var i = 0; i < labels.length; i++) {
      labels[i].classList.remove("error")
      if (labels[i].htmlFor !== "") {
        var elem = document.getElementById(labels[i].htmlFor)
        if (elem) elem.label = labels[i]
      }
    }

    res.data.error_fields.forEach((inputId) => {
      let elem = document.getElementById(inputId)
      if (elem && elem.label) {
        console.log(elem.label)
        elem.label.classList.add("error")
      }
    })
  }

  return res.data
}

export const apiPut = async (url, data) => {
  let res = await axios.put(`${API}/${url}`, data, config)

  if (res.data.message) {
    console.log("message", res.data.message)
  }
  if (res.data.error_fields) {
    var labels = document.getElementsByTagName("LABEL")
    for (var i = 0; i < labels.length; i++) {
      labels[i].classList.remove("error")
      if (labels[i].htmlFor !== "") {
        var elem = document.getElementById(labels[i].htmlFor)
        if (elem) elem.label = labels[i]
      }
    }

    res.data.error_fields.forEach((inputId) => {
      let elem = document.getElementById(inputId)
      if (elem && elem.label) {
        console.log(elem.label)
        elem.label.classList.add("error")
      }
    })
  }

  return res.data
}

export const apiDelete = async (url) => {
  let res = await axios.delete(`${API}/${url}`, config)
  return res.data
}
