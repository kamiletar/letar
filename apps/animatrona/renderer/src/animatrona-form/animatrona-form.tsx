'use client'

/**
 * AnimatronaForm — расширенный Form компонент для animatrona
 *
 * Включает:
 * - 2 Field компонента (FolderPath — выбор папки через Electron, CqSlider — качество с инверсией)
 * - 15 Select компонентов для ENUM'ов приложения
 * - 1 Segmented компонент для пресетов кодирования
 *
 * @example
 * ```tsx
 * import { AnimatronaForm } from '@/animatrona-form'
 *
 * <AnimatronaForm initialValue={data} onSubmit={handleSubmit}>
 *   <AnimatronaForm.Field.String name="name" label="Название" />
 *   <AnimatronaForm.Field.FolderPath name="folderPath" label="Папка" />
 *   <AnimatronaForm.Field.CqSlider name="cq" label="Качество" />
 *   <AnimatronaForm.Select.RateControl name="rateControl" label="Rate Control" />
 *   <AnimatronaForm.Select.ChapterType name="chapterType" label="Тип главы" />
 *   <AnimatronaForm.Segmented.Preset name="preset" label="Пресет" />
 *   <AnimatronaForm.Button.Submit>Сохранить</AnimatronaForm.Button.Submit>
 * </AnimatronaForm>
 * ```
 */

import { createForm } from '@letar/forms'

// Field компоненты со специальной логикой
import { FieldCqSlider, FieldFolderPath } from './fields'

// Segmented control компоненты
import { SegmentedPreset } from './segmented'

// Select компоненты для ENUM'ов
import {
  // Anime
  SelectAnimeStatus,
  // Encoding
  SelectBRefMode,
  // Chapters & Media
  SelectChapterType,
  SelectFileCategory,
  SelectMultipass,
  SelectRateControl,
  SelectRelationKind,
  SelectSeasonType,
  SelectTrackPreference,
  SelectTune,
  SelectVideoCodec,
} from './selects'

export const AnimatronaForm = createForm({
  extraFields: {
    // Electron-специфичные поля
    FolderPath: FieldFolderPath, // Выбор папки через Electron dialog
    CqSlider: FieldCqSlider, // Слайдер качества с инверсией (15=высокое, 40=низкое)
  },

  extraSelects: {
    // Anime
    AnimeStatus: SelectAnimeStatus, // ONGOING, COMPLETED, ANNOUNCED
    SeasonType: SelectSeasonType, // TV, OVA, ONA, MOVIE, SPECIAL

    // Encoding
    RateControl: SelectRateControl, // VBR, CONSTQP, CQ
    Tune: SelectTune, // NONE, HQ, UHQ, ULL, LL
    Multipass: SelectMultipass, // DISABLED, QRES, FULLRES
    BRefMode: SelectBRefMode, // DISABLED, EACH, MIDDLE
    VideoCodec: SelectVideoCodec, // av1, hevc, h264

    // Chapters & Media
    ChapterType: SelectChapterType, // CHAPTER, OP, ED, RECAP, PREVIEW
    FileCategory: SelectFileCategory, // POSTER, SCREENSHOT, THUMBNAIL, FONT
    TrackPreference: SelectTrackPreference, // RUSSIAN_DUB, ORIGINAL_SUB, AUTO
    // v0.28.0: VideoKind удалён — теперь в AnimeManifest (IPFS)

    // Metadata
    // v0.28.0: ExternalLinkKind, PersonRole удалены — теперь в AnimeManifest (IPFS)
    RelationKind: SelectRelationKind, // SEQUEL, PREQUEL, SIDE_STORY, ...
  },
})

// Также экспортируем сегментированные контролы через отдельный объект
// так как createForm их не поддерживает напрямую
export const AnimatronaSegmented = {
  Preset: SegmentedPreset,
}
