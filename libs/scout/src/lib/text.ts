import { newStemmer } from 'snowball-stemmers'

const ru = newStemmer('russian')
const en = newStemmer('english')

/** Служебные слова запросов и доков — шум для BM25 */
const STOP_WORDS = new Set(
  (
    'и в во не что он на я с со как а то все всё она так его но да ты к у же вы за бы по только ее её мне было вот от '
    + 'меня еще ещё нет о об из ему теперь когда даже ну ли если уже или ни быть был него до вас нибудь уж вам ведь там '
    + 'потом себя ничего ей может они тут где есть надо ней для мы тебя их чем была сам чтоб без будто чего раз тоже '
    + 'себе под будет ж тогда кто этот того потому этого какой совсем ним здесь этом один почти мой тем чтобы нее сейчас '
    + 'были куда зачем всех никогда можно при наконец два другой хоть после над больше тот через эти нас про всего них '
    + 'какая много разве три эту моя впрочем хорошо свою этой перед иногда лучше чуть том нельзя такой им более всегда '
    + 'конечно всю между это эта эти давай нужно сделай пожалуйста можешь посмотри глянь хочу надо '
    + 'the a an and or of to in on for is it this that with as be are was by from at not but if then than into'
  ).split(' '),
)

const stemCache = new Map<string, string>()

function stemWord(word: string): string {
  const cached = stemCache.get(word)
  if (cached !== undefined) {
    return cached
  }
  let stem = word
  if (/^[а-я]+$/.test(word)) {
    stem = ru.stem(word)
  } else if (/^[a-z]+$/.test(word)) {
    stem = en.stem(word)
  }
  stemCache.set(word, stem)
  return stem
}

/**
 * Текст → стеммированные термы. camelCase и kebab-case режутся на слова,
 * `ё` приводится к `е`, числа короче двух знаков и стоп-слова отбрасываются.
 */
export function tokenize(text: string): string[] {
  const expanded = text.replace(/([a-zа-яё])([A-ZА-ЯЁ])/g, '$1 $2')
  const words = expanded.toLowerCase().replace(/ё/g, 'е').match(/[a-zа-я0-9]+/g) ?? []
  const terms: string[] = []
  for (const word of words) {
    if (word.length < 2 || STOP_WORDS.has(word)) {
      continue
    }
    terms.push(stemWord(word))
  }
  return terms
}
