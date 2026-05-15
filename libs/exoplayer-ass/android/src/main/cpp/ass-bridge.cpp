/**
 * ass-bridge.cpp — JNI мост к libass для рендеринга ASS/SSA субтитров
 *
 * Предоставляет нативные методы для AssSubtitleDecoder.kt:
 * - nativeInit: инициализация libass
 * - nativeLoadTrack: загрузка ASS контента
 * - nativeRender: рендеринг кадра в Bitmap
 * - nativeDestroy: освобождение ресурсов
 */

#include <jni.h>
#include <android/log.h>
#include <android/bitmap.h>
#include <cstring>
#include <string>
#include <memory>

#define LOG_TAG "AssBridge"
#define LOGI(...) __android_log_print(ANDROID_LOG_INFO, LOG_TAG, __VA_ARGS__)
#define LOGW(...) __android_log_print(ANDROID_LOG_WARN, LOG_TAG, __VA_ARGS__)
#define LOGE(...) __android_log_print(ANDROID_LOG_ERROR, LOG_TAG, __VA_ARGS__)

#if LIBASS_AVAILABLE
#include <ass/ass.h>

// Глобальные объекты libass (один экземпляр на decoder)
struct AssContext {
    ASS_Library* library = nullptr;
    ASS_Renderer* renderer = nullptr;
    ASS_Track* track = nullptr;
    int width = 1920;
    int height = 1080;
};

// Хранилище контекстов по decoder instance
static std::unique_ptr<AssContext> g_context;

/**
 * Блендинг одного ASS_Image в bitmap
 */
static void blend_image(uint32_t* dst, int dst_stride, ASS_Image* img) {
    uint8_t r = (img->color >> 24) & 0xFF;
    uint8_t g = (img->color >> 16) & 0xFF;
    uint8_t b = (img->color >> 8) & 0xFF;
    uint8_t a = 255 - (img->color & 0xFF);  // ASS использует инвертированную альфу

    uint8_t* src = img->bitmap;
    uint32_t* dst_row = dst + img->dst_y * dst_stride + img->dst_x;

    for (int y = 0; y < img->h; y++) {
        for (int x = 0; x < img->w; x++) {
            uint8_t alpha = (src[x] * a) / 255;
            if (alpha == 0) continue;

            uint32_t* pixel = &dst_row[x];

            // Извлекаем текущий цвет (ARGB)
            uint8_t dst_a = (*pixel >> 24) & 0xFF;
            uint8_t dst_r = (*pixel >> 16) & 0xFF;
            uint8_t dst_g = (*pixel >> 8) & 0xFF;
            uint8_t dst_b = (*pixel) & 0xFF;

            // Alpha compositing
            uint8_t out_a = alpha + dst_a * (255 - alpha) / 255;
            if (out_a == 0) continue;

            uint8_t out_r = (r * alpha + dst_r * dst_a * (255 - alpha) / 255) / out_a;
            uint8_t out_g = (g * alpha + dst_g * dst_a * (255 - alpha) / 255) / out_a;
            uint8_t out_b = (b * alpha + dst_b * dst_a * (255 - alpha) / 255) / out_a;

            *pixel = (out_a << 24) | (out_r << 16) | (out_g << 8) | out_b;
        }
        src += img->stride;
        dst_row += dst_stride;
    }
}

#endif // LIBASS_AVAILABLE

extern "C" {

/**
 * Инициализация libass
 */
JNIEXPORT jboolean JNICALL
Java_com_lena_exoplayer_ass_AssSubtitleDecoder_nativeInit(
    JNIEnv* env,
    jobject thiz,
    jint width,
    jint height,
    jstring fontDir
) {
#if LIBASS_AVAILABLE
    // Освобождаем предыдущий контекст если есть
    g_context.reset();
    g_context = std::make_unique<AssContext>();

    // Инициализация библиотеки
    g_context->library = ass_library_init();
    if (!g_context->library) {
        LOGE("Failed to init ass library");
        return JNI_FALSE;
    }

    // Настройка директории шрифтов
    if (fontDir != nullptr) {
        const char* fonts = env->GetStringUTFChars(fontDir, nullptr);
        ass_set_fonts_dir(g_context->library, fonts);
        env->ReleaseStringUTFChars(fontDir, fonts);
    }

    // Инициализация рендерера
    g_context->renderer = ass_renderer_init(g_context->library);
    if (!g_context->renderer) {
        LOGE("Failed to init ass renderer");
        ass_library_done(g_context->library);
        g_context.reset();
        return JNI_FALSE;
    }

    g_context->width = width;
    g_context->height = height;

    // Настройка размера кадра
    ass_set_frame_size(g_context->renderer, width, height);
    ass_set_storage_size(g_context->renderer, width, height);

    // Настройка шрифтов (fallback)
    ass_set_fonts(g_context->renderer, nullptr, "sans-serif", ASS_FONTPROVIDER_AUTODETECT, nullptr, 1);

    // Масштаб шрифтов — будет установлен из Java на основе DPI экрана
    // По умолчанию 3.0 для мобильных (можно переопределить через setFontScale)
    ass_set_font_scale(g_context->renderer, 3.0);

    LOGI("ASS initialized: %dx%d, font scale: 1.5", width, height);
    return JNI_TRUE;
#else
    LOGW("libass not available - ASS rendering disabled");
    return JNI_FALSE;
#endif
}

/**
 * Обновление размера кадра
 */
JNIEXPORT void JNICALL
Java_com_lena_exoplayer_ass_AssSubtitleDecoder_nativeSetFrameSize(
    JNIEnv* env,
    jobject thiz,
    jint width,
    jint height
) {
#if LIBASS_AVAILABLE
    if (g_context && g_context->renderer) {
        g_context->width = width;
        g_context->height = height;
        ass_set_frame_size(g_context->renderer, width, height);
        ass_set_storage_size(g_context->renderer, width, height);
        LOGI("Frame size updated: %dx%d", width, height);
    }
#endif
}

/**
 * Установка масштаба шрифтов
 */
JNIEXPORT void JNICALL
Java_com_lena_exoplayer_ass_AssSubtitleDecoder_nativeSetFontScale(
    JNIEnv* env,
    jobject thiz,
    jfloat scale
) {
#if LIBASS_AVAILABLE
    if (g_context && g_context->renderer) {
        ass_set_font_scale(g_context->renderer, scale);
        LOGI("Font scale set to: %.2f", scale);
    }
#endif
}

/**
 * Загрузка ASS/SSA контента
 */
JNIEXPORT jboolean JNICALL
Java_com_lena_exoplayer_ass_AssSubtitleDecoder_nativeLoadTrack(
    JNIEnv* env,
    jobject thiz,
    jstring content
) {
#if LIBASS_AVAILABLE
    if (!g_context || !g_context->library) {
        LOGE("ASS not initialized");
        return JNI_FALSE;
    }

    // Освободить предыдущий трек
    if (g_context->track) {
        ass_free_track(g_context->track);
        g_context->track = nullptr;
    }

    const char* data = env->GetStringUTFChars(content, nullptr);
    size_t len = strlen(data);

    g_context->track = ass_read_memory(g_context->library, const_cast<char*>(data), len, nullptr);
    env->ReleaseStringUTFChars(content, data);

    if (!g_context->track) {
        LOGE("Failed to load ASS track");
        return JNI_FALSE;
    }

    LOGI("ASS track loaded: %d events", g_context->track->n_events);
    return JNI_TRUE;
#else
    return JNI_FALSE;
#endif
}

/**
 * Рендеринг кадра субтитров в Bitmap
 */
JNIEXPORT jboolean JNICALL
Java_com_lena_exoplayer_ass_AssSubtitleDecoder_nativeRender(
    JNIEnv* env,
    jobject thiz,
    jlong timeMs,
    jobject bitmap
) {
#if LIBASS_AVAILABLE
    if (!g_context || !g_context->renderer || !g_context->track) {
        return JNI_FALSE;
    }

    int changed = 0;
    ASS_Image* img = ass_render_frame(g_context->renderer, g_context->track, timeMs, &changed);

    // Получаем информацию о bitmap
    AndroidBitmapInfo info;
    if (AndroidBitmap_getInfo(env, bitmap, &info) != ANDROID_BITMAP_RESULT_SUCCESS) {
        LOGE("Failed to get bitmap info");
        return JNI_FALSE;
    }

    // Проверяем формат
    if (info.format != ANDROID_BITMAP_FORMAT_RGBA_8888) {
        LOGE("Unsupported bitmap format: %d", info.format);
        return JNI_FALSE;
    }

    // Блокируем пиксели
    void* pixels;
    if (AndroidBitmap_lockPixels(env, bitmap, &pixels) != ANDROID_BITMAP_RESULT_SUCCESS) {
        LOGE("Failed to lock bitmap pixels");
        return JNI_FALSE;
    }

    // Очистить bitmap (прозрачный фон)
    memset(pixels, 0, info.stride * info.height);

    // Отрисовать все изображения субтитров
    while (img) {
        if (img->w > 0 && img->h > 0) {
            blend_image(
                static_cast<uint32_t*>(pixels),
                info.stride / 4,
                img
            );
        }
        img = img->next;
    }

    AndroidBitmap_unlockPixels(env, bitmap);

    return changed != 0 ? JNI_TRUE : JNI_FALSE;
#else
    return JNI_FALSE;
#endif
}

/**
 * Освобождение ресурсов
 */
JNIEXPORT void JNICALL
Java_com_lena_exoplayer_ass_AssSubtitleDecoder_nativeDestroy(
    JNIEnv* env,
    jobject thiz
) {
#if LIBASS_AVAILABLE
    if (g_context) {
        if (g_context->track) {
            ass_free_track(g_context->track);
        }
        if (g_context->renderer) {
            ass_renderer_done(g_context->renderer);
        }
        if (g_context->library) {
            ass_library_done(g_context->library);
        }
        g_context.reset();
        LOGI("ASS destroyed");
    }
#endif
}

} // extern "C"
