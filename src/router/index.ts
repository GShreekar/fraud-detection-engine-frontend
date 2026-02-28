import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'dashboard',
      component: () => import('@/views/LiveDashboard.vue'),
      meta: { title: 'Live Dashboard' },
    },
    {
      path: '/analyze',
      name: 'analyze',
      component: () => import('@/views/AnalyzeView.vue'),
      meta: { title: 'Analyze Transaction' },
    },
    {
      path: '/scenarios',
      name: 'scenarios',
      component: () => import('@/views/ScenarioGallery.vue'),
      meta: { title: 'Test Scenarios' },
    },
    {
      path: '/history',
      name: 'history',
      component: () => import('@/views/HistoryView.vue'),
      meta: { title: 'Transaction History' },
      children: [
        {
          path: '',
          redirect: { name: 'history-table' },
        },
        {
          path: 'table',
          name: 'history-table',
          component: () => import('@/components/history/HistoryTable.vue'),
        },
        {
          path: 'graph',
          name: 'history-graph',
          component: () => import('@/components/history/HistoryGraph.vue'),
        },
        {
          path: 'heatmap',
          name: 'history-heatmap',
          component: () => import('@/components/history/HistoryHeatmap.vue'),
        },
      ],
    },
    {
      path: '/network',
      name: 'network',
      component: () => import('@/views/NetworkView.vue'),
      meta: { title: 'Fraud Network Graph' },
    },
    {
      path: '/heatmaps',
      name: 'heatmaps',
      component: () => import('@/views/HeatmapView.vue'),
      meta: { title: 'Heatmaps & Analytics' },
    },
  ],
})

router.beforeEach((to) => {
  document.title = `${to.meta.title || 'Dashboard'} — Fraud Detection Engine`
})

export default router
