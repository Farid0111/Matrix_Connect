import type { WifiUser } from '../types'
import { DailyLineChart } from './charts/DailyLineChart'
import { ServerDonutChart } from './charts/ServerDonutChart'
import { ZoneBarChart } from './charts/ZoneBarChart'

interface ChartsSectionProps {
  users: WifiUser[]
}

export function ChartsSection({ users }: ChartsSectionProps) {
  return (
    <div className="charts-grid">
      <div className="chart-card">
        <h3 className="chart-title">📈 Inscriptions par zone</h3>
        <div className="chart-container">
          <ZoneBarChart users={users} />
        </div>
      </div>
      <div className="chart-card">
        <h3 className="chart-title">🥧 Répartition par serveur</h3>
        <div className="chart-container">
          <ServerDonutChart users={users} />
        </div>
      </div>
      <div className="chart-card">
        <h3 className="chart-title">📉 Inscriptions - 7 derniers jours</h3>
        <div className="chart-container">
          <DailyLineChart users={users} />
        </div>
      </div>
    </div>
  )
}
