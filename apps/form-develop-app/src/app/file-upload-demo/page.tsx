'use client'

import { Box, Heading, VStack } from '@chakra-ui/react'
import { Form } from '@letar/forms'
import { useState } from 'react'
import { z } from 'zod/v4'
import { DemoPageLayout, SubmittedDataPreview } from '../_components'

/**
 * Demo schema for FileUpload field
 */
const FileUploadSchema = z.object({
  // Single file (avatar)
  avatar: z
    .array(z.instanceof(File))
    .min(1, 'Avatar is required')
    .max(1, 'Only one file allowed')
    .meta({
      ui: { title: 'Avatar', description: 'Upload your profile picture' },
    }),

  // Multiple images (gallery)
  gallery: z
    .array(z.instanceof(File))
    .max(5, 'Maximum 5 images allowed')
    .meta({
      ui: { title: 'Gallery', description: 'Upload up to 5 images' },
    }),

  // Documents
  documents: z.array(z.instanceof(File)).meta({
    ui: { title: 'Documents' },
  }),

  // Resume (single PDF)
  resume: z
    .array(z.instanceof(File))
    .max(1)
    .meta({
      ui: { title: 'Resume', description: 'Upload your resume (PDF)' },
    }),
})

type FileUploadFormData = z.infer<typeof FileUploadSchema>

const initialValues: FileUploadFormData = {
  avatar: [],
  gallery: [],
  documents: [],
  resume: [],
}

export default function FileUploadDemoPage() {
  const [submittedData, setSubmittedData] = useState<{ [key: string]: string[] } | null>(null)

  const handleSubmit = (data: FileUploadFormData) => {
    // Convert File[] to filenames for display
    setSubmittedData({
      avatar: data.avatar.map((f) => f.name),
      gallery: data.gallery.map((f) => f.name),
      documents: data.documents.map((f) => f.name),
      resume: data.resume.map((f) => f.name),
    })
  }

  return (
    <DemoPageLayout
      title="FileUpload Demo"
      description="Form.Field.FileUpload - File upload with multiple variants"
      maxW="800px"
    >
      <Form initialValue={initialValues} schema={FileUploadSchema} onSubmit={handleSubmit}>
        <VStack gap={8} align="stretch">
          {/* Button variant (default) - single image */}
          <Box>
            <Heading size="sm" mb={2}>
              Button Variant (Single Image)
            </Heading>
            <Form.Field.FileUpload name="avatar" accept="image/*" maxFiles={1} buttonText="Upload avatar" clearable />
          </Box>

          {/* Dropzone variant - multiple images */}
          <Box>
            <Heading size="sm" mb={2}>
              Dropzone Variant (Multiple Images)
            </Heading>
            <Form.Field.FileUpload
              name="gallery"
              variant="dropzone"
              accept="image/*"
              maxFiles={5}
              dropzoneLabel="Drag and drop images here"
              dropzoneDescription="PNG, JPG, WebP up to 5MB each"
              showSize
              clearable
            />
          </Box>

          {/* Dropzone variant - documents */}
          <Box>
            <Heading size="sm" mb={2}>
              Dropzone Variant (Documents)
            </Heading>
            <Form.Field.FileUpload
              name="documents"
              variant="dropzone"
              accept=".pdf,.doc,.docx,.txt"
              maxFiles={10}
              dropzoneLabel="Drop documents here"
              dropzoneDescription="PDF, DOC, DOCX, TXT"
              showSize
              clearable
            />
          </Box>

          {/* Input variant */}
          <Box>
            <Heading size="sm" mb={2}>
              Input Variant
            </Heading>
            <Form.Field.FileUpload name="resume" variant="input" accept=".pdf" maxFiles={1} />
          </Box>

          <Form.Button.Submit>Submit</Form.Button.Submit>
        </VStack>
      </Form>

      <SubmittedDataPreview data={submittedData} title="Submitted Files:" />
    </DemoPageLayout>
  )
}
