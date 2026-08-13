'use client'

import { useDocsSearch } from 'fumadocs-core/search/client'
import { staticClient } from 'fumadocs-core/search/client/orama-static'
import {
  SearchDialog,
  SearchDialogClose,
  SearchDialogContent,
  SearchDialogFooter,
  SearchDialogHeader,
  SearchDialogIcon,
  SearchDialogInput,
  SearchDialogList,
  SearchDialogOverlay,
  type SharedProps,
} from 'fumadocs-ui/components/dialog/search'
import { useI18n } from 'fumadocs-ui/contexts/i18n'
import { useMemo } from 'react'

export function CustomSearchDialog(props: SharedProps) {
  const { locale } = useI18n()

  // `src/app/api/search/route.ts` экспортирует только `staticGET` (полный индекс, кэшируется на
  // сборке `revalidate = false`) — фильтрация по query/locale/tag обязана идти на клиенте
  // (`staticClient`), сервер её не делает. `type: 'fetch'`, который стоял здесь раньше, ожидает
  // обратного (сервер сам фильтрует по query-параметрам) — несовпадение с реализацией route.ts.
  //
  // Контекстная фильтрация по активному скину (решение 7, P7 PLAN.md) НЕ подключена здесь
  // намеренно: индекс уже умеет читать тег `skins` из frontmatter (см. route.ts), но сегодня ни
  // одна страница его не объявляет — все страницы валидны для обоих скинов (переключаемые
  // примеры кода внутри одной страницы, не раздельные URL). `containsAll`-фильтр по тегу
  // исключает НЕтегированные документы — включить его сейчас означало бы вернуть пустой поиск
  // для всего сайта. Включать вместе с Этапом 2, когда появятся framework/skin-эксклюзивные
  // страницы.
  const client = useMemo(() => staticClient({ locale }), [locale])
  const { search, setSearch, query } = useDocsSearch({ client })

  return (
    <SearchDialog search={search} onSearchChange={setSearch} isLoading={query.isLoading} {...props}>
      <SearchDialogOverlay />
      <SearchDialogContent>
        <SearchDialogHeader>
          <SearchDialogIcon />
          <SearchDialogInput />
          <SearchDialogClose />
        </SearchDialogHeader>
        <SearchDialogList items={query.data !== 'empty' ? query.data : null} />
        <SearchDialogFooter />
      </SearchDialogContent>
    </SearchDialog>
  )
}
