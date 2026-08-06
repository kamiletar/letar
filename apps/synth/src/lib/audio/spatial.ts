// Позиционирование PannerNode (HRTF) в 3D-пространстве вокруг слушателя — «пространство/сцена»,
// не просто левый-правый баланс: даже в наушниках звук ощущается как объект где-то вокруг головы.

export function createSpatialPanner(ctx: BaseAudioContext): PannerNode {
  const panner = ctx.createPanner()
  panner.panningModel = 'HRTF'
  panner.distanceModel = 'inverse'
  panner.refDistance = 1
  panner.maxDistance = 20
  panner.rolloffFactor = 1
  return panner
}

// angleRadians: 0 = прямо по курсу слушателя, растёт по часовой стрелке.
// depth 0..1 растягивает радиус — дальше = естественно тише (inverse distance model).
export function setPannerPosition(
  panner: PannerNode,
  ctx: BaseAudioContext,
  angleRadians: number,
  depth: number,
): void {
  const radius = 1 + depth * 8
  const now = ctx.currentTime
  panner.positionX.setValueAtTime(Math.sin(angleRadians) * radius, now)
  panner.positionY.setValueAtTime(0, now)
  panner.positionZ.setValueAtTime(-Math.cos(angleRadians) * radius, now)
}
