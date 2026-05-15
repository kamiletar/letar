'use client'

/**
 * Клиентская обёртка страницы управления опросами.
 */

import { useState, useTransition } from 'react'

import {
  getSurveyResponsesAction,
  type SurveyResponseWithStudent,
  type SurveyWithStats,
} from '../../_actions/survey.action'

import { SurveyFormDialog } from './survey-form-dialog'
import { SurveyList } from './survey-list'
import { SurveyResponsesTable } from './survey-responses-table'

interface SurveysPageClientProps {
  surveys: SurveyWithStats[]
  organizationId: string
}

type ViewState =
  | { type: 'list' }
  | { type: 'responses'; surveyId: string; surveyName: string; responses: SurveyResponseWithStudent[] }

export function SurveysPageClient({ surveys, organizationId }: SurveysPageClientProps) {
  const [viewState, setViewState] = useState<ViewState>({ type: 'list' })
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingSurvey, setEditingSurvey] = useState<SurveyWithStats | null>(null)
  const [, startTransition] = useTransition()

  const handleCreate = () => {
    setEditingSurvey(null)
    setIsFormOpen(true)
  }

  const handleEdit = (survey: SurveyWithStats) => {
    setEditingSurvey(survey)
    setIsFormOpen(true)
  }

  const handleViewResponses = (surveyId: string) => {
    const survey = surveys.find((s) => s.id === surveyId)
    if (!survey) {
      return
    }

    startTransition(async () => {
      const result = await getSurveyResponsesAction(surveyId)
      if (result.success) {
        setViewState({
          type: 'responses',
          surveyId,
          surveyName: survey.name,
          responses: result.data,
        })
      }
    })
  }

  const handleBack = () => {
    setViewState({ type: 'list' })
  }

  return (
    <>
      {viewState.type === 'list' ? (
        <SurveyList
          surveys={surveys}
          onEdit={handleEdit}
          onCreate={handleCreate}
          onViewResponses={handleViewResponses}
        />
      ) : (
        <SurveyResponsesTable responses={viewState.responses} onBack={handleBack} surveyName={viewState.surveyName} />
      )}

      <SurveyFormDialog
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        organizationId={organizationId}
        survey={editingSurvey}
      />
    </>
  )
}
