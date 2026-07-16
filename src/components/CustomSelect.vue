<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from "vue";

const props = defineProps({
  modelValue: {
    type: [String, Number],
    default: "",
  },
  options: {
    type: Array,
    default: () => [],
  },
  disabled: Boolean,
});

const emit = defineEmits(["update:modelValue", "change"]);
const root = ref(null);
const optionElements = ref([]);
const open = ref(false);
const activeIndex = ref(-1);
const listboxId = `select-${Math.random().toString(36).slice(2)}`;

const selectedOption = computed(() => props.options.find((option) => option.value === props.modelValue) || null);

function firstEnabledIndex() {
  return props.options.findIndex((option) => !option.disabled);
}

function selectedIndex() {
  const index = props.options.findIndex((option) => option.value === props.modelValue);
  return index >= 0 && !props.options[index].disabled ? index : firstEnabledIndex();
}

function scrollActiveOptionIntoView() {
  nextTick(() => optionElements.value[activeIndex.value]?.scrollIntoView({ block: "nearest" }));
}

function openList() {
  if (props.disabled || open.value) return;
  open.value = true;
  activeIndex.value = selectedIndex();
  scrollActiveOptionIntoView();
}

function closeList() {
  open.value = false;
}

function toggleList() {
  if (open.value) closeList();
  else openList();
}

function selectOption(option) {
  if (option.disabled) return;
  closeList();
  if (option.value === props.modelValue) return;
  emit("update:modelValue", option.value);
  emit("change", option.value);
}

function moveActive(direction) {
  if (!props.options.length) return;
  let index = activeIndex.value;
  for (let count = 0; count < props.options.length; count += 1) {
    index = (index + direction + props.options.length) % props.options.length;
    if (!props.options[index].disabled) {
      activeIndex.value = index;
      scrollActiveOptionIntoView();
      return;
    }
  }
}

function handleKeydown(event) {
  if (props.disabled) return;
  if (event.key === "ArrowDown" || event.key === "ArrowUp") {
    event.preventDefault();
    if (!open.value) openList();
    else moveActive(event.key === "ArrowDown" ? 1 : -1);
  } else if (event.key === "Home" || event.key === "End") {
    event.preventDefault();
    if (!open.value) openList();
    const indexes = props.options.map((option, index) => (option.disabled ? -1 : index)).filter((index) => index >= 0);
    activeIndex.value = event.key === "Home" ? indexes[0] : indexes.at(-1);
    scrollActiveOptionIntoView();
  } else if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    if (!open.value) openList();
    else if (activeIndex.value >= 0) selectOption(props.options[activeIndex.value]);
  } else if (event.key === "Escape") {
    event.stopPropagation();
    closeList();
  }
}

function handleOutsidePointer(event) {
  if (!root.value?.contains(event.target)) closeList();
}

watch(
  () => props.disabled,
  (disabled) => {
    if (disabled) closeList();
  },
);

document.addEventListener("pointerdown", handleOutsidePointer);
onBeforeUnmount(() => document.removeEventListener("pointerdown", handleOutsidePointer));
</script>

<template>
  <div ref="root" class="custom-select" :class="{ open, disabled }">
    <button type="button" class="custom-select-trigger" role="combobox" :disabled="disabled" @click="toggleList" @keydown="handleKeydown">
      <span>{{ selectedOption?.label || "请选择" }}</span>
    </button>

    <Transition name="select-options">
      <ul v-if="open" :id="listboxId" class="custom-select-options" role="listbox">
        <li
          v-for="(option, index) in options"
          :id="`${listboxId}-${index}`"
          :key="option.value"
          :ref="
            (element) => {
              optionElements[index] = element;
            }
          "
          role="option"
          :class="{
            active: index === activeIndex,
            selected: option.value === modelValue,
            disabled: option.disabled,
          }"
          @pointerenter="!option.disabled && (activeIndex = index)"
          @click="selectOption(option)"
        >
          <span>{{ option.label }}</span>
          <i v-if="option.value === modelValue">✓</i>
        </li>
      </ul>
    </Transition>
  </div>
</template>

<style scoped>
.custom-select {
  position: relative;
  z-index: 1;
}

.custom-select.open {
  z-index: 8;
}

.custom-select-trigger {
  display: flex;
  width: 100%;
  height: 45px;
  padding: 0 13px;
  align-items: center;
  justify-content: space-between;
  border: 1px solid var(--line);
  border-radius: 11px;
  background: rgba(255, 255, 255, 0.045);
  color: inherit;
  cursor: pointer;
}

.custom-select-trigger > i {
  width: 7px;
  height: 7px;
  margin: -4px 2px 0 14px;
  border-right: 1px solid var(--muted);
  border-bottom: 1px solid var(--muted);
  transform: rotate(45deg);
  transition: transform 150ms ease;
}

.open .custom-select-trigger > i {
  margin-top: 4px;
  transform: rotate(225deg);
}

.custom-select-trigger:disabled {
  cursor: wait;
  opacity: 0.55;
}

.custom-select-options {
  position: absolute;
  z-index: 10;
  top: calc(100% + 7px);
  right: 0;
  left: 0;
  max-height: min(240px, 38vh);
  margin: 0;
  padding: 6px;
  overflow: auto;
  border: 1px solid rgba(216, 230, 244, 0.16);
  border-radius: 12px;
  background: rgba(32, 43, 64, 0.99);
  box-shadow: 0 18px 42px rgba(0, 0, 0, 0.45);
  list-style: none;
  scrollbar-width: none;
  backdrop-filter: blur(20px);
}

.custom-select-options::-webkit-scrollbar {
  display: none;
}

.custom-select-options li {
  display: flex;
  min-height: 38px;
  padding: 8px 10px;
  align-items: center;
  justify-content: space-between;
  border-radius: 8px;
  color: #dfe3e8;
  cursor: pointer;
}

.custom-select-options li.active {
  background: rgba(157, 184, 228, 0.1);
}

.custom-select-options li.selected {
  color: var(--accent);
}

.custom-select-options li.disabled {
  color: #66707a;
  cursor: not-allowed;
}

.custom-select-options li i {
  font-style: normal;
}

.select-options-enter-active,
.select-options-leave-active {
  transition: 130ms ease;
}

.select-options-enter-from,
.select-options-leave-to {
  opacity: 0;
  transform: translateY(-5px);
}
</style>
