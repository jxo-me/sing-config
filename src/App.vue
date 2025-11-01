<script setup lang="ts">
import Editor from './pages/Editor.vue';
</script>

<template>
  <Editor />
</template>

<!-- 引入 Material Design 3 主题 -->
<style>
@import './themes/material-light.css';
</style>

<style>
/* 全局样式：确保根元素无滚动条 */
html, body {
  margin: 0;
  padding: 0;
  height: 100%;
  width: 100%;
  overflow: hidden; /* 确保 html 和 body 无滚动条 */
}

#app {
  height: 100%;
  width: 100%;
  overflow: hidden; /* 确保 #app 容器无滚动条 */
}
</style>

<style scoped>
:host { display: contents; }
</style>