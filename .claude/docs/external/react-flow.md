# React Flow (@xyflow/react) — Документация

> Пакет: `@xyflow/react` | Docs: https://reactflow.dev
> Библиотека для построения интерактивных диаграмм и графов

## Базовый компонент

```tsx
'use client'
import {
  addEdge,
  Background,
  BackgroundVariant,
  Controls,
  type Edge,
  MiniMap,
  type Node,
  type OnConnect,
  ReactFlow,
  useEdgesState,
  useNodesState,
} from '@xyflow/react'
import { useCallback } from 'react'
import '@xyflow/react/dist/style.css' // ОБЯЗАТЕЛЬНО

const initialNodes: Node[] = [
  { id: '1', type: 'input', position: { x: 250, y: 0 }, data: { label: 'Начало' } },
  { id: '2', position: { x: 100, y: 150 }, data: { label: 'Процесс' } },
  { id: '3', type: 'output', position: { x: 400, y: 150 }, data: { label: 'Конец' } },
]

const initialEdges: Edge[] = [
  { id: 'e1-2', source: '1', target: '2', animated: true },
  { id: 'e1-3', source: '1', target: '3' },
]

export function FlowChart() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)

  const onConnect: OnConnect = useCallback((connection) => setEdges((eds) => addEdge(connection, eds)), [setEdges])

  return (
    // ОБЯЗАТЕЛЬНО: контейнер с явными размерами
    <div style={{ width: '100%', height: 600 }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        fitView
        minZoom={0.2}
        maxZoom={4}
        snapToGrid
        snapGrid={[20, 20]}
        colorMode="light" // 'light' | 'dark' | 'system'
        deleteKeyCode="Backspace"
        defaultEdgeOptions={{ animated: true, type: 'smoothstep' }}
      >
        <MiniMap nodeColor="#e2e2e2" pannable zoomable />
        <Controls />
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
      </ReactFlow>
    </div>
  )
}
```

---

## useNodesState / useEdgesState

```tsx
import { useEdgesState, useNodesState } from '@xyflow/react'

// Эквивалентно useState + applyNodeChanges/applyEdgeChanges
const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)

// Обновить данные узла
setNodes((nds) =>
  nds.map((node) => (node.id === targetId ? { ...node, data: { ...node.data, label: 'Новый' } } : node))
)

// Добавить узел
setNodes((nds) => [...nds, { id: 'new', position: { x: 100, y: 100 }, data: { label: 'Новый' } }])
```

---

## Кастомные узлы

```tsx
import {
  Handle,
  Position,
  NodeResizer,
  NodeToolbar,
  type NodeProps,
  type Node,
} from '@xyflow/react'

// Типизированный кастомный узел
type StatusNode = Node<
  { label: string; status: 'active' | 'inactive' | 'error' },
  'status'
>

function StatusNodeComponent({ data, selected }: NodeProps<StatusNode>) {
  const colors = { active: '#22c55e', inactive: '#94a3b8', error: '#ef4444' }

  return (
    <>
      {/* Тулбар появляется при выделении */}
      <NodeToolbar position={Position.Top} isVisible={selected}>
        <button onClick={() => alert('Edit!')}>Редактировать</button>
      </NodeToolbar>

      {/* Ресайзер при выделении */}
      <NodeResizer isVisible={selected} minWidth={120} minHeight={40} />

      {/* Handle — точка подключения */}
      <Handle type="target" position={Position.Top} />

      <div
        style={{
          padding: 12,
          border: `2px solid ${selected ? '#6366f1' : '#e2e8f0'}`,
          borderRadius: 8,
          background: '#fff',
          minWidth: 120,
        }}
      >
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: colors[data.status],
            display: 'inline-block',
            marginRight: 6,
          }}
        />
        {data.label}
      </div>

      <Handle type="source" position={Position.Bottom} />
    </>
  )
}

// Регистрация типа
const nodeTypes = { status: StatusNodeComponent }

// Использование
<ReactFlow nodeTypes={nodeTypes} nodes={nodes} ... />
```

---

## addEdge / reconnectEdge

```tsx
import { addEdge, reconnectEdge, type Connection, type Edge } from '@xyflow/react'

// При новом соединении
const onConnect = useCallback(
  (params: Connection) =>
    setEdges((eds) =>
      addEdge({ ...params, type: 'smoothstep', animated: true }, eds),
    ),
  [setEdges],
)

// При перетаскивании конца рёбра
const onReconnect = useCallback(
  (oldEdge: Edge, newConnection: Connection) =>
    setEdges((els) => reconnectEdge(oldEdge, newConnection, els)),
  [],
)

<ReactFlow
  onConnect={onConnect}
  onReconnect={onReconnect}
  edgesReconnectable
/>
```

---

## useReactFlow — программное управление

```tsx
'use client'
import { useReactFlow } from '@xyflow/react'

function ControlPanel() {
  const { fitView, zoomIn, zoomOut, setCenter, getNodes, getEdges, setNodes, setEdges } = useReactFlow()

  return (
    <div>
      <button onClick={() => fitView({ duration: 400 })}>Вписать</button>
      <button onClick={() => zoomIn()}>Увеличить</button>
      <button onClick={() => zoomOut()}>Уменьшить</button>
      <button onClick={() => setCenter(0, 0, { duration: 300, zoom: 1 })}>Центр</button>
    </div>
  )
}
```

---

## useNodesData — подписка на данные узла

```tsx
import { useNodesData } from '@xyflow/react'

// Внутри кастомного узла — подписаться на данные другого узла
function WatcherNode({ data }: NodeProps<Node<{ watchId: string }>>) {
  // Эффективная подписка — ре-рендер только при изменении данных того узла
  const watched = useNodesData<Node<{ value: number }>>(data.watchId)

  return <div>Значение: {watched?.data.value ?? 'N/A'}</div>
}
```

---

## useOnSelectionChange

```tsx
import { useOnSelectionChange } from '@xyflow/react'
import { useCallback } from 'react'

function SelectionInfo() {
  useOnSelectionChange({
    onChange: useCallback(({ nodes, edges }) => {
      console.log('Выбрано узлов:', nodes.length)
      console.log('Выбрано рёбер:', edges.length)
    }, []),
  })

  return null
}
```

---

## applyNodeChanges / applyEdgeChanges — ручное управление

```tsx
import { applyEdgeChanges, applyNodeChanges, type OnEdgesChange, type OnNodesChange } from '@xyflow/react'
import { useCallback, useState } from 'react'

// При использовании с Zustand
const onNodesChange: OnNodesChange = useCallback((changes) => setNodes((nds) => applyNodeChanges(changes, nds)), [])

const onEdgesChange: OnEdgesChange = useCallback((changes) => setEdges((eds) => applyEdgeChanges(changes, eds)), [])
```

---

## Типы узлов и рёбер

```tsx
import type { Edge, EdgeTypes, Node, NodeTypes } from '@xyflow/react'

// Встроенные типы узлов
// type: 'default' | 'input' | 'output' | 'group'

// Типы рёбер
// type: 'default' | 'straight' | 'step' | 'smoothstep' | 'bezier' | 'simplebezier'

// Кастомные рёбра
import { BaseEdge, EdgeLabelRenderer, getStraightPath } from '@xyflow/react'

function CustomEdge({ id, sourceX, sourceY, targetX, targetY }) {
  const [edgePath, labelX, labelY] = getStraightPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
  })

  return (
    <>
      <BaseEdge id={id} path={edgePath} />
      <EdgeLabelRenderer>
        <div style={{ position: 'absolute', transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)` }}>
          Метка
        </div>
      </EdgeLabelRenderer>
    </>
  )
}

const edgeTypes: EdgeTypes = { custom: CustomEdge }
```

---

## useNodesInitialized — авто-раскладка

```tsx
import { useNodesInitialized, useReactFlow } from '@xyflow/react'
import { useEffect } from 'react'

function AutoLayout() {
  const { setNodes, fitView } = useReactFlow()
  const initialized = useNodesInitialized()

  useEffect(() => {
    if (!initialized) return
    // Запустить алгоритм раскладки (dagre, elk, d3-hierarchy)
    setNodes((nodes) => nodes.map((n, i) => ({ ...n, position: { x: i * 200, y: 0 } })))
    fitView({ duration: 400, padding: 0.2 })
  }, [initialized])

  return null
}
```

---

## Паттерны в letar

```tsx
'use client'
// Диаграмма процесса / воркфлоу
import { Background, Controls, ReactFlow, useEdgesState, useNodesState } from '@xyflow/react'
import '@xyflow/react/dist/style.css'

interface WorkflowStep {
  id: string
  label: string
  status: 'pending' | 'active' | 'done'
}

export function WorkflowDiagram({ steps }: { steps: WorkflowStep[] }) {
  const [nodes] = useNodesState(
    steps.map((step, i) => ({
      id: step.id,
      position: { x: i * 200, y: 100 },
      data: { label: step.label },
      type: step.status === 'active' ? 'default' : 'output',
    }))
  )

  const [edges] = useEdgesState(
    steps.slice(0, -1).map((step, i) => ({
      id: `e${i}`,
      source: step.id,
      target: steps[i + 1].id,
      animated: steps[i + 1].status === 'active',
    }))
  )

  return (
    <div style={{ height: 300 }}>
      <ReactFlow nodes={nodes} edges={edges} fitView>
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  )
}
```

---

## Ссылки

- Docs: https://reactflow.dev
- GitHub: https://github.com/xyflow/xyflow
- Примеры: https://reactflow.dev/examples
