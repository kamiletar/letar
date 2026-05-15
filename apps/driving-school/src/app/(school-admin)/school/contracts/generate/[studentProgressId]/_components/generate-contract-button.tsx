'use client'

import { Box, Button, Card, HStack, NativeSelect, Text, VStack } from '@chakra-ui/react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { LuDownload, LuFileCheck, LuLoader } from 'react-icons/lu'

import { toaster } from '@/app/_components/ui/toaster'

import { generateContractAction } from '../../_actions/generate-contract.action'

interface Template {
  id: string
  name: string
  type: string
  typeLabel: string
  version: string
}

interface GenerateContractButtonProps {
  studentProgressId: string
  schoolId: string
  templates: Template[]
}

export function GenerateContractButton({ studentProgressId, schoolId, templates }: GenerateContractButtonProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [selectedTemplateId, setSelectedTemplateId] = useState(templates[0]?.id || '')
  const [generatedContract, setGeneratedContract] = useState<{
    contractId: string
    pdfUrl: string
    contractNumber: string
  } | null>(null)

  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId)

  const handleGenerate = () => {
    if (!selectedTemplateId) {
      toaster.error({ title: 'Выберите шаблон' })
      return
    }

    startTransition(async () => {
      const result = await generateContractAction(studentProgressId, selectedTemplateId)

      if (!result.success) {
        toaster.error({ title: result.error })
        return
      }

      setGeneratedContract(result.data)
      toaster.success({ title: `Договор ${result.data.contractNumber} создан` })
      router.refresh()
    })
  }

  if (generatedContract) {
    return (
      <Card.Root borderColor="green.500" borderWidth={2}>
        <Card.Body>
          <VStack gap={4}>
            <HStack gap={2} color="green.fg">
              <LuFileCheck size={24} />
              <Text fontWeight="semibold">Договор успешно создан!</Text>
            </HStack>

            <Box>
              <Text fontSize="sm" color="fg.muted">
                Номер договора
              </Text>
              <Text fontSize="xl" fontWeight="bold">
                № {generatedContract.contractNumber}
              </Text>
            </Box>

            <HStack gap={4}>
              <Button asChild colorPalette="blue">
                {/* oxlint-disable-next-line nextjs/no-html-link-for-pages -- внешняя ссылка на PDF файл */}
                <a href={generatedContract.pdfUrl} target="_blank" rel="noopener noreferrer">
                  <LuDownload />
                  Скачать PDF
                </a>
              </Button>
              <Button variant="outline" onClick={() => setGeneratedContract(null)}>
                Создать ещё
              </Button>
            </HStack>
          </VStack>
        </Card.Body>
      </Card.Root>
    )
  }

  return (
    <VStack align="stretch" gap={4}>
      <Box>
        <Text fontSize="sm" fontWeight="medium" mb={2}>
          Шаблон договора
        </Text>
        <NativeSelect.Root>
          <NativeSelect.Field value={selectedTemplateId} onChange={(e) => setSelectedTemplateId(e.target.value)}>
            {templates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name} ({template.typeLabel}, v{template.version})
              </option>
            ))}
          </NativeSelect.Field>
          <NativeSelect.Indicator />
        </NativeSelect.Root>
      </Box>

      {selectedTemplate && (
        <Box p={3} bg="bg.subtle" borderRadius="md">
          <HStack justify="space-between" fontSize="sm">
            <Text color="fg.muted">Тип:</Text>
            <Text>{selectedTemplate.typeLabel}</Text>
          </HStack>
          <HStack justify="space-between" fontSize="sm" mt={1}>
            <Text color="fg.muted">Версия:</Text>
            <Text>{selectedTemplate.version}</Text>
          </HStack>
        </Box>
      )}

      <HStack justify="flex-end" gap={4}>
        <Button asChild variant="outline" disabled={!selectedTemplateId}>
          <Link href={`/school/contracts/templates/${schoolId}/${selectedTemplateId}/preview`}>
            Предпросмотр шаблона
          </Link>
        </Button>
        <Button colorPalette="blue" onClick={handleGenerate} loading={isPending} disabled={!selectedTemplateId}>
          {isPending ? (
            <>
              <LuLoader className="animate-spin" />
              Генерация...
            </>
          ) : (
            <>Сгенерировать договор</>
          )}
        </Button>
      </HStack>
    </VStack>
  )
}
