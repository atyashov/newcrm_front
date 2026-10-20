<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from "vue"
import Quill from "quill"
import "quill/dist/quill.snow.css"

const props = defineProps({
  modelValue: { type: String, default: "" },
  placeholder: { type: String, default: "Описание" },
  disabled: { type: Boolean, default: false },
  error: { type: Boolean, default: false },
})
const emit = defineEmits(["update:modelValue"])
const container = ref(null)
let editor
let lastEmitted
let observer

const setValue = (value) => {
  if (!editor) return
  const text = value ?? ""
  lastEmitted = text
  // Plain descriptions must remain text, not be interpreted as HTML.
  if (/<\/?[a-z][\s\S]*>/i.test(text)) {
    editor.setContents(editor.clipboard.convert({ html: text }), "silent")
  } else {
    editor.setText(text, "silent")
  }
}
const handleChange = () => {
  lastEmitted = editor.getText().trim() ? editor.getSemanticHTML() : ""
  emit("update:modelValue", lastEmitted)
}
const initialize = () => {
  if (editor || !container.value) return
  editor = new Quill(container.value, {
    theme: "snow",
    placeholder: props.placeholder,
    readOnly: props.disabled,
    formats: ["bold", "italic", "underline", "list", "link"],
    modules: { toolbar: [["bold", "italic", "underline"], [{ list: "ordered" }, { list: "bullet" }], ["link", "clean"]] },
  })
  setValue(props.modelValue)
  editor.root.setAttribute("aria-label", props.placeholder)
  editor.on("text-change", handleChange)
  observer?.disconnect()
}
onMounted(() => {
  // Import pages can contain hundreds of forms: initialize near the viewport.
  if (typeof IntersectionObserver === "undefined") return initialize()
  observer = new IntersectionObserver((entries) => {
    if (entries.some((entry) => entry.isIntersecting)) initialize()
  }, { rootMargin: "300px" })
  observer.observe(container.value)
})
watch(() => props.modelValue, (value) => {
  if (value !== lastEmitted) setValue(value)
})
watch(() => props.disabled, (value) => editor?.enable(!value))
onBeforeUnmount(() => {
  observer?.disconnect()
  editor?.off("text-change", handleChange)
  editor = null
})
</script>

<template>
  <div class="rich-text-editor" :class="{ 'is-invalid': error, 'is-disabled': disabled }">
    <div ref="container" class="rich-text-editor-content"></div>
  </div>
</template>
