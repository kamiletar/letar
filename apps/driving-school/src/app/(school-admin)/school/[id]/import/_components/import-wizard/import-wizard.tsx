'use client'

import { VStack } from '@chakra-ui/react'

import { StepComplete } from './step-complete'
import { StepMapping } from './step-mapping'
import { StepPreview } from './step-preview'
import { StepTypeSelect } from './step-type-select'
import { StepUpload } from './step-upload'
import type { ImportWizardProps } from './types'
import { useImportWizard } from './use-import-wizard'
import { WizardSteps } from './wizard-steps'

/**
 * Визард импорта данных.
 */
export function ImportWizard({ schoolId, schoolName }: ImportWizardProps) {
  const {
    currentStep,
    dataType,
    selectedFile,
    headers,
    mapping,
    systemFields,
    parsedRows,
    options,
    importResult,
    isPending,
    setMapping,
    setOptions,
    getStepIndex,
    handleTypeSelect,
    handleFileSelect,
    handleFileClear,
    handleGoToPreview,
    handleImport,
    handleBack,
    resetWizard,
  } = useImportWizard(schoolId)

  return (
    <VStack align="stretch" gap={6}>
      <WizardSteps currentStepIndex={getStepIndex()} />

      {currentStep === 'type' && <StepTypeSelect schoolName={schoolName} onSelect={handleTypeSelect} />}

      {currentStep === 'upload' && dataType && (
        <StepUpload
          dataType={dataType}
          selectedFile={selectedFile}
          isLoading={isPending}
          onFileSelect={handleFileSelect}
          onFileClear={handleFileClear}
          onBack={handleBack}
        />
      )}

      {currentStep === 'mapping' && (
        <StepMapping
          headers={headers}
          systemFields={systemFields}
          mapping={mapping}
          onMappingChange={setMapping}
          onNext={handleGoToPreview}
          onBack={handleBack}
        />
      )}

      {currentStep === 'preview' && (
        <StepPreview
          parsedRows={parsedRows}
          systemFields={systemFields}
          mapping={mapping}
          options={options}
          onOptionsChange={setOptions}
          onImport={handleImport}
          onBack={handleBack}
          isPending={isPending}
        />
      )}

      {currentStep === 'complete' && importResult && (
        <StepComplete schoolId={schoolId} importResult={importResult} onReset={resetWizard} />
      )}
    </VStack>
  )
}
