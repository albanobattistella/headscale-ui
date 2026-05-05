<script setup lang="ts">
import type { DateValue } from "@internationalized/date";
import { fromDate, getLocalTimeZone } from "@internationalized/date";
import { CalendarClock } from "lucide-vue-next";
import type { HTMLAttributes } from "vue";
import { computed, ref, useAttrs, watch } from "vue";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

defineOptions({
  inheritAttrs: false,
});

const props = withDefaults(
  defineProps<{
    id?: string;
    modelValue: string;
    locale?: string;
    placeholder?: string;
    required?: boolean;
    testId?: string;
    class?: HTMLAttributes["class"];
  }>(),
  {
    id: undefined,
    locale: "en",
    placeholder: "Pick date and time",
    required: false,
    testId: undefined,
  },
);

const emit = defineEmits<{
  "update:modelValue": [value: string];
}>();

const timeZone = getLocalTimeZone();
const attrs = useAttrs();
const calendarOpen = ref(false);
const selectedDate = ref<DateValue>();
const calendarPlaceholder = ref<DateValue>();
const selectedHour = ref("00");
const selectedMinute = ref("00");

const hourOptions = Array.from({ length: 24 }, (_, index) => pad(index));
const minuteOptions = Array.from({ length: 60 }, (_, index) => pad(index));
const resolvedTestId = computed(() => props.testId ?? String(attrs["data-testid"] ?? ""));

const displayValue = computed(() => {
  if (!selectedDate.value) {
    return props.placeholder;
  }

  const date = selectedDate.value.toDate(timeZone);
  date.setHours(Number(selectedHour.value), Number(selectedMinute.value), 0, 0);

  return new Intl.DateTimeFormat(props.locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
});

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function toLocalDateTimeValue(date: DateValue, hour: string, minute: string) {
  return `${date.year}-${pad(date.month)}-${pad(date.day)}T${hour}:${minute}`;
}

function parseLocalDateTime(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  const parsedDate = match
    ? new Date(
        Number(match[1]),
        Number(match[2]) - 1,
        Number(match[3]),
        Number(match[4]),
        Number(match[5]),
      )
    : new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  return {
    date: fromDate(parsedDate, timeZone),
    hour: pad(parsedDate.getHours()),
    minute: pad(parsedDate.getMinutes()),
  };
}

function syncFromModel(value: string) {
  const parsed = parseLocalDateTime(value);
  if (!parsed) {
    selectedDate.value = undefined;
    calendarPlaceholder.value = undefined;
    selectedHour.value = "00";
    selectedMinute.value = "00";
    return;
  }

  selectedDate.value = parsed.date;
  calendarPlaceholder.value = parsed.date;
  selectedHour.value = parsed.hour;
  selectedMinute.value = parsed.minute;
}

function emitValue(
  date: DateValue | undefined = selectedDate.value,
  hour = selectedHour.value,
  minute = selectedMinute.value,
) {
  if (!date) {
    emit("update:modelValue", "");
    return;
  }

  emit("update:modelValue", toLocalDateTimeValue(date, hour, minute));
}

function selectDate(value: DateValue | undefined) {
  if (!value) {
    return;
  }

  selectedDate.value = value;
  calendarPlaceholder.value = value;
  calendarOpen.value = false;
  emitValue(value);
}

function selectHour(value: string) {
  selectedHour.value = value;
  emitValue(selectedDate.value, value, selectedMinute.value);
}

function selectMinute(value: string) {
  selectedMinute.value = value;
  emitValue(selectedDate.value, selectedHour.value, value);
}

watch(
  () => props.modelValue,
  (value) => syncFromModel(value),
  { immediate: true },
);
</script>

<template>
  <div :class="cn('grid gap-2 sm:flex sm:items-center', props.class)" data-slot="date-time-picker">
    <Popover v-model:open="calendarOpen">
      <PopoverTrigger as-child>
        <Button
          :id="id"
          type="button"
          variant="outline"
          :data-testid="resolvedTestId || undefined"
          :aria-required="required"
          class="w-full justify-start text-start font-normal sm:min-w-0 sm:flex-1"
        >
          <CalendarClock class="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <span class="min-w-0 truncate">{{ displayValue }}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent class="w-auto p-0" align="start">
        <Calendar
          :model-value="selectedDate"
          v-model:placeholder="calendarPlaceholder"
          :locale="locale"
          layout="month-and-year"
          @update:model-value="selectDate"
        />
      </PopoverContent>
    </Popover>

    <div class="grid grid-cols-2 gap-2 sm:w-40 sm:shrink-0">
      <NativeSelect
        :model-value="selectedHour"
        :data-testid="resolvedTestId ? `${resolvedTestId}-hour` : undefined"
        aria-label="Hour"
        @update:model-value="selectHour"
      >
        <NativeSelectOption v-for="hour in hourOptions" :key="hour" :value="hour">
          {{ hour }}
        </NativeSelectOption>
      </NativeSelect>
      <NativeSelect
        :model-value="selectedMinute"
        :data-testid="resolvedTestId ? `${resolvedTestId}-minute` : undefined"
        aria-label="Minute"
        @update:model-value="selectMinute"
      >
        <NativeSelectOption v-for="minute in minuteOptions" :key="minute" :value="minute">
          {{ minute }}
        </NativeSelectOption>
      </NativeSelect>
    </div>
  </div>
</template>
