# Recharts — Документация

> Пакет: `recharts` | Docs: https://recharts.org
> Библиотека графиков на базе React + D3

## Установка / Провайдер

```tsx
// Не требует провайдера. Просто импортируй компоненты.
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
```

---

## ResponsiveContainer — адаптивность

```tsx
// ВСЕГДА оборачивай графики в ResponsiveContainer для адаптивности
<ResponsiveContainer width="100%" height={300}>
  <LineChart data={data}>{/* ... */}</LineChart>
</ResponsiveContainer>
```

---

## LineChart — линейный график

```tsx
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

const data = [
  { month: 'Янв', revenue: 4000, orders: 240 },
  { month: 'Фев', revenue: 3000, orders: 139 },
  { month: 'Мар', revenue: 6000, orders: 380 },
  { month: 'Апр', revenue: 8000, orders: 430 },
]

function RevenueChart() {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="month" />
        <YAxis yAxisId="left" />
        <YAxis yAxisId="right" orientation="right" />
        <Tooltip />
        <Legend />
        <Line yAxisId="left" type="monotone" dataKey="revenue" stroke="#8884d8" strokeWidth={2} dot={false} />
        <Line yAxisId="right" type="monotone" dataKey="orders" stroke="#82ca9d" strokeWidth={2} />
      </LineChart>
    </ResponsiveContainer>
  )
}
```

---

## AreaChart — график с площадью

```tsx
import {
  Area,
  AreaChart,
  CartesianGrid,
  defs,
  linearGradient,
  ResponsiveContainer,
  stop,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

function AreaChartWithGradient() {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8} />
            <stop offset="95%" stopColor="#8884d8" stopOpacity={0.1} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="month" />
        <YAxis />
        <Tooltip />
        <Area type="monotone" dataKey="revenue" stroke="#8884d8" fill="url(#colorRevenue)" strokeWidth={2} />
      </AreaChart>
    </ResponsiveContainer>
  )
}
```

---

## BarChart — столбчатый график

```tsx
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell, ResponsiveContainer } from 'recharts'

// Простой
function SimpleBarChart() {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="month" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Bar dataKey="revenue" fill="#8884d8" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

// Grouped (сгруппированные)
<BarChart data={data}>
  <Bar dataKey="revenue" fill="#8884d8" />
  <Bar dataKey="expenses" fill="#82ca9d" />
</BarChart>

// Stacked (накопительный)
<BarChart data={data}>
  <Bar dataKey="paid" stackId="a" fill="#8884d8" />
  <Bar dataKey="pending" stackId="a" fill="#82ca9d" />
  <Bar dataKey="cancelled" stackId="a" fill="#ff7f7f" />
</BarChart>

// Разные цвета для каждого бара
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042']

<Bar dataKey="value">
  {data.map((entry, index) => (
    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
  ))}
</Bar>
```

---

## PieChart — круговой / Donut

```tsx
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'

const pieData = [
  { name: 'Новые', value: 400 },
  { name: 'Завершённые', value: 300 },
  { name: 'Отменённые', value: 100 },
  { name: 'В процессе', value: 200 },
]

const COLORS = ['#0088FE', '#00C49F', '#FF8042', '#FFBB28']

// Pie
function StatusPieChart() {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={pieData}
          cx="50%"
          cy="50%"
          outerRadius={100}
          dataKey="value"
          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
        >
          {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  )
} // Donut (innerRadius задаёт дырку)

<Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value">
  {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
</Pie>
```

---

## ComposedChart — смешанный тип

```tsx
import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

function ComposedExample() {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <ComposedChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="month" />
        <YAxis yAxisId="left" />
        <YAxis yAxisId="right" orientation="right" />
        <Tooltip />
        <Legend />
        <Bar yAxisId="left" dataKey="revenue" fill="#8884d8" />
        <Line yAxisId="right" type="monotone" dataKey="orders" stroke="#ff7300" />
        <Area yAxisId="left" type="monotone" dataKey="target" fill="#82ca9d" stroke="#82ca9d" fillOpacity={0.3} />
      </ComposedChart>
    </ResponsiveContainer>
  )
}
```

---

## Кастомный Tooltip

```tsx
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) { return null }

  return (
    <div style={{ background: 'white', padding: 12, border: '1px solid #ccc', borderRadius: 8 }}>
      <p style={{ fontWeight: 'bold' }}>{label}</p>
      {payload.map((entry, index) => (
        <p key={index} style={{ color: entry.color }}>
          {entry.name}: {entry.value.toLocaleString('ru')} ₽
        </p>
      ))}
    </div>
  )
}

<Tooltip content={<CustomTooltip />} />
```

---

## ReferenceLine / ReferenceArea

```tsx
import { ReferenceLine, ReferenceArea } from 'recharts'

// Линия среднего значения
<ReferenceLine y={5000} stroke="red" strokeDasharray="3 3" label="Среднее" />

// Вертикальная линия
<ReferenceLine x="Март" stroke="blue" label="Старт" />

// Выделенная область
<ReferenceArea x1="Янв" x2="Мар" fill="#8884d8" fillOpacity={0.1} label="Q1" />
```

---

## LabelList — подписи к барам

```tsx
import { LabelList } from 'recharts'
<Bar dataKey="revenue">
  <LabelList dataKey="revenue" position="top" formatter={(v) => `${v} ₽`} />
</Bar>
```

---

## События

```tsx
<Bar
  dataKey="revenue"
  onClick={(data, index) => {
    console.log('Клик по бару:', data, index)
  }}
  onMouseEnter={(data) => {
    console.log('Hover:', data)
  }}
/>

<Line
  dataKey="orders"
  dot={{ onClick: (e, payload) => console.log(payload) }}
/>
```

---

## Оси — настройка

```tsx
// Форматирование значений
<XAxis
  dataKey="date"
  tickFormatter={(value) => new Date(value).toLocaleDateString('ru')}
  angle={-45}
  textAnchor="end"
  height={60}
/>

<YAxis
  tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
  domain={[0, 'dataMax + 1000']} // автоматический диапазон + отступ
  tickCount={6}
/>
```

---

## Паттерны в letar

```tsx
// Типовой компонент графика
'use client'
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

interface ChartData {
  label: string
  value: number
}

interface SimpleLineChartProps {
  data: ChartData[]
  color?: string
}

export function SimpleLineChart({ data, color = '#8884d8' }: SimpleLineChartProps) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
        <XAxis dataKey="label" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip />
        <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
      </LineChart>
    </ResponsiveContainer>
  )
}
```

---

## Ссылки

- Docs: https://recharts.org/en-US/api
- GitHub: https://github.com/recharts/recharts
- Storybook: https://recharts.org/en-US/examples
