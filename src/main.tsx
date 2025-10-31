import { StrictMode } from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider, createRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'
import './styles.css'

console.log('🚀 Application starting...')

const router = createRouter({ routeTree })

console.log('✅ Router created successfully')
console.log('📍 Current path:', window.location.pathname)

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

const rootElement = document.getElementById('root')
if (!rootElement) {
  console.error('❌ Root element not found!')
} else {
  console.log('✅ Root element found, mounting React...')
  ReactDOM.createRoot(rootElement).render(
    <StrictMode>
      <RouterProvider router={router} />
    </StrictMode>
  )
  console.log('✅ React mounted')
}
