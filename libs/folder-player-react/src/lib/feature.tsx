export interface FeatureProps {
  name?: string
}

export function Feature({ name = 'folder-player-react' }: FeatureProps) {
  return <span>{name}</span>
}
