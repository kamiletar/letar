"""Расшифровка аудиозаписи (созвон, интервью) через faster-whisper на GPU.

Устройство: этот процесс — супервизор. Он запускает воркер подпроцессом и
перезапускает его с нужного места, если тот молча упадёт (например exit
code 9 без трассировки — известный баг, см. .claude/skills/transcribe-call/SKILL.md).
Падение — это крах самого процесса, поэтому try/except внутри одного процесса
его не перехватывает; нужен отдельный родитель, который переживёт крах.

Запуск: python transcribe.py <аудио> [опции]
    --compute-type float32|int8_float16   (по умолчанию float32)
    --hotwords "слово1, слово2, ..."      (подсказка модели, опционально)
    --hotwords-file <путь к .txt>         (то же, но из файла — не коммитить с личными терминами)
    --start-sec 0                         (ручной старт с секунды, для докрутки без автоповтора)
    --max-retries 5                       (сколько раз пересобирать после падений подряд)
"""

import argparse
import os
import re
import subprocess
import sys
import time
from pathlib import Path

SAMPLE_RATE = 16000

# Известные галлюцинации Whisper на тишине/музыке — не удаляем, помечаем для ручной проверки
KNOWN_HALLUCINATIONS = (
    "продолжение следует",
    "субтитры делал",
    "субтитры сделал",
    "редактор субтитров",
    "корректор субтитров",
    "подписывайтесь на канал",
    "спасибо за просмотр",
)


def add_cuda_dll_dirs() -> None:
    # cuBLAS/cuDNN из pip-пакетов nvidia-* не лежат в PATH, CTranslate2 иначе их не найдёт
    try:
        import nvidia
    except ImportError:
        return
    for root in nvidia.__path__:
        for sub in ("cublas", "cudnn", "cuda_nvrtc"):
            bin_dir = Path(root) / sub / "bin"
            if bin_dir.is_dir():
                os.add_dll_directory(str(bin_dir))
                os.environ["PATH"] = str(bin_dir) + os.pathsep + os.environ["PATH"]


def fmt(seconds: float) -> str:
    m, s = divmod(int(seconds), 60)
    h, m = divmod(m, 60)
    return f"{h:d}:{m:02d}:{s:02d}"


TIMED_LINE_RE = re.compile(r"^\[(\d+):(\d{2}):(\d{2}) -> (\d+):(\d{2}):(\d{2})\] ?(.*)$")


def parse_timed_line(line: str):
    m = TIMED_LINE_RE.match(line.rstrip("\n"))
    if not m:
        return None
    h1, m1, s1, h2, m2, s2, text = m.groups()
    start = int(h1) * 3600 + int(m1) * 60 + int(s1)
    end = int(h2) * 3600 + int(m2) * 60 + int(s2)
    return start, end, text


def part_paths(audio: Path, start_sec: float):
    suffix = f".from{int(start_sec)}" if start_sec else ""
    return audio.with_suffix(f"{suffix}.timed.txt"), audio.with_suffix(f"{suffix}.txt")


def last_end_second(timed_path: Path) -> float | None:
    if not timed_path.exists():
        return None
    last = None
    with timed_path.open("r", encoding="utf-8") as f:
        for line in f:
            parsed = parse_timed_line(line)
            if parsed:
                last = parsed[1]
    return last


def run_worker(audio: Path, compute_type: str, start_sec: float, hotwords: str) -> int:
    args = [
        sys.executable,
        str(Path(__file__).resolve()),
        "--worker",
        str(audio),
        "--compute-type",
        compute_type,
        "--start-sec",
        str(start_sec),
        "--hotwords",
        hotwords,
    ]
    env = dict(os.environ)
    env["PYTHONIOENCODING"] = "utf-8"
    proc = subprocess.run(args, env=env)
    return proc.returncode


def worker_main(audio: Path, compute_type: str, start_sec: float, hotwords: str) -> None:
    add_cuda_dll_dirs()
    from faster_whisper import WhisperModel, decode_audio
    import faulthandler

    faulthandler.enable()

    timed_path, plain_path = part_paths(audio, start_sec)

    print(f"Модель large-v3, cuda, {compute_type}. Файл: {audio}, старт {fmt(start_sec)}", flush=True)
    model = WhisperModel("large-v3", device="cuda", compute_type=compute_type)

    audio_data = decode_audio(str(audio), sampling_rate=SAMPLE_RATE)[int(start_sec * SAMPLE_RATE) :]
    total = start_sec + len(audio_data) / SAMPLE_RATE

    started = time.time()
    segments, _info = model.transcribe(
        audio_data,
        language="ru",
        beam_size=5,
        best_of=5,
        # На длинных записях контекст прошлого окна провоцирует зацикливание фраз
        condition_on_previous_text=False,
        # VAD вырезает тишину — главный источник галлюцинаций вида «Субтитры сделал…»
        vad_filter=True,
        vad_parameters={"min_silence_duration_ms": 500},
        hotwords=hotwords or None,
    )
    print(f"Длительность: {fmt(total)}, старт с {fmt(start_sec)}", flush=True)

    with timed_path.open("w", encoding="utf-8") as timed, plain_path.open("w", encoding="utf-8") as plain:
        for seg in segments:
            text = seg.text.strip()
            start, end = seg.start + start_sec, seg.end + start_sec
            line = f"[{fmt(start)} -> {fmt(end)}] {text}"
            timed.write(line + "\n")
            plain.write(text + "\n")
            timed.flush()
            plain.flush()
            pct = end / total * 100 if total else 0
            print(f"{pct:5.1f}% {line}", flush=True)

    print(f"Часть готова за {fmt(time.time() - started)}: {timed_path}", flush=True)


def mark_hallucinations(text: str) -> str:
    low = text.lower()
    if any(h in low for h in KNOWN_HALLUCINATIONS):
        return f"[ВОЗМОЖНАЯ ГАЛЛЮЦИНАЦИЯ WHISPER, ПРОВЕРИТЬ] {text}"
    return text


def merge_parts(audio: Path, part_starts: list[float]) -> None:
    final_timed = audio.with_suffix(".timed.txt")
    final_plain = audio.with_suffix(".txt")
    with final_timed.open("w", encoding="utf-8") as timed_out, final_plain.open("w", encoding="utf-8") as plain_out:
        for start_sec in part_starts:
            timed_path, plain_path = part_paths(audio, start_sec)
            if not timed_path.exists():
                continue
            with timed_path.open("r", encoding="utf-8") as f:
                for line in f:
                    parsed = parse_timed_line(line)
                    if not parsed:
                        timed_out.write(line)
                        continue
                    s, e, text = parsed
                    marked = mark_hallucinations(text)
                    timed_out.write(f"[{fmt(s)} -> {fmt(e)}] {marked}\n")
                    plain_out.write(marked + "\n")
    # Части, кроме первой (start_sec=0, совпадает с финальным файлом при отсутствии докрутки),
    # больше не нужны — итог уже в final_timed/final_plain
    for start_sec in part_starts:
        if start_sec == 0:
            continue
        timed_path, plain_path = part_paths(audio, start_sec)
        timed_path.unlink(missing_ok=True)
        plain_path.unlink(missing_ok=True)
    print(f"Готово: {final_timed} и {final_plain}", flush=True)


def supervise(audio: Path, compute_type: str, start_sec: float, hotwords: str, max_retries: int) -> None:
    part_starts = [start_sec]
    current_start = start_sec
    attempts = 0
    while True:
        code = run_worker(audio, compute_type, current_start, hotwords)
        if code == 0:
            break
        attempts += 1
        timed_path, _ = part_paths(audio, current_start)
        resume_from = last_end_second(timed_path)
        if resume_from is None or attempts > max_retries:
            print(
                f"Воркер упал (код {code}) и докрутить не удалось "
                f"(попыток: {attempts}, последний таймкод: {resume_from}). Части не склеены.",
                flush=True,
            )
            sys.exit(code)
        print(f"Воркер упал (код {code}), докручиваю с {fmt(resume_from)} (попытка {attempts}/{max_retries})", flush=True)
        current_start = resume_from
        part_starts.append(current_start)

    merge_parts(audio, part_starts)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("audio", type=Path)
    parser.add_argument("--compute-type", default="float32")
    parser.add_argument("--start-sec", type=float, default=0.0)
    parser.add_argument("--hotwords", default="")
    parser.add_argument("--hotwords-file", type=Path, default=None)
    parser.add_argument("--max-retries", type=int, default=5)
    parser.add_argument("--worker", action="store_true", help=argparse.SUPPRESS)
    args = parser.parse_args()

    hotwords = args.hotwords
    if args.hotwords_file:
        hotwords = args.hotwords_file.read_text(encoding="utf-8").strip()

    if args.worker:
        worker_main(args.audio, args.compute_type, args.start_sec, hotwords)
        return

    supervise(args.audio, args.compute_type, args.start_sec, hotwords, args.max_retries)


if __name__ == "__main__":
    main()
