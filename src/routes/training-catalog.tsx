import { createFileRoute } from '@tanstack/react-router'
import { TrainingCatalogScreen } from '@/screens/training/training-catalog-screen'

export const Route = createFileRoute('/training-catalog')({ component: TrainingCatalogScreen })
