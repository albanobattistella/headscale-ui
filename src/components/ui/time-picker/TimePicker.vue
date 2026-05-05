<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import { ref, watch } from "vue";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { cn } from "@/lib/utils";

defineOptions({
  inheritAttrs: false,
});

const props = withDefaults(
  defineProps<{
    modelValue?: string;
    disabled?: boolean;
    hourLabel?: string;
    minuteLabel?: string;
    testIdPrefix?: string;
    class?: HTMLAttributes["class"];
  }>(),
  {
    modelValue: "00:00",
    disabled: false,
    hourLabel: "Hour",
    minuteLabel: "Minute",
    testIdPrefix: undefined,
  },
);

const emit = defineEmits<{
  "update:modelValue": [value: string];
}>();

const hourOptions = Array.from({ length: 24 }, (_, index) => pad(index));
const minuteOptions = Array.from({ length: 60 }, (_, index) => pad(index));

const selectedHour = ref("00");
const selectedMinute = ref("00");

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function parseTime(value: string | undefined) {
  const match = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(value ?? "");
  if (!match) {
    return { hour: "00", minute: "00" };
  }

  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return { hour: "00", minute: "00" };
  }

  return { hour: pad(hour), minute: pad(minute) };
}

function syncFromModel(value: string | undefined) {
  const parsed = parseTime(value);
  selectedHour.value = parsed.hour;
  selectedMinute.value = parsed.minute;
}

function updateTime(hour: string, minute: string) {
  selectedHour.value = hour;
  selectedMinute.value = minute;
  emit("update:modelValue", `${hour}:${minute}`);
}

watch(
  () => props.modelValue,
  (value) => syncFromModel(value),
  { immediate: true },
);
</script>

<template>
  <div v-bind="$attrs" :class="cn('grid grid-cols-2 gap-2', props.class)" data-slot="time-picker">
    <NativeSelect
      :model-value="selectedHour"
      :disabled="disabled"
      :data-testid="testIdPrefix ? `${testIdPrefix}-hour` : undefined"
      :aria-label="hourLabel"
      @update:model-value="updateTime($event, selectedMinute)"
    >
      <NativeSelectOption v-for="hour in hourOptions" :key="hour" :value="hour">
        {{ hour }}
      </NativeSelectOption>
    </NativeSelect>
    <NativeSelect
      :model-value="selectedMinute"
      :disabled="disabled"
      :data-testid="testIdPrefix ? `${testIdPrefix}-minute` : undefined"
      :aria-label="minuteLabel"
      @update:model-value="updateTime(selectedHour, $event)"
    >
      <NativeSelectOption v-for="minute in minuteOptions" :key="minute" :value="minute">
        {{ minute }}
      </NativeSelectOption>
    </NativeSelect>
  </div>
</template>
