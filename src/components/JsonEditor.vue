<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, watch } from 'vue';
import { loadSchema } from '../lib/schema';

const props = defineProps<{ modelValue: string }>();
const emit = defineEmits<{ 
  (e: 'update:modelValue', v: string): void;
  (e: 'gotoLine', line: number, column?: number): void;
}>();

let editor: any;
const container = ref<HTMLElement | null>(null);
let monaco: any;
let changeTimer: number | undefined;

onMounted(async () => {
  monaco = await import('monaco-editor');
  
  // 加载并注册 JSON Schema
  const schema = await loadSchema();
  monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
    validate: true,
    schemas: [{
      uri: 'https://raw.githubusercontent.com/SagerNet/sing-box/v1.12.12/docs/schema.json',
      fileMatch: ['*'],
      schema: schema,
    }],
    allowComments: false,
  });

  editor = monaco.editor.create(container.value!, {
    value: props.modelValue ?? '',
    language: 'json',
    automaticLayout: true,
    minimap: { enabled: false },
    lineNumbers: 'on',
    renderWhitespace: 'selection',
    folding: true,
    tabSize: 2,
    formatOnPaste: true,
    formatOnType: true,
  });
  
  editor.onDidChangeModelContent(() => {
    window.clearTimeout(changeTimer);
    changeTimer = window.setTimeout(() => {
      emit('update:modelValue', editor.getValue());
    }, 300);
  });
});

watch(
  () => props.modelValue,
  (v) => {
    if (editor && v !== editor.getValue()) {
      const pos = editor.getPosition();
      editor.setValue(v ?? '');
      if (pos) editor.setPosition(pos);
    }
  }
);

onBeforeUnmount(() => {
  if (editor) editor.dispose();
});

defineExpose({
  gotoLine: (line: number, column = 1) => {
    if (editor && monaco) {
      editor.setPosition({ lineNumber: line, column });
      editor.revealLineInCenter(line);
      editor.focus();
    }
  },
});
</script>

<template>
  <div ref="container" class="json-editor"></div>
</template>

<style scoped>
.json-editor { width: 100%; height: 100%; }
</style>
