# CMakeLists.txt для ass-bridge
#
# Компилирует JNI мост к libass для рендеринга ASS/SSA субтитров

cmake_minimum_required(VERSION 3.18)
project(ass-bridge LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Пути к библиотекам из FFmpeg Kit
# FFmpeg Kit автоматически предоставляет libass и зависимости
set(FFMPEG_KIT_DIR ${CMAKE_SOURCE_DIR}/../../../libs/ffmpeg-kit)

# Если FFmpeg Kit не найден — используем локальные jniLibs
set(JNILIB_DIR ${CMAKE_SOURCE_DIR}/../jniLibs/${ANDROID_ABI})

# Подключение libass (prefab версия — все зависимости включены статически)
if(EXISTS "${JNILIB_DIR}/libass.so")
    add_library(ass SHARED IMPORTED)
    set_target_properties(ass PROPERTIES IMPORTED_LOCATION ${JNILIB_DIR}/libass.so)

    # Prefab версия libass от peerless2012/libass-android включает
    # freetype, fribidi, harfbuzz, fontconfig статически — не нужны отдельные .so
    set(LIBASS_LIBRARIES ass)
    set(LIBASS_FOUND TRUE)

    # Заголовки libass
    include_directories(${CMAKE_SOURCE_DIR}/include)

    message(STATUS "Found libass.so in ${JNILIB_DIR}")
else()
    message(WARNING "libass.so not found in jniLibs. ASS rendering will be stubbed.")
    set(LIBASS_FOUND FALSE)
endif()

# Наша JNI библиотека
add_library(ass-bridge SHARED ass-bridge.cpp)

# Подключаем Android библиотеки
find_library(log-lib log)
find_library(jnigraphics-lib jnigraphics)
find_library(android-lib android)

# Линкуем
if(LIBASS_FOUND)
    target_compile_definitions(ass-bridge PRIVATE LIBASS_AVAILABLE=1)
    target_link_libraries(ass-bridge
        ${LIBASS_LIBRARIES}
        ${android-lib}
        ${jnigraphics-lib}
        ${log-lib}
    )
else()
    target_compile_definitions(ass-bridge PRIVATE LIBASS_AVAILABLE=0)
    target_link_libraries(ass-bridge
        ${android-lib}
        ${jnigraphics-lib}
        ${log-lib}
    )
endif()
