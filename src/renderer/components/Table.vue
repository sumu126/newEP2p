<template>
  <div class="data-table">
    <div class="table-header" v-if="showHeader">
      <div class="table-title">{{ title }}</div>
      <div class="table-controls">
        <slot name="controls"></slot>
      </div>
    </div>
    <div class="table-wrapper">
      <table class="table">
        <thead>
          <tr>
            <th v-for="column in columns" :key="column.key" :class="column.align ? `text-${column.align}` : ''">
              {{ column.title }}
            </th>
            <th v-if="actions">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, index) in data" :key="row.id || index">
            <td v-for="column in columns" :key="column.key" :class="column.align ? `text-${column.align}` : ''">
              <template v-if="column.render">
                <component :is="column.render" :record="row" :index="index" />
              </template>
              <template v-else>
                {{ getNestedValue(row, column.key) }}
              </template>
            </td>
            <td v-if="actions" class="text-center">
              <slot name="actions" :record="row" :index="index"></slot>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <div class="table-pagination" v-if="pagination">
      <div class="pagination-info">
        显示第 {{ (currentPage - 1) * pageSize + 1 }} 到 {{ Math.min(currentPage * pageSize, total) }} 条，
        共 {{ total }} 条
      </div>
      <div class="pagination-controls">
        <button 
          @click="changePage(currentPage - 1)" 
          :disabled="currentPage <= 1"
          class="btn btn-sm btn-outline"
        >
          上一页
        </button>
        <span class="page-info">{{ currentPage }} / {{ totalPages }}</span>
        <button 
          @click="changePage(currentPage + 1)" 
          :disabled="currentPage >= totalPages"
          class="btn btn-sm btn-outline"
        >
          下一页
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';

interface Column {
  title: string;
  key: string;
  align?: 'left' | 'center' | 'right';
  render?: (props: { record: any; index: number }) => any;
}

interface Props {
  data: any[];
  columns: Column[];
  title?: string;
  showHeader?: boolean;
  actions?: boolean;
  pagination?: boolean;
  pageSize?: number;
}

const props = withDefaults(defineProps<Props>(), {
  title: '数据表格',
  showHeader: true,
  actions: false,
  pagination: false,
  pageSize: 10,
});

// 分页相关
const currentPage = ref(1);
const total = computed(() => props.data.length);
const totalPages = computed(() => Math.ceil(total.value / props.pageSize));

const changePage = (page: number) => {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page;
  }
};

// 获取嵌套属性值
const getNestedValue = (obj: any, path: string) => {
  return path.split('.').reduce((current, key) => current?.[key], obj);
};
</script>

<style scoped>
.data-table {
  background: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #eee;
  background-color: #fafafa;
}

.table-title {
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.table-controls {
  display: flex;
  gap: 10px;
}

.table-wrapper {
  overflow-x: auto;
}

.table {
  width: 100%;
  border-collapse: collapse;
}

.table th,
.table td {
  padding: 12px 16px;
  text-align: left;
  border-bottom: 1px solid #eee;
}

.table th {
  background-color: #f8f9fa;
  font-weight: 600;
  color: #555;
  position: sticky;
  top: 0;
}

.table tbody tr:hover {
  background-color: #f5f9ff;
}

.text-center {
  text-align: center;
}

.text-right {
  text-align: right;
}

.text-left {
  text-align: left;
}

.table-pagination {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-top: 1px solid #eee;
  background-color: #fafafa;
}

.pagination-info {
  color: #666;
  font-size: 14px;
}

.pagination-controls {
  display: flex;
  align-items: center;
  gap: 10px;
}

.page-info {
  color: #666;
  margin: 0 10px;
}

.btn {
  padding: 6px 12px;
  border: 1px solid #ddd;
  background: white;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.btn:hover:not(:disabled) {
  background: #f5f5f5;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-outline {
  background: transparent;
}
</style>